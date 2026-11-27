# Colección Postman - Partidechi API

Regresión funcional de la API v1. Cubre autenticación, canchas, horarios,
disponibilidad, reservas, pagos, partidos, confiabilidad, notificaciones y
cierres. Son 20 requests con 20 aserciones.

## Requisitos

1. Base local migrada y sembrada:
   ```powershell
   node tests/load/seed.js
   ```
2. Backend en ejecución. El environment `local` apunta a
   `http://localhost:4000/api/v1`, que es el puerto del stack Docker. Si usas el
   backend local en 4100, sobrescribe `base_url` al ejecutar.

Las cuentas las crea el seed:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Propietario | `owner@loadtest.partidechi.local` | `LoadTest123!` |
| Jugador | `player0001@loadtest.partidechi.local` | `LoadTest123!` |

Las contraseñas están marcadas como `secret` en el environment. No commitees
credenciales reales: para un entorno compartido usa variables de entorno del
CI o `postman environment var set ... --secret`.

## Ejecutar

Contra el stack Docker (puerto 4000):

```powershell
postman collection run postman/collections/partidechi-api `
  -e postman/environments/local.environment.yaml `
  -r cli
```

Contra el backend local de las pruebas de carga (puerto 4100):

```powershell
postman collection run postman/collections/partidechi-api `
  -e postman/environments/local.environment.yaml `
  --env-var "base_url=http://localhost:4100/api/v1" `
  -r cli
```

Guardar un reporte YAML:

```powershell
postman collection run postman/collections/partidechi-api `
  -e postman/environments/local.environment.yaml `
  --env-var "base_url=http://localhost:4100/api/v1" `
  --output tests/load/k6/results/postman
```

## Resultado esperado

```
requests:    20
assertions:  20
failed:       0
```

La colección encadena variables: el login guarda los tokens, el listado de
canchas guarda `court_id`, la disponibilidad guarda la franja, la reserva guarda
`reservation_id`, el pago guarda `payment_id` y el partido guarda `match_id`.
Por eso debe ejecutarse completa y en orden; el campo `order` de cada request
define la secuencia.
