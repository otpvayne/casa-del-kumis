import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infra/db/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { createWorker, PSM } from 'tesseract.js';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { LogsService } from '../logs/logs.service';

type UploadAndProcessInput = {
  file: Express.Multer.File;
  sucursalId: number;
  fechaOperacion: string; // YYYY-MM-DD
  userId: number;
};

type CreateDraftInput = {
  sucursalId: number;
  fechaOperacion: string; // YYYY-MM-DD
  userId: number;
};

type AddImagenInput = {
  voucherId: number;
  file: Express.Multer.File;
  orden?: number; // si no llega: auto last+1
  userId: number;
  // si quieres, luego lo expones por query param
  runOcr?: boolean; // default true
};

type Section = 'MC' | 'VISA' | 'QR' | 'NONE';

type ParsedTx = {
  franquicia: 'VISA' | 'MASTERCARD';
  ultimos_digitos?: string;
  numero_recibo?: string;
  monto: number;
  linea_ocr: string;
};

type OcrTripleResult = {
  engine: 'VISION' | 'TESSERACT';
  textA: string;
  confA: number;
  textB: string;
  confB: number;
  textC: string;
  confC: number;
  confidence: number;
};

type ParsedResult = {
  transacciones: ParsedTx[];
  printedTotalMC: number | null;
  printedTotalVisa: number | null;
  printedGrandTotal: number | null;
  totalVisa: number | null;
  totalMastercard: number | null;
  totalGlobal: number | null;
  precision: number;
};

