-- Add map coordinates while preserving existing court records.
ALTER TABLE "canchas"
ADD COLUMN "latitud" DOUBLE PRECISION,
ADD COLUMN "longitud" DOUBLE PRECISION;