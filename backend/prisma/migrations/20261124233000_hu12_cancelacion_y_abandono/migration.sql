ALTER TYPE "tipo_movimiento_confiabilidad"
ADD VALUE 'cancelacion_partido';

ALTER TYPE "tipo_movimiento_confiabilidad"
ADD VALUE 'abandono_partido';

DROP INDEX IF EXISTS "movimientos_confiabilidad_tipo_id_partido_id_usuario_key";
