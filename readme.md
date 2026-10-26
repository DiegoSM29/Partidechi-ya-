# Backend - Partidechi ya!

Backend oficial de "Partidechi ya!", una aplicación web desarrollada para centralizar la búsqueda de canchas deportivas, la consulta de disponibilidad horaria, la gestión de reservas, pagos y la organización de partidos amistosos.

## Stack Tecnologico
* Entorno: Node.js
* Framework: Express
* Base de datos: PostgreSQL
* ORM: Prisma ORM
* Autenticacion: JSON Web Tokens (JWT) y bcrypt

## Arquitectura del Proyecto
El proyecto esta estructurado bajo una arquitectura modular por capas para separar responsabilidades:
* Capa de Controladores: Reciben las peticiones HTTP, validan los datos de entrada y llaman a los servicios.
* Capa de Logica de Negocio (Servicios): Contiene las reglas del negocio (validacion de disponibilidad, control de pagos y concurrencia).
* Capa de Acceso a Datos: Gestiona las operaciones y transacciones sobre PostgreSQL utilizando Prisma ORM.

## Estructura de Carpetas y Documentación de Contexto
El proyecto incluye una carpeta de contexto para guiar el desarrollo con herramientas de inteligencia artificial:
* .context/PROJECT.md: Vision general, objetivos y actores del sistema.
* .context/ARCHITECTURE.md: Detalles de la arquitectura por capas y convenciones de codigo.
* .context/DATABASE.md: Modelo relacional, tablas, campos y restricciones de la base de datos.
* src/: Codigo fuente backend (controladores, servicios, rutas, middlewares).
* prisma/: Esquema de base de datos y migraciones.

## Guia de Instalacion y Configuracion Local

### 1. Clonar el repositorio y entrar al directorio del backend
git clone https://github.com/DiegoSM29/Partidechi-ya-.git
cd Partidechi-ya-/backend

### 2. Instalar las dependencias
npm install

### 3. Configurar las Variables de Entorno
Crea un archivo .env en la raiz de la carpeta backend basandote en el entorno local y configura tu conexion a PostgreSQL
PORT=4000
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/partidechi_db?schema=public"
JWT_SECRET="tu_secreto_jwt_super_seguro"

### 4. Ejecutar las Migraciones de la Base de datos
npx prisma migrate dev
npx prisma generate

### 5. Iniciar el Servidor en Modo Desarrollo
npm run dev
El servidor se ejecutara por defecto en http://localhost:4000/api/v1.

## Endpoints Principales de la API
* Autenticacion: /api/v1/auth/register, /api/v1/auth/login
* Usuarios: /api/v1/users/me
* Canchas: GET /api/v1/courts, GET /api/v1/courts/mine, POST /api/v1/courts, PATCH y DELETE /api/v1/courts/:id
* Horarios: /api/v1/courts/:id/schedules, /api/v1/courts/:id/availability
* Reservas: POST /api/v1/reservations, GET /api/v1/reservations, GET /api/v1/reservations/:id, POST /api/v1/reservations/:id/cancel, POST /api/v1/reservations/:id/confirm
* Pagos: GET /api/v1/reservations/:id/payments/amount, POST /api/v1/reservations/:id/payments/paypal/simulate, POST /api/v1/reservations/:id/payments/paypal/capture, POST /api/v1/reservations/:id/payments, GET /api/v1/reservations/:id/payments, POST /api/v1/payments/:id/verify
* Partidos Amistosos: POST /api/v1/matches, GET /api/v1/matches, GET /api/v1/matches/:id, PATCH /api/v1/matches/:id, DELETE /api/v1/matches/:id, POST /api/v1/matches/:id/join, POST /api/v1/matches/:id/leave, GET /api/v1/matches/:id/participants
* Administracion: /api/v1/admin/users, /api/v1/admin/statistics

## Gestion de Canchas

