/*
 * Motor de recomendación de 4WARD (fase 1: matching por atributos, sin ML).
 *
 * Cruza las respuestas del usuario con los atributos de cada destino y le
 * asigna un puntaje. No depende de la interfaz, así que se puede probar solo
 * con `npm test`.
 *
 * Cuando haya datos reales de uso, estos mismos atributos son los que se usarían
 * para entrenar un modelo de Machine Learning (fase 2).
 */

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const CON_QUIEN = { S: "solo", P: "en pareja", F: "en familia", A: "con amigos" };
const PRESUPUESTO_TXT = { 1.5: "ajustado", 3: "moderado", 4: "cómodo", 5: "sin límite" };

// [código, nombre, aeropuerto de salida, ciudad de salida]
const PAISES = [
  ["CL", "Chile", "SCL", "Santiago"],
  ["AR", "Argentina", "EZE", "Buenos Aires"],
  ["PE", "Perú", "LIM", "Lima"],
  ["CO", "Colombia", "BOG", "Bogotá"],
  ["MX", "México", "MEX", "Ciudad de México"],
  ["BR", "Brasil", "GRU", "São Paulo"],
  ["UY", "Uruguay", "MVD", "Montevideo"],
  ["EC", "Ecuador", "UIO", "Quito"],
  ["BO", "Bolivia", "VVI", "Santa Cruz"],
  ["US", "Estados Unidos", "MIA", "Miami"],
  ["ES", "España", "MAD", "Madrid"],
  ["XX", "Otro país", "", ""],
];

// Países a los que un chileno puede entrar solo con su cédula de identidad.
// El catálogo trae el dato verificado por destino (d.ingreso.soloCarnet); esta lista es el respaldo.
const PAISES_CON_CARNET = ["AR", "BR", "UY", "PY", "BO", "PE", "CO", "EC", "VE"];
const entraConCarnet = (d) => (d.ingreso ? d.ingreso.soloCarnet : PAISES_CON_CARNET.includes(d.codigoPais));

// Documento que el usuario puede marcar como "ya lo tengo" y los países que habilita
const DOCUMENTOS = {
  esta: { paises: ["US", "PR"], nombre: "la ESTA o visa de Estados Unidos" },
  eta_ca: { paises: ["CA"], nombre: "la eTA o visa de Canadá" },
  eta_uk: { paises: ["GB"], nombre: "la ETA del Reino Unido" },
};

// ¿El usuario ya tiene el permiso de ingreso que pide este destino?
const yaTienePermiso = (d, r) =>
  (r.docs || []).some((k) => DOCUMENTOS[k] && DOCUMENTOS[k].paises.includes(d.codigoPais));

// ¿Le falta pasaporte para ir a este destino? (solo aplica a quien vive en Chile)
const faltaPasaporte = (d, r) =>
  (r.docs || []).includes("carnet") && d.codigoPais !== r.pais && !entraConCarnet(d);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const listaTxt = (arr) => (arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + " y " + arr[arr.length - 1]);
const horasTxt = (h) => (h < 1.5 ? "~1 h" : `~${Math.round(h)} h`);
const paisDe = (codigo) => PAISES.find((p) => p[0] === codigo) || PAISES[0];

// Convierte [11,12,1,2,3] en "Nov a mar"
function mesesTxt(meses) {
  if (meses.length === 12) return "Todo el año";
  const set = new Set(meses);
  const prev = (m) => (m === 1 ? 12 : m - 1);
  const next = (m) => (m === 12 ? 1 : m + 1);
  const partes = [];
  for (let m = 1; m <= 12; m++) {
    if (set.has(m) && !set.has(prev(m))) {
      let fin = m;
      while (set.has(next(fin)) && next(fin) !== m) fin = next(fin);
      partes.push(m === fin ? MESES_CORTOS[m - 1] : `${MESES_CORTOS[m - 1]} a ${MESES_CORTOS[fin - 1]}`);
    }
  }
  return cap(partes.join(" y "));
}

/*
 * Pesos del puntaje (máximo teórico: 103 puntos)
 *   Tipo de experiencia   40
 *   Presupuesto           20
 *   Ritmo                 15
 *   Compañía              10
 *   Temporada             10
 *   Clásico / distinto     8
 *   Horas de vuelo        penaliza si excede lo que aguanta el usuario
 *   Visa                  penaliza si pidió "sin trámites"
 */
const PUNTAJE_MAXIMO = 103;

