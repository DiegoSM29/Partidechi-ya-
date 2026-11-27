# Frontend - Partidechi ya!

Cliente web de "Partidechi ya!" construido con **React + Vite + Tailwind CSS v4 + React Router v7**, consumiendo el backend en `http://localhost:4000/api/v1`.

## Stack Tecnologico
* **Framework UI**: React 19 (JavaScript / JSX)
* **Build**: Vite
* **Estilos**: Tailwind CSS v4 (via plugin `@tailwindcss/vite`)
* **Enrutamiento**: React Router v7
* **HTTP**: Axios (cliente con interceptores)
* **Iconos**: lucide-react
* **Mapas**: Leaflet y teselas de OpenStreetMap, con busqueda y geocodificacion inversa de Nominatim

## Estructura de Carpetas
```
frontend/
├── index.html
├── vite.config.js            → Vite + React + Tailwind
├── .env                      → VITE_API_URL (URL del backend)
└── src/
    ├── main.jsx              → Punto de entrada (BrowserRouter + AuthProvider)
    ├── App.jsx               → Rutas publicas y protegidas
    ├── api/client.js         → Cliente Axios (baseURL /api/v1, inyecta JWT, maneja 401)
    ├── context/AuthContext.jsx → Estado global de sesion (user, token, login, register, logout)
    ├── utils/validators.js   → Validacion en cliente (correo, password >= 8, etc.)
    ├── utils/roles.js        → Mapeo rol -> vista principal y etiquetas/badges
    ├── components/           → ProtectedRoute, PublicOnlyRoute, Navbar, AuthLayout,
    │                           Alert, Spinner, LoadingScreen, FormFields, CourtMonthlyCalendar,
    │                           CourtLocationPicker, CourtLocationModal, CourtMapMarker
    └── pages/                → Login, Register, Profile, Reliability, OwnerCourts, CourtForm, NotFound
```

## Guia de Instalacion y Ejecucion

### 1. Instalar dependencias
```
cd frontend
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` basado en `.env.example`:
```
VITE_API_URL=http://localhost:4000/api/v1
```

### 3. Iniciar el Backend (en otra terminal)
```
cd backend
npm run dev        → http://localhost:4000/api/v1
```

### 4. Iniciar el Frontend
```
npm run dev        → http://localhost:5173
```

## Pruebas del Frontend

Pruebas unitarias y de componentes con **Vitest + React Testing Library**. No necesitan backend, base de datos ni navegador:

```powershell
cd frontend
npm test          # una pasada
npm run test:watch
```

Cubren las validaciones de login/registro y el renderizado de `Alert`, `Spinner` y `LoadingScreen`. Las pruebas viven en `frontend/test/`, igual que el backend usa `backend/test/`.

## Rutas de la Aplicacion (HU-01)
| Ruta | Acceso | Descripcion |
|---|---|---|
| `/login` | Publica | Inicio de sesion (validacion cliente + backend) |
| `/register` | Publica | Registro con selector de rol (Jugador/Propietario) |
| `/profile` | Protegida | Perfil del usuario autenticado, puntaje e historial de confiabilidad, restricciones, solicitud de revision y gestion administrativa |
| `/courts` | Propietario | Consulta, visualizacion del mapa y administracion de canchas propias |
| `/courts/new` | Propietario | Registro de cancha |
| `/courts/:id/edit` | Propietario | Edicion de cancha propia |
| `/courts/:id/schedules` | Propietario | Configurar horarios, consultar el calendario mensual y cerrar/reabrir días de esa cancha |
| `/courts/:id/availability` | Protegida | Consultar el calendario mensual y los turnos de una fecha para una cancha |
| `/reservations/new` | Protegida | Solicitud de reserva desde un horario disponible |
| `/reservations/:id/pay` | Protegida | Pago PayPal/manual y confirmacion automatica de la reserva |
| `/reservations` | Jugador | Consulta de reservas proximas, pasadas y canceladas |
| `/reservations/:id` | Jugador | Detalle persistente de una reserva propia |
| `/reservations/owner` | Propietario | Consulta de reservas propias, estados de pago y verificacion de comprobantes |
| `/notifications` | Protegida | Consulta de notificaciones propias y marcado como leídas |
| `/matches`, `/matches/create`, `/matches/:id` | Protegida | Partidos amistosos asociados a reservas confirmadas |
| `/` | — | Redirige a `/login` o `/profile` segun sesion |
| `*` | — | Pagina 404 |

## Gestion de Canchas

La vista **Mis canchas** muestra primero las canchas del propietario autenticado. Cada registro ofrece acciones para ver su ubicación en un modal, editarla o eliminarla con confirmación. La API aplica la misma restricción por propietario, independientemente de los controles de interfaz.

