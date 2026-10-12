// Descarga dos fotos por destino desde Wikimedia Commons y guarda sus créditos.
// Se corre en GitHub Actions (.github/workflows/fotos.yml) porque necesita internet abierto.
//
// Para cada destino toma la imagen principal con licencia libre (JPG) del artículo de Wikipedia
// indicado en data/base/fotos-wiki.json (o de la lista de artículos, en orden; o un archivo de
// Commons si el valor parte con "File:"),
// la recorta a 960x540 en WebP y anota autor y licencia en data/fuentes/fotos.json.
// Solo vuelve a descargar las que cambiaron, así que se puede correr muchas veces.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const RAIZ = path.join(__dirname, "..");
const DESTINOS = require(path.join(RAIZ, "data/base/destinos-base.json"));
const MAPA = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/base/fotos-wiki.json"), "utf8"));
const SALIDA = path.join(RAIZ, "data/fuentes/fotos.json");
const CARPETA = path.join(RAIZ, "img/destinos");
const UA = "Fly4ward/1.0 (proyecto universitario FCFM; https://github.com/wesillo/proyecto-taller2)";
const ANCHO = 960;
const ALTO = 540;

const previo = fs.existsSync(SALIDA) ? JSON.parse(fs.readFileSync(SALIDA, "utf8")) : { fotos: {} };
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(host, params) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: "json", formatversion: "2", origin: "*", ...params });
  for (let intento = 0; intento < 3; intento++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.ok) return r.json();
    await espera(1500 * (intento + 1));
  }
  throw new Error(`API ${host} respondió con error`);
}

const sinHtml = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, " ").trim();

async function archivoDe(valor) {
  if (valor.startsWith("File:")) return valor.slice(5);
  const j = await api("en.wikipedia.org", { action: "query", redirects: "1", prop: "pageimages", piprop: "name", pilicense: "free", titles: valor });
  const p = j.query && j.query.pages && j.query.pages[0];
  if (!p || p.missing) throw new Error(`no existe el artículo "${valor}"`);
  if (!p.pageimage) throw new Error(`el artículo "${valor}" no tiene imagen libre`);
  return p.pageimage;
}

async function infoDe(archivo) {
  const j = await api("commons.wikimedia.org", { action: "query", titles: "File:" + archivo, prop: "imageinfo", iiprop: "url|extmetadata|mime|size", iiurlwidth: String(ANCHO * 2) });
  const p = j.query && j.query.pages && j.query.pages[0];
  const ii = p && p.imageinfo && p.imageinfo[0];
  if (!ii) throw new Error(`"${archivo}" no está en Wikimedia Commons`);
  const m = ii.extmetadata || {};
  return {
    url: ii.thumburl || ii.url,
    commons: ii.descriptionurl,
    mime: ii.mime,
    ancho: ii.width,
    alto: ii.height,
    autor: sinHtml(m.Artist && m.Artist.value) || "Autor desconocido",
    licencia: sinHtml(m.LicenseShortName && m.LicenseShortName.value) || "Licencia libre",
    licenciaUrl: (m.LicenseUrl && m.LicenseUrl.value) || "",
  };
}

// Una "ranura" por foto: la 1 sale de fotos-wiki.json y la 2 de fotos-wiki-2.json
const RANURAS = [
  { mapa: MAPA, sufijo: "", campo: "fotos", archivoMapa: "fotos-wiki.json" },
  { mapa: JSON.parse(fs.readFileSync(path.join(RAIZ, "data/base/fotos-wiki-2.json"), "utf8")), sufijo: "-2", campo: "fotos2", archivoMapa: "fotos-wiki-2.json" },
];

async function bajarRanura(r, evitar) {
  const fotos = {};
  const errores = [];
  for (const d of DESTINOS) {
    const valor = r.mapa[d.id];
    const nombre = `${d.id}${r.sufijo}.webp`;
    const destino = path.join(CARPETA, nombre);
    const antes = (previo[r.campo] || {})[d.id];
    const repetida = (a) => evitar && evitar[d.id] && evitar[d.id].nombreArchivo === a;
    if (!valor) { errores.push(`${d.id}: sin artículo en ${r.archivoMapa}`); continue; }
    const clave = JSON.stringify(valor);
    if (antes && JSON.stringify(antes.fuente) === clave && fs.existsSync(destino) && !repetida(antes.nombreArchivo)) { fotos[d.id] = antes; continue; }
    try {
      // Prueba cada artículo en orden y se queda con la primera foto JPG (descarta mapas, banderas y logos)
      // La segunda foto nunca repite el archivo de la primera
      let archivo = null, info = null;
      const motivos = [];
      for (const v of [].concat(valor)) {
        try {
          const a = await archivoDe(v);
          if (repetida(a)) { motivos.push(`${v}: misma foto que la primera`); continue; }
          const i = await infoDe(a);
          if (i.mime !== "image/jpeg") { motivos.push(`${v}: ${i.mime}`); continue; }
          archivo = a; info = i; break;
        } catch (e) { motivos.push(e.message); }
        await espera(200);
      }
      if (!info) throw new Error(motivos.join(" | "));
      const resp = await fetch(info.url, { headers: { "User-Agent": UA } });
      if (!resp.ok) throw new Error(`no se pudo descargar ${info.url}`);
      const buf = Buffer.from(await resp.arrayBuffer());
      await sharp(buf).rotate().resize(ANCHO, ALTO, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 68 }).toFile(destino);
      fotos[d.id] = { archivo: `img/destinos/${nombre}`, fuente: valor, nombreArchivo: archivo, ...info };
      delete fotos[d.id].url;
      console.log(`ok  ${nombre} ← ${archivo}`);
    } catch (e) {
      errores.push(`${d.id}${r.sufijo}: ${e.message}`);
      console.log(`ERR ${d.id}${r.sufijo}: ${e.message}`);
    }
    await espera(200);
  }
  return { fotos, errores };
}

const ordenar = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

async function main() {
  fs.mkdirSync(CARPETA, { recursive: true });
  const uno = await bajarRanura(RANURAS[0], null);
  const dos = await bajarRanura(RANURAS[1], uno.fotos);
  // Borra archivos que ya no corresponden a ninguna foto
  const usados = new Set([...Object.values(uno.fotos), ...Object.values(dos.fotos)].map((f) => path.basename(f.archivo)));
  for (const f of fs.readdirSync(CARPETA)) if (!usados.has(f)) fs.unlinkSync(path.join(CARPETA, f));
  const errores = [...uno.errores, ...dos.errores];
  fs.writeFileSync(SALIDA, JSON.stringify({
    fuente: "Wikimedia Commons",
    fechaCaptura: new Date().toISOString().slice(0, 10),
    total: Object.keys(uno.fotos).length + Object.keys(dos.fotos).length,
    errores,
    fotos: ordenar(uno.fotos),
    fotos2: ordenar(dos.fotos),
  }, null, 2) + "\n");
  console.log(`\n${Object.keys(uno.fotos).length} + ${Object.keys(dos.fotos).length} fotos, ${errores.length} errores`);
  errores.forEach((e) => console.log("  - " + e));
}

main().catch((e) => { console.error(e); process.exit(1); });
