import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infra/db/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

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

  async uploadAndProcess(input: UploadAndProcessInput) {
    const { file, sucursalId, fechaOperacion, userId } = input;

    if (!file) throw new BadRequestException('Falta archivo image');
    if (!sucursalId) throw new BadRequestException('Falta sucursalId');
    if (!fechaOperacion) throw new BadRequestException('Falta fechaOperacion (YYYY-MM-DD)');

    // 1) Verifica sucursal existe
    const sucursal = await this.prisma.sucursales.findUnique({
      where: { id: BigInt(sucursalId) as any },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no existe');

    // 2) Mover a carpeta por fecha/sucursal (ordenado)
    const dateFolder = fechaOperacion;
    const destDir = path.join(process.cwd(), 'uploads', 'vouchers', dateFolder, String(sucursalId));
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

    // 4) OCR + Parsing
    const ocr = await this.runOcr(finalPath);
    const parsed = this.parseVoucherText(ocr.text, ocr.confidence);

    // 5) Guardar transacciones
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

    // 6) Actualizar totales + precision
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

    // 7) Respuesta “serializable” (BigInt → string)
    return this.serializeBigInt(updated);
  }

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

  async confirmVoucher(
    id: number,
    confirmadoPorId: number,
    body: { totalVisa?: number; totalMastercard?: number; totalGlobal?: number; observacion?: string },
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
        ...(body.totalMastercard !== undefined ? { total_mastercard: body.totalMastercard } : {}),
        ...(body.totalGlobal !== undefined ? { total_global: body.totalGlobal } : {}),
      } as any,
      include: { voucher_transacciones: true },
    });

    return this.serializeBigInt(updated);
  }

  // ---------------- OCR ----------------

  private async runOcr(imagePath: string): Promise<{ text: string; confidence: number }> {
    const buffer = await sharp(imagePath)
      .grayscale()
      .resize({ width: 1800, withoutEnlargement: true })
      .sharpen()
      .toBuffer();

    const worker = await createWorker('spa');
    try {
      const { data } = await worker.recognize(buffer);
      return {
        text: data.text || '',
        confidence: data.confidence ?? 0,
      };
    } finally {
      await worker.terminate();
    }
  }

  // ---------------- PARSER ROBUSTO ----------------

  private parseVoucherText(text: string, ocrConfidence = 0) {
    const lines = text
      .split('\n')
      .map((l) => this.normalizeLine(l))
      .filter(Boolean);

    const transacciones: Array<{
      franquicia: 'VISA' | 'MASTERCARD' | 'DESCONOCIDA';
      ultimos_digitos?: string;
      numero_recibo?: string;
      monto: number;
      linea_ocr: string;
    }> = [];

    let section: Section = 'NONE';

    let totalVisa = 0;
    let totalMastercard = 0;

    for (const line of lines) {
      // Detecta cambio de sección
      const sec = this.detectSection(line);
      if (sec) section = sec;

      // Si entramos a QR, ignoramos lo que sigue (por ahora)
      if (section === 'QR') continue;

      // Filtros para no guardar basura
      if (this.isIgnorableLine(line)) continue;

      // Intenta parsear transacción
      const parsed = this.parseTxLine(line);
      if (!parsed) continue;

      // Franquicia por sección
      const franquicia =
        section === 'MC' ? 'MASTERCARD' :
        section === 'VISA' ? 'VISA' :
        'DESCONOCIDA';

      // Si aún no sabemos sección, no guardamos (evita ruido)
      if (franquicia === 'DESCONOCIDA') continue;

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

    const totalGlobal = totalVisa + totalMastercard;

    // Precision: usa la confianza OCR como base (0..100)
    const precision = Math.max(0, Math.min(99, Math.round(ocrConfidence)));

    return {
      transacciones,
      totalVisa,
      totalMastercard,
      totalGlobal,
      precision,
    };
  }

  private normalizeLine(line: string) {
    return line
      .replace(/[^\S\r\n]+/g, ' ')
      .replace(/[—–]/g, '-')
      .trim();
  }

  private detectSection(line: string): Section | null {
    const t = line.toUpperCase();
    if (t.includes('MASTERCARD')) return 'MC';
    if (t.includes('VISA')) return 'VISA';
    if (t.includes('TOTALES QR') || t.includes('EMVCO') || t.includes('QR')) return 'QR';
    return null;
  }

  private isIgnorableLine(line: string) {
    const t = line.trim().toUpperCase();
    if (!t) return true;

    // Encabezados / títulos
    if (t.includes('REPORTE DETALLADO')) return true;
    if (t.startsWith('COD') || t.startsWith('TERMINAL')) return true;
    if (t.startsWith('TJ') || t.startsWith('RECIBO') || t.startsWith('MONTO')) return true;

    // Totales / separadores
    if (t.startsWith('TOTAL')) return true;
    if (t.includes('GRAN TOTAL')) return true;

    return false;
  }

  /**
   * Parseo de línea transaccional:
   * - Captura dígitos (con ** opcional) + recibo (5-6) + monto
   * Ej:
   * "**8341 001236 $22 400"
   * "41682 001237 $24.400"   -> ultimos4 = 1682
   * "114209 001241 $36.700 3"-> ultimos4 = 4209, monto = 36700
   */
  private parseTxLine(line: string): { ultimos4: string; recibo: string; monto: number; linea: string } | null {
    const t = this.normalizeLine(line);

    // Requiere: [algo con dígitos] [recibo] [monto...]
    const m = t.match(/(\*{0,3}\d{3,10})\s+(\d{5,6})\s+\$?\s*(.+)$/);
    if (!m) return null;

    const rawDigits = m[1];   // "**8341" / "41682" / "114209"
    const recibo = m[2];      // "001236"
    const rawAmount = m[3];   // "22 400" / "24.400" / "36.700 3"

    const onlyDigits = rawDigits.replace(/\D/g, '');
    if (onlyDigits.length < 4) return null;

    const ultimos4 = onlyDigits.slice(-4);

    const monto = this.parseMoneyCOP(rawAmount);
    if (monto == null) return null;

    // Reglas anti-ruido: montos absurdamente pequeños casi siempre son OCR basura
    if (monto < 1000) return null;

    return { ultimos4, recibo, monto, linea: t };
  }

  /**
   * COP robusto:
   * - "10.400" -> 10400
   * - "22 400" -> 22400
   * - "36.700 3" -> 36700 (toma el primer bloque)
   */
  private parseMoneyCOP(raw: string): number | null {
    const cleaned = raw
      .replace(/\$/g, '')
      .replace(/[^\d.,\s]/g, '')
      .trim();

    if (!cleaned) return null;

    // Toma el primer bloque "numérico" (evita basura al final)
    const first = cleaned.match(/[\d][\d\s.,]*/)?.[0]?.trim();
    if (!first) return null;

    const noSpaces = first.replace(/\s+/g, '');

    // Quita separadores de miles "." y ","
    const digitsOnly = noSpaces.replace(/[.,]/g, '');

    const n = Number(digitsOnly);
    return Number.isFinite(n) ? n : null;
  }

  // BigInt safe
  private serializeBigInt(obj: any) {
    return JSON.parse(
      JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    );
  }
}
