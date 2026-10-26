DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "canchas"
    WHERE "precio_hora" <= 0 OR "precio_hora" > 5000
  ) THEN
    RAISE EXCEPTION 'No se puede agregar la restriccion: existen canchas con precio_hora fuera del rango (0, 5000].';
  END IF;
END $$;

ALTER TABLE "canchas"
ADD CONSTRAINT "canchas_precio_hora_rango_check"
CHECK ("precio_hora" > 0 AND "precio_hora" <= 5000);
