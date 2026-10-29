-- CreateTable
CREATE TABLE "canchas" (
    "id_cancha" SERIAL NOT NULL,
    "id_propietario" INTEGER NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "ubicacion" VARCHAR(200) NOT NULL,
    "deporte" VARCHAR(80) NOT NULL,
    "precio_hora" DOUBLE PRECISION NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canchas_pkey" PRIMARY KEY ("id_cancha")
);

-- CreateIndex
CREATE INDEX "canchas_id_propietario_idx" ON "canchas"("id_propietario");

-- AddForeignKey
ALTER TABLE "canchas" ADD CONSTRAINT "canchas_id_propietario_fkey" FOREIGN KEY ("id_propietario") REFERENCES "usuarios"("id_usuario") ON DELETE RESTRICT ON UPDATE CASCADE;