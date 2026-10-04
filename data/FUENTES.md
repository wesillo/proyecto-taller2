# Fuentes y metodología del catálogo de destinos

**Corte de datos: 2026-10-01.** Todos los datos con fuente se capturaron en esa fecha. La app muestra la fecha y la fuente de cada dato, y avisa cuando un dato supera su vigencia.

## Qué es un "corte de datos"

En vez de consultar visas, clima o precios en vivo (lo que requiere APIs pagadas y un servidor), el catálogo guarda una **foto fechada** de cada dato junto con su fuente. Cada tipo de dato tiene una vigencia: cuando se cumple, hay que volver a verificarlo.

| Tipo de dato | Vigencia | Por qué |
|---|---|---|
| Requisitos de ingreso (visas) | 180 días | Cambian seguido y equivocarse tiene consecuencias |
| Horas de vuelo y aeropuertos | 365 días | Cambian con rutas nuevas |
| Indicadores país (Banco Mundial) | 365 días | Se publican una vez al año |
| Precios de pasajes (Google Flights) | 90 días | Cambian a diario; sirven para comparar destinos |
| Rutas directas (JAC) | 365 días | La JAC publica mes a mes |
| Clima mensual | 3650 días | Son promedios de 30 años |

## De dónde sale cada campo

| Campo | Tipo | Fuente | Archivo |
|---|---|---|---|
| Requisito de ingreso para chilenos | **Verificado** | Sitio oficial del país de destino (migraciones, cancillería, portal eVisa/ETA) o Cancillería de Chile. Una URL por país. | `data/fuentes/requisitos-ingreso.json` |
| Clima mensual (máx., mín., lluvia) | **Fuente citada** | Servicios meteorológicos nacionales (DMC, SMN, INMET, SENAMHI, NOAA, AEMET, JMA, BOM...) directamente o a través de tablas climáticas que los citan. Una URL por destino. | `data/fuentes/clima.json` |
| Coordenadas y distancia desde Santiago | **Calculado** | Coordenadas de OurAirports; distancia ortodrómica (haversine) desde SCL. | `data/fuentes/aeropuertos.json` |
| Horas de vuelo | **Fuente** o estimado | Duración del itinerario más rápido en Google Flights (ver abajo); si no, estimación editorial. Nunca menor al mínimo físico de un vuelo directo: distancia / 880 km/h + 0,5 h. | `data/fuentes/precios-vuelos.json`, `data/base/destinos-base.json` |
| Pasaje ida y vuelta | **Fuente** | Foto de Google Flights (2 temporadas). Es lo que usa la barra de presupuesto. | `data/fuentes/precios-vuelos.json` |
| Nivel de precios y llegadas de turistas (por país) | **Fuente** | Banco Mundial: PA.NUS.PPP / PA.NUS.FCRF (2023) y ST.INT.ARVL (2019, último año previo a la pandemia). | `data/fuentes/banco-mundial.json` |
| Costo, actividad, popularidad, tipos de experiencia, ideal para, pros y contras | **Editorial** | Criterio del equipo. El costo se contrasta con un costo calculado (ver abajo). | `data/base/destinos-base.json` |

## Nivel de confianza

- **Requisitos de ingreso** (90 países): 74 alta, 15 media, 1 baja. "Alta" = confirmado en fuente oficial el día del corte. Cuando no es alta, la app le pide al usuario confirmarlo antes de comprar.
- **Clima** (193 destinos): 158 alta, 27 media, 8 baja. "Alta" = servicio meteorológico oficial o tabla que lo cita.

### Requisitos de ingreso con confianza media o baja (revisar primero)

