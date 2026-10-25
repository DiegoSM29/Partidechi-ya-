# Especificación de Endpoints de la API REST - Partidechi ya!

Todos los endpoints operan bajo la URL base configurada y el prefijo `/api/v1`.

* **Base URL Desarrollo:** `http://localhost:4000/api/v1`
* **Formato de Peticiones:** `application/json`
* **Formato de Respuestas:** JSON estandarizado

---

## 1. Estándar Global de Respuestas JSON

Todas las respuestas de la API cumplen de forma estricta con la siguiente estructura:

### Respuesta de Éxito (HTTP 200 / 201)
```json
{
  "success": true,
  "message": "Mensaje descriptivo de la operación realizada",
  "data": { ... }
}
```

### Respuesta de Error (HTTP 400 / 401 / 403 / 404 / 500)
```json
{
  "success": false,
  "error": "Mensaje descriptivo con la causa del error"
}
```

---

## 2. Autenticación y Usuarios

| Método | Endpoint | Autenticación | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | No | Registrar una nueva cuenta (Jugador o Propietario). |
| `POST` | `/api/v1/auth/login` | No | Iniciar sesión y obtener token JWT. |
| `POST` | `/api/v1/auth/logout` | Sí (JWT) | Cerrar sesión e invalidar el token activo. |
| `GET` | `/api/v1/users/me` | Sí (JWT) | Consultar el perfil propio. |
| `PATCH` | `/api/v1/users/me` | Sí (JWT) | Actualizar el perfil propio o cambiar contraseña. |

---

## 3. Canchas y Disponibilidad

| Método | Endpoint | Autenticación | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/courts` | No | Consultar y filtrar canchas (por deporte, ubicación, precio, etc.). |
| `GET` | `/api/v1/courts/:id` | No | Consultar los detalles de una cancha específica. |
| `POST` | `/api/v1/courts` | Propietario | Registrar una nueva cancha. |
| `PATCH` | `/api/v1/courts/:id` | Propietario | Actualizar una cancha (solo el propietario autorizado). |
| `DELETE` | `/api/v1/courts/:id` | Propietario / Admin | Desactivar una cancha cuando corresponda. |
| `GET` | `/api/v1/courts/:id/schedules` | No | Consultar intervalos de funcionamiento registrados (alias `/horarios`). |
| `POST` | `/api/v1/courts/:id/schedules` | Propietario | Registrar una o varias franjas de funcionamiento. |
| `PUT` | `/api/v1/courts/:id/schedules` | Propietario | Reemplazar el horario de funcionamiento semanal. |
| `PATCH` | `/api/v1/courts/:id/schedules/:scheduleId` | Propietario | Editar una franja existente. |
| `DELETE` | `/api/v1/courts/:id/schedules/:scheduleId` | Propietario | Eliminar una franja existente. |
| `GET` | `/api/v1/courts/:id/availability` | No | Consultar turnos dentro de los horarios registrados, excluyendo reservas. |

> **Regla de negocio:** los horarios usan días de `0` (domingo) a `6` (sábado) y horas `HH:mm`. Solo los intervalos registrados pueden reservarse; las horas no registradas no están disponibles. Una reserva debe quedar completamente dentro de un intervalo registrado y no puede superponerse con otra reserva pendiente o confirmada. Las reservas canceladas liberan la franja.

---

## 4. Reservas

| Método | Endpoint | Autenticación | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/reservations` | Jugador | Solicitar una reserva (valida disponibilidad con transacciones anti-solapamiento). |
| `GET` | `/api/v1/reservations` | Sí (JWT) | Consultar reservas autorizadas. Acepta `id_cancha`, `estado` y `estado_pago`. El propietario solo obtiene reservas de sus canchas. |
| `GET` | `/api/v1/reservations/:id` | Sí (JWT) | Consultar el detalle de una reserva autorizada, incluyendo pagos y datos del jugador. |
| `POST` | `/api/v1/reservations/:id/cancel` | Sí (JWT) | Solicitar la cancelación de una reserva. |
| `POST` | `/api/v1/reservations/:id/confirm` | Propietario / Admin | Confirmar una reserva cuando se cumplan las condiciones. |

> **Regla de negocio:** El endpoint de confirmación de reservas comprueba el pago, la disponibilidad y los permisos del usuario. No permite que un jugador confirme arbitrariamente una reserva sin la validación previa del pago exigido. Cuando un pago se aprueba o se captura correctamente, la reserva se confirma automáticamente.

---

## 5. Pagos

| Método | Endpoint | Autenticación | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/reservations/:id/payments` | Jugador | Registrar un pago o intento de pago (subida de comprobante/referencia). |
| `GET` | `/api/v1/reservations/:id/payments` | Sí (JWT) | Consultar los pagos asociados a una reserva autorizada. |
| `POST` | `/api/v1/reservations/:id/payments/paypal/capture` | Sí (JWT) | Capturar la orden de PayPal y confirmar automáticamente la reserva. |
| `POST` | `/api/v1/payments/:id/verify` | Propietario / Admin | Verificar manualmente un pago y actualizar el estado de la reserva. Al aprobar, la reserva pasa a `CONFIRMADA`. |
| `POST` | `/api/v1/payments/webhook` | Firma / Secreta | Recibir notificaciones automáticas de una pasarela externa. |

> **Regla de seguridad:** El endpoint de verificación está estrictamente protegido. En caso de integrar pasarelas externas, las notificaciones recibidas en el webhook deben validar la firma digital para comprobar su autenticidad. El propietario solo puede verificar pagos de reservas de sus propias canchas.

---

## 6. Partidos Amistosos

| Método | Endpoint | Autenticación | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/matches` | Jugador | Crear un partido asociado obligatoriamente a una reserva confirmada. |
| `GET` | `/api/v1/matches` | No | Consultar partidos públicos publicados. |
| `GET` | `/api/v1/matches/:id` | No | Consultar la información detallada de un partido. |
| `PATCH` | `/api/v1/matches/:id` | Organizador | Actualizar información autorizada del partido. |
| `POST` | `/api/v1/matches/:id/join` | Jugador | Solicitar incorporarse a un partido si existen plazas disponibles. |
| `POST` | `/api/v1/matches/:id/leave` | Jugador | Abandonar un partido previamente unido. |
| `GET` | `/api/v1/matches/:id/participants` | No | Consultar la lista de participantes del partido. |

---

## 7. Administración

| Método | Endpoint | Autenticación | Descripción |
|---|---|---|---|
| `GET` | `/api/v1/admin/users` | Administrador | Consultar y listar todos los usuarios del sistema. |
| `GET` | `/api/v1/admin/reports` | Administrador | Consultar incidencias y reportes del sistema. |
| `PATCH` | `/api/v1/admin/users/:id/status` | Administrador | Cambiar el estado de una cuenta (activo, inactivo, suspendido). |
| `GET` | `/api/v1/admin/statistics` | Administrador | Consultar estadísticas generales de la plataforma. |

> **Regla de acceso:** Los endpoints del módulo de administración están protegidos exclusivamente para usuarios con el rol `administrador`.