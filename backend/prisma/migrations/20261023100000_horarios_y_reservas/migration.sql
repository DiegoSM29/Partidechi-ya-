-- CreateEnum
CREATE TYPE "estado_horario" AS ENUM ('disponible', 'bloqueado');

-- CreateEnum
CREATE TYPE "estado_reserva" AS ENUM ('pendiente', 'confirmada', 'cancelada', 'completada');

-- CreateTable
CREATE TABLE "horarios" (
    "id_horario" SERIAL NOT NULL,
    "id_cancha" INTEGER NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "hora_inicio" VARCHAR(5) NOT NULL,
    "hora_fin" VARCHAR(5) NOT NULL,
    "estado" "estado_horario" NOT NULL DEFAULT 'disponible',
    "motivo" VARCHAR(200),

    CONSTRAINT "horarios_pkey" PRIMARY KEY ("id_horario")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id_reserva" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_cancha" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "hora_inicio" VARCHAR(5) NOT NULL,
    "hora_fin" VARCHAR(5) NOT NULL,
    "monto_total" DOUBLE PRECISION NOT NULL,
    "estado" "estado_reserva" NOT NULL DEFAULT 'pendiente',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id_reserva")
);

-- CreateIndex
CREATE INDEX "horarios_id_cancha_dia_semana_idx" ON "horarios"("id_cancha", "dia_semana");

-- CreateIndex
CREATE INDEX "reservas_id_usuario_idx" ON "reservas"("id_usuario");

-- CreateIndex
CREATE INDEX "reservas_id_cancha_fecha_idx" ON "reservas"("id_cancha", "fecha");

-- AddForeignKey
ALTER TABLE "horarios" ADD CONSTRAINT "horarios_id_cancha_fkey" FOREIGN KEY ("id_cancha") REFERENCES "canchas"("id_cancha") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_id_cancha_fkey" FOREIGN KEY ("id_cancha") REFERENCES "canchas"("id_cancha") ON DELETE CASCADE ON UPDATE CASCADE;
