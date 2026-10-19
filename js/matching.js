/*
 * Motor de recomendación de Fly4ward (fase 1: matching por atributos, sin ML).
 *
 * Cruza las respuestas del usuario con los atributos de cada destino y le
 * asigna un puntaje. No depende de la interfaz, así que se puede probar solo
 * con `npm test`.
 *
 * Cuando haya datos reales de uso, estos mismos atributos son los que se usarían
 * para entrenar un modelo de Machine Learning (fase 2).
 */

/*
 * Idioma de la interfaz (español o inglés). L(es, en) elige el texto según el idioma activo;
 * T([es, en]) hace lo mismo con pares guardados en listas; tx(d, campo) toma la versión en
 * inglés de un dato del catálogo (d.en) si existe. Por defecto todo queda en español.
 */
let IDIOMA = "es";
const setIdioma = (l) => { IDIOMA = l === "en" ? "en" : "es"; };
const EN = () => IDIOMA === "en";
const L = (es, en) => (IDIOMA === "en" ? en : es);
const T = (x) => (Array.isArray(x) ? (IDIOMA === "en" ? x[1] : x[0]) : x);
const tx = (d, campo) => (IDIOMA === "en" && d && d.en && d.en[campo] != null ? d.en[campo] : d[campo]);

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MESES_CORTOS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Nombre del mes m (1 = enero) en el idioma activo
const mesNom = (m) => (EN() ? MESES_EN : MESES)[m - 1];
const mesCorto = (m) => (EN() ? MESES_CORTOS_EN : MESES_CORTOS)[m - 1];
const CON_QUIEN = { S: "solo", P: "en pareja", F: "en familia", A: "con amigos" };
const CON_QUIEN_EN = { S: "solo", P: "as a couple", F: "with family", A: "with friends" };
const conQuienTxt = (c) => (EN() ? CON_QUIEN_EN : CON_QUIEN)[c];
const PRESUPUESTO_TXT = { 1.5: "ajustado", 3: "moderado", 4: "cómodo", 5: "sin límite" };
const PRESUPUESTO_TXT_EN = { 1.5: "tight", 3: "moderate", 4: "comfortable", 5: "unlimited" };

/*
 * Presupuesto para el pasaje: ida y vuelta por persona desde Santiago, en pesos.
 * El precio de cada destino es la tarifa típica de la foto de Google Flights
 * (promedio de temporada baja y alta, ver data/FUENTES.md). Si un destino no tiene
 * precio publicado, se estima según las horas de vuelo.
 * Alojamiento y gastos en el destino quedan fuera por ahora: la app se enfoca en el viaje aéreo.
 */
const PASOS_MONTO = [100, 150, 200, 300, 400, 500, 600, 800, 1000, 1200, 1500, 1800, 2000, 2500, 3000].map((x) => x * 1000);
const MONTO_SIN_TOPE = PASOS_MONTO[PASOS_MONTO.length - 1];
function pasajePorHoras(h) {
  return h <= 2.5 ? 150000 : h <= 5 ? 350000 : h <= 9 ? 700000 : h <= 13 ? 1000000 : 1400000;
}
function precioPasaje(d) {
  return d.pasaje && d.pasaje.tipicoCLP ? d.pasaje.tipicoCLP : pasajePorHoras(d.horasVuelo);
}
// Montos en pesos chilenos: "$1,4 millones" / "$300 mil" (en inglés: "$1.4 million" / "$300k")
function montoTxt(m) {
  const millones = (x) => {
    const n = Math.round(x / 100000) / 10;
    if (EN()) return `$${n} million`;
    const t = String(n).replace(".", ",");
    return `$${t} ${t === "1" ? "millón" : "millones"}`;
  };
  if (m === MONTO_SIN_TOPE) return `${millones(m)} ${L("o más", "or more")}`;
  if (m >= 1000000) return millones(m);
  return EN() ? `$${Math.round(m / 1000)}k` : `$${Math.round(m / 1000)} mil`;
}
// Un pasaje "calza" si no supera el presupuesto en más de 5% (los precios son de una foto, cambian a diario)
const pasajeCalza = (d, r) => r.monto >= MONTO_SIN_TOPE || precioPasaje(d) <= r.monto * 1.05;

