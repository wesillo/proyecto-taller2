/*
 * Interfaz de Fly4ward: preguntas, resultado y redirección a la compra.
 * Usa DESTINOS (data/destinos.js) y el motor de js/matching.js.
 */

const TIPOS = [
  ["Playa", "Sol y arena"],
  ["Cultura", "Museos, historia y arquitectura"],
  ["Aventura", "Trekking, deportes y adrenalina"],
  ["Naturaleza", "Paisajes, parques y fauna"],
  ["Relax", "Descansar sin agenda"],
  ["Gastronomía", "Comer bien y probar la cocina local"],
  ["Vida nocturna", "Bares, fiestas y salidas de noche"],
  ["Compras", "Tiendas, outlets y mercados"],
  ["Nieve", "Ski, frío y paisajes nevados"],
];

// Ciudades de salida dentro de Chile para la búsqueda de vuelos
const ORIGENES_CHILE = [["SCL", "Santiago"], ["CCP", "Concepción"], ["ANF", "Antofagasta"], ["CJC", "Calama"], ["IQQ", "Iquique"], ["ARI", "Arica"], ["LSC", "La Serena"], ["ZCO", "Temuco"], ["PMC", "Puerto Montt"], ["PUQ", "Punta Arenas"]];

// Las preguntas con `mostrar` solo aparecen si se cumple la condición
const PREGUNTAS = [
  { clave: "alcance", tipo: "alcance", titulo: "¿Dónde quieres viajar?", ayuda: "Primero cuéntanos en qué país vives." },
  {
    clave: "tags", tipo: "multiple", max: 3, titulo: "¿Qué buscas en este viaje?", ayuda: "Elige hasta 3. Es lo que más pesa en la recomendación.",
    opciones: TIPOS.map(([v, desc]) => ({ v, label: v, desc })),
  },
  {
    clave: "presupuesto", tipo: "unica", titulo: "¿Cómo es tu presupuesto?", ayuda: "Pensando en pasajes, alojamiento y gastos en el destino.",
    opciones: [
      { v: 1.5, label: "Ajustado", desc: "Quiero que rinda al máximo" },
      { v: 3, label: "Moderado", desc: "Ni muy barato ni de lujo" },
      { v: 4, label: "Cómodo", desc: "Puedo darme algunos gustos" },
      { v: 5, label: "Sin límite", desc: "Busco la mejor experiencia" },
    ],
  },
  {
    clave: "ritmo", tipo: "unica", titulo: "¿Qué ritmo quieres?",
    opciones: [
      { v: 1, label: "Tranquilo", desc: "Descansar y pasear sin apuro" },
      { v: 3, label: "Equilibrado", desc: "Un poco de todo" },
      { v: 5, label: "Intenso", desc: "Caminatas largas y actividad física" },
    ],
  },
  {
    clave: "conQuien", tipo: "unica", titulo: "¿Con quién viajas?", layout: "two",
    opciones: [
      { v: "S", label: "Solo" },
      { v: "P", label: "En pareja" },
      { v: "F", label: "En familia" },
      { v: "A", label: "Con amigos" },
    ],
  },
  {
    // No cambia la recomendación: se guarda para el Machine Learning y para avisar a menores de edad
    clave: "edad", tipo: "unica", titulo: "¿Cuántos años tienes?", ayuda: "No cambia tu recomendación. Nos ayuda a mejorar las sugerencias con el tiempo.", layout: "two",
    opciones: [
      { v: "menor", label: "Menos de 18" },
      { v: "18-24", label: "18 a 24" },
      { v: "25-34", label: "25 a 34" },
      { v: "35-49", label: "35 a 49" },
      { v: "50-64", label: "50 a 64" },
      { v: "65+", label: "65 o más" },
    ],
  },
  { clave: "meses", tipo: "meses", exclusiva: 0, titulo: "¿En qué meses podrías viajar?", ayuda: "Elige uno o varios. Algunos destinos cambian mucho según la temporada." },
  {
    clave: "horas", tipo: "unica", mostrar: (r) => r.pais === "CL" && r.alcance !== "dentro",
    titulo: "¿Cuántas horas de vuelo aguantas?", ayuda: "Aproximado desde Santiago, contando escalas.",
    opciones: [
      { v: 5, label: "Hasta 5 horas", desc: "Chile y países vecinos" },
      { v: 12, label: "Hasta 12 horas", desc: "Sudamérica, Caribe y Norteamérica" },
      { v: 99, label: "Lo que sea", desc: "Al otro lado del mundo si vale la pena" },
    ],
  },
  {
    clave: "docs", tipo: "multiple", mostrar: (r) => r.pais === "CL" && r.alcance !== "dentro",
    titulo: "¿Qué documentos de viaje ya tienes?", ayuda: "Marca todos los que tengas vigentes.",
    exclusiva: "carnet",
    opciones: [
      { v: "pasaporte", label: "Pasaporte", desc: "Necesario fuera de Sudamérica" },
      { v: "esta", label: "ESTA o visa de EE.UU.", desc: "También sirve para Puerto Rico" },
      { v: "eta_ca", label: "eTA o visa de Canadá", desc: "" },
      { v: "eta_uk", label: "ETA del Reino Unido", desc: "" },
      { v: "carnet", label: "Solo carnet", desc: "No tengo pasaporte vigente" },
    ],
  },
  {
    clave: "visa", tipo: "unica", mostrar: (r) => r.pais === "CL" && r.alcance !== "dentro",
    titulo: "¿Te complica hacer un trámite nuevo?", ayuda: "Por ejemplo sacar pasaporte o pedir una visa que no tienes.",
    opciones: [
      { v: "ninguna", label: "Prefiero sin trámites", desc: "Solo con lo que ya tengo" },
      { v: "online", label: "Un trámite online está bien", desc: "Tipo ESTA, eTA o e-Visa" },
      { v: "da_igual", label: "No me importa", desc: "Hago lo que haga falta" },
    ],
  },
  {
    clave: "estilo", tipo: "unica", titulo: "¿Algo clásico o algo distinto?",
    opciones: [
      { v: "clasico", label: "Clásico y probado", desc: "Lugares que todos recomiendan" },
      { v: "da_igual", label: "Me da lo mismo", desc: "Lo que mejor me calce" },
      { v: "sorpresa", label: "Sorpréndeme", desc: "Algo menos conocido" },
    ],
  },
];

