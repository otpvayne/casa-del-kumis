import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infra/db/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { parseRedeBanExcel } from './parser/redeban.parser';

type UploadRedeBanInput = {
  file: Express.Multer.File;
  sucursalId?: number; // opcional (si tu archivo aplica a una sucursal)
  fechaConciliacion: string; // YYYY-MM-DD
  userId: number;
};

@Injectable()
export class RedeBanService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // =============== UPLOAD + PARSE + SAVE ===============
  // =====================================================
  async uploadAndProcess(input: UploadRedeBanInput) {
    const { file, sucursalId, fechaConciliacion, userId } = input;

    if (!file) throw new BadRequestException('Falta archivo');
    if (!fechaConciliacion)
      throw new BadRequestException('Falta fechaConciliacion (YYYY-MM-DD)');
    if (!userId) throw new BadRequestException('Falta userId');

    // Acepta .xls y .xlsx
    const allowedMimes = [
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    ];
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExt = ['.xls', '.xlsx'];

    if (!allowedMimes.includes(file.mimetype) && !allowedExt.includes(ext)) {
      throw new BadRequestException('Formato no permitido. Usa .xls o .xlsx');
    }

    // (Opcional) valida sucursal si viene
    if (sucursalId) {
      const sucursal = await this.prisma.sucursales.findUnique({
        where: { id: BigInt(sucursalId) as any },
      });
      if (!sucursal) throw new NotFoundException('Sucursal no existe');
    }

    // 1) Guardar archivo en uploads/redeban/YYYY-MM-DD/
    const destDir = path.join(
      process.cwd(),
      'uploads',
      'redeban',
      fechaConciliacion,
    );
    fs.mkdirSync(destDir, { recursive: true });

    const finalPath = path.join(destDir, file.filename);
    fs.renameSync(file.path, finalPath);

    // 2) Leer buffer + hash (para deduplicación)
    const buffer = fs.readFileSync(finalPath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // (Opcional recomendado) evitar subir el mismo archivo 2 veces
    const already = await this.prisma.archivos_redeban.findFirst({
      where: { hash_contenido: hash },
    });
    if (already) {
      // Si ya existía, puedes borrar el archivo físico recién guardado
      try {
        fs.unlinkSync(finalPath);
      } catch {}
      throw new BadRequestException(
        `Este archivo ya fue cargado (hash repetido). Archivo ID: ${already.id.toString?.() ?? already.id}`,
      );
    }

    // 3) Parsear excel (esto lanza error si no encuentra header o filas válidas)
    let parsedRows: ReturnType<typeof parseRedeBanExcel>;
    try {
      parsedRows = parseRedeBanExcel(buffer);
    } catch (e: any) {
      throw new BadRequestException(
        `No pude leer el archivo RedeBan: ${e?.message ?? 'Error de parseo'}`,
      );
    }

    // 4) Guardar en BD: archivo + registros (transacción)
    const created = await this.prisma.$transaction(async (tx) => {
      const archivo = await tx.archivos_redeban.create({
        data: {
          fecha_conciliacion: new Date(fechaConciliacion),
          nombre_original: file.originalname,
          ruta_archivo: finalPath,
          hash_contenido: hash,
          estado: 'CARGADO', // ajusta a tu enum/strings reales
          usuario_id: BigInt(userId) as any,
        } as any,
      });

      // createMany de registros
      if (parsedRows.length > 0) {
        await tx.registros_redeban.createMany({
          data: parsedRows.map((r) => ({
            archivo_redeban_id: archivo.id,
            sucursal_id: sucursalId ? (BigInt(sucursalId) as any) : null,

            codigo_comercio: r.codigo_comercio,
            direccion: r.direccion ?? null,

            cantidad_transacciones: r.cantidad_transacciones ?? null,

            valor_bruto: r.valor_bruto ?? null,
            iva: r.iva ?? null,
            consumo: r.consumo ?? null,

            tasa_aerop_propina: r.tasa_aerop_propina ?? null,

            base_liquidacion: r.base_liquidacion ?? null,
            comision: r.comision ?? null,

            retefuente: r.retefuente ?? null,
            rete_iva: r.rete_iva ?? null,
            rete_ica: r.rete_ica ?? null,

            neto: r.neto ?? null,
          })) as any,
        });
      }

      // (Opcional) marca procesado
      const archivoUpdated = await tx.archivos_redeban.update({
        where: { id: archivo.id },
        data: { estado: 'PROCESADO' } as any,
      });

      return { archivo: archivoUpdated };
    });

    // 5) Respuesta (incluye conteo)
    const count = await this.prisma.registros_redeban.count({
      where: { archivo_redeban_id: BigInt(created.archivo.id as any) as any },
    });

    return this.serializeBigInt({
      ...created.archivo,
      registros_count: count,
    });
  }

  // =====================================================
  // ====================== GET ARCHIVO ==================
  // =====================================================
  async getArchivo(archivoId: number) {
    const archivo = await this.prisma.archivos_redeban.findUnique({
      where: { id: BigInt(archivoId) as any },
    });
    if (!archivo) throw new NotFoundException('Archivo RedeBan no encontrado');
    return this.serializeBigInt(archivo);
  }

  // =====================================================
  // =============== GET ARCHIVO + REGISTROS =============
  // =====================================================
  async getArchivoConRegistros(archivoId: number) {
    const archivo = await this.prisma.archivos_redeban.findUnique({
      where: { id: BigInt(archivoId) as any },
    });
    if (!archivo) throw new NotFoundException('Archivo RedeBan no encontrado');

    const registros = await this.prisma.registros_redeban.findMany({
      where: { archivo_redeban_id: BigInt(archivoId) as any },
      orderBy: { id: 'asc' },
    });

    return this.serializeBigInt({
      archivo,
      registros,
    });
  }

  // =====================================================
  // ======================= LISTAR ======================
  // =====================================================
  async listArchivos(params?: { fecha?: string; take?: number; skip?: number }) {
    const take = Math.min(Math.max(params?.take ?? 30, 1), 200);
    const skip = Math.max(params?.skip ?? 0, 0);

    const where: any = {};
    if (params?.fecha) {
      // Filtra por día (YYYY-MM-DD)
      const d = new Date(params.fecha);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);

      where.fecha_conciliacion = { gte: start, lte: end };
    }

    const items = await this.prisma.archivos_redeban.findMany({
      where,
      orderBy: { id: 'desc' },
      take,
      skip,
    });

    return this.serializeBigInt(items);
  }

  // =====================================================
  // ======================= DELETE ======================
  // =====================================================
  async deleteArchivo(archivoId: number) {
    const archivo = await this.prisma.archivos_redeban.findUnique({
      where: { id: BigInt(archivoId) as any },
    });
    if (!archivo) throw new NotFoundException('Archivo RedeBan no encontrado');

    await this.prisma.$transaction(async (tx) => {
      await tx.registros_redeban.deleteMany({
        where: { archivo_redeban_id: BigInt(archivoId) as any },
      });

      await tx.archivos_redeban.delete({
        where: { id: BigInt(archivoId) as any },
      });
    });

    // borrar archivo físico
    try {
      if (archivo.ruta_archivo) fs.unlinkSync(String(archivo.ruta_archivo));
    } catch {}

    return { ok: true };
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
