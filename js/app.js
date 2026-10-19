/*
 * Interfaz de Fly4ward: preguntas, resultado y redirección a la compra.
 * Usa DESTINOS (data/destinos.js) y el motor de js/matching.js.
 */

// [valor guardado, descripción en español, descripción en inglés]. El nombre en inglés sale de TIPO_EN (matching.js)
const TIPOS = [
  ["Playa", "Sol y arena", "Sun and sand"],
  ["Cultura", "Museos, historia y arquitectura", "Museums, history and architecture"],
  ["Aventura", "Trekking, deportes y adrenalina", "Trekking, sports and adrenaline"],
  ["Naturaleza", "Paisajes, parques y senderos", "Landscapes, parks and trails"],
  ["Relax", "Descansar sin agenda", "Rest with no agenda"],
  ["Gastronomía", "Comer bien y probar la cocina local", "Eat well and try the local food"],
  ["Vida nocturna", "Bares, fiestas y salidas de noche", "Bars, parties and nights out"],
  ["Compras", "Tiendas, outlets y mercados", "Stores, outlets and markets"],
  ["Nieve", "Ski, frío y paisajes nevados", "Skiing, cold and snowy landscapes"],
  ["Vida silvestre", "Safaris, ballenas, pingüinos y más", "Safaris, whales, penguins and more"],
  ["Vino", "Viñas, catas y rutas del vino", "Vineyards, tastings and wine routes"],
  ["Cielos y estrellas", "Observatorios, cielos limpios y auroras", "Observatories, clear skies and auroras"],
];

// Ciudades de salida dentro de Chile para la búsqueda de vuelos
const ORIGENES_CHILE = [["SCL", "Santiago"], ["CCP", "Concepción"], ["ANF", "Antofagasta"], ["CJC", "Calama"], ["IQQ", "Iquique"], ["ARI", "Arica"], ["LSC", "La Serena"], ["ZCO", "Temuco"], ["PMC", "Puerto Montt"], ["PUQ", "Punta Arenas"]];

// Las preguntas con `mostrar` solo aparecen si se cumple la condición.
// Los textos van en pares [español, inglés]; T() elige según el idioma activo.
const PREGUNTAS = [
  { clave: "alcance", tipo: "alcance", titulo: ["¿Dónde quieres viajar?", "Where do you want to travel?"] },
  {
    // Preferencia, no filtro: el continente elegido suma puntos (ver puntaje en matching.js)
    clave: "continentes", tipo: "multiple", max: 3, exclusiva: "da_igual", mostrar: (r) => r.alcance !== "dentro",
    titulo: ["¿Qué parte del mundo te llama más?", "Which part of the world appeals to you most?"],
    ayuda: ["Elige hasta 3. Si otro lugar te calza mucho mejor, igual te lo mostramos.", "Choose up to 3. If another place suits you much better, we'll still show it to you."],
    opciones: [
      { v: "sudamerica", label: ["Sudamérica", "South America"], desc: ["Incluye la Antártica", "Includes Antarctica"] },
      { v: "norteamerica", label: ["Norteamérica", "North America"], desc: ["Estados Unidos, Canadá y México", "United States, Canada and Mexico"] },
      { v: "centro_caribe", label: ["Centroamérica y el Caribe", "Central America and the Caribbean"], desc: ["Costa Rica, Cuba, Punta Cana", "Costa Rica, Cuba, Punta Cana"] },
      { v: "europa", label: ["Europa", "Europe"], desc: ["España, Italia, los países nórdicos", "Spain, Italy, the Nordic countries"] },
      { v: "asia", label: ["Asia y Medio Oriente", "Asia and the Middle East"], desc: ["Japón, Tailandia, Dubái", "Japan, Thailand, Dubai"] },
      { v: "africa", label: ["África", "Africa"], desc: ["Marruecos, Egipto, safaris", "Morocco, Egypt, safaris"] },
      { v: "oceania", label: ["Oceanía", "Oceania"], desc: ["Australia, Nueva Zelanda, Tahití", "Australia, New Zealand, Tahiti"] },
      { v: "da_igual", label: ["Me da lo mismo", "I don't mind"], desc: ["Lo que mejor me calce", "Whatever suits me best"] },
    ],
  },
  {
    clave: "tags", tipo: "multiple", max: 3, titulo: ["¿Qué buscas en este viaje?", "What are you looking for on this trip?"],
    ayuda: ["Elige hasta 3. Es lo que más pesa en la recomendación.", "Choose up to 3. This weighs the most in the recommendation."],
    opciones: TIPOS.map(([v, es, en]) => ({ v, label: [v, TIPO_EN[v] || v], desc: [es, en] })),
  },
  {
    clave: "conQuien", tipo: "unica", titulo: ["¿Con quién viajas?", "Who are you traveling with?"], layout: "two",
    opciones: [
      { v: "S", label: ["Solo", "Alone"] },
      { v: "P", label: ["En pareja", "As a couple"] },
      { v: "F", label: ["En familia", "With family"] },
      { v: "A", label: ["Con amigos", "With friends"] },
    ],
  },
  {
    clave: "presupuesto", tipo: "monto", mostrar: (r) => r.pais === "CL",
    titulo: ["¿Cuánto quieres gastar en el pasaje?", "How much do you want to spend on the flight?"],
    ayuda: ["Ida y vuelta por persona, saliendo desde Santiago.", "Round trip per person, departing from Santiago, in Chilean pesos (CLP)."],
  },
  {
    clave: "ritmo", tipo: "unica", titulo: ["¿Qué ritmo quieres?", "What pace do you want?"],
    opciones: [
      { v: 1, label: ["Tranquilo", "Relaxed"], desc: ["Descansar y pasear sin apuro", "Rest and wander without rushing"] },
      { v: 3, label: ["Equilibrado", "Balanced"], desc: ["Un poco de todo", "A bit of everything"] },
      { v: 5, label: ["Intenso", "Intense"], desc: ["Caminatas largas y actividad física", "Long hikes and physical activity"] },
    ],
  },
  {
    // No cambia la recomendación: se guarda para el Machine Learning y para avisar a menores de edad
    clave: "edad", tipo: "unica", titulo: ["¿Cuántos años tienes?", "How old are you?"],
    ayuda: ["No cambia tu recomendación. Nos ayuda a mejorar las sugerencias con el tiempo.", "It doesn't change your recommendation. It helps us improve suggestions over time."], layout: "two",
    opciones: [
      { v: "menor", label: ["Menos de 18", "Under 18"] },
      { v: "18-24", label: ["18 a 24", "18 to 24"] },
      { v: "25-34", label: ["25 a 34", "25 to 34"] },
      { v: "35-49", label: ["35 a 49", "35 to 49"] },
      { v: "50-64", label: ["50 a 64", "50 to 64"] },
      { v: "65+", label: ["65 o más", "65 or older"] },
    ],
  },
  { clave: "meses", tipo: "meses", exclusiva: 0, titulo: ["¿En qué meses podrías viajar?", "Which months could you travel?"], ayuda: ["Elige uno o varios. Algunos destinos cambian mucho según la temporada.", "Choose one or more. Some destinations change a lot depending on the season."] },
  {
    clave: "docs", tipo: "multiple", mostrar: (r) => r.pais === "CL" && r.alcance !== "dentro",
    titulo: ["¿Qué documentos de viaje ya tienes?", "Which travel documents do you already have?"], ayuda: ["Marca todos los que tengas vigentes.", "Select all the valid ones you have."],
    exclusiva: "carnet",
    opciones: [
      { v: "pasaporte", label: ["Pasaporte", "Passport"], desc: ["Necesario fuera de Sudamérica", "Needed outside South America"] },
      { v: "esta", label: ["ESTA o visa de EE.UU.", "US ESTA or visa"], desc: ["También sirve para Puerto Rico", "Also valid for Puerto Rico"] },
      { v: "eta_ca", label: ["eTA o visa de Canadá", "Canadian eTA or visa"], desc: "" },
      { v: "eta_uk", label: ["ETA del Reino Unido", "UK ETA"], desc: "" },
      { v: "carnet", label: ["Solo carnet", "ID card only"], desc: ["No tengo pasaporte vigente", "I don't have a valid passport"] },
    ],
  },
  {
    clave: "visa", tipo: "unica", mostrar: (r) => r.pais === "CL" && r.alcance !== "dentro",
    titulo: ["¿Te complica hacer un trámite nuevo?", "Do you mind dealing with new paperwork?"], ayuda: ["Por ejemplo sacar pasaporte o pedir una visa que no tienes.", "For example, getting a passport or applying for a visa you don't have."],
    opciones: [
      { v: "ninguna", label: ["Prefiero sin trámites", "I'd rather avoid paperwork"], desc: ["Solo con lo que ya tengo", "Only with what I already have"] },
      { v: "online", label: ["Un trámite online está bien", "An online process is fine"], desc: ["Tipo ESTA, eTA o e-Visa", "Like an ESTA, eTA or e-Visa"] },
      { v: "da_igual", label: ["No me importa", "I don't mind"], desc: ["Hago lo que haga falta", "I'll do whatever it takes"] },
    ],
  },
  {
    clave: "estilo", tipo: "unica", titulo: ["¿Algo clásico o algo distinto?", "Something classic or something different?"],
    opciones: [
      { v: "clasico", label: ["Clásico y probado", "Classic and proven"], desc: ["Lugares que todos recomiendan", "Places everyone recommends"] },
      { v: "da_igual", label: ["Me da lo mismo", "I don't mind"], desc: ["Lo que mejor me calce", "Whatever suits me best"] },
      { v: "sorpresa", label: ["Sorpréndeme", "Surprise me"], desc: ["Algo menos conocido", "Something less well known"] },
    ],
  },
];

