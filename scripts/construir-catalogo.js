/*
 * Construye data/destinos.js (el catálogo que usa la app) juntando:
 *
 *   data/base/destinos-base.json        datos editoriales del equipo (tags, ritmo, pros y contras...)
 *   data/fuentes/requisitos-ingreso.json requisitos de ingreso por país, con fuente oficial y fecha
 *   data/fuentes/clima.json              clima mensual por destino, con fuente y período
 *   data/fuentes/aeropuertos.json        coordenadas de aeropuertos (OurAirports)
 *   data/fuentes/banco-mundial.json      indicadores por país (nivel de precios, llegadas de turistas)
 *   data/fuentes/precios-vuelos.json     foto de precios de pasajes desde Santiago (Google Flights)
 *   data/fuentes/corte.json              fecha del corte de datos y vigencia de cada tipo de dato
 *
 * Uso:  npm run catalogo
 *
 * No edites data/destinos.js a mano: se sobrescribe cada vez que corre este script.
 * Para cambiar un destino edita data/base/destinos-base.json; para actualizar un dato con
 * fuente edita el archivo correspondiente en data/fuentes/ (con su nueva fecha).
 */

const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const leer = (archivo) => JSON.parse(fs.readFileSync(path.join(raiz, archivo), "utf8"));

const base = leer("data/base/destinos-base.json");
const ingreso = leer("data/fuentes/requisitos-ingreso.json");
const clima = leer("data/fuentes/clima.json");
const { aeropuertos, fechaCaptura: fechaAeropuertos, fuente: fuenteAeropuertos, fuenteUrl: urlAeropuertos } = leer("data/fuentes/aeropuertos.json");
const bancoMundial = leer("data/fuentes/banco-mundial.json");
const corte = leer("data/fuentes/corte.json");
const precios = leer("data/fuentes/precios-vuelos.json");

/*
 * PARA MÁS ADELANTE (la app no lo usa todavía: el presupuesto compara solo el pasaje).
 * Costo estimado de una semana por persona = pasaje ida y vuelta + 7 días de gasto en el destino.
 *   Pasaje: promedio de la tarifa típica en temporada baja y alta (foto de Google Flights).
 *           Si no hay precio, se estima según las horas de vuelo (marcado como "estimado").
 *   Gasto diario: $20.000 + $100.000 × nivel de precios del país (Banco Mundial, PPA / tipo de cambio).
 *           Es una aproximación del equipo para alojamiento sencillo, comida y transporte local.
 */
const DIAS_VIAJE = 7;
const pasajePorHoras = (h) => (h <= 2.5 ? 150000 : h <= 5 ? 350000 : h <= 9 ? 700000 : h <= 13 ? 1000000 : 1400000);
const gastoDiario = (nivel, costoEditorial) => 20000 + 100000 * (nivel ?? 0.3 + costoEditorial * 0.2);
const redondear10mil = (n) => Math.round(n / 10000) * 10000;

/*
 * Destinos donde el gasto real no depende del nivel de precios del país sino de una
 * experiencia que se paga aparte (expedición, safari, tarifas de parque, resorts).
 * Piso de gasto diario por persona, estimado por el equipo; revisar con cotizaciones reales.
 */
const GASTO_DIARIO_MINIMO = {
  antartica: { clp: 600000, motivo: "expedición desde Ushuaia o Punta Arenas (crucero o vuelo con operador)" },
  butan: { clp: 240000, motivo: "tarifa de desarrollo sostenible (SDF) diaria y tour guiado obligatorio" },
  "islas-galapagos": { clp: 180000, motivo: "entrada al parque nacional y excursiones en bote" },
  "kilimanjaro-y-serengeti": { clp: 280000, motivo: "safari con operador y entradas a parques" },
  "safari-en-kenia": { clp: 280000, motivo: "safari con operador y entradas a parques" },
  "delta-del-okavango": { clp: 280000, motivo: "safari con operador y lodges" },
  ruanda: { clp: 330000, motivo: "permiso para ver gorilas y tours guiados" },
  maldivas: { clp: 230000, motivo: "alojamiento en resort y traslados en hidroavión o lancha" },
  seychelles: { clp: 180000, motivo: "alojamiento y traslados entre islas" },
};

