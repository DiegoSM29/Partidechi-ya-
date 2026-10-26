# Informe

## Autenticación de usuarios

El backend implementa registro, inicio y cierre de sesión mediante los endpoints `/api/v1/auth/register`, `/api/v1/auth/login` y `/api/v1/auth/logout`. En el registro se verifican los campos obligatorios, el formato básico del correo y que la contraseña tenga al menos ocho caracteres. El correo se limpia de espacios y se normaliza a minúsculas antes de buscarlo o guardarlo, y se rechaza si ya está asociado a otra cuenta.

Al iniciar sesión, el servidor busca al usuario por correo y compara la contraseña recibida con el hash almacenado. Los errores por correo o contraseña incorrectos se presentan como un mensaje común de credenciales inválidas; además, no se permite iniciar sesión a una cuenta que no esté activa. Al registrar o iniciar sesión correctamente se emite un JWT firmado que identifica al usuario y contiene su rol.

Las rutas protegidas esperan el token como `Authorization: Bearer <token>`. El middleware valida la firma y la vigencia, verifica que el usuario siga existiendo y activo, y comprueba que el token no haya sido revocado al cerrar sesión. La expiración predeterminada es de un día y se configura mediante `JWT_EXPIRES_IN`. El cierre de sesión no elimina el token del dispositivo: lo agrega a una lista de revocación en memoria hasta que expire. Esa implementación es práctica para una instancia local, pero su alcance y persistencia se describen en los apartados de variables de entorno y configuración de producción.

## Autorización y roles

El modelo de datos define tres roles: `JUGADOR`, `PROPIETARIO` y `ADMINISTRADOR`. El registro público únicamente acepta jugador o propietario; si se envía un rol no permitido, la solicitud se rechaza. Por ello, un usuario no puede obtener permisos de administrador simplemente manipulando el formulario de registro.

La autenticación confirma quién realiza la solicitud; el middleware de autorización determina si el rol de esa persona permite la operación. Por ejemplo, el acceso a la lista de canchas propias y las operaciones de creación, edición o eliminación de canchas requieren una sesión válida y el rol `PROPIETARIO`. La gestión de horarios aplica el mismo control. Los perfiles de usuario requieren autenticación, y las acciones de reservas y partidos están protegidas según su ruta y las reglas del servicio.

Además del rol, algunas operaciones verifican la relación concreta del usuario con el recurso. La creación de un partido desde una reserva exige que la reserva pertenezca al usuario autenticado; eliminar un partido exige que la persona sea su organizadora, que esté publicado y que se solicite con al menos 24 horas de anticipación. Para unirse, el servicio exige el rol de jugador, plazas disponibles y que el partido siga aceptando participantes dentro del límite de tiempo establecido. La base de datos garantiza que el mismo usuario no tenga dos registros de participación para el mismo partido.

Los listados y detalles públicos de canchas y partidos no requieren sesión en las rutas consultadas. Para mantener esta separación segura, las operaciones con identificadores deben continuar verificando la titularidad o relación del usuario en la lógica del servidor, y no confiar únicamente en que la interfaz oculte botones.

## Protección de contraseñas

Las contraseñas se procesan con `bcryptjs` y se persiste el resultado de `bcrypt.hash`, nunca la contraseña original en texto plano. Durante el acceso, `bcrypt.compare` comprueba la contraseña ingresada sin necesidad de recuperar la contraseña original. El parámetro `BCRYPT_ROUNDS` controla el coste del cálculo y actualmente usa 10 si no se especifica.

El serializador de respuestas públicas elimina el campo `password_hash` antes de devolver un usuario al cliente. Así se evita que el hash se incluya accidentalmente en respuestas de registro, inicio de sesión o perfil cuando se usa ese serializador.

La regla observada exige una longitud mínima de ocho caracteres. No se identificó, en el flujo revisado, una longitud máxima explícita, detección de contraseñas comunes, autenticación multifactor ni un proceso de recuperación de contraseña. Para un entorno público conviene definir esos requisitos y un límite superior razonable de entrada, y medir el coste de bcrypt en el hardware donde se desplegará para que dificulte ataques sin volver demasiado lentos los inicios de sesión legítimos.

