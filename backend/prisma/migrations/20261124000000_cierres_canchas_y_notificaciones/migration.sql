CREATE TABLE "cierres_canchas" (
    "id_cierre" SERIAL NOT NULL,
    "id_cancha" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cierres_canchas_pkey" PRIMARY KEY ("id_cierre")
);

CREATE TABLE "notificaciones" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "mensaje" VARCHAR(500) NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id_notificacion")
);

CREATE UNIQUE INDEX "cierres_canchas_id_cancha_fecha_key" ON "cierres_canchas"("id_cancha", "fecha");
CREATE INDEX "cierres_canchas_fecha_idx" ON "cierres_canchas"("fecha");
CREATE INDEX "notificaciones_id_usuario_leida_fecha_creacion_idx" ON "notificaciones"("id_usuario", "leida", "fecha_creacion");

ALTER TABLE "cierres_canchas" ADD CONSTRAINT "cierres_canchas_id_cancha_fkey"
    FOREIGN KEY ("id_cancha") REFERENCES "canchas"("id_cancha") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_id_usuario_fkey"
    FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
