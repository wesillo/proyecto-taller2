/*
 * Registro de datos para el Machine Learning (fase 2).
 *
 * Cada vez que se muestra un destino se guarda una fila con:
 *   - lo que el usuario respondió (las "variables" del modelo)
 *   - qué destino le recomendamos y con qué puntaje
 *   - qué hizo después: si iría o no, por qué no, y si abrió la búsqueda de pasajes
 *     (estas son las "etiquetas" que el modelo aprende a predecir)
 *
 * Por ahora se guarda en el navegador (localStorage) y se descarga como CSV.
 * El siguiente paso es mandar estas mismas filas a una base de datos compartida.
 */

const CLAVE_DATOS = "rumbo-datos-ml";
const COLUMNAS = [
  "id", "sesion", "fecha", "opcion",
  "pais", "alcance", "tags", "presupuesto", "ritmo", "con_quien", "edad", "mes", "horas", "docs", "visa", "estilo",
  "destino", "pais_destino", "aeropuerto", "puntaje", "porcentaje",
  "iria", "motivo", "abrio_compra",
];

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
function registrarRecomendacion(r, x, opcion) {
  const id = `${SESION}-${opcion}`;
  const filas = leerDatos();
  if (filas.some((f) => f.id === id)) return id;
  filas.push({
    id, sesion: SESION, fecha: new Date().toISOString(), opcion,
    pais: r.pais, alcance: r.alcance, tags: (r.tags || []).join("|"), presupuesto: r.presupuesto, ritmo: r.ritmo,
    con_quien: r.conQuien, edad: r.edad || "", mes: r.mes, horas: r.horas || "", docs: (r.docs || []).join("|"),
    visa: r.visa || "", estilo: r.estilo,
    destino: x.destino.nombre, pais_destino: x.destino.codigoPais, aeropuerto: x.destino.aeropuerto,
    puntaje: Math.round(x.puntaje * 10) / 10, porcentaje: x.porcentaje,
    iria: "", motivo: "", abrio_compra: 0,
  });
  escribirDatos(filas);
  return id;
}

function actualizarRegistro(id, cambios) {
  const filas = leerDatos();
  const f = filas.find((x) => x.id === id);
  if (!f) return;
  Object.assign(f, cambios);
  escribirDatos(filas);
}

function datosCSV() {
  const celda = (v) => {
    const s = v === undefined || v === null ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [COLUMNAS.join(","), ...leerDatos().map((f) => COLUMNAS.map((c) => celda(f[c])).join(","))].join("\n");
}

async function descargarCSV() {
  const nombre = `rumbo-datos-${new Date().toISOString().slice(0, 10)}.csv`;
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