| País | Requisito | Confianza | Nota |
|---|---|---|---|
| Emiratos Árabes Unidos | Sin visa (sello gratis) | media | Sello gratuito a la llegada: múltiples entradas, válido 6 meses, máx. 90 días en total. Acuerdo bilateral de supresión de visas (2017). |
| Antártica | Solo con operador autorizado | media | No hay visa ni control migratorio; el turismo se hace con operadores autorizados (Minrel, Ley 21.255). Si se parte de Argentina rigen sus requisitos. |
| Brasil | Sin visa (sirve cédula) | media | Cédula vigente basta (acuerdo Mercosur). Estadía de 90 días es referencial: no se pudo abrir la fuente brasileña. |
| Belice | Sin visa | media | Exentos para estadías de hasta 30 días (prorrogables en Inmigración). Pasaporte con 3 meses, pasaje de salida y fondos. |
| Costa Rica | Sin visa | media | Chile en Grupo 1: hasta 180 días. Pedirán pasaje de salida y medios económicos (US$100 por mes de estadía). |
| Cabo Verde | Visa requerida + registro EASE | baja | Chile NO está en la lista de exentos. Pre-registro EASE 5 días antes y tasa TSA 3.400 CVE (~US$35). Visa en frontera solo si no hay embajada. |
| Georgia | Sin visa | media | Hasta 1 año sin visa (no confirmado en sitio oficial georgiano). Desde 1-ene-2026 es obligatorio seguro médico de viaje. |
| Honduras | Sin visa | media | Chile exento de visa según manual unificado CA-4 (no hallado en sitio hondureño). 90 días compartidos en la región CA-4. |
| Indonesia | Visa a la llegada / e-VOA | media | e-VOA online o VOA en aeropuerto: IDR 500.000 (~USD 30), 30 días prorrogables 30 más. Lista oficial de países no accesible. |
| Camboya | e-Visa o visa a la llegada | media | e-Visa solo en evisa.gov.kh (puede haber cargo extra). Pasaporte 6 meses. e-Arrival Card obligatoria 7 días antes (desde 2025). |
| Laos | Visa a la llegada o e-Visa | media | Chile elegible para e-Visa (laoevisa.gov.la, ~3 días hábiles, solo ciertos pasos). 30 días, prorrogable. Tarifa no confirmada. |
| Marruecos | Sin visa | media | Chilenos exentos de visa de turismo. Estadía de 90 días según fuentes secundarias; sitio de Marruecos (consulat.ma) no accesible para confirmar. |
| Madagascar | e-Visa o visa a la llegada | media | Desde 16/02/2026: €30 hasta 15 días, €35 hasta 30, €40 hasta 60, €50 hasta 90. No se pudo abrir el portal oficial. |
| Polinesia Francesa | Sin visa | media | Fuera de Schengen, régimen propio: exentos hasta 3 meses cada 6. Lista oficial (Anexo II arrêté 2011) no accesible para confirmar Chile. |
| Seychelles | Autorización de viaje online | media | Travel Authorisation obligatoria antes de viajar, solo en seychelles.govtas.com (€10 estándar). Permiso de visitante gratis hasta 3 meses. |
| Uruguay | Sin visa (sirve cédula) | media | Cédula vigente basta. Estadía de 90 días es referencial: no se halló el plazo en una fuente oficial uruguaya. |

### Clima con confianza media o baja

