const { randomUUID } = require("node:crypto");
const ApiError = require("../utils/ApiError");

const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_FORMATS = [
  {
    extension: "jpg",
    mimeType: "image/jpeg",
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
  },
  {
    extension: "png",
    mimeType: "image/png",
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    extension: "webp",
    mimeType: "image/webp",
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP",
  },
];

const validateImages = (files = []) => {
  if (!Array.isArray(files) || files.length > MAX_IMAGE_COUNT) {
    throw new ApiError(400, "Puedes subir como máximo 5 imágenes");
  }

  return files.map((file) => {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new ApiError(400, "Una de las imágenes está vacía o no es válida");
    }
    if (file.buffer.length > MAX_IMAGE_SIZE) {
      throw new ApiError(400, "Cada imagen debe pesar como máximo 5 MB");
    }

    const format = IMAGE_FORMATS.find(({ matches }) => matches(file.buffer));
    if (!format || file.mimetype !== format.mimeType) {
      throw new ApiError(400, "Usa imágenes JPG, PNG o WebP válidas");
    }
    return { ...file, ...format };
  });
};

const parseRetainedImages = (value, existingImages) => {
  if (value === undefined) return existingImages;
  let retainedImages = value;
  if (typeof value === "string") {
    try {
      retainedImages = JSON.parse(value);
    } catch {
      throw new ApiError(400, "La lista de imágenes que se conservarán no es válida");
    }
  }
  if (
    !Array.isArray(retainedImages) ||
    retainedImages.length > MAX_IMAGE_COUNT ||
    retainedImages.some((url) => typeof url !== "string") ||
    new Set(retainedImages).size !== retainedImages.length ||
    retainedImages.some((url) => !existingImages.includes(url))
  ) {
    throw new ApiError(400, "Solo puedes conservar imágenes existentes de esta cancha");
  }
  return retainedImages;
};

const assertTotalImageCount = (retainedCount, newImageCount) => {
  if (retainedCount + newImageCount > MAX_IMAGE_COUNT) {
    throw new ApiError(400, "Puedes conservar y añadir como máximo 5 imágenes");
  }
};

const getStorageConfig = () => {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "court-images";
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new ApiError(
      503,
      "El almacenamiento de imágenes no está configurado. Configura Supabase Storage en el backend."
    );
  }
  let projectUrl;
  try {
    projectUrl = new URL(SUPABASE_URL);
  } catch {
    throw new ApiError(503, "La URL de Supabase Storage no tiene un formato válido");
  }
  if (!["http:", "https:"].includes(projectUrl.protocol)) {
    throw new ApiError(503, "La URL de Supabase Storage debe usar HTTP o HTTPS");
  }
  return {
    baseUrl: projectUrl.origin,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    bucket,
  };
};

const storageObjectUrl = (baseUrl, bucket, objectPath) =>
  `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

const removeUploadedObjects = async (config, objectPaths) => {
  const failures = [];
  for (const objectPath of objectPaths) {
    try {
      const response = await fetch(
        storageObjectUrl(config.baseUrl, config.bucket, objectPath),
        {
          method: "DELETE",
          headers: {
            apikey: config.serviceRoleKey,
            Authorization: `Bearer ${config.serviceRoleKey}`,
          },
        }
      );
      if (!response.ok) failures.push({ objectPath, status: response.status });
    } catch (error) {
      failures.push({ objectPath, error });
    }
  }
  return failures;
};

const getImageObjectPaths = (imageUrls, id_propietario, config) => {
  const publicPrefix = `${config.baseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/`;
  return imageUrls.map((imageUrl) => {
    if (typeof imageUrl !== "string" || !imageUrl.startsWith(publicPrefix)) {
      throw new ApiError(400, "Una de las imágenes guardadas no pertenece a Supabase Storage");
    }
    let segments;
    try {
      segments = imageUrl
        .slice(publicPrefix.length)
        .split("/")
        .map((segment) => decodeURIComponent(segment));
    } catch {
      throw new ApiError(400, "Una de las imágenes guardadas no tiene una ruta válida");
    }
    const [ownerId, filename] = segments;
    if (
      segments.length !== 2 ||
      ownerId !== String(id_propietario) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(filename)
    ) {
      throw new ApiError(400, "Una de las imágenes guardadas no pertenece a este propietario");
    }
    return segments.join("/");
  });
};

const assertCanDeleteImages = (imageUrls, id_propietario) => {
  if (imageUrls.length === 0) return;
  const config = getStorageConfig();
  getImageObjectPaths(imageUrls, id_propietario, config);
};

const uploadImages = async (files, id_propietario) => {
  const validatedImages = validateImages(files);
  if (validatedImages.length === 0) return [];

  const config = getStorageConfig();
  const uploaded = [];
  try {
    for (const image of validatedImages) {
      const objectPath = `${id_propietario}/${randomUUID()}.${image.extension}`;
      const response = await fetch(
        storageObjectUrl(config.baseUrl, config.bucket, objectPath),
        {
          method: "POST",
          headers: {
            apikey: config.serviceRoleKey,
            Authorization: `Bearer ${config.serviceRoleKey}`,
            "Content-Type": image.mimeType,
            "x-upsert": "false",
          },
          body: image.buffer,
        }
      );
      if (!response.ok) {
        throw new ApiError(502, "Supabase Storage no pudo guardar las imágenes");
      }
      uploaded.push({
        objectPath,
        publicUrl: `${config.baseUrl}/storage/v1/object/public/${encodeURIComponent(config.bucket)}/${objectPath
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`,
      });
    }
    return uploaded;
  } catch (error) {
    const failures = await removeUploadedObjects(
      config,
      uploaded.map(({ objectPath }) => objectPath)
    );
    if (failures.length > 0) {
      console.error("[SUPABASE STORAGE] No se pudieron limpiar imágenes cargadas parcialmente", failures);
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, "No se pudo completar la carga de imágenes en Supabase Storage");
  }
};

const removeImages = async (uploadedImages) => {
  if (uploadedImages.length === 0) return;
  const config = getStorageConfig();
  const failures = await removeUploadedObjects(
    config,
    uploadedImages.map(({ objectPath }) => objectPath)
  );
  if (failures.length > 0) {
    console.error("[SUPABASE STORAGE] No se pudieron limpiar las imágenes", failures);
  }
};

const deleteImages = async (imageUrls, id_propietario) => {
  if (imageUrls.length === 0) return;
  const config = getStorageConfig();
  const objectPaths = getImageObjectPaths(imageUrls, id_propietario, config);
  const failures = await removeUploadedObjects(config, objectPaths);
  if (failures.length > 0) {
    console.error("[SUPABASE STORAGE] No se pudieron eliminar todas las imágenes de la cancha", failures);
    throw new ApiError(
      502,
      "La cancha se actualizó, pero Supabase Storage no pudo eliminar todas las imágenes retiradas"
    );
  }
};

module.exports = {
  uploadImages,
  removeImages,
  deleteImages,
  assertCanDeleteImages,
  validateImages,
  parseRetainedImages,
  assertTotalImageCount,
  getStorageConfig,
};
