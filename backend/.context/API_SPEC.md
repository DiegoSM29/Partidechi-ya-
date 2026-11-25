# Especificacion de Endpoints REST: Partidechi ya!

Todos los endpoints operan bajo el prefijo base `/api/v1`.

## Autenticacion y Usuarios
* POST `/api/v1/auth/register` - Registrar una cuenta
* POST `/api/v1/auth/login` - Iniciar sesion y obtener token JWT
* POST `/api/v1/auth/logout` - Cerrar sesion
* GET `/api/v1/users/me` - Consultar perfil propio
* PATCH `/api/v1/users/me` - Actualizar perfil propio
* GET `/api/v1/reliability` - Consultar puntaje, permisos e historial propios
* POST `/api/v1/reliability/history/:id/reviews` - Solicitar revision de un descuento
* GET `/api/v1/reliability/admin/reports` y PATCH `/api/v1/reliability/admin/reports/:id` - Consultar y resolver reportes de inasistencia (Administrador)
* GET `/api/v1/reliability/admin/reviews` y PATCH `/api/v1/reliability/admin/reviews/:id` - Consultar y resolver apelaciones (Administrador)
* PATCH `/api/v1/reliability/admin/users/:id/score` - Corregir el puntaje de un usuario (Administrador)

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
* GET `/api/v1/courts/:id/calendar?mes=YYYY-MM` - Consultar disponibilidad mensual por día

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
* DELETE `/api/v1/matches/:id` - Cancelar un partido propio (con 24 horas de anticipacion como minimo)
* PATCH `/api/v1/matches/:id` - Moderar partido (solo administrador; el organizador no puede modificarlo tras crearlo)
* POST `/api/v1/matches/:id/join` - Confirmar asistencia a partido publicado con plazas hasta 30 minutos antes (solo jugador; sin duplicados)
* POST `/api/v1/matches/:id/leave` - Abandonar partido
* GET `/api/v1/matches/:id/participants` - Consultar participantes
* POST `/api/v1/matches/:id/no-show-reports` - Reportar la inasistencia de un participante aceptado (organizador)

Solo el organizador puede cancelar su partido activo y unicamente si faltan al menos 24 horas para su inicio. Si hay al menos otro participante confirmado, se descuentan 10 puntos al organizador y se notifica a los participantes; de lo contrario no hay descuento. El partido se conserva como cancelado. Abandonar un partido aceptado descuenta 5 puntos al jugador. El backend valida identidad y plazo independientemente de la interfaz.

## Administracion
* GET `/api/v1/admin/users` - Consultar usuarios
* GET `/api/v1/admin/reports` - Consultar incidencias y reportes
* PATCH `/api/v1/admin/users/:id/status` - Cambiar estado de cuenta
* GET `/api/v1/admin/statistics` - Consultar estadisticas generales

## Cierres Puntuales y Notificaciones
* POST `/api/v1/courts/closures/preview` - Revisar canchas propias y reservas afectadas (Propietario)
* POST `/api/v1/courts/closures` - Aplicar cierre de canchas seleccionadas para una fecha (Propietario)
* GET `/api/v1/courts/closures?fecha=YYYY-MM-DD` - Consultar cierres de canchas propias por fecha (Propietario)
* DELETE `/api/v1/courts/:id/closures?fecha=YYYY-MM-DD` - Reabrir una cancha propia para esa fecha (Propietario)
* GET `/api/v1/notifications` - Consultar notificaciones propias
* PATCH `/api/v1/notifications/:id/read` - Marcar una notificación propia como leída

El cierre cancela las reservas pendientes o confirmadas y notifica a los jugadores en una transacción. No admite fechas pasadas, cierres duplicados ni días sin horario semanal, y no modifica pagos ni horarios semanales. La consulta y reapertura solo operan sobre cierres de canchas del propietario autenticado. Al reabrir, la disponibilidad vuelve a derivarse de los horarios semanales descontando reservas activas; las reservas canceladas no se reactivan. El propietario realiza estas acciones desde el calendario mensual de cada cancha.