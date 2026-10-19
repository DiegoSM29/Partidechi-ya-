# Especificacion de Endpoints REST: Partidechi ya!

Todos los endpoints operan bajo el prefijo base `/api/v1`.

## Autenticacion y Usuarios
* POST `/api/v1/auth/register` - Registrar una cuenta
* POST `/api/v1/auth/login` - Iniciar sesion y obtener token JWT
* POST `/api/v1/auth/logout` - Cerrar sesion
* GET `/api/v1/users/me` - Consultar perfil propio
* PATCH `/api/v1/users/me` - Actualizar perfil propio

## Canchas y Disponibilidad
* GET `/api/v1/courts` - Consultar y filtrar canchas
* GET `/api/v1/courts/:id` - Consultar una cancha especifica
* POST `/api/v1/courts` - Registrar una cancha (Propietario)
* PATCH `/api/v1/courts/:id` - Actualizar una cancha
* DELETE `/api/v1/courts/:id` - Desactivar una cancha
* GET `/api/v1/courts/:id/availability` - Consultar disponibilidad horaria
* POST `/api/v1/courts/:id/blocks` - Registrar bloqueo por mantenimiento

## Reservas y Pagos
* POST `/api/v1/reservations` - Solicitar reserva (con transaccion de disponibilidad)
* GET `/api/v1/reservations` - Consultar reservas autorizadas
* GET `/api/v1/reservations/:id` - Consultar una reserva
* POST `/api/v1/reservations/:id/cancel` - Solicitar cancelacion
* POST `/api/v1/reservations/:id/confirm` - Confirmar reserva
* POST `/api/v1/reservations/:id/payments` - Registrar intento de pago o comprobante
* GET `/api/v1/reservations/:id/payments` - Consultar pagos de una reserva
* POST `/api/v1/payments/:id/verify` - Verificar pago manual (Propietario/Admin)
* POST `/api/v1/payments/webhook` - Recibir notificaciones de pasarela externa

## Partidos Amistosos
* POST `/api/v1/matches` - Crear partido asociado a reserva confirmada
* GET `/api/v1/matches` - Consultar partidos publicados
* GET `/api/v1/matches/:id` - Consultar un partido
* PATCH `/api/v1/matches/:id` - Actualizar partido
* POST `/api/v1/matches/:id/join` - Unirse a partido
* POST `/api/v1/matches/:id/leave` - Abandonar partido
* GET `/api/v1/matches/:id/participants` - Consultar participantes

## Administracion
* GET `/api/v1/admin/users` - Consultar usuarios
* GET `/api/v1/admin/reports` - Consultar incidencias y reportes
* PATCH `/api/v1/admin/users/:id/status` - Cambiar estado de cuenta
* GET `/api/v1/admin/statistics` - Consultar estadisticas generales