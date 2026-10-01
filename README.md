# 4WARD

**¿No sabes a dónde viajar?** 4WARD te hace unas preguntas cortas sobre tu viaje perfecto y te recomienda **un solo destino**, con lo bueno y lo que debes considerar. Sin listas eternas para comparar.

Proyecto de Ingeniería Civil Industrial · FCFM, Universidad de Chile.

**App en línea:** https://wesillo.github.io/proyecto-taller2/

---

## El problema

Investigamos el transporte aéreo en Chile con entrevistas a pasajeros y operarios, una encuesta a 128 personas y revisión de literatura. Lo que encontramos:

- **El problema no es ser primerizo, es enfrentar un destino nuevo.** El 52,7% de quienes ya han viajado siente la misma inseguridad al elegir destino que en su primer viaje.
- **Buscar más no ayuda.** El 63% compara 3 o más opciones, y aun así el 49% termina estresado o "eligiendo cualquiera".
- **La confianza no sube de a poco.** El riesgo de abandonar la idea de viajar se mantiene entre 14% y 24% en cualquier nivel de familiaridad con el destino, y solo cae a 0% cuando lo conoce por completo.

**Usuario:** pasajero con experiencia de viaje que, frente a un destino que no conoce, no logra decidir con confianza.

## La solución

1. El usuario responde qué busca (presupuesto, tipo de experiencia, ritmo, con quién viaja, edad, mes, horas de vuelo, documentos que ya tiene y tolerancia a trámites).
2. Un sistema de **matching por atributos** cruza esas respuestas con 178 destinos y elige el que mejor calza.
3. Muestra **una recomendación** con las razones, pros y contras concretos.
4. Le pregunta **"¿Irías a este destino?"** y, si no, por qué. Esa respuesta es la etiqueta con la que se entrenará el Machine Learning.
5. Si el usuario quiere avanzar, lo lleva a Google Flights o Skyscanner con la ruta cargada.

**¿Por qué no Machine Learning todavía?** Sin datos reales de uso, un modelo no tiene de qué aprender. Partimos con reglas ponderadas y evolucionamos a ML cuando tengamos volumen de decisiones reales.

**Modelo de negocio:** la recomendación siempre es gratis y neutral. La comisión (CPA) solo aparece al redirigir a la compra, después de recomendar. El match no está a la venta; la redirección sí.

---

## Cómo está organizado

```
index.html              la página
css/styles.css          los estilos
js/matching.js          el motor de recomendación (puntajes y razones)
js/datos.js             registro de datos para el Machine Learning (CSV)
js/app.js               la interfaz (preguntas, resultado, compra)
data/destinos.js        catálogo de 178 destinos (GENERADO, no editar a mano)
data/base/              datos editoriales de cada destino
data/fuentes/           datos con fuente y fecha: visas, clima, aeropuertos, Banco Mundial
data/FUENTES.md         metodología del corte de datos y qué falta revisar
scripts/                script que construye el catálogo
tests/                  pruebas automáticas del motor
.github/workflows/      publica la app sola en cada cambio
.devcontainer/          configuración para programar en Codespaces
```

### Cómo funciona el puntaje

| Criterio | Puntos máximos |
|---|---|
| Tipo de experiencia (lo que más pesa) | 40 |
| Presupuesto | 20 |
| Ritmo / actividad física | 15 |
| Compañía de viaje | 10 |
| Temporada | 10 |
| Clásico o poco conocido | 8 |
| Horas de vuelo, visa y pasaporte | Restan si no calzan |

La edad **no** cambia el puntaje: se guarda como dato para el modelo y para avisar a menores de edad que necesitan autorización notarial. Si el usuario ya tiene la ESTA, la eTA de Canadá o la ETA del Reino Unido, esos destinos no se castigan por visa. Si solo tiene carnet, se priorizan los países a los que se entra sin pasaporte.

Los pesos están en `js/matching.js`. Si los cambian, corran `npm test` para verificar que todo sigue funcionando.

---

## Cómo trabajar en el proyecto

### Opción fácil: Codespaces (sin instalar nada)
1. En esta página, botón verde **Code → Codespaces → Create codespace on main**.
2. Espera a que cargue. La app se abre sola en una vista previa.
3. Edita, y la vista previa se actualiza al recargar.

### En tu computador
```bash
git clone https://github.com/wesillo/proyecto-taller2.git
cd proyecto-taller2
npm start      # abre la app en http://localhost:3000
npm test       # corre las pruebas
```
(También puedes abrir `index.html` directo con doble clic.)

### Para hacer un cambio
1. Crea una rama: `git checkout -b nombre-del-cambio`
2. Haz tus cambios y corre `npm test`
3. Sube la rama y abre un **Pull Request**
4. Otro integrante lo revisa y lo aprueba
5. Al unirlo a `main`, la app en línea se actualiza sola en 1 a 2 minutos

### Para agregar o cambiar un destino
1. Edita `data/base/destinos-base.json` (datos editoriales).
2. Agrega su clima en `data/fuentes/clima.json` y, si es un país nuevo, su requisito de ingreso en `data/fuentes/requisitos-ingreso.json`, siempre con URL de la fuente y fecha.
3. Corre `npm run catalogo` para regenerar `data/destinos.js` y luego `npm test`.

Si prefieres no tocar código, abre un **Issue** con la plantilla "Nuevo destino".

## El catálogo y su corte de datos

El catálogo no consulta datos en vivo: guarda una **foto fechada** de cada dato con su fuente (corte actual: 1 de octubre de 2026). Las visas están verificadas en sitios oficiales país por país, el clima mensual viene de servicios meteorológicos nacionales y las distancias se calculan con las coordenadas reales de cada aeropuerto. La app muestra la fuente y la fecha de cada dato, y avisa cuando un dato supera su vigencia. Lo que sigue siendo criterio del equipo (costo, ritmo, popularidad, pros y contras) está marcado como editorial. Todo el detalle está en [`data/FUENTES.md`](data/FUENTES.md).

---

## Próximos pasos

- [x] Pregunta "¿irías a este destino?" para medir si las recomendaciones funcionan
- [ ] Enviar los datos a una base de datos compartida (hoy se guardan en el navegador)
- [x] Visas verificadas en fuentes oficiales y clima mensual con fuente (corte 1 oct 2026)
- [ ] Revisar los datos de confianza media o baja listados en `data/FUENTES.md`
- [ ] Horas de vuelo y visas para usuarios de otros países
- [ ] Precios reales vía API de Amadeus (requiere un servidor)
- [ ] Fase 2: Machine Learning entrenado con los datos de uso reales

## Advertencia

Los requisitos de ingreso, el clima y las distancias tienen fuente y fecha de corte (ver `data/FUENTES.md`); el costo, el ritmo, la popularidad y los pros y contras son estimaciones del equipo. Los requisitos de visa cambian: verificar siempre en la fuente oficial antes de viajar. Los enlaces de compra todavía no son enlaces de afiliado.

## Datos para el Machine Learning

Cada destino mostrado guarda una fila con las respuestas del cuestionario, el destino y su puntaje, y lo que hizo la persona: si iría (`si`, `tal_vez`, `no`), el motivo si no, y si abrió la búsqueda de pasajes. Desde el inicio, el enlace **Datos del prototipo (equipo)** descarga todo como CSV.

Por ahora los datos quedan solo en el navegador donde se usó la app. Para juntar datos de muchas personas, el siguiente paso es enviar estas filas a una base de datos compartida.
