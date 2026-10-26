# Contexto del Proyecto Frontend: Partidechi ya!

## Vision General
El frontend de "Partidechi ya!" es una aplicacion web interactiva desarrollada para que jugadores y propietarios gestionen la busqueda de canchas deportivas, reservas, pagos y la organizacion de partidos amistosos de manera rapida y fluida.

## Alcance de Modulos (Historias de Usuario)
* **HU-01 (Autenticacion)**: Registro de cuentas con seleccion de rol (Jugador/Propietario), inicio de sesion seguro, gestion de perfil y cierre de sesiones con JWT.
* **HU-02 y HU-03 (Panel de Propietario)**: Consulta, registro, edicion y eliminacion de canchas propias (nombre, ubicacion elegida en mapa dentro del departamento de Cochabamba, deporte entre futbol 5/8/11, wally, padel y fronton, y precio), asi como configuracion de los intervalos reservables. Solo las franjas registradas pueden reservarse; las horas no registradas no están disponibles.
* **HU-04 (Busqueda y Filtros)**: Interfaz de busqueda avanzada para jugadores filtrando por ubicacion, deporte, precio y fecha con visualizacion de disponibilidad.
* **HU-05 y HU-08 (Reservas y Pagos)**: Flujo de solicitud de reservas con validacion de disponibilidad, calculo de importes, subida de comprobantes y panel del propietario para consultar reservas, revisar estados de pago y verificar comprobantes. Al aprobar el pago, la reserva se confirma automaticamente y queda habilitada para organizar partidos.
* **HU-06 y HU-07 (Partidos Amistosos)**: Creacion de partidos asociados a reservas confirmadas, gestion de plazas por partido, e interfaz para que jugadores se unan o abandonen encuentros publicados.