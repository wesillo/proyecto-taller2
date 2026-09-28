/*
 * Interfaz de Rumbo: preguntas, resultado y redirección a la compra.
 * Usa DESTINOS (data/destinos.js) y el motor de js/matching.js.
 */

const TIPOS = [
  ["Playa", "🏖️", "Vera maricón"],
  ["Cultura", "🏛️", "Museos, historia y arquitectura"],
  ["Aventura", "🧗", "Trekking, deportes y adrenalina"],
  ["Naturaleza", "🌿", "Paisajes, parques y fauna"],
  ["Relax", "🧘", "Descansar sin agenda"],
  ["Gastronomía", "🍜", "Comer bien y probar la cocina local"],
  ["Vida nocturna", "🌃", "Bares, fiestas y salidas de noche"],
  ["Compras", "🛍️", "Tiendas, outlets y mercados"],
  ["Nieve", "❄️", "Ski, frío y paisajes nevados"],
];

// Ciudades de salida dentro de Chile para la búsqueda de vuelos
const ORIGENES_CHILE = [["SCL", "Santiago"], ["CCP", "Concepción"], ["ANF", "Antofagasta"], ["CJC", "Calama"], ["IQQ", "Iquique"], ["ARI", "Arica"], ["LSC", "La Serena"], ["ZCO", "Temuco"], ["PMC", "Puerto Montt"], ["PUQ", "Punta Arenas"]];

// Las preguntas con `mostrar` solo aparecen si se cumple la condición
const PREGUNTAS = [
  { clave: "alcance", tipo: "alcance", titulo: "¿Dónde quieres viajar?", ayuda: "Primero cuéntanos en qué país vives." },
  {
    clave: "tags", tipo: "multiple", max: 3, titulo: "¿Qué buscas en este viaje?", ayuda: "Elige hasta 3. Es lo que más pesa en la recomendación.",
    opciones: TIPOS.map(([v, e, desc]) => ({ v, label: v, e, desc })),
  },
  {
    clave: "presupuesto", tipo: "unica", titulo: "¿Cómo es tu presupuesto?", ayuda: "Pensando en pasajes, alojamiento y gastos en el destino.",
    opciones: [
      { v: 1.5, label: "Ajustado", desc: "Quiero que rinda al máximo", e: "🪙" },
      { v: 3, label: "Moderado", desc: "Ni muy barato ni de lujo", e: "💳" },
      { v: 4, label: "Cómodo", desc: "Puedo darme algunos gustos", e: "✨" },
      { v: 5, label: "Sin límite", desc: "Busco la mejor experiencia", e: "💎" },
    ],
  },
  {
    clave: "ritmo", tipo: "unica", titulo: "¿Qué ritmo quieres?",
    opciones: [
      { v: 1, label: "Tranquilo", desc: "Descansar y pasear sin apuro", e: "🐢" },
      { v: 3, label: "Equilibrado", desc: "Un poco de todo", e: "⚖️" },
      { v: 5, label: "Intenso", desc: "Caminatas largas y actividad física", e: "⛰️" },
    ],
  },
  {
    clave: "conQuien", tipo: "unica", titulo: "¿Con quién viajas?", layout: "two",
    opciones: [
      { v: "S", label: "Solo", e: "🎒" },
      { v: "P", label: "En pareja", e: "💞" },
      { v: "F", label: "En familia", e: "👨‍👩‍👧" },
      { v: "A", label: "Con amigos", e: "🍻" },
    ],
  },
  { clave: "mes", tipo: "meses", titulo: "¿En qué mes viajarías?", ayuda: "Algunos destinos cambian mucho según la temporada." },
  {
    clave: "horas", tipo: "unica", mostrar: (r) => r.pais === "CL" && r.alcance !== "dentro",
    titulo: "¿Cuántas horas de vuelo aguantas?", ayuda: "Aproximado desde Santiago, contando escalas.",
    opciones: [
      { v: 5, label: "Hasta 5 horas", desc: "Chile y países vecinos", e: "🛫" },
      { v: 12, label: "Hasta 12 horas", desc: "Sudamérica, Caribe y Norteamérica", e: "🌎" },
      { v: 99, label: "Lo que sea", desc: "Al otro lado del mundo si vale la pena", e: "🌏" },
    ],
  },
  {
    clave: "visa", tipo: "unica", mostrar: (r) => r.pais === "CL" && r.alcance !== "dentro",
    titulo: "¿Te complica tramitar una visa?",
    opciones: [
      { v: "ninguna", label: "Prefiero sin trámites", desc: "Solo con carnet o pasaporte", e: "🛂" },
      { v: "online", label: "Un trámite online está bien", desc: "Tipo ESTA, eTA o e-Visa", e: "💻" },
      { v: "da_igual", label: "No me importa", desc: "Hago lo que haga falta", e: "📄" },
    ],
  },
  {
    clave: "estilo", tipo: "unica", titulo: "¿Algo clásico o algo distinto?",
    opciones: [
      { v: "clasico", label: "Clásico y probado", desc: "Lugares que todos recomiendan", e: "⭐" },
      { v: "da_igual", label: "Me da lo mismo", desc: "Lo que mejor me calce", e: "🤷" },
      { v: "sorpresa", label: "Sorpréndeme", desc: "Algo menos conocido", e: "🧭" },
    ],
  },
];