function resumenPasaje(ap) {
  const p = precios.aeropuertos[ap];
  if (!p) return null;
  const temporadas = ["baja", "alta"].filter((t) => p[t]);
  if (!temporadas.length) return null;
  // Si falta una temporada se usa la estimada (razón mediana alta/baja de la foto)
  const baja = p.baja ? p.baja.tipico : p.bajaEstimadaCLP;
  const alta = p.alta ? p.alta.tipico : p.altaEstimadaCLP;
  const directo = temporadas.some((t) => p[t].minDirecto > 0);
  const escalas = Math.min(...temporadas.map((t) => p[t].escalasMin));
  const duraciones = temporadas.map((t) => p[t].duracionMin).filter((x) => x > 0);
  return {
    tipicoCLP: Math.round((baja + alta) / 2),
    desdeCLP: Math.min(...temporadas.map((t) => p[t].min)),
    bajaCLP: baja,
    altaCLP: alta,
    temporadaEstimada: !p.baja ? "baja" : !p.alta ? "alta" : null,
    directo,
    escalas: directo ? 0 : escalas,
    duracionHoras: duraciones.length ? Math.round((Math.min(...duraciones) / 60) * 10) / 10 : null,
    aerolinea: (p.baja || p.alta).aerolinea || "",
    ciudadConsultada: p.ciudadGoogle,
    fecha: precios.fechaCaptura,
  };
}

// Requisitos que obligan a hacer algo ANTES de viajar (se castigan si el usuario pide "sin trámites")
const REQUIERE_TRAMITE = new Set(["autorizacion_electronica", "e_visa", "visa_consular"]);
// Casos especiales revisados a mano (ver notas de cada país)
const TRAMITE_ESPECIAL = { CV: true }; // Cabo Verde: visa + pre-registro EASE obligatorio