const estado = { pantalla: "inicio", paso: 0, r: { tags: [], pais: "CL" }, resultado: [], sinCandidatos: false, elegido: 0, feedback: {}, registro: "" };
const app = document.getElementById("app");

const preguntasActivas = () => PREGUNTAS.filter((p) => !p.mostrar || p.mostrar(estado.r));
const paisActual = () => paisDe(estado.r.pais);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const avion = (size, extra = "") =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" ${extra}><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>`;

function render() {
  if (estado.pantalla === "inicio") return renderInicio();
  if (estado.pantalla === "preguntas") return renderPregunta();
  if (estado.pantalla === "cargando") return renderCargando();
  if (estado.pantalla === "resultado") return renderResultado();
}

function empezar() {
  estado.pantalla = "preguntas";
  estado.paso = 0;
  estado.r = { tags: [], docs: [], meses: [], pais: estado.r.pais || "CL" };
  estado.inicio = Date.now(); // para medir cuánto tarda en decidir
  render();
  enfocarTitulo();
}

/* ---------- Inicio ---------- */
function renderInicio() {
  const muestra = ["CUZ", "LSC", "KEF", "PDL", "TBS"].map((i) => DESTINOS.find((d) => d.aeropuerto === i)).filter(Boolean);
  app.innerHTML = `
  <section class="hero">
    <h1>Tu próximo destino, sin dar vueltas.</h1>
    <p class="lead">Responde unas preguntas sobre tu viaje ideal y te indicamos un destino que calce contigo, con sus razones, lo bueno y lo que debes considerar.</p>
    <button class="btn btn-primary btn-go btn-block" id="start">Encontrar mi destino</button>
    <p class="note-small">Preguntas cortas, sin registrarte.</p>
    <details class="privacy">
      <summary>Guardamos tus respuestas de forma anónima para mejorar las recomendaciones.</summary>
      <p>No pedimos nombre, correo ni teléfono. Guardamos lo que respondes, el destino que te mostramos, si irías o no y cuánto tardaste en decidir. Lo usa solo el equipo de Fly4ward (proyecto universitario, FCFM, Universidad de Chile) para mejorar el sistema de recomendación.</p>
    </details>
    <div class="board" aria-label="Algunos de los ${DESTINOS.length} destinos posibles">
      <div class="row head" aria-hidden="true"><span>Código</span><span>Destino</span><span>País</span></div>
      ${muestra.map((d) => `<div class="row"><span class="code">${d.aeropuerto}</span><span>${esc(d.nombre)}</span><span class="status">${esc(d.pais)}</span></div>`).join("")}
      <div class="row"><span class="code">???</span><span>Tu destino</span><span class="status q">Por confirmar</span></div>
    </div>
    <p class="note-small">${DESTINOS.length} destinos en Chile y en los 7 continentes. Horas de vuelo y visas calculadas para quien sale desde Chile${corte.fechaCorte ? `, con datos verificados al ${fechaTxt(corte.fechaCorte)}` : ""}.</p>
    <button class="btn-link team-link" id="teamData">Datos del prototipo (equipo)</button>
  </section>`;
  document.getElementById("start").onclick = empezar;
  document.getElementById("teamData").onclick = abrirPanelDatos;
}

/* ---------- Preguntas ---------- */
function boton(o, presionado, extra = "") {
  return `<button class="opt ${extra}" aria-pressed="${presionado}" data-v="${esc(o.v)}">
    <span><span class="lbl">${esc(o.label)}</span>${o.desc ? `<span class="desc">${esc(o.desc)}</span>` : ""}</span>
  </button>`;
}

