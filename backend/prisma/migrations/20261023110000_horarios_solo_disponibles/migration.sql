DELETE FROM "horarios"
WHERE "estado" = 'bloqueado';

ALTER TABLE "horarios"
DROP COLUMN "motivo",
DROP COLUMN "estado";

DROP TYPE "estado_horario";