Los propietarios pueden registrar, consultar, editar y eliminar sus propias canchas. Cada cancha guarda nombre, ubicacion, latitud, longitud, deporte, precio por hora, número máximo de jugadores e identificador del propietario. Las rutas se configuran correctamente para evitar conflictos entre `/mine` y `/:id`.

Los deportes permitidos son futbol 5, futbol 8, futbol 11, wally, padel y fronton. El servidor valida los campos y restringe las operaciones de administracion al propietario autenticado de cada cancha.

| Metodo | Endpoint | Acceso | Descripcion |
|---|---|---|---|
| GET | `/api/v1/courts` | Publico | Consultar canchas disponibles |
| GET | `/api/v1/courts/mine` | Propietario | Consultar las canchas propias |
| POST | `/api/v1/courts` | Propietario | Registrar una cancha |
| PATCH | `/api/v1/courts/:id` | Propietario | Editar una cancha propia |
| DELETE | `/api/v1/courts/:id` | Propietario | Eliminar una cancha propia |

Las altas y cambios de ubicacion requieren direccion, latitud y longitud. El backend verifica que el punto corresponda al departamento de Cochabamba, Bolivia, mediante geocodificacion inversa de Nominatim; una ubicacion fuera del departamento se rechaza.

La tabla `canchas` se crea y amplía mediante las migraciones incluidas en `prisma/migrations`. Para aplicar las migraciones pendientes en una base local, ejecuta `npx prisma migrate dev` desde `backend` y luego `npx prisma generate`.

## Horarios y Disponibilidad

Cada propietario registra los intervalos semanales en los que sus canchas pueden reservarse. **Únicamente las franjas registradas son reservables**; las horas que no estén registradas no se ofrecen y no admiten reservas. Los días se numeran de `0` (domingo) a `6` (sábado) y las horas usan el formato `HH:mm` de 24 horas.

| Metodo | Endpoint | Acceso | Descripcion |
|---|---|---|---|
| GET | `/api/v1/courts/:id/schedules` | Publico | Consultar los intervalos registrados como disponibles |
| POST | `/api/v1/courts/:id/schedules` | Propietario | Registrar una o varias franjas de funcionamiento |
| PUT | `/api/v1/courts/:id/schedules` | Propietario | Reemplazar el horario de funcionamiento semanal |
| PATCH/PUT | `/api/v1/courts/:id/schedules/:scheduleId` | Propietario | Editar una franja |
| DELETE | `/api/v1/courts/:id/schedules/:scheduleId` | Propietario | Eliminar una franja |
| GET | `/api/v1/courts/:id/availability?fecha=YYYY-MM-DD` | Publico | Consultar turnos disponibles para una fecha |
| POST | `/api/v1/reservations` | Autenticado | Solicitar una reserva compatible con los horarios |

Los endpoints de horarios aceptan `/horarios` como alias en español. `POST /api/v1/reservations` recibe `id_cancha`, `fecha`, `hora_inicio` y `hora_fin`; rechaza solicitudes que no estén completamente cubiertas por algún intervalo registrado o que se superpongan con otra reserva activa.

La consulta de disponibilidad genera turnos únicamente dentro de los intervalos registrados para ese día y descuenta las reservas pendientes/confirmadas. Si una cancha no tiene horario configurado para ese día, no ofrece turnos y no admite reservas.

## Búsqueda de canchas (HU - Jugador)

Se habilitó la búsqueda de canchas para jugadores con filtros por fecha, precio, ubicación y deporte. Los jugadores pueden ver la ubicación de las canchas en un modal desde el listado o desde la vista de disponibilidad:

- **Backend**
  - `GET /api/v1/courts` ahora acepta filtros: `deporte`/`sport`, `ubicacion`/`location`/`search`, `precio_max`/`max_price`. Al filtrar por `fecha` (YYYY-MM-DD), solo se muestran canchas que tengan al menos un horario registrado para ese día de la semana. Los resultados incluyen horarios asociados.
  - `GET /api/v1/courts/:id` agregado para consultar el detalle de una cancha.