// [código, nombre, aeropuerto de salida, ciudad de salida, nombre en inglés, ciudad en inglés]
const PAISES = [
  ["CL", "Chile", "SCL", "Santiago", "Chile", "Santiago"],
  ["AR", "Argentina", "EZE", "Buenos Aires", "Argentina", "Buenos Aires"],
  ["PE", "Perú", "LIM", "Lima", "Peru", "Lima"],
  ["CO", "Colombia", "BOG", "Bogotá", "Colombia", "Bogotá"],
  ["MX", "México", "MEX", "Ciudad de México", "Mexico", "Mexico City"],
  ["BR", "Brasil", "GRU", "São Paulo", "Brazil", "São Paulo"],
  ["UY", "Uruguay", "MVD", "Montevideo", "Uruguay", "Montevideo"],
  ["EC", "Ecuador", "UIO", "Quito", "Ecuador", "Quito"],
  ["BO", "Bolivia", "VVI", "Santa Cruz", "Bolivia", "Santa Cruz"],
  ["US", "Estados Unidos", "MIA", "Miami", "United States", "Miami"],
  ["ES", "España", "MAD", "Madrid", "Spain", "Madrid"],
  ["XX", "Otro país", "", "", "Another country", ""],
];
const paisNom = (p) => (EN() ? p[4] : p[1]);
const ciudadNom = (p) => (EN() ? p[5] : p[3]);

// Países a los que un chileno puede entrar solo con su cédula de identidad.
// El catálogo trae el dato verificado por destino (d.ingreso.soloCarnet); esta lista es el respaldo.
const PAISES_CON_CARNET = ["AR", "BR", "UY", "PY", "BO", "PE", "CO", "EC", "VE"];
const entraConCarnet = (d) => (d.ingreso ? d.ingreso.soloCarnet : PAISES_CON_CARNET.includes(d.codigoPais));

// Documento que el usuario puede marcar como "ya lo tengo" y los países que habilita
const DOCUMENTOS = {
  esta: { paises: ["US", "PR"], nombre: "la ESTA o visa de Estados Unidos", nombreEn: "the US ESTA or visa" },
  eta_ca: { paises: ["CA"], nombre: "la eTA o visa de Canadá", nombreEn: "the Canadian eTA or visa" },
  eta_uk: { paises: ["GB"], nombre: "la ETA del Reino Unido", nombreEn: "the UK ETA" },
};

// ¿El usuario ya tiene el permiso de ingreso que pide este destino?
const yaTienePermiso = (d, r) =>
  (r.docs || []).some((k) => DOCUMENTOS[k] && DOCUMENTOS[k].paises.includes(d.codigoPais));

// ¿Le falta pasaporte para ir a este destino? (solo aplica a quien vive en Chile)
const faltaPasaporte = (d, r) =>
  (r.docs || []).includes("carnet") && d.codigoPais !== r.pais && !entraConCarnet(d);

/*
 * Continentes que puede preferir el usuario. Es una preferencia, no un filtro:
 * los destinos del continente elegido suman puntos, pero si otro lugar calza
 * mucho mejor igual puede aparecer (el resultado lo avisa).
 */