## Validación y seguridad de entradas

La aplicación valida en el servidor los datos de autenticación y aplica verificaciones específicas en los servicios de negocio. Por ejemplo, el servicio de partidos convierte y comprueba los identificadores, valida que el nombre no esté vacío, que el máximo de jugadores sea un entero positivo y que la reserva exista, pertenezca al usuario y esté confirmada. Para las uniones también comprueba rol, estado del partido, duplicados, disponibilidad de plazas y reglas horarias. Estas comprobaciones del servidor son importantes porque las validaciones del navegador pueden evitarse enviando peticiones directamente a la API.

Express limita a 1 MB el tamaño de los cuerpos JSON. Prisma realiza las consultas a PostgreSQL y el esquema define tipos, relaciones, índices y restricciones de unicidad; estas restricciones complementan la validación de aplicación y protegen la consistencia de los datos, incluso si dos solicitudes llegan simultáneamente.

La configuración actual utiliza `cors()` sin una lista de orígenes permitidos, lo que deja la política de CORS abierta. En los archivos revisados tampoco se observó middleware global de esquemas de entrada, `helmet`, sanitización HTML o limitación de frecuencia de solicitudes. CORS no sustituye la autorización: controla qué navegadores pueden leer respuestas, pero no bloquea por sí mismo solicitudes directas a la API. Antes de una exposición pública se recomienda definir orígenes explícitos, validar de forma uniforme cuerpos, parámetros y consultas en cada ruta, y limitar especialmente intentos de inicio de sesión y otras operaciones sensibles.

## Variables de entorno

La configuración del backend carga las variables de entorno y se detiene con un error explícito si falta `DATABASE_URL` o `JWT_SECRET`. También admite `PORT`, `JWT_EXPIRES_IN` y `BCRYPT_ROUNDS`, con valores predeterminados para puerto, expiración y coste de bcrypt. En el despliegue Compose, el backend recibe `NODE_ENV=production`, la URL de base de datos y los valores necesarios para JWT y PayPal.

Compose exige `POSTGRES_PASSWORD` y `JWT_SECRET` mediante interpolación obligatoria; si no están definidos, no permite completar la configuración. La plantilla `.env.docker.example` incluye los parámetros de base de datos, puertos, configuración JWT, PayPal sandbox y URL de API. Los valores de puerto, nombre de base y expiración son configuración, no secretos; las contraseñas y claves de firma sí deben tratarse como secretos.

`VITE_API_URL` se utiliza como argumento durante la compilación del frontend. Como Vite inserta ese valor en los archivos JavaScript que descarga el navegador, puede ser visible para los usuarios y no debe emplearse para guardar contraseñas, claves privadas ni credenciales de servicios.

## Manejo seguro de credenciales

El archivo `.env` está excluido mediante `.gitignore`. El `.dockerignore` excluye tanto `.env` como otros archivos `.env.*`, evitando que se incluyan en el contexto enviado al construir las imágenes. La plantilla de Docker contiene valores descriptivos de ejemplo, que deben reemplazarse antes de ejecutar Compose. En la revisión local se comprobó que `POSTGRES_PASSWORD` y `JWT_SECRET` estaban definidos y no eran los marcadores de ejemplo; sus valores no se muestran en este informe.

La contraseña de PostgreSQL se utiliza para iniciar la base y también forma parte de `DATABASE_URL` que recibe el backend. Por ello, la plantilla recomienda usar caracteres seguros para URL o codificarlos correctamente, de modo que caracteres reservados no alteren la interpretación de la conexión. Los secretos deben ser aleatorios, diferentes entre desarrollo y producción, no compartirse por chat ni almacenarse en el repositorio. Si se sospecha exposición, hay que rotarlos; cambiar `JWT_SECRET` invalida los tokens JWT existentes.

