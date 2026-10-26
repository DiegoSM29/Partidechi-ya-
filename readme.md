Partidechi ya!

Partidechi ya! es una aplicación web desarrollada para centralizar la búsqueda de canchas deportivas, la consulta de disponibilidad horaria, la gestión de reservas, pagos y la organización de partidos amistosos.

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
  - Modelo `Partido` y `Participante` agregados al esquema Prisma con sus respectivas relaciones y estados. Migraciones `partidos_participantes` y `cancha_jugadores_maximos` creadas y aplicadas.
  - Se agregó `jugadores_maximos` a `canchas` (definido por el propietario al registrar/editar la cancha). El número máximo de jugadores del partido no puede superar el límite de la cancha.
  - `POST /api/v1/matches` crea un partido asociado obligatoriamente a una `reserva` válida y confirmada. El deporte se toma de la cancha reservada (no editable manualmente). El organizador se agrega automáticamente como participante aceptado.
  - `GET /api/v1/matches` lista partidos públicos publicados. `GET /api/v1/matches/:id` consulta el detalle con participantes. `PATCH /api/v1/matches/:id` queda reservado al administrador para moderación: un partido creado por un jugador no puede modificarse después de su creación.
  - `DELETE /api/v1/matches/:id` permite al organizador eliminar su partido publicado únicamente cuando faltan al menos 24 horas para su inicio; el backend aplica el control de identidad y plazo.
  - `POST /api/v1/matches/:id/join` permite unirse si hay plazas disponibles; el sistema controla el número máximo de jugadores (`jugadores_maximos`).
  - `POST /api/v1/matches/:id/leave` permite abandonar el partido (el organizador no puede abandonar).
  - `GET /api/v1/matches/:id/participants` consulta la lista de participantes.
  - El partido indica `nombre`, `deporte`, `fecha_hora`, `jugadores_maximos`, `descripcion`, `estado` y está asociado a una reserva confirmada cuando requiere cancha.

- **Frontend (Jugador/Propietario)**
  - Nuevas rutas `/matches`, `/matches/create`, `/matches/new`, `/matches/:id`.
  - Listado con secciones para ver partidos organizados por el usuario y partidos de otros jugadores; en estos últimos se puede filtrar por deporte, fecha y ubicación.
  - Creación de partido desde reservas (`/matches/create`), mostrando únicamente reservas confirmadas sin partido asociado. El deporte se obtiene automáticamente de la cancha reservada (campo de solo lectura). El número máximo de jugadores debe respetar el límite configurado en la cancha.
  - Antes de crear el partido se muestra un resumen de confirmación con cancha, fecha, hora, nombre, deporte, plazas y descripción, junto con la advertencia de que **el partido no podrá modificarse después**. Solo al confirmar se envía la solicitud al backend.
  - La barra superior resalta la pestaña activa (Buscar canchas, Partidos, Crear partido, Mis canchas, Reservas o Perfil), incluyendo las vistas de detalle y subrutas de cada sección.
  - El propietario puede definir `jugadores_maximos` al registrar/editar su cancha.
  - Vista de detalle del partido con lista de participantes, control de plazas, opción para unirse o abandonar y eliminación por el organizador con un mínimo de 24 horas de anticipación.
  - El filtro por precio máximo muestra canchas con precio menor o igual al valor ingresado y permite ingresar valores intermedios en incrementos de Bs. 1.

## Frontend de Canchas

El frontend de propietarios documenta las rutas de consulta, alta y edicion en [frontend/README.md](frontend/README.md). Incluye mapa OpenStreetMap, busqueda por direccion, geolocalizacion, visualizacion de ubicaciones guardadas y eliminacion de canchas.
