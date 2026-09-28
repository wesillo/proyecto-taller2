# Rumbo ✈️

**¿No sabes a dónde viajar?** Rumbo te hace unas preguntas cortas sobre tu viaje perfecto y te recomienda **un solo destino**, con lo bueno y lo que debes considerar. Sin listas eternas para comparar.

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

1. El usuario responde qué busca (presupuesto, tipo de experiencia, ritmo, con quién viaja, mes, horas de vuelo, visa).
2. Un sistema de **matching por atributos** cruza esas respuestas con 178 destinos y elige el que mejor calza.
3. Muestra **una recomendación** con las razones, pros y contras concretos.
4. Si el usuario quiere avanzar, lo lleva a Google Flights o Skyscanner con la ruta cargada.

**¿Por qué no Machine Learning todavía?** Sin datos reales de uso, un modelo no tiene de qué aprender. Partimos con reglas ponderadas y evolucionamos a ML cuando tengamos volumen de decisiones reales.

**Modelo de negocio:** la recomendación siempre es gratis y neutral. La comisión (CPA) solo aparece al redirigir a la compra, después de recomendar. El match no está a la venta; la redirección sí.

---

## Cómo está organizado

```
index.html              la página
css/styles.css          los estilos
js/matching.js          el motor de recomendación (puntajes y razones)
js/app.js               la interfaz (preguntas, resultado, compra)
data/destinos.js        la base de datos de 178 destinos
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
| Horas de vuelo y visa | Restan si no calzan |

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

### Para agregar un destino
Abre `data/destinos.js`. Arriba del archivo está explicado qué significa cada campo. Copia un destino parecido, cambia los datos y corre `npm test`: si falta algún campo o un valor está fuera de rango, la prueba te dice cuál. Si prefieres no tocar código, abre un **Issue** con la plantilla "Nuevo destino".

---

## Próximos pasos

- [ ] Botón "¿irías a este destino?" para medir si las recomendaciones funcionan
- [ ] Guardar respuestas y resultados en una base de datos (Appwrite o MongoDB Atlas)
- [ ] Más destinos y datos verificados de visas y temporadas
- [ ] Horas de vuelo y visas para usuarios de otros países
- [ ] Precios reales vía API de Amadeus (requiere un servidor)
- [ ] Fase 2: Machine Learning entrenado con los datos de uso reales

## Advertencia

Los datos de los destinos son referenciales y fueron curados a mano para el prototipo. Los requisitos de visa cambian: verificar siempre en [Cancillería](https://www.chile.gob.cl/) antes de viajar. Los enlaces de compra todavía no son enlaces de afiliado.
