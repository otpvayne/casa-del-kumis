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
  constructor(private readonly prisma: PrismaService,) {}

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
  // Reemplaza tu método getResumen() en conciliacion.service.ts con este:

async getResumen(id: number) {
  const conc = await this.prisma.conciliaciones.findUnique({
    where: { id: BigInt(id) as any },
    include: {
      conciliacion_transacciones: true,
      sucursales: true,
      vouchers: true,
      archivos_banco: true,
      archivos_redeban: true,
    } as any,
  });

  if (!conc) throw new NotFoundException(`Conciliación ${id} no existe`);

  const rows = (conc.conciliacion_transacciones as any[]) || [];

  // =====================================================
  // 1) CONTEO POR ESTADO
  // =====================================================
  const conteoPorEstado = rows.reduce((acc: any, r: any) => {
    const k = String(r.estado || 'SIN_ESTADO');
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  // =====================================================
  // 2) COMPARATIVA DE TOTALES (Voucher vs Banco vs RedeBan)
  // =====================================================
  let totalGlobalVoucher = this.decToNumber(conc.total_global_voucher);
  let totalBancoAjustado = this.decToNumber(conc.total_banco_ajustado);
  let baseLiquidacionRedeBan = this.decToNumber(conc.base_liquidacion_redeban);
  
  // ⚠️ Si los valores están en 0, intentar recalcular desde las transacciones
  if (totalGlobalVoucher === 0 || totalBancoAjustado === 0) {
    console.warn('⚠️ Totales en 0, recalculando desde transacciones...');
    
    // Recalcular desde transacciones
    totalBancoAjustado = rows.reduce((sum: number, r: any) => {
      return sum + this.decToNumber(r.valor_neto_banco);
    }, 0);
    
    const montosVoucher = rows.reduce((sum: number, r: any) => {
      return sum + this.decToNumber(r.monto_voucher);
    }, 0);
    
    if (totalGlobalVoucher === 0) {
      totalGlobalVoucher = montosVoucher;
    }
    
    // Recalcular base liquidación desde transacciones
    if (baseLiquidacionRedeBan === 0) {
      baseLiquidacionRedeBan = rows.reduce((sum: number, r: any) => {
        const consumo = this.decToNumber(r.valor_consumo_banco);
        const imp = this.decToNumber(r.imp_al_consumo);
        return sum + consumo + imp;
      }, 0);
    }
  }
  
  // Obtener parámetros para calcular neto esperado RedeBan
  const params = await this.getParametrosSistema();
  
  // Neto esperado RedeBan = Base Liquidación - (Base * Tasa Comisión)
  const netoEsperadoRedeBan = this.round2(
    baseLiquidacionRedeBan - (baseLiquidacionRedeBan * params.tasa_comision)
  );

  const comparativaTotales = {
    total_voucher: this.round2(totalGlobalVoucher),
    total_banco_neto: this.round2(totalBancoAjustado),
    base_liquidacion_redeban: this.round2(baseLiquidacionRedeBan),
    neto_esperado_redeban: this.round2(netoEsperadoRedeBan),
    
    // Diferencias
    diff_voucher_vs_banco: this.round2(totalGlobalVoucher - totalBancoAjustado),
    diff_voucher_vs_redeban: this.round2(totalGlobalVoucher - netoEsperadoRedeBan),
    diff_banco_vs_redeban: this.round2(totalBancoAjustado - netoEsperadoRedeBan),
    
    // Porcentajes de diferencia
    pct_diff_voucher_banco: totalGlobalVoucher > 0 
      ? this.round2(((totalGlobalVoucher - totalBancoAjustado) / totalGlobalVoucher) * 100)
      : 0,
    pct_diff_voucher_redeban: totalGlobalVoucher > 0
      ? this.round2(((totalGlobalVoucher - netoEsperadoRedeBan) / totalGlobalVoucher) * 100)
      : 0,
  };

  // =====================================================
  // 3) ANÁLISIS DE COMISIONES
  // =====================================================
  const comisionEsperadaTotal = this.decToNumber(conc.comision_esperada);
  
  // Calcular comisión real total desde transacciones banco
  const transaccionesConBanco = rows.filter((r: any) => r.banco_detalle_id !== null);
  
  const comisionRealTotal = transaccionesConBanco.reduce((sum: number, r: any) => {
    return sum + this.decToNumber(r.comision_banco);
  }, 0);
  
  const comisionPromedioPorTx = transaccionesConBanco.length > 0
    ? this.round2(comisionRealTotal / transaccionesConBanco.length)
    : 0;
  
  const comisionEsperadaPromedioPorTx = transaccionesConBanco.length > 0
    ? this.round2(comisionEsperadaTotal / transaccionesConBanco.length)
    : 0;
  
  // Tasa efectiva real (comisión real / base liquidación)
  const tasaEfectivaReal = baseLiquidacionRedeBan > 0
    ? this.round2((comisionRealTotal / baseLiquidacionRedeBan) * 100)
    : 0;
  
  const tasaEfectivaEsperada = this.round2(params.tasa_comision * 100);

  // ✅ NUEVO: Calcular porcentaje de comisión sobre total banco
  const pctComisionRealSobreBanco = totalBancoAjustado > 0
    ? this.round2((comisionRealTotal / (totalBancoAjustado + comisionRealTotal)) * 100)
    : 0;

  const analisisComisiones = {
    comision_esperada_total: this.round2(comisionEsperadaTotal),
    comision_real_total: this.round2(comisionRealTotal),
    diferencia_comision: this.round2(Math.abs(comisionEsperadaTotal - comisionRealTotal)),
    
    comision_promedio_por_tx: comisionPromedioPorTx,
    comision_esperada_promedio_por_tx: comisionEsperadaPromedioPorTx,
    
    tasa_efectiva_real: tasaEfectivaReal, // %
    tasa_efectiva_esperada: tasaEfectivaEsperada, // %
    diferencia_tasa: this.round2(Math.abs(tasaEfectivaReal - tasaEfectivaEsperada)),
    
    pct_comision_real_sobre_banco: pctComisionRealSobreBanco, // ✅ NUEVO
    
    total_transacciones_con_comision: transaccionesConBanco.length,
  };

  // =====================================================
  // 4) MÉTRICAS DE CALIDAD DE CONCILIACIÓN
  // =====================================================
  const totalTransacciones = rows.length;
  const matchOk = conteoPorEstado['MATCH_OK'] || 0;
  const abonoDiaSiguiente = conteoPorEstado['ABONO_DIA_SIGUIENTE'] || 0;
  const sinBanco = conteoPorEstado['SIN_BANCO'] || 0;
  const sinVoucher = conteoPorEstado['SIN_VOUCHER'] || 0;
  const comisionIncorrecta = conteoPorEstado['COMISION_INCORRECTA'] || 0;
  const valorDiferente = conteoPorEstado['VALOR_DIFERENTE'] || 0;

  const tasaConciliacion = totalTransacciones > 0
    ? this.round2(((matchOk + abonoDiaSiguiente) / totalTransacciones) * 100)
    : 0;

  const metricsCalidad = {
    total_transacciones: totalTransacciones,
    transacciones_conciliadas: matchOk + abonoDiaSiguiente,
    transacciones_con_problemas: sinBanco + sinVoucher + comisionIncorrecta + valorDiferente,
    
    tasa_conciliacion_exitosa: tasaConciliacion, // %
    tasa_problemas: totalTransacciones > 0 
      ? this.round2(((sinBanco + sinVoucher) / totalTransacciones) * 100)
      : 0,
    
    // Calidad general
    calidad_general: tasaConciliacion >= 95 
      ? 'EXCELENTE' 
      : tasaConciliacion >= 85 
      ? 'BUENA' 
      : tasaConciliacion >= 70 
      ? 'REGULAR' 
      : 'MALA',
  };

  // =====================================================
  // 5) DESGLOSE POR FRANQUICIA
  // =====================================================
  const porFranquicia = rows.reduce((acc: any, r: any) => {
    const franq = String(r.franquicia || 'DESCONOCIDA');
    if (!acc[franq]) {
      acc[franq] = {
        cantidad: 0,
        monto_total_voucher: 0,
        monto_total_banco: 0,
        comision_total: 0,
      };
    }
    
    acc[franq].cantidad++;
    acc[franq].monto_total_voucher += this.decToNumber(r.monto_voucher);
    acc[franq].monto_total_banco += this.decToNumber(r.valor_neto_banco);
    acc[franq].comision_total += this.decToNumber(r.comision_banco);
    
    return acc;
  }, {});

  // Redondear valores
  Object.keys(porFranquicia).forEach(key => {
    porFranquicia[key].monto_total_voucher = this.round2(porFranquicia[key].monto_total_voucher);
    porFranquicia[key].monto_total_banco = this.round2(porFranquicia[key].monto_total_banco);
    porFranquicia[key].comision_total = this.round2(porFranquicia[key].comision_total);
  });

  // =====================================================
  // 6) LISTA SIN_BANCO (top 20)
  // =====================================================
  const sinBancoList = rows
    .filter((r: any) => String(r.estado) === 'SIN_BANCO')
    .slice(0, 20)
    .map((r: any) => ({
      id: String(r.id),
      voucher_tx_id: r.voucher_tx_id ? String(r.voucher_tx_id) : null,
      ultimos_digitos: r.ultimos_digitos,
      numero_recibo: r.numero_recibo,
      monto_voucher: this.round2(this.decToNumber(r.monto_voucher)),
      franquicia: r.franquicia,
      observacion: r.observacion,
    }));

  // =====================================================
  // 7) LISTA SIN_VOUCHER (top 20)
  // =====================================================
  const sinVoucherList = rows
    .filter((r: any) => String(r.estado) === 'SIN_VOUCHER')
    .slice(0, 20)
    .map((r: any) => ({
      id: String(r.id),
      banco_detalle_id: r.banco_detalle_id ? String(r.banco_detalle_id) : null,
      ultimos_digitos: r.ultimos_digitos,
      terminal: r.terminal,
      numero_autoriza: r.numero_autoriza,
      valor_consumo_banco: this.round2(this.decToNumber(r.valor_consumo_banco)),
      valor_neto_banco: this.round2(this.decToNumber(r.valor_neto_banco)),
      franquicia: r.franquicia,
      observacion: r.observacion,
    }));

  // =====================================================
  // 8) TOP DIFERENCIAS COMISIÓN (top 20)
  // =====================================================
  const topDiffComision = rows
    .filter((r: any) => r.diferencia_comision !== null && r.diferencia_comision !== undefined)
    .map((r: any) => ({
      id: String(r.id),
      estado: r.estado,
      ultimos_digitos: r.ultimos_digitos,
      franquicia: r.franquicia,
      diferencia_comision: this.round2(this.decToNumber(r.diferencia_comision)),
      comision_esperada: this.round2(this.decToNumber(r.comision_esperada)),
      comision_banco: this.round2(this.decToNumber(r.comision_banco)),
      valor_consumo: this.round2(this.decToNumber(r.valor_consumo_banco)),
      banco_detalle_id: r.banco_detalle_id ? String(r.banco_detalle_id) : null,
      voucher_tx_id: r.voucher_tx_id ? String(r.voucher_tx_id) : null,
    }))
    .sort((a: any, b: any) => b.diferencia_comision - a.diferencia_comision)
    .slice(0, 20);

  // =====================================================
// 9) INFORMACIÓN DE ARCHIVOS FUENTE
// =====================================================
const archivosFuente = {
  voucher: conc.vouchers ? {
    id: String((conc.vouchers as any).id),
    fecha_operacion: (conc.vouchers as any).fecha_operacion,
    estado: (conc.vouchers as any).estado,
  } : null,
  
  archivo_banco: conc.archivos_banco ? {
    id: String((conc.archivos_banco as any).id),
    nombre: (conc.archivos_banco as any).nombre_original,
  } : null,
  
  archivo_redeban: conc.archivos_redeban ? {
    id: String((conc.archivos_redeban as any).id),
    nombre: (conc.archivos_redeban as any).nombre_original,
  } : null,
};

// =====================================================
// RESPUESTA COMPLETA
// =====================================================
return this.serializeBigInt({
  conciliacion: {
    id: conc.id,
    sucursal_id: conc.sucursal_id,
    sucursal_nombre: (conc.sucursales as any)?.nombre,
    fecha_ventas: conc.fecha_ventas,
    estado: conc.estado,
    causa_principal: conc.causa_principal,
    margen_permitido: this.decToNumber(conc.margen_permitido),
    diferencia_calculada: this.decToNumber(conc.diferencia_calculada),
    created_at: conc.created_at,
  },
  
  // Nuevas secciones mejoradas
  comparativa_totales: comparativaTotales,
  analisis_comisiones: analisisComisiones,
  metricas_calidad: metricsCalidad,
  desglose_por_franquicia: porFranquicia,
  
  // Existentes
  conteo_por_estado: conteoPorEstado,
  sin_banco: sinBancoList,
  sin_voucher: sinVoucherList,
  top_diferencias_comision: topDiffComision,
  
  // Archivos fuente
  archivos_fuente: archivosFuente,
  
  // Parámetros usados
  parametros_aplicados: {
    tasa_comision: params.tasa_comision,
    tasa_comision_pct: this.round2(params.tasa_comision * 100),
    margen_error_permitido: params.margen_error_permitido,
    dias_desfase_banco: params.dias_desfase_banco,
  },
});
}
// =====================================================
// ============== LISTAR CONCILIACIONES ================
// =====================================================
async listConciliaciones() {
  const conciliaciones = await this.prisma.conciliaciones.findMany({
    orderBy: { created_at: 'desc' } as any,
    take: 100, // Últimas 100
    include: {
      sucursales: {
        select: {
          id: true,
          nombre: true,
          codigo_comercio_redeban: true,
        },
      },
      _count: {
        select: {
          conciliacion_transacciones: true,
        },
      },
    } as any,
  });

  return this.serializeBigInt(conciliaciones);
}

// =====================================================
// ============ OBTENER CONCILIACIÓN POR ID ============
// =====================================================
async getConciliacionById(id: number) {
  const conciliacion = await this.prisma.conciliaciones.findUnique({
    where: { id: BigInt(id) as any },
    include: {
      sucursales: {
        select: {
          id: true,
          nombre: true,
          codigo_comercio_redeban: true,
        },
      },
      vouchers: {
        select: {
          id: true,
          fecha_operacion: true,
          estado: true,
        },
      },
      archivos_banco: {
        select: {
          id: true,
          nombre_original: true,
        },
      },
      archivos_redeban: {
        select: {
          id: true,
          nombre_original: true,
        },
      },
      _count: {
        select: {
          conciliacion_transacciones: true,
        },
      },
    } as any,
  });

  if (!conciliacion) {
    throw new NotFoundException(`Conciliación con ID ${id} no encontrada`);
  }

  return this.serializeBigInt(conciliacion);
}

// =====================================================
// ============= ELIMINAR CONCILIACIÓN =================
// =====================================================
async deleteConciliacion(id: number, userId: number) {
  const conciliacion = await this.prisma.conciliaciones.findUnique({
    where: { id: BigInt(id) as any },
  } as any);

  if (!conciliacion) {
    throw new NotFoundException(`Conciliación con ID ${id} no encontrada`);
  }

  // Eliminar transacciones hijas primero
  await this.prisma.conciliacion_transacciones.deleteMany({
    where: { conciliacion_id: BigInt(id) as any },
  } as any);

  // Eliminar conciliación
  await this.prisma.conciliaciones.delete({
    where: { id: BigInt(id) as any },
  } as any);

  return this.serializeBigInt({
    ok: true,
    deletedId: conciliacion.id,
  });
}
}
