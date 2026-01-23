import * as fs from "fs";
import * as path from "path";

/**
 * En producción (Render) usamos /tmp (no persistente).
 * En local puedes seguir usando /tmp igual; es simple y no rompe nada.
 */
export function ensureTmpDir(...parts: string[]) {
  const dir = path.join("/tmp", ...parts);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function safeUnlink(filePath?: string | null) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // no romper flujo
  }
}
