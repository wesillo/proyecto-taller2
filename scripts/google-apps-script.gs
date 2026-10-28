/*
 * Fly4ward: backend de la app en una Google Sheet.
 *
 * Instalación (5 minutos): ver docs/google-sheets.md en el repositorio.
 * Resumen: Extensiones > Apps Script > pegar este archivo > Implementar >
 * Nueva implementación > Aplicación web > "Cualquier usuario" > copiar la URL /exec.
 *
 * Qué hace:
 *  - Pestaña "respuestas": una fila por destino mostrado (para el Machine Learning). Cada fila trae
 *    un "id" (sesión + opción): si ya existe se actualiza, si no se agrega. Nunca se duplican datos.
 *  - Pestaña "correos": solo las personas que pidieron su destino por correo. Se les envía el
 *    destino y el cupón al tiro, y 14 días después un correo preguntando si compraron.
 *  - Pestaña "agencias": las agencias asociadas y su PIN para canjear cupones (la llenan ustedes).
 *  - Pestaña "canjes": cada cupón canjeado por una agencia (prueba de que la venta vino de Fly4ward).
 *
 * Para el correo de seguimiento hay que correr UNA vez la función instalarSeguimiento()
 * desde el editor (botón ▶ Ejecutar). Crea un activador que revisa todos los días a las 10:00.
 */

const NOMBRE_HOJA = "respuestas";
const COLUMNAS = ["id", "sesion", "fecha", "opcion", "pais", "alcance", "tags", "presupuesto", "ritmo", "con_quien", "edad", "meses", "horas", "docs", "visa", "estilo", "destino", "pais_destino", "aeropuerto", "puntaje", "porcentaje", "iria", "motivo", "abrio_compra", "segundos_decidir", "segundos_respuesta", "dispositivo", "version", "personas", "continentes", "pagaria", "idioma", "cupon", "pidio_correo"];

const HOJA_CORREOS = "correos";
const COL_CORREOS = ["fecha", "correo", "cupon", "id", "destino", "pais", "aeropuerto", "idioma", "vence", "seguimiento_enviado", "compro", "donde", "respondio", "baja"];
const HOJA_AGENCIAS = "agencias";
const COL_AGENCIAS = ["agencia", "pin", "activa"];
const HOJA_CANJES = "canjes";
const COL_CANJES = ["fecha", "cupon", "agencia", "destino", "aeropuerto", "monto", "id"];

const DIAS_VALIDEZ = 60;       // igual que NEGOCIO.cupon.diasValidez en js/negocio.js
const DIAS_SEGUIMIENTO = 14;
const URL_APP = "https://wesillo.github.io/proyecto-taller2/";
const RE_CUPON = /^FLY-[23456789ABCDEFGHJKMNPQRSTWXYZ]{6}$/;
const RE_CORREO = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/* ---------------- Entrada desde la app (POST) ---------------- */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const datos = JSON.parse(e.postData.contents);
    if (datos && datos.accion === "correo") return texto(pedirCorreo(datos));
    return texto(guardarFila(datos));
  } catch (err) {
    return texto("error: " + err);
  } finally {
    lock.releaseLock();
  }
}

function guardarFila(fila) {
  if (!fila || typeof fila.id !== "string" || !/^[a-z0-9]{4,16}-[1-3]$/.test(fila.id)) return "id inválido";
  const hoja = hojaCon(NOMBRE_HOJA, COLUMNAS);
  const valores = COLUMNAS.map((c) => limpiar(fila[c]));
  const i = buscarFila(hoja, 1, fila.id);
  if (i > 0) hoja.getRange(i, 1, 1, COLUMNAS.length).setValues([valores]);
  else hoja.appendRow(valores);
  return "ok";
}

