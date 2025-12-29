// src/conciliacion/conciliacion.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infra/db/prisma.service';

type ParamsSistema = {
  tasa_comision: number; // ej 0.012
  margen_error_permitido: number; // ej 100 (pesos) o 0.00
  dias_desfase_banco: number; // ej 1
};

type VoucherTxLite = {
  id: bigint;
  voucher_id: bigint;
  franquicia: 'VISA' | 'MASTERCARD' | 'DESCONOCIDA';
  ultimos_digitos: string | null;
  numero_recibo: string | null;
  monto: number; // pesos
};

type BancoDetLite = {
  id: bigint;
  sucursal_id: bigint | null;
  fecha_vale: Date | null;
  fecha_abono: Date | null;
  terminal: string | null;
  numero_autoriza: string | null;
  tarjeta_socio: string | null;
  franquicia: 'VISA' | 'MASTERCARD' | 'DESCONOCIDA';
  valor_consumo: number; // pesos
  imp_al_consumo: number; // pesos
  valor_neto: number; // pesos
  valor_comision: number; // pesos (si viene)
};

type MatchCandidate = {
  banco: BancoDetLite;
  montoBancoMatch: number;
  last4: string | null;
  diffMonto: number;
};

@Injectable()
export class ConciliacionService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // =============== GENERAR CONCILIACIÓN ================
  // =====================================================
  async generarConciliacion(input: {
    sucursalId: number;
    fechaVentas: string; // YYYY-MM-DD
    userId: number; // (por si luego quieres logs)
    force?: boolean;
  }) {
    const { sucursalId, fechaVentas, force } = input;

    if (!fechaVentas) {
      throw new BadRequestException('Falta fechaVentas (YYYY-MM-DD)');
    }

    // Validar sucursal
    const sucursal = await this.prisma.sucursales.findUnique({
      where: { id: BigInt(sucursalId) as any },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no existe');

    const fecha = this.parseDateOnly(fechaVentas);

    // Params sistema (tomamos el activo más reciente)
    const params = await this.getParametrosSistema();

    // 1) Voucher del día (DEBE ser CONFIRMADO)
    const voucher = await this.prisma.vouchers.findFirst({
      where: {
        sucursal_id: BigInt(sucursalId) as any,
        fecha_operacion: fecha,
      } as any,
      include: {
        voucher_transacciones: { orderBy: { id: 'asc' } },
      },
    });

    if (!voucher) {
      throw new NotFoundException(
        `No existe voucher para sucursal=${sucursalId} fecha=${fechaVentas}`,
      );
    }

    if (String(voucher.estado) !== 'CONFIRMADO') {
      throw new BadRequestException(
        `El voucher debe estar en estado CONFIRMADO para conciliar. Estado actual=${voucher.estado}`,
      );
    }

    // 2) Registros RedeBan del día por sucursal (si no existe, igual conciliamos)
    // OJO: tus archivos_redeban usan fecha_conciliacion. Usamos esa misma fecha.
    const regRedeBan = await this.prisma.registros_redeban.findMany({
  where: {
    sucursal_id: BigInt(sucursalId) as any,
    archivos_redeban: {
      fecha_conciliacion: fecha,
    },
  } as any,
  select: {
    archivo_redeban_id: true,   // ✅ NUEVO
    base_liquidacion: true,
    valor_bruto: true,          // ✅ NUEVO (para tu nueva fórmula)
  } as any,
});

const redebanArchivoIds = Array.from(
  new Set(regRedeBan.map((r: any) => r.archivo_redeban_id).filter(Boolean)),
) as bigint[];

const archivoRedeBanId: bigint | null =
  redebanArchivoIds.length === 1 ? redebanArchivoIds[0] : null;

if (redebanArchivoIds.length > 1) {
  throw new BadRequestException(
    `Hay múltiples archivo_redeban_id para la misma sucursal+fecha. IDs=${redebanArchivoIds.join(', ')}`
  );
}

    // 3) Banco detalle del día por sucursal (según tu diseño: un excel por sucursal)
    // Usamos fecha_vale para “fecha de venta”.
    const bancoRowsRaw = await this.prisma.registros_banco_detalle.findMany({
      where: {
        sucursal_id: BigInt(sucursalId) as any,
        fecha_vale: fecha,
      } as any,
      select: {
        id: true,
        archivo_banco_id: true,
        sucursal_id: true,
        fecha_vale: true,
        fecha_abono: true,
        terminal: true,
        numero_autoriza: true,
        tarjeta_socio: true,
        franquicia: true,
        valor_consumo: true,
        imp_al_consumo: true,
        valor_neto: true,
        valor_comision: true,
      } as any,
      orderBy: { id: 'asc' } as any,
    });
const bancoArchivoIds = Array.from(
  new Set(bancoRowsRaw.map((r: any) => r.archivo_banco_id).filter(Boolean)),
) as bigint[];

const archivoBancoId: bigint | null =
  bancoArchivoIds.length === 1 ? bancoArchivoIds[0] : null;

// Si quieres ser estricto (recomendado):
if (bancoArchivoIds.length > 1) {
  throw new BadRequestException(
    `Hay múltiples archivo_banco_id para la misma sucursal+fecha. IDs=${bancoArchivoIds.join(', ')}`
  );
}

    // Parse to numbers (Decimal -> number safe for COP; si manejas centavos reales, ajusta)
    const bancoRows: BancoDetLite[] = bancoRowsRaw.map((r: any) => ({
      id: r.id as bigint,
      sucursal_id: r.sucursal_id as bigint | null,
      fecha_vale: r.fecha_vale as Date | null,
      fecha_abono: r.fecha_abono as Date | null,
      terminal: r.terminal ?? null,
      numero_autoriza: r.numero_autoriza ?? null,
      tarjeta_socio: r.tarjeta_socio ?? null,
      franquicia: (r.franquicia ?? 'DESCONOCIDA') as any,
      valor_consumo: this.decToNumber(r.valor_consumo),
      imp_al_consumo: this.decToNumber(r.imp_al_consumo),
      valor_neto: this.decToNumber(r.valor_neto),
      valor_comision: this.decToNumber(r.valor_comision),
    }));

    const voucherTxs: VoucherTxLite[] = (voucher.voucher_transacciones as any[]).map(
      (t: any) => ({
        id: t.id as bigint,
        voucher_id: t.voucher_id as bigint,
        franquicia: (t.franquicia ?? 'DESCONOCIDA') as any,
        ultimos_digitos: t.ultimos_digitos ?? null,
        numero_recibo: t.numero_recibo ?? null,
        monto: this.decToNumber(t.monto),
      }),
    );

    // 4) Crear/Upsert conciliación (por sucursal+fecha)
    const existingConc = await this.prisma.conciliaciones.findUnique({
  where: {
    sucursal_id_fecha_ventas: {
      sucursal_id: BigInt(sucursalId) as any,
      fecha_ventas: fecha,
    },
  } as any,
});


    if (existingConc && !force) {
      // si ya existe y no force, recalculamos igual (es lo más práctico)
      // pero si quieres bloquear, cambia esto por throw.
    }

    const baseLiquidacionRedeBan = this.sumDecimalsToNumber(
      regRedeBan.map((x: any) => x.base_liquidacion),
    );

    // totales voucher
    const totalVisaVoucher = this.decToNumber(voucher.total_visa);
    const totalMcVoucher = this.decToNumber(voucher.total_mastercard);
    const totalGlobalVoucher = this.decToNumber(voucher.total_global);

    // totales banco
    const totalBancoAjustado = bancoRows.reduce(
      (acc, b) => acc + (b.valor_neto || 0),
      0,
    );

    // comisión esperada total sobre consumo (sin incluir imp)
    const comisionEsperadaTotal = bancoRows.reduce((acc, b) => {
      const consumo = b.valor_consumo || 0;
      return acc + consumo * params.tasa_comision;
    }, 0);

    // diferencia (puedes ajustar tu métrica; esta es útil)
   // =======================
// NUEVA LÓGICA REDEBAN
// =======================

// Base liquidación RedeBan


// Valor bruto RedeBan
const valorBrutoRedeBan = this.sumDecimalsToNumber(
  regRedeBan.map((x: any) => x.valor_bruto),
);

// Neto esperado RedeBan según fórmula oficial
// Neto = ValorBruto - (BaseLiquidacion * tasa_comision)
const netoEsperadoRedeBan = this.round2(
  valorBrutoRedeBan - (baseLiquidacionRedeBan * params.tasa_comision),
);

// Diferencia final vs banco
const diferenciaCalculada = this.round2(
  totalBancoAjustado - netoEsperadoRedeBan
);


    // 5) Match por transacción
    const match = this.matchTxs({
      params,
      fechaVenta: fecha,
      voucherTxs,
      bancoRows,
    });

    // 6) Persistencia atómica
    const result = await this.prisma.$transaction(async (tx) => {
      const conc = await tx.conciliaciones.upsert({
  where: {
    sucursal_id_fecha_ventas: {
      sucursal_id: BigInt(sucursalId) as any,
      fecha_ventas: fecha,
    },
  } as any,
        create: {
          archivo_redeban_id: archivoRedeBanId ? (archivoRedeBanId as any) : null,
archivo_banco_id: archivoBancoId ? (archivoBancoId as any) : null,
          sucursal_id: BigInt(sucursalId) as any,
          fecha_ventas: fecha,
          voucher_id: voucher.id,
          estado: 'GENERADA',
          total_visa_voucher: totalVisaVoucher,
          total_mc_voucher: totalMcVoucher,
          total_global_voucher: totalGlobalVoucher,
          base_liquidacion_redeban: baseLiquidacionRedeBan,
          total_banco_ajustado: totalBancoAjustado,
          comision_esperada: comisionEsperadaTotal,
          diferencia_calculada: diferenciaCalculada,
          margen_permitido: params.margen_error_permitido,
          causa_principal: match.causaPrincipal,
        } as any,
        update: {
          voucher_id: voucher.id,
          archivo_redeban_id: archivoRedeBanId ? (archivoRedeBanId as any) : null,
archivo_banco_id: archivoBancoId ? (archivoBancoId as any) : null,

          estado: 'GENERADA',
          total_visa_voucher: totalVisaVoucher,
          total_mc_voucher: totalMcVoucher,
          total_global_voucher: totalGlobalVoucher,
          base_liquidacion_redeban: baseLiquidacionRedeBan,
          total_banco_ajustado: totalBancoAjustado,
          comision_esperada: comisionEsperadaTotal,
          diferencia_calculada: diferenciaCalculada,
          margen_permitido: params.margen_error_permitido,
          causa_principal: match.causaPrincipal,
        } as any,
      });

      // reemplazar detalle
      await tx.conciliacion_transacciones.deleteMany({
        where: { conciliacion_id: conc.id } as any,
      });

      if (match.concTxRows.length > 0) {
        await tx.conciliacion_transacciones.createMany({
          data: match.concTxRows.map((r) => ({
            ...r,
            conciliacion_id: conc.id,
            sucursal_id: BigInt(sucursalId) as any,
            fecha_venta: fecha,
          })) as any,
        });
      }

      const concFull = await tx.conciliaciones.findUnique({
        where: { id: conc.id } as any,
        include: {
          conciliacion_transacciones: { orderBy: { id: 'asc' } },
          sucursales: true,
          vouchers: true,
          archivos_redeban: true,
          archivos_banco: true,
        } as any,
      });

      return concFull;
    });

    return this.serializeBigInt({
      params,
      resumen: {
        sucursalId,
        fechaVentas,
        voucherId: String(voucher.id),
        totalVisaVoucher,
        totalMcVoucher,
        totalGlobalVoucher,
        baseLiquidacionRedeBan,
        totalBancoAjustado,
        comisionEsperadaTotal: this.round2(comisionEsperadaTotal),
        diferenciaCalculada: this.round2(diferenciaCalculada),
        matchStats: match.stats,
        causaPrincipal: match.causaPrincipal,
      },
      conciliacion: result,
    });
  }

  // =====================================================
  // ==================== MATCH ENGINE ===================
  // =====================================================

  private matchTxs(input: {
    params: ParamsSistema;
    fechaVenta: Date;
    voucherTxs: VoucherTxLite[];
    bancoRows: BancoDetLite[];
  }) {
    const { params, voucherTxs, bancoRows } = input;

    const margen = params.margen_error_permitido;

    const bancoUsed = new Set<bigint>();

    const bancoIndex: Array<{
      banco: BancoDetLite;
      last4: string | null;
      montoMatch: number; // consumo + imp
    }> = bancoRows.map((b) => ({
      banco: b,
      last4: this.extractLast4FromTarjetaSocio(b.tarjeta_socio),
      montoMatch: (b.valor_consumo || 0) + (b.imp_al_consumo || 0),
    }));

    const concTxRows: any[] = [];

    let ok = 0;
    let comisionIncorrecta = 0;
    let valorDiferente = 0;
    let sinBanco = 0;
    let sinVoucher = 0;
    let abonoDiaSiguiente = 0;

    // 1) Match voucher -> banco
    for (const v of voucherTxs) {
      const vLast4 = (v.ultimos_digitos || '').trim() || null;
      const vMonto = v.monto || 0;

      if (!vLast4) {
        // si no hay last4, lo mandamos a revisión (sin banco)
        concTxRows.push(
          this.buildConcTx({
            voucher_tx_id: v.id,
            banco_detalle_id: null,
            franquicia: v.franquicia,
            ultimos_digitos: null,
            numero_recibo: v.numero_recibo,
            terminal: null,
            numero_autoriza: null,
            fecha_vale: null,
            fecha_abono: null,
            monto_voucher: vMonto,
            valor_consumo_banco: null,
            valor_neto_banco: null,
            base_liquidacion_redeban: null,
            comision_banco: null,
            comision_esperada: null,
            diferencia_comision: null,
            estado: 'SIN_BANCO',
            es_abono_dia_siguiente: false,
            observacion: 'Voucher tx sin ultimos_digitos',
          }),
        );
        sinBanco++;
        continue;
      }

      // candidatos: mismo last4 y no usados
      const candidates: MatchCandidate[] = bancoIndex
        .filter((x) => x.last4 === vLast4 && !bancoUsed.has(x.banco.id))
        .map((x) => ({
          banco: x.banco,
          montoBancoMatch: x.montoMatch,
          last4: x.last4,
          diffMonto: Math.abs(x.montoMatch - vMonto),
        }))
        .filter((c) => c.diffMonto <= margen);

      if (candidates.length === 0) {
        // no hay banco para este voucher tx
        concTxRows.push(
          this.buildConcTx({
            voucher_tx_id: v.id,
            banco_detalle_id: null,
            franquicia: v.franquicia,
            ultimos_digitos: vLast4,
            numero_recibo: v.numero_recibo,
            terminal: null,
            numero_autoriza: null,
            fecha_vale: null,
            fecha_abono: null,
            monto_voucher: vMonto,
            valor_consumo_banco: null,
            valor_neto_banco: null,
            base_liquidacion_redeban: null,
            comision_banco: null,
            comision_esperada: null,
            diferencia_comision: null,
            estado: 'SIN_BANCO',
            es_abono_dia_siguiente: false,
            observacion: 'No se encontró transacción banco con mismo last4 + monto (consumo+imp)',
          }),
        );
        sinBanco++;
        continue;
      }

      // escoger el de menor diferencia
      candidates.sort((a, b) => a.diffMonto - b.diffMonto);
      const best = candidates[0];
      bancoUsed.add(best.banco.id);

      const consumo = best.banco.valor_consumo || 0;
      const imp = best.banco.imp_al_consumo || 0;
      const netoBanco = best.banco.valor_neto || 0;

      // neto esperado: (consumo - consumo*tasa) + imp
      const netoEsperado = (consumo - consumo * params.tasa_comision) + imp;

      // comisión real (pesos) desde neto:
      const comisionRealPesos = (consumo + imp) - netoBanco;

      const diffNeto = Math.abs(netoBanco - netoEsperado);
      const diffMonto = Math.abs((consumo + imp) - vMonto);

      // estado por monto / comisión
      let estado: any = 'MATCH_OK';

      if (diffMonto > margen) {
        estado = 'VALOR_DIFERENTE';
        valorDiferente++;
      } else if (diffNeto > margen) {
        estado = 'COMISION_INCORRECTA';
        comisionIncorrecta++;
      } else {
        ok++;
      }

      // abono día siguiente
      const esDiaSig = this.isAbonoDiaSiguiente(
        best.banco.fecha_vale,
        best.banco.fecha_abono,
        params.dias_desfase_banco,
      );
      let esAbonoDiaSiguiente = false;
      if (estado === 'MATCH_OK' && esDiaSig) {
        estado = 'ABONO_DIA_SIGUIENTE';
        esAbonoDiaSiguiente = true;
        abonoDiaSiguiente++;
      }

      concTxRows.push(
        this.buildConcTx({
          voucher_tx_id: v.id,
          banco_detalle_id: best.banco.id,
          franquicia: best.banco.franquicia !== 'DESCONOCIDA' ? best.banco.franquicia : v.franquicia,
          ultimos_digitos: vLast4,
          numero_recibo: v.numero_recibo,
          terminal: best.banco.terminal,
          numero_autoriza: best.banco.numero_autoriza,
          fecha_vale: best.banco.fecha_vale,
          fecha_abono: best.banco.fecha_abono,
          monto_voucher: vMonto,
          valor_consumo_banco: consumo,
          valor_neto_banco: netoBanco,
          base_liquidacion_redeban: null,
          comision_banco: this.round2(comisionRealPesos),
          comision_esperada: this.round2(consumo * params.tasa_comision),
          diferencia_comision: this.round2(Math.abs(netoBanco - netoEsperado)),
          estado,
          es_abono_dia_siguiente: esAbonoDiaSiguiente,
          observacion:
            estado === 'COMISION_INCORRECTA'
              ? `Neto esperado=${this.round2(netoEsperado)} vs neto banco=${this.round2(netoBanco)}`
              : estado === 'VALOR_DIFERENTE'
                ? `Monto voucher=${this.round2(vMonto)} vs (consumo+imp)=${this.round2(consumo + imp)}`
                : null,
        }),
      );
    }

    // 2) Banco sobrantes -> SIN_VOUCHER
    for (const b of bancoRows) {
      if (bancoUsed.has(b.id)) continue;

      const last4 = this.extractLast4FromTarjetaSocio(b.tarjeta_socio);
      const consumo = b.valor_consumo || 0;
      const imp = b.imp_al_consumo || 0;
      const netoBanco = b.valor_neto || 0;

      // neto esperado + comisión real (info útil)
      const netoEsperado = (consumo - consumo * params.tasa_comision) + imp;
      const comisionRealPesos = (consumo + imp) - netoBanco;

      concTxRows.push(
        this.buildConcTx({
          voucher_tx_id: null,
          banco_detalle_id: b.id,
          franquicia: b.franquicia,
          ultimos_digitos: last4,
          numero_recibo: null,
          terminal: b.terminal,
          numero_autoriza: b.numero_autoriza,
          fecha_vale: b.fecha_vale,
          fecha_abono: b.fecha_abono,
          monto_voucher: null,
          valor_consumo_banco: consumo,
          valor_neto_banco: netoBanco,
          base_liquidacion_redeban: null,
          comision_banco: this.round2(comisionRealPesos),
          comision_esperada: this.round2(consumo * params.tasa_comision),
          diferencia_comision: this.round2(Math.abs(netoBanco - netoEsperado)),
          estado: 'SIN_VOUCHER',
          es_abono_dia_siguiente: false,
          observacion: 'Existe en banco pero no en voucher (mismo día)',
        }),
      );
      sinVoucher++;
    }

    const stats = {
      totalVoucherTx: voucherTxs.length,
      totalBancoTx: bancoRows.length,
      matchOk: ok,
      abonoDiaSiguiente,
      comisionIncorrecta,
      valorDiferente,
      sinBanco,
      sinVoucher,
      totalGeneradas: concTxRows.length,
    };

    const causaPrincipal = this.pickCausaPrincipal(stats);

    return { concTxRows, stats, causaPrincipal };
  }

  private pickCausaPrincipal(stats: any): string {
    // prioridad típica
    if (stats.comisionIncorrecta > 0) return 'COMISION_INCORRECTA';
    if (stats.valorDiferente > 0) return 'VALOR_DIFERENTE';
    if (stats.sinBanco > 0) return 'SIN_BANCO';
    if (stats.sinVoucher > 0) return 'SIN_VOUCHER';
    if (stats.abonoDiaSiguiente > 0) return 'ABONO_DIA_SIGUIENTE';
    return 'MATCH_OK';
  }

  private buildConcTx(row: {
    voucher_tx_id: bigint | null;
    banco_detalle_id: bigint | null;

    terminal: string | null;
    franquicia: any;
    ultimos_digitos: string | null;
    numero_autoriza: string | null;
    numero_recibo: string | null;

    fecha_vale: Date | null;
    fecha_abono: Date | null;

    monto_voucher: number | null;
    valor_consumo_banco: number | null;
    valor_neto_banco: number | null;

    base_liquidacion_redeban: number | null;
    comision_banco: number | null;
    comision_esperada: number | null;
    diferencia_comision: number | null;

    estado: any;
    es_abono_dia_siguiente: boolean;
    observacion: string | null;
  }) {
    return {
      voucher_tx_id: row.voucher_tx_id ? (row.voucher_tx_id as any) : null,
      banco_detalle_id: row.banco_detalle_id ? (row.banco_detalle_id as any) : null,
      terminal: row.terminal,
      franquicia: row.franquicia,
      ultimos_digitos: row.ultimos_digitos,
      numero_autoriza: row.numero_autoriza,
      numero_recibo: row.numero_recibo,
      fecha_vale: row.fecha_vale,
      fecha_abono: row.fecha_abono,
      monto_voucher: row.monto_voucher,
      valor_consumo_banco: row.valor_consumo_banco,
      valor_neto_banco: row.valor_neto_banco,
      base_liquidacion_redeban: row.base_liquidacion_redeban,
      comision_banco: row.comision_banco,
      comision_esperada: row.comision_esperada,
      diferencia_comision: row.diferencia_comision,
      estado: row.estado,
      es_abono_dia_siguiente: row.es_abono_dia_siguiente,
      observacion: row.observacion,
    };
  }

  // =====================================================
  // ================== PARAMS SISTEMA ===================
  // =====================================================
  private async getParametrosSistema(): Promise<ParamsSistema> {
    const p = await this.prisma.parametros_sistema.findFirst({
      where: { activo: true } as any,
      orderBy: { updated_at: 'desc' } as any,
    });

    if (!p) {
      // defaults seguros
      return {
        tasa_comision: 0.012,
        margen_error_permitido: 50,
        dias_desfase_banco: 1,
      };
    }

    return {
      tasa_comision: Number(p.tasa_comision),
      margen_error_permitido: Number(p.margen_error_permitido),
      dias_desfase_banco: Number(p.dias_desfase_banco),
    };
  }

  // =====================================================
  // =================== HELPERS DATE ====================
  // =====================================================
  private parseDateOnly(yyyyMmDd: string): Date {
    // construye Date en UTC a medianoche
    // importante para tu @db.Date
    const [y, m, d] = yyyyMmDd.split('-').map((x) => parseInt(x, 10));
    if (!y || !m || !d) throw new BadRequestException('Fecha inválida (YYYY-MM-DD)');
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  }

  private isAbonoDiaSiguiente(
    fechaVale: Date | null,
    fechaAbono: Date | null,
    diasDesfase: number,
  ): boolean {
    if (!fechaVale || !fechaAbono) return false;

    const v = Date.UTC(
      fechaVale.getUTCFullYear(),
      fechaVale.getUTCMonth(),
      fechaVale.getUTCDate(),
    );
    const a = Date.UTC(
      fechaAbono.getUTCFullYear(),
      fechaAbono.getUTCMonth(),
      fechaAbono.getUTCDate(),
    );

    const diffDays = Math.round((a - v) / (1000 * 60 * 60 * 24));
    return diffDays === diasDesfase;
  }

  // =====================================================
  // =================== HELPERS MONEY ===================
  // =====================================================
  private decToNumber(v: any): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    // Prisma Decimal suele venir como string
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  private sumDecimalsToNumber(list: any[]): number {
    return this.round2(list.reduce((acc, x) => acc + this.decToNumber(x), 0));
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private extractLast4FromTarjetaSocio(t: string | null): string | null {
    if (!t) return null;
    const digits = String(t).replace(/\D/g, '');
    if (digits.length < 4) return null;
    return digits.slice(-4);
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
  async getResumen(id: number) {
  const conc = await this.prisma.conciliaciones.findUnique({
    where: { id: BigInt(id) as any },
    include: {
      conciliacion_transacciones: true,
      sucursales: true,
      vouchers: true,
    } as any,
  });

  if (!conc) throw new NotFoundException(`Conciliación ${id} no existe`);

  const rows = (conc.conciliacion_transacciones as any[]) || [];

  // 1) Conteo por estado
  const conteoPorEstado = rows.reduce((acc: any, r: any) => {
    const k = String(r.estado || 'SIN_ESTADO');
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // 2) Lista SIN_BANCO
  const sinBanco = rows
    .filter((r: any) => String(r.estado) === 'SIN_BANCO')
    .map((r: any) => ({
      id: String(r.id),
      voucher_tx_id: r.voucher_tx_id ? String(r.voucher_tx_id) : null,
      ultimos_digitos: r.ultimos_digitos,
      numero_recibo: r.numero_recibo,
      monto_voucher: r.monto_voucher,
      observacion: r.observacion,
    }));

  // 3) Lista SIN_VOUCHER
  const sinVoucher = rows
    .filter((r: any) => String(r.estado) === 'SIN_VOUCHER')
    .map((r: any) => ({
      id: String(r.id),
      banco_detalle_id: r.banco_detalle_id ? String(r.banco_detalle_id) : null,
      ultimos_digitos: r.ultimos_digitos,
      terminal: r.terminal,
      numero_autoriza: r.numero_autoriza,
      valor_consumo_banco: r.valor_consumo_banco,
      valor_neto_banco: r.valor_neto_banco,
      observacion: r.observacion,
    }));

  // 4) Top diferencias de comisión (usa diferencia_comision si la estás guardando)
  const topDiffComision = rows
    .filter((r: any) => r.diferencia_comision !== null && r.diferencia_comision !== undefined)
    .map((r: any) => ({
      id: String(r.id),
      estado: r.estado,
      ultimos_digitos: r.ultimos_digitos,
      diferencia_comision: Number(r.diferencia_comision),
      comision_esperada: r.comision_esperada,
      comision_banco: r.comision_banco,
      banco_detalle_id: r.banco_detalle_id ? String(r.banco_detalle_id) : null,
      voucher_tx_id: r.voucher_tx_id ? String(r.voucher_tx_id) : null,
    }))
    .sort((a: any, b: any) => b.diferencia_comision - a.diferencia_comision)
    .slice(0, 10);

  return this.serializeBigInt({
    conciliacion: {
      id: conc.id,
      sucursal_id: conc.sucursal_id,
      fecha_ventas: conc.fecha_ventas,
      estado: conc.estado,
      causa_principal: conc.causa_principal,
    },
    conteoPorEstado,
    sinBanco,
    sinVoucher,
    topDiffComision,
  });
}

}
