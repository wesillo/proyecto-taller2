/*
 * Fly4ward: recibe las filas que envía la app y las guarda en esta Google Sheet.
 *
 * Instalación (5 minutos): ver docs/google-sheets.md en el repositorio.
 * Resumen: Extensiones > Apps Script > pegar este archivo > Implementar >
 * Nueva implementación > Aplicación web > "Cualquier usuario" > copiar la URL /exec.
 *
 * Cada fila trae un "id" (sesión + opción). Si ese id ya está en la hoja, se
 * actualiza la fila (por ejemplo, cuando la persona responde "¿Irías?"); si no,
 * se agrega una fila nueva. Así nunca se duplican datos.
 */

const NOMBRE_HOJA = "respuestas";
const COLUMNAS = ["id", "sesion", "fecha", "opcion", "pais", "alcance", "tags", "presupuesto", "ritmo", "con_quien", "edad", "meses", "horas", "docs", "visa", "estilo", "destino", "pais_destino", "aeropuerto", "puntaje", "porcentaje", "iria", "motivo", "abrio_compra", "segundos_decidir", "segundos_respuesta", "dispositivo", "version", "personas"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const fila = JSON.parse(e.postData.contents);
    if (!fila || typeof fila.id !== "string" || !/^[a-z0-9]{4,16}-[1-3]$/.test(fila.id)) {
      return ContentService.createTextOutput("id inválido");
    }
    const hoja = obtenerHoja();
    const valores = COLUMNAS.map((c) => limpiar(fila[c]));
    const ultima = hoja.getLastRow();
    const ids = ultima > 1 ? hoja.getRange(2, 1, ultima - 1, 1).getValues().map((x) => x[0]) : [];
    const i = ids.indexOf(fila.id);
    if (i >= 0) hoja.getRange(i + 2, 1, 1, COLUMNAS.length).setValues([valores]);
    else hoja.appendRow(valores);
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("error: " + err);
  } finally {
    lock.releaseLock();
  }
}

// Abrir la URL /exec en el navegador sirve para comprobar que quedó bien publicada
function doGet() {
  const hoja = obtenerHoja();
  return ContentService.createTextOutput("Fly4ward conectado. Filas guardadas: " + Math.max(0, hoja.getLastRow() - 1));
}

function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(NOMBRE_HOJA);
  if (!hoja) hoja = libro.insertSheet(NOMBRE_HOJA);
  // Si la hoja ya existía con menos columnas (versión anterior del script), agrega los títulos que faltan
  if (hoja.getLastRow() > 0 && hoja.getLastColumn() < COLUMNAS.length) {
    hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight("bold");
  }
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight("bold");
  }
  return hoja;
}

// Textos cortos y sin fórmulas (una celda que empieza con "=" se ejecutaría en la hoja)
function limpiar(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  let s = String(v).slice(0, 200);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
