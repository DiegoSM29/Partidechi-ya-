ALTER TABLE "usuarios"
ADD COLUMN "puntaje_confiabilidad" INTEGER NOT NULL DEFAULT 100;

ALTER TABLE "usuarios"
ADD CONSTRAINT "usuarios_puntaje_confiabilidad_check"
CHECK ("puntaje_confiabilidad" >= 0 AND "puntaje_confiabilidad" <= 100);

CREATE TYPE "estado_reporte_inasistencia" AS ENUM ('pendiente', 'validado', 'rechazado');
CREATE TYPE "tipo_movimiento_confiabilidad" AS ENUM ('inasistencia', 'cierre_cancha', 'ajuste_admin');
CREATE TYPE "estado_revision_confiabilidad" AS ENUM ('pendiente', 'aceptada', 'rechazada');

CREATE TABLE "reportes_inasistencia" (
    "id_reporte" SERIAL NOT NULL,
    "id_partido" INTEGER NOT NULL,
    "id_organizador" INTEGER NOT NULL,
    "id_jugador" INTEGER NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "estado" "estado_reporte_inasistencia" NOT NULL DEFAULT 'pendiente',
    "fecha_reporte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_decision" TIMESTAMP(3),
    "decidido_por" INTEGER,
    CONSTRAINT "reportes_inasistencia_pkey" PRIMARY KEY ("id_reporte")
);

CREATE TABLE "movimientos_confiabilidad" (
    "id_movimiento" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_partido" INTEGER,
    "id_reporte" INTEGER,
    "id_movimiento_origen" INTEGER,
    "id_administrador" INTEGER,
    "tipo" "tipo_movimiento_confiabilidad" NOT NULL,
    "puntos_delta" INTEGER NOT NULL,
    "puntaje_anterior" INTEGER NOT NULL,
    "puntaje_resultante" INTEGER NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "referencia_operacion" VARCHAR(100),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimientos_confiabilidad_pkey" PRIMARY KEY ("id_movimiento"),
    CONSTRAINT "movimientos_confiabilidad_puntajes_check"
      CHECK ("puntaje_anterior" BETWEEN 0 AND 100 AND "puntaje_resultante" BETWEEN 0 AND 100)
);

CREATE TABLE "revisiones_confiabilidad" (
    "id_revision" SERIAL NOT NULL,
    "id_movimiento" INTEGER NOT NULL,
    "id_solicitante" INTEGER NOT NULL,
    "motivo" VARCHAR(500) NOT NULL,
    "estado" "estado_revision_confiabilidad" NOT NULL DEFAULT 'pendiente',
    "decision" VARCHAR(500),
    "fecha_solicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_decision" TIMESTAMP(3),
    "decidido_por" INTEGER,
    CONSTRAINT "revisiones_confiabilidad_pkey" PRIMARY KEY ("id_revision")
);

CREATE UNIQUE INDEX "reportes_inasistencia_id_partido_id_jugador_key"
ON "reportes_inasistencia"("id_partido", "id_jugador");
CREATE INDEX "reportes_inasistencia_estado_fecha_reporte_idx"
ON "reportes_inasistencia"("estado", "fecha_reporte");
CREATE UNIQUE INDEX "movimientos_confiabilidad_id_reporte_key"
ON "movimientos_confiabilidad"("id_reporte");
CREATE UNIQUE INDEX "movimientos_confiabilidad_id_movimiento_origen_key"
ON "movimientos_confiabilidad"("id_movimiento_origen");
CREATE UNIQUE INDEX "movimientos_confiabilidad_tipo_id_partido_id_usuario_key"
ON "movimientos_confiabilidad"("tipo", "id_partido", "id_usuario");
CREATE INDEX "movimientos_confiabilidad_id_usuario_fecha_creacion_idx"
ON "movimientos_confiabilidad"("id_usuario", "fecha_creacion");
CREATE UNIQUE INDEX "revisiones_confiabilidad_id_movimiento_id_solicitante_key"
ON "revisiones_confiabilidad"("id_movimiento", "id_solicitante");
CREATE INDEX "revisiones_confiabilidad_estado_fecha_solicitud_idx"
ON "revisiones_confiabilidad"("estado", "fecha_solicitud");

ALTER TABLE "reportes_inasistencia" ADD CONSTRAINT "reportes_inasistencia_id_partido_fkey"
FOREIGN KEY ("id_partido") REFERENCES "partidos"("id_partido") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reportes_inasistencia" ADD CONSTRAINT "reportes_inasistencia_id_organizador_fkey"
FOREIGN KEY ("id_organizador") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reportes_inasistencia" ADD CONSTRAINT "reportes_inasistencia_id_jugador_fkey"
FOREIGN KEY ("id_jugador") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reportes_inasistencia" ADD CONSTRAINT "reportes_inasistencia_decidido_por_fkey"
FOREIGN KEY ("decidido_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movimientos_confiabilidad" ADD CONSTRAINT "movimientos_confiabilidad_id_usuario_fkey"
FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_confiabilidad" ADD CONSTRAINT "movimientos_confiabilidad_id_administrador_fkey"
FOREIGN KEY ("id_administrador") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movimientos_confiabilidad" ADD CONSTRAINT "movimientos_confiabilidad_id_partido_fkey"
FOREIGN KEY ("id_partido") REFERENCES "partidos"("id_partido") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "movimientos_confiabilidad" ADD CONSTRAINT "movimientos_confiabilidad_id_reporte_fkey"
FOREIGN KEY ("id_reporte") REFERENCES "reportes_inasistencia"("id_reporte") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimientos_confiabilidad" ADD CONSTRAINT "movimientos_confiabilidad_id_movimiento_origen_fkey"
FOREIGN KEY ("id_movimiento_origen") REFERENCES "movimientos_confiabilidad"("id_movimiento") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revisiones_confiabilidad" ADD CONSTRAINT "revisiones_confiabilidad_id_movimiento_fkey"
FOREIGN KEY ("id_movimiento") REFERENCES "movimientos_confiabilidad"("id_movimiento") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revisiones_confiabilidad" ADD CONSTRAINT "revisiones_confiabilidad_id_solicitante_fkey"
FOREIGN KEY ("id_solicitante") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "revisiones_confiabilidad" ADD CONSTRAINT "revisiones_confiabilidad_decidido_por_fkey"
FOREIGN KEY ("decidido_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
