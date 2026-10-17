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
npx prisma migrate dev --name init

### 5. Iniciar el Servidor en Modo Desarrollo
npm run dev
El servidor se ejecutara por defecto en http://localhost:4000/api/v1.

## Endpoints Principales de la API
* Autenticacion: /api/v1/auth/register, /api/v1/auth/login
* Usuarios: /api/v1/users/me
* Canchas y Disponibilidad: /api/v1/courts, /api/v1/courts/:id/availability
* Reservas: /api/v1/reservations, /api/v1/reservations/:id/confirm
* Pagos: /api/v1/reservations/:id/payments, /api/v1/payments/:id/verify
* Partidos Amistosos: /api/v1/matches, /api/v1/matches/:id/join
* Administracion: /api/v1/admin/users, /api/v1/admin/statistics