@Injectable()
export class VouchersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logs: LogsService,
  ) {}

  // =====================================================
  // =============== UPLOAD + OCR (LEGACY) ===============
  // =====================================================
  // 1 imagen = 1 voucher (sigue funcionando)
  async uploadAndProcess(input: UploadAndProcessInput) {
    const { file, sucursalId, fechaOperacion, userId } = input;

    if (!file) throw new BadRequestException('Falta archivo');
    if (!sucursalId) throw new BadRequestException('Falta sucursalId');
    if (!fechaOperacion)
      throw new BadRequestException('Falta fechaOperacion (YYYY-MM-DD)');

    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa JPG o PNG.');
    }

    // 1) Verifica sucursal existe
    const sucursal = await this.prisma.sucursales.findUnique({
      where: { id: BigInt(sucursalId) as any },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no existe');

    // 2) Guardar archivo ordenado por fecha/sucursal
    const destDir = path.join('/tmp', 'uploads', 'vouchers', fechaOperacion, String(sucursalId));
    fs.mkdirSync(destDir, { recursive: true });

    const finalPath = path.join(destDir, file.filename);
    fs.renameSync(file.path, finalPath);

    // 3) Crear voucher en BD
    const voucher = await this.prisma.vouchers.create({
      data: {
        sucursal_id: BigInt(sucursalId) as any,
        creado_por_id: BigInt(userId) as any,
        fecha_operacion: new Date(fechaOperacion),
        ruta_imagen: finalPath, // principal
        estado: 'PENDIENTE_OCR',
      } as any,
    });

    // ✅ 3.1) Crear voucher_imagenes (orden 1)
    await this.prisma.voucher_imagenes.create({
      data: {
        voucher_id: voucher.id,
        ruta_imagen: finalPath,
        orden: 1,
        // precision_ocr se llena luego
      } as any,
    });

    // 4) OCR triple
    const ocr = await this.runOcrTripleWithVisionFallback(finalPath);

    // 5) Parse
    const parsed = this.pickBestParsedMerged(
      [
        { text: ocr.textA, conf: ocr.confA },
        { text: ocr.textB, conf: ocr.confB },
        { text: ocr.textC, conf: ocr.confC },
      ],
      ocr.confidence,
    );

    // 6) Guardar transacciones (si hay)
    if (parsed.transacciones.length > 0) {
      await this.prisma.voucher_transacciones.createMany({
        data: parsed.transacciones.map((t) => ({
          voucher_id: voucher.id,
          franquicia: t.franquicia,
          ultimos_digitos: t.ultimos_digitos ?? null,
          numero_recibo: t.numero_recibo ?? null,
          monto: t.monto,
          linea_ocr: t.linea_ocr,
        })) as any,
      });
    }

    // 7) Actualizar voucher con totales impresos
    const updated = await this.prisma.vouchers.update({
      where: { id: voucher.id },
      data: {
        total_visa: parsed.totalVisa ?? 0,
        total_mastercard: parsed.totalMastercard ?? 0,
        total_global: parsed.totalGlobal ?? 0,
        precision_ocr: parsed.precision,
        estado: 'PENDIENTE_CONFIRMACION',
      } as any,
      include: {
        voucher_transacciones: { orderBy: { id: 'asc' } },
        voucher_imagenes: { orderBy: { orden: 'asc' } },
        sucursales: true,
      },
    });

    // ✅ guardar precision en la imagen 1 también
    await this.prisma.voucher_imagenes.updateMany({
      where: { voucher_id: voucher.id, orden: 1 } as any,
      data: { precision_ocr: parsed.precision } as any,
    });

    return this.serializeBigInt(updated);
  }

  // =====================================================
  // ================= NUEVO: CREATE DRAFT ===============
  // =====================================================
  async createDraft(input: CreateDraftInput) {
    const { sucursalId, fechaOperacion, userId } = input;

    if (!sucursalId) throw new BadRequestException('Falta sucursalId');
    if (!fechaOperacion)
      throw new BadRequestException('Falta fechaOperacion (YYYY-MM-DD)');

    const sucursal = await this.prisma.sucursales.findUnique({
      where: { id: BigInt(sucursalId) as any },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no existe');

    const voucher = await this.prisma.vouchers.create({
      data: {
        sucursal_id: BigInt(sucursalId) as any,
        creado_por_id: BigInt(userId) as any,
        fecha_operacion: new Date(fechaOperacion),
        ruta_imagen: '', // aún no hay imagen principal
        estado: 'DRAFT', // draft hasta que subas imágenes
      } as any,
      include: {
        voucher_transacciones: true,
        voucher_imagenes: true,
        sucursales: true,
      },
    });

    return this.serializeBigInt(voucher);
  }

  // =====================================================
  // =========== NUEVO: ADD IMAGEN (MULTI) ===============
  // =====================================================
  async addImagen(input: AddImagenInput) {
    const { voucherId, file, userId } = input;
    const runOcr = input.runOcr ?? true;

    if (!voucherId) throw new BadRequestException('Falta voucherId');
    if (!file) throw new BadRequestException('Falta archivo');

    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa JPG o PNG.');
    }

    const voucher = await this.prisma.vouchers.findUnique({
      where: { id: BigInt(voucherId) as any },
      include: {
        voucher_imagenes: { orderBy: { orden: 'asc' } },
      },
    });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');

    if (voucher.estado === 'CONFIRMADO') {
      throw new BadRequestException('Voucher ya está CONFIRMADO, no se pueden agregar imágenes');
    }

    // Orden
    let orden = input.orden;
    if (!orden || orden < 1) {
      const lastOrden =
        voucher.voucher_imagenes?.length > 0
          ? Number(voucher.voucher_imagenes[voucher.voucher_imagenes.length - 1].orden)
          : 0;
      orden = lastOrden + 1;
    }

    // Destino final basado en fecha_operacion + sucursal_id
    const fechaOperacion = new Date(voucher.fecha_operacion)
      .toISOString()
      .slice(0, 10); // YYYY-MM-DD

    const sucursalId = voucher.sucursal_id?.toString?.() ?? String(voucher.sucursal_id);

    const destDir = path.join(
      process.cwd(),
      'uploads',
      'vouchers',
      fechaOperacion,
      String(sucursalId),
    );
    fs.mkdirSync(destDir, { recursive: true });

    const finalPath = path.join(destDir, file.filename);
    fs.renameSync(file.path, finalPath);

    // Guardar voucher_imagenes
    const imgRow = await this.prisma.voucher_imagenes.create({
      data: {
        voucher_id: BigInt(voucherId) as any,
        ruta_imagen: finalPath,
        orden,
      } as any,
    });

    // Si es la primera imagen o la ruta principal está vacía, setear ruta_imagen principal
    if (!voucher.ruta_imagen || voucher.ruta_imagen.trim() === '' || orden === 1) {
      await this.prisma.vouchers.update({
        where: { id: BigInt(voucherId) as any },
        data: {
          ruta_imagen: finalPath,
          estado: 'PENDIENTE_OCR',
        } as any,
      });
    }

    // OCR opcional por imagen (recomendado: sí)
    let parsed: ParsedResult | null = null;

    if (runOcr) {
      const ocr = await this.runOcrTripleWithVisionFallback(finalPath);

      parsed = this.pickBestParsedMerged(
        [
          { text: ocr.textA, conf: ocr.confA },
          { text: ocr.textB, conf: ocr.confB },
          { text: ocr.textC, conf: ocr.confC },
        ],
        ocr.confidence,
      );

      // Guardar precision en imagen
      await this.prisma.voucher_imagenes.update({
        where: { id: imgRow.id } as any,
        data: { precision_ocr: parsed.precision } as any,
      });

      // Append transacciones (no borra las anteriores)
      if (parsed.transacciones.length > 0) {
        await this.prisma.voucher_transacciones.createMany({
          data: parsed.transacciones.map((t) => ({
            voucher_id: BigInt(voucherId) as any,
            franquicia: t.franquicia,
            ultimos_digitos: t.ultimos_digitos ?? null,
            numero_recibo: t.numero_recibo ?? null,
            monto: t.monto,
            linea_ocr: t.linea_ocr,
          })) as any,
        });
      }

      // Si el voucher aún no tiene totales “bien” (0 o null), intenta completar desde esta imagen.
      // (Esto es conservador para no pisar lo que ya estaba).
      const shouldSetTotals =
        (voucher.total_visa == null || Number(voucher.total_visa) === 0) &&
        (voucher.total_mastercard == null || Number(voucher.total_mastercard) === 0) &&
        (voucher.total_global == null || Number(voucher.total_global) === 0);

      if (shouldSetTotals) {
        await this.prisma.vouchers.update({
          where: { id: BigInt(voucherId) as any },
          data: {
            total_visa: parsed.totalVisa ?? 0,
            total_mastercard: parsed.totalMastercard ?? 0,
            total_global: parsed.totalGlobal ?? 0,
            precision_ocr: parsed.precision,
            estado: 'PENDIENTE_CONFIRMACION',
          } as any,
        });
      } else {
        // Solo actualiza precision (max) y deja estado en confirmación si ya hay algo
        const currentPrecision = voucher.precision_ocr ? Number(voucher.precision_ocr) : 0;
        const nextPrecision = Math.max(currentPrecision, parsed.precision);

        await this.prisma.vouchers.update({
          where: { id: BigInt(voucherId) as any },
          data: {
            precision_ocr: nextPrecision,
            estado: 'PENDIENTE_CONFIRMACION',
          } as any,
        });
      }
    }

    // retornar voucher actualizado
    const updated = await this.prisma.vouchers.findUnique({
      where: { id: BigInt(voucherId) as any },
      include: {
        voucher_transacciones: { orderBy: { id: 'asc' } },
        voucher_imagenes: { orderBy: { orden: 'asc' } },
        sucursales: true,
      },
    });

    return this.serializeBigInt({
      ok: true,
      voucher: updated,
      addedImage: imgRow,
      parsed,
    });
  }

  // =====================================================
  // =================== GET VOUCHER =====================
  // =====================================================
  async getVoucher(id: number) {
    const voucher = await this.prisma.vouchers.findUnique({
      where: { id: BigInt(id) as any },
      include: {
        voucher_transacciones: { orderBy: { id: 'asc' } },
        voucher_imagenes: { orderBy: { orden: 'asc' } }, // ✅ NUEVO
        sucursales: true,
      },
    });

    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    return this.serializeBigInt(voucher);
  }

  // =====================================================
  // ============== UPDATE (DRAFT / VALIDACIÓN) ==========
  // =====================================================
  async updateVoucherDraft(
    id: number,
    body: {
      totalVisa?: number;
      totalMastercard?: number;
      totalGlobal?: number;
      observacion?: string;
      transacciones?: Array<{
        franquicia: 'VISA' | 'MASTERCARD';
        ultimos_digitos?: string | null;
        numero_recibo?: string | null;
        monto: number;
      }>;
    },
  ) {
    const voucher = await this.prisma.vouchers.findUnique({
      where: { id: BigInt(id) as any },
    });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');

    if (body.transacciones) {
      for (const t of body.transacciones) {
        if (!t.franquicia) throw new BadRequestException('Falta franquicia');
        if (
          typeof t.monto !== 'number' ||
          !Number.isFinite(t.monto) ||
          t.monto <= 0
        ) {
          throw new BadRequestException('Monto inválido en transacciones');
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.transacciones) {
        await tx.voucher_transacciones.deleteMany({
          where: { voucher_id: BigInt(id) as any },
        });

        if (body.transacciones.length > 0) {
          await tx.voucher_transacciones.createMany({
            data: body.transacciones.map((t) => ({
              voucher_id: BigInt(id) as any,
              franquicia: t.franquicia,
              ultimos_digitos: t.ultimos_digitos ?? null,
              numero_recibo: t.numero_recibo ?? null,
              monto: t.monto,
              linea_ocr: 'EDITADO_MANUAL',
            })) as any,
          });
        }
      }

      const v = await tx.vouchers.update({
        where: { id: BigInt(id) as any },
        data: {
          ...(body.totalVisa !== undefined ? { total_visa: body.totalVisa } : {}),
          ...(body.totalMastercard !== undefined
            ? { total_mastercard: body.totalMastercard }
            : {}),
          ...(body.totalGlobal !== undefined
            ? { total_global: body.totalGlobal }
            : {}),
          estado: 'PENDIENTE_CONFIRMACION',
        } as any,
        include: {
          voucher_transacciones: { orderBy: { id: 'asc' } },
          voucher_imagenes: { orderBy: { orden: 'asc' } },
          sucursales: true,
        },
      });

      return v;
    });

    return this.serializeBigInt(updated);
  }

  // =====================================================
  // ================= CONFIRM VOUCHER ===================
  // =====================================================
  async confirmVoucher(
    id: number,
    confirmadoPorId: number,
    body: {
      totalVisa?: number;
      totalMastercard?: number;
      totalGlobal?: number;
      observacion?: string;
    },
  ) {
    const voucher = await this.prisma.vouchers.findUnique({
      where: { id: BigInt(id) as any },
    });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');

    const updated = await this.prisma.vouchers.update({
      where: { id: BigInt(id) as any },
      data: {
        confirmado_por_id: BigInt(confirmadoPorId) as any,
        confirmado_en: new Date(),
        estado: 'CONFIRMADO',
        ...(body.totalVisa !== undefined ? { total_visa: body.totalVisa } : {}),
        ...(body.totalMastercard !== undefined
          ? { total_mastercard: body.totalMastercard }
          : {}),
        ...(body.totalGlobal !== undefined
          ? { total_global: body.totalGlobal }
          : {}),
      } as any,
      include: {
        voucher_transacciones: { orderBy: { id: 'asc' } },
        voucher_imagenes: { orderBy: { orden: 'asc' } },
        sucursales: true,
      },
    });

    return this.serializeBigInt(updated);
  }

  // =====================================================
  // ===================== DELETE (opcional) =============
  // =====================================================
  async deleteVoucher(id: number) {
    const voucher = await this.prisma.vouchers.findUnique({
      where: { id: BigInt(id) as any },
    });
    if (!voucher) throw new NotFoundException('Voucher no encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.voucher_transacciones.deleteMany({
        where: { voucher_id: BigInt(id) as any },
      });
      await tx.voucher_imagenes.deleteMany({
        where: { voucher_id: BigInt(id) as any },
      });
      await tx.vouchers.delete({
        where: { id: BigInt(id) as any },
      });
    });

    return { ok: true };
  }

  // =====================================================
  // ======================= OCR =========================
  // =====================================================
  private async runOcrTripleWithVisionFallback(
    imagePath: string,
  ): Promise<OcrTripleResult> {
    const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const credsExists = creds ? fs.existsSync(creds) : false;

    const bufA = await sharp(imagePath)
      .rotate()
      .grayscale()
      .resize({ width: 2800, withoutEnlargement: true })
      .normalize()
      .threshold(160)
      .sharpen()
      .toBuffer();

    const bufB = await sharp(imagePath)
      .rotate()
      .grayscale()
      .resize({ width: 2800, withoutEnlargement: true })
      .normalize()
      .sharpen()
      .toBuffer();

    const bufC = await sharp(imagePath)
      .rotate()
      .grayscale()
      .resize({ width: 3200, withoutEnlargement: true })
      .normalize()
      .linear(1.3, -(128 * 1.3) + 128)
      .sharpen()
      .toBuffer();

    if (credsExists) {
      try {
        const client = new ImageAnnotatorClient();
        const [a, b, c] = await Promise.all([
          this.visionText(client, bufA),
          this.visionText(client, bufB),
          this.visionText(client, bufC),
        ]);

        const confA = a.ok ? 95 : 0;
        const confB = b.ok ? 95 : 0;
        const confC = c.ok ? 95 : 0;

        const textA = a.text ?? '';
        const textB = b.text ?? '';
        const textC = c.text ?? '';

        if (textA || textB || textC) {
          return {
            engine: 'VISION',
            textA,
            confA,
            textB,
            confB,
            textC,
            confC,
            confidence: Math.max(confA, confB, confC),
          };
        }
      } catch {
        // fallback
      }
    }

    const worker = await createWorker('spa');
    try {
      await worker.setParameters({
        tessedit_char_whitelist:
          '0123456789$.*ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz:/- ',
        preserve_interword_spaces: '1',
      });

      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      const a = await worker.recognize(bufA);

      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      const b = await worker.recognize(bufB);

      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO });
      const c = await worker.recognize(bufC);

      const confA = a.data.confidence ?? 0;
      const confB = b.data.confidence ?? 0;
      const confC = c.data.confidence ?? 0;

      return {
        engine: 'TESSERACT',
        textA: a.data.text || '',
        confA,
        textB: b.data.text || '',
        confB,
        textC: c.data.text || '',
        confC,
        confidence: Math.max(confA, confB, confC),
      };
    } finally {
      await worker.terminate();
    }
  }

  private async visionText(
    client: ImageAnnotatorClient,
    buffer: Buffer,
  ): Promise<{ ok: boolean; text?: string }> {
    try {
      const [result] = await client.textDetection({
        image: { content: buffer.toString('base64') },
      });

      const txt =
        result.fullTextAnnotation?.text ||
        result.textAnnotations?.[0]?.description ||
        '';

      return { ok: true, text: txt };
    } catch {
      return { ok: false };
    }
  }

  // =====================================================
  // ======================= PARSER ======================
  // =====================================================
  private pickBestParsedMerged(
    results: Array<{ text: string; conf: number }>,
    confidence: number,
  ): ParsedResult {
    const parsedAll = results.map((r) => ({
      ...this.parseVoucherText(r.text),
      _conf: r.conf,
    }));

    const bestMC = parsedAll.reduce((best, cur) => {
      const curCount = cur.transacciones.filter(
        (t) => t.franquicia === 'MASTERCARD',
      ).length;
      const bestCount = best.transacciones.filter(
        (t) => t.franquicia === 'MASTERCARD',
      ).length;
      return curCount > bestCount ? cur : best;
    });

    const bestVISA = parsedAll.reduce((best, cur) => {
      const curCount = cur.transacciones.filter(
        (t) => t.franquicia === 'VISA',
      ).length;
      const bestCount = best.transacciones.filter(
        (t) => t.franquicia === 'VISA',
      ).length;
      return curCount > bestCount ? cur : best;
    });

    const merged = this.dedupeTx([
      ...bestMC.transacciones.filter((t) => t.franquicia === 'MASTERCARD'),
      ...bestVISA.transacciones.filter((t) => t.franquicia === 'VISA'),
    ]);

    const printedTotalMC =
      parsedAll.find((p) => p.printedTotalMC != null)?.printedTotalMC ?? null;
    const printedTotalVisa =
      parsedAll.find((p) => p.printedTotalVisa != null)?.printedTotalVisa ?? null;
    const printedGrandTotal =
      parsedAll.find((p) => p.printedGrandTotal != null)?.printedGrandTotal ?? null;

    return {
      transacciones: merged,
      printedTotalMC,
      printedTotalVisa,
      printedGrandTotal,
      totalVisa: printedTotalVisa,
      totalMastercard: printedTotalMC,
      totalGlobal: printedGrandTotal,
      precision: Math.round(Math.min(99, Math.max(0, confidence))),
    };
  }

  private dedupeTx(items: ParsedTx[]): ParsedTx[] {
    const seen = new Set<string>();
    const out: ParsedTx[] = [];

    for (const t of items) {
      const key = `${t.franquicia}|${t.numero_recibo ?? ''}|${t.monto}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
    return out;
  }

  private parseVoucherText(text: string) {
    const lines = text
      .split('\n')
      .map((l) => this.normalizeLine(l))
      .filter((l) => l.length > 0);

    let section: Section = 'NONE';
    const transacciones: ParsedTx[] = [];

    let printedTotalMC: number | null = null;
    let printedTotalVisa: number | null = null;
    let printedGrandTotal: number | null = null;

    let inGrandTotalBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const upper = line.toUpperCase();

      const sec = this.detectSection(line);
      if (sec) {
        section = sec;
        if (sec === 'MC' || sec === 'VISA') inGrandTotalBlock = false;
        continue;
      }

      if (section === 'QR') break;

      if (
        upper.includes('GRAN TOTAL') ||
        upper.replace(/\s+/g, '').includes('GRANTOTAL')
      ) {
        inGrandTotalBlock = true;
        section = 'NONE';
        continue;
      }

      if (inGrandTotalBlock) {
        const gt = this.extractSectionTotal(line);
        if (gt != null) {
          printedGrandTotal = gt;
          inGrandTotalBlock = false;
        }
        continue;
      }

      if (section === 'MC' || section === 'VISA') {
        const total = this.extractSectionTotal(line);
        if (total != null) {
          if (section === 'MC') printedTotalMC = total;
          if (section === 'VISA') printedTotalVisa = total;
          section = 'NONE';
          continue;
        }
      }

      if (this.isIgnorableLine(line)) continue;

      const tx = this.parseTxLine(line, section);
      if (tx) transacciones.push(tx);
    }

    return { transacciones, printedTotalMC, printedTotalVisa, printedGrandTotal };
  }

  private normalizeLine(line: string): string {
    return line.replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();
  }

  private detectSection(line: string): Section | null {
    const raw = line.toUpperCase().trim();

    if (/(QR|EMVCO)/.test(raw)) return 'QR';

    const visaLike = raw
      .replace(/\|/g, 'I')
      .replace(/1/g, 'I')
      .replace(/4/g, 'A')
      .replace(/\s+/g, '');
    if (visaLike.includes('VISA')) return 'VISA';

    const mcLike = raw.replace(/\s+/g, '');
    if (mcLike.includes('MASTERCARD') || mcLike.includes('MASTERCARO') || raw.includes('MASTER CARD')) {
      return 'MC';
    }

    return null;
  }

  private isIgnorableLine(line: string): boolean {
    const t = line.toUpperCase();
    if (t.length < 3) return true;
    if (t.includes('REPORTE')) return true;
    if (t.includes('TERMINAL')) return true;
    if (t.includes('RECIBO') && t.includes('MONTO')) return true;
    if (t.startsWith('COD')) return true;
    if (t.startsWith('TJ')) return true;
    if (t === 'TOTAL') return true;
    return false;
  }

  private extractSectionTotal(line: string): number | null {
    const t = line.toUpperCase().trim();
    const t2 = t.replace('TOTAI', 'TOTAL');
    if (!t2.startsWith('TOTAL')) return null;

    const m = t2.match(/^TOTAL\s+(\d{4})\s+(.+)$/i);
    if (!m) return null;

    const amount = this.extractMonto(m[2]);
    if (amount != null && amount >= 1000) return amount;

    return null;
  }

  private parseTxLine(line: string, section: Section): ParsedTx | null {
    const franquicia =
      section === 'MC' ? 'MASTERCARD' : section === 'VISA' ? 'VISA' : null;
    if (!franquicia) return null;

    const m = line.match(/^(\*{0,3}\d{3,10})\s+(\d{5,6})\s+(.+)$/);
    if (m) {
      const cardPart = m[1];
      const recibo = m[2];
      const montoText = m[3];

      const digits = cardPart.replace(/\D/g, '');
      const ultimos4 = digits.length >= 4 ? digits.slice(-4) : undefined;

      const monto = this.extractMonto(montoText);
      if (!monto || monto < 1000) return null;

      return {
        franquicia,
        ultimos_digitos: ultimos4,
        numero_recibo: recibo,
        monto,
        linea_ocr: line,
      };
    }

    const m2 = line.match(/^(\d{5,6})\s+(.+)$/);
    if (m2) {
      const recibo = m2[1];
      const montoText = m2[2];

      const monto = this.extractMonto(montoText);
      if (!monto || monto < 1000) return null;

      return { franquicia, numero_recibo: recibo, monto, linea_ocr: line };
    }

    return null;
  }

  private extractMonto(text: string): number | null {
    const t = text.trim();

    let m = t.match(/[$S§€]\s*(\d{1,3}(?:[\.\s]\d{3})+|\d{4,})/);
    if (m) {
      const amount = this.parseMoneyCOP(m[1]);
      if (amount != null && amount >= 1000) return amount;
    }

    m = t.match(/(\d{1,3}[\.\s]\d{3}(?:[\.\s]\d{3})*)/);
    if (m) {
      const amount = this.parseMoneyCOP(m[1]);
      if (amount != null && amount >= 1000) return amount;
    }

    m = t.match(/\b(\d{4,6})\b\s*$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n) && n >= 1000) return n;
    }

    return null;
  }

  private parseMoneyCOP(raw: string): number | null {
    const cleaned = raw
      .replace(/\$/g, '')
      .replace(/[^\d\.\,\s]/g, '')
      .trim();

    if (!cleaned) return null;

    const digitsOnly = cleaned.replace(/[\s\.\,]/g, '');
    const n = Number(digitsOnly);

    return Number.isFinite(n) && n > 0 ? n : null;
  }

  // =====================================================
  // =================== BIGINT SAFE =====================
  // =====================================================
  private serializeBigInt(obj: any) {
    return JSON.parse(
      JSON.stringify(obj, (_k, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );
  }
  // ===========================
// LISTAR VOUCHERS (LIST VIEW)
// ===========================
async listVouchers() {
  const vouchers = await this.prisma.vouchers.findMany({
    orderBy: { created_at: "desc" },
    include: {
      sucursales: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  return this.serializeBigInt(vouchers);
}
async getVoucherImagePath(imageId: number): Promise<string> {
  const img = await this.prisma.voucher_imagenes.findUnique({
    where: { id: BigInt(imageId) as any },
  });

  if (!img) throw new NotFoundException("Imagen no encontrada");

  const filePath = img.ruta_imagen;
  if (!filePath || !fs.existsSync(filePath)) {
    throw new NotFoundException("Archivo de imagen no existe en disco");
  }

  // sendFile necesita path absoluto
  return path.resolve(filePath);
}

}