El formulario registra nombre, ubicación, deporte y precio por hora. Al crear o editar una cancha se pueden añadir y quitar hasta 5 imágenes JPG, PNG o WebP de hasta 5 MB cada una; se muestran en la búsqueda y en el detalle de disponibilidad. El deporte se selecciona entre Fútbol 5, Fútbol 8, Fútbol 11, Wally, Pádel y Frontón.

### Ubicacion en el Mapa

* El mapa se limita visualmente al departamento de Cochabamba, Bolivia. La selección de puntos se verifica por país y departamento antes de habilitar el guardado.
* Se puede marcar una ubicación con un clic, buscar una dirección escrita o usar la ubicación actual del dispositivo.
* Las direcciones encontradas se pueden editar manualmente. Si no hay una calle disponible, el formulario no inventa una dirección y permite escribirla.
* Cada cancha guarda latitud y longitud además del texto de la dirección. El pin tiene forma de gota; al mover el mapa no cambia el zoom actual.
* El modal de ubicación muestra el punto registrado y mantiene el botón de cierre fijo, independiente del desplazamiento del mapa.

Los mapas y resultados de dirección usan OpenStreetMap y Nominatim, por lo que necesitan conexión a Internet. La geolocalización depende del permiso del navegador y normalmente requiere HTTPS; `localhost` se considera un origen seguro durante el desarrollo.

Para que el guardado y la edición de coordenadas funcionen, aplica las migraciones pendientes desde `backend` con `npx prisma migrate deploy` y genera el cliente con `npx prisma generate`.

## Horarios y Disponibilidad

Desde **Mis canchas**, el botón de calendario abre `/courts/:id/schedules`. La vista permite:

* Registrar y eliminar franjas semanales de funcionamiento.
* Las franjas no registradas no se ofrecen para reservar.
* Consultar un mes a la vez; cada día muestra si hay horarios disponibles, está cerrado, no tiene horario semanal o no quedan turnos libres.
* Seleccionar un día para consultar sus turnos disponibles y reservados.
* Cerrar o reabrir ese día. Solo se puede cerrar si hay un horario semanal configurado para esa fecha; las reservas afectadas se revisan en un modal antes de confirmar.

La API rechaza horarios solapados, reservas fuera de los intervalos registrados y reservas que choquen con otra reserva activa.

## Calendario Mensual y Cierres Puntuales

No existe una sección global para cerrar canchas. Desde **Mis canchas**, el propietario abre el calendario de una cancha específica y selecciona el día que desea cerrar o reabrir. Antes de aplicar el cierre, se muestran las reservas pendientes o confirmadas de esa cancha y fecha para confirmar la operación.

El calendario mensual está disponible tanto para propietarios como para jugadores. Cada día distingue entre disponibilidad, cierre, ausencia de horario semanal y ausencia de turnos libres. El calendario se genera con los horarios semanales, las reservas pendientes/confirmadas y los cierres de ese mes.

El backend aplica el cierre, cancela las reservas y partidos asociados de forma atómica, y notifica a los jugadores afectados en `/notifications`. Los pagos asociados conservan su importe y estado. Un cierre solo afecta la cancha y fecha indicadas, no altera horarios semanales, e impide nuevos cierres duplicados y reservas para ese día. Los jugadores no pierden puntos por la cancelación; al propietario se le descuentan 15 puntos por partido organizado, hasta 30 por operación.

Al reabrir, se elimina solo el cierre de la cancha y fecha seleccionadas. La disponibilidad vuelve a generarse con los horarios semanales registrados, descontando las reservas activas. Las reservas canceladas por el cierre permanecen canceladas y los jugadores deben crear una nueva reserva. La API valida la propiedad de la cancha.

## Reservas y Pagos del Propietario

La vista `/reservations/owner` permite al propietario consultar las reservas de sus canchas y verificar pagos:

* Filtros por cancha, estado de la reserva y estado del pago.
* Resumen de reservas encontradas, confirmadas, pendientes de pago y pagos por verificar.
* Detalle de cada reserva con fecha, horario, monto, jugador, correo y estado.
* Lista de pagos con método, monto, referencia, comprobante y fechas.
* Botones **Aprobar y confirmar** o **Rechazar** para pagos pendientes. Al aprobar, el backend confirma la reserva automáticamente en la misma transaccion.
* La API fuerza el filtro por propietario, por lo que no es posible consultar ni verificar reservas de canchas ajenas.

El flujo de pago del jugador (`/reservations/:id/pay`) captura el pago de PayPal al regresar del checkout y confirma la reserva automaticamente. La pantalla de exito permite crear un partido con esa reserva. Tambien se puede registrar un pago manual con referencia y enlace de comprobante para que el propietario lo verifique.

## Consulta de Reservas del Jugador

