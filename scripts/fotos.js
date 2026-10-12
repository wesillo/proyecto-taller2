// Descarga una foto por destino desde Wikimedia Commons y guarda sus créditos.
// Se corre en GitHub Actions (.github/workflows/fotos.yml) porque necesita internet abierto.
//
// Para cada destino toma la imagen principal con licencia libre del artículo de Wikipedia
// indicado en data/base/fotos-wiki.json (o un archivo de Commons si el valor parte con "File:"),
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

async function main() {
  fs.mkdirSync(CARPETA, { recursive: true });
  const fotos = {};
  const errores = [];
  for (const d of DESTINOS) {
    const valor = MAPA[d.id];
    const destino = path.join(CARPETA, `${d.id}.webp`);
    const antes = previo.fotos[d.id];
    if (!valor) { errores.push(`${d.id}: sin artículo en fotos-wiki.json`); continue; }
    if (antes && antes.fuente === valor && fs.existsSync(destino)) { fotos[d.id] = antes; continue; }
    try {
      const archivo = await archivoDe(valor);
      const info = await infoDe(archivo);
      const r = await fetch(info.url, { headers: { "User-Agent": UA } });
      if (!r.ok) throw new Error(`no se pudo descargar ${info.url}`);
      const buf = Buffer.from(await r.arrayBuffer());
      await sharp(buf).rotate().resize(ANCHO, ALTO, { fit: "cover", position: sharp.strategy.attention }).webp({ quality: 68 }).toFile(destino);
      fotos[d.id] = { archivo: `img/destinos/${d.id}.webp`, fuente: valor, nombreArchivo: archivo, ...info };
      delete fotos[d.id].url;
      console.log(`ok  ${d.id} ← ${archivo}`);
    } catch (e) {
      errores.push(`${d.id}: ${e.message}`);
      console.log(`ERR ${d.id}: ${e.message}`);
    }
    await espera(200);
  }
  // Borra fotos de destinos que ya no existen
  for (const f of fs.readdirSync(CARPETA)) if (!fotos[f.replace(/\.webp$/, "")]) fs.unlinkSync(path.join(CARPETA, f));
  const ordenado = Object.fromEntries(Object.keys(fotos).sort().map((k) => [k, fotos[k]]));
  fs.writeFileSync(SALIDA, JSON.stringify({ fuente: "Wikimedia Commons", fechaCaptura: new Date().toISOString().slice(0, 10), total: Object.keys(ordenado).length, errores, fotos: ordenado }, null, 2) + "\n");
  console.log(`\n${Object.keys(ordenado).length} fotos, ${errores.length} errores`);
  errores.forEach((e) => console.log("  - " + e));
}

main().catch((e) => { console.error(e); process.exit(1); });
