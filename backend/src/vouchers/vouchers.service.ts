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

type UploadAndProcessInput = {
  file: Express.Multer.File;
  sucursalId: number;
  fechaOperacion: string; // YYYY-MM-DD
  userId: number;
};

type Section = 'MC' | 'VISA' | 'QR' | 'NONE';

@Injectable()
export class VouchersService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // =============== UPLOAD + OCR ========================
  // =====================================================

  async uploadAndProcess(input: UploadAndProcessInput) {
    const { file, sucursalId, fechaOperacion, userId } = input;

    if (!file) throw new BadRequestException('Falta archivo');
    if (!sucursalId) throw new BadRequestException('Falta sucursalId');
    if (!fechaOperacion) throw new BadRequestException('Falta fechaOperacion');

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

    // 4) OCR + parsing
    const ocr = await this.runOcr(finalPath);
    const parsed = this.parseVoucherText(ocr.text, ocr.confidence);

    // 5) Guardar transacciones (si hay)
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

    // 6) Actualizar voucher con totales + precision
    const updated = await this.prisma.vouchers.update({
      where: { id: voucher.id },
      data: {
        total_visa: parsed.totalVisa,
        total_mastercard: parsed.totalMastercard,
        total_global: parsed.totalGlobal,
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
      include: { voucher_transacciones: true },
    });

    return this.serializeBigInt(updated);
  }

  // =====================================================
  // ======================= OCR =========================
  // =====================================================

  private async runOcr(
    imagePath: string,
  ): Promise<{ text: string; confidence: number }> {
    const worker = await createWorker('spa');

    try {
      // ===== INTENTO 1 =====
      const buf1 = await sharp(imagePath)
        .grayscale()
        .resize({ width: 2000, withoutEnlargement: true })
        .sharpen()
        .toBuffer();

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      });

      const a = await worker.recognize(buf1);

      // ===== INTENTO 2 (fallback) =====
      if ((a.data.confidence ?? 0) < 35) {
        const buf2 = await sharp(imagePath)
          .grayscale()
          .normalize()
          .resize({ width: 2200, withoutEnlargement: true })
          .sharpen()
          .toBuffer();

        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        });

        const b = await worker.recognize(buf2);

        const best =
          (b.data.confidence ?? 0) > (a.data.confidence ?? 0) ? b : a;

        return {
          text: best.data.text || '',
          confidence: best.data.confidence ?? 0,
        };
      }

      return {
        text: a.data.text || '',
        confidence: a.data.confidence ?? 0,
      };
    } finally {
      await worker.terminate();
    }
  }

  // =====================================================
  // ======================= PARSER ======================
  // =====================================================

  private parseVoucherText(text: string, confidence = 0) {
    const lines = text
      .split('\n')
      .map((l) => this.normalizeLine(l))
      .filter(Boolean);

    let section: Section = 'NONE';
    let totalVisa = 0;
    let totalMastercard = 0;

    const transacciones: Array<{
      franquicia: 'VISA' | 'MASTERCARD' | 'DESCONOCIDA';
      ultimos_digitos?: string;
      numero_recibo?: string;
      monto: number;
      linea_ocr: string;
    }> = [];

    for (const line of lines) {
      const sec = this.detectSection(line);
      if (sec) section = sec;

      if (section === 'QR') continue;
      if (this.isIgnorableLine(line)) continue;

      const parsed = this.parseTxLine(line);
      if (!parsed) continue;

      const franquicia =
        section === 'MC'
          ? 'MASTERCARD'
          : section === 'VISA'
          ? 'VISA'
          : 'DESCONOCIDA';

      // ⚠️ Fallback: si no detectó sección, igual guarda (mejor que perder data)
      transacciones.push({
        franquicia,
        ultimos_digitos: parsed.ultimos4,
        numero_recibo: parsed.recibo,
        monto: parsed.monto,
        linea_ocr: parsed.linea,
      });

      if (franquicia === 'VISA') totalVisa += parsed.monto;
      if (franquicia === 'MASTERCARD') totalMastercard += parsed.monto;
    }

    return {
      transacciones,
      totalVisa,
      totalMastercard,
      totalGlobal: totalVisa + totalMastercard,
      precision: Math.round(Math.min(99, Math.max(0, confidence))),
    };
  }

  private normalizeLine(line: string) {
    return line.replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();
  }

  private detectSection(line: string): Section | null {
    const t = line.toUpperCase();
    if (t.includes('MASTERCARD')) return 'MC';
    if (t.includes('VISA')) return 'VISA';
    if (t.includes('QR')) return 'QR';
    return null;
  }

  private isIgnorableLine(line: string) {
    const t = line.toUpperCase();
    return (
      t.startsWith('TOTAL') ||
      t.includes('GRAN TOTAL') ||
      t.includes('REPORTE') ||
      t.includes('TERMINAL') ||
      t.includes('RECIBO')
    );
  }

  private parseTxLine(line: string) {
    // 1) formato ideal: **8041 007107 $12.400
    const m = line.match(/(\*?\d{4,10})\s+(\d{5,6})\s+\$?\s*(.+)$/);
    if (!m) return null;

    const digits = m[1].replace(/\D/g, '');
    if (digits.length < 4) return null;

    const monto = this.parseMoneyCOP(m[3]);
    if (!monto || monto < 1000) return null;

    return {
      ultimos4: digits.slice(-4),
      recibo: m[2],
      monto,
      linea: line,
    };
  }

  private parseMoneyCOP(raw: string): number | null {
    const clean = raw.replace(/[^\d.,\s]/g, '').trim();
    const block = clean.match(/[\d][\d\s.,]*/)?.[0];
    if (!block) return null;

    const n = Number(block.replace(/\s+/g, '').replace(/[.,]/g, ''));
    return Number.isFinite(n) ? n : null;
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