const estado = { pantalla: "inicio", paso: 0, r: { tags: [], pais: "CL" }, resultado: [], sinCandidatos: false, elegido: 0, feedback: {}, pagaria: "", registro: "" };
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
  estado.r = { tags: [], docs: [], meses: [], continentes: [], pais: estado.r.pais || "CL" };
  estado.inicio = Date.now(); // para medir cuánto tarda en decidir
  render();
  enfocarTitulo();
}

/* ---------- Inicio ---------- */
// Aviso de alcance del prototipo: vuelos, precios y visas están calculados para quien sale desde Chile
function notaOrigen() {
  const pais = paisDe(estado.r.pais || "CL");
  if (pais[0] === "CL") return `<p class="nota-origen" id="notaOrigen">${L("Fly4ward está afinado para quienes viajan desde Chile: horas de vuelo, precios de pasajes y visas calculados desde Santiago.", "Fly4ward is tuned for people traveling from Chile: flight times, ticket prices and visas are calculated from Santiago.")}</p>`;
  const desde = esc(pais[0] === "XX" ? L("otros países", "other countries") : paisNom(pais));
  return `<p class="nota-origen aviso" id="notaOrigen">${L(
    `<b>Desde ${desde} los resultados son referenciales.</b> En este prototipo los vuelos, precios y visas están calculados para quien sale desde Chile: armar la red completa de todos los países es el siguiente paso. Por eso no te preguntaremos presupuesto del pasaje ni trámites.`,
    `<b>From ${desde}, results are for reference only.</b> In this prototype, flights, prices and visas are calculated for people departing from Chile: building the full network for every country is the next step. That's why we won't ask about your flight budget or paperwork.`)}</p>`;
}

function renderInicio() {
  const muestra = ["CUZ", "LSC", "KEF", "PDL", "TBS"].map((i) => DESTINOS.find((d) => d.aeropuerto === i)).filter(Boolean);
  app.innerHTML = `
  <section class="hero">
    <h1>${L("Tu próximo destino, sin dar vueltas.", "Your next destination, no endless searching.")}</h1>
    <p class="lead">${L("Responde unas preguntas sobre tu viaje ideal y te indicamos un destino que calce contigo, con sus razones, lo bueno y lo que debes considerar.", "Answer a few questions about your ideal trip and we'll point you to a destination that suits you, with the reasons, the good parts and what to keep in mind.")}</p>
    <div class="origen">
      <label class="homesel" for="homeSel">${L("¿Desde qué país viajas?", "Which country are you traveling from?")}</label>
      <select id="homeSel" class="select">${PAISES.map((c) => `<option value="${c[0]}" ${c[0] === (estado.r.pais || "CL") ? "selected" : ""}>${esc(paisNom(c))}</option>`).join("")}</select>
      ${notaOrigen()}
    </div>
    <button class="btn btn-primary btn-go btn-block" id="start">${L("Encontrar mi destino", "Find my destination")}</button>
    <p class="note-small">${L("Preguntas cortas, sin registrarte.", "Short questions, no sign-up.")}</p>
    <details class="privacy">
      <summary>${L("Guardamos tus respuestas de forma anónima para mejorar las recomendaciones.", "We store your answers anonymously to improve the recommendations.")}</summary>
      <p>${L("No pedimos nombre, correo ni teléfono. Guardamos lo que respondes, el destino que te mostramos, si irías o no y cuánto tardaste en decidir. Lo usa solo el equipo de Fly4ward (proyecto universitario, FCFM, Universidad de Chile) para mejorar el sistema de recomendación. Además usamos Google Analytics para contar visitas en total (cuántas personas entran, desde qué país y con qué dispositivo), sin datos que te identifiquen.", "We don't ask for your name, email or phone number. We store your answers, the destination we showed you, whether you'd go and how long you took to decide. Only the Fly4ward team (a university project at FCFM, Universidad de Chile) uses it, to improve the recommendation system. We also use Google Analytics to count total visits (how many people come in, from which country and on which device), with no data that identifies you.")}</p>
    </details>
    <div class="board" aria-label="${L(`Algunos de los ${DESTINOS.length} destinos posibles`, `Some of the ${DESTINOS.length} possible destinations`)}">
      <div class="row head" aria-hidden="true"><span>${L("Código", "Code")}</span><span>${L("Destino", "Destination")}</span><span>${L("País", "Country")}</span></div>
      ${muestra.map((d) => `<div class="row"><span class="code">${d.aeropuerto}</span><span>${esc(tx(d, "nombre"))}</span><span class="status">${esc(tx(d, "pais"))}</span></div>`).join("")}
      <div class="row"><span class="code">???</span><span>${L("Tu destino", "Your destination")}</span><span class="status q">${L("Por confirmar", "To be confirmed")}</span></div>
    </div>
    <p class="note-small">${L(`${DESTINOS.length} destinos en Chile y en los 7 continentes. Horas de vuelo y visas calculadas para quien sale desde Chile`, `${DESTINOS.length} destinations in Chile and on all 7 continents. Flight times and visas calculated for people departing from Chile`)}${corte.fechaCorte ? L(`, con datos verificados al ${fechaTxt(corte.fechaCorte)}`, `, with data verified as of ${fechaTxt(corte.fechaCorte)}`) : ""}.</p>
    <button class="btn-link team-link" id="teamData">${L("Datos del prototipo (equipo)", "Prototype data (team)")}</button>
  </section>`;
  document.getElementById("start").onclick = empezar;
  document.getElementById("teamData").onclick = abrirPanelDatos;
  document.getElementById("homeSel").onchange = (e) => {
    estado.r.pais = e.target.value;
    if (estado.r.pais === "XX" && estado.r.alcance === "dentro") delete estado.r.alcance;
    document.getElementById("notaOrigen").outerHTML = notaOrigen();
  };
}