| Destino | Lugar de referencia | Confianza |
|---|---|---|
| San Pedro de Atacama | San Pedro de Atacama, Chile | media |
| Chiloé | Castro, Chiloé, Chile | media |
| Pucón | Pucón, Chile (valores modelados; la estación DMC Pucón Aeródromo no publica normales) | baja |
| Bariloche | San Carlos de Bariloche, Argentina (estación no especificada; valores redondeados a entero) | baja |
| Fernando de Noronha | Fernando de Noronha, Brasil | media |
| Bonito | Bonito, Mato Grosso do Sul, Brasil (valores modelados) | baja |
| Costa Rica | San José, Costa Rica (estación Aeropuerto Juan Santamaría, Alajuela; ~15 km de San José y algo más cálida que el centro) | media |
| Antigua Guatemala | Antigua Guatemala, Guatemala | media |
| Roatán | Roatán, Honduras | baja |
| Costa Amalfitana | Nápoles (estación Aeropuerto de Nápoles-Capodichino), Italia — estación oficial más cercana; Amalfi no tiene tabla climática con fuente oficial (costa algo más templada en invierno) | media |
| Islas griegas | Santorini (estación a 183 m s.n.m.), Grecia | media |
| Georgia | Tiflis (Tbilisi), Georgia | media |
| Safari en Kenia | Narok, Kenia (ciudad base de acceso a la Reserva Nacional Maasai Mara; no se encontró tabla oficial para la reserva) | baja |
| Bali | Denpasar (aeropuerto Ngurah Rai), Bali, Indonesia | media |
| Bahía Inglesa | Caldera, Chile (localidad a ~6 km de Bahía Inglesa; sin datos propios) | media |
| Península Valdés | Puerto Madryn, Argentina (ciudad base para Península Valdés) | media |
| San Martín de los Andes | San Martín de los Andes, Argentina | media |
| Búzios | Cabo Frio, Brasil (a ~20 km de Búzios; Búzios no tiene tabla completa con fuente oficial) | baja |
| Paracas y Huacachina | Pisco, Perú (estación más cercana con datos a Paracas, ~15 km; Huacachina/Ica queda ~70 km tierra adentro y es más cálida) | media |
| Montañita | Salinas, Ecuador (aeropuerto General Ulpiano Páez; estación con datos más cercana a Montañita, ~60 km al sur por la costa) | baja |
| Providencia | San Andrés, Colombia (aeropuerto Gustavo Rojas Pinilla; estación sustituta ~90 km al sur de Providencia, mismo clima insular — la tabla de Providencia en Wikipedia no tenía filas legibles/verificables) | media |
| Berlín | Berlín, Alemania (estación Dahlem) | media |
| Malta | La Valeta (estación Aeropuerto de Luqa), Malta | media |
| Riviera albanesa | Vlorë, Albania (Sarandë solo tiene tabla sin fuente fiable) | media |
| Angkor | Siem Reap, Camboya | media |
| Samarcanda | Samarcanda, Uzbekistán | media |
| Mongolia | Ulán Bator, Mongolia | media |
| Namibia | Windhoek, Namibia | media |
| Kilimanjaro y Serengeti | Arusha, Tanzania | baja |
| Mauricio | Port Louis, Mauricio | media |

## Costo editorial vs. costo calculado

Para no depender solo de la opinión del equipo, el catálogo calcula un **costo de referencia** del 1 al 5: mitad pasaje (percentil de la distancia desde Santiago) y mitad costo diario (percentil del nivel de precios del país según el Banco Mundial), dividido en quintiles. **No reemplaza al costo editorial**, porque no considera tours caros (safaris, Galápagos, Antártica) ni destinos caros dentro de países baratos. Sirve para detectar valores a revisar:

| Destino | Costo editorial | Costo calculado |
|---|---|---|
| Torres del Paine | 4 | 2 |
| Isla de Pascua | 5 | 2 |
| Bariloche | 3 | 1 |
| El Calafate | 4 | 2 |
| Ushuaia | 4 | 2 |
| Fernando de Noronha | 5 | 2 |
| Islas Galápagos | 5 | 2 |
| Punta Cana | 4 | 2 |
| Georgia | 1 | 3 |
| Safari en Kenia | 5 | 2 |
| Seúl | 3 | 5 |
| Vietnam | 1 | 3 |
| Nepal | 1 | 3 |
| India (Rajastán) | 1 | 3 |
| San Martín de los Andes | 3 | 1 |
| Berlín | 3 | 5 |
| Riviera albanesa | 1 | 3 |
| Tallin | 2 | 4 |
| Angkor | 1 | 3 |
| Luang Prabang | 1 | 3 |
| Bután | 5 | 3 |
| Kerala | 1 | 3 |
| Namibia | 4 | 2 |
| Kilimanjaro y Serengeti | 5 | 2 |
| Ruanda | 5 | 2 |
| Delta del Okavango | 5 | 2 |

## Cambios detectados al hacer este corte