const CONTINENTES = {
  sudamerica: { nombre: "Sudamérica", nombreEn: "South America", regiones: ["Sudamérica", "Antártica"] },
  norteamerica: { nombre: "Norteamérica", nombreEn: "North America", regiones: ["Norteamérica"] },
  centro_caribe: { nombre: "Centroamérica y el Caribe", nombreEn: "Central America and the Caribbean", regiones: ["Centroamérica", "Caribe"] },
  europa: { nombre: "Europa", nombreEn: "Europe", regiones: ["Europa"] },
  asia: { nombre: "Asia y Medio Oriente", nombreEn: "Asia and the Middle East", regiones: ["Asia"] },
  africa: { nombre: "África", nombreEn: "Africa", regiones: ["África"] },
  oceania: { nombre: "Oceanía", nombreEn: "Oceania", regiones: ["Oceanía"] },
};
const continenteNom = (k) => (EN() ? CONTINENTES[k].nombreEn : CONTINENTES[k].nombre);
const continenteDe = (d) => Object.keys(CONTINENTES).find((k) => CONTINENTES[k].regiones.includes(d.region));
// Continentes elegidos (vacío = sin preferencia o "me da lo mismo")
const continentesDe = (r) => (r.continentes || []).filter((k) => CONTINENTES[k]);
const enContinenteElegido = (d, r) => continentesDe(r).includes(continenteDe(d));
// "Europa", "Europa o Asia y Medio Oriente", "África u Oceanía" (se eligen como alternativas, por eso "o")
function continentesTxt(r) {
  const n = continentesDe(r).map(continenteNom);
  if (n.length <= 1) return n.join("");
  const ultimo = n[n.length - 1];
  if (EN()) return `${n.slice(0, -1).join(", ")} or ${ultimo}`;
  return `${n.slice(0, -1).join(", ")} ${/^h?o/i.test(ultimo) ? "u" : "o"} ${ultimo}`;
}

// Meses elegidos por el usuario (1 = enero ... 12 = diciembre). Vacío = "aún no lo sé".
const mesesDe = (r) => (Array.isArray(r.meses) ? r.meses.filter((m) => m > 0).sort((a, b) => a - b) : r.mes ? [r.mes] : []);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const listaTxt = (arr) => (arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + L(" y ", " and ") + arr[arr.length - 1]);
const horasTxt = (h) => (h < 1.5 ? "~1 h" : `~${Math.round(h)} h`);
const paisDe = (codigo) => PAISES.find((p) => p[0] === codigo) || PAISES[0];

// Convierte [11,12,1,2,3] en "Nov a mar"
function mesesTxt(meses) {
  if (meses.length === 12) return L("Todo el año", "All year");
  const set = new Set(meses);
  const prev = (m) => (m === 1 ? 12 : m - 1);
  const next = (m) => (m === 12 ? 1 : m + 1);
  const partes = [];
  for (let m = 1; m <= 12; m++) {
    if (set.has(m) && !set.has(prev(m))) {
      let fin = m;
      while (set.has(next(fin)) && next(fin) !== m) fin = next(fin);
      partes.push(m === fin ? mesCorto(m) : `${mesCorto(m)} ${L("a", "to")} ${mesCorto(fin)}`);
    }
  }
  return cap(partes.join(L(" y ", " and ")));
}

// Meses elegidos en que la ruta directa desde Santiago no opera (según la JAC)
const mesesSinDirecto = (d, r) => (d.directoJac ? mesesDe(r).filter((m) => !d.directoJac.mesesConVuelo.includes(m)) : []);

/*
 * Pesos del puntaje (máximo teórico: 128 puntos)
 *   Tipo de experiencia   40
 *   Continente            25  (si le da lo mismo, todos suman 25)
 *   Presupuesto           20
 *   Ritmo                 15
 *   Compañía              10
 *   Temporada             10
 *   Clásico / distinto     8
 *   Visa                  penaliza si pidió "sin trámites"
 */
const PUNTAJE_MAXIMO = 128;

