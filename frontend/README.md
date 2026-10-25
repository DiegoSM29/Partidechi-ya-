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
    │                           Alert, Spinner, LoadingScreen, FormFields,
    │                           CourtLocationPicker, CourtLocationModal, CourtMapMarker
    └── pages/                → Login, Register, Profile, OwnerCourts, CourtForm, NotFound
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

## Rutas de la Aplicacion (HU-01)
| Ruta | Acceso | Descripcion |
|---|---|---|
| `/login` | Publica | Inicio de sesion (validacion cliente + backend) |
| `/register` | Publica | Registro con selector de rol (Jugador/Propietario) |
| `/profile` | Protegida | Perfil del usuario autenticado + cierre de sesion |
| `/courts` | Propietario | Consulta, visualizacion del mapa y administracion de canchas propias |
| `/courts/new` | Propietario | Registro de cancha |
| `/courts/:id/edit` | Propietario | Edicion de cancha propia |
| `/courts/:id/schedules` | Propietario | Configuracion de horarios registrados y consulta de disponibilidad |
| `/reservations/new` | Protegida | Solicitud de reserva desde un horario disponible |
| `/reservations/:id/pay` | Protegida | Pago PayPal/manual y confirmacion automatica de la reserva |
| `/reservations/owner` | Propietario | Consulta de reservas propias, estados de pago y verificacion de comprobantes |
| `/matches`, `/matches/create`, `/matches/:id` | Protegida | Partidos amistosos asociados a reservas confirmadas |
| `/` | — | Redirige a `/login` o `/profile` segun sesion |
| `*` | — | Pagina 404 |

## Gestion de Canchas

La vista **Mis canchas** muestra primero las canchas del propietario autenticado. Cada registro ofrece acciones para ver su ubicación en un modal, editarla o eliminarla con confirmación. La API aplica la misma restricción por propietario, independientemente de los controles de interfaz.

El formulario registra nombre, ubicación, deporte y precio por hora. El deporte se selecciona entre Fútbol 5, Fútbol 8, Fútbol 11, Wally, Pádel y Frontón.

### Ubicacion en el Mapa

* El mapa se limita visualmente al departamento de Cochabamba, Bolivia. La selección de puntos se verifica por país y departamento antes de habilitar el guardado.
* Se puede marcar una ubicación con un clic, buscar una dirección escrita o usar la ubicación actual del dispositivo.
* Las direcciones encontradas se pueden editar manualmente. Si no hay una calle disponible, el formulario no inventa una dirección y permite escribirla.
* Cada cancha guarda latitud y longitud además del texto de la dirección. El pin tiene forma de gota; al mover el mapa no cambia el zoom actual.
* El modal de ubicación muestra el punto registrado y mantiene el botón de cierre fijo, independiente del desplazamiento del mapa.

Los mapas y resultados de dirección usan OpenStreetMap y Nominatim, por lo que necesitan conexión a Internet. La geolocalización depende del permiso del navegador y normalmente requiere HTTPS; `localhost` se considera un origen seguro durante el desarrollo.

Para que el guardado y la edición de coordenadas funcionen, aplica las migraciones pendientes desde `backend` con `npx prisma migrate dev` y genera el cliente con `npx prisma generate`.

## Horarios y Disponibilidad

Desde **Mis canchas**, el botón de calendario abre `/courts/:id/schedules`. La vista permite:

* Registrar y eliminar franjas semanales de funcionamiento.
* Las franjas no registradas no se ofrecen para reservar.
* Consultar la disponibilidad resultante para una fecha, mostrando turnos disponibles y reservados.

La API rechaza horarios solapados, reservas fuera de los intervalos registrados y reservas que choquen con otra reserva activa.

## Reservas y Pagos del Propietario

La vista `/reservations/owner` permite al propietario consultar las reservas de sus canchas y verificar pagos:

* Filtros por cancha, estado de la reserva y estado del pago.
* Resumen de reservas encontradas, confirmadas, pendientes de pago y pagos por verificar.
* Detalle de cada reserva con fecha, horario, monto, jugador, correo y estado.
* Lista de pagos con método, monto, referencia, comprobante y fechas.
* Botones **Aprobar y confirmar** o **Rechazar** para pagos pendientes. Al aprobar, el backend confirma la reserva automáticamente en la misma transaccion.
* La API fuerza el filtro por propietario, por lo que no es posible consultar ni verificar reservas de canchas ajenas.

El flujo de pago del jugador (`/reservations/:id/pay`) captura el pago de PayPal al regresar del checkout y confirma la reserva automaticamente. La pantalla de exito permite crear un partido con esa reserva. Tambien se puede registrar un pago manual con referencia y enlace de comprobante para que el propietario lo verifique.

## Flujo de Autenticacion
1. El cliente guarda el JWT en `LocalStorage` (`partidechi_token`).
2. El interceptor de Axios inyecta `Authorization: Bearer <token>` en cada peticion.
3. `AuthContext` valida la sesion al cargar la app con `GET /users/me`.
4. Si el backend responde `401` en una ruta protegida (token expirado/revocado), el interceptor limpia la sesion y redirige a `/login`.
5. `POST /auth/logout` revoca el token en el backend y limpia el estado local.