function renderPregunta() {
  const activas = preguntasActivas();
  const p = activas[estado.paso];
  const r = estado.r;
  const total = activas.length;
  let cuerpo = "";

  if (p.tipo === "alcance") {
    const pais = paisActual();
    const opciones = r.pais === "XX"
      ? [
          { v: "fuera", label: "Al extranjero", desc: "Fuera del país donde vivo" },
          { v: "da_igual", label: "Me da lo mismo", desc: "Lo que mejor me calce" },
        ]
      : [
          { v: "dentro", label: `Dentro de ${pais[1]}`, desc: "Conocer lo que tengo más cerca" },
          { v: "fuera", label: `Fuera de ${pais[1]}`, desc: "Salir al extranjero" },
          { v: "da_igual", label: "Me da lo mismo", desc: "Lo que mejor me calce" },
        ];
    cuerpo = `<label class="homesel" for="homeSel">Vivo en</label>
      <select id="homeSel" class="select">${PAISES.map((c) => `<option value="${c[0]}" ${c[0] === r.pais ? "selected" : ""}>${esc(c[1])}</option>`).join("")}</select>
      ${r.pais !== "CL" ? `<p class="q-hint" style="margin:10px 0 0">En este prototipo las horas de vuelo y las visas están calculadas desde Chile, así que esas preguntas no aparecerán.</p>` : ""}
      <div class="opts" style="margin-top:18px">${opciones.map((o) => boton(o, r.alcance === o.v)).join("")}</div>`;
  } else if (p.tipo === "multiple") {
    const marcadas = r[p.clave] || [];
    cuerpo = `<div class="opts ${p.opciones.length > 5 ? "three" : "two"} chips">${p.opciones.map((o) => boton(o, marcadas.includes(o.v))).join("")}</div>`;
  } else if (p.tipo === "meses") {
    const marcados = r.meses || [];
    cuerpo = `<div class="opts three">${MESES.map((m, i) => `<button class="opt month" aria-pressed="${marcados.includes(i + 1)}" data-v="${i + 1}">${cap(m)}</button>`).join("")}
      <button class="opt month wide" aria-pressed="${marcados.includes(0)}" data-v="0">Aún no lo sé</button></div>`;
  } else {
    cuerpo = `<div class="opts ${p.layout === "two" ? "two" : ""}">${p.opciones.map((o) => boton(o, String(r[p.clave]) === String(o.v))).join("")}</div>`;
  }

  // Siempre se avanza con "Continuar": elegir una opción solo la marca
  const multiple = p.tipo === "multiple" || p.tipo === "meses";
  const elegidas = multiple ? (r[p.clave] || []).length : 0;
  const contador = p.tipo === "meses" ? ((r.meses || []).includes(0) ? "Sin fecha definida" : `${elegidas} ${elegidas === 1 ? "mes" : "meses"}`) : p.max ? `${elegidas} de ${p.max} elegidas` : `${elegidas} ${elegidas === 1 ? "elegido" : "elegidos"}`;
  const respondida = multiple ? elegidas > 0 : r[p.clave] !== undefined;
  const ultima = estado.paso === total - 1;
  app.innerHTML = `
    <div class="stepline"><span>Pregunta ${estado.paso + 1} de ${total}</span></div>
    <div class="progress" aria-hidden="true"><i style="width:${(estado.paso / total) * 100}%"></i></div>
    <h2 class="q-title" tabindex="-1" id="qtitle">${esc(p.titulo)}</h2>
    ${p.ayuda ? `<p class="q-hint">${esc(p.ayuda)}</p>` : ""}
    ${cuerpo}
    <div class="q-actions">
      <button class="btn-link" id="back">${estado.paso === 0 ? "Volver al inicio" : "Atrás"}</button>
      ${multiple ? `<span class="counter">${contador}</span>` : ""}
      <button class="btn btn-primary btn-go" id="next" ${respondida ? "" : "disabled"}>${ultima ? "Ver mi destino" : "Continuar"}</button>
    </div>`;

  app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => elegir(p, b.dataset.v)));
  const selector = document.getElementById("homeSel");
  if (selector) {
    selector.onchange = (e) => {
      r.pais = e.target.value;
      if (r.pais === "XX" && r.alcance === "dentro") delete r.alcance;
      renderPregunta();
      document.getElementById("homeSel").focus();
    };
  }
  document.getElementById("back").onclick = () => {
    if (estado.paso === 0) estado.pantalla = "inicio";
    else estado.paso--;
    render();
    enfocarTitulo();
  };
  const siguiente = document.getElementById("next");
  if (siguiente) siguiente.onclick = avanzar;
}

