# Guion de diapositivas: Partidechi ya!

Este documento contiene el contexto del proyecto y el texto final que debe aparecer en las diapositivas. El agente de diseño no necesita consultar el repositorio ni investigar el producto. Puede ajustar la composición visual, pero debe conservar los hechos, rutas y permisos descritos aquí.

## Contexto del proyecto

Partidechi ya! es una aplicación web para encontrar y reservar canchas deportivas y organizar partidos amistosos. Los **jugadores** buscan canchas, consultan disponibilidad, reservan y se unen a partidos. Los **propietarios** publican canchas, configuran horarios semanales y administran reservas y pagos.

El producto reúne estas operaciones en un flujo: búsqueda de cancha, consulta de turnos, reserva, pago y confirmación; después, el jugador puede crear un partido asociado a esa reserva confirmada e invitar a otros jugadores. Los horarios que el propietario no haya registrado no están disponibles para reservar.

La aplicación tiene frontend web y backend API REST construido con Node.js y Express. La API usa PostgreSQL con Prisma ORM, autenticación JWT y autorización por rol y propiedad de los recursos. Los datos principales son usuarios, canchas, horarios, reservas, pagos, partidos y participantes.

## Diapositiva 1: Introducción

**Título:** Partidechi ya!

**Subtítulo:** Canchas, reservas y partidos amistosos en un solo lugar.

**Texto de apertura:** Una plataforma web que conecta a quienes buscan dónde jugar con propietarios que ofrecen sus canchas.

**Idea para presentar:** Partidechi ya! acompaña el recorrido completo: encontrar una cancha disponible, reservarla y convertir esa reserva en un partido con otros jugadores.

**Composición:** Portada limpia y directa. Usar una imagen reconocible de una cancha deportiva y destacar el nombre del producto; evitar una portada corporativa genérica.

## Diapositiva 2: Contexto del problema

**Título:** Organizar un partido implica coordinar varias cosas

**Texto de entrada:** El proyecto aborda necesidades que aparecen antes de que empiece el partido:

- **Encontrar una cancha adecuada** — Ubicar opciones según deporte, zona, fecha y precio.
- **Saber cuándo está disponible** — Consultar horarios reales y distinguir los turnos que ya están reservados.
- **Asegurar la reserva** — Registrar la solicitud, gestionar el pago y conocer cuándo queda confirmada.
- **Completar el equipo** — Reunir jugadores una vez que el encuentro tiene cancha, fecha y cupos definidos.

**Conclusión de la diapositiva:** Cuando estas tareas quedan desconectadas, coordinar el juego requiere más pasos. Partidechi ya! las reúne en un mismo flujo.

**Composición:** Mostrar las cuatro necesidades como una secuencia de coordinación que converge en “Partido organizado”. No incluir estadísticas ni generalizaciones sobre todos los usuarios; presentar estos puntos como el problema que el producto busca resolver.

## Diapositiva 3: Qué resuelve

**Título:** Partidechi ya!

**Frase principal:** Encuentra cancha. Reserva tu turno. Arma el partido.

**Texto de apoyo:** Una plataforma que conecta a jugadores y propietarios para gestionar canchas, disponibilidad, reservas, pagos y partidos amistosos en un solo lugar.

**Tres bloques de contenido:**

- **JUGADORES** — Encuentran canchas por deporte, ubicación, fecha y precio; reservan turnos y participan en partidos.
- **PROPIETARIOS** — Publican sus canchas, configuran horarios y gestionan reservas y pagos.
- **DE LA RESERVA AL PARTIDO** — Una reserva confirmada habilita al jugador organizador a crear un partido y abrir sus cupos a otros jugadores.

**Pie técnico:** Aplicación web · API REST · Node.js/Express · PostgreSQL/Prisma · JWT

**Composición:** Presentar los dos actores a los lados y el servicio al centro. Dar prioridad visual a la frase principal y a la conexión entre reserva y partido.

## Diapositiva 4: El recorrido del jugador

**Título:** De buscar cancha a jugar en equipo

**Flujo central, en este orden:**

1. **BUSCAR** — Filtra canchas por deporte, ubicación, fecha y precio máximo.
2. **ELEGIR TURNO** — Consulta horarios disponibles para la fecha seleccionada.
3. **RESERVAR** — Solicita una franja dentro del horario publicado por el propietario.
4. **PAGAR Y CONFIRMAR** — Paga mediante PayPal o registra un pago manual para verificación. Al aprobarse el pago, la reserva queda confirmada.
5. **ORGANIZAR O UNIRSE** — El jugador crea un partido asociado a su reserva confirmada; otros jugadores pueden unirse mientras haya plazas.

**Llamado destacado:** Solo se pueden reservar horarios registrados; las reservas pendientes y confirmadas bloquean el turno.

**Dato de confianza:** La validación de disponibilidad y la creación de la reserva ocurren en el backend para evitar reservas superpuestas, incluso ante solicitudes simultáneas.

**Composición:** Usar cinco pasos conectados con flechas. Debajo de “Pagar y confirmar”, representar el cambio de estado `PENDIENTE → CONFIRMADA` al aprobarse el pago.