/* ---------- Preguntas ---------- */
function boton(o, presionado, extra = "") {
  return `<button class="opt ${extra}" aria-pressed="${presionado}" data-v="${esc(o.v)}">
    <span><span class="lbl">${esc(T(o.label))}</span>${T(o.desc) ? `<span class="desc">${esc(T(o.desc))}</span>` : ""}</span>
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
          { v: "fuera", label: L("Al extranjero", "Abroad"), desc: L("Fuera del país donde vivo", "Outside the country where I live") },
          { v: "da_igual", label: L("Me da lo mismo", "I don't mind"), desc: L("Lo que mejor me calce", "Whatever suits me best") },
        ]
      : [
          { v: "dentro", label: L(`Dentro de ${paisNom(pais)}`, `Within ${paisNom(pais)}`), desc: L("Conocer lo que tengo más cerca", "Explore what's closest to me") },
          { v: "fuera", label: L(`Fuera de ${paisNom(pais)}`, `Outside ${paisNom(pais)}`), desc: L("Salir al extranjero", "Go abroad") },
          { v: "da_igual", label: L("Me da lo mismo", "I don't mind"), desc: L("Lo que mejor me calce", "Whatever suits me best") },
        ];
    cuerpo = `<div class="opts">${opciones.map((o) => boton(o, r.alcance === o.v)).join("")}</div>`;
  } else if (p.tipo === "multiple") {
    const marcadas = r[p.clave] || [];
    cuerpo = `<div class="opts ${p.opciones.length > 5 ? "three" : "two"} chips">${p.opciones.map((o) => boton(o, marcadas.includes(o.v))).join("")}</div>`;
  } else if (p.tipo === "monto") {
    if (r.monto === undefined) { r.monto = 800000; r.presupuesto = r.monto; }
    const i = Math.max(0, PASOS_MONTO.indexOf(r.monto));
    cuerpo = `<div class="monto">
      <output class="monto-num" id="montoNum" for="montoSel">${montoTxt(r.monto)}</output>
      <span class="monto-pp">${L("ida y vuelta, por persona", "round trip, per person")}<span id="montoGrupo">${personasDe(r) > 1 ? ` (${totalGrupoTxt(r.monto, personasDe(r))})` : ""}</span></span>
      <input type="range" id="montoSel" class="monto-range" min="0" max="${PASOS_MONTO.length - 1}" step="1" value="${i}"
        aria-label="${L("Presupuesto para el pasaje, ida y vuelta por persona", "Flight budget, round trip per person")}" aria-valuetext="${montoTxt(r.monto)}" style="--p:${(i / (PASOS_MONTO.length - 1)) * 100}%">
      <div class="monto-ends" aria-hidden="true"><span>${montoTxt(PASOS_MONTO[0])}</span><span>${montoTxt(PASOS_MONTO[PASOS_MONTO.length - 1])}</span></div>
      <div class="monto-hint" id="montoHint" aria-live="polite">${alcanceMonto(r)}</div>
    </div>`;
  } else if (p.tipo === "meses") {
    const marcados = r.meses || [];
    cuerpo = `<div class="opts three">${MESES.map((m, i) => `<button class="opt month" aria-pressed="${marcados.includes(i + 1)}" data-v="${i + 1}">${cap(mesNom(i + 1))}</button>`).join("")}
      <button class="opt month wide" aria-pressed="${marcados.includes(0)}" data-v="0">${L("Aún no lo sé", "I don't know yet")}</button></div>`;
  } else {
    cuerpo = `<div class="opts ${p.layout === "two" ? "two" : ""}">${p.opciones.map((o) => boton(o, String(r[p.clave]) === String(o.v))).join("")}</div>`;
    // En familia o con amigos: cuántos son (para mostrar el costo del pasaje para todo el grupo)
    if (p.clave === "conQuien" && (r.conQuien === "F" || r.conQuien === "A")) {
      cuerpo += `<div class="personas">
        <span class="personas-lbl" id="personasLbl">${L("¿Cuántos son, contándote a ti?", "How many of you, including yourself?")}</span>
        <div class="stepper" role="group" aria-labelledby="personasLbl">
          <button class="step" id="menos" aria-label="${L("Una persona menos", "One person fewer")}" ${r.personas <= 2 ? "disabled" : ""}>−</button>
          <output class="step-num" id="personasNum" aria-live="polite">${r.personas}</output>
          <button class="step" id="mas" aria-label="${L("Una persona más", "One more person")}" ${r.personas >= MAX_PERSONAS ? "disabled" : ""}>+</button>
        </div>
      </div>`;
    }
  }

  // Siempre se avanza con "Continuar": elegir una opción solo la marca
  const multiple = p.tipo === "multiple" || p.tipo === "meses";
  const elegidas = multiple ? (r[p.clave] || []).length : 0;
  const contador = p.tipo === "meses"
    ? ((r.meses || []).includes(0) ? L("Sin fecha definida", "No date set") : L(`${elegidas} ${elegidas === 1 ? "mes" : "meses"}`, `${elegidas} ${elegidas === 1 ? "month" : "months"}`))
    : p.max ? L(`${elegidas} de ${p.max} elegidas`, `${elegidas} of ${p.max} selected`) : L(`${elegidas} ${elegidas === 1 ? "elegido" : "elegidos"}`, `${elegidas} selected`);
  const respondida = multiple ? elegidas > 0 : r[p.clave] !== undefined;
  const ultima = estado.paso === total - 1;
  app.innerHTML = `
    <div class="stepline"><span>${L(`Pregunta ${estado.paso + 1} de ${total}`, `Question ${estado.paso + 1} of ${total}`)}</span></div>
    <div class="progress" aria-hidden="true"><i style="width:${(estado.paso / total) * 100}%"></i></div>
    <h2 class="q-title" tabindex="-1" id="qtitle">${esc(T(p.titulo))}</h2>
    ${p.ayuda ? `<p class="q-hint">${esc(T(p.ayuda))}</p>` : ""}
    ${cuerpo}
    <div class="q-actions">
      <button class="btn-link" id="back">${estado.paso === 0 ? L("Volver al inicio", "Back to start") : L("Atrás", "Back")}</button>
      ${multiple ? `<span class="counter">${contador}</span>` : ""}
      <button class="btn btn-primary btn-go" id="next" ${respondida ? "" : "disabled"}>${ultima ? L("Ver mi destino", "See my destination") : L("Continuar", "Continue")}</button>
    </div>`;

  app.querySelectorAll(".opt").forEach((b) => (b.onclick = () => elegir(p, b.dataset.v)));
  document.getElementById("back").onclick = () => {
    if (estado.paso === 0) estado.pantalla = "inicio";
    else estado.paso--;
    render();
    enfocarTitulo();
  };
  const siguiente = document.getElementById("next");
  if (siguiente) siguiente.onclick = avanzar;
  const cambiarPersonas = (delta) => {
    r.personas = Math.min(MAX_PERSONAS, Math.max(2, r.personas + delta));
    renderPregunta();
    document.getElementById(delta > 0 ? "mas" : "menos")?.focus({ preventScroll: true });
  };
  const menos = document.getElementById("menos");
  if (menos) menos.onclick = () => cambiarPersonas(-1);
  const mas = document.getElementById("mas");
  if (mas) mas.onclick = () => cambiarPersonas(1);
  const barra = document.getElementById("montoSel");
  if (barra) {
    // Se actualiza en vivo sin redibujar la pantalla, para no cortar el arrastre
    barra.oninput = () => {
      r.monto = PASOS_MONTO[Number(barra.value)];
      r.presupuesto = r.monto;
      barra.setAttribute("aria-valuetext", montoTxt(r.monto));
      barra.style.setProperty("--p", `${(barra.value / (PASOS_MONTO.length - 1)) * 100}%`);
      document.getElementById("montoNum").textContent = montoTxt(r.monto);
      document.getElementById("montoGrupo").textContent = personasDe(r) > 1 ? ` (${totalGrupoTxt(r.monto, personasDe(r))})` : "";
      document.getElementById("montoHint").innerHTML = alcanceMonto(r);
    };
  }
}

// Personas que viajan: solo = 1, pareja = 2, familia o amigos = lo que indiquen (3 por defecto)
const MAX_PERSONAS = 10;
function personasPorDefecto(conQuien, previo, actual) {
  if (conQuien === "S") return 1;
  if (conQuien === "P") return 2;
  return (previo === "F" || previo === "A") && actual ? actual : 3; // al cambiar entre familia y amigos se mantiene el número
}
const personasDe = (r) => r.personas || (r.conQuien === "P" ? 2 : r.conQuien === "S" ? 1 : 1);
const totalGrupoTxt = (monto, n) => (n > 1 ? `${montoTxt(monto * n)}${monto >= MONTO_SIN_TOPE ? L(" o más", " or more") : ""} ${L("para", "for")} ${n === 2 && estado.r.conQuien === "P" ? L("los dos", "both of you") : L(`${n} personas`, `${n} people`)}` : "");

// Cuántos destinos calzan con el monto y algunos ejemplos de lo más lejos que alcanza
function alcanceMonto(r) {
  const pais = paisActual();
  let lista = DESTINOS.filter((d) => d.aeropuerto !== pais[2]);
  if (r.alcance === "dentro") lista = lista.filter((d) => d.codigoPais === r.pais);
  if (r.alcance === "fuera") lista = lista.filter((d) => d.codigoPais !== r.pais);
  // Si eligió continentes, la pista cuenta solo esos (la pregunta va antes que el presupuesto)
  const enContinente = lista.filter((d) => enContinenteElegido(d, r));
  const donde = continentesDe(r).length && enContinente.length ? ` ${L("en", "in")} ${esc(continentesTxt(r))}` : "";
  if (donde) lista = enContinente;
  const alcanza = lista.filter((d) => pasajeCalza(d, r));
  // Ejemplos: lo más lejos que alcanza (los pasajes más cercanos al monto), priorizando los conocidos
  const ejemplos = [...alcanza].sort((a, b) => precioPasaje(b) - precioPasaje(a)).slice(0, 12)
    .sort((a, b) => b.popularidad - a.popularidad).slice(0, 3).map((d) => tx(d, "nombre"));
  if (!alcanza.length) {
    const minimo = Math.min(...lista.map(precioPasaje));
    return L(`<b>No alcanza para ningún pasaje${donde}</b><span>El más económico parte en ~${montoTxt(minimo)} ida y vuelta.</span>`,
      `<b>Not enough for any ticket${donde}</b><span>The cheapest starts at ~${montoTxt(minimo)} round trip.</span>`);
  }
  const cuantos = alcanza.length === lista.length ? L("todos los", "all") : L(`${alcanza.length} de ${lista.length}`, `${alcanza.length} of ${lista.length}`);
  return L(`<b>Te alcanza el pasaje a ${cuantos} destinos${donde}</b>`, `<b>You can afford flights to ${cuantos} destinations${donde}</b>`)
    + (ejemplos.length ? `<span>${L("Por ejemplo", "For example")}: ${ejemplos.map(esc).join(" / ")}</span>` : "");
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
  const previo = r[p.clave];
  if (p.tipo === "alcance") r[p.clave] = valor;
  else r[p.clave] = p.opciones.find((o) => String(o.v) === valor).v;
  if (p.clave === "conQuien") r.personas = personasPorDefecto(r.conQuien, previo, r.personas);
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
  if (estado.r.presupuesto === undefined) delete estado.r.monto;
  estado.pantalla = "cargando";
  render();
  const { resultado, sinCandidatos } = recomendar(DESTINOS, estado.r);
  estado.resultado = resultado;
  estado.sinCandidatos = sinCandidatos;
  estado.elegido = 0;
  estado.feedback = {};
  estado.pagaria = "";
  estado.vistoEn = {};
  estado.pestana = null;
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
    <h2>${L(`Cruzando tu perfil con ${DESTINOS.length} destinos`, `Matching your profile with ${DESTINOS.length} destinations`)}</h2>
    <p>${L("Intereses, presupuesto, ritmo, compañía y temporada.", "Interests, budget, pace, company and season.")}</p>
  </section>`;
}