La verificación encontró errores en la base anterior, ya corregidos:
- **Cuba:** la tarjeta de turista fue reemplazada por una visa electrónica (2025).
- **Vietnam, Omán, Mongolia, Uzbekistán, Filipinas y Botsuana:** los chilenos entran sin visa (la base decía e-Visa o "verificar").
- **Egipto:** se confirma e-Visa online, no visa a la llegada.
- **Cabo Verde:** Chile no está entre los países exentos; requiere visa y pre-registro EASE.
- **Angkor (Camboya):** el aeropuerto REP cerró en 2023; ahora es SAI.
- **China:** la exención de visa es temporal, hasta el 31-12-2026. Revisar si se prorroga.
- **Europa:** ETIAS aún no está operativo a la fecha del corte. Revisar en el próximo corte.

## Cómo hacer un nuevo corte

1. Verifica los datos vencidos o de confianza media/baja y actualiza el archivo en `data/fuentes/` (valor, URL y fecha).
2. Cambia `fechaCorte` en `data/fuentes/corte.json`.
3. Corre `npm run catalogo` para regenerar `data/destinos.js` y `npm test` para validar.
4. Sube los cambios. GitHub revisa que el catálogo esté regenerado antes de publicar.

## Precios de pasajes y costo estimado de la semana

**Foto capturada el 2026-10-04** en Vuelos de Google (Google Flights), archivo `data/fuentes/precios-vuelos.json`.

- **Qué se consultó:** ida y vuelta desde Santiago (SCL) a cada uno de los 183 aeropuertos del catálogo (los 12 de los destinos agregados el mismo día con la misma metodología), 1 adulto, clase económica, en pesos chilenos, para dos semanas: temporada baja (16 al 23 de noviembre de 2026) y alta (11 al 18 de enero de 2027).
- **Qué se guardó por aeropuerto y temporada:** tarifa más baja, tarifa "típica" (mediana de las 5 más bajas, con tope de 1,5 veces la mínima para que un vuelo raro no la infle), si hay vuelo directo, mínimo de escalas, duración del itinerario más rápido (solo ida) y aerolínea principal.
- **Cobertura:** 122 aeropuertos con ambas temporadas, 57 con una sola (la otra se estimó con la razón mediana alta/baja, 1,30) y 4 sin resultados (Bonito, Providencia, Paro/Bután y Puerto Williams, cuyo tramo final opera DAP y no aparece en Google Flights), que usan un pasaje estimado según las horas de vuelo.
- **Vigencia:** 90 días. Los precios de pasajes cambian todos los días; la foto sirve para comparar destinos entre sí, no como cotización.

**Barra de presupuesto:** compara el monto que elige la persona con el **pasaje típico** de cada destino (promedio de temporada baja y alta). Alojamiento y gastos en el destino no se consideran por ahora, porque la app se enfoca en el viaje aéreo.

**Para más adelante (no se usa en la app):** el catálogo también guarda un costo estimado de la semana (`costoEstimadoCLP`) = pasaje típico + 7 días × gasto diario.
El gasto diario es una estimación del equipo: $20.000 + $100.000 × nivel de precios del país (Banco Mundial, PPA / tipo de cambio). Para destinos donde lo caro es una experiencia que se paga aparte (Antártica, Bután, Galápagos, safaris, Ruanda, Maldivas, Seychelles) se usa un piso diario más alto, con el motivo indicado en `scripts/construir-catalogo.js`.

**Horas de vuelo:** cuando la duración del itinerario más rápido de Google Flights está entre 0,6 y 1,6 veces la estimación editorial, se usa la de Google Flights. Si difiere más (itinerarios raros esa semana o destinos cuya estimación incluía un tramo por tierra), se mantiene la editorial; también cuando la JAC dice que hay vuelo directo pero esa semana Google Flights solo mostró itinerarios con escala. `npm run catalogo` lista los casos para revisarlos.

## Rutas directas desde Santiago (JAC)

