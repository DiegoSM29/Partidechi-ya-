DO $$
DECLARE
  id_propietario_existente INTEGER;
  insercion_rechazada BOOLEAN := FALSE;
BEGIN
  SELECT "id_propietario"
  INTO id_propietario_existente
  FROM "canchas"
  ORDER BY "id_cancha"
  LIMIT 1;

  IF id_propietario_existente IS NULL THEN
    RAISE EXCEPTION 'Registra primero una cancha para poder probar la restriccion.';
  END IF;

  BEGIN
    INSERT INTO "canchas" (
      "id_propietario",
      "nombre",
      "ubicacion",
      "deporte",
      "categoria",
      "precio_hora"
    )
    VALUES (
      id_propietario_existente,
      'Prueba SQL precio fuera de rango',
      'Cochabamba',
      'futbol 5',
      'General',
      5001
    );
  EXCEPTION
    WHEN check_violation THEN
      insercion_rechazada := TRUE;
  END;

  IF NOT insercion_rechazada THEN
    RAISE EXCEPTION 'La restriccion no rechazo el precio 5001.';
  END IF;

  RAISE NOTICE 'Prueba correcta: PostgreSQL rechazo el precio 5001.';
END $$;