// Distancia ortodrómica (fórmula de haversine), en km
function distanciaKm(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Tiempo mínimo de un vuelo directo: velocidad media de bloque ~880 km/h + 0,5 h de rodaje, despegue y aterrizaje
const horasMinimas = (km) => Math.round((km / 880 + 0.5) * 10) / 10;

// Percentil (0 a 1) de cada valor dentro de su lista
function percentiles(valores) {
  const validos = valores.filter((v) => v != null).sort((a, b) => a - b);
  return valores.map((v) => (v == null ? null : validos.filter((x) => x < v).length / Math.max(1, validos.length - 1)));
}

const scl = aeropuertos.SCL;
const errores = [];

const filas = base.map((d) => {
  const ap = aeropuertos[d.aeropuerto];
  const req = ingreso[d.codigoPais];
  const cl = clima[d.id];
  const ind = bancoMundial.paises[d.codigoPais] || {};
  if (!ap) errores.push(`${d.nombre}: falta el aeropuerto ${d.aeropuerto} en aeropuertos.json`);
  if (!req) errores.push(`${d.nombre}: falta el país ${d.codigoPais} en requisitos-ingreso.json`);
  if (!cl) errores.push(`${d.nombre}: falta en clima.json`);
  return { d, ap, req, cl, ind, km: ap ? Math.round(distanciaKm(scl, ap)) : null };
});
if (errores.length) {
  console.error("No se pudo construir el catálogo:\n- " + errores.join("\n- "));
  process.exit(1);
}

// Costo calculado (para contrastar con el costo editorial): mitad pasaje (distancia), mitad costo diario (nivel de precios del país)
const pctKm = percentiles(filas.map((f) => f.km));
const pctPrecio = percentiles(filas.map((f) => f.ind.nivelPrecios2023 ?? null));

const horasRevisar = [];
const DESTINOS = filas.map(({ d, ap, req, cl, ind, km }, i) => {
  const tramitePrevio = TRAMITE_ESPECIAL[d.codigoPais] ?? REQUIERE_TRAMITE.has(req.requisito);
  const minimo = horasMinimas(km);
  const mezcla = pctPrecio[i] == null ? null : 0.5 * pctKm[i] + 0.5 * pctPrecio[i];
  const pasaje = resumenPasaje(d.aeropuerto);
  // Horas: la duración real del itinerario más rápido (con escalas) si hay foto de precios; si no, la editorial
  // Si la duración real difiere mucho de la editorial (itinerario raro esa semana, o destino con tramo
  // terrestre incluido en la editorial), se mantiene la editorial y queda en la lista para revisar.
  const real = pasaje && pasaje.duracionHoras;
  const usarReal = real && real >= d.horasVuelo * 0.6 && real <= d.horasVuelo * 1.6;
  if (real && !usarReal) horasRevisar.push(`${d.nombre} (${d.aeropuerto}): editorial ${d.horasVuelo} h, Google Flights ${real} h`);
  const horas = usarReal ? real : d.horasVuelo;
  const piso = GASTO_DIARIO_MINIMO[d.id];
  const diario = Math.max(gastoDiario(ind.nivelPrecios2023, d.costo), piso ? piso.clp : 0);
  const costoEstimadoCLP = redondear10mil((pasaje ? pasaje.tipicoCLP : pasajePorHoras(horas)) + DIAS_VIAJE * diario);
  return {
    id: d.id,
    nombre: d.nombre,
    pais: d.pais,
    codigoPais: d.codigoPais,
    region: d.region,
    aeropuerto: d.aeropuerto,
    costo: d.costo,
    actividad: d.actividad,
    popularidad: d.popularidad,
    // Las horas editoriales nunca pueden ser menores que el mínimo físico de un vuelo directo
    horasVuelo: Math.max(horas, minimo),
    visa: d.codigoPais === "CL" || !tramitePrevio ? "N" : "E",
    visaTexto: req.texto,
    meses: d.meses,
    tags: d.tags,
    idealPara: d.idealPara,
    clima: d.clima,
    pros: d.pros,
    contras: d.contras,
    ingreso: {
      requisito: req.requisito,
      texto: req.texto,
      soloCarnet: req.soloCarnet,
      tramitePrevio,
      estadiaMaxDias: req.estadiaMaxDias,
      costoUSD: req.costoUSD,
      notas: req.notas,
      fuenteNombre: req.fuenteNombre,
      fuenteUrl: req.fuenteUrl,
      confianza: req.confianza,
      fecha: req.fechaVerificacion,
    },
    climaMensual: {
      lugar: cl.lugarReferencia,
      tmax: cl.tmax,
      tmin: cl.tmin,
      lluviaMm: cl.lluviaMm,
      periodo: cl.periodo,
      fuenteNombre: cl.fuenteNombre,
      fuenteUrl: cl.fuenteUrl,
      confianza: cl.confianza,
      fecha: cl.fechaCaptura,
    },
    ubicacion: { lat: ap.lat, lon: ap.lon, distanciaKmDesdeSantiago: km, horasMinimasDirecto: minimo, fecha: fechaAeropuertos },
    indicadoresPais: { nivelPrecios2023: ind.nivelPrecios2023 ?? null, llegadasTuristas2019: ind.llegadasTuristas2019 ?? null, fecha: bancoMundial.fechaCaptura },
    costoCalculado: mezcla == null ? null : Math.min(5, 1 + Math.floor(mezcla * 5)),
    pasaje,
    gastoDiarioCLP: Math.round(diario / 1000) * 1000,
    gastoDiarioMotivo: piso ? piso.motivo : null,
    costoEstimadoCLP,
    calidad: {
      ingreso: `verificado (${req.confianza})`,
      clima: `fuente citada (${cl.confianza})`,
      horasVuelo: usarReal ? "fuente (Google Flights, itinerario más rápido)" : "estimado, validado con distancia real",
      pasaje: pasaje ? "fuente (foto de Google Flights)" : "estimado por horas de vuelo",
      costoEstimado: "calculado: pasaje + 7 días de gasto (estimación del equipo)",
      ubicacion: "fuente (OurAirports)",
      costo: "editorial",
      actividad: "editorial",
      popularidad: "editorial",
      tags: "editorial",
      prosContras: "editorial",
    },
  };
});

const CORTE_DATOS = {
  fechaCorte: corte.fechaCorte,
  vigenciaDias: corte.vigenciaDias,
  fuentes: {
    ingreso: "Sitios oficiales de cada país y Cancillería de Chile (una URL por país)",
    clima: "Servicios meteorológicos nacionales y tablas climáticas que los citan (una URL por destino)",
    aeropuertos: `${fuenteAeropuertos} (${urlAeropuertos})`,
    indicadores: "Banco Mundial (ST.INT.ARVL, PA.NUS.PPP, PA.NUS.FCRF)",
    pasajes: `${precios.fuente}, capturado el ${precios.fechaCaptura} (${precios.descripcion})`,
  },
  precios: { fechaCaptura: precios.fechaCaptura, temporadas: precios.temporadas, diasViaje: DIAS_VIAJE },
};

const encabezado = `/*
 * ARCHIVO GENERADO por scripts/construir-catalogo.js — no lo edites a mano.
 * Corte de datos: ${corte.fechaCorte}. Destinos: ${DESTINOS.length}.
 *
 * Datos editoriales: data/base/destinos-base.json
 * Datos con fuente:  data/fuentes/*.json   (metodología en data/FUENTES.md)
 * Para regenerar:    npm run catalogo
 */
`;
const js = `${encabezado}const CORTE_DATOS = ${JSON.stringify(CORTE_DATOS, null, 1)};

const DESTINOS = [
${DESTINOS.map((x) => "  " + JSON.stringify(x)).join(",\n")}
];

if (typeof module !== "undefined") {
  module.exports = DESTINOS;
  module.exports.CORTE_DATOS = CORTE_DATOS;
}
`;
fs.writeFileSync(path.join(raiz, "data/destinos.js"), js);

// Resumen para revisión del equipo
const conteo = (lista) => lista.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {});
const diferenciasCosto = DESTINOS.filter((x) => x.costoCalculado != null && Math.abs(x.costo - x.costoCalculado) >= 2);
console.log(`Catálogo generado: ${DESTINOS.length} destinos, corte ${corte.fechaCorte}`);
console.log("Confianza requisitos de ingreso:", conteo(DESTINOS.map((x) => x.ingreso.confianza)));
console.log("Confianza clima:", conteo(DESTINOS.map((x) => x.climaMensual.confianza)));
console.log(`Horas ajustadas al mínimo físico: ${filas.filter((f) => f.d.horasVuelo < horasMinimas(f.km)).map((f) => f.d.nombre).join(", ") || "ninguna"}`);
console.log(`Horas de vuelo que no se reemplazaron por la duración de Google Flights (revisar): ${horasRevisar.length}`);
for (const x of horasRevisar) console.log(`  ${x}`);
const sinPrecio = DESTINOS.filter((x) => !x.pasaje);
console.log(`Destinos con precio de pasaje (Google Flights): ${DESTINOS.length - sinPrecio.length}; sin precio: ${sinPrecio.map((x) => x.nombre).join(", ") || "ninguno"}`);
console.log(`Costo editorial vs calculado con diferencia de 2 o más (revisar): ${diferenciasCosto.length}`);
for (const x of diferenciasCosto) console.log(`  ${x.nombre}: editorial ${x.costo}, calculado ${x.costoCalculado}`);