function puntaje(d, r) {
  let s = 0;
  const coincidencias = d.tags.filter((t) => r.tags.includes(t));
  s += (40 * coincidencias.length) / r.tags.length;

  let castigo;
  if (r.monto) {
    // Pasarse del presupuesto castiga fuerte; quedar bajo, apenas
    const razon = r.monto >= MONTO_SIN_TOPE ? Math.min(1, precioPasaje(d) / r.monto) : precioPasaje(d) / r.monto;
    castigo = razon > 1 ? (razon - 1) * 50 : (1 - razon) * 6;
  } else if (r.presupuesto === undefined) castigo = 10; // sin pregunta de presupuesto (fuera de Chile): neutro
  else castigo = d.costo > r.presupuesto ? (d.costo - r.presupuesto) * 8 : (r.presupuesto - d.costo) * 3;
  s += Math.max(0, 20 - castigo);

  s += 15 * (1 - Math.abs(d.actividad - r.ritmo) / 4);

  if (d.idealPara.includes(r.conQuien)) s += 10;

  // Temporada: proporción de los meses elegidos que son buenos para el destino
  const meses = mesesDe(r);
  if (!meses.length) s += 6;
  else s += 1 + (9 * meses.filter((m) => d.meses.includes(m)).length) / meses.length;

  if (r.estilo === "clasico") s += (8 * (d.popularidad - 1)) / 4;
  else if (r.estilo === "sorpresa") s += (8 * (5 - d.popularidad)) / 4;
  else s += 4;

  // Si le da lo mismo, cualquier continente le cumple; si eligió, suma solo el continente elegido
  if (!continentesDe(r).length || enContinenteElegido(d, r)) s += 25;

  if (r.visa === "ninguna" && d.visa !== "N" && d.codigoPais !== r.pais && !yaTienePermiso(d, r)) s -= 15;
  // Sin pasaporte: sacarlo toma tiempo, así que se prefieren destinos a los que se entra con carnet
  if (faltaPasaporte(d, r)) s -= r.visa === "ninguna" ? 25 : 12;

  return { puntaje: s, coincidencias };
}

// Cómo se nombra cada tipo dentro de una frase (para no escribir "vino y cielos y estrellas")
const TIPO_EN_FRASE = { "Cielos y estrellas": "cielos estrellados" };
// Nombre en inglés de cada tipo de experiencia (el valor guardado sigue en español)
const TIPO_EN = { Playa: "Beach", Cultura: "Culture", Aventura: "Adventure", Naturaleza: "Nature", Relax: "Relaxation", "Gastronomía": "Food", "Vida nocturna": "Nightlife", Compras: "Shopping", Nieve: "Snow", "Vida silvestre": "Wildlife", Vino: "Wine", "Cielos y estrellas": "Starry skies" };
const tipoNom = (t) => (EN() ? TIPO_EN[t] || t : t);
const tipoEnFrase = (t) => (EN() ? (TIPO_EN[t] || t).toLowerCase() : TIPO_EN_FRASE[t] || t.toLowerCase());