function elegir(p, valor) {
  const r = estado.r;
  if (p.tipo === "multiple" || p.tipo === "meses") {
    if (p.tipo === "meses") valor = Number(valor);
    let lista = r[p.clave] || (r[p.clave] = []);
    const i = lista.indexOf(valor);
    if (i >= 0) lista.splice(i, 1);
    else {
      // Una opción "exclusiva" (como "Solo carnet") no se puede combinar con las demás
      if (p.exclusiva !== undefined) lista = r[p.clave] = valor === p.exclusiva ? [] : lista.filter((v) => v !== p.exclusiva);
      if (p.max && lista.length >= p.max) lista.shift();
      lista.push(valor);
    }
    renderPregunta();
    app.querySelector(`.opt[data-v="${CSS.escape(String(valor))}"]`)?.focus({ preventScroll: true });
    return;
  }
  if (p.tipo === "alcance") r[p.clave] = valor;
  else r[p.clave] = p.opciones.find((o) => String(o.v) === valor).v;
  renderPregunta();
  // Mantiene el foco en la opción recién elegida (útil al navegar con teclado)
  app.querySelector(`.opt[data-v="${CSS.escape(String(valor))}"]`)?.focus({ preventScroll: true });
}

function avanzar() {
  if (estado.paso < preguntasActivas().length - 1) {
    estado.paso++;
    render();
    enfocarTitulo();
    return;
  }
  // Borra respuestas de preguntas que quedaron ocultas (por ejemplo, si cambió de país)
  for (const p of PREGUNTAS) if (p.mostrar && !p.mostrar(estado.r)) delete estado.r[p.clave];
  estado.pantalla = "cargando";
  render();
  const { resultado, sinCandidatos } = recomendar(DESTINOS, estado.r);
  estado.resultado = resultado;
  estado.sinCandidatos = sinCandidatos;
  estado.elegido = 0;
  estado.feedback = {};
  estado.vistoEn = {};
  // Segundos desde que empezó el cuestionario hasta que pidió su destino
  estado.segundos = estado.inicio ? Math.round((Date.now() - estado.inicio) / 1000) : "";
  nuevaSesion();
  const espera = matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 1600;
  setTimeout(() => {
    estado.pantalla = "resultado";
    render();
    window.scrollTo({ top: 0 });
    enfocarTitulo();
  }, espera);
}

function enfocarTitulo() {
  const t = document.getElementById("qtitle");
  if (t) t.focus({ preventScroll: true });
}

/* ---------- Cargando ---------- */
function renderCargando() {
  app.innerHTML = `<section class="loading">
    <div class="flightpath" aria-hidden="true"><span class="plane">${avion(28, 'style="transform:rotate(90deg)"')}</span></div>
    <h2>Cruzando tu perfil con ${DESTINOS.length} destinos</h2>
    <p>Intereses, presupuesto, ritmo, compañía y temporada.</p>
  </section>`;
}

/* ---------- Corte de datos: fechas y vigencia ---------- */
const MESES_FECHA = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const corte = typeof CORTE_DATOS !== "undefined" ? CORTE_DATOS : { fechaCorte: null, vigenciaDias: {} };
function fechaTxt(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES_FECHA[m - 1]} ${a}`;
}
// ¿El dato superó su vigencia? (por ejemplo, una visa verificada hace más de 180 días)
function vencido(iso, tipo) {
  const dias = corte.vigenciaDias[tipo];
  if (!iso || !dias) return false;
  return (Date.now() - new Date(iso + "T12:00:00").getTime()) / 86400000 > dias;
}
const enlace = (url, texto) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(texto)}</a>` : esc(texto));
const redondear = (n) => String(Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 10) / 10).replace(".", ",");

/* ---------- Resultado ---------- */
function bloqueIngreso(d, r) {
  const ing = d.ingreso;
  if (!ing || d.codigoPais === r.pais) return "";
  const datos = [
    ing.estadiaMaxDias ? `hasta ${ing.estadiaMaxDias} días` : "",
    ing.costoUSD ? `trámite ~US$ ${redondear(ing.costoUSD)}` : ing.costoUSD === 0 ? "sin costo" : "",
    ing.soloCarnet ? "entras con carnet" : "requiere pasaporte",
  ].filter(Boolean).join(", ");
  return `
  <div class="section">
    <h3>Requisitos de entrada</h3>
    <div class="req">
      <div class="req-top"><b>${yaTienePermiso(d, r) ? "Ya tienes el permiso que se pide" : esc(ing.texto)}</b>${datos ? `<span>${datos}</span>` : ""}</div>
      ${r.pais !== "CL" ? `<p class="warnbox" style="margin-top:6px">Esta información es para pasaporte chileno. Revisa los requisitos para tu nacionalidad.</p>` : ""}
      <p>${esc(ing.notas)}</p>
      <p class="src">Fuente: ${enlace(ing.fuenteUrl, ing.fuenteNombre || "Cancillería")}, verificado el ${fechaTxt(ing.fecha)}.${ing.confianza !== "alta" ? " <strong>Confírmalo antes de comprar.</strong>" : ""}</p>
      ${vencido(ing.fecha, "visa") ? `<p class="warnbox">Este dato tiene más de ${corte.vigenciaDias.visa} días: puede estar desactualizado.</p>` : ""}
    </div>
  </div>`;
}