/* ---------- Corte de datos: fechas y vigencia ---------- */
const MESES_FECHA = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const corte = typeof CORTE_DATOS !== "undefined" ? CORTE_DATOS : { fechaCorte: null, vigenciaDias: {} };
function fechaTxt(iso) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-").map(Number);
  return EN() ? `${MESES_CORTOS_EN[m - 1]} ${d}, ${a}` : `${d} ${MESES_FECHA[m - 1]} ${a}`;
}
// ¿El dato superó su vigencia? (por ejemplo, una visa verificada hace más de 180 días)
function vencido(iso, tipo) {
  const dias = corte.vigenciaDias[tipo];
  if (!iso || !dias) return false;
  return (Date.now() - new Date(iso + "T12:00:00").getTime()) / 86400000 > dias;
}
const enlace = (url, texto) => (url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(texto)}</a>` : esc(texto));
const redondear = (n) => { const t = String(Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 10) / 10); return EN() ? t : t.replace(".", ","); };


/* ---------- Cómo llegar: vuelo desde Santiago + tramos por tierra o mar ---------- */
const PICTO = {
  vuelo: '<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>',
  bus: '<path fill-rule="evenodd" d="M6 2.5h12a2 2 0 0 1 2 2V16a2 2 0 0 1-1 1.7V20a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1.5H8V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-2.3A2 2 0 0 1 4 16V4.5a2 2 0 0 1 2-2zM6 6v5h12V6zm1.5 7.3a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zm9 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z"/>',
  tren: '<path fill-rule="evenodd" d="M7 2h10a3 3 0 0 1 3 3v10a3 3 0 0 1-2.2 2.9L19.5 21h-2.2l-1.4-3H8.1l-1.4 3H4.5l1.7-3.1A3 3 0 0 1 4 15V5a3 3 0 0 1 3-3zM6 6v4h12V6zm2 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>',
  auto: '<path fill-rule="evenodd" d="M5 11l1.6-4.5A2 2 0 0 1 8.5 5h7a2 2 0 0 1 1.9 1.5L19 11a2 2 0 0 1 2 2v4a1 1 0 0 1-1 1h-1v1.5a1.5 1.5 0 0 1-3 0V18H8v1.5a1.5 1.5 0 0 1-3 0V18H4a1 1 0 0 1-1-1v-4a2 2 0 0 1 2-2zm2.2 0h9.6l-1.1-3.3a1 1 0 0 0-.9-.7H9.2a1 1 0 0 0-.9.7zM6.5 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/>',
  barco: '<path fill-rule="evenodd" d="M11 2h2v3h4l1.5 6.5L21 12.5 18.8 18H5.2L3 12.5l2.5-1L7 5h4zM8.6 7l-1 4.2L12 9.8l4.4 1.4-1-4.2zM2 20c1.5 0 2.2-1 4-1s2.5 1 4 1 2.2-1 4-1 2.5 1 4 1 2.2-1 4-1v2c-1.5 0-2.2 1-4 1s-2.5-1-4-1-2.2 1-4 1-2.5-1-4-1-2.2 1-4 1z"/>',
  llegada: '<path fill-rule="evenodd" d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/>',
};
const MODO_TXT = { vuelo: ["Vuelo", "Flight"], bus: ["Bus", "Bus"], tren: ["Tren", "Train"], auto: ["Traslado", "Transfer"], barco: ["Barco", "Boat"] };

// Datos de llegada en el idioma activo (los nombres de lugares y notas vienen traducidos en d.en.llegada)
function llegadaDe(d) {
  const ll = d.llegada || { tramos: [] };
  const en = EN() && d.en && d.en.llegada;
  if (!en) return ll;
  return { ...ll, ciudadAeropuerto: en.ciudadAeropuerto || ll.ciudadAeropuerto, base: en.base || ll.base, otra: en.otra || ll.otra, tramos: ll.tramos.map((t, i) => ({ ...t, ...(en.tramos[i] || {}) })) };
}
const picto = (m) => `<span class="leg-pict" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">${PICTO[m]}</svg></span>`;
const duracion = (h) => { const t = Math.round((h * 60) / 5) * 5; const hh = Math.floor(t / 60), mm = t % 60; return hh ? `${hh} h${mm ? " " + String(mm).padStart(2, "0") : ""}` : `${mm} min`; };

// Tramos del viaje: primero el vuelo desde Santiago (datos de JAC y Google Flights), después los editoriales
function tramosViaje(d, r) {
  const ll = llegadaDe(d);
  const vuelo = [];
  if (r.pais === "CL" && d.codigoPais !== "XX") {
    const j = d.directoJac;
    const escalas = j ? L("Directo", "Nonstop") + (j.todoElAnio ? "" : L(`, de ${mesesTxt(j.mesesConVuelo).toLowerCase()}`, `, ${mesesTxt(j.mesesConVuelo)}`))
      : d.pasaje ? (d.pasaje.directo ? L("Directo", "Nonstop") : d.pasaje.escalas === 1 ? L("Con 1 escala", "1 stop") : d.pasaje.escalas && d.pasaje.escalas < 9 ? L(`Con ${d.pasaje.escalas} escalas`, `${d.pasaje.escalas} stops`) : L("Con escalas", "With stops")) : "";
    const aerolineas = j ? j.operadores.slice(0, 3) : d.pasaje && d.pasaje.aerolinea ? [d.pasaje.aerolinea] : [];
    vuelo.push({ modo: "vuelo", desde: "SCL", hasta: d.aeropuerto, codigo: true, detalle: L(`Santiago a ${ll.ciudadAeropuerto || d.nombre}`, `Santiago to ${ll.ciudadAeropuerto || tx(d, "nombre")}`), horas: d.horasVuelo, nota: [escalas, aerolineas.length ? L(`con ${listaTxt(aerolineas)}`, `with ${listaTxt(aerolineas)}`) : ""].filter(Boolean).join(", ") });
  }
  return [...vuelo, ...ll.tramos];
}

// ¿El aeropuerto de llegada está en otra ciudad? (ej. Torres del Paine se vuela a Puerto Natales)
function llegaPorOtraCiudad(d) {
  const c = d.llegada && d.llegada.ciudadAeropuerto;
  if (!c || !d.llegada.tramos.length) return false;
  const norm = (x) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return !norm(d.nombre).includes(norm(c).split(" (")[0]) && !norm(c).includes(norm(d.nombre));
}

function bloqueComoLlegar(d, r) {
  const ll = llegadaDe(d);
  const nombre = tx(d, "nombre");
  const tramos = tramosViaje(d, r);
  // Solo cuando hay que seguir por tierra, mar u otro vuelo: si el aeropuerto ES el destino, la ficha ya lo dice
  if (!ll.tramos.length) return "";
  // Marca de llegada al final de cada etapa ("grupo" = otro día)
  const marca = (nombre, etapa) => {
    const obligatorios = etapa.filter((t) => !t.opcional);
    const aire = obligatorios.filter((t) => t.modo === "vuelo").reduce((a, t) => a + t.horas, 0);
    const total = obligatorios.reduce((a, t) => a + t.horas, 0);
    const txt = !total ? "" : !aire ? L(`${duracion(total)} por tierra o mar.`, `${duracion(total)} by land or sea.`) : aire === total ? L("Todo el trayecto en avión.", "The whole way by plane.") : L(`${duracion(aire)} en el aire y ${duracion(total - aire)} por tierra o mar.`, `${duracion(aire)} in the air and ${duracion(total - aire)} by land or sea.`);
    return `<li class="leg llegada">${picto("llegada")}<div class="leg-main"><div class="leg-top"><span class="leg-route">${esc(nombre)}</span></div>${txt ? `<div class="leg-sub">${L("Llegaste.", "You're there.")} ${txt}</div>` : ""}</div></li>`;
  };
  let etapa = [];
  let primera = true;
  let horasPrimera = 0;
  const filas = tramos.map((t) => {
    if (t.grupo) {
      const m = marca(primera ? ll.base || nombre : etapa[etapa.length - 1].hasta, etapa);
      if (primera) horasPrimera = etapa.filter((x) => !x.opcional).reduce((a, x) => a + x.horas, 0);
      etapa = [];
      primera = false;
      return m + `<li class="leg-group">${esc(t.grupo)}</li>`;
    }
    etapa.push(t);
    const ruta = `${esc(t.desde)}<span class="arrow" aria-label="${L("a", "to")}">→</span>${esc(t.hasta)}`;
    return `<li class="leg ${t.modo}${t.opcional ? " opcional" : ""}">
        ${picto(t.modo)}
        <div class="leg-main">
          <div class="leg-top"><span class="leg-route${t.codigo ? " code" : ""}">${ruta}</span><span class="leg-time">${duracion(t.horas)}</span></div>
          <div class="leg-sub"><b>${T(MODO_TXT[t.modo])}${t.opcional ? L(" (opcional)", " (optional)") : ""}:</b> ${esc(t.detalle || "")}${t.detalle && t.nota ? ". " : ""}${esc(t.nota || "")}</div>
        </div>
      </li>`;
  }).join("");
  const final = marca(primera ? ll.base || nombre : etapa[etapa.length - 1].hasta, etapa);
  if (primera) horasPrimera = etapa.filter((x) => !x.opcional).reduce((a, x) => a + x.horas, 0);
  const desde = r.pais === "CL" ? L("Desde Santiago", "From Santiago") : L(`Desde el aeropuerto de ${ll.ciudadAeropuerto}`, `From ${ll.ciudadAeropuerto} airport`);
  return `
    <div class="route">
      <div class="route-head"><span>${desde} ${L("hasta", "to")} ${esc(ll.base || nombre)}</span><b>~${duracion(horasPrimera)}</b></div>
      <ol class="legs">${filas}${final}</ol>
      ${ll.otra ? `<p class="route-alt"><b>${L("Otra opción", "Another option")}:</b> ${esc(ll.otra)}</p>` : ""}
      <p class="src">${L("Tiempos aproximados, en movimiento y sin contar esperas ni conexiones. El vuelo sale de la JAC y Google Flights; los tramos por tierra o mar son una estimación del equipo: confirma horarios antes de viajar.", "Approximate travel times, not counting waits or connections. Flight data comes from the JAC (Chile's civil aviation board) and Google Flights; land and sea legs are the team's estimate: confirm schedules before you travel.")}</p>
    </div>`;
}

/* ---------- Resultado ---------- */
// Directo o con escalas: la JAC dice si hay ruta directa regular; si no, la foto de Google Flights
function subVuelo(d) {
  const j = d.directoJac;
  let t = "";
  if (j) t = j.todoElAnio ? L("directo todo el año", "nonstop all year") : L(`directo de ${mesesTxt(j.mesesConVuelo).toLowerCase()}`, `nonstop ${mesesTxt(j.mesesConVuelo)}`);
  else if (d.pasaje) t = d.pasaje.directo ? L("hay vuelo directo", "nonstop flight available") : d.pasaje.escalas === 1 ? L("con 1 escala", "1 stop") : d.pasaje.escalas && d.pasaje.escalas < 9 ? L(`con ${d.pasaje.escalas} escalas`, `${d.pasaje.escalas} stops`) : L("con escalas", "with stops");
  return t ? `<small class="v-sub">${t}</small>` : "";
}

