-- CreateEnum
CREATE TYPE "estado_partido" AS ENUM ('publicado', 'cancelado', 'completado');

-- CreateEnum
CREATE TYPE "estado_participante" AS ENUM ('aceptado', 'rechazado', 'abandonado');

-- CreateTable
CREATE TABLE "partidos" (
    "id_partido" SERIAL NOT NULL,
    "id_organizador" INTEGER NOT NULL,
    "id_reserva" INTEGER,
    "nombre" VARCHAR(150) NOT NULL,
    "deporte" VARCHAR(80) NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL,
    "jugadores_maximos" INTEGER NOT NULL,
    "descripcion" VARCHAR(500),
    "estado" "estado_partido" NOT NULL DEFAULT 'publicado',

    CONSTRAINT "partidos_pkey" PRIMARY KEY ("id_partido")
);

-- CreateTable
CREATE TABLE "participantes" (
    "id_participante" SERIAL NOT NULL,
    "id_partido" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "estado" "estado_participante" NOT NULL DEFAULT 'aceptado',
    "fecha_union" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participantes_pkey" PRIMARY KEY ("id_participante")
);

-- CreateIndex
CREATE UNIQUE INDEX "partidos_id_reserva_key" ON "partidos"("id_reserva");

-- CreateIndex
CREATE INDEX "partidos_id_organizador_idx" ON "partidos"("id_organizador");

-- CreateIndex
CREATE INDEX "partidos_id_reserva_idx" ON "partidos"("id_reserva");

-- CreateIndex
CREATE INDEX "participantes_id_usuario_idx" ON "participantes"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "participantes_id_partido_id_usuario_key" ON "participantes"("id_partido", "id_usuario");

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_id_organizador_fkey" FOREIGN KEY ("id_organizador") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_id_reserva_fkey" FOREIGN KEY ("id_reserva") REFERENCES "reservas"("id_reserva") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_id_partido_fkey" FOREIGN KEY ("id_partido") REFERENCES "partidos"("id_partido") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participantes" ADD CONSTRAINT "participantes_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE CASCADE ON UPDATE CASCADE;