// Clima en los meses elegidos: rango de temperaturas y lluvia (promedio mensual si son varios meses)
function campoClima(d, r) {
  const meses = mesesDe(r);
  const c = d.climaMensual;
  if (!meses.length || !c) return "";
  const min = Math.min(...meses.map((m) => c.tmin[m - 1]));
  const max = Math.max(...meses.map((m) => c.tmax[m - 1]));
  const lluvia = meses.reduce((t, m) => t + c.lluviaMm[m - 1], 0) / meses.length;
  const etiqueta = meses.length === 1 ? `En ${MESES[meses[0] - 1]}` : "En tus meses";
  return `<div class="field"><dt class="k">${etiqueta}</dt><dd class="v">${redondear(min)} a ${redondear(max)} °C, ${redondear(lluvia)} mm de lluvia${meses.length > 1 ? " al mes" : ""}</dd></div>`;
}

function bloqueFuentes(d) {
  const c = d.climaMensual;
  const u = d.ubicacion;
  return `
  <details class="fuentes">
    <summary>Fuentes de esta recomendación</summary>
    <ul>
      ${c ? `<li><b>Clima:</b> ${esc(c.lugar)}. ${enlace(c.fuenteUrl, c.fuenteNombre)}${c.periodo ? `, ${esc(c.periodo)}` : ""}. Capturado el ${fechaTxt(c.fecha)}.</li>` : ""}
      ${u ? `<li><b>Distancia:</b> ${u.distanciaKmDesdeSantiago.toLocaleString("es-CL")} km desde Santiago, calculada con las coordenadas del aeropuerto ${esc(d.aeropuerto)} (OurAirports).</li>` : ""}
      ${d.ingreso && d.ingreso.fuenteUrl ? `<li><b>Requisitos de entrada:</b> ${enlace(d.ingreso.fuenteUrl, d.ingreso.fuenteNombre)}, verificado el ${fechaTxt(d.ingreso.fecha)}.</li>` : ""}
      <li><b>Costo, ritmo, popularidad, tipo de experiencia y pros/contras:</b> estimación editorial del equipo.</li>
    </ul>
    ${corte.fechaCorte ? `<p class="src">Corte de datos del catálogo: ${fechaTxt(corte.fechaCorte)}.</p>` : ""}
  </details>`;
}

// Porcentaje de coincidencia: si dos opciones empatan al redondear, se muestra un decimal en todas
function pctTxt(y) {
  const enteros = estado.resultado.map((z) => Math.round(z.porcentajeExacto ?? z.porcentaje));
  const empate = new Set(enteros).size < enteros.length;
  const v = y.porcentajeExacto ?? y.porcentaje;
  return empate ? `${v.toFixed(1).replace(".", ",")}%` : `${Math.round(v)}%`;
}

/* ---------- Animación de tablero de vuelos (split-flap) ---------- */
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
function tiles(texto) {
  return [...texto].map((c) => `<span class="flap" data-c="${esc(c)}">${esc(c)}</span>`).join("");
}
function letrasNombre(texto) {
  return [...texto].map((c) => (c === " " ? " " : `<span class="ch" data-c="${esc(c)}">${esc(c)}</span>`)).join("");
}
// Cada letra gira por letras al azar hasta detenerse en la correcta, de izquierda a derecha
function girar(selector, { base = 350, paso = 160, ritmo = 55 } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  app.querySelectorAll(selector).forEach((el, i) => {
    const final = el.dataset.c;
    const fin = performance.now() + base + i * paso;
    el.classList.add("girando");
    const t = setInterval(() => {
      if (performance.now() >= fin) {
        clearInterval(t);
        el.textContent = final;
        el.classList.remove("girando");
      } else {
        const l = LETRAS[Math.floor(Math.random() * LETRAS.length)];
        el.textContent = final === final.toLowerCase() ? l.toLowerCase() : l;
      }
    }, ritmo);
  });
}