const estado = { pantalla: "inicio", paso: 0, r: { tags: [], pais: "CL" }, resultado: [], sinCandidatos: false, elegido: 0 };
const app = document.getElementById("app");

const preguntasActivas = () => PREGUNTAS.filter((p) => !p.mostrar || p.mostrar(estado.r));
const paisActual = () => paisDe(estado.r.pais);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const bandera = (cc) => String.fromCodePoint(...[...cc].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
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
  estado.r = { tags: [], pais: estado.r.pais || "CL" };
  render();
  enfocarTitulo();
}

/* ---------- Inicio ---------- */
function renderInicio() {
  const muestra = ["CUZ", "LSC", "KEF", "PDL", "TBS"].map((i) => DESTINOS.find((d) => d.aeropuerto === i)).filter(Boolean);
  app.innerHTML = `
  <section class="hero">
    <h1>¿No sabes a dónde viajar?</h1>
    <p class="lead">Cuéntanos cómo sería tu viaje perfecto. Te damos un solo destino que calce contigo, con lo bueno y lo que debes considerar. Sin listas eternas para comparar.</p>
    <button class="btn btn-primary btn-block" id="start">Encontrar mi destino</button>
    <p class="note-small">Preguntas cortas, menos de un minuto.</p>
    <div class="board" aria-label="Algunos de los ${DESTINOS.length} destinos posibles">
      ${muestra.map((d) => `<div class="row"><span class="code">${d.aeropuerto}</span><span>${esc(d.nombre)}</span><span class="status">${esc(d.pais)}</span></div>`).join("")}
      <div class="row"><span class="code">???</span><span>Tu destino</span><span class="status q">Por confirmar</span></div>
    </div>
    <p class="note-small">${DESTINOS.length} destinos en Chile y en los 7 continentes. Horas de vuelo y visas calculadas para quien sale desde Chile.</p>
  </section>`;
  document.getElementById("start").onclick = empezar;
}

