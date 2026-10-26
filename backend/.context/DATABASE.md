# Modelo de Datos: Partidechi ya!

Base de datos relacional implementada en PostgreSQL mediante Prisma ORM.

## Tablas y Estructura
* **usuarios**: id_usuario (PK), nombre, apellido, correo (unico), password_hash, rol (jugador, propietario, administrador), telefono, estado, fecha_registro.
* **canchas**: id_cancha (PK), id_propietario (FK -> usuarios), nombre, ubicacion, latitud, longitud, deporte, precio_hora, fecha_registro. Las coordenadas se verifican contra el departamento de Cochabamba, Bolivia.
* **horarios**: id_horario (PK), id_cancha (FK -> canchas), dia_semana (0 domingo a 6 sabado), hora_inicio y hora_fin. Cada fila registra un intervalo reservable; las horas sin una fila correspondiente no están disponibles.
* **reservas**: id_reserva (PK), id_usuario (FK -> usuarios), id_cancha (FK -> canchas), fecha, hora_inicio, hora_fin, monto_total, estado (pendiente/confirmada/cancelada/completada), fecha_creacion. Las reservas pendientes y confirmadas ocupan la franja y las canceladas la liberan. Una reserva pasa a confirmada cuando se aprueba o captura su pago.
* **pagos**: id_pago (PK), id_reserva (FK -> reservas), monto, metodo_pago, referencia, comprobante_url, estado, verificado_por (FK -> usuarios), fecha_pago, fecha_verificacion. Al aprobar un pago, la reserva asociada se confirma automaticamente.
* **partidos**: id_partido (PK), id_organizador (FK -> usuarios), id_reserva (FK -> reservas, opcional), nombre, deporte, fecha_hora, jugadores_maximos, descripcion, estado.
* **participantes**: id_participante (PK), id_partido (FK -> partidos), id_usuario (FK -> usuarios), estado, fecha_union.
* **notificaciones**: id_notificacion (PK), id_usuario (FK -> usuarios), titulo, mensaje, leida, fecha_creacion.

## Cuentas de Prueba / Credenciales de Desarrollo

> **Nota:** Estas cuentas están creadas en la base de datos local para pruebas de desarrollo e integración.

| Rol | Correo | Contraseña (Texto Plano) | Estado | Propósito / Uso |
|---|---|---|---|---|
| **Jugador** | `diego@gmail.com` | `diego123` | Activo | Probar registro, búsqueda, reservas y unirse a partidos. |
| **Propietario** | `adrian@gamil.com` | `adrian123` | Activo | Probar creación de canchas, horarios y verificación de pagos. |
| **Administrador** | `admin.prueba@partidechi.com` | `AdminPassword123` | Activo | Probar endpoints administrativos, usuarios y reportes. |