# Arquitectura del Sistema: Partidechi ya!

## Estilo Arquitectonico
El backend utiliza una arquitectura modular por capas para separar responsabilidades de manera estricta:
1. **Capa de Controladores**: Reciben las peticiones HTTP, validan la estructura basica de entrada y llaman a los servicios.
2. **Capa de Logica de Negocio (Servicios)**: Contiene la implementacion de las reglas de negocio, validaciones de disponibilidad, control de pagos y transacciones.
3. **Capa de Acceso a Datos**: Centraliza las consultas, operaciones y transacciones sobre PostgreSQL utilizando Prisma ORM.

## Stack Tecnologico
* **Entorno**: Node.js
* **Framework**: Express
* **Base de Datos**: PostgreSQL
* **ORM**: Prisma ORM
* **Autenticacion**: JSON Web Tokens (JWT) y bcrypt

## Convenciones de Respuestas JSON
* **Exito (HTTP 200 / 201)**:
  {
    "success": true,
    "message": "Operacion realizada con exito",
    "data": { ... }
  }
* **Error (HTTP 400 / 401 / 403 / 404 / 500)**:
  {
    "success": false,
    "error": "Descripcion clara del error"
  }