function renderResultado(animar = true) {
  const x = estado.resultado[estado.elegido];
  const d = x.destino;
  const r = estado.r;
  const pais = paisActual();
  const nacional = d.codigoPais === r.pais;
  const total = estado.resultado.length;
  const excedeHoras = !!r.horas && d.horasVuelo > r.horas;
  const costo = [1, 2, 3, 4, 5].map((k) => `<span class="${k <= d.costo ? "" : "off"}">$</span>`).join("");
  const visaTexto = nacional ? "No aplica, es nacional"
    : r.pais !== "CL" ? "Revisa según tu pasaporte"
    : yaTienePermiso(d, r) ? "Ya la tienes"
    : esc(d.visaTexto) + (faltaPasaporte(d, r) ? ", requiere pasaporte" : "");
  const sinPasaporte = faltaPasaporte(d, r);
  estado.registro = registrarRecomendacion(r, x, estado.elegido + 1, estado.segundos);
  estado.vistoEn[estado.elegido] ||= Date.now();

  app.innerHTML = `
    <article class="gate" aria-label="Destino recomendado: ${esc(d.nombre)}, ${esc(d.pais)}">
    <div class="gate-head">
      <span class="pict" aria-hidden="true">${avion(20)}</span>
      <span>${estado.elegido === 0 ? "Tu destino" : "Alternativa"}</span>
      <span class="gate-match">${pctTxt(x)} de coincidencia</span>
    </div>
    <div class="gate-code" aria-hidden="true">${tiles(d.aeropuerto)}</div>
    <h2 class="dest-name" tabindex="-1" id="qtitle" aria-label="${esc(d.nombre)}"><span aria-hidden="true">${letrasNombre(d.nombre)}</span></h2>
    <div class="dest-country">${esc(d.pais)}${pais[2] ? `, saliendo desde ${esc(pais[3])} (${pais[2]})` : ""}</div>
  </article>
  <dl class="fields">
    <div class="field"><dt class="k">Mejor época</dt><dd class="v">${mesesTxt(d.meses)}</dd></div>
    ${r.pais === "CL"
      ? `<div class="field"><dt class="k">Vuelo desde Santiago</dt><dd class="v">${horasTxt(d.horasVuelo)}</dd></div>`
      : `<div class="field"><dt class="k">Región</dt><dd class="v">${esc(d.region)}</dd></div>`}
    <div class="field"><dt class="k">Clima</dt><dd class="v">${esc(d.clima)}</dd></div>
    ${campoClima(d, r)}
    <div class="field"><dt class="k">${r.pais === "CL" ? "Visa para chilenos" : "Visa"}</dt><dd class="v">${visaTexto}</dd></div>
    <div class="field"><dt class="k">Costo relativo</dt><dd class="v cost" aria-label="${d.costo} de 5">${costo}</dd></div>
    <div class="field"><dt class="k">Ideal para</dt><dd class="v">${cap(listaTxt([...d.idealPara].map((c) => CON_QUIEN[c])))}</dd></div>
  </dl>

  ${total > 1 ? `<div class="section alts">
    <h3>${estado.elegido === 0 ? "También podría gustarte" : "Tus otras opciones"}</h3>
    <div class="alt-board">
      ${estado.resultado.map((y, i) => i === estado.elegido ? "" : `<button class="alt-row" data-i="${i}">
        <span class="alt-code">${y.destino.aeropuerto}</span>
        <span class="alt-name">${esc(y.destino.nombre)}<small>${i === 0 ? "Tu destino recomendado" : esc(y.destino.pais) + (estado.elegido === 0 && y.porcentajeExacto === estado.resultado[0].porcentajeExacto ? ", empata con tu destino (elegimos el vuelo más corto)" : "")}</small></span>
        <span class="alt-pct">${pctTxt(y)}</span>
      </button>`).join("")}
    </div>
  </div>` : ""}

  ${estado.sinCandidatos ? `<p class="warnbox">Todavía no tenemos destinos cargados para esa opción, así que te mostramos el mejor match en todo el catálogo.</p>` : ""}
  ${excedeHoras ? `<p class="warnbox">Este destino supera las horas de vuelo que marcaste. Aparece porque calza muy bien en todo lo demás.</p>` : ""}
  ${sinPasaporte ? `<p class="warnbox">Para este destino necesitas pasaporte. En Chile se tramita en el Registro Civil; considera el tiempo de espera antes de comprar.</p>` : ""}
  ${r.edad === "menor" && !nacional ? `<p class="warnbox">Si eres menor de edad y no viajas con ambos padres, necesitas una autorización notarial para salir de Chile.</p>` : ""}

  <div class="section">
    <h3>Por qué te lo recomendamos</h3>
    <ul class="why">${razones(d, r, x.coincidencias).map((t) => `<li><span class="ic" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>${esc(t)}</span></li>`).join("")}</ul>
  </div>

  <div class="section">
    <h3>Antes de decidir</h3>
    <div class="pc">
      <div class="col good"><h4>Lo bueno</h4><ul>${d.pros.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="col bad"><h4>A considerar</h4><ul>${d.contras.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
    </div>
  </div>

  ${bloqueIngreso(d, r)}

  ${bloqueFuentes(d)}

  <div class="section feedback" id="fb"></div>

  <div class="actions">
    <button class="btn btn-primary btn-go btn-block" id="buy">Buscar pasajes a ${esc(d.nombre)}</button>
    <button class="btn-link" id="restart">Responder de nuevo</button>
  </div>

  <p class="why-one">Te recomendamos un destino y solo dos alternativas a propósito: comparar muchas opciones cansa y no ayuda a decidir. Ninguna aerolínea paga por aparecer aquí.</p>`;

  pintarFeedback();
  document.getElementById("buy").onclick = () => {
    actualizarRegistro(estado.registro, { abrio_compra: 1 });
    abrirCompra(d);
  };
  app.querySelectorAll(".alt-row").forEach((b) => (b.onclick = () => {
    estado.elegido = Number(b.dataset.i);
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    renderResultado(true);
    enfocarTitulo();
  }));
  if (animar) {
    girar(".gate-code .flap", { base: 450, paso: 260 });
    girar(".dest-name .ch", { base: 250, paso: 35, ritmo: 45 });
  }
  document.getElementById("restart").onclick = empezar;
}

