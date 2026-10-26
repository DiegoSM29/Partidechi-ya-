# Especificacion de Endpoints REST: Partidechi ya!

Todos los endpoints operan bajo el prefijo base `/api/v1`.

## Autenticacion y Usuarios
* POST `/api/v1/auth/register` - Registrar una cuenta
* POST `/api/v1/auth/login` - Iniciar sesion y obtener token JWT
* POST `/api/v1/auth/logout` - Cerrar sesion
* GET `/api/v1/users/me` - Consultar perfil propio
* PATCH `/api/v1/users/me` - Actualizar perfil propio

## Canchas y Disponibilidad
* GET `/api/v1/courts` - Consultar canchas disponibles
* GET `/api/v1/courts/mine` - Consultar las canchas propias (Propietario)
* POST `/api/v1/courts` - Registrar una cancha con `ubicacion`, `latitud` y `longitud` dentro del departamento de Cochabamba, Bolivia (Propietario)
* PATCH `/api/v1/courts/:id` - Actualizar una cancha propia y validar sus coordenadas (Propietario)
* DELETE `/api/v1/courts/:id` - Eliminar una cancha propia (Propietario)
* GET `/api/v1/courts/:id/schedules` - Consultar intervalos de funcionamiento registrados (alias `/horarios`)
* POST `/api/v1/courts/:id/schedules` - Registrar horarios de funcionamiento (Propietario)
* PUT `/api/v1/courts/:id/schedules` - Reemplazar el horario semanal de funcionamiento (Propietario)
* PATCH `/api/v1/courts/:id/schedules/:scheduleId` - Editar una franja horaria (Propietario)
* DELETE `/api/v1/courts/:id/schedules/:scheduleId` - Eliminar una franja horaria (Propietario)
* GET `/api/v1/courts/:id/availability` - Consultar turnos dentro de horarios registrados, excluyendo reservas

## Reservas y Pagos
* POST `/api/v1/reservations` - Solicitar reserva (con transaccion de disponibilidad)
* GET `/api/v1/reservations` - Consultar reservas autorizadas; acepta filtros `id_cancha`, `estado`, `estado_pago`
* GET `/api/v1/reservations/:id` - Consultar una reserva con sus pagos y datos del jugador
* POST `/api/v1/reservations/:id/cancel` - Solicitar cancelacion
* POST `/api/v1/reservations/:id/confirm` - Confirmar reserva
* POST `/api/v1/reservations/:id/payments` - Registrar intento de pago o comprobante
* GET `/api/v1/reservations/:id/payments` - Consultar pagos de una reserva
* POST `/api/v1/reservations/:id/payments/paypal/capture` - Capturar pago PayPal y confirmar automaticamente la reserva
* POST `/api/v1/payments/:id/verify` - Verificar pago manual (Propietario/Admin); al aprobar se confirma la reserva
* POST `/api/v1/payments/webhook` - Recibir notificaciones de pasarela externa

## Partidos Amistosos
* POST `/api/v1/matches` - Crear partido asociado a reserva confirmada
* GET `/api/v1/matches` - Consultar partidos publicados
* GET `/api/v1/matches/:id` - Consultar un partido
* DELETE `/api/v1/matches/:id` - Eliminar un partido publicado propio con al menos 24 horas de anticipacion
* PATCH `/api/v1/matches/:id` - Moderar partido (solo administrador; el organizador no puede modificarlo tras crearlo)
* POST `/api/v1/matches/:id/join` - Unirse a partido
* POST `/api/v1/matches/:id/leave` - Abandonar partido
* GET `/api/v1/matches/:id/participants` - Consultar participantes

Solo el organizador puede eliminar su partido publicado y unicamente si faltan al menos 24 horas para su inicio. El backend valida identidad y plazo independientemente de la interfaz.

## Administracion
* GET `/api/v1/admin/users` - Consultar usuarios
* GET `/api/v1/admin/reports` - Consultar incidencias y reportes
* PATCH `/api/v1/admin/users/:id/status` - Cambiar estado de cuenta
* GET `/api/v1/admin/statistics` - Consultar estadisticas generales