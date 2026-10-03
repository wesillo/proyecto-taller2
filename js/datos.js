/*
 * Registro de datos para el Machine Learning (fase 2).
 *
 * Cada vez que se muestra un destino se guarda una fila con:
 *   - lo que el usuario respondió (las "variables" del modelo)
 *   - qué destino le recomendamos y con qué puntaje
 *   - qué hizo después: si iría o no, por qué no, y si abrió la búsqueda de pasajes
 *     (estas son las "etiquetas" que el modelo aprende a predecir)
 *
 * Cada fila se guarda en el navegador (localStorage, de respaldo) y, si URL_HOJA
 * está configurada, también se envía a una Google Sheet compartida por el equipo.
 * Cómo crear la hoja y obtener la URL: docs/google-sheets.md
 *
 * No se guarda nombre, correo ni ningún dato que identifique a la persona.
 */

// URL de la aplicación web de Google Apps Script (termina en /exec). Vacía = solo se guarda en este navegador.
const URL_HOJA = "";

const CLAVE_DATOS = "rumbo-datos-ml";
const COLUMNAS = [
  "id", "sesion", "fecha", "opcion",
  "pais", "alcance", "tags", "presupuesto", "ritmo", "con_quien", "edad", "meses", "horas", "docs", "visa", "estilo",
  "destino", "pais_destino", "aeropuerto", "puntaje", "porcentaje",
  "iria", "motivo", "abrio_compra",
  "segundos_decidir", "segundos_respuesta", "dispositivo", "version",
];
const VERSION_APP = "fly4ward-2026-10";

let SESION = "";
// Cada vez que alguien responde el cuestionario completo es una sesión nueva
function nuevaSesion() { SESION = Math.random().toString(36).slice(2, 10); }
nuevaSesion();

function leerDatos() {
  try { return JSON.parse(localStorage.getItem(CLAVE_DATOS)) || []; } catch (e) { return []; }
}

function escribirDatos(filas) {
  try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(filas)); } catch (e) {}
}

// Crea (o actualiza) la fila de un destino mostrado y devuelve su id
// segundos: lo que tardó en responder el cuestionario hasta ver su destino
function registrarRecomendacion(r, x, opcion, segundos) {
  const id = `${SESION}-${opcion}`;
  const filas = leerDatos();
  if (filas.some((f) => f.id === id)) return id;
  const fila = {
    id, sesion: SESION, fecha: new Date().toISOString(), opcion,
    pais: r.pais, alcance: r.alcance, tags: (r.tags || []).join("|"), presupuesto: r.presupuesto, ritmo: r.ritmo,
    con_quien: r.conQuien, edad: r.edad || "", meses: (r.meses || []).join("|"), horas: r.horas || "", docs: (r.docs || []).join("|"),
    visa: r.visa || "", estilo: r.estilo,
    destino: x.destino.nombre, pais_destino: x.destino.codigoPais, aeropuerto: x.destino.aeropuerto,
    puntaje: Math.round(x.puntaje * 10) / 10, porcentaje: x.porcentaje,
    iria: "", motivo: "", abrio_compra: 0,
    segundos_decidir: segundos ?? "", segundos_respuesta: "",
    dispositivo: matchMedia("(max-width: 700px)").matches ? "movil" : "escritorio",
    version: VERSION_APP,
  };
  filas.push(fila);
  escribirDatos(filas);
  enviarAHoja(fila);
  return id;
}

function actualizarRegistro(id, cambios) {
  const filas = leerDatos();
  const f = filas.find((x) => x.id === id);
  if (!f) return;
  Object.assign(f, cambios);
  escribirDatos(filas);
  enviarAHoja(f);
}

/*
 * Envía la fila completa a la hoja compartida. La hoja busca la fila por "id":
 * si existe la actualiza y si no la agrega, así que mandar la misma fila varias
 * veces no duplica datos. "text/plain" + no-cors evita el bloqueo entre dominios;
 * keepalive deja terminar el envío aunque la persona se vaya a comprar pasajes.
 */
function enviarAHoja(fila) {
  if (!URL_HOJA || typeof fetch !== "function") return;
  try {
    fetch(URL_HOJA, {
      method: "POST", mode: "no-cors", keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(fila),
    }).catch(() => {});
  } catch (e) {}
}

// Promedio y mediana (en segundos) del tiempo hasta ver el destino, una vez por sesión
function tiemposDecision(filas = leerDatos()) {
  const t = filas.filter((f) => f.opcion === 1 && Number(f.segundos_decidir) > 0).map((f) => Number(f.segundos_decidir)).sort((a, b) => a - b);
  if (!t.length) return null;
  const mitad = Math.floor(t.length / 2);
  return {
    n: t.length,
    promedio: Math.round(t.reduce((a, b) => a + b, 0) / t.length),
    mediana: t.length % 2 ? t[mitad] : Math.round((t[mitad - 1] + t[mitad]) / 2),
  };
}

function duracionTxt(seg) {
  if (seg < 60) return `${seg} s`;
  const m = Math.floor(seg / 60), s = seg % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}

function datosCSV() {
  const celda = (v) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [COLUMNAS.join(","), ...leerDatos().map((f) => COLUMNAS.map((c) => celda(f[c])).join(","))].join("\n");
}

async function descargarCSV() {
  const nombre = `fly4ward-datos-${new Date().toISOString().slice(0, 10)}.csv`;
  const contenido = "﻿" + datosCSV();
  // Dentro de Claude la descarga pasa por el visor; en GitHub Pages se usa un enlace normal
  if (window.claude && window.claude.use) {
    const downloads = await window.claude.use("downloads");
    if (downloads) {
      try { await downloads.save({ filename: nombre, data: contenido }); } catch (e) {}
      return;
    }
  }
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function borrarDatos() {
  try { localStorage.removeItem(CLAVE_DATOS); } catch (e) {}
}

if (typeof module !== "undefined") module.exports = { COLUMNAS, tiemposDecision, duracionTxt };
