const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// datos.js usa localStorage solo dentro de funciones, así que se puede cargar en Node
const { COLUMNAS, tiemposDecision, duracionTxt } = require("../js/datos.js");

test("el script de Google Sheets usa las mismas columnas que la app", () => {
  const gs = fs.readFileSync(path.join(__dirname, "../scripts/google-apps-script.gs"), "utf8");
  const lista = JSON.parse(gs.match(/const COLUMNAS = (\[[^\]]*\]);/)[1]);
  assert.deepStrictEqual(lista, COLUMNAS);
});

test("tiempo para decidir: promedio y mediana una vez por sesión", () => {
  const filas = [
    { opcion: 1, segundos_decidir: 40 },
    { opcion: 2, segundos_decidir: 40 }, // alternativa de la misma sesión: no cuenta
    { opcion: 1, segundos_decidir: 60 },
    { opcion: 1, segundos_decidir: 110 },
    { opcion: 1, segundos_decidir: "" },
  ];
  assert.deepStrictEqual(tiemposDecision(filas), { n: 3, promedio: 70, mediana: 60 });
  assert.strictEqual(tiemposDecision([]), null);
  assert.strictEqual(duracionTxt(45), "45 s");
  assert.strictEqual(duracionTxt(72), "1 min 12 s");
  assert.strictEqual(duracionTxt(120), "2 min");
});
