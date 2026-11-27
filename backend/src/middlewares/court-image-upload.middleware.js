const multer = require("multer");
const ApiError = require("../utils/ApiError");

const MAX_IMAGE_COUNT = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: MAX_IMAGE_COUNT,
    fields: 8,
    fieldSize: 64 * 1024,
    parts: MAX_IMAGE_COUNT + 8,
  },
});

const parseCourtImages = (req, res, next) => {
  upload.array("imagenes", MAX_IMAGE_COUNT)(req, res, (error) => {
    if (!error) return next();
    if (!(error instanceof multer.MulterError)) return next(error);

    if (error.code === "LIMIT_FILE_SIZE") {
      return next(new ApiError(400, "Cada imagen debe pesar como máximo 5 MB"));
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return next(new ApiError(400, "Puedes subir como máximo 5 imágenes"));
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return next(new ApiError(400, 'El campo de archivos debe llamarse "imagenes" y aceptar hasta 5 archivos'));
    }
    return next(new ApiError(400, "El formulario de imágenes no es válido"));
  });
};

module.exports = { parseCourtImages };
