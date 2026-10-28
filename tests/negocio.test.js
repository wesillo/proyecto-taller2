const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { NEGOCIO, nuevoCupon, esCupon, venceCupon, conAfiliado, correoValido, ALFABETO_CUPON } = require("../js/negocio.js");

const gs = fs.readFileSync(path.join(__dirname, "../scripts/google-apps-script.gs"), "utf8");

test("los cupones tienen la forma FLY-XXXXXX y no se repiten", () => {
  const vistos = new Set();
  for (let i = 0; i < 2000; i++) {
    const c = nuevoCupon();
    assert.ok(esCupon(c), c);
    vistos.add(c);
  }
  assert.ok(vistos.size > 1990);
  assert.ok(!esCupon("FLY-0O1IL0"), "sin caracteres ambiguos");
  assert.ok(esCupon(" fly-2a3b4c ".replace("a", "A").replace("b", "B").replace("c", "C")));
});

test("la hoja valida los cupones con el mismo alfabeto y los mismos días que la app", () => {
  assert.ok(gs.includes(`/^FLY-[${ALFABETO_CUPON}]{6}$/`));
  assert.strictEqual(Number(gs.match(/const DIAS_VALIDEZ = (\d+);/)[1]), NEGOCIO.cupon.diasValidez);
});

test("vencimiento del cupón", () => {
  const v = venceCupon("2026-10-01T12:00:00Z");
  assert.strictEqual(v.toISOString().slice(0, 10), "2026-11-30");
});

test("links de afiliado: sin link se usa la búsqueda directa", () => {
  const url = "https://www.skyscanner.cl/transporte/vuelos/scl/fco/?adultsv2=2&rtn=1";
  assert.strictEqual(conAfiliado("", url), url);
  assert.strictEqual(conAfiliado("https://skyscanner.pxf.io/c/1/2/3", url), "https://skyscanner.pxf.io/c/1/2/3?u=" + encodeURIComponent(url));
  assert.ok(conAfiliado("https://x.io/a?b=1", url).startsWith("https://x.io/a?b=1&u="));
});

test("correos", () => {
  assert.ok(correoValido("ana@gmail.com"));
  assert.ok(correoValido(" ana.perez+viajes@uchile.cl "));
  assert.ok(!correoValido("ana@gmail"));
  assert.ok(!correoValido("ana gmail.com"));
  assert.ok(!correoValido(""));
});