// La persona pidió su destino por correo
function pedirCorreo(d) {
  const correo = String(d.correo || "").trim().toLowerCase();
  const cupon = String(d.cupon || "").trim().toUpperCase();
  if (!RE_CORREO.test(correo) || correo.length > 254) return "correo inválido";
  if (!RE_CUPON.test(cupon)) return "cupón inválido";
  // Solo cupones que la app realmente entregó, y un correo por cupón
  const resp = hojaCon(NOMBRE_HOJA, COLUMNAS);
  const filaResp = buscarFila(resp, COLUMNAS.indexOf("cupon") + 1, cupon);
  if (filaResp < 0) return "cupón desconocido";
  const correos = hojaCon(HOJA_CORREOS, COL_CORREOS);
  if (buscarFila(correos, 3, cupon) > 0) return "ya enviado";
  // Máximo 5 correos al día a una misma dirección (para que nadie use la app para mandar spam)
  const cache = CacheService.getScriptCache();
  const clave = "mail:" + correo;
  const n = Number(cache.get(clave) || 0);
  if (n >= 5) return "límite";
  cache.put(clave, String(n + 1), 86400);

  const r = filaComoObjeto(resp, filaResp, COLUMNAS);
  const en = d.idioma === "en";
  const destino = limpiar(d.destino) || r.destino;
  const vence = fechaVence(r.fecha);
  correos.appendRow([new Date(), correo, cupon, limpiar(r.id), destino, limpiar(d.pais), limpiar(r.aeropuerto), en ? "en" : "es", vence, "", "", "", "", ""]);

  const descuento = limpiar(d.descuento);
  const agencias = limpiar(d.agencias);
  const oferta = descuento && agencias
    ? (en ? `Show it at ${agencias} and get <b>${descuento} off</b> your trip.` : `Muéstralo en ${agencias} y obtén <b>${descuento} de descuento</b> en tu viaje.`)
    : (en ? "We're adding partner travel agencies that will give a discount with this code. We'll let you know where to use it." : "Estamos sumando agencias de viaje asociadas que darán un descuento con este código. Te avisaremos dónde usarlo.");
  const asunto = en ? `Your destination: ${destino} ✈` : `Tu destino: ${destino} ✈`;
  const html = plantilla(en, `
    <p style="margin:0 0 6px;font-size:15px">${en ? "Your Fly4ward destination" : "Tu destino Fly4ward"}</p>
    <h1 style="margin:0 0 4px;font-size:32px">${esc(destino)}</h1>
    <p style="margin:0 0 20px;font-size:16px;color:#5B6266">${esc(limpiar(d.pais))} · ${esc(limpiar(r.aeropuerto))}</p>
    ${bloqueCupon(en, cupon, vence)}
    <p style="font-size:15px;line-height:1.5">${oferta}</p>
    <p style="margin:24px 0"><a href="${URL_APP}${en ? "?lang=en" : ""}" style="background:#FFCC00;color:#000;padding:14px 20px;text-decoration:none;font-weight:bold;border-radius:3px">${en ? "Open Fly4ward" : "Abrir Fly4ward"}</a></p>
    <p style="font-size:13px;color:#5B6266">${en ? `In ${DIAS_SEGUIMIENTO} days we'll send you one short email to ask about your trip. That's all.` : `En ${DIAS_SEGUIMIENTO} días te enviaremos un correo cortito para preguntarte por tu viaje. Nada más.`}</p>`, cupon);
  MailApp.sendEmail({ to: correo, subject: asunto, htmlBody: html, name: "Fly4ward" });
  return "ok";
}

/* ---------------- Consultas desde canje.html y seguimiento.html (GET) ---------------- */

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.accion === "validar") return json(validar(p.cupon));
    if (p.accion === "canjear") return json(canjear(p));
    if (p.accion === "seguimiento") return json(seguimiento(p));
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
  // Abrir la URL /exec en el navegador sirve para comprobar que quedó bien publicada
  const hoja = hojaCon(NOMBRE_HOJA, COLUMNAS);
  return texto("Fly4ward conectado. Filas guardadas: " + Math.max(0, hoja.getLastRow() - 1));
}

function estadoCupon(cupon) {
  cupon = String(cupon || "").trim().toUpperCase();
  if (!RE_CUPON.test(cupon)) return { ok: false, estado: "formato" };
  const resp = hojaCon(NOMBRE_HOJA, COLUMNAS);
  const i = buscarFila(resp, COLUMNAS.indexOf("cupon") + 1, cupon);
  if (i < 0) return { ok: false, estado: "no_existe" };
  const r = filaComoObjeto(resp, i, COLUMNAS);
  const vence = fechaVence(r.fecha);
  const canjes = hojaCon(HOJA_CANJES, COL_CANJES);
  const j = buscarFila(canjes, 2, cupon);
  const base = { ok: true, cupon: cupon, destino: r.destino, aeropuerto: r.aeropuerto, emitido: soloFecha(r.fecha), vence: vence, id: r.id };
  if (j > 0) {
    const c = filaComoObjeto(canjes, j, COL_CANJES);
    return Object.assign(base, { estado: "canjeado", canje: { agencia: c.agencia, fecha: soloFecha(c.fecha) } });
  }
  if (new Date(vence + "T23:59:59") < new Date()) return Object.assign(base, { estado: "vencido" });
  return Object.assign(base, { estado: "valido" });
}

function validar(cupon) {
  const r = estadoCupon(cupon);
  delete r.id;
  return r;
}

