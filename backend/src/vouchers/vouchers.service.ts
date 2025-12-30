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
  // Totales impresos detectados
  printedTotalMC: number | null;
  printedTotalVisa: number | null;
  printedGrandTotal: number | null;

  // Totales que se guardan (AHORA = impresos, no sumados)
  totalVisa: number | null;
  totalMastercard: number | null;
  totalGlobal: number | null;

  precision: number;
};

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService,private readonly logs: LogsService,) {}

  // =====================================================
  // =============== UPLOAD + OCR ========================
  // =====================================================

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

    // 3) Crear voucher en BD (estado PENDIENTE_OCR)
    const voucher = await this.prisma.vouchers.create({
      data: {
        sucursal_id: BigInt(sucursalId) as any,
        creado_por_id: BigInt(userId) as any,
        fecha_operacion: new Date(fechaOperacion),
        ruta_imagen: finalPath,
        estado: 'PENDIENTE_OCR',
      } as any,
    });

    // 4) OCR triple: Vision -> fallback Tesseract
    const ocr = await this.runOcrTripleWithVisionFallback(finalPath);

    console.log('=== OCR ===');
    console.log('Engine:', ocr.engine);
    console.log('Conf A/B/C:', ocr.confA, ocr.confB, ocr.confC);
    console.log('Best conf:', ocr.confidence);

    // 5) Parsear y escoger: MEJOR MC + MEJOR VISA (merge)
    const parsed = this.pickBestParsedMerged(
      [
        { text: ocr.textA, conf: ocr.confA },
        { text: ocr.textB, conf: ocr.confB },
        { text: ocr.textC, conf: ocr.confC },
      ],
      ocr.confidence,
    );

    console.log('=== Resultado Final ===');
    console.log('Transacciones:', parsed.transacciones.length);
    console.log('Total VISA (impreso):', parsed.totalVisa);
    console.log('Total MC (impreso):', parsed.totalMastercard);
    console.log('Gran Total (impreso):', parsed.totalGlobal);

    if (
      parsed.totalVisa == null ||
      parsed.totalMastercard == null ||
      parsed.totalGlobal == null
    ) {
      console.log(
        '⚠️ No se detectaron todos los TOTALES impresos. El usuario debe validarlos/llenarlos manualmente.',
      );
    }

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

    // 7) Actualizar voucher con TOTALES IMPRESOS (NO sumados)
    const updated = await this.prisma.vouchers.update({
      where: { id: voucher.id },
      data: {
        // Si tu DB NO permite null, dejamos 0 (pero marcamos para validar)
        total_visa: parsed.totalVisa ?? 0,
        total_mastercard: parsed.totalMastercard ?? 0,
        total_global: parsed.totalGlobal ?? 0,
        precision_ocr: parsed.precision,
        estado: 'PENDIENTE_CONFIRMACION',
      } as any,
      include: { voucher_transacciones: true },
    });

    return this.serializeBigInt(updated);
  }

  // =====================================================
  // =================== GET VOUCHER =====================
  // =====================================================

  async getVoucher(id: number) {
    const voucher = await this.prisma.vouchers.findUnique({
      where: { id: BigInt(id) as any },
      include: {
        voucher_transacciones: { orderBy: { id: 'asc' } },
        sucursales: true,
      },
    });

    if (!voucher) throw new NotFoundException('Voucher no encontrado');
    return this.serializeBigInt(voucher);
  }

  // =====================================================
  // ============== UPDATE (DRAFT / VALIDACIÓN) ==========
  // =====================================================
  /**
   * Reemplaza TODO:
   * - borra transacciones actuales
   * - crea las nuevas (las editadas / añadidas por el usuario)
   * - actualiza totales (los que el usuario confirma)
   */
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

    // Validaciones mínimas
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
      // 1) replace transacciones si vienen
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

      // 2) actualiza totales (manual)
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
          // Si tienes campo observacion en vouchers, descomenta:
          // ...(body.observacion !== undefined ? { observacion: body.observacion } : {}),
          estado: 'PENDIENTE_CONFIRMACION',
        } as any,
        include: { voucher_transacciones: { orderBy: { id: 'asc' } } },
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
        // Si tienes campo observacion en vouchers, descomenta:
        // ...(body.observacion !== undefined ? { observacion: body.observacion } : {}),
      } as any,
      include: { voucher_transacciones: true },
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

    // Preprocesos
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

    // Vision (si hay billing, si no, fallback)
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

        console.log('⚠️ Vision devolvió vacío → fallback a Tesseract');
      } catch {
        console.log('⚠️ Vision OCR falló → usando Tesseract fallback.');
      }
    }

    // Tesseract fallback
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

  /**
   * Mergea:
   * - Mejor MC (más tx MC)
   * - Mejor VISA (más tx VISA)
   *
   * ✅ FIXES:
   * - Totales = IMPRESOS, no sumados
   * - No mezclar VISA dentro de MC: al leer TOTAL de sección, cerramos la sección
   * - detectSection tolerante a OCR sucio (V1SA/VIS4, MASTER CARD, etc.)
   */
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

    // Totales impresos: buscamos el primero no-null entre los 3 OCRs
    const printedTotalMC =
      parsedAll.find((p) => p.printedTotalMC != null)?.printedTotalMC ?? null;
    const printedTotalVisa =
      parsedAll.find((p) => p.printedTotalVisa != null)?.printedTotalVisa ??
      null;
    const printedGrandTotal =
      parsedAll.find((p) => p.printedGrandTotal != null)?.printedGrandTotal ??
      null;

    // ✅ Totales a guardar = impresos (si no aparecen, quedan null)
    const totalMastercard = printedTotalMC;
    const totalVisa = printedTotalVisa;
    const totalGlobal = printedGrandTotal;

    return {
      transacciones: merged,
      printedTotalMC,
      printedTotalVisa,
      printedGrandTotal,
      totalVisa,
      totalMastercard,
      totalGlobal,
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

  // Flag para evitar que el TOTAL del GRAN TOTAL se meta como total de VISA/MC
  let inGrandTotalBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    // Detectar sección (robusto)
    const sec = this.detectSection(line);
    if (sec) {
      section = sec;
      // Si entramos a VISA/MC, ya no estamos en gran total
      if (sec === 'MC' || sec === 'VISA') inGrandTotalBlock = false;
      continue;
    }

    if (section === 'QR') break;

    // ✅ Detectar "GRAN TOTAL" y activar modo bloque
    if (upper.includes('GRAN TOTAL') || upper.replace(/\s+/g, '').includes('GRANTOTAL')) {
      inGrandTotalBlock = true;
      section = 'NONE'; // IMPORTANTÍSIMO: no permitir que siga como VISA
      continue;
    }

    // ✅ Si estamos en bloque de GRAN TOTAL, capturamos el TOTAL xxxx y NO lo usamos como total de VISA/MC
    if (inGrandTotalBlock) {
      const gt = this.extractSectionTotal(line);
      if (gt != null) {
        printedGrandTotal = gt;
        // opcional: una vez capturado, desactivamos el bloque
        inGrandTotalBlock = false;
      }
      continue;
    }

    // Totales de sección: "TOTAL 0008 $196.300"
    if (section === 'MC' || section === 'VISA') {
      const total = this.extractSectionTotal(line);
      if (total != null) {
        if (section === 'MC') printedTotalMC = total;
        if (section === 'VISA') printedTotalVisa = total;
        section = 'NONE'; // cerrar sección para evitar contaminación
        continue;
      }
    }

    if (this.isIgnorableLine(line)) continue;

    const tx = this.parseTxLine(line, section);
    if (tx) transacciones.push(tx);
  }

  return {
    transacciones,
    printedTotalMC,
    printedTotalVisa,
    printedGrandTotal,
  };
}


  private normalizeLine(line: string): string {
    return line.replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();
  }

  /**
   * ✅ detectSection tolerante a OCR sucio:
   * - VISA: VISA, V1SA, VIS4, V|SA (OCR)
   * - MC: MASTERCARD, MASTER CARD, MASTERCARO (OCR)
   */
  private detectSection(line: string): Section | null {
    const raw = line.toUpperCase().trim();

    // QR
    if (/(QR|EMVCO)/.test(raw)) return 'QR';

    // VISA variantes
    const visaLike = raw
      .replace(/\|/g, 'I')
      .replace(/1/g, 'I')
      .replace(/4/g, 'A')
      .replace(/\s+/g, '');
    if (visaLike.includes('VISA')) return 'VISA';

    // MC variantes
    const mcLike = raw.replace(/\s+/g, '');
    if (
      mcLike.includes('MASTERCARD') ||
      mcLike.includes('MASTERCARO') ||
      raw.includes('MASTER CARD')
    ) {
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

    // tolerar TOTAI (OCR) -> lo convertimos a TOTAL
    const t2 = t.replace('TOTAI', 'TOTAL');
    if (!t2.startsWith('TOTAL')) return null;

    // "TOTAL 0006 $134.100"
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

      return {
        franquicia,
        numero_recibo: recibo,
        monto,
        linea_ocr: line,
      };
    }

    return null;
  }

  private extractMonto(text: string): number | null {
    const t = text.trim();

    // 1) Con símbolo: "$ 12.400" o "$12400"
    let m = t.match(/[$S§€]\s*(\d{1,3}(?:[\.\s]\d{3})+|\d{4,})/);
    if (m) {
      const amount = this.parseMoneyCOP(m[1]);
      if (amount != null && amount >= 1000) return amount;
    }

    // 2) Sin símbolo pero con miles: "12.400" "134 100"
    m = t.match(/(\d{1,3}[\.\s]\d{3}(?:[\.\s]\d{3})*)/);
    if (m) {
      const amount = this.parseMoneyCOP(m[1]);
      if (amount != null && amount >= 1000) return amount;
    }

    // 3) número simple 4-6 dígitos al final
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
      JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    );
  }
}