En Compose, el puerto de PostgreSQL se enlaza a `127.0.0.1`, limitando el acceso directo a la máquina local. En cambio, los puertos del backend y frontend se publican en las interfaces de red del host según la configuración predeterminada. Esa diferencia es útil para el desarrollo local, pero debe revisarse para cada entorno y limitarse al tráfico necesario.

## Pruebas funcionales

Se ejecutó una construcción completa de las imágenes con Docker Compose y se inició el conjunto local de servicios. PostgreSQL y el backend informaron estado saludable. Se consultó `GET http://localhost:4000/api/v1/health`, que respondió HTTP 200, y se solicitó `http://localhost:8080`, que también respondió HTTP 200. Durante la compilación inicial del frontend se detectó que la imagen no contenía el archivo compartido `shared/cochabamba-department.json`; se actualizó el Dockerfile para copiarlo y la construcción posterior terminó correctamente.

En las pruebas funcionales realizadas durante la implementación de partidos se comprobaron los casos de unión concurrente y control de cupos, rechazo de una segunda unión del mismo usuario, salida y reingreso, rechazo de partidos en estados no permitidos y límite de tiempo para unirse. También se validaron la creación de un partido a partir de una reserva y las reglas de eliminación y anticipación. Como parte de las iteraciones se ejecutaron compilaciones del frontend, validación y estado de migraciones Prisma y comprobaciones de sintaxis del backend.

Estas comprobaciones confirman los flujos ejercitados en el entorno local, pero no equivalen a una suite automatizada completa. El script `npm test` del backend todavía es un marcador que termina con error e indica que no hay pruebas configuradas. Las pruebas de integración ejecutadas durante el desarrollo no están incorporadas como una suite persistente que pueda ejecutarse automáticamente en cada cambio. Además, durante la instalación de dependencias del backend se notificaron cuatro vulnerabilidades de severidad alta; se deben revisar con `npm audit` y resolver de manera controlada antes de un lanzamiento.

## Git y control de versiones

El repositorio se encuentra en la rama `feature/Adding-docker`. En la revisión actual, `.env` no aparece entre los cambios del árbol de trabajo y continúa excluido por `.gitignore`, por lo que sus credenciales locales no forman parte de los archivos preparados que se observaron. Las plantillas y la configuración Docker se pueden versionar porque no deben contener secretos reales.

Los archivos Docker y el informe aparecen sin seguimiento, mientras que `readme.md` aparece modificado. Esto indica que estos cambios todavía no están registrados en un commit. Antes de crear un commit, conviene inspeccionar `git status` y el diff, agregar solo los archivos que correspondan y verificar explícitamente que `.env`, credenciales, datos de usuarios o copias locales de bases de datos no estén incluidos. Esta separación permite compartir la configuración y documentación sin publicar valores secretos.

## Dockerfile

El Dockerfile del backend parte de `node:22-alpine`, establece `/app/backend` como directorio de trabajo, instala OpenSSL y usa `npm ci` con `package-lock.json` para obtener dependencias reproducibles. Después copia el esquema Prisma y el código requerido, genera Prisma Client y define el puerto del servicio. Al arrancar, ejecuta `prisma migrate deploy` y, si las migraciones terminan correctamente, inicia la API con `npm start`. Esto permite que una base nueva o pendiente reciba las migraciones versionadas antes de atender solicitudes.

El Dockerfile del frontend es multi-etapa: primero instala las dependencias, copia el código y el recurso compartido `shared/`, configura `VITE_API_URL` y genera la compilación de Vite; después copia solo el resultado compilado a una imagen Nginx. Nginx sirve los archivos estáticos y su configuración devuelve `index.html` para rutas de la aplicación de una sola página.