function canjear(p) {
  const cupon = String(p.cupon || "").trim().toUpperCase();
  // Máximo 10 intentos por hora por cupón, para que nadie adivine un PIN probando
  const cache = CacheService.getScriptCache();
  const clave = "pin:" + cupon;
  const n = Number(cache.get(clave) || 0);
  if (n >= 10) return { ok: false, estado: "bloqueado" };
  cache.put(clave, String(n + 1), 3600);

  const agencia = agenciaPorPin(p.pin);
  if (!agencia) return { ok: false, estado: "pin" };
  const r = estadoCupon(cupon);
  if (r.estado !== "valido") { delete r.id; return r; }
  const monto = Number(String(p.monto || "").replace(/[^\d]/g, "")) || "";
  hojaCon(HOJA_CANJES, COL_CANJES).appendRow([new Date(), cupon, agencia, r.destino, r.aeropuerto, monto, r.id]);
  return { ok: true, estado: "canjeado_ahora", cupon: cupon, destino: r.destino, agencia: agencia };
}

function agenciaPorPin(pin) {
  pin = String(pin || "").trim();
  if (pin.length < 6) return "";
  const hoja = hojaCon(HOJA_AGENCIAS, COL_AGENCIAS);
  const filas = hoja.getLastRow() > 1 ? hoja.getRange(2, 1, hoja.getLastRow() - 1, COL_AGENCIAS.length).getValues() : [];
  const f = filas.find((x) => String(x[1]).trim() === pin && String(x[2]).toLowerCase() !== "no");
  return f ? String(f[0]) : "";
}

// Respuesta al correo de seguimiento: ¿compraste? (si / aun_no / no), dónde, o darse de baja
function seguimiento(p) {
  const cupon = String(p.cupon || "").trim().toUpperCase();
  if (!RE_CUPON.test(cupon)) return { ok: false };
  const hoja = hojaCon(HOJA_CORREOS, COL_CORREOS);
  const i = buscarFila(hoja, 3, cupon);
  if (i < 0) return { ok: false };
  const col = (c) => COL_CORREOS.indexOf(c) + 1;
  const r = String(p.r || "");
  if (["si", "aun_no", "no"].indexOf(r) >= 0) {
    hoja.getRange(i, col("compro")).setValue(r);
    hoja.getRange(i, col("respondio")).setValue(new Date());
  }
  if (r === "baja") hoja.getRange(i, col("baja")).setValue(new Date());
  if (p.donde) hoja.getRange(i, col("donde")).setValue(limpiar(p.donde));
  const fila = filaComoObjeto(hoja, i, COL_CORREOS);
  return { ok: true, destino: fila.destino, idioma: fila.idioma };
}

/* ---------------- Correo de seguimiento (activador diario) ---------------- */

function enviarSeguimientos() {
  const hoja = hojaCon(HOJA_CORREOS, COL_CORREOS);
  if (hoja.getLastRow() < 2) return;
  const datos = hoja.getRange(2, 1, hoja.getLastRow() - 1, COL_CORREOS.length).getValues();
  const col = (c) => COL_CORREOS.indexOf(c);
  const limite = new Date(Date.now() - DIAS_SEGUIMIENTO * 86400000);
  let enviados = 0;
  datos.forEach((f, k) => {
    if (enviados >= 50) return; // cuota diaria de correos de Google
    if (f[col("seguimiento_enviado")] || f[col("baja")] || f[col("compro")]) return;
    if (!(f[col("fecha")] instanceof Date) || f[col("fecha")] > limite) return;
    const en = f[col("idioma")] === "en";
    const cupon = f[col("cupon")];
    const destino = f[col("destino")];
    const link = (r) => `${URL_APP}seguimiento.html?c=${encodeURIComponent(cupon)}&r=${r}${en ? "&lang=en" : ""}`;
    const boton = (r, t, fondo) => `<a href="${link(r)}" style="display:inline-block;margin:0 8px 10px 0;background:${fondo};color:#000;padding:12px 18px;text-decoration:none;font-weight:bold;border-radius:3px;border:2px solid #000">${t}</a>`;
    const html = plantilla(en, `
      <h1 style="margin:0 0 12px;font-size:26px">${en ? `Did you book your trip to ${esc(destino)}?` : `¿Compraste tu viaje a ${esc(destino)}?`}</h1>
      <p style="font-size:15px;line-height:1.5;margin:0 0 18px">${en ? "One tap is enough. It helps us a lot to know if our recommendations end in real trips." : "Basta con un toque. Nos ayuda muchísimo saber si nuestras recomendaciones terminan en viajes de verdad."}</p>
      <p style="margin:0 0 10px">${boton("si", en ? "Yes, I booked" : "Sí, lo compré", "#FFCC00")}${boton("aun_no", en ? "Not yet" : "Todavía no", "#FFFFFF")}${boton("no", en ? "I went elsewhere / didn't travel" : "Fui a otro lado / no viajé", "#FFFFFF")}</p>
      ${bloqueCupon(en, cupon, f[col("vence")] instanceof Date ? soloFecha(f[col("vence")]) : f[col("vence")])}`, cupon);
    MailApp.sendEmail({ to: f[col("correo")], subject: en ? `Did you go to ${destino}?` : `¿Fuiste a ${destino}?`, htmlBody: html, name: "Fly4ward" });
    hoja.getRange(k + 2, col("seguimiento_enviado") + 1).setValue(new Date());
    enviados++;
  });
}

