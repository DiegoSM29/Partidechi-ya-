# Frontend - Partidechi ya!

Cliente web de "Partidechi ya!" construido con **React + Vite + Tailwind CSS v4 + React Router v7**, consumiendo el backend en `http://localhost:4000/api/v1`.

## Stack Tecnologico
* **Framework UI**: React 19 (JavaScript / JSX)
* **Build**: Vite
* **Estilos**: Tailwind CSS v4 (via plugin `@tailwindcss/vite`)
* **Enrutamiento**: React Router v7
* **HTTP**: Axios (cliente con interceptores)
* **Iconos**: lucide-react

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
    │                           Alert, Spinner, LoadingScreen, FormFields
    └── pages/                → Login, Register, Profile, NotFound
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
| `/` | — | Redirige a `/login` o `/profile` segun sesion |
| `*` | — | Pagina 404 |

## Flujo de Autenticacion
1. El cliente guarda el JWT en `LocalStorage` (`partidechi_token`).
2. El interceptor de Axios inyecta `Authorization: Bearer <token>` en cada peticion.
3. `AuthContext` valida la sesion al cargar la app con `GET /users/me`.
4. Si el backend responde `401` en una ruta protegida (token expirado/revocado), el interceptor limpia la sesion y redirige a `/login`.
5. `POST /auth/logout` revoca el token en el backend y limpia el estado local.