// La ruta según la JAC: cuánta gente vuela directo desde Santiago y cuándo hay más demanda
function notaRuta(d, r) {
  const j = d.directoJac;
  if (!j || r.pais !== "CL") return "";
  const miles = EN()
    ? (j.pasajeros12m >= 1000000 ? `${Math.round(j.pasajeros12m / 100000) / 10} million` : j.pasajeros12m >= 1000 ? `${Math.round(j.pasajeros12m / 1000).toLocaleString("en-US")}k` : j.pasajeros12m)
    : (j.pasajeros12m >= 1000000 ? `${String(Math.round(j.pasajeros12m / 100000) / 10).replace(".", ",")} millones de` : j.pasajeros12m >= 1000 ? `${Math.round(j.pasajeros12m / 1000).toLocaleString("es-CL")} mil` : j.pasajeros12m);
  const elegidosAltos = mesesDe(r).filter((m) => j.temporadaAlta.includes(m));
  const alta = j.temporadaAlta.length
    ? elegidosAltos.length
      ? L(` ${cap(listaTxt(elegidosAltos.map(mesNom)))} ${elegidosAltos.length > 1 ? "son" : "es"} temporada alta de la ruta: los pasajes suelen subir y conviene comprar con anticipación.`,
          ` ${listaTxt(elegidosAltos.map(mesNom))} ${elegidosAltos.length > 1 ? "are" : "is"} high season on this route: fares tend to rise, so it's best to book early.`)
      : L(` La temporada alta de la ruta es ${j.temporadaAlta.length === 1 ? mesNom(j.temporadaAlta[0]) : mesesTxt(j.temporadaAlta).toLowerCase()}.`,
          ` High season on this route is ${j.temporadaAlta.length === 1 ? mesNom(j.temporadaAlta[0]) : mesesTxt(j.temporadaAlta)}.`)
    : "";
  const ciudad = esc((EN() && d.en && d.en.ciudadJac) || j.ciudad || tx(d, "nombre"));
  return `<p class="ruta-nota">${L(`<b>Ruta directa Santiago–${ciudad}:</b> ${miles} pasajeros en los últimos 12 meses, con ${esc(listaTxt(j.operadores))}.`, `<b>Nonstop route Santiago–${ciudad}:</b> ${miles} passengers in the last 12 months, with ${esc(listaTxt(j.operadores))}.`)}${alta} <span class="src">${L("Fuente: JAC.", "Source: JAC.")}</span></p>`;
}

function bloqueIngreso(d, r) {
  const ing = d.ingreso;
  if (!ing || d.codigoPais === r.pais) return "";
  const ingEn = EN() && d.en && d.en.ingreso ? d.en.ingreso : {};
  const datos = [
    ing.estadiaMaxDias ? L(`hasta ${ing.estadiaMaxDias} días`, `up to ${ing.estadiaMaxDias} days`) : "",
    ing.costoUSD ? L(`trámite ~US$ ${redondear(ing.costoUSD)}`, `fee ~US$ ${redondear(ing.costoUSD)}`) : ing.costoUSD === 0 ? L("sin costo", "free") : "",
    ing.soloCarnet ? L("entras con carnet", "ID card accepted") : L("requiere pasaporte", "passport required"),
  ].filter(Boolean).join(", ");
  return `
    <div class="req">
      <div class="req-top"><b>${yaTienePermiso(d, r) ? L("Ya tienes el permiso que se pide", "You already have the required permit") : esc(ingEn.texto || ing.texto)}</b>${datos ? `<span>${datos}</span>` : ""}</div>
      ${r.pais !== "CL" || EN() ? `<p class="warnbox" style="margin-top:6px">${L("Esta información es para pasaporte chileno. Revisa los requisitos para tu nacionalidad.", "This information is for Chilean passport holders. Check the requirements for your nationality.")}</p>` : ""}
      <p>${esc(ingEn.notas || ing.notas)}</p>
      <p class="src">${L("Fuente", "Source")}: ${enlace(ing.fuenteUrl, ing.fuenteNombre || L("Cancillería", "Chilean Foreign Ministry"))}, ${L("verificado el", "verified on")} ${fechaTxt(ing.fecha)}.${ing.confianza !== "alta" ? L(" <strong>Confírmalo antes de comprar.</strong>", " <strong>Confirm it before you buy.</strong>") : ""}</p>
      ${vencido(ing.fecha, "visa") ? `<p class="warnbox">${L(`Este dato tiene más de ${corte.vigenciaDias.visa} días: puede estar desactualizado.`, `This information is more than ${corte.vigenciaDias.visa} days old: it may be out of date.`)}</p>` : ""}
    </div>`;
}

// "Cómo llegar" y "Requisitos de entrada" en pestañas, para que el resultado no se vea tan cargado
function bloquePestanas(d, r) {
  const panes = [
    { id: "llegar", titulo: L("Cómo llegar", "Getting there"), html: bloqueComoLlegar(d, r) },
    { id: "requisitos", titulo: L("Requisitos de entrada", "Entry requirements"), corto: L("Requisitos", "Requirements"), html: bloqueIngreso(d, r) },
  ].filter((x) => x.html);
  if (!panes.length) return "";
  if (panes.length === 1) return `<div class="section"><h3>${panes[0].titulo}</h3>${panes[0].html}</div>`;
  const activa = panes.some((x) => x.id === estado.pestana) ? estado.pestana : panes[0].id;
  return `
  <div class="section tabs-wrap">
    <div class="tabs" role="tablist" aria-label="${L("Detalles del viaje", "Trip details")}">
      ${panes.map((x) => `<button class="tab" role="tab" id="tab-${x.id}" data-tab="${x.id}" aria-controls="panel-${x.id}" aria-selected="${x.id === activa}" tabindex="${x.id === activa ? 0 : -1}">${x.corto || x.titulo}</button>`).join("")}
    </div>
    ${panes.map((x) => `<div class="tab-panel" role="tabpanel" id="panel-${x.id}" aria-labelledby="tab-${x.id}" tabindex="0" ${x.id === activa ? "" : "hidden"}>${x.html}</div>`).join("")}
  </div>`;
}

function activarPestanas() {
  const tabs = [...app.querySelectorAll(".tab")];
  const elegir = (t, foco) => {
    estado.pestana = t.dataset.tab;
    for (const x of tabs) {
      const on = x === t;
      x.setAttribute("aria-selected", on);
      x.tabIndex = on ? 0 : -1;
      document.getElementById(`panel-${x.dataset.tab}`).hidden = !on;
    }
    if (foco) t.focus();
  };
  tabs.forEach((t, i) => {
    t.onclick = () => elegir(t, false);
    // Flechas para moverse entre pestañas con teclado
    t.onkeydown = (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      elegir(tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length], true);
    };
  });
}

// Clima en los meses elegidos: rango de temperaturas y lluvia (promedio mensual si son varios meses)
function campoClima(d, r) {
  const meses = mesesDe(r);
  const c = d.climaMensual;
  if (!meses.length || !c) return "";
  const min = Math.min(...meses.map((m) => c.tmin[m - 1]));
  const max = Math.max(...meses.map((m) => c.tmax[m - 1]));
  const lluvia = meses.reduce((t, m) => t + c.lluviaMm[m - 1], 0) / meses.length;
  const etiqueta = meses.length === 1 ? L(`En ${mesNom(meses[0])}`, `In ${mesNom(meses[0])}`) : L("En tus meses", "In your months");
  return `<div class="field"><dt class="k">${etiqueta}</dt><dd class="v">${L(`${redondear(min)} a ${redondear(max)} °C, ${redondear(lluvia)} mm de lluvia${meses.length > 1 ? " al mes" : ""}`, `${redondear(min)} to ${redondear(max)} °C, ${redondear(lluvia)} mm of rain${meses.length > 1 ? " per month" : ""}`)}</dd></div>`;
}

