-- CreateEnum
CREATE TYPE "estado_pago" AS ENUM ('pendiente', 'aprobado', 'rechazado', 'reembolsado');

-- CreateTable
CREATE TABLE "pagos" (
    "id_pago" SERIAL NOT NULL,
    "id_reserva" INTEGER NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "metodo_pago" VARCHAR(40) NOT NULL,
    "referencia" VARCHAR(150),
    "comprobante_url" VARCHAR(500),
    "estado" "estado_pago" NOT NULL DEFAULT 'pendiente',
    "verificado_por" INTEGER,
    "fecha_pago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_verificacion" TIMESTAMP(3),

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id_pago")
);

-- CreateIndex
CREATE INDEX "pagos_id_reserva_idx" ON "pagos"("id_reserva");

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_id_reserva_fkey" FOREIGN KEY ("id_reserva") REFERENCES "reservas"("id_reserva") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_verificado_por_fkey" FOREIGN KEY ("verificado_por") REFERENCES "usuarios"("id_usuario") ON DELETE SET NULL ON UPDATE CASCADE;
