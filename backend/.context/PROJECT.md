# Contexto del Proyecto: Partidechi ya!

## Vision General
Partidechi ya! es una aplicacion web diseñada para centralizar y facilitar la busqueda de canchas deportivas, la consulta de disponibilidad horaria, la gestion de reservas, pagos y la organizacion de partidos amistosos entre jugadores y propietarios.

## Actores del Sistema
* **Jugador**: Busca canchas, consulta disponibilidad, solicita reservas, registra pagos, organiza partidos amistosos, invita participantes y se une a encuentros.
* **Propietario**: Administra sus canchas, configura horarios y precios, visualiza reservas y verifica pagos.
* **Administrador**: Supervisa cuentas de usuario, revisa incidencias, gestiona estados de cuenta y consulta estadisticas generales de la plataforma.

## Reglas de Negocio Clave
* **Disponibilidad de Canchas**: Una cancha no puede tener dos reservas confirmadas con intervalos horarios superpuestos.
* **Horarios de Atencion**: Solo los intervalos registrados como horario de funcionamiento se pueden reservar; las horas no registradas no están disponibles.
* **Pago Obligatorio**: Una reserva que requiera pago anticipado solo se confirma despues de verificar el importe exigido.
* **Integridad de Partidos**: Un partido que requiera cancha debe estar asociado obligatoriamente a una reserva valida y confirmada.
* **Capacidad Maxima**: El numero de participantes de un partido no puede superar el limite establecido.