- **Frontend (Jugador)**
  - Nueva vista `Canchas` / búsqueda (`/courts/search`) con filtros (deporte, ubicación, precio máximo y fecha), listado de resultados, mensaje "No existen resultados" cuando no hay coincidencias. Al buscar con fecha seleccionada, solo aparecen canchas con horarios ese día.
  - Nueva vista de disponibilidad (`/courts/:id/availability`) que muestra horarios disponibles por fecha (basado en horarios registrados y reservas existentes), precios y características de la cancha. Si se llega con `?fecha=...` desde el buscador, carga automáticamente los horarios de ese día manteniendo el calendario para cambiar de fecha. Los turnos disponibles permiten reservar directamente.

## Reserva y Pago de Cancha (HU - Jugador/Propietario)

Se implementó el flujo completo para reservar una cancha y registrar el pago correspondiente:

- **Backend**
  - Modelo `Pago` agregado al esquema Prisma con estados `pendiente`, `aprobado`, `rechazado`, `reembolsado`. Migración creada y aplicada.
  - `POST /api/v1/reservations` crea la reserva (estado `PENDIENTE`) validando disponibilidad. Reservas pendientes o confirmadas bloquean el horario.
  - `GET /api/v1/reservations/:id/payments/amount` muestra el importe a pagar (un solo pago por todas las horas seleccionadas).
  - `POST /api/v1/reservations/:id/payments/paypal/simulate` crea orden de PayPal Sandbox y devuelve URL de aprobación para redirigir al usuario.
  - `POST /api/v1/reservations/:id/payments/paypal/capture` captura la orden al volver de PayPal y confirma automáticamente la reserva. En modo sandbox, si PayPal no está disponible, permite completar la simulación para no bloquear las pruebas.
  - `POST /api/v1/payments/:id/verify` verifica manualmente un pago (Propietario/Administrador): al aprobarlo, el pago queda `APROBADO` y la reserva se confirma automáticamente en la misma transacción.
- **Frontend**
  - Nueva ruta `/reservations/new` para solicitar reserva.
  - Nueva ruta `/reservations/:id/pay` redirige a PayPal Sandbox. Al volver con `?paypal=success` se captura el pago y se muestra la reserva confirmada con acceso directo a "Organizar partido". También permite registrar un pago manual con referencia y enlace de comprobante.
  - En disponibilidad, se pueden seleccionar múltiples horarios (carrito) y pulsar "Empezar a pagar" para un solo pago. Los horarios ya reservados aparecen como "No disponible".

### Credenciales PayPal Sandbox (Desarrollador)
Para usar PayPal Sandbox con tu cuenta de desarrollador:

**Backend (`backend/.env`)**:
```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=TU_CLIENT_ID_DE_TU_APP_SANDBOX
PAYPAL_CLIENT_SECRET=TU_CLIENT_SECRET_DE_TU_APP_SANDBOX
PAYPAL_WEBHOOK_ID=TU_WEBHOOK_ID_OPCIONAL
FRONTEND_URL=http://localhost:5173
```

**Frontend (`frontend/.env`)**:
```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_PAYPAL_CLIENT_ID=TU_CLIENT_ID_DE_TU_APP_SANDBOX
```