La vista `/reservations` permite al jugador consultar sus reservas próximas, pasadas y canceladas. Cada tarjeta muestra la cancha, ubicación, fecha, horario, importe, estado de reserva y los estados de pago disponibles. El detalle se abre en `/reservations/:id` y vuelve a consultar la API por identificador, sin depender del estado temporal de navegación. El backend limita tanto el listado como el detalle a las reservas autorizadas del usuario autenticado. Si el jugador aún no tiene reservas, la vista ofrece un acceso para buscar canchas.

## Partidos Amistosos y Navegacion

La creacion de partidos (`/matches/create`) muestra un resumen de confirmacion antes de enviar la solicitud: reserva, cancha, fecha, hora, nombre, deporte, capacidad del partido y descripcion. La capacidad se establece por partido; el propietario ya no configura un limite de jugadores para la cancha. La pantalla advierte que, una vez creado, el partido no podra modificarse. El backend rechaza las actualizaciones del organizador; solo un administrador puede intervenir para moderar el partido.

En el detalle del partido, los jugadores pueden unirse solo si el encuentro sigue publicado y tiene plazas libres. La capacidad disponible se actualiza al confirmar la inscripcion; no se duplican participantes, y el backend serializa las inscripciones para evitar exceder el cupo ante solicitudes simultaneas. Un participante que abandono puede volver a unirse si queda espacio; abandonar despues de confirmar descuenta 5 puntos y cada nuevo abandono tras volver a unirse vuelve a descontarlos. Al cancelar, el organizador recibe una advertencia: si hay al menos otro participante confirmado, pierde 10 puntos y estos reciben una notificacion; de lo contrario no hay descuento. La cancelacion conserva el partido y no afecta el puntaje de los jugadores. Su reserva confirmada puede reutilizarse para crear otro partido, manteniendo el encuentro cancelado en el historial.

## Puntaje de Confiabilidad (HU-12)

El perfil (`/profile`) incluye el puntaje de confiabilidad de 0 a 100, los permisos actuales y cada variación con motivo, fecha y puntaje resultante. Los usuarios pueden solicitar la revisión de un descuento desde su historial. Los administradores gestionan allí los reportes, apelaciones y correcciones; cada decisión se notifica y se conserva en el historial. El puntaje del organizador se muestra en las tarjetas y el detalle del partido, y el de cada participante aceptado en el detalle, para que otros jugadores puedan consultarlo.

Los organizadores pueden reportar la inasistencia de un participante aceptado desde el detalle de un partido realizado. El descuento de 20 puntos no se aplica hasta la validación administrativa. Al revisar un cierre de cancha, el propietario ve cuántos partidos organizados se cancelarán y el descuento estimado (15 puntos por partido, máximo 30 por operación).

Las restricciones por puntaje se aplican en el backend y se muestran en la página: desde 60 puntos se mantiene la actividad con advertencia; bajo 60 se restringen acciones de unirse a partidos o registrar canchas; bajo 40 se restringen además las reservas del jugador y la publicación de disponibilidad del propietario. Las reservas/partidos existentes no se cancelan y no hay recuperación automática por actividad.

La asistencia se confirma al unirse y solo puede confirmarse hasta 30 minutos antes del inicio. Antes de unirse, el jugador ve un rango informativo del aporte por persona y puede abrir un mapa de la cancha; estos controles no aparecen como aviso de pago para otros roles ni para quienes ya confirmaron. No se cobra ni se abre PayPal desde la confirmacion de asistencia. El enlace "Organizar partido" conserva el identificador de la reserva y recibe la respuesta del endpoint de creacion con la estructura esperada.

En `/courts/:id/schedules`, las franjas nuevas se agregan primero a una lista temporal. Solo se guardan en el servidor al pulsar "Guardar horarios"; las franjas pendientes se pueden quitar antes de guardarlas.

La barra superior resalta la pestaña activa con fondo y borde verde:

* **Buscar canchas** en `/courts/search`, disponibilidad, solicitud de reserva y pago.
* **Partidos** en `/matches` y el detalle de un partido.
* **Crear partido** en `/matches/create` y `/matches/new`.
* **Mis canchas** en la gestion de canchas, horarios y edicion.
* **Reservas** en el panel de reservas del propietario.
* **Perfil** en `/profile`, ademas de las pestañas publicas de inicio de sesion y registro.

## Flujo de Autenticacion
1. El cliente guarda el JWT en `LocalStorage` (`partidechi_token`).
2. El interceptor de Axios inyecta `Authorization: Bearer <token>` en cada peticion.
3. `AuthContext` valida la sesion al cargar la app con `GET /users/me`.
4. Si el backend responde `401` en una ruta protegida (token expirado/revocado), el interceptor limpia la sesion y redirige a `/login`.
5. `POST /auth/logout` revoca el token en el backend y limpia el estado local.
