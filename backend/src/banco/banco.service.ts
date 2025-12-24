import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infra/db/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as XLSX from 'xlsx';

type UploadBancoInput = {
  file: Express.Multer.File;
  fechaArchivo: string; // YYYY-MM-DD
  sucursalId: number;
  userId: number;
};

type BancoParsedRow = {
  // Fechas
  fecha_vale: Date | null;
  fecha_proceso: Date | null;
  fecha_abono: Date | null;

  // Identificadores
  bol_ruta: string | null;
  recap: string | null;
  vale: string | null;
  red: string | null;

  terminal: string | null;
  numero_autoriza: string | null;

  // Valores
  valor_consumo: string;     // Decimal string
  valor_iva: string;
  imp_al_consumo: string;
  valor_propina: string;
  valor_comision: string;
  ret_fuente: string;
  ret_iva: string;
  ret_ica: string;
  valor_neto: string;
  bases_dev_iva: string;

  hora_trans: string | null;

  // Tarjeta
  tarjeta_socio: string | null;
  franquicia: 'VISA' | 'MASTERCARD' | 'DESCONOCIDA';
  tipo_tarjeta: 'CREDIT' | 'DEBIT' | 'DESCONOCIDO';
};

@Injectable()
export class BancoService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================
  // UPLOAD
  // =========================
  async uploadAndProcess(input: UploadBancoInput) {
    const { file, fechaArchivo, sucursalId, userId } = input;

    if (!file) throw new BadRequestException('Falta archivo');
    if (!fechaArchivo) throw new BadRequestException('Falta fechaArchivo (YYYY-MM-DD)');
    if (!sucursalId) throw new BadRequestException('Falta sucursalId');

    // validar sucursal existe
    const sucursal = await this.prisma.sucursales.findUnique({
      where: { id: BigInt(sucursalId) as any } as any,
      select: { id: true, nombre: true },
    });
    if (!sucursal) throw new NotFoundException(`Sucursal no existe: ${sucursalId}`);

    // validar tipo
    const allowed = [
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    ];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Usa XLS o XLSX (Banco).');
    }

    // guardar archivo por fecha/sucursal
    const destDir = path.join(process.cwd(), 'uploads', 'banco', fechaArchivo, String(sucursalId));
    fs.mkdirSync(destDir, { recursive: true });

    const finalPath = path.join(destDir, file.filename);
    fs.renameSync(file.path, finalPath);

    // hash para duplicados
    const buf = fs.readFileSync(finalPath);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');

    const already = await this.prisma.archivos_banco.findFirst({
      where: { hash_contenido: hash } as any,
    });
    if (already) {
      throw new BadRequestException(`Archivo duplicado: ya fue cargado (archivo_id=${already.id}).`);
    }

    // crear archivo en DB
    const archivo = await this.prisma.archivos_banco.create({
      data: {
        fecha_archivo: new Date(fechaArchivo),
        nombre_original: file.originalname,
        ruta_archivo: finalPath,
        hash_contenido: hash,
        estado: 'CARGADO',
        usuario_id: BigInt(userId) as any,
      } as any,
    });

    // parse
    let parsed: { sheetName: string; headerIndex: number; dataRows: BancoParsedRow[] };
    try {
      parsed = this.parseBancoExcel(finalPath);
    } catch (e: any) {
      await this.prisma.archivos_banco.update({
        where: { id: archivo.id } as any,
        data: { estado: 'ERROR' } as any,
      });
      throw e;
    }

    // insertar detalles (todas las filas quedan con sucursal_id fijo)
    const rowsForDb = parsed.dataRows.map((r) => ({
      archivo_banco_id: archivo.id,
      sucursal_id: BigInt(sucursalId) as any,

      fecha_vale: r.fecha_vale,
      fecha_proceso: r.fecha_proceso,
      fecha_abono: r.fecha_abono,

      bol_ruta: r.bol_ruta,
      recap: r.recap,
      vale: r.vale,
      red: r.red,

      terminal: r.terminal,
      numero_autoriza: r.numero_autoriza,

      valor_consumo: r.valor_consumo,
      valor_iva: r.valor_iva,
      imp_al_consumo: r.imp_al_consumo,
      valor_propina: r.valor_propina,
      valor_comision: r.valor_comision,
      ret_fuente: r.ret_fuente,
      ret_iva: r.ret_iva,
      ret_ica: r.ret_ica,
      valor_neto: r.valor_neto,
      bases_dev_iva: r.bases_dev_iva,

      hora_trans: r.hora_trans,

      tarjeta_socio: r.tarjeta_socio,
      franquicia: r.franquicia,
      tipo_tarjeta: r.tipo_tarjeta,
    }));

    // idempotente por archivo
    await this.prisma.registros_banco_detalle.deleteMany({
      where: { archivo_banco_id: archivo.id } as any,
    });

    if (rowsForDb.length > 0) {
      await this.prisma.registros_banco_detalle.createMany({
        data: rowsForDb as any,
      });
    }

    // marcar procesado
    const updated = await this.prisma.archivos_banco.update({
      where: { id: archivo.id } as any,
      data: { estado: 'PROCESADO' } as any,
    });

    return this.serializeBigInt({
      archivo: updated,
      sucursal: { id: sucursal.id, nombre: sucursal.nombre },
      sheetUsada: parsed.sheetName,
      totalFilas: parsed.dataRows.length,
      preview: parsed.dataRows.slice(0, 5),
    });
  }

  // =========================
  // LISTAR ARCHIVOS BANCO
  // =========================
  async listArchivosBanco() {
    const rows = await this.prisma.archivos_banco.findMany({
      orderBy: { created_at: 'desc' } as any,
      take: 50,
      select: {
        id: true,
        fecha_archivo: true,
        nombre_original: true,
        estado: true,
        created_at: true,
      } as any,
    });
    return this.serializeBigInt(rows);
  }

  // =========================
  // VER ARCHIVO + REGISTROS
  // =========================
  async getArchivoBancoById(id: number) {
    const archivo = await this.prisma.archivos_banco.findUnique({
      where: { id: BigInt(id) as any } as any,
    });
    if (!archivo) throw new NotFoundException('Archivo banco no existe');

    const registros = await this.prisma.registros_banco_detalle.findMany({
      where: { archivo_banco_id: archivo.id } as any,
      orderBy: { id: 'asc' } as any,
      take: 200,
    });

    return this.serializeBigInt({ archivo, registros });
  }

  // =========================
  // PARSER EXCEL
  // =========================
  private parseBancoExcel(filePath: string): {
    sheetName: string;
    headerIndex: number;
    dataRows: BancoParsedRow[];
  } {
    const wb = XLSX.readFile(filePath, { cellDates: true, raw: true });

    const sheetName = this.pickBancoSheetName(wb.SheetNames);
    const sheet = wb.Sheets[sheetName];
    if (!sheet) throw new BadRequestException('Hoja inválida');

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
    }) as any;

    if (!rows?.length) throw new BadRequestException('El Excel del banco está vacío.');

    const headerIndex = this.findHeaderRowIndexBanco(rows);
    if (headerIndex === -1) {
      const preview = rows.slice(0, 25).map((r) => this.rowToHeaderString(r));
      throw new BadRequestException(
        `No encontré encabezado del Banco. Preview:\n${preview.join('\n')}`,
      );
    }

    const col = this.buildColumnMapBanco(rows[headerIndex] || []);

    // mínima validación: necesitamos al menos "Fecha Vale" o "Valor Neto" (ajusta si tu archivo tiene otros nombres)
    if (col.valor_neto === -1 && col.valor_consumo === -1) {
      throw new BadRequestException(`Encabezado incompleto. ColumnMap=${JSON.stringify(col)}`);
    }

    const dataRows: BancoParsedRow[] = [];
    for (let i = headerIndex + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      // si fila vacía, skip
      const nonEmpty = row.some((c) => String(c ?? '').trim() !== '');
      if (!nonEmpty) continue;

      const fechaVale = this.parseExcelDate(row[col.fecha_vale]);
      const fechaProc = this.parseExcelDate(row[col.fecha_proceso]);
      const fechaAbono = this.parseExcelDate(row[col.fecha_abono]);

      const franquicia = this.parseFranquicia(String(row[col.franquicia] ?? ''));
      const tipoTarjeta = this.parseTipoTarjeta(String(row[col.tipo_tarjeta] ?? ''));

      dataRows.push({
        fecha_vale: fechaVale,
        fecha_proceso: fechaProc,
        fecha_abono: fechaAbono,

        bol_ruta: this.strOrNull(row[col.bol_ruta]),
        recap: this.strOrNull(row[col.recap]),
        vale: this.strOrNull(row[col.vale]),
        red: this.strOrNull(row[col.red]),

        terminal: this.strOrNull(row[col.terminal]),
        numero_autoriza: this.strOrNull(row[col.numero_autoriza]),

        valor_consumo: this.money(row[col.valor_consumo]),
        valor_iva: this.money(row[col.valor_iva]),
        imp_al_consumo: this.money(row[col.imp_al_consumo]),
        valor_propina: this.money(row[col.valor_propina]),
        valor_comision: this.money(row[col.valor_comision]),
        ret_fuente: this.money(row[col.ret_fuente]),
        ret_iva: this.money(row[col.ret_iva]),
        ret_ica: this.money(row[col.ret_ica]),
        valor_neto: this.money(row[col.valor_neto]),
        bases_dev_iva: this.money(row[col.bases_dev_iva]),

        hora_trans: this.strOrNull(row[col.hora_trans]),

        tarjeta_socio: this.strOrNull(row[col.tarjeta_socio]),
        franquicia,
        tipo_tarjeta: tipoTarjeta,
      });
    }

    if (dataRows.length === 0) {
      throw new BadRequestException('Encabezado encontrado, pero no hay filas de datos.');
    }

    return { sheetName, headerIndex, dataRows };
  }

  private pickBancoSheetName(names: string[]): string {
    const norm = (s: string) =>
      s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Preferencias típicas (ajustables)
    const preferred = names.find((n) => /detalle|mov|trans|banco/.test(norm(n)));
    return preferred ?? names[0]; // fallback primera hoja
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

  private findHeaderRowIndexBanco(rows: any[][]): number {
    for (let i = 0; i < Math.min(rows.length, 80); i++) {
      const r = this.rowToHeaderString(rows[i] || []);
      const hasFecha = r.includes('fecha') && (r.includes('vale') || r.includes('abono') || r.includes('proceso'));
      const hasValor = r.includes('valor') && (r.includes('neto') || r.includes('consumo'));
      if (hasFecha && hasValor) return i;
    }
    return -1;
  }

  private buildColumnMapBanco(headerRow: any[]) {
    const headers = headerRow.map((h) => this.normalizeHeaderCell(h));

    const find = (patterns: RegExp[]) => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (!h) continue;
        if (patterns.some((p) => p.test(h))) return i;
      }
      return -1;
    };

    return {
      fecha_vale: find([/fecha.*vale/, /fecha vale/]),
      fecha_proceso: find([/fecha.*proceso/, /fecha proceso/]),
      fecha_abono: find([/fecha.*abono/, /fecha abono/]),

      bol_ruta: find([/bol/, /ruta/]),
      recap: find([/recap/]),
      vale: find([/vale/]),
      red: find([/red/]),

      terminal: find([/terminal/]),
      numero_autoriza: find([/autoriza/, /autorizacion/]),

      valor_consumo: find([/valor.*consumo/, /consumo/]),
      valor_iva: find([/valor.*iva/, /iva/]),
      imp_al_consumo: find([/imp.*consumo/, /impuesto.*consumo/]),
      valor_propina: find([/propina/]),
      valor_comision: find([/comision/]),
      ret_fuente: find([/ret.*fuente/, /retefuente/, /ret_fuente/]),
      ret_iva: find([/ret.*iva/, /ret_iva/]),
      ret_ica: find([/ret.*ica/, /ret_ica/]),
      valor_neto: find([/valor.*neto/, /neto/]),
      bases_dev_iva: find([/bases.*dev.*iva/, /bases.*iva/]),

      hora_trans: find([/hora/]),

      tarjeta_socio: find([/tarjeta/, /socio/]),
      franquicia: find([/franquicia/]),
      tipo_tarjeta: find([/tipo.*tarjeta/]),
    };
  }

  private strOrNull(v: any): string | null {
    const s = String(v ?? '').trim();
    return s ? s : null;
  }

  private parseFranquicia(v: string): 'VISA' | 'MASTERCARD' | 'DESCONOCIDA' {
    const s = this.normalizeHeaderCell(v);
    if (s.includes('visa')) return 'VISA';
    if (s.includes('master')) return 'MASTERCARD';
    return 'DESCONOCIDA';
  }

  private parseTipoTarjeta(v: string): 'CREDIT' | 'DEBIT' | 'DESCONOCIDO' {
    const s = this.normalizeHeaderCell(v);
    if (s.includes('cred')) return 'CREDIT';
    if (s.includes('deb')) return 'DEBIT';
    return 'DESCONOCIDO';
  }

  private parseExcelDate(v: any): Date | null {
    if (!v) return null;
    if (v instanceof Date && !isNaN(v.getTime())) return v;

    // si viene como número excel
    if (typeof v === 'number' && Number.isFinite(v)) {
      const d = XLSX.SSF.parse_date_code(v);
      if (!d) return null;
      return new Date(Date.UTC(d.y, d.m - 1, d.d));
    }

    const s = String(v).trim();
    if (!s) return null;

    // intenta parse ISO o DD/MM/YYYY
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;

    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      const yy = Number(m[3]);
      return new Date(Date.UTC(yy, mm - 1, dd));
    }

    return null;
  }

  private money(v: any): string {
    // default 0.00
    const parsed = this.parseMoneyToDecimalString(v);
    return parsed ?? '0.00';
  }

  private parseMoneyToDecimalString(v: any): string | null {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number' && Number.isFinite(v)) return (Math.round(v * 100) / 100).toFixed(2);

    let s = String(v).trim();
    if (!s) return null;

    s = s.replace(/[$]/g, '').trim();
    s = s.replace(/[^\d\.\,\s-]/g, '').trim();
    if (!s) return null;

    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
      const n = Number(s);
      return Number.isFinite(n) ? n.toFixed(2) : null;
    }

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
    return JSON.parse(JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
  }
}