function razones(d, r, coincidencias) {
  const pais = paisDe(r.pais);
  const out = [];
  if (coincidencias.length) out.push(L(`Tiene lo que buscas: ${listaTxt(coincidencias.map(tipoEnFrase))}.`, `It has what you're looking for: ${listaTxt(coincidencias.map(tipoEnFrase))}.`));
  if (r.alcance === "dentro") out.push(L(`Está dentro de ${paisNom(pais)}, como pediste.`, `It's in ${paisNom(pais)}, as you asked.`));
  // Si eligió continente y calza, eso dice más que "es fuera de tu país"
  if (enContinenteElegido(d, r) && d.codigoPais !== r.pais) out.push(L(`Está en ${continenteNom(continenteDe(d))}, como querías.`, `It's in ${continenteNom(continenteDe(d))}, as you wanted.`));
  else if (r.alcance === "fuera" && r.pais !== "XX") out.push(L(`Es fuera de ${paisNom(pais)}, como pediste.`, `It's outside ${paisNom(pais)}, as you asked.`));
  if (yaTienePermiso(d, r)) {
    const doc = DOCUMENTOS[r.docs.find((k) => DOCUMENTOS[k] && DOCUMENTOS[k].paises.includes(d.codigoPais))];
    out.push(L(`Ya tienes ${doc.nombre}, no necesitas trámites.`, `You already have ${doc.nombreEn}, no paperwork needed.`));
  } else if ((r.docs || []).includes("carnet") && d.codigoPais !== r.pais && entraConCarnet(d)) out.push(L("Puedes entrar solo con tu carnet, sin pasaporte.", "You can enter with just your ID card, no passport."));
  else if (r.visa && r.visa !== "da_igual" && d.visa === "N" && d.codigoPais !== r.pais) out.push(L("No necesitas visa con pasaporte chileno.", "No visa needed with a Chilean passport."));
  if (r.monto ? pasajeCalza(d, r) : d.costo <= r.presupuesto) {
    out.push(r.monto
      ? L(`El pasaje sale ~${montoTxt(precioPasaje(d))} ida y vuelta: calza con tu presupuesto.`, `The round-trip ticket costs ~${montoTxt(precioPasaje(d))}: it fits your budget.`)
      : L(`Calza con un presupuesto ${PRESUPUESTO_TXT[r.presupuesto]}.`, `It fits a ${PRESUPUESTO_TXT_EN[r.presupuesto]} budget.`));
  }
  const buenos = mesesDe(r).filter((m) => d.meses.includes(m)).map(mesNom);
  if (buenos.length === 1) out.push(L(`${cap(buenos[0])} está entre sus mejores meses.`, `${buenos[0]} is one of its best months.`));
  else if (buenos.length > 1) out.push(L(`${cap(listaTxt(buenos))} están entre sus mejores meses.`, `${listaTxt(buenos)} are among its best months.`));
  if (d.idealPara.includes(r.conQuien)) out.push(L(`Funciona muy bien para viajar ${CON_QUIEN[r.conQuien]}.`, `It works really well for traveling ${CON_QUIEN_EN[r.conQuien]}.`));
  if (Math.abs(d.actividad - r.ritmo) <= 1) {
    out.push(r.ritmo >= 4 ? L("Tiene la actividad física que pediste.", "It has the physical activity you asked for.") : r.ritmo <= 2 ? L("Se disfruta sin apuro, a tu ritmo.", "You can enjoy it without rushing, at your own pace.") : L("Mezcla actividad y descanso.", "It mixes activity and rest."));
  }
  if (r.estilo === "sorpresa" && d.popularidad <= 2) out.push(L("Es un destino poco masificado.", "It's an uncrowded destination."));
  // Vuelo directo según la JAC, solo si opera en los meses elegidos (o si no eligió meses)
  const jac = d.directoJac;
  if (jac && r.pais === "CL" && mesesDe(r).every((m) => jac.mesesConVuelo.includes(m))) out.push(L("Hay vuelo directo desde Santiago, sin escalas.", "There's a nonstop flight from Santiago."));
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
    const exacto = Math.max(0, Math.min(99.4, (x.puntaje / PUNTAJE_MAXIMO) * 100));
    resultado.push({ ...x, porcentaje: Math.min(99, Math.round(exacto)), porcentajeExacto: Math.round(exacto * 10) / 10 });
  }
  return { resultado, sinCandidatos };
}

if (typeof module !== "undefined") {
  module.exports = { IDIOMA: () => IDIOMA, setIdioma, EN, L, T, tx, mesNom, mesCorto, conQuienTxt, paisNom, ciudadNom, continenteNom, tipoNom, TIPO_EN, MESES_EN, CON_QUIEN_EN, CONTINENTES, continenteDe, continentesDe, enContinenteElegido, continentesTxt, mesesSinDirecto, MESES, MESES_CORTOS, CON_QUIEN, PRESUPUESTO_TXT, PASOS_MONTO, MONTO_SIN_TOPE, precioPasaje, pasajeCalza, montoTxt, PAISES, PAISES_CON_CARNET, DOCUMENTOS, entraConCarnet, yaTienePermiso, faltaPasaporte, PUNTAJE_MAXIMO, mesesDe, cap, listaTxt, horasTxt, mesesTxt, paisDe, puntaje, razones, recomendar };
}
