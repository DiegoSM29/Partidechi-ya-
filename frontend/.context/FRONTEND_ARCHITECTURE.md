# Arquitectura del Frontend: Partidechi ya!

## Stack Tecnologico
* **Framework**: React 19
* **Empaquetador**: Vite 8
* **Estilos**: Tailwind CSS v4
* **Enrutamiento**: React Router v7
* **Cliente HTTP**: Axios
* **Mapas**: Leaflet + OpenStreetMap (sin clave de API)

## Estructura de Directorios (`src/`)
* `src/api/`: Cliente centralizado de Axios, interceptores de peticion/respuesta y manejo de errores.
* `src/context/`: Estado global de la aplicacion (ej. `AuthContext` para sesion de usuario).
* `src/routes/`: Gestion de rutas publicas, protegidas (`ProtectedRoute`) y redirecciones por rol.
* `src/components/`: Componentes reutilizables de interfaz (Navbar, Alertas, Modales, Formularios, Spinners).
* `src/views/`: Paginas y vistas principales mapeadas a las rutas de la aplicacion.

## Integracion con API REST
* **URL Base**: Apunta por defecto a `http://localhost:4000/api/v1` (configurable mediante variables de entorno `VITE_API_URL`).
* **Interceptores de Axios**:
  * *Request*: Inyecta automaticamente el token JWT almacenado en `LocalStorage` bajo el encabezado `Authorization: Bearer <token>`.
  * *Response*: Detecta codigos de error `401 Unauthorized` (tokens expirados o revocados), limpiando la sesion y redirigiendo al usuario a la vista de login.