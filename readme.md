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
* Reservas: /api/v1/reservations, /api/v1/reservations/:id/confirm
* Pagos: /api/v1/reservations/:id/payments, /api/v1/payments/:id/verify
* Partidos Amistosos: /api/v1/matches, /api/v1/matches/:id/join
* Administracion: /api/v1/admin/users, /api/v1/admin/statistics

## Gestion de Canchas

Los propietarios pueden registrar, consultar, editar y eliminar sus propias canchas. Cada cancha guarda nombre, ubicacion, latitud, longitud, deporte, precio por hora e identificador del propietario.

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

## Frontend de Canchas

El frontend de propietarios documenta las rutas de consulta, alta y edicion en [frontend/README.md](frontend/README.md). Incluye mapa OpenStreetMap, busqueda por direccion, geolocalizacion, visualizacion de ubicaciones guardadas y eliminacion de canchas.