/* ---------- Preguntas ---------- */
function boton(o, presionado, extra = "") {
  return `<button class="opt ${extra}" aria-pressed="${presionado}" data-v="${esc(o.v)}">
    ${o.e ? `<span class="emo" aria-hidden="true">${o.e}</span>` : ""}
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
          { v: "fuera", label: "Al extranjero", desc: "Fuera del país donde vivo", e: "🌍" },
          { v: "da_igual", label: "Me da lo mismo", desc: "Lo que mejor me calce", e: "🤷" },
        ]
      : [
          { v: "dentro", label: `Dentro de ${pais[1]}`, desc: "Conocer lo que tengo más cerca", e: "🏠" },
          { v: "fuera", label: `Fuera de ${pais[1]}`, desc: "Salir al extranjero", e: "🌍" },
          { v: "da_igual", label: "Me da lo mismo", desc: "Lo que mejor me calce", e: "🤷" },
        ];
    cuerpo = `<label class="homesel" for="homeSel">Vivo en</label>
      <select id="homeSel" class="select">${PAISES.map((c) => `<option value="${c[0]}" ${c[0] === r.pais ? "selected" : ""}>${esc(c[1])}</option>`).join("")}</select>
      ${r.pais !== "CL" ? `<p class="q-hint" style="margin:10px 0 0">En este prototipo las horas de vuelo y las visas están calculadas desde Chile, así que esas preguntas no aparecerán.</p>` : ""}
      <div class="opts" style="margin-top:18px">${opciones.map((o) => boton(o, r.alcance === o.v)).join("")}</div>`;
  } else if (p.tipo === "multiple") {
    cuerpo = `<div class="opts three chips">${p.opciones.map((o) => boton(o, r.tags.includes(o.v))).join("")}</div>`;
  } else if (p.tipo === "meses") {
    cuerpo = `<div class="opts three">${MESES.map((m, i) => `<button class="opt month" aria-pressed="${r.mes === i + 1}" data-v="${i + 1}">${cap(m)}</button>`).join("")}
      <button class="opt month wide" aria-pressed="${r.mes === 0}" data-v="0">Aún no lo sé</button></div>`;
  } else {
    cuerpo = `<div class="opts ${p.layout === "two" ? "two" : ""}">${p.opciones.map((o) => boton(o, String(r[p.clave]) === String(o.v))).join("")}</div>`;
  }

  const conContinuar = p.tipo === "multiple";
  app.innerHTML = `
    <div class="stepline"><span>Pregunta ${estado.paso + 1} de ${total}</span></div>
    <div class="progress" aria-hidden="true"><i style="width:${(estado.paso / total) * 100}%"></i></div>
    <h2 class="q-title" tabindex="-1" id="qtitle">${esc(p.titulo)}</h2>
    ${p.ayuda ? `<p class="q-hint">${esc(p.ayuda)}</p>` : ""}
    ${cuerpo}
    <div class="q-actions">
      <button class="btn-link" id="back">${estado.paso === 0 ? "Volver al inicio" : "Atrás"}</button>
      ${conContinuar ? `<span class="counter">${r.tags.length} de 3 elegidas</span><button class="btn btn-primary" id="next" ${r.tags.length ? "" : "disabled"}>Continuar</button>` : ""}
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
  if (p.tipo === "multiple") {
    const i = r.tags.indexOf(valor);
    if (i >= 0) r.tags.splice(i, 1);
    else if (r.tags.length < p.max) r.tags.push(valor);
    else { r.tags.shift(); r.tags.push(valor); }
    renderPregunta();
    return;
  }
  if (p.tipo === "meses") r[p.clave] = Number(valor);
  else if (p.tipo === "alcance") r[p.clave] = valor;
  else r[p.clave] = p.opciones.find((o) => String(o.v) === valor).v;
  renderPregunta();
  setTimeout(avanzar, 180);
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

/* ---------- Resultado ---------- */
function renderResultado() {
  const x = estado.resultado[estado.elegido];
  const d = x.destino;
  const r = estado.r;
  const pais = paisActual();
  const nacional = d.codigoPais === r.pais;
  const total = estado.resultado.length;
  const excedeHoras = !!r.horas && d.horasVuelo > r.horas;
  const costo = [1, 2, 3, 4, 5].map((k) => `<span class="${k <= d.costo ? "" : "off"}">$</span>`).join("");
  const visaTexto = nacional ? "No aplica, es nacional" : r.pais === "CL" ? esc(d.visaTexto) : "Revisa según tu pasaporte";

  app.innerHTML = `
  <p class="result-intro">${estado.elegido === 0 ? "Según lo que nos contaste, tu destino es:" : `Opción ${estado.elegido + 1} de ${total}, por si la primera no te convence:`}</p>
  <article class="ticket" aria-label="Destino recomendado: ${esc(d.nombre)}, ${esc(d.pais)}">
    <div class="band"><span>Tarjeta de embarque</span><span>${estado.elegido === 0 ? "Tu destino" : "Alternativa"}</span></div>
    <div class="main">
      <div class="route">
        <div><div class="iata">${pais[2] || "···"}</div><div class="city">${esc(pais[3] || "Tu ciudad")}</div></div>
        <div class="mid" aria-hidden="true">${avion(22, 'style="transform:rotate(90deg)"')}</div>
        <div style="text-align:right"><div class="iata to">${d.aeropuerto}</div><div class="city">${esc(d.pais)}</div></div>
      </div>
      <h2 class="dest-name" tabindex="-1" id="qtitle">${esc(d.nombre)}</h2>
      <div class="dest-country"><span aria-hidden="true">${bandera(d.codigoPais)}</span> ${esc(d.pais)}</div>
      <div class="fields">
        <div class="field"><div class="k">Mejor época</div><div class="v">${mesesTxt(d.meses)}</div></div>
        ${r.pais === "CL"
          ? `<div class="field"><div class="k">Vuelo desde Santiago</div><div class="v">${horasTxt(d.horasVuelo)}</div></div>`
          : `<div class="field"><div class="k">Región</div><div class="v">${esc(d.region)}</div></div>`}
        <div class="field"><div class="k">Clima</div><div class="v">${esc(d.clima)}</div></div>
        <div class="field"><div class="k">${r.pais === "CL" ? "Visa para chilenos" : "Visa"}</div><div class="v">${visaTexto}</div></div>
        <div class="field"><div class="k">Costo relativo</div><div class="v cost" aria-label="${d.costo} de 5">${costo}</div></div>
        <div class="field"><div class="k">Ideal para</div><div class="v">${cap(listaTxt([...d.idealPara].map((c) => CON_QUIEN[c])))}</div></div>
      </div>
    </div>
    <div class="perf" aria-hidden="true"></div>
    <div class="stub">
      <div class="match"><b>${x.porcentaje}%</b><span>de coincidencia con tu viaje perfecto</span></div>
      <div class="barcode" aria-hidden="true"></div>
    </div>
  </article>

  ${estado.sinCandidatos ? `<p class="warnbox">Todavía no tenemos destinos cargados para esa opción, así que te mostramos el mejor match en todo el catálogo.</p>` : ""}
  ${excedeHoras ? `<p class="warnbox">Este destino supera las horas de vuelo que marcaste. Aparece porque calza muy bien en todo lo demás.</p>` : ""}

  <div class="section">
    <h3>Por qué te lo recomendamos</h3>
    <ul class="why">${razones(d, r, x.coincidencias).map((t) => `<li><span class="ic" aria-hidden="true">✓</span><span>${esc(t)}</span></li>`).join("")}</ul>
  </div>

  <div class="section">
    <h3>Antes de decidir</h3>
    <div class="pc">
      <div class="col good"><h4>Lo bueno</h4><ul>${d.pros.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="col bad"><h4>A considerar</h4><ul>${d.contras.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
    </div>
    <p class="disclaimer">Los requisitos de ingreso cambian. Verifica la información vigente en el sitio de Cancillería o del país antes de comprar.</p>
  </div>

  <div class="actions">
    <button class="btn btn-runway btn-block" id="buy">Buscar pasajes a ${esc(d.nombre)}</button>
    ${total > 1 ? `<button class="btn btn-ghost btn-block" id="other">${estado.elegido < total - 1 ? "Ver otra opción" : "Volver a la recomendación principal"}</button>` : ""}
    <button class="btn-link" id="restart">Responder de nuevo</button>
  </div>

  <p class="why-one">Te mostramos un destino a la vez a propósito: comparar muchas opciones cansa y no ayuda a decidir. Ninguna aerolínea paga por aparecer aquí.</p>`;

  document.getElementById("buy").onclick = () => abrirCompra(d);
  const otra = document.getElementById("other");
  if (otra) {
    otra.onclick = () => {
      estado.elegido = (estado.elegido + 1) % total;
      renderResultado();
      window.scrollTo({ top: 0, behavior: "smooth" });
      enfocarTitulo();
    };
  }
  document.getElementById("restart").onclick = empezar;
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
    const consulta = (origen ? `Vuelos de ${origen} a ${d.aeropuerto}` : `Vuelos a ${d.aeropuerto}`) + (r.mes ? ` en ${MESES[r.mes - 1]}` : "");
    const googleFlights = "https://www.google.com/travel/flights?q=" + encodeURIComponent(consulta);
    const skyscanner = origen ? `https://www.skyscanner.cl/transporte/vuelos/${origen.toLowerCase()}/${d.aeropuerto.toLowerCase()}/` : "";
    raiz.innerHTML = `
    <div class="overlay" id="ov">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <h2 id="sheetTitle" tabindex="-1">Pasajes a ${esc(d.nombre)}</h2>
        <p style="margin:0;color:var(--muted)">Te llevamos a un buscador de vuelos con la ruta ya cargada${r.mes ? ` para ${MESES[r.mes - 1]}` : ""}. La compra la haces directo con la aerolínea o agencia. Aeropuerto de llegada: ${d.aeropuerto}.</p>
        ${origenes.length ? `<label for="orig">¿Desde dónde sales?</label>
        <select id="orig">${origenes.map(([c, nombre]) => `<option value="${c}" ${c === origen ? "selected" : ""}>${nombre} (${c})</option>`).join("")}</select>` : ""}
        ${mismo ? `<p class="warnbox">Ya estás en ${esc(d.nombre)}. Elige otra ciudad de origen.</p>` : ""}
        <div class="links">
          <a class="btn btn-primary btn-block" ${mismo ? deshabilitado : ""} href="${googleFlights}" target="_blank" rel="noopener">Abrir en Google Flights</a>
          ${skyscanner ? `<a class="btn btn-ghost btn-block" ${mismo ? deshabilitado : ""} href="${skyscanner}" target="_blank" rel="noopener">Abrir en Skyscanner</a>` : ""}
        </div>
        <p class="fine">Prototipo: en la versión final, Rumbo recibiría una comisión solo si compras por este enlace. Eso ocurre después de recomendarte el destino y nunca cambia qué destino te sugerimos.</p>
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
