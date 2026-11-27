# Pruebas de carga con Grafana k6

Estas pruebas se ejecutan **desde la PC local** y apuntan a una **base PostgreSQL
local**, no a Supabase. Asi se mide la aplicacion (Express + Prisma + React) y no
los limites del plan gratuito de Supabase.

## Que se mide

- `http_req_duration`: tiempo de respuesta de la API.
- `http_req_failed`: porcentaje de respuestas no esperadas (5xx o estados fuera
  de los permitidos).
- `http_reqs`: peticiones por segundo.
- `vus_max`: usuarios virtuales concurrentes alcanzados.

Objetivos (umbrales en `k6/config.js`):

| Metrica | Objetivo |
| --- | --- |
| p95 | < 500 ms |
| p99 | < 2 s |
| Errores no esperados | < 1% |

La mezcla de trabajo es ~85% lecturas y ~15% escrituras:

- Lecturas: listado de canchas, detalle, disponibilidad, partidos, reservas y
  notificaciones.
- Escrituras: crear reserva y unirse a un partido.
- 5% extra: carga del HTML del frontend (`GET /` en Vite preview).

k6 **no ejecuta JavaScript del navegador**: mide el tiempo de respuesta del HTML
y de la API. Para medir el render real de React usa Lighthouse o las DevTools del
navegador; esta prueba responde "cuanto tarda el servidor en entregar la pagina y
sus datos".

## Requisitos

1. Docker Desktop iniciado con el PostgreSQL local del proyecto.
2. Dependencias del backend instaladas (`backend/node_modules`).
3. k6 instalado. En esta maquina quedo en:
   `C:\Program Files\k6\k6.exe`
4. Base migrada al dia:
   ```powershell
   cd backend
   npx prisma migrate deploy
   npx prisma generate
   ```

## 1. Preparar la base y los datos

Desde la raiz del repositorio, carga las credenciales del `.env` raiz y ejecuta
el seed. No se imprime la cadena de conexion:

```powershell
$envMap = @{}
Get-Content .env | Where-Object { $_ -match "=" -and $_ -notmatch "^\s*#" } | ForEach-Object {
  $k, $v = $_ -split "=", 2
  $envMap[$k.Trim()] = $v.Trim()
}
$env:DATABASE_URL = "postgresql://$($envMap['POSTGRES_USER']):$($envMap['POSTGRES_PASSWORD'])@127.0.0.1:5432/$($envMap['POSTGRES_DB'])?schema=public"

node tests/load/seed.js
```

El seed crea 1 propietario, 1000 jugadores, 20 canchas, 100 partidos, 1100
reservas y 2000 notificaciones. Tambien firma 1000 JWT en
`tests/load/k6/data/tokens.json` (ignorado por git).

## 2. Levantar backend y frontend locales

Backend en el puerto 4100 contra la base local:

```powershell
cd backend
$env:DATABASE_URL = "postgresql://.../partidechi_db?schema=public"
$env:PORT = "4100"
npm start
```

Frontend compilado apuntando a ese backend, en el puerto 4173:

```powershell
cd frontend
$env:VITE_API_URL = "http://localhost:4100/api/v1"
npm run build
npm run preview -- --port 4173 --host 127.0.0.1
```

Verifica:

```powershell
Invoke-WebRequest http://localhost:4100/api/v1/health
Invoke-WebRequest http://localhost:4173/
```

## 3. Ejecutar k6

Abre otra terminal:

```powershell
cd tests\load\k6
& "C:\Program Files\k6\k6.exe" run smoke.js
```

Si el humo pasa, ejecuta la carga objetivo:

```powershell
& "C:\Program Files\k6\k6.exe" run load-1000.js
```

Para ver la curva de degradacion:

```powershell
& "C:\Program Files\k6\k6.exe" run ramp-up.js
```

Para una carga intermedia de 500 VUs con umbrales por endpoint:

```powershell
& "C:\Program Files\k6\k6.exe" run capacity.js
```

Guarda la salida para comparar corridas:

```powershell
New-Item -ItemType Directory -Force results | Out-Null
& "C:\Program Files\k6\k6.exe" run load-1000.js 2>&1 | Tee-Object results\load-1000.txt
```

## 4. Resultados de referencia (esta maquina)

Corridas del 25/11/2026 con backend Node local en el puerto 4100, PostgreSQL en
Docker y k6 en la misma laptop (i7-14650HX, 24 hilos). Al compartir CPU con k6 y
Postgres, estos numeros son una cota conservadora del backend.

| Escenario | VUs | Solicitudes | RPS | p95 | p99 | Errores |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Humo (`smoke.js`) | 20 | 1.188 | 9,7 | 71 ms | < 2 s | 0,00% |
| Capacidad (`capacity.js`) | 500 | 53.323 | 195,8 | 449 ms | 2,19 s | 0,00% |
| Objetivo (`load-1000.js`) | 1.000 | 162.061 | 336,2 | 1,67 s | 2,85 s | 0,00% |

Lectura:

- A 20 VUs sobra capacidad: p95 71 ms.
- A 500 VUs el p95 queda justo bajo 500 ms, pero el p99 supera 2 s.
- A 1000 VUs no hay errores, pero la latencia se degrada: el backend sostiene
  unos 336 RPS con un solo proceso Node.
- Las rutas de escritura son las mas caras: a 500 VUs `POST /reservations` y
  `POST /matches/:id/join` tuvieron p95 ~1,1 s por las transacciones
  serializables y los bloqueos.
- Cuello de botella probable: un unico proceso Node usando un nucleo. El pool de
  Prisma (49 conexiones por defecto) y Postgres no estaban agotados.

Mejoras sugeridas antes de production: ejecutar varias instancias del backend
(PM2/cluster o replicas detras de Nginx), paginar/cachear `GET /matches` y
`GET /courts`, y repetir la prueba con k6 en otra maquina para separar el costo
del generador de carga.

## 5. Interpretar resultados

- `http_req_duration{name:...}` permite ver que endpoint es el mas lento.
- Si `http_req_failed` sube, revisa los logs del backend: conexiones agotadas,
  timeouts de Prisma o transacciones serializables (`P2034`).
- Si el p95 crece mientras los VUs suben, la aplicacion saturo CPU, pool de
  conexiones o el disco. El backend usa `new PrismaClient()` sin limite de pool;
  para produccion conviene fijar `connection_limit` en la URL.
- Un 400/409 en `POST /reservations` es esperado cuando dos VUs eligen la misma
  franja; no cuenta como fallo.

## Limpieza

El seed es idempotente: al volver a ejecutarlo borra solo los usuarios
`@loadtest.partidechi.local` y sus datos, y los vuelve a crear.

Para detener los procesos locales, cierra las terminales donde corren
`npm start` y `npm run preview`.
