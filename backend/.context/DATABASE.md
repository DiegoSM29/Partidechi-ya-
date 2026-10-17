# Modelo de Datos: Partidechi ya!

Base de datos relacional implementada en PostgreSQL mediante Prisma ORM.

## Tablas y Estructura
* **usuarios**: id_usuario (PK), nombre, apellido, correo (unico), password_hash, rol (jugador, propietario, administrador), telefono, estado, fecha_registro.
* **canchas**: id_cancha (PK), id_propietario (FK -> usuarios), nombre, descripcion, direccion, deporte, precio_hora, capacidad, estado, fecha_registro.
* **horarios**: id_horario (PK), id_cancha (FK -> canchas), dia_semana, hora_inicio, hora_fin, estado (disponible/bloqueado).
* **reservas**: id_reserva (PK), id_usuario (FK -> usuarios), id_cancha (FK -> canchas), fecha, hora_inicio, hora_fin, monto_total, estado, fecha_creacion.
* **pagos**: id_pago (PK), id_reserva (FK -> reservas), monto, metodo_pago, referencia, comprobante_url, estado, verificado_por (FK -> usuarios), fecha_pago, fecha_verificacion.
* **partidos**: id_partido (PK), id_organizador (FK -> usuarios), id_reserva (FK -> reservas, opcional), nombre, deporte, fecha_hora, jugadores_maximos, descripcion, estado.
* **participantes**: id_participante (PK), id_partido (FK -> partidos), id_usuario (FK -> usuarios), estado, fecha_union.
* **notificaciones**: id_notificacion (PK), id_usuario (FK -> usuarios), titulo, mensaje, leida, fecha_creacion.