/* ---------- Feedback: la etiqueta que aprenderá el Machine Learning ---------- */
const RESPUESTAS_IRIA = [
  { v: "si", label: "Sí, iría" },
  { v: "tal_vez", label: "Tal vez" },
  { v: "no", label: "No" },
];
const MOTIVOS = [
  { v: "caro", label: "Muy caro" },
  { v: "lejos", label: "Muy lejos" },
  { v: "estilo", label: "No es mi estilo" },
  { v: "ya_fui", label: "Ya lo conozco" },
  { v: "fechas", label: "No calza con mis fechas" },
  { v: "tramites", label: "Muchos trámites" },
  { v: "otro", label: "Otra razón" },
];

function pintarFeedback() {
  const caja = document.getElementById("fb");
  if (!caja) return;
  const f = (estado.feedback[estado.elegido] ||= {});
  const pideMotivo = f.iria && f.iria !== "si";
  const listo = f.iria === "si" || f.motivo;
  // Una vez respondida, la pregunta queda fija: no se puede cambiar la respuesta ni el motivo
  const fijo = (o, elegido) => boton(o, elegido).replace("<button ", `<button disabled aria-disabled="true" `);
  const botones = (lista, valor, bloqueado) => lista.map((o) => (bloqueado ? fijo(o, valor === o.v) : boton(o, false))).join("");
  const motivo = MOTIVOS.find((m) => m.v === f.motivo);

  caja.innerHTML = `
    <h3>¿Irías a este destino?</h3>
    <p class="q-hint">${f.iria ? "Tu respuesta quedó registrada." : "Responde una vez: tu respuesta, anónima, nos ayuda a mejorar las próximas recomendaciones."}</p>
    <div class="opts three fb-opts">${botones(RESPUESTAS_IRIA, f.iria, !!f.iria)}</div>
    ${pideMotivo ? `<h4 class="fb-sub">¿Qué no te convenció?</h4>
      ${motivo ? `<div class="fb-motivos">${fijo(motivo, true)}</div>` : `<div class="opts two fb-motivos">${botones(MOTIVOS, null, false)}</div>`}` : ""}
    ${listo ? `<p class="fb-thanks" role="status">Gracias, lo anotamos.${f.iria === "no" && estado.resultado.length > 1 ? " Revisa tus otras opciones más arriba." : ""}</p>` : ""}`;

  caja.querySelectorAll(".fb-opts .opt:not([disabled])").forEach((b) => (b.onclick = () => {
    if (f.iria) return;
    f.iria = b.dataset.v;
    const visto = estado.vistoEn && estado.vistoEn[estado.elegido];
    actualizarRegistro(estado.registro, { iria: f.iria, segundos_respuesta: visto ? Math.round((Date.now() - visto) / 1000) : "" });
    pintarFeedback();
  }));
  caja.querySelectorAll(".fb-motivos .opt:not([disabled])").forEach((b) => (b.onclick = () => {
    if (f.motivo) return;
    f.motivo = b.dataset.v;
    actualizarRegistro(estado.registro, { motivo: f.motivo });
    pintarFeedback();
  }));
}

/* ---------- Datos para el equipo ---------- */
function abrirPanelDatos() {
  const raiz = document.getElementById("sheetRoot");
  let confirmarBorrado = false;
  const dibujar = () => {
    const filas = leerDatos();
    const conRespuesta = filas.filter((f) => f.iria).length;
    const tiempos = tiemposDecision(filas);
    raiz.innerHTML = `
    <div class="overlay" id="ov">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="dataTitle">
        <h2 id="dataTitle" tabindex="-1">Datos del prototipo</h2>
        <p style="margin:0;color:var(--suave)">Recomendaciones mostradas en este navegador: <b>${filas.length}</b>. Con respuesta a "¿Irías?": <b>${conRespuesta}</b>.</p>
        <p style="margin:8px 0 0;color:var(--suave)">Tiempo para decidir: ${tiempos ? `promedio <b>${duracionTxt(tiempos.promedio)}</b>, mediana <b>${duracionTxt(tiempos.mediana)}</b> (${tiempos.n} ${tiempos.n === 1 ? "persona" : "personas"})` : "sin datos todavía"}.</p>
        <p class="fine">Cada fila guarda las respuestas del cuestionario, el destino recomendado, lo que la persona hizo después y los segundos que tardó. Son los datos con los que se entrenaría el modelo de Machine Learning. ${URL_HOJA ? "Además de este navegador, cada fila se envía a la Google Sheet del equipo, donde se juntan las respuestas de todos." : "Hoja compartida sin configurar: por ahora los datos quedan solo en este dispositivo (ver docs/google-sheets.md)."}</p>
        <div class="links">
          <button class="btn btn-primary btn-block" id="dl" ${filas.length ? "" : "disabled"}>Descargar CSV</button>
          <button class="btn btn-ghost btn-block" id="del" ${filas.length ? "" : "disabled"}>${confirmarBorrado ? "Toca de nuevo para borrar todo" : "Borrar datos"}</button>
        </div>
        <button class="btn-link" id="closeSheet">Cerrar</button>
      </div>
    </div>`;
    document.getElementById("dl").onclick = descargarCSV;
    document.getElementById("del").onclick = () => {
      if (confirmarBorrado) { borrarDatos(); confirmarBorrado = false; } else confirmarBorrado = true;
      dibujar();
    };
    document.getElementById("closeSheet").onclick = cerrar;
    document.getElementById("ov").onclick = (e) => { if (e.target.id === "ov") cerrar(); };
    document.getElementById("dataTitle").focus();
  };
  const cerrar = () => { raiz.innerHTML = ""; };
  document.onkeydown = (e) => { if (e.key === "Escape" && raiz.innerHTML) cerrar(); };
  dibujar();
}