function bloqueFuentes(d) {
  const c = d.climaMensual;
  const u = d.ubicacion;
  return `
  <details class="fuentes">
    <summary>${L("Fuentes de esta recomendación", "Sources for this recommendation")}</summary>
    <ul>
      ${c ? `<li><b>${L("Clima", "Climate")}:</b> ${esc(c.lugar)}. ${enlace(c.fuenteUrl, c.fuenteNombre)}${c.periodo ? `, ${esc(c.periodo)}` : ""}. ${L("Capturado el", "Captured on")} ${fechaTxt(c.fecha)}.</li>` : ""}
      ${u ? `<li><b>${L("Distancia", "Distance")}:</b> ${L(`${u.distanciaKmDesdeSantiago.toLocaleString("es-CL")} km desde Santiago, calculada con las coordenadas del aeropuerto ${esc(d.aeropuerto)} (OurAirports).`, `${u.distanciaKmDesdeSantiago.toLocaleString("en-US")} km from Santiago, calculated from the coordinates of ${esc(d.aeropuerto)} airport (OurAirports).`)}</li>` : ""}
      ${d.ingreso && d.ingreso.fuenteUrl ? `<li><b>${L("Requisitos de entrada", "Entry requirements")}:</b> ${enlace(d.ingreso.fuenteUrl, d.ingreso.fuenteNombre)}, ${L("verificado el", "verified on")} ${fechaTxt(d.ingreso.fecha)}.</li>` : ""}
      ${d.pasaje
        ? `<li><b>${L("Pasaje", "Flight")}:</b> ${L(`tarifa típica ida y vuelta desde Santiago ~${montoTxt(d.pasaje.tipicoCLP)} (temporada baja ~${montoTxt(d.pasaje.bajaCLP || d.pasaje.tipicoCLP)}, alta ~${montoTxt(d.pasaje.altaCLP || d.pasaje.tipicoCLP)}), según`, `typical round-trip fare from Santiago ~${montoTxt(d.pasaje.tipicoCLP)} CLP (low season ~${montoTxt(d.pasaje.bajaCLP || d.pasaje.tipicoCLP)}, high ~${montoTxt(d.pasaje.altaCLP || d.pasaje.tipicoCLP)}), according to`)} ${enlace("https://www.google.com/travel/flights", "Google Flights")} ${L("el", "on")} ${fechaTxt(d.pasaje.fecha)}. ${L("Precios para 1 adulto en clase económica; cambian a diario.", "Prices for 1 adult in economy; they change daily.")}</li>`
        : `<li><b>${L("Pasaje", "Flight")}:</b> ${L("estimado según las horas de vuelo (no encontramos precio publicado).", "estimated from flight time (we couldn't find a published price).")}</li>`}
      ${d.directoJac ? `<li><b>${L("Ruta directa", "Nonstop route")}:</b> ${L(`pasajeros entre Santiago y ${esc(d.directoJac.aeropuertoJac)}, ${d.directoJac.periodo.desde} a ${d.directoJac.periodo.hasta}, según la`, `passengers between Santiago and ${esc(d.directoJac.aeropuertoJac)}, ${d.directoJac.periodo.desde} to ${d.directoJac.periodo.hasta}, according to Chile's`)} ${enlace("https://datos.gob.cl/dataset/trafico-aereo", L("Junta de Aeronáutica Civil (Tráfico Aéreo Mensual)", "Civil Aviation Board (Monthly Air Traffic)"))}.</li>` : ""}
      <li><b>${L("Ritmo, popularidad, tipo de experiencia y pros/contras", "Pace, popularity, type of experience and pros/cons")}:</b> ${L("estimación editorial del equipo.", "the team's editorial estimate.")}</li>
    </ul>
    ${corte.fechaCorte ? `<p class="src">${L("Corte de datos del catálogo", "Catalog data cut-off")}: ${fechaTxt(corte.fechaCorte)}.</p>` : ""}
  </details>`;
}

// Porcentaje de coincidencia: si dos opciones empatan al redondear, se muestra un decimal en todas
function pctTxt(y) {
  const enteros = estado.resultado.map((z) => Math.round(z.porcentajeExacto ?? z.porcentaje));
  const empate = new Set(enteros).size < enteros.length;
  const v = y.porcentajeExacto ?? y.porcentaje;
  return empate ? `${EN() ? v.toFixed(1) : v.toFixed(1).replace(".", ",")}%` : `${Math.round(v)}%`;
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

// Por qué el destino no está en el continente que eligió (lo más común: el presupuesto no alcanza)
function avisoContinente(d, r) {
  const lista = esc(continentesTxt(r));
  const enContinente = DESTINOS.filter((z) => enContinenteElegido(z, r) && z.codigoPais !== r.pais);
  if (r.monto && enContinente.length && !enContinente.some((z) => pasajeCalza(z, r))) {
    const minimo = Math.min(...enContinente.map(precioPasaje));
    return L(`Los pasajes a ${lista} parten en ~${montoTxt(minimo)} ida y vuelta, sobre tu presupuesto de ${montoTxt(r.monto)}.${pasajeCalza(d, r) ? " Por eso te recomendamos este, que sí calza." : ""}`,
      `Flights to ${lista} start at ~${montoTxt(minimo)} round trip, above your budget of ${montoTxt(r.monto)}.${pasajeCalza(d, r) ? " That's why we recommend this one, which does fit." : ""}`);
  }
  return L(`No está en ${lista}, pero es el que mejor te calza en todo lo demás.`, `It's not in ${lista}, but it's the best match for everything else.`);
}

// Fotos del destino (Wikimedia Commons) en un carrusel: se desliza con el dedo, con flechas y puntos.
// El crédito de abajo cambia según la foto visible. Si no hay fotos, no se muestra nada.
function creditoFoto(f) {
  const licencia = f.licenciaUrl ? `<a href="${esc(f.licenciaUrl)}" target="_blank" rel="noopener">${esc(f.licencia)}</a>` : esc(f.licencia);
  return `<span>${L("Foto", "Photo")}: <span class="autor" title="${esc(f.autor)}">${esc(f.autor)}</span></span><span>${licencia}</span><span><a href="${esc(f.fuenteUrl)}" target="_blank" rel="noopener">Wikimedia Commons</a></span>`;
}

function fotoDestino(d) {
  const fotos = d.fotos || [];
  if (!fotos.length) return "";
  const varias = fotos.length > 1;
  return `<figure class="dest-photo">
    <div class="ph-stage">
      <div class="ph-track" ${varias ? `tabindex="0" role="region" aria-roledescription="${L("carrusel", "carousel")}" aria-label="${L("Fotos de", "Photos of")} ${esc(tx(d, "nombre"))}"` : ""}>
        ${fotos.map((f, i) => `<img src="${esc(f.src)}" width="960" height="540" alt="${L(`Foto ${i + 1} de ${fotos.length}`, `Photo ${i + 1} of ${fotos.length}`)}: ${esc(tx(d, "nombre"))}, ${esc(tx(d, "pais"))}" decoding="async" ${i ? 'loading="lazy"' : ""}>`).join("")}
      </div>
      ${varias ? `<button class="ph-btn prev" type="button" aria-label="${L("Foto anterior", "Previous photo")}" hidden>${flecha("izq")}</button>
      <button class="ph-btn next" type="button" aria-label="${L("Foto siguiente", "Next photo")}">${flecha("der")}</button>
      <div class="ph-dots" aria-hidden="true">${fotos.map((_, i) => `<i class="${i ? "" : "on"}"></i>`).join("")}</div>` : ""}
    </div>
    <figcaption aria-live="polite">${creditoFoto(fotos[0])}</figcaption>
  </figure>`;
}

const flecha = (lado) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" aria-hidden="true"><path d="${lado === "izq" ? "M20 12H6M12 5l-7 7 7 7" : "M4 12h14M12 5l7 7-7 7"}"/></svg>`;

// Activa el carrusel: carga suave, flechas, puntos y crédito según la foto visible
function mostrarFoto(d) {
  const fig = app.querySelector(".dest-photo");
  if (!fig) return;
  const fotos = (d.fotos || []).slice();
  const track = fig.querySelector(".ph-track");
  const quitar = () => { fig.remove(); app.querySelector(".gate").classList.remove("con-foto"); };
  [...track.querySelectorAll("img")].forEach((img, i) => {
    const lista = () => img.classList.add("lista");
    if (img.complete && img.naturalWidth) lista();
    else {
      img.addEventListener("load", lista, { once: true });
      img.addEventListener("error", () => {
        // Si una foto no carga, se saca del carrusel; si no queda ninguna, se quita el bloque
        const k = [...track.children].indexOf(img);
        img.remove(); fotos.splice(k, 1);
        const punto = fig.querySelectorAll(".ph-dots i")[k];
        if (punto) punto.remove();
        if (!fotos.length) return quitar();
        if (fotos.length < 2) fig.querySelectorAll(".ph-btn, .ph-dots").forEach((e) => e.remove());
        actualizar();
      }, { once: true });
    }
  });
  const prev = fig.querySelector(".ph-btn.prev");
  const next = fig.querySelector(".ph-btn.next");
  const cap = fig.querySelector("figcaption");
  let actual = 0;
  const indice = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
  function actualizar() {
    const i = Math.min(indice(), fotos.length - 1);
    if (prev) prev.hidden = i === 0;
    if (next) next.hidden = i >= fotos.length - 1;
    fig.querySelectorAll(".ph-dots i").forEach((p, k) => p.classList.toggle("on", k === i));
    if (i !== actual) { actual = i; cap.innerHTML = creditoFoto(fotos[i]); }
  }
  const ir = (paso) => {
    const suave = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: (indice() + paso) * track.clientWidth, behavior: suave ? "smooth" : "auto" });
  };
  if (prev) prev.onclick = () => ir(-1);
  if (next) next.onclick = () => ir(1);
  let pendiente = false;
  track.addEventListener("scroll", () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pendiente = false; actualizar(); });
  }, { passive: true });
  track.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); ir(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); ir(-1); }
  });
}

