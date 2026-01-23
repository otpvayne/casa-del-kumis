// src/redeban/redeban.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/db/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as XLSX from 'xlsx';
import { LogsService } from '../logs/logs.service';

type UploadRedeBanInput = {
  file: Express.Multer.File;
  fechaConciliacion: string; // YYYY-MM-DD
  userId: number;
};

type RedeBanParsedRow = {
  codigo_comercio: string; // 10 dígitos
  comercio_raw: string; // texto completo (debug)
  comercio_nombre: string | null; // texto después del código

  direccion: string;
  cantidad_transacciones: number;

  valor_bruto: string;
  iva: string;
  consumo: string;
  tasa_aerop_propina: string;

  base_liquidacion: string;
  comision: string;

  retefuente: string;
  rete_iva: string;
  rete_ica: string;

  neto: string;
};

@Injectable()
export class RedeBanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logs: LogsService,
  ) {}

  async uploadAndProcess(input: UploadRedeBanInput) {
    const { file, fechaConciliacion, userId } = input;

    if (!file) throw new BadRequestException('Falta archivo');
    if (!fechaConciliacion) {
      throw new BadRequestException('Falta fechaConciliacion (YYYY-MM-DD)');
    }

    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato no permitido. Usa XLS o XLSX (RedeBan).',
      );
    }

    // 1) Guardar archivo ordenado por fecha
    const destDir = path.join('/tmp', 'uploads', 'redeban', fechaConciliacion);

    fs.mkdirSync(destDir, { recursive: true });

    const finalPath = path.join(destDir, file.filename);
    fs.renameSync(file.path, finalPath);

    // 2) Hash contenido (duplicados)
    const buf = fs.readFileSync(finalPath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');

    // 3) evitar duplicados por hash
    const already = await this.prisma.archivos_redeban.findFirst({
      where: { hash_contenido: hash } as any,
    });
    if (already) {
      throw new BadRequestException(
        `Archivo duplicado: este RedeBan ya fue cargado (archivo_id=${already.id}).`,
      );
    }

    // 4) Crear registro del archivo en DB
    const archivo = await this.prisma.archivos_redeban.create({
      data: {
        fecha_conciliacion: new Date(fechaConciliacion),
        nombre_original: file.originalname,
        ruta_archivo: finalPath,
        hash_contenido: hash,
        estado: 'CARGADO',
        usuario_id: BigInt(userId) as any,
      } as any,
    });

    // 5) Parsear excel
    let parsed: {
      sheetName: string;
      headerIndex: number;
      dataRows: RedeBanParsedRow[];
    };
    try {
      parsed = this.parseRedeBanExcel(finalPath);
    } catch (e: any) {
      await this.prisma.archivos_redeban.update({
        where: { id: archivo.id } as any,
        data: { estado: 'ERROR' } as any,
      });
      throw e;
    }

    // 6) Resolver sucursal_id por codigo_comercio
    const codigos = Array.from(
      new Set(parsed.dataRows.map((r) => r.codigo_comercio)),
    );

    const sucursales = await this.prisma.sucursales.findMany({
      where: {
        codigo_comercio_redeban: { in: codigos },
      } as any,
      select: {
        id: true,
        codigo_comercio_redeban: true,
      } as any,
    });

    const mapSucursal = new Map<string, bigint>();
    for (const s of sucursales as any[]) {
      mapSucursal.set(
        String(s.codigo_comercio_redeban).trim(),
        s.id as bigint,
      );
    }

    const faltantes = codigos.filter((c) => !mapSucursal.has(c));
    if (faltantes.length > 0) {
      await this.prisma.archivos_redeban.update({
        where: { id: archivo.id } as any,
        data: { estado: 'ERROR' } as any,
      });

      throw new BadRequestException(
        `No encontré sucursal para estos codigo_comercio (10 dígitos): ${faltantes.join(', ')}.\n` +
          `Crea esas sucursales y guarda el código en: sucursales.codigo_comercio_redeban`,
      );
    }

    // 7) Construir filas para DB
    const rowsForDb = parsed.dataRows.map((r) => {
      const sucursalId = mapSucursal.get(r.codigo_comercio)!;

      return {
        archivo_redeban_id: archivo.id,
        sucursal_id: sucursalId as any,
        codigo_comercio: r.codigo_comercio,
        direccion: (r.direccion ?? '').trim(),
        cantidad_transacciones: Number.isFinite(r.cantidad_transacciones)
          ? r.cantidad_transacciones
          : 0,
        valor_bruto: r.valor_bruto ?? '0.00',
        iva: r.iva ?? '0.00',
        consumo: r.consumo ?? '0.00',
        tasa_aerop_propina: r.tasa_aerop_propina ?? '0.00',
        base_liquidacion: r.base_liquidacion ?? '0.00',
        comision: r.comision ?? '0.00',
        retefuente: r.retefuente ?? '0.00',
        rete_iva: r.rete_iva ?? '0.00',
        rete_ica: r.rete_ica ?? '0.00',
        neto: r.neto ?? '0.00',
      };
    });

    // 8) Guardar registros
    await this.prisma.registros_redeban.deleteMany({
      where: { archivo_redeban_id: archivo.id } as any,
    });

    if (rowsForDb.length > 0) {
      await this.prisma.registros_redeban.createMany({
        data: rowsForDb as any,
      });
    }

    // 9) Marcar PROCESADO
    const updated = await this.prisma.archivos_redeban.update({
      where: { id: archivo.id } as any,
      data: { estado: 'PROCESADO' } as any,
    });
// ✅ Borrar archivo físico (en prod no se necesita guardarlo meses)
try {
  if (updated?.ruta_archivo) {
    fs.unlinkSync(updated.ruta_archivo);
  }
} catch {}

    return this.serializeBigInt({
      archivo: updated,
      sheetUsada: parsed.sheetName,
      totalFilas: parsed.dataRows.length,
      preview: parsed.dataRows.slice(0, 5),
    });
  }

  async listArchivos() {
    const items = await this.prisma.archivos_redeban.findMany({
      orderBy: { id: 'desc' } as any,
      take: 50,
      select: {
        id: true,
        nombre_original: true,
        fecha_conciliacion: true,
        estado: true,
        created_at: true,
        _count: {
          select: {
            registros_redeban: true,
          },
        },
      } as any,
    });

    return this.serializeBigInt(items);
  }

  async getArchivoById(id: number) {
    const archivo = await this.prisma.archivos_redeban.findUnique({
      where: { id: BigInt(id) as any },
      include: {
        registros_redeban: { orderBy: { id: 'asc' } as any },
      } as any,
    });

    if (!archivo)
      throw new BadRequestException('Archivo RedeBan no encontrado');

    return this.serializeBigInt(archivo);
  }

  async deleteArchivo(id: number, userId: number) {
    const archivo = await this.prisma.archivos_redeban.findUnique({
      where: { id: BigInt(id) as any },
    } as any);

    if (!archivo) {
      throw new BadRequestException('Archivo RedeBan no encontrado');
    }

    await this.prisma.registros_redeban.deleteMany({
      where: { archivo_redeban_id: archivo.id } as any,
    });

    await this.prisma.archivos_redeban.delete({
      where: { id: archivo.id } as any,
    } as any);

    try {
      if (archivo.ruta_archivo && fs.existsSync(archivo.ruta_archivo)) {
        fs.unlinkSync(archivo.ruta_archivo);
      }
    } catch (e) {
      // no rompemos el flujo
    }

    return this.serializeBigInt({
      ok: true,
      deletedId: archivo.id,
    });
  }

  // =====================================================
  // ===================== PARSER ========================
  // =====================================================
  private parseRedeBanExcel(filePath: string): {
    sheetName: string;
    headerIndex: number;
    dataRows: RedeBanParsedRow[];
  } {
    const workbook = XLSX.readFile(filePath, { cellDates: true, raw: true });

    const sheetName = this.pickMovimientosSheetName(workbook.SheetNames);
    if (!sheetName) {
      throw new BadRequestException(
        `No encontré hoja "Movimientos". Hojas: ${workbook.SheetNames.join(', ')}`,
      );
    }

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new BadRequestException('Hoja "Movimientos" inválida');

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
    }) as any;

    if (!rows?.length)
      throw new BadRequestException('La hoja "Movimientos" está vacía.');

    const headerIndex = this.findHeaderRowIndex(rows);
    if (headerIndex === -1) {
      const preview = rows.slice(0, 20).map((r) => this.rowToHeaderString(r));
      throw new BadRequestException(
        `No pude leer el archivo RedeBan: no encontré encabezado (Dirección / Cantidad de Transacciones / Valor Bruto).\nPreview:\n${preview.join('\n')}`,
      );
    }

    const col = this.buildColumnMap(rows, headerIndex);

    if (col.direccion === -1 || col.cantidad_transacciones === -1) {
      throw new BadRequestException(
        `Encabezado detectado pero incompleto. ColumnMap=${JSON.stringify(col)}`,
      );
    }

    const dataStart = headerIndex + 2; // header ocupa 2 filas
    const dataRows: RedeBanParsedRow[] = [];

    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i] || [];

      // 🔍 DEBUG: Ver qué hay en las primeras columnas
      if (i === dataStart) {
        console.log('📋 Primera fila de datos:', row.slice(0, 10));
      }

      // ⚠️ CORRECCIÓN: El código comercio está en la columna 0 (sin header)
      // Y el nombre/dirección está en col.direccion (columna 1)
      const codigoRaw = String(row[0] ?? '').trim();
      const nombreRaw = String(row[col.direccion] ?? '').trim();

      if (!codigoRaw) {
        const nonEmpty = row.some((c) => String(c ?? '').trim());
        if (!nonEmpty) continue;
        
        // Si la fila tiene "TOTAL" o palabras similares, terminar
        const joined = row.join(' ').toLowerCase();
        if (joined.includes('total') || joined.includes('subtotal')) {
          console.log('🛑 Encontrado total, terminando parsing');
          break;
        }
        
        continue;
      }

      // ✅ Extraer solo el código (10 dígitos)
      const match = codigoRaw.match(/(\d{10})/);
      if (!match) {
        console.warn(`⚠️ Fila ${i}: no se pudo extraer código de "${codigoRaw}"`);
        continue;
      }

      const codigo10 = match[1];

      const cantidadTx =
        this.parseIntSafe(row[col.cantidad_transacciones]) ?? 0;

      const valorBruto =
        this.parseMoneyToDecimalString(row[col.valor_bruto]) ?? '0.00';
      const iva = this.parseMoneyToDecimalString(row[col.iva]) ?? '0.00';
      const consumo =
        this.parseMoneyToDecimalString(row[col.consumo]) ?? '0.00';

      const tasaAeropPropina =
        col.tasa_aerop_propina !== -1
          ? this.parseMoneyToDecimalString(row[col.tasa_aerop_propina]) ??
            '0.00'
          : '0.00';

      const baseLiquidacion =
        this.parseMoneyToDecimalString(row[col.base_liquidacion]) ?? '0.00';

      const comision =
        this.parseMoneyToDecimalString(row[col.comision]) ?? '0.00';

      const retefuente =
        col.retefuente !== -1
          ? this.parseMoneyToDecimalString(row[col.retefuente]) ?? '0.00'
          : '0.00';

      const reteIva =
        this.parseMoneyToDecimalString(row[col.rete_iva]) ?? '0.00';

      const reteIca =
        this.parseMoneyToDecimalString(row[col.rete_ica]) ?? '0.00';

      const neto =
        col.neto !== -1
          ? this.parseMoneyToDecimalString(row[col.neto]) ?? '0.00'
          : '0.00';

      dataRows.push({
        codigo_comercio: codigo10,
        comercio_raw: codigoRaw,
        comercio_nombre: nombreRaw || null,
        direccion: nombreRaw || '',
        cantidad_transacciones: cantidadTx,
        valor_bruto: valorBruto,
        iva,
        consumo,
        tasa_aerop_propina: tasaAeropPropina,
        base_liquidacion: baseLiquidacion,
        comision,
        retefuente,
        rete_iva: reteIva,
        rete_ica: reteIca,
        neto,
      });
    }

    console.log(`✅ Total filas parseadas: ${dataRows.length}`);

    if (dataRows.length === 0) {
      throw new BadRequestException(
        'Encabezado encontrado, pero no se detectaron filas de datos en "Movimientos".',
      );
    }

    return { sheetName, headerIndex, dataRows };
  }

  private extractCodigoComercio10(raw: string): {
    codigo10: string | null;
    nombre: string | null;
  } {
    const cleaned = raw.replace(/\s+/g, ' ').trim();

    let m = cleaned.match(/^(\d{10})\s+(.*)$/);
    if (m) return { codigo10: m[1], nombre: (m[2] || '').trim() || null };

    m = cleaned.match(/(\d{10})/);
    if (m) {
      const code = m[1];
      const nombre = cleaned.replace(code, '').trim();
      return { codigo10: code, nombre: nombre || null };
    }

    return { codigo10: null, nombre: null };
  }

  private pickMovimientosSheetName(sheetNames: string[]): string | null {
    const norm = (s: string) =>
      s
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const exact = sheetNames.find((n) => norm(n) === 'movimientos');
    if (exact) return exact;

    const contains = sheetNames.find((n) => norm(n).includes('movim'));
    if (contains) return contains;

    if (sheetNames.length >= 2) return sheetNames[1];

    return null;
  }

  private normalizeHeaderCell(v: any): string {
    return String(v ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private rowToHeaderString(row: any[]): string {
    return row
      .map((c) => this.normalizeHeaderCell(c))
      .filter(Boolean)
      .join(' | ');
  }

  private findHeaderRowIndex(rows: any[][]): number {
    for (let i = 0; i < Math.min(rows.length, 60); i++) {
      const r1 = this.rowToHeaderString(rows[i] || []);
      const r2 = this.rowToHeaderString(rows[i + 1] || []);
      const combined = `${r1} || ${r2}`;

      const hasDireccion = combined.includes('direccion');
      const hasCantidadTx =
        combined.includes('cantidad de transacciones') ||
        (combined.includes('cantidad') && combined.includes('transacciones'));
      const hasValorBruto = combined.includes('valor') && combined.includes('bruto');

      if (hasDireccion && hasCantidadTx && hasValorBruto) {
        console.log(`✅ Header encontrado en fila ${i}`);
        return i;
      }
    }

    console.warn('⚠️ No se encontró header con los patrones esperados');
    return -1;
  }

  private buildColumnMap(rows: any[][], headerIndex: number) {
    const top = rows[headerIndex] || [];
    const bottom = rows[headerIndex + 1] || [];
    const maxLen = Math.max(top.length, bottom.length);

    const headers: string[] = [];
    for (let c = 0; c < maxLen; c++) {
      const h1 = this.normalizeHeaderCell(top[c]);
      const h2 = this.normalizeHeaderCell(bottom[c]);

      // Priorizar h2 (fila inferior) porque es más específica
      if (h2) {
        headers.push(h2);
      } else if (h1) {
        headers.push(h1);
      } else {
        headers.push('');
      }
    }

    console.log(
      '🔍 Headers detectados:',
      headers.slice(0, 15)
    );

    const findIndex = (patterns: RegExp[], startFrom = 0) => {
      for (let i = startFrom; i < headers.length; i++) {
        const h = headers[i];
        if (!h) continue;
        if (patterns.some((p) => p.test(h))) return i;
      }
      return -1;
    };

    const direccionIdx = findIndex([/direccion/]);
    const cantidadIdx = findIndex([/cantidad.*transacciones/, /cantidad/]);
    const valorBrutoIdx = findIndex([/valor.*bruto/]);
    const ivaIdx = findIndex([/^iva$/]);
    const consumoIdx = findIndex([/^consumo$/]);
    const tasaIdx = findIndex([/tasa.*aerop/, /propina/]);
    const baseLiquidacionIdx = findIndex([/base.*liquidacion/]);

    // ⚠️ CRÍTICO: Comisión está DESPUÉS de Base de Liquidación
    const comisionIdx =
      baseLiquidacionIdx !== -1
        ? findIndex([/^comision$/], baseLiquidacionIdx + 1)
        : findIndex([/^comision$/]);

    const retefuenteIdx = findIndex([/retefuente/, /retencion.*fuente/]);
    const reteIvaIdx = findIndex([/rete.*iva/, /reteiva/]);
    const reteIcaIdx = findIndex([/rete.*ica/, /reteica/]);
    const netoIdx = findIndex([/^neto$/]);

    const columnMap = {
      comercio: 0, // ⚠️ Primera columna (índice 0) - NO tiene header
      direccion: direccionIdx,
      cantidad_transacciones: cantidadIdx,
      valor_bruto: valorBrutoIdx,
      iva: ivaIdx,
      consumo: consumoIdx,
      tasa_aerop_propina: tasaIdx,
      base_liquidacion: baseLiquidacionIdx,
      comision: comisionIdx,
      retefuente: retefuenteIdx,
      rete_iva: reteIvaIdx,
      rete_ica: reteIcaIdx,
      neto: netoIdx,
    };

    console.log('🗺️ Column map:', columnMap);

    return columnMap;
  }

  private parseIntSafe(v: any): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return Math.trunc(v);
    const s = String(v).trim();
    if (!s) return null;
    const n = parseInt(s.replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(n) ? n : null;
  }

  private parseMoneyToDecimalString(v: any): string | null {
    if (v === null || v === undefined) return null;

    if (typeof v === 'number' && Number.isFinite(v)) {
      return (Math.round(v * 100) / 100).toFixed(2);
    }

    let s = String(v).trim();
    if (!s) return null;

    s = s.replace(/[$]/g, '').trim();
    s = s.replace(/[^\d\.\,\s-]/g, '').trim();
    if (!s) return null;

    // Caso Colombia: "1.460.200,00" -> punto miles, coma decimal
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
      const n = Number(s);
      return Number.isFinite(n) ? n.toFixed(2) : null;
    }

    // Solo coma: puede ser decimal o miles
    if (s.includes(',') && !s.includes('.')) {
      const parts = s.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        const n = Number(parts[0].replace(/\s/g, '') + '.' + parts[1]);
        return Number.isFinite(n) ? n.toFixed(2) : null;
      }
      s = s.replace(/,/g, '');
      const n = Number(s.replace(/\s/g, ''));
      return Number.isFinite(n) ? n.toFixed(2) : null;
    }

    // Solo punto: puede ser decimal o miles
    if (s.includes('.') && !s.includes(',')) {
      const parts = s.split('.');
      const last = parts[parts.length - 1];
      if (parts.length === 2 && last.length <= 2) {
        const n = Number(s.replace(/\s/g, ''));
        return Number.isFinite(n) ? n.toFixed(2) : null;
      }
      s = s.replace(/\./g, '');
    }

    const n = Number(s.replace(/\s/g, ''));
    return Number.isFinite(n) ? n.toFixed(2) : null;
  }

  private serializeBigInt(obj: any) {
    return JSON.parse(
      JSON.stringify(obj, (_k, v) =>
        typeof v === 'bigint' ? v.toString() : v,
      ),
    );
  }
}