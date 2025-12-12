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
    const parsed = this.parseVoucherText(ocr.text);

    // 5) Guardar transacciones (una por línea)
    if (parsed.transacciones.length > 0) {
      await this.prisma.voucher_transacciones.createMany({
        data: parsed.transacciones.map((t) => ({
          voucher_id: voucher.id,
          franquicia: t.franquicia,
          ultimos_digitos: t.ultimos_digitos,
          numero_recibo: t.numero_recibo,
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
    // Preproceso básico (mejora mucho)
    const buffer = await sharp(imagePath)
      .grayscale()
      .resize({ width: 1600, withoutEnlargement: true })
      .toBuffer();

    const worker = await createWorker('spa'); // vouchers en español
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

  // Parsing simple (lo iremos refinando con tus vouchers reales)
  private parseVoucherText(text: string) {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Ejemplo de heurísticas:
    // línea típica: "MC **8544 001041 $ 14.700"
    const tx: Array<{
      franquicia: string;
      ultimos_digitos?: string;
      numero_recibo?: string;
      monto: any;
      linea_ocr: string;
    }> = [];

    let totalVisa = 0;
    let totalMastercard = 0;

    for (const line of lines) {
      const upper = line.toUpperCase();

      // Detecta franquicia
      const franquicia =
        upper.includes('VISA') ? 'VISA' :
        upper.includes('MASTER') || upper.includes('MC') ? 'MASTERCARD' :
        'DESCONOCIDA';

      // Últimos dígitos: **8544 o 8544
      const digitos = line.match(/\*{2,}\s?(\d{4})/)?.[1] ?? line.match(/\b(\d{4})\b/)?.[1];

      // Recibo: 001041 (6 dígitos típico)
      const recibo = line.match(/\b(\d{6})\b/)?.[1];

      // Monto: $ 12.262,00 o 12.262,00
      const montoMatch = line.match(/(\$?\s?[\d\.\,]+)\s?$/);
      const monto = montoMatch ? this.parseMoneyToNumber(montoMatch[1]) : null;

      // guardamos solo si parece transacción (tiene monto y algo identificable)
      if (monto !== null && (franquicia !== 'DESCONOCIDA' || digitos || recibo)) {
        tx.push({
          franquicia,
          ultimos_digitos: digitos,
          numero_recibo: recibo,
          monto,
          linea_ocr: line,
        });

        if (franquicia === 'VISA') totalVisa += monto;
        if (franquicia === 'MASTERCARD') totalMastercard += monto;
      }
    }

    const totalGlobal = totalVisa + totalMastercard;

    // “precision” muy básica: usamos confidence del OCR después (aquí placeholder)
    const precision = Math.min(99, Math.max(0, 75));

    return {
      transacciones: tx,
      totalVisa,
      totalMastercard,
      totalGlobal,
      precision,
    };
  }

  private parseMoneyToNumber(raw: string): number | null {
  // Convierte: "$ 12.262,00" → 12262.00
  const cleaned = raw.replace(/\$/g, '').trim();

  // formato latam: miles "." y decimales ","
  const normalized = cleaned.replace(/\./g, '').replace(/,/g, '.');

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}


  // BigInt safe
  private serializeBigInt(obj: any) {
    return JSON.parse(
      JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
    );
  }
}
