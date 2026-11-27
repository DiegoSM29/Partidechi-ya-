# Lineamientos de Interfaz y Diseño: Partidechi ya!

## Sistema de Diseño y Estilos
* **Framework CSS**: Tailwind CSS v4 con clases utilitarias orientadas a un diseño limpio y moderno.
* **Paleta de Colores Base**: 
  * Tonos principales orientados a la gama `emerald` (asociada al cesped deportivo y acciones de éxito).
  * Tonos neutros basados en la gama `slate` para fondos, tarjetas y tipografías.
* **Diseno Responsive**: Enfoque *mobile-first*, adaptandose fluidamente a telefonos moviles, tablets y pantallas de escritorio mediante contenedores flexibles y grillas adaptativas (`grid`).

## Estandares de Formularios y Validacion
* **Formularios Controlados**: Uso de estados locales de React para capturar los datos de entradas de texto, correos, contraseñas y selectores.
* **Validacion en Cliente**: Comprobacion previa de campos obligatorios, expresiones regulares para correos validos, contraseñas minimas de 8 caracteres y confirmacion de contraseñas identicas antes de disparar peticiones al servidor.
* **Retroalimentacion Visual**: 
  * Indicadores de carga (*spinners*) en botones durante peticiones asíncronas para evitar dobles envíos.
  * Alertas flotantes o mensajes descriptivos sincronizados con los errores devueltos por el backend (`{success: false, error: "..."}`).
* **Calendario mensual de cancha**: Propietarios y jugadores consultan un mes a la vez. Cada día indica si está disponible, cerrado, no tiene horario semanal configurado o no tiene turnos libres.
* **Cierre de Canchas**: Desde el calendario de cada cancha propia, el propietario puede cerrar un día actual/futuro que tenga horario semanal, revisar las reservas pendientes/confirmadas afectadas y confirmar en un diálogo modal; también puede reabrir un día cerrado. La reapertura no recupera reservas canceladas; los horarios vuelven a estar disponibles según el horario semanal y las reservas activas.
* **Notificaciones**: Los jugadores pueden consultar las notificaciones persistentes de cancelacion y marcar cada una como leida.