function puntaje(d, r) {
  let s = 0;
  const coincidencias = d.tags.filter((t) => r.tags.includes(t));
  s += (40 * coincidencias.length) / r.tags.length;

  const castigo = d.costo > r.presupuesto ? (d.costo - r.presupuesto) * 8 : (r.presupuesto - d.costo) * 3;
  s += Math.max(0, 20 - castigo);

  s += 15 * (1 - Math.abs(d.actividad - r.ritmo) / 4);

  if (d.idealPara.includes(r.conQuien)) s += 10;

  if (r.mes === 0) s += 6;
  else s += d.meses.includes(r.mes) ? 10 : 1;

  if (r.estilo === "clasico") s += (8 * (d.popularidad - 1)) / 4;
  else if (r.estilo === "sorpresa") s += (8 * (5 - d.popularidad)) / 4;
  else s += 4;

  if (r.horas && d.horasVuelo > r.horas) s -= 30 + (d.horasVuelo - r.horas);
  if (r.visa === "ninguna" && d.visa !== "N" && d.codigoPais !== r.pais && !yaTienePermiso(d, r)) s -= 15;
  // Sin pasaporte: sacarlo toma tiempo, así que se prefieren destinos a los que se entra con carnet
  if (faltaPasaporte(d, r)) s -= r.visa === "ninguna" ? 25 : 12;

  return { puntaje: s, coincidencias };
}

function razones(d, r, coincidencias) {
  const pais = paisDe(r.pais);
  const out = [];
  if (coincidencias.length) out.push(`Tiene lo que buscas: ${listaTxt(coincidencias.map((c) => c.toLowerCase()))}.`);
  if (r.alcance === "dentro") out.push(`Está dentro de ${pais[1]}, como pediste.`);
  if (r.alcance === "fuera" && r.pais !== "XX") out.push(`Es fuera de ${pais[1]}, como pediste.`);
  if (yaTienePermiso(d, r)) out.push(`Ya tienes ${DOCUMENTOS[r.docs.find((k) => DOCUMENTOS[k] && DOCUMENTOS[k].paises.includes(d.codigoPais))].nombre}, no necesitas trámites.`);
  else if ((r.docs || []).includes("carnet") && d.codigoPais !== r.pais && entraConCarnet(d)) out.push("Puedes entrar solo con tu carnet, sin pasaporte.");
  else if (r.visa && r.visa !== "da_igual" && d.visa === "N" && d.codigoPais !== r.pais) out.push("No necesitas visa con pasaporte chileno.");
  if (d.costo <= r.presupuesto) out.push(`Calza con un presupuesto ${PRESUPUESTO_TXT[r.presupuesto]}.`);
  if (r.mes && d.meses.includes(r.mes)) out.push(`${cap(MESES[r.mes - 1])} está entre sus mejores meses.`);
  if (d.idealPara.includes(r.conQuien)) out.push(`Funciona muy bien para viajar ${CON_QUIEN[r.conQuien]}.`);
  if (Math.abs(d.actividad - r.ritmo) <= 1) {
    out.push(r.ritmo >= 4 ? "Tiene la actividad física que pediste." : r.ritmo <= 2 ? "Se disfruta sin apuro, a tu ritmo." : "Mezcla actividad y descanso.");
  }
  if (r.estilo === "sorpresa" && d.popularidad <= 2) out.push("Es un destino poco masificado.");
  if (r.horas && d.horasVuelo <= r.horas && r.horas < 99) out.push(`${horasTxt(d.horasVuelo)} de vuelo, dentro de lo que aguantas.`);
  return out.slice(0, 5);
}

/*
 * Devuelve hasta 3 recomendaciones ordenadas de mejor a peor.
 * No repite país (o no repite destino si el usuario pidió viajar dentro de su país).
 */
function recomendar(destinos, r) {
  const pais = paisDe(r.pais);
  let candidatos = destinos.filter((d) => d.aeropuerto !== pais[2]);
  if (r.alcance === "dentro") candidatos = candidatos.filter((d) => d.codigoPais === r.pais);
  if (r.alcance === "fuera") candidatos = candidatos.filter((d) => d.codigoPais !== r.pais);
  const sinCandidatos = candidatos.length === 0;
  if (sinCandidatos) candidatos = destinos;

  const ordenados = candidatos
    .map((d) => ({ destino: d, ...puntaje(d, r) }))
    .sort((x, y) => y.puntaje - x.puntaje || x.destino.horasVuelo - y.destino.horasVuelo);

  const resultado = [];
  const vistos = new Set();
  for (const x of ordenados) {
    if (resultado.length === 3) break;
    const clave = r.alcance === "dentro" ? x.destino.nombre : x.destino.pais;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    resultado.push({ ...x, porcentaje: Math.max(0, Math.min(99, Math.round((x.puntaje / PUNTAJE_MAXIMO) * 100))) });
  }
  return { resultado, sinCandidatos };
}

if (typeof module !== "undefined") {
  module.exports = { MESES, MESES_CORTOS, CON_QUIEN, PRESUPUESTO_TXT, PAISES, PAISES_CON_CARNET, DOCUMENTOS, entraConCarnet, yaTienePermiso, faltaPasaporte, PUNTAJE_MAXIMO, cap, listaTxt, horasTxt, mesesTxt, paisDe, puntaje, razones, recomendar };
}