Pasos:
1. Ve a [developer.paypal.com](https://developer.paypal.com) → Inicia sesión con tu cuenta de desarrollador
2. Ve a "Apps & Credentials" → Selecciona "Sandbox"
3. Crea una app o usa una existente → Copia `Client ID` y `Secret`
4. Pega `PAYPAL_CLIENT_ID` y `PAYPAL_CLIENT_SECRET` en `backend/.env`. También puedes poner el `Client ID` en `frontend/.env`
5. Usa cuentas de prueba (Sandbox test accounts) en developer.paypal.com para simular pagos sin costo real
6. Al pulsar "Pagar con PayPal (Sandbox)", se redirige a PayPal Sandbox para simular el pago. Tras completar, el sitio captura la orden, marca el pago como aprobado y confirma la reserva automáticamente. Si se cancela, la reserva permanece pendiente y se puede reintentar o registrar un pago manual. El propietario también puede verificar manualmente el pago desde su panel de reservas.
7. Para reservar múltiples horas, selecciona hora de inicio y hora de fin directamente (carrito/selectivo), se genera un solo pago por todo el bloque.

## Partidos Amistosos (HU - Jugador)

Se implementó la creación y gestión de partidos amistosos asociados a reservas confirmadas:

- **Backend**
  - Modelo `Partido` y `Participante` agregados al esquema Prisma con sus respectivas relaciones y estados. Migración `partidos_participantes` aplicada; la migración `remove_court_player_limit` elimina la capacidad configurada por el propietario en la cancha.
  - La capacidad de participantes se define por partido y no depende de un límite establecido por el propietario de la cancha.
  - `POST /api/v1/matches` crea un partido asociado obligatoriamente a una `reserva` válida y confirmada. El deporte se toma de la cancha reservada (no editable manualmente). El organizador se agrega automáticamente como participante aceptado.
  - `GET /api/v1/matches` lista partidos públicos publicados. `GET /api/v1/matches/:id` consulta el detalle con participantes. `PATCH /api/v1/matches/:id` queda reservado al administrador para moderación: un partido creado por un jugador no puede modificarse después de su creación.
  - `DELETE /api/v1/matches/:id` permite al organizador eliminar su partido publicado únicamente cuando faltan al menos 24 horas para su inicio; el backend aplica el control de identidad y plazo.
  - `POST /api/v1/matches/:id/join` permite a jugadores unirse solo a partidos publicados con plazas disponibles; la operación bloquea el partido en transacción para evitar sobrepasar su capacidad en solicitudes simultáneas y evita duplicados, permitiendo volver a unirse tras abandonar.
  - La asistencia se confirma al unirse y el backend rechaza nuevas confirmaciones durante los últimos 30 minutos previos al inicio. El detalle muestra la ubicación de la cancha y un rango informativo del aporte por jugador calculado a partir del precio de la reserva, el cupo y los participantes actuales; no se inicia ningún cobro ni flujo de PayPal.
  - `POST /api/v1/matches/:id/leave` permite abandonar el partido (el organizador no puede abandonar).
  - `GET /api/v1/matches/:id/participants` consulta la lista de participantes.
  - El partido indica `nombre`, `deporte`, `fecha_hora`, `jugadores_maximos`, `descripcion`, `estado` y está asociado a una reserva confirmada cuando requiere cancha.

- **Frontend (Jugador/Propietario)**
  - Nuevas rutas `/matches`, `/matches/create`, `/matches/new`, `/matches/:id`.
  - Listado con secciones para ver partidos organizados por el usuario y partidos de otros jugadores; en estos últimos se puede filtrar por deporte, fecha y ubicación.
  - Creación de partido desde reservas (`/matches/create`), mostrando únicamente reservas confirmadas sin partido asociado. El deporte se obtiene automáticamente de la cancha reservada (campo de solo lectura). El número máximo de jugadores debe respetar el límite configurado en la cancha.
  - Antes de crear el partido se muestra un resumen de confirmación con cancha, fecha, hora, nombre, deporte, plazas y descripción, junto con la advertencia de que **el partido no podrá modificarse después**. Solo al confirmar se envía la solicitud al backend.
  - La barra superior resalta la pestaña activa (Buscar canchas, Partidos, Crear partido, Mis canchas, Reservas o Perfil), incluyendo las vistas de detalle y subrutas de cada sección.
  - El propietario ya no configura un límite de jugadores en la cancha; el organizador establece la capacidad del encuentro al crear cada partido.
  - El detalle del partido actualiza participantes y plazas disponibles después de unirse, e impide un segundo registro del mismo usuario.
  - Vista de detalle del partido con lista de participantes, control de plazas, opción para unirse o abandonar y eliminación por el organizador con un mínimo de 24 horas de anticipación.
  - Al confirmar asistencia se muestra la ubicación y el rango estimado de costo compartido de la reserva, junto al límite de 30 minutos; es informativo y no requiere pago.
  - Se corrigió la carga del detalle de reserva y la respuesta de creación del backend para que el acceso "Organizar partido" envíe el identificador de reserva y abra correctamente el partido creado.
  - El filtro por precio máximo muestra canchas con precio menor o igual al valor ingresado y permite ingresar valores intermedios en incrementos de Bs. 1.

## Frontend de Canchas

El frontend de propietarios documenta las rutas de consulta, alta y edicion en [frontend/README.md](frontend/README.md). Incluye mapa OpenStreetMap, busqueda por direccion, geolocalizacion, visualizacion de ubicaciones guardadas y eliminacion de canchas.

## Gestión de Reservas y Verificación de Pagos (HU - Propietario)

Se implementó la consulta de reservas y la verificación de pagos para que el propietario administre correctamente sus canchas. Además, el flujo de pago cambió: **una reserva se confirma automáticamente cuando su pago queda aprobado**, de modo que el jugador puede organizar un partido inmediatamente después de pagar.

### Backend

- **Consulta de reservas del propietario**
  - `GET /api/v1/reservations` ahora acepta filtros opcionales: `id_cancha` (también `cancha_id`/`court_id`), `estado` (`PENDIENTE`, `CONFIRMADA`, `CANCELADA`, `COMPLETADA`) y `estado_pago` (`PENDIENTE`, `APROBADO`, `RECHAZADO`, `REEMBOLSADO`, `SIN_PAGO`).
  - Para el rol `PROPIETARIO`, el backend fuerza el filtro `cancha.id_propietario = usuario autenticado`. Aunque se envíe el identificador de una cancha ajena, la consulta no devuelve reservas ajenas.
  - Las respuestas incluyen la cancha, los datos de contacto del jugador, la lista de pagos (monto, método, referencia, comprobante, estado y fechas) y el partido asociado si existe.
  - `GET /api/v1/reservations/:id` también incluye pagos y datos del jugador. Mantiene la validación de acceso: jugador propietario de la reserva, propietario de la cancha o administrador.
- **Verificación de pagos y comprobantes**
  - `POST /api/v1/payments/:id/verify` acepta `accion: "APROBAR" | "RECHAZAR"`.
  - Al aprobar, el pago pasa a `APROBADO` y la reserva a `CONFIRMADA` en una sola transacción con control de solapamientos.
  - Al rechazar, el pago queda `RECHAZADO` y la reserva continúa pendiente.
  - Solo el propietario de la cancha o un administrador puede verificar el pago; un jugador recibe `403`.
- **Confirmación automática al pagar**
  - `POST /api/v1/reservations/:id/payments/paypal/capture` captura la orden de PayPal al regresar del checkout, marca el pago como aprobado y confirma la reserva automáticamente.
  - La operación es idempotente: si la reserva ya está confirmada no vuelve a capturar ni duplica pagos.
  - En `PAYPAL_MODE=sandbox`, si PayPal no está configurado o no puede capturarse la orden, se permite completar la simulación para no bloquear las pruebas. En modo `live` un fallo de captura impide confirmar el pago.
  - La reserva confirmada ya cumple la regla existente de partidos: `POST /api/v1/matches` exige una reserva `CONFIRMADA` del mismo jugador.
- **Pagos manuales**
  - `POST /api/v1/reservations/:id/payments` sigue permitiendo registrar un pago con método, referencia y `comprobante_url`. Queda en estado `PENDIENTE` hasta que el propietario lo verifique.

| Método | Endpoint | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/v1/reservations?id_cancha=&estado=&estado_pago=` | Autenticado | Consultar reservas autorizadas; el propietario solo ve sus canchas |
| GET | `/api/v1/reservations/:id` | Autenticado | Consultar detalle de reserva con pagos y datos del jugador |
| POST | `/api/v1/reservations/:id/payments/paypal/capture` | Autenticado | Capturar pago PayPal y confirmar la reserva automáticamente |
| GET | `/api/v1/reservations/:id/payments` | Autenticado | Consultar pagos y comprobantes de una reserva autorizada |
| POST | `/api/v1/payments/:id/verify` | Propietario / Admin | Aprobar o rechazar un pago; al aprobar se confirma la reserva |
| POST | `/api/v1/reservations/:id/payments` | Autenticado | Registrar pago manual pendiente de verificación |

### Frontend

- **Nueva vista de reservas del propietario** en `/reservations/owner` (alias `/owner/reservations`), accesible desde el navbar ("Reservas") y desde el botón de cada cancha en "Mis canchas".
  - Filtros por cancha, estado de reserva y estado de pago.
  - Tarjetas de resumen: reservas encontradas, confirmadas, pendientes de pago y pagos por verificar.
  - Cada reserva muestra fecha, horario, monto, estado, jugador, correo y cancha.
  - Cada pago muestra método, monto, referencia, estado, fechas y enlace al comprobante cuando existe.
  - Botones "Aprobar y confirmar" y "Rechazar" para pagos pendientes. Al aprobar se informa que la reserva quedó confirmada automáticamente.
  - La vista solo está protegida para el rol `PROPIETARIO`, y el backend vuelve a validar la pertenencia de cada cancha.
- **Flujo de pago actualizado en `/reservations/:id/pay`**
  - Al regresar de PayPal con `?paypal=success`, el frontend llama a la captura del pago y muestra la reserva confirmada.
  - La pantalla de éxito incluye el botón "Organizar partido" para crear un partido asociado a esa reserva confirmada.
  - Se agregó un formulario de pago manual con método, referencia y enlace de comprobante.
- **Creación de partidos**
  - `CreateMatch` ahora muestra únicamente reservas `CONFIRMADA` y explica que una reserva se confirma automáticamente al pagar.
  - Si no hay reservas confirmadas, indica que primero debe pagarse una reserva.

### Archivos principales modificados

- `backend/src/repositories/reserva.repository.js`: incluye pagos, jugador y partido en las consultas de reservas.
- `backend/src/services/reserva.service.js`: filtros de consulta y aislamiento de reservas por propietario.
- `backend/src/services/pago.service.js`: captura de PayPal, confirmación automática y verificación transaccional de pagos.
- `backend/src/controllers/reserva.controller.js` y `backend/src/controllers/pago.controller.js`: nuevos parámetros y endpoint de captura.
- `backend/src/routes/reservation.routes.js`: ruta `POST /reservations/:id/payments/paypal/capture`.
- `frontend/src/pages/OwnerReservations.jsx`: panel de reservas y pagos del propietario.
- `frontend/src/pages/ReservationPay.jsx`: captura automática, pago manual y acceso a organizar partido.
- `frontend/src/pages/CreateMatch.jsx`: solo reservas confirmadas.
- `frontend/src/App.jsx`, `frontend/src/components/Navbar.jsx`, `frontend/src/pages/OwnerCourts.jsx` y `frontend/src/api/reservations.js`: rutas, navegación y llamadas a la API.

### Validación realizada

- `node --check` sobre los archivos backend modificados.
- `npx prisma validate` con el esquema actual.
- `npm run build` en el frontend (compilación correcta).
- Pruebas manuales contra la API local: listado y filtros de reservas del propietario, aprobación de un pago con confirmación automática de la reserva, captura simulada de PayPal en sandbox y rechazo de verificación por parte de un jugador.
- No se requirieron migraciones nuevas porque se reutilizan los estados y campos existentes de `reservas` y `pagos`.