// Correr una vez desde el editor: crea el activador diario del seguimiento
function instalarSeguimiento() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === "enviarSeguimientos").forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("enviarSeguimientos").timeBased().everyDays(1).atHour(10).create();
  hojaCon(HOJA_CORREOS, COL_CORREOS); hojaCon(HOJA_AGENCIAS, COL_AGENCIAS); hojaCon(HOJA_CANJES, COL_CANJES);
}

/* ---------------- Utilidades ---------------- */

function plantilla(en, cuerpo, cupon) {
  const baja = `${URL_APP}seguimiento.html?c=${encodeURIComponent(cupon)}&r=baja${en ? "&lang=en" : ""}`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#23272A;max-width:560px;margin:0 auto">
    <div style="background:#000;color:#fff;padding:14px 18px;font-weight:bold;font-size:20px"><span style="background:#FFCC00;color:#000;padding:2px 8px;margin-right:8px">→</span>Fly4ward</div>
    <div style="padding:22px 18px;background:#fff;border:1px solid #BFC4C4;border-top:0">${cuerpo}</div>
    <p style="font-size:12px;color:#5B6266;padding:10px 18px">${en ? "Fly4ward is a university project at FCFM, Universidad de Chile." : "Fly4ward es un proyecto universitario de la FCFM, Universidad de Chile."} <a href="${baja}" style="color:#5B6266">${en ? "Don't email me again" : "No quiero más correos"}</a></p>
  </div>`;
}

function bloqueCupon(en, cupon, vence) {
  return `<div style="background:#FFCC00;color:#000;padding:14px 18px;border-radius:4px;margin:0 0 14px">
    <div style="font-size:13px;font-weight:bold">${en ? "YOUR FLY4WARD CODE" : "TU CÓDIGO FLY4WARD"}</div>
    <div style="font-size:30px;font-weight:bold;letter-spacing:2px">${esc(cupon)}</div>
    <div style="font-size:13px">${en ? "Valid until" : "Válido hasta el"} ${esc(vence)}</div>
  </div>`;
}

function hojaCon(nombre, columnas) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(nombre);
  if (!hoja) hoja = libro.insertSheet(nombre);
  // Si la hoja ya existía con menos columnas (versión anterior del script), agrega los títulos que faltan
  if (hoja.getLastRow() > 0 && hoja.getLastColumn() < columnas.length) {
    hoja.getRange(1, 1, 1, columnas.length).setValues([columnas]).setFontWeight("bold");
  }
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(columnas);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, columnas.length).setFontWeight("bold");
  }
  return hoja;
}

// Número de fila (desde 2) donde la columna `col` vale `valor`, o -1
function buscarFila(hoja, col, valor) {
  const ultima = hoja.getLastRow();
  if (ultima < 2) return -1;
  const vals = hoja.getRange(2, col, ultima - 1, 1).getValues();
  for (let i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]) === valor) return i + 2;
  return -1;
}

function filaComoObjeto(hoja, fila, columnas) {
  const v = hoja.getRange(fila, 1, 1, columnas.length).getValues()[0];
  const o = {};
  columnas.forEach((c, i) => (o[c] = v[i]));
  return o;
}

function fechaVence(fecha) {
  const f = fecha instanceof Date ? new Date(fecha) : new Date(fecha || Date.now());
  f.setDate(f.getDate() + DIAS_VALIDEZ);
  return soloFecha(f);
}

const soloFecha = (f) => (f instanceof Date ? Utilities.formatDate(f, "America/Santiago", "yyyy-MM-dd") : String(f || "").slice(0, 10));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const texto = (s) => ContentService.createTextOutput(s);
const json = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

// Textos cortos y sin fórmulas (una celda que empieza con "=" se ejecutaría en la hoja)
function limpiar(v) {
  if (v === undefined || v === null) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  let s = String(v).slice(0, 200);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