function renderResultado(animar = true) {
  const x = estado.resultado[estado.elegido];
  const d = x.destino;
  const r = estado.r;
  const pais = paisActual();
  const nacional = d.codigoPais === r.pais;
  const total = estado.resultado.length;
  const fueraDeContinente = continentesDe(r).length > 0 && !enContinenteElegido(d, r);
  
  const nombre = tx(d, "nombre");
  const paisDest = tx(d, "pais");
  const visaTexto = nacional ? L("No aplica, es nacional", "Not applicable, it's domestic")
    : r.pais !== "CL" ? L("Revisa según tu pasaporte", "Check for your passport")
    : yaTienePermiso(d, r) ? L("Ya la tienes", "You already have it")
    : esc(tx(d, "visaTexto")) + (faltaPasaporte(d, r) ? L(", requiere pasaporte", ", passport required") : "");
  const sinPasaporte = faltaPasaporte(d, r);
  estado.registro = registrarRecomendacion(r, x, estado.elegido + 1, estado.segundos);
  estado.vistoEn[estado.elegido] ||= Date.now();

  app.innerHTML = `
    <article class="gate${(d.fotos || []).length ? " con-foto" : ""}" aria-label="${L("Destino recomendado", "Recommended destination")}: ${esc(nombre)}, ${esc(paisDest)}">
    <div class="gate-head">
      <span class="pict" aria-hidden="true">${avion(20)}</span>
      <span>${estado.elegido === 0 ? L("Tu destino", "Your destination") : L("Alternativa", "Alternative")}</span>
      <span class="gate-match">${pctTxt(x)} ${L("de coincidencia", "match")}</span>
    </div>
    <div class="gate-code" aria-hidden="true">${tiles(d.aeropuerto)}</div>
    <h2 class="dest-name" tabindex="-1" id="qtitle" aria-label="${esc(nombre)}"><span aria-hidden="true">${letrasNombre(nombre)}</span></h2>
    <div class="dest-country">${esc(paisDest)}${pais[2] ? L(`, saliendo desde ${esc(ciudadNom(pais))} (${pais[2]})`, `, departing from ${esc(ciudadNom(pais))} (${pais[2]})`) : ""}${llegaPorOtraCiudad(d) ? L(`<br>Vuelas a ${esc(llegadaDe(d).ciudadAeropuerto)} y sigues desde ahí`, `<br>You fly to ${esc(llegadaDe(d).ciudadAeropuerto)} and continue from there`) : ""}</div>
  </article>
  ${fotoDestino(d)}
  <dl class="fields">
    <div class="field"><dt class="k">${L("Mejor época", "Best time to go")}</dt><dd class="v">${mesesTxt(d.meses)}</dd></div>
    ${r.pais === "CL"
      ? `<div class="field"><dt class="k">${L("Vuelo desde Santiago", "Flight from Santiago")}</dt><dd class="v">${horasTxt(d.horasVuelo)}${subVuelo(d)}</dd></div>`
      : `<div class="field"><dt class="k">${L("Región", "Region")}</dt><dd class="v">${esc(tx(d, "region"))}</dd></div>`}
    <div class="field"><dt class="k">${L("Clima", "Climate")}</dt><dd class="v">${esc(tx(d, "clima"))}</dd></div>
    ${campoClima(d, r)}
    <div class="field"><dt class="k">${r.pais === "CL" ? L("Visa para chilenos", "Visa for Chileans") : "Visa"}</dt><dd class="v">${visaTexto}</dd></div>
${r.pais === "CL" ? `    <div class="field"><dt class="k">${L("Pasaje ida y vuelta", "Round-trip flight")}</dt><dd class="v">~${montoTxt(precioPasaje(d))}${EN() ? " CLP" : ""}<small class="v-sub">${personasDe(r) > 1 ? `${totalGrupoTxt(precioPasaje(d), personasDe(r))}, ` : ""}${d.pasaje ? L("precio típico, Google Flights", "typical price, Google Flights") : L("estimado", "estimated")}</small></dd></div>` : ""}
    <div class="field"><dt class="k">${L("Ideal para", "Ideal for")}</dt><dd class="v">${cap(listaTxt([...d.idealPara].map(conQuienTxt)))}</dd></div>
  </dl>
  ${notaRuta(d, r)}

  ${total > 1 ? `<div class="section alts">
    <h3>${estado.elegido === 0 ? L("También podría gustarte", "You might also like") : L("Tus otras opciones", "Your other options")}</h3>
    <div class="alt-board">
      ${estado.resultado.map((y, i) => i === estado.elegido ? "" : `<button class="alt-row" data-i="${i}">
        <span class="alt-code">${y.destino.aeropuerto}</span>
        <span class="alt-name">${esc(tx(y.destino, "nombre"))}<small>${i === 0 ? L("Tu destino recomendado", "Your recommended destination") : esc(tx(y.destino, "pais")) + (estado.elegido === 0 && y.porcentajeExacto === estado.resultado[0].porcentajeExacto ? L(", empata con tu destino (elegimos el vuelo más corto)", ", tied with your destination (we chose the shorter flight)") : "")}</small></span>
        <span class="alt-pct">${pctTxt(y)}</span>
      </button>`).join("")}
    </div>
  </div>` : ""}

  ${r.pais !== "CL" ? `<p class="warnbox">${L("Resultado referencial: en este prototipo los vuelos, precios y visas están calculados para quien sale desde Chile.", "Reference result: in this prototype, flights, prices and visas are calculated for people departing from Chile.")}</p>` : ""}
  ${estado.sinCandidatos ? `<p class="warnbox">${L("Todavía no tenemos destinos cargados para esa opción, así que te mostramos el mejor match en todo el catálogo.", "We don't have destinations for that option yet, so we're showing you the best match in the whole catalog.")}</p>` : ""}
  ${r.monto && !pasajeCalza(d, r) ? `<p class="warnbox">${L(`El pasaje sale ~${montoTxt(precioPasaje(d))} ida y vuelta, sobre tu presupuesto de ${montoTxt(r.monto)}. Aparece porque calza muy bien en todo lo demás.`, `The round-trip ticket costs ~${montoTxt(precioPasaje(d))}, above your budget of ${montoTxt(r.monto)}. It shows up because it matches everything else really well.`)}</p>` : ""}
  ${mesesSinDirecto(d, r).length && r.pais === "CL" ? `<p class="warnbox">${L(`En ${listaTxt(mesesSinDirecto(d, r).map(mesNom))} no hay vuelo directo desde Santiago (la ruta opera de ${mesesTxt(d.directoJac.mesesConVuelo).toLowerCase()}, según la JAC). Tendrías que volar con escala.`, `In ${listaTxt(mesesSinDirecto(d, r).map(mesNom))} there's no nonstop flight from Santiago (the route runs ${mesesTxt(d.directoJac.mesesConVuelo)}, according to the JAC). You'd have to fly with a stop.`)}</p>` : ""}
  ${fueraDeContinente ? `<p class="warnbox">${avisoContinente(d, r)}</p>` : ""}
  ${sinPasaporte ? `<p class="warnbox">${L("Para este destino necesitas pasaporte. En Chile se tramita en el Registro Civil; considera el tiempo de espera antes de comprar.", "You need a passport for this destination. In Chile it's issued by the Registro Civil; allow for the waiting time before you buy.")}</p>` : ""}
  ${r.edad === "menor" && !nacional ? `<p class="warnbox">${L("Si eres menor de edad y no viajas con ambos padres, necesitas una autorización notarial para salir de Chile.", "If you're under 18 and not traveling with both parents, you need a notarized authorization to leave Chile.")}</p>` : ""}

  <div class="section">
    <h3>${L("Por qué te lo recomendamos", "Why we recommend it")}</h3>
    <ul class="why">${razones(d, r, x.coincidencias).map((t) => `<li><span class="ic" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>${esc(t)}</span></li>`).join("")}</ul>
  </div>

  <div class="section">
    <h3>${L("Antes de decidir", "Before you decide")}</h3>
    <div class="pc">
      <div class="col good"><h4>${L("Lo bueno", "The good")}</h4><ul>${tx(d, "pros").map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="col bad"><h4>${L("A considerar", "Keep in mind")}</h4><ul>${tx(d, "contras").map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
    </div>
  </div>

  ${bloquePestanas(d, r)}

  ${bloqueFuentes(d)}

  <div class="section feedback" id="fb"></div>

  <div class="actions">
    <button class="btn btn-primary btn-go btn-block" id="buy">${L(`Buscar pasajes a ${esc(nombre)}`, `Search flights to ${esc(nombre)}`)}</button>
    <button class="btn-link" id="restart">${L("Responder de nuevo", "Start over")}</button>
  </div>

  <p class="why-one">${L("Te recomendamos un destino y solo dos alternativas a propósito: comparar muchas opciones cansa y no ayuda a decidir. Ninguna aerolínea paga por aparecer aquí.", "We recommend one destination and only two alternatives on purpose: comparing lots of options is tiring and doesn't help you decide. No airline pays to appear here.")}</p>`;

  pintarFeedback();
  activarPestanas();
  mostrarFoto(d);
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
  { v: "si", label: ["Sí, iría", "Yes, I'd go"] },
  { v: "tal_vez", label: ["Tal vez", "Maybe"] },
  { v: "no", label: ["No", "No"] },
];
const MOTIVOS = [
  { v: "caro", label: ["Muy caro", "Too expensive"] },
  { v: "lejos", label: ["Muy lejos", "Too far"] },
  { v: "estilo", label: ["No es mi estilo", "Not my style"] },
  { v: "ya_fui", label: ["Ya lo conozco", "I've already been"] },
  { v: "fechas", label: ["No calza con mis fechas", "Doesn't fit my dates"] },
  { v: "tramites", label: ["Muchos trámites", "Too much paperwork"] },
  { v: "otro", label: ["Otra razón", "Another reason"] },
];

