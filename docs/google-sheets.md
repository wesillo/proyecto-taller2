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
| `pagaria` | Respuesta a "¿Pagarías por un servicio de este tipo teniendo en cuenta que capta tu perfil real?": `si`, `tal_vez` o `no`. Se pregunta una vez por persona, después de "¿Irías?", y queda en la fila de la opción donde respondió. Desde la versión `fly4ward-2026-10e`. |
| `idioma` | Idioma en que la persona usó la app: `es` o `en`. Desde la versión `fly4ward-2026-10f`. |
| `cupon` | Código único que la app le entregó para ese destino (`FLY-XXXXXX`). Une la fila con las pestañas `correos` y `canjes`. Desde la versión `fly4ward-2026-10g`. |
| `pidio_correo` | `1` si pidió que le enviáramos ese destino por correo. |
| `dispositivo` | `movil` o `escritorio` (según el ancho de pantalla). |
| `personas` | Cuántos viajan: 1 solo, 2 en pareja, o lo que indiquen en familia o con amigos. |
| `presupuesto` | Monto en pesos para el pasaje ida y vuelta por persona (desde la versión `fly4ward-2026-10b`). |
| `continentes` | Continentes que prefiere, separados por `\|` (por ejemplo `europa\|asia`). Vacío si le da lo mismo o viaja dentro de su país. Desde la versión `fly4ward-2026-10d`. |
| `horas` | Ya no se pregunta desde la versión `fly4ward-2026-10d` (la reemplazó `continentes`); queda vacía para no correr las columnas antiguas. |

Para el promedio en la hoja, filtra `opcion = 1` (una vez por persona):
`=PROMEDIO.SI(D:D;1;Y:Y)` (D = opcion, Y = segundos_decidir).

## Cupones, correos y canjes (modelo de negocio, etapa 1)

Desde la versión `fly4ward-2026-10g` el script crea tres pestañas más:

| Pestaña | Qué guarda | Quién la llena |
|---|---|---|
| `correos` | Las personas que pidieron su destino por correo: correo, cupón, destino, si se envió el seguimiento, si compró (`si`, `aun_no`, `no`) y dónde. | La app y los correos de seguimiento |
| `agencias` | Las agencias asociadas: nombre, PIN (6 dígitos o más) y `activa` (escribe `no` para desactivarla). | **Ustedes**, a mano, cuando una agencia acepta el piloto |
| `canjes` | Cada cupón que una agencia canjeó: fecha, cupón, agencia, destino y monto de la venta. | La página `canje.html` |

**Para activar los correos** (una sola vez):

1. Pega el script nuevo y publica una nueva versión (ver más abajo). Google va a pedir permiso para **enviar correos como tú**: acéptalo. Los correos salen desde la cuenta dueña de la hoja, con el nombre "Fly4ward".
2. En el editor de Apps Script, elige la función `instalarSeguimiento` arriba y aprieta **▶ Ejecutar**. Eso crea las pestañas y un activador que todos los días a las 10:00 envía el correo de "¿Compraste?" a quienes pidieron su destino hace 14 días.

**Para sumar una agencia:**

1. Agrega una fila en la pestaña `agencias` con su nombre y un PIN.
2. En `js/negocio.js`, agrega la agencia a `NEGOCIO.cupon.agencias` (por ejemplo `{ nombre: "Viajes X", url: "https://viajesx.cl" }`). Desde ese momento la app muestra el descuento y dónde usarlo.
3. Mándale a la agencia el link `https://wesillo.github.io/proyecto-taller2/canje.html` y su PIN. Ahí escriben el código del cliente, ven si es válido y lo canjean.

**Los números que importan para el modelo:**

- Conversión a compra: en `correos`, filas con `compro = si` sobre las que respondieron.
- Ventas atribuidas a Fly4ward: filas de `canjes` (y la suma de `monto`).
- Para unir con las respuestas del cuestionario, busca el `cupon` en la pestaña `respuestas`.

Límites de Google: una cuenta Gmail gratis puede enviar unos 100 correos al día. El script envía como máximo 50 seguimientos diarios y 5 correos al día a una misma dirección.

## Privacidad

En la pestaña `respuestas` no hay nombre, correo ni teléfono, y la pantalla de inicio lo avisa.
El `id` es un código al azar que cambia cada vez que alguien responde.
El correo solo existe si la persona lo pide y marca la casilla de consentimiento. Queda en la pestaña `correos`, se usa solo para enviarle su destino y un seguimiento, y cada correo trae un enlace para no recibir más.

## Actualizar el script cuando la app agrega columnas

Si la app suma una columna nueva (como `personas`, `continentes`, `pagaria`, `idioma` o `cupon`), pega otra vez el contenido de `scripts/google-apps-script.gs` en el editor y publica con **Implementar > Gestionar implementaciones > Editar > Nueva versión**. La URL no cambia y el script agrega solo el título que falta en la hoja. Mientras no lo actualices, todo sigue funcionando: la columna nueva simplemente no se guarda.

## Notas

- Si cambias el script, publica de nuevo con **Implementar > Gestionar implementaciones > Editar > Nueva versión**
  para mantener la misma URL.
- Los datos también siguen quedando en el navegador como respaldo, y el panel
  "Datos del prototipo (equipo)" los descarga en CSV.
- La versión que se ve dentro de Claude (artifact) no puede enviar datos a sitios
  externos: para validar con usuarios, usen el link de GitHub Pages.
