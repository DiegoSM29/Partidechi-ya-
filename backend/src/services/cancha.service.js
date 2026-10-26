const ApiError = require("../utils/ApiError");
const canchaRepository = require("../repositories/cancha.repository");
const { isNonEmptyString, cleanString } = require("../utils/validators");
const cochabambaDepartment = require("../../../shared/cochabamba-department.json");

const TEXT_FIELDS = {
  nombre: 100,
  ubicacion: 200,
  deporte: 80,
  categoria: 40,
};
const DEPORTES_PERMITIDOS = ["futbol 5", "futbol 8", "futbol 11", "wally", "padel", "fronton"];

const isWithinDepartmentBounds = (latitud, longitud) => {
  const { south, north, west, east } = cochabambaDepartment.bounds;
  return latitud >= south && latitud <= north && longitud >= west && longitud <= east;
};

const isInsideCochabambaDepartment = async (latitud, longitud) => {
  if (!isWithinDepartmentBounds(latitud, longitud)) return false;

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitud),
    lon: String(longitud),
    zoom: "10",
    addressdetails: "1",
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          "User-Agent": "PartidechiYa/1.0 (court location validation)",
          "Accept-Language": "es",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!response.ok) {
      throw new ApiError(503, "No se pudo verificar la ubicacion. Intente nuevamente");
    }

    const result = await response.json();
    const department = String(result.address?.state || "").toLocaleLowerCase("es");
    return (
      result.address?.country_code === "bo" &&
      department.includes("cochabamba")
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(503, "No se pudo verificar la ubicacion. Intente nuevamente");
  }
};

const validateInput = async (input, requiredFields = []) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ApiError(400, "Los datos de la cancha no son validos");
  }

  const data = {};
  for (const [field, maxLength] of Object.entries(TEXT_FIELDS)) {
    if (input[field] === undefined) {
      if (requiredFields.includes(field)) {
        throw new ApiError(400, `El campo "${field}" es obligatorio`);
      }
      continue;
    }
    if (!isNonEmptyString(input[field])) {
      throw new ApiError(400, `El campo "${field}" no puede estar vacio`);
    }
    const value = cleanString(input[field]);
    if (field === "deporte" && !DEPORTES_PERMITIDOS.includes(value)) {
      throw new ApiError(400, 'El deporte debe ser futbol 5, futbol 8, futbol 11, wally, padel o fronton');
    }
    if (value.length > maxLength) {
      throw new ApiError(400, `El campo "${field}" supera el maximo de ${maxLength} caracteres`);
    }
    data[field] = value;
  }

  if (input.precio_hora !== undefined) {
    if (
      typeof input.precio_hora !== "number" ||
      !Number.isFinite(input.precio_hora) ||
      input.precio_hora <= 0 ||
      input.precio_hora > 5000
    ) {
      throw new ApiError(400, 'El campo "precio_hora" debe ser mayor que cero y no superar Bs 5.000');
    }
    data.precio_hora = input.precio_hora;
  } else if (requiredFields.includes("precio_hora")) {
    throw new ApiError(400, 'El campo "precio_hora" es obligatorio');
  }

  const hasLocation =
    input.ubicacion !== undefined ||
    input.latitud !== undefined ||
    input.longitud !== undefined;
  if (hasLocation || requiredFields.includes("ubicacion")) {
    if (
      !isNonEmptyString(input.ubicacion) ||
      typeof input.latitud !== "number" ||
      typeof input.longitud !== "number" ||
      !Number.isFinite(input.latitud) ||
      !Number.isFinite(input.longitud)
    ) {
      throw new ApiError(400, "Seleccione una ubicacion valida en el mapa");
    }
    const ubicacion = cleanString(input.ubicacion);
    if (ubicacion.length > 200) {
      throw new ApiError(400, 'El campo "ubicacion" supera el maximo de 200 caracteres');
    }
    if (!(await isInsideCochabambaDepartment(input.latitud, input.longitud))) {
      throw new ApiError(400, "La ubicacion debe estar dentro del departamento de Cochabamba, Bolivia");
    }
    data.ubicacion = ubicacion;
    data.latitud = input.latitud;
    data.longitud = input.longitud;
  }

  if (Object.keys(data).length === 0) {
    throw new ApiError(400, "Indique al menos un dato para la cancha");
  }
  return data;
};

const parseId = (value) => {
  if (value === undefined || value === null) {
    throw new ApiError(400, "El identificador de la cancha no es valido");
  }
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) {
    throw new ApiError(400, "El identificador de la cancha no es valido");
  }
  const id = Number(str);
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(400, "El identificador de la cancha no es valido");
  }
  return id;
};

const listAll = (filters = {}) => canchaRepository.findAll(filters);

const listMine = (id_propietario) => canchaRepository.findByOwner(id_propietario);

const create = async (id_propietario, input) => {
  const data = await validateInput(input, [...Object.keys(TEXT_FIELDS), "ubicacion", "precio_hora"]);
  return canchaRepository.create({ ...data, id_propietario });
};

const updateMine = async (id_propietario, rawId, input) => {
  const id_cancha = parseId(rawId);
  const data = await validateInput(input);
  const cancha = await canchaRepository.updateByOwnerAndId(
    id_propietario,
    id_cancha,
    data
  );
  if (!cancha) throw new ApiError(404, "Cancha no encontrada");
  return cancha;
};

const deleteMine = async (id_propietario, rawId) => {
  const id_cancha = parseId(rawId);
  const result = await canchaRepository.deleteByOwnerAndId(id_propietario, id_cancha);
  if (result.count === 0) throw new ApiError(404, "Cancha no encontrada");
};

module.exports = { listAll, listMine, create, updateMine, deleteMine };