// Validación de disposición a pagar: se pregunta una sola vez por persona (es sobre el servicio, no sobre el destino)
const RESPUESTAS_PAGARIA = [
  { v: "si", label: ["Sí", "Yes"] },
  { v: "tal_vez", label: ["Tal vez", "Maybe"] },
  { v: "no", label: ["No", "No"] },
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
  const pago = estado.pagaria;

  caja.innerHTML = `
    <h3>${L("¿Irías a este destino?", "Would you go to this destination?")}</h3>
    <p class="q-hint">${f.iria ? L("Tu respuesta quedó registrada.", "Your answer has been saved.") : L("Responde una vez, es anónimo y nos ayuda a mejorar.", "Answer once, it's anonymous and helps us improve.")}</p>
    <div class="opts three fb-opts">${botones(RESPUESTAS_IRIA, f.iria, !!f.iria)}</div>
    ${pideMotivo ? `<h4 class="fb-sub">${L("¿Qué no te convenció?", "What didn't convince you?")}</h4>
      ${motivo ? `<div class="fb-motivos">${fijo(motivo, true)}</div>` : `<div class="opts two fb-motivos">${botones(MOTIVOS, null, false)}</div>`}` : ""}
    ${listo ? `<div class="fb-pago">
      <h4 class="fb-sub">${L("¿Pagarías por un servicio de este tipo teniendo en cuenta que capta tu perfil real?", "Would you pay for a service like this, given that it captures your real profile?")}</h4>
      <div class="opts three fb-pagos">${botones(RESPUESTAS_PAGARIA, pago, !!pago)}</div>
    </div>` : ""}
    ${listo && pago ? `<p class="fb-thanks" role="status">${L("Gracias, lo anotamos.", "Thanks, we've noted it.")}${f.iria === "no" && estado.resultado.length > 1 ? L(" Revisa tus otras opciones más arriba.", " Check your other options above.") : ""}</p>` : ""}`;

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
  caja.querySelectorAll(".fb-pagos .opt:not([disabled])").forEach((b) => (b.onclick = () => {
    if (estado.pagaria) return;
    estado.pagaria = b.dataset.v;
    actualizarRegistro(estado.registro, { pagaria: estado.pagaria });
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
        <h2 id="dataTitle" tabindex="-1">${L("Datos del prototipo", "Prototype data")}</h2>
        <p style="margin:0;color:var(--suave)">${L("Recomendaciones mostradas en este navegador", "Recommendations shown in this browser")}: <b>${filas.length}</b>. ${L('Con respuesta a "¿Irías?"', 'With an answer to "Would you go?"')}: <b>${conRespuesta}</b>.</p>
        <p style="margin:8px 0 0;color:var(--suave)">${L("Tiempo para decidir", "Time to decide")}: ${tiempos ? L(`promedio <b>${duracionTxt(tiempos.promedio)}</b>, mediana <b>${duracionTxt(tiempos.mediana)}</b> (${tiempos.n} ${tiempos.n === 1 ? "persona" : "personas"})`, `average <b>${duracionTxt(tiempos.promedio)}</b>, median <b>${duracionTxt(tiempos.mediana)}</b> (${tiempos.n} ${tiempos.n === 1 ? "person" : "people"})`) : L("sin datos todavía", "no data yet")}.</p>
        <p class="fine">${L("Cada fila guarda las respuestas del cuestionario, el destino recomendado, lo que la persona hizo después y los segundos que tardó. Son los datos con los que se entrenaría el modelo de Machine Learning.", "Each row stores the questionnaire answers, the recommended destination, what the person did next and how many seconds it took. This is the data the Machine Learning model would be trained on.")} ${URL_HOJA && window.claude ? L("Esta copia corre dentro de Claude y no puede enviar datos a la Google Sheet: para recolectar respuestas usen el link de GitHub Pages.", "This copy runs inside Claude and can't send data to the Google Sheet: use the GitHub Pages link to collect answers.") : URL_HOJA ? L("Además de este navegador, cada fila se envía a la Google Sheet del equipo, donde se juntan las respuestas de todos.", "Besides this browser, each row is sent to the team's Google Sheet, where everyone's answers are collected.") : L("Hoja compartida sin configurar: por ahora los datos quedan solo en este dispositivo (ver docs/google-sheets.md).", "Shared sheet not set up: for now the data stays on this device only (see docs/google-sheets.md).")}</p>
        <div class="links">
          <button class="btn btn-primary btn-block" id="dl" ${filas.length ? "" : "disabled"}>${L("Descargar CSV", "Download CSV")}</button>
          <button class="btn btn-ghost btn-block" id="del" ${filas.length ? "" : "disabled"}>${confirmarBorrado ? L("Toca de nuevo para borrar todo", "Tap again to delete everything") : L("Borrar datos", "Delete data")}</button>
        </div>
        <button class="btn-link" id="closeSheet">${L("Cerrar", "Close")}</button>
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
    // Solo Skyscanner: tiene programa de afiliados (paga por cada persona que llega a comprar). Google Flights no paga comisión.
    const pasajeros = `?adultsv2=${personasDe(r)}&rtn=1`;
    const skyscanner = origen
      ? (EN() ? `https://www.skyscanner.net/transport/flights/${origen.toLowerCase()}/${d.aeropuerto.toLowerCase()}/${pasajeros}` : `https://www.skyscanner.cl/transporte/vuelos/${origen.toLowerCase()}/${d.aeropuerto.toLowerCase()}/${pasajeros}`)
      : (EN() ? `https://www.skyscanner.net/transport/flights-to/${d.aeropuerto.toLowerCase()}/` : `https://www.skyscanner.cl/transporte/vuelos-a/${d.aeropuerto.toLowerCase()}/`);
    raiz.innerHTML = `
    <div class="overlay" id="ov">
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <h2 id="sheetTitle" tabindex="-1">${L(`Pasajes a ${esc(tx(d, "nombre"))}`, `Flights to ${esc(tx(d, "nombre"))}`)}</h2>
        <p style="margin:0;color:var(--suave)">${L(
          `Te llevamos a Skyscanner con la ruta ya cargada${personasDe(r) > 1 ? ` para ${personasDe(r)} personas` : ""}${mesesDe(r).length ? `; ahí eliges las fechas (te recomendamos ${mesNom(mesesDe(r)[0])})` : ""}. Skyscanner compara aerolíneas y agencias, y la compra la haces directo con la que elijas. Aeropuerto de llegada: ${d.aeropuerto}.`,
          `We'll take you to Skyscanner with the route already loaded${personasDe(r) > 1 ? ` for ${personasDe(r)} people` : ""}${mesesDe(r).length ? `; pick your dates there (we recommend ${mesNom(mesesDe(r)[0])})` : ""}. Skyscanner compares airlines and agencies, and you buy directly from the one you choose. Arrival airport: ${d.aeropuerto}.`)}</p>
        ${origenes.length ? `<label for="orig">${L("¿Desde dónde sales?", "Where are you departing from?")}</label>
        <select id="orig">${origenes.map(([c, nombre]) => `<option value="${c}" ${c === origen ? "selected" : ""}>${nombre} (${c})</option>`).join("")}</select>` : ""}
        ${mismo ? `<p class="warnbox">${L(`Ya estás en ${esc(tx(d, "nombre"))}. Elige otra ciudad de origen.`, `You're already in ${esc(tx(d, "nombre"))}. Choose another departure city.`)}</p>` : ""}
        <div class="links">
          <a class="btn btn-primary btn-block" ${mismo ? deshabilitado : ""} href="${skyscanner}" target="_blank" rel="noopener">${L("Abrir en Skyscanner", "Open in Skyscanner")}</a>
        </div>
        <p class="fine">${L("Prototipo: en la versión final, Fly4ward recibiría una comisión de Skyscanner solo si llegas a comprar por este enlace, sin costo extra para ti. Eso ocurre después de recomendarte el destino y nunca cambia qué destino te sugerimos.", "Prototype: in the final version, Fly4ward would receive a commission from Skyscanner only if you end up buying through this link, at no extra cost to you. That happens after we recommend the destination and never changes which destination we suggest.")}</p>
        <button class="btn-link" id="closeSheet">${L("Cerrar", "Close")}</button>
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
const sincronizarTema = () => {
  botonTema.textContent = esOscuro() ? L("Modo claro", "Light mode") : L("Modo oscuro", "Dark mode");
  botonTema.setAttribute("aria-label", L("Cambiar entre modo claro y oscuro", "Switch between light and dark mode"));
};
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

/* ---------- Idioma (español / inglés) ---------- */
// Orden: ?lang=en o #en en la URL, lo que eligió antes en este navegador, idioma del navegador.
const botonIdioma = document.getElementById("langBtn");
function idiomaInicial() {
  const q = new URLSearchParams(location.search).get("lang") || (location.hash.match(/^#(es|en)$/) || [])[1];
  if (q === "en" || q === "es") return q;
  try {
    const g = localStorage.getItem("fly4ward-idioma");
    if (g === "en" || g === "es") return g;
  } catch (e) {}
  return /^es\b/i.test(navigator.language || "es") ? "es" : (navigator.language ? "en" : "es");
}
function aplicarIdioma(l) {
  setIdioma(l);
  document.documentElement.lang = IDIOMA;
  document.title = L("Fly4ward prototipo", "Fly4ward prototype");
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.content = L("Cuéntanos tu viaje perfecto y te recomendamos un solo destino, con lo bueno y lo que debes considerar.", "Tell us about your perfect trip and we'll recommend a single destination, with the good and what to keep in mind.");
  document.getElementById("homeBtn").setAttribute("aria-label", L("Volver al inicio de Fly4ward", "Back to Fly4ward home"));
  botonIdioma.textContent = EN() ? "ES" : "EN";
  botonIdioma.lang = EN() ? "es" : "en";
  botonIdioma.setAttribute("aria-label", EN() ? "Cambiar a español" : "Switch to English");
  sincronizarTema();
}
botonIdioma.onclick = () => {
  aplicarIdioma(EN() ? "es" : "en");
  try { localStorage.setItem("fly4ward-idioma", IDIOMA); } catch (e) {}
  document.getElementById("sheetRoot").innerHTML = "";
  render();
};
aplicarIdioma(idiomaInicial());

render();