## Diapositiva 5: API de canchas y disponibilidad

**Título:** Una API con rutas claras y permisos por rol

**Base de todas las rutas:** `/api/v1`

| Función | Endpoints y acceso |
|---|---|
| Salud de API | `GET /health` — público; comprueba que la API está operativa. |
| Sesión | `POST /auth/register`, `POST /auth/login` — públicos; `POST /auth/logout` — requiere autenticación. |
| Perfil | `GET /users/me`, `PATCH /users/me` — requieren autenticación. |
| Buscar canchas | `GET /courts`, `GET /courts/:id` — públicos. El listado admite filtros de deporte, ubicación, precio máximo y fecha. |
| Administrar canchas | `GET /courts/mine`, `POST /courts`, `PATCH` o `PUT /courts/:id`, `DELETE /courts/:id` — propietario autenticado; solo puede gestionar sus propias canchas. |
| Consultar horarios | `GET /courts/:id/schedules`, `GET /courts/:id/availability?fecha=YYYY-MM-DD` — públicos. `/horarios` es alias de `/schedules`. |
| Configurar horarios | `POST` o `PUT /courts/:id/schedules`; `PATCH` o `PUT /courts/:id/schedules/:scheduleId`; `DELETE /courts/:id/schedules/:scheduleId` — propietario autenticado de la cancha. |

**Texto inferior:** La disponibilidad se calcula a partir de los horarios semanales publicados y de las reservas que ocupan cada franja.

**Composición:** Separar visualmente consultas públicas de acciones del propietario. Mostrar el método HTTP junto a cada ruta.

## Diapositiva 6: API de reservas, pagos y partidos

**Título:** La API protege cada paso del flujo

| Flujo | Endpoints y comportamiento |
|---|---|
| Reservas | `POST /reservations` crea una solicitud autenticada; `GET /reservations` y `GET /reservations/:id` consultan reservas autorizadas; `POST /reservations/:id/cancel` cancela; `POST /reservations/:id/confirm` permite confirmar tras verificar el pago. |
| Pagos | `GET /reservations/:id/payments/amount` consulta el importe; `POST /reservations/:id/payments/paypal/simulate` inicia la simulación PayPal; `POST /reservations/:id/payments/paypal/capture` captura y confirma automáticamente; `POST /reservations/:id/payments` registra pago manual pendiente; `GET /reservations/:id/payments` consulta pagos; `POST /payments/:id/verify` aprueba o rechaza. Solo el propietario de la cancha o un administrador puede verificar. |
| Partidos | `GET /matches`, `GET /matches/:id`, `GET /matches/:id/participants` consultan partidos; `POST /matches` crea uno; `POST /matches/:id/join` y `POST /matches/:id/leave` gestionan participación; `PATCH /matches/:id` queda para moderación administrativa; `DELETE /matches/:id` permite al organizador eliminar su partido publicado con al menos 24 horas de anticipación. |

**Reglas clave:**

- Crear un partido requiere una reserva confirmada del jugador organizador.
- La API limita los cupos, evita duplicar participantes y cierra las confirmaciones de asistencia 30 minutos antes del inicio.
- El organizador no puede abandonar su propio partido.
- Las solicitudes protegidas requieren autenticación y la API valida que el usuario tenga acceso a la reserva o cancha involucrada.

**Manejo de respuestas:** Las respuestas exitosas usan `{ "success": true, "data": ... }`. Los errores usan `{ "success": false, "error": "..." }` y códigos HTTP como `400` (solicitud inválida), `403` (sin permiso) y `404` (recurso no encontrado). Las rutas inexistentes y los errores de base de datos se procesan con middleware centralizado.

**Composición:** Mantener tres grupos legibles: Reservas, Pagos y Partidos. Resaltar la transición de pago aprobado a reserva confirmada y distinguir endpoints públicos de los autenticados.

## Diapositiva 7: Conclusiones

**Título:** Una reserva confirmada es el inicio del partido

**Conclusiones:**

- **Un solo recorrido:** búsqueda, disponibilidad, reserva y organización del partido están conectadas.
- **Reglas claras:** solo se reservan horarios publicados; los pagos aprobados confirman reservas y los partidos respetan cupos y permisos.
- **Gestión diferenciada:** jugadores y propietarios tienen acciones acordes a su rol, protegidas por la API.

**Cierre:** Partidechi ya! transforma la búsqueda de una cancha en una oportunidad concreta para jugar en equipo.

**Composición:** Recuperar visualmente el flujo de la diapositiva 4 en una sola línea y cerrar con la frase final. No agregar nuevas funciones ni promesas de producto.

## Límites de precisión

- No afirmar que existe una pasarela de pago real en producción. PayPal se integra mediante el flujo configurado para Sandbox; también existe registro de pago manual sujeto a verificación.
- No presentar cobro compartido de partidos como una función: el rango de aporte mostrado en el detalle del partido es informativo y no inicia un pago.
- No incluir `/admin/users` ni `/admin/statistics` como endpoints: no están registrados en las rutas actuales. El rol administrador sí puede verificar pagos y moderar partidos.
- No decir que el propietario establece el cupo del partido. El cupo se define al crear cada partido.