/* ---------- Redirección a la compra ---------- */
function abrirCompra(d) {
  const raiz = document.getElementById("sheetRoot");
  const r = estado.r;
  const pais = paisActual();
  const origenes = r.pais === "CL" ? ORIGENES_CHILE : pais[2] ? [[pais[2], pais[3]]] : [];
  const deshabilitado = 'aria-disabled="true" style="pointer-events:none;opacity:.4"';

  const dibujar = (origen) => {
    const mismo = !!origen && origen === d.aeropuerto;
    const consulta = (origen ? `Vuelos de ${origen} a ${d.aeropuerto}` : `Vuelos a ${d.aeropuerto}`) + (mesesDe(r).length ? ` en ${MESES[mesesDe(r)[0] - 1]}` : "");
    const googleFlights = "https://www.google.com/travel/flights?q=" + encodeURIComponent(consulta);
    const skyscanner = origen ? `https://www.skyscanner.cl/transporte/vuelos/${origen.toLowerCase()}/${d.aeropuerto.toLowerCase()}/` : "";
    raiz.innerHTML = `
    <div class="overlay" id="ov">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <h2 id="sheetTitle" tabindex="-1">Pasajes a ${esc(d.nombre)}</h2>
        <p style="margin:0;color:var(--suave)">Te llevamos a un buscador de vuelos con la ruta ya cargada${mesesDe(r).length ? ` para ${MESES[mesesDe(r)[0] - 1]}${mesesDe(r).length > 1 ? " (puedes cambiar la fecha ahí)" : ""}` : ""}. La compra la haces directo con la aerolínea o agencia. Aeropuerto de llegada: ${d.aeropuerto}.</p>
        ${origenes.length ? `<label for="orig">¿Desde dónde sales?</label>
        <select id="orig">${origenes.map(([c, nombre]) => `<option value="${c}" ${c === origen ? "selected" : ""}>${nombre} (${c})</option>`).join("")}</select>` : ""}
        ${mismo ? `<p class="warnbox">Ya estás en ${esc(d.nombre)}. Elige otra ciudad de origen.</p>` : ""}
        <div class="links">
          <a class="btn btn-primary btn-block" ${mismo ? deshabilitado : ""} href="${googleFlights}" target="_blank" rel="noopener">Abrir en Google Flights</a>
          ${skyscanner ? `<a class="btn btn-ghost btn-block" ${mismo ? deshabilitado : ""} href="${skyscanner}" target="_blank" rel="noopener">Abrir en Skyscanner</a>` : ""}
        </div>
        <p class="fine">Prototipo: en la versión final, Fly4ward recibiría una comisión solo si compras por este enlace. Eso ocurre después de recomendarte el destino y nunca cambia qué destino te sugerimos.</p>
        <button class="btn-link" id="closeSheet">Cerrar</button>
      </div>
    </div>`;
    const selector = document.getElementById("orig");
    if (selector) selector.onchange = (e) => dibujar(e.target.value);
    document.getElementById("closeSheet").onclick = cerrar;
    document.getElementById("ov").onclick = (e) => { if (e.target.id === "ov") cerrar(); };
    (selector || document.getElementById("sheetTitle")).focus();
  };

  const cerrar = () => {
    raiz.innerHTML = "";
    document.getElementById("buy")?.focus();
  };
  document.onkeydown = (e) => { if (e.key === "Escape" && raiz.innerHTML) cerrar(); };

  let inicial = "";
  if (origenes.length) inicial = origenes[0][0] === d.aeropuerto && origenes[1] ? origenes[1][0] : origenes[0][0];
  dibujar(inicial);
}

/* ---------- Modo claro / oscuro ---------- */
const botonTema = document.getElementById("themeBtn");
const esOscuro = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};
const sincronizarTema = () => (botonTema.textContent = esOscuro() ? "Modo claro" : "Modo oscuro");
try {
  const guardado = localStorage.getItem("rumbo-theme");
  if (guardado) document.documentElement.dataset.theme = guardado;
} catch (e) {}
botonTema.onclick = () => {
  const siguiente = esOscuro() ? "light" : "dark";
  document.documentElement.dataset.theme = siguiente;
  try { localStorage.setItem("rumbo-theme", siguiente); } catch (e) {}
  sincronizarTema();
};
sincronizarTema();
document.getElementById("homeBtn").onclick = () => { estado.pantalla = "inicio"; render(); };

render();
