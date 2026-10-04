# Juntar los datos en una Google Sheet

Sin esto, cada respuesta queda guardada solo en el navegador de quien usó la app.
Con esto, todas las respuestas (de todos los celulares y computadores) llegan a una
misma hoja de cálculo del equipo. Toma unos 5 minutos y es gratis.

## 1. Crear la hoja

1. Entra a [sheets.new](https://sheets.new) con la cuenta de Google del equipo.
2. Ponle un nombre, por ejemplo **Fly4ward datos validación**.

## 2. Pegar el script

1. En la hoja: **Extensiones > Apps Script**.
2. Borra lo que aparece en el editor y pega todo el contenido de
   [`scripts/google-apps-script.gs`](../scripts/google-apps-script.gs).
3. Guarda (ícono de disquete o Ctrl+S).

## 3. Publicarlo como aplicación web

1. Arriba a la derecha: **Implementar > Nueva implementación**.
2. En el engranaje de "Seleccionar tipo", elige **Aplicación web**.
3. Configura:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
4. **Implementar**. Google pedirá autorizar el acceso a tus hojas: acepta
   (si aparece "Google no verificó esta app", entra a *Configuración avanzada > Ir a … (no seguro)*;
   es tu propio script).
5. Copia la **URL de la aplicación web**. Termina en `/exec`.

Para comprobar que funciona, abre esa URL en el navegador: debe decir
*"Fly4ward conectado. Filas guardadas: 0"*.

## 4. Conectar la app

En [`js/datos.js`](../js/datos.js), pega la URL entre las comillas:

```js
const URL_HOJA = "https://script.google.com/macros/s/XXXXXXXX/exec";
```

Haz commit a `main`; GitHub Pages se actualiza solo en un par de minutos.
(O pásale la URL a Claude y él la deja puesta.)

## Qué llega a la hoja

Una fila por destino mostrado (el principal y cada alternativa que la persona abre).
Cuando la persona responde "¿Irías?", el motivo, o abre la búsqueda de pasajes,
la misma fila se actualiza; no se duplica.

| Columna | Qué es |
|---|---|
| `segundos_decidir` | Segundos desde "Encontrar mi destino" hasta "Ver mi destino". Es la métrica **tiempo promedio en decidir**. |
| `segundos_respuesta` | Segundos desde que vio el destino hasta que respondió "¿Irías?". |
| `iria`, `motivo` | La respuesta de satisfacción y, si no fue "Sí", el motivo. |
| `abrio_compra` | 1 si apretó "Buscar pasajes". |
| `dispositivo` | `movil` o `escritorio` (según el ancho de pantalla). |
| `personas` | Cuántos viajan: 1 solo, 2 en pareja, o lo que indiquen en familia o con amigos. |
| `presupuesto` | Monto en pesos para el pasaje ida y vuelta por persona (desde la versión `fly4ward-2026-10b`). |

Para el promedio en la hoja, filtra `opcion = 1` (una vez por persona):
`=PROMEDIO.SI(D:D;1;Y:Y)` (D = opcion, Y = segundos_decidir).

## Privacidad

La app no pide nombre, correo ni teléfono, y lo avisa en la pantalla de inicio.
El `id` es un código al azar que cambia cada vez que alguien responde.

## Actualizar el script cuando la app agrega columnas

Si la app suma una columna nueva (como `personas`), pega otra vez el contenido de `scripts/google-apps-script.gs` en el editor y publica con **Implementar > Gestionar implementaciones > Editar > Nueva versión**. La URL no cambia y el script agrega solo el título que falta en la hoja. Mientras no lo actualices, todo sigue funcionando: la columna nueva simplemente no se guarda.

## Notas

- Si cambias el script, publica de nuevo con **Implementar > Gestionar implementaciones > Editar > Nueva versión**
  para mantener la misma URL.
- Los datos también siguen quedando en el navegador como respaldo, y el panel
  "Datos del prototipo (equipo)" los descarga en CSV.
- La versión que se ve dentro de Claude (artifact) no puede enviar datos a sitios
  externos: para validar con usuarios, usen el link de GitHub Pages.
