import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infra/db/prisma.service';

@Injectable()
export class ParametrosSistemaService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------
  // Helpers
  // ---------------------------
  private serializeRow(row: any) {
    if (!row) return null;

    return {
      id: row.id?.toString?.() ?? null,
      tasa_comision: Number(row.tasa_comision),
      margen_error_permitido: Number(row.margen_error_permitido),
      dias_desfase_banco: Number(row.dias_desfase_banco),
      activo: Boolean(row.activo),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  // ---------------------------
  // GET /parametros-sistema/active
  // ---------------------------
  async getActive() {
    const p = await this.prisma.parametros_sistema.findFirst({
      where: { activo: true } as any,
      orderBy: { updated_at: 'desc' } as any,
    });

    // Si no existe, devolvemos defaults (para no romper conciliación)
    if (!p) {
      return {
        id: null,
        tasa_comision: 0.012,
        margen_error_permitido: 50,
        dias_desfase_banco: 1,
        activo: true,
        source: 'DEFAULTS',
      };
    }

    return {
      ...this.serializeRow(p),
      source: 'DB',
    };
  }

  // ---------------------------
  // GET /parametros-sistema
  // ---------------------------
  async list() {
    const rows = await this.prisma.parametros_sistema.findMany({
      orderBy: { id: 'desc' } as any,
    });

    return rows.map((r: any) => this.serializeRow(r));
  }

  /**
   * Crea un nuevo registro y lo deja activo (si activo=true)
   * (desactiva el anterior si existe)
   */
  // ---------------------------
  // POST /parametros-sistema
  // ---------------------------
  async create(input: {
    tasa_comision: number;
    margen_error_permitido: number;
    dias_desfase_banco: number;
    activo?: boolean;
    userId?: number;
  }) {
    if (input.tasa_comision == null || Number.isNaN(input.tasa_comision)) {
      throw new BadRequestException('Falta tasa_comision');
    }
    if (
      input.margen_error_permitido == null ||
      Number.isNaN(input.margen_error_permitido)
    ) {
      throw new BadRequestException('Falta margen_error_permitido');
    }
    if (
      input.dias_desfase_banco == null ||
      Number.isNaN(input.dias_desfase_banco)
    ) {
      throw new BadRequestException('Falta dias_desfase_banco');
    }

    const activar = input.activo ?? true;

    const created = await this.prisma.$transaction(async (tx) => {
      if (activar) {
        await tx.parametros_sistema.updateMany({
          where: { activo: true } as any,
          data: { activo: false } as any,
        });
      }

      return tx.parametros_sistema.create({
        data: {
          tasa_comision: input.tasa_comision as any,
          margen_error_permitido: input.margen_error_permitido as any,
          dias_desfase_banco: input.dias_desfase_banco,
          activo: activar,
          // Si tu tabla tiene usuario_id, descomenta:
          // usuario_id: input.userId ? BigInt(input.userId) as any : undefined,
        } as any,
      });
    });

    return this.serializeRow(created);
  }

  // ---------------------------
  // POST /parametros-sistema/:id/activate
  // ---------------------------
  async activate(id: number) {
    if (!id) throw new BadRequestException('Falta id');

    const row = await this.prisma.parametros_sistema.findUnique({
      where: { id: BigInt(id) as any } as any,
    });

    if (!row) throw new NotFoundException('parametros_sistema no existe');

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.parametros_sistema.updateMany({
        where: { activo: true } as any,
        data: { activo: false } as any,
      });

      return tx.parametros_sistema.update({
        where: { id: BigInt(id) as any } as any,
        data: { activo: true } as any,
      });
    });

    return this.serializeRow(updated);
  }
}