**Fuente:** Junta de Aeronáutica Civil, *Tráfico Aéreo Mensual* ([datos.gob.cl](https://datos.gob.cl/dataset/trafico-aereo)), capturado el 2026-10-04. Archivo: `data/fuentes/jac-rutas.json`.

- **Qué se tomó:** pasajeros transportados en vuelos directos entre Santiago (SCL) y cada ciudad, sumando ambos sentidos y todas las aerolíneas, de septiembre de 2025 a agosto de 2026 (los últimos 12 meses publicados), mes a mes y con las aerolíneas que operan. Son 80 ciudades.
- **Cómo se usa:** una ruta es **directa regular** si en 12 meses tuvo al menos 3.000 pasajeros y vuelos en 3 meses o más (un mes cuenta si tuvo al menos 200 pasajeros y el 10% del mes más alto). Así se descartan vuelos ocasionales o chárter. La **temporada alta** son los meses con 85% o más del mes más alto (hasta 4), solo en rutas claramente estacionales.
- **En la app:** 71 destinos del catálogo tienen ruta directa regular (7 solo en temporada, como Bariloche, El Calafate, Ushuaia, Puerto Williams, Toronto y Montreal). El resultado muestra si el vuelo es directo todo el año o en qué meses, cuántos pasajeros vuelan la ruta y si el mes elegido es temporada alta; avisa cuando en los meses elegidos no hay vuelo directo.
- **Ciudades con más de un aeropuerto:** Buenos Aires suma Aeroparque (AEP) y Ezeiza (EZE); São Paulo suma Guarulhos (GRU) y Viracopos (VCP); para las Cataratas del Iguazú se usa el aeropuerto brasileño (IGU), que es el que tiene vuelo directo desde Santiago.
- **Vigencia:** 365 días. La JAC publica el archivo cada mes, así que se puede actualizar repitiendo el cálculo.

## Cómo llegar (del aeropuerto al destino)

Muchos destinos no son la ciudad del aeropuerto: a Torres del Paine se vuela a Puerto Natales, a la Costa Amalfitana a Nápoles, a Machu Picchu a Cusco. Para esos casos, `data/base/como-llegar.json` guarda los tramos que siguen después del vuelo (bus, tren, traslado, barco u otro vuelo interno), con tiempos aproximados.

- **El vuelo desde Santiago** sale de los datos con fuente: duración (Google Flights o estimación validada), si es directo y en qué meses (JAC) y las aerolíneas.
- **Los tramos por tierra o mar son editoriales** (confianza baja: estimación del equipo). La app lo dice y pide confirmar horarios antes de viajar. Son 106 destinos con tramos.
- **Destinos en dos etapas:** cuando se llega primero a una ciudad base y el lugar se visita otro día (Cusco y Machu Picchu, La Paz y el Titicaca, Las Vegas y el Gran Cañón...), el campo `base` marca la ciudad de llegada y los tramos después de un `grupo` son "otro día".
- **Destinos que eran un país completo** ahora nombran el lugar concreto (por ejemplo, "Eslovenia" pasó a ser "Liubliana y lago Bled" y "Vietnam" a "Hanói y Ha Long"), para que la recomendación diga a qué ciudad ir; el país se sigue mostrando debajo.

## Destinos agregados el 2026-10-04

Se sumaron 15 destinos (de 178 a 193), todos a los que se llega en avión, para cubrir dos huecos:

- **Chile** (más opciones para "Dentro de Chile"): Puerto Williams y Navarino, Huilo Huilo, Desierto Florido, Puyehue y Osorno, Parque Pumalín.
- **Rutas con vuelo directo desde Santiago según la JAC** que no estaban en el catálogo: Auckland y Rotorua, Asunción, Santa Cruz de la Sierra, Cali, Trujillo y Huanchaco, Belo Horizonte y Ouro Preto, Curitiba, Gramado y Canela, Brasilia y Chapada dos Veadeiros, Fortaleza.

Cada uno tiene los mismos datos que el resto: requisitos de ingreso (se agregó Paraguay, verificado en la Dirección Nacional de Migraciones), clima mensual con fuente, coordenadas de OurAirports, foto de precios de Google Flights, ruta JAC, indicadores del Banco Mundial (se agregó Paraguay) y cómo llegar. Los campos editoriales (tipo de experiencia, ritmo, costo relativo, pros y contras) siguen el mismo criterio del equipo. Valparaíso, Colchagua y el Cajón del Maipo quedaron fuera a propósito: se llega por tierra y la app se enfoca en el transporte aéreo.
