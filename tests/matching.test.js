// Pruebas del motor de recomendación. Se corren con: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const DESTINOS = require("../data/destinos.js");
const { recomendar, mesesTxt, razones } = require("../js/matching.js");

const TAGS_VALIDOS = ["Playa", "Cultura", "Aventura", "Naturaleza", "Relax", "Gastronomía", "Vida nocturna", "Compras", "Nieve"];

test("todos los destinos tienen los campos completos y válidos", () => {
  const vistos = new Set();
  for (const d of DESTINOS) {
    const donde = `(${d.nombre})`;
    assert.ok(d.nombre && d.pais && d.region, `faltan nombre, país o región ${donde}`);
    assert.match(d.codigoPais, /^[A-Z]{2}$/, `codigoPais inválido ${donde}`);
    assert.match(d.aeropuerto, /^[A-Z]{3}$/, `aeropuerto inválido ${donde}`);
    for (const campo of ["costo", "actividad", "popularidad"]) {
      assert.ok(Number.isInteger(d[campo]) && d[campo] >= 1 && d[campo] <= 5, `${campo} debe ser 1-5 ${donde}`);
    }
    assert.ok(d.horasVuelo > 0, `horasVuelo inválido ${donde}`);
    assert.ok(["N", "E"].includes(d.visa), `visa debe ser "N" o "E" ${donde}`);
    assert.ok(d.meses.length > 0 && d.meses.every((m) => m >= 1 && m <= 12), `meses inválidos ${donde}`);
    assert.ok(d.tags.length > 0 && d.tags.every((t) => TAGS_VALIDOS.includes(t)), `tags inválidos ${donde}`);
    assert.match(d.idealPara, /^[SPFA]+$/, `idealPara inválido ${donde}`);
    assert.equal(d.pros.length, 2, `deben ser 2 pros ${donde}`);
    assert.equal(d.contras.length, 2, `deben ser 2 contras ${donde}`);
    assert.ok(!vistos.has(d.nombre), `destino repetido ${donde}`);
    vistos.add(d.nombre);
  }
});

const base = { tags: ["Naturaleza", "Aventura"], presupuesto: 3, ritmo: 5, conQuien: "P", mes: 1, estilo: "da_igual", pais: "CL" };

test("siempre devuelve hasta 3 recomendaciones con porcentaje entre 0 y 99", () => {
  const { resultado } = recomendar(DESTINOS, { ...base, alcance: "da_igual", horas: 99, visa: "da_igual" });
  assert.equal(resultado.length, 3);
  for (const x of resultado) assert.ok(x.porcentaje >= 0 && x.porcentaje <= 99);
});

test("'dentro de Chile' solo recomienda destinos chilenos", () => {
  const { resultado } = recomendar(DESTINOS, { ...base, alcance: "dentro" });
  assert.ok(resultado.length > 0);
  for (const x of resultado) assert.equal(x.destino.codigoPais, "CL");
});

test("'fuera de Perú' nunca recomienda Perú y no repite país", () => {
  const { resultado } = recomendar(DESTINOS, { ...base, pais: "PE", alcance: "fuera" });
  const paises = resultado.map((x) => x.destino.codigoPais);
  assert.ok(!paises.includes("PE"));
  assert.equal(new Set(paises).size, paises.length);
});

test("respeta el límite de horas de vuelo cuando hay opciones que calzan", () => {
  const { resultado } = recomendar(DESTINOS, { ...base, alcance: "fuera", horas: 5, visa: "ninguna" });
  assert.ok(resultado[0].destino.horasVuelo <= 5);
});

test("'sin trámites' prioriza destinos sin visa", () => {
  const { resultado } = recomendar(DESTINOS, { ...base, tags: ["Cultura", "Compras"], alcance: "fuera", horas: 99, visa: "ninguna" });
  assert.equal(resultado[0].destino.visa, "N");
});

test("las razones mencionan lo que el usuario pidió", () => {
  const r = { ...base, alcance: "dentro" };
  const { resultado } = recomendar(DESTINOS, r);
  const texto = razones(resultado[0].destino, r, resultado[0].coincidencias).join(" ");
  assert.match(texto, /dentro de Chile/);
});

test("mesesTxt agrupa rangos que cruzan el año", () => {
  assert.equal(mesesTxt([11, 12, 1, 2, 3]), "Nov a mar");
  assert.equal(mesesTxt([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), "Todo el año");
});