Ambas imágenes utilizan archivos lock y `npm ci`, pero no se declara explícitamente un usuario no privilegiado. El backend instala las dependencias del paquete sin separar las necesarias exclusivamente para desarrollo, y las imágenes base se especifican mediante etiquetas como `node:22-alpine` y `nginx:alpine`, que pueden apuntar a versiones actualizadas con el tiempo. Para endurecer estas imágenes se recomienda ejecutar con privilegios mínimos, reducir las dependencias de la imagen final y mantener las actualizaciones de imagen controladas y verificables.

## Docker Compose

El archivo Compose coordina tres servicios: `db` con PostgreSQL 16, `backend` con la API Express y `frontend` con Nginx. La base de datos usa un volumen nombrado (`postgres_data`) para conservar la información entre reinicios y un healthcheck basado en `pg_isready`. El backend no comienza hasta que la base de datos está saludable; a su vez, el frontend espera a que el backend informe estado saludable mediante su endpoint de salud.

El backend ejecuta las migraciones Prisma en su comando de inicio y cuenta con un healthcheck HTTP. Las dependencias de inicio se expresan con condiciones de salud y los servicios tienen políticas de reinicio. Los puertos y variables pueden cambiarse desde `.env`; las variables críticas son obligatorias. La configuración se validó con `docker compose config` y el arranque verificado se realizó con `docker compose up --build -d`.

El volumen hace que los datos de PostgreSQL sobrevivan a `docker compose down`. Ejecutar `docker compose down -v` también elimina el volumen y, por tanto, los datos guardados en esa base. La persistencia protege frente a la eliminación accidental del contenedor, pero no sustituye una estrategia de respaldo y restauración.

## Configuración de producción

Algunos elementos ya se aproximan a un despliegue productivo: el backend recibe `NODE_ENV=production`, el frontend se entrega como contenido estático desde Nginx, la base de datos tiene almacenamiento persistente y los servicios incluyen verificaciones de salud y aplicación de migraciones. Sin embargo, la configuración existente se preparó y verificó para ejecución local; no incluye por sí sola todos los controles de una instalación pública.

No están configurados TLS ni un proxy inverso, y CORS conserva una política abierta. El backend y el frontend se publican en las interfaces de red del host, mientras PostgreSQL se limita a loopback; la exposición debe ajustarse al diseño del servidor y al tráfico requerido. Tampoco se configuran copias de seguridad, restauración, monitoreo, alertas, centralización/retención de logs ni un procedimiento de actualización y reversión.

La lista de revocación JWT está guardada en memoria del proceso. Al reiniciar se pierde, y varias instancias no comparten esa información. Esto significa que un token revocado podría volver a aceptarse después de reiniciar, siempre que todavía no haya expirado; para un servicio con múltiples instancias se necesitaría un almacenamiento compartido con expiración. Compose también usa PayPal en modo sandbox por defecto, por lo que esa configuración no representa una integración de cobro real. Se deben revisar además las alertas de dependencias informadas por npm y definir controles operativos y de red antes de considerar el sistema listo para producción pública.

## Despliegue

El despliegue comprobado es local y se inicia desde la raíz del repositorio. Primero se configura el archivo `.env` a partir de `.env.docker.example`, con una contraseña de PostgreSQL y un secreto JWT propios. Luego se ejecuta:

```sh
docker compose up --build -d
```

La opción `--build` construye las imágenes con el código actual; `-d` deja los contenedores ejecutándose en segundo plano. El estado puede consultarse con `docker compose ps`. Una vez que los healthchecks terminan correctamente, la interfaz se encuentra en `http://localhost:8080`, la API en `http://localhost:4000/api/v1` y su endpoint de salud en `http://localhost:4000/api/v1/health`. PostgreSQL está disponible localmente en `localhost:5432` y el mapeo del puerto se limita a loopback.

Para detener los contenedores y conservar la base de datos se utiliza `docker compose down`. El despliegue local se verificó con respuestas HTTP 200 para el frontend y la API. No se verificó un despliegue remoto ni un dominio público. Para llevarlo a un servidor habría que configurar allí los secretos, dominio, TLS, CORS permitido, exposición de puertos, respaldos, monitoreo y un proceso de actualización y recuperación adecuado al entorno.
