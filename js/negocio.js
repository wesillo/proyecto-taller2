/*
 * Modelo de negocio de la etapa 1, en la app.
 *
 * 1. Cupón: cada destino que mostramos trae un código único (FLY-XXXXXX). Queda guardado en la
 *    hoja junto a la recomendación, así que cuando una agencia lo canjea (canje.html) sabemos que
 *    esa venta salió de Fly4ward. El cupón aparece después de recomendar: nunca cambia el destino.
 * 2. Correo opcional: la persona puede pedir que le enviemos su destino y su cupón. Dos semanas
 *    después le llega un correo corto preguntando si compró (seguimiento.html). Ese es el dato que
 *    falta para pasar de "buscó su vuelo" a "compró".
 * 3. Afiliados: cuando Skyscanner o Despegar aprueben la postulación, se pega aquí el link de
 *    seguimiento y la app lo usa sola. Mientras estén vacíos, los links van directo al sitio.
 *
 * Todo lo que cambia cuando se suma un socio está en NEGOCIO; no hay que tocar el resto del código.
 */

const NEGOCIO = {
  cupon: {
    descuento: "5%",     // lo que ofrecen las agencias asociadas
    diasValidez: 60,     // tiene que coincidir con DIAS_VALIDEZ en scripts/google-apps-script.gs
    // Agencias que ya aceptan el cupón: { nombre: "Agencia X", url: "https://..." }.
    // Vacío = el código se entrega igual, pero sin prometer un descuento todavía.
    agencias: [],
  },
  afiliados: {
    // Link de seguimiento de Impact para Skyscanner (algo como https://skyscanner.pxf.io/c/123/456/789).
    // La app le agrega ?u=<búsqueda> para llevar a la persona a la ruta exacta.
    skyscanner: "",
    // Link de afiliado de Despegar (paquetes y hoteles). Vacío = no se muestra el botón.
    despegar: "",
  },
  // Página pública de la app (para los links de los correos)
  urlApp: "https://wesillo.github.io/proyecto-taller2/",
};

// Sin letras ni números que se confundan al dictarlos (0/O, 1/I/L, U/V)
const ALFABETO_CUPON = "23456789ABCDEFGHJKMNPQRSTWXYZ";

function nuevoCupon() {
  const n = 6;
  let bytes;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) bytes = crypto.getRandomValues(new Uint8Array(n));
  else bytes = Array.from({ length: n }, () => Math.floor(Math.random() * 256));
  let s = "";
  for (const b of bytes) s += ALFABETO_CUPON[b % ALFABETO_CUPON.length];
  return "FLY-" + s;
}

const esCupon = (c) => new RegExp(`^FLY-[${ALFABETO_CUPON}]{6}$`).test(String(c || "").trim().toUpperCase());

// Fecha de vencimiento a partir de la fecha en que se mostró el destino
function venceCupon(fechaISO) {
  const f = new Date(fechaISO || Date.now());
  f.setDate(f.getDate() + NEGOCIO.cupon.diasValidez);
  return f;
}

const hayAgencias = () => NEGOCIO.cupon.agencias.length > 0;

// Pasa un link de búsqueda por el link de afiliado, si ya lo tenemos
function conAfiliado(base, url) {
  if (!base) return url;
  return base + (base.includes("?") ? "&" : "?") + "u=" + encodeURIComponent(url);
}

const correoValido = (c) => /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(String(c || "").trim()) && String(c).length <= 254;

if (typeof module !== "undefined") module.exports = { NEGOCIO, nuevoCupon, esCupon, venceCupon, conAfiliado, correoValido, ALFABETO_CUPON };
