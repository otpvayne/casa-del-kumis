import * as XLSX from 'xlsx';

export type RedeBanRow = {
  codigo_comercio: string;
  direccion?: string | null;

  cantidad_transacciones?: number | null;

  valor_bruto?: string | null;
  iva?: string | null;
  consumo?: string | null;

  tasa_aerop_propina?: string | null;

  base_liquidacion?: string | null;
  comision?: string | null;

  retefuente?: string | null;
  rete_iva?: string | null;
  rete_ica?: string | null;

  neto?: string | null;
};

function norm(v: any) {
  return String(v ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convierte a formato Decimal string compatible con Prisma:
 * - "37.700" -> "37700.00"
 * - "$37,700.50" -> "37700.50"
 * - "" -> null
 */
function moneyToDecimalString(v: any): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;

  // Mantener dígitos, , . -
  let cleaned = s.replace(/[^\d.,-]/g, '');
  if (!cleaned) return null;

  // Caso típico Colombia: miles con "." y sin decimales -> "37.700"
  // Lo tratamos como 37700.00
  // Si tiene 2 decimales reales, también lo soportamos.

  // Si hay coma y punto, asumimos que el último separador es decimal
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let decimalSep: ',' | '.' | null = null;
  if (lastComma !== -1 && lastDot !== -1) {
    decimalSep = lastComma > lastDot ? ',' : '.';
  } else if (lastComma !== -1) {
    // Si hay coma: puede ser decimal o miles
    // Si después de coma hay 1-2 dígitos -> decimal
    const after = cleaned.slice(lastComma + 1);
    decimalSep = after.length <= 2 ? ',' : null;
  } else if (lastDot !== -1) {
    const after = cleaned.slice(lastDot + 1);
    decimalSep = after.length <= 2 ? '.' : null;
  }

  let integerPart = cleaned;
  let decimalPart = '';

  if (decimalSep) {
    const idx = decimalSep === ',' ? lastComma : lastDot;
    integerPart = cleaned.slice(0, idx);
    decimalPart = cleaned.slice(idx + 1);
  }

  // Quitar separadores de miles
  integerPart = integerPart.replace(/[.,]/g, '').replace(/-/g, '');
  decimalPart = decimalPart.replace(/[^\d]/g, '');

  if (!integerPart) return null;

  const sign = cleaned.includes('-') ? '-' : '';
  const dec = (decimalPart + '00').slice(0, 2); // siempre 2 decimales

  return `${sign}${integerPart}.${dec}`;
}

function intSafe(v: any): number | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const n = Number(s.replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function parseRedeBanExcel(buffer: Buffer): RedeBanRow[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames?.[0];
  if (!sheetName) throw new Error('El archivo no tiene hojas');

  const ws = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!rows.length) throw new Error('Hoja vacía');

  // Buscar fila de encabezados
  const headerIdx = rows.slice(0, 60).findIndex((r) => {
    const joined = norm(r.join(' '));
    return joined.includes('COMERCIO') && joined.includes('CANTIDAD DE TRANSACCIONES');
  });
  if (headerIdx === -1) throw new Error('No encontré encabezado (Comercio / Cantidad de Transacciones)');

  const header = rows[headerIdx].map((h) => norm(h));
  const col = (predicate: (h: string) => boolean) => header.findIndex(predicate);

  const iComercio = col((h) => h === 'COMERCIO');
  const iDireccion = col((h) => h === 'DIRECCION');

  const iCantidad = col((h) => h === 'CANTIDAD DE TRANSACCIONES');
  const iBruto = col((h) => h === 'VALOR BRUTO');

  const iIVA = col((h) => h === 'IVA');
  const iConsumo = col((h) => h === 'CONSUMO');

  const iTasa = col((h) => h.includes('TASA') && (h.includes('AEROP') || h.includes('PROPINA')));

  const iBase = col((h) => h === 'BASE DE LIQUIDACION');
  const iComision = col((h) => h === 'COMISION');

  const iRetefuente = col((h) => h === 'RETEFUENTE');
  const iReteIVA = col((h) => h === 'RETEIVA' || h === 'RETE IVA');
  const iReteICA = col((h) => h === 'RETEICA' || h === 'RETE ICA');

  const iNeto = col((h) => h === 'NETO');

  // Requeridas mínimas para parsear filas
  const required = [
    ['COMERCIO', iComercio],
    ['CANTIDAD DE TRANSACCIONES', iCantidad],
    ['VALOR BRUTO', iBruto],
    ['IVA', iIVA],
    ['CONSUMO', iConsumo],
    ['BASE DE LIQUIDACION', iBase],
    ['COMISION', iComision],
    ['RETEIVA', iReteIVA],
    ['RETEICA', iReteICA],
  ] as const;

  for (const [name, pos] of required) {
    if (pos === -1) throw new Error(`Falta columna requerida en el Excel: ${name}`);
  }

  const out: RedeBanRow[] = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r];

    const comercio = String(row[iComercio] ?? '').trim();
    if (!comercio) continue;

    const joined = norm(row.join(' '));
    if (joined.startsWith('TOTAL')) break;

    out.push({
      codigo_comercio: comercio,
      direccion: iDireccion !== -1 ? (String(row[iDireccion] ?? '').trim() || null) : null,

      cantidad_transacciones: intSafe(row[iCantidad]),

      valor_bruto: moneyToDecimalString(row[iBruto]),
      iva: moneyToDecimalString(row[iIVA]),
      consumo: moneyToDecimalString(row[iConsumo]),

      tasa_aerop_propina: iTasa !== -1 ? moneyToDecimalString(row[iTasa]) : null,

      base_liquidacion: moneyToDecimalString(row[iBase]),
      comision: moneyToDecimalString(row[iComision]),

      retefuente: iRetefuente !== -1 ? moneyToDecimalString(row[iRetefuente]) : null,
      rete_iva: moneyToDecimalString(row[iReteIVA]),
      rete_ica: moneyToDecimalString(row[iReteICA]),

      neto: iNeto !== -1 ? moneyToDecimalString(row[iNeto]) : null,
    });
  }

  if (!out.length) throw new Error('No se detectaron filas válidas en el archivo');
  return out;
}
