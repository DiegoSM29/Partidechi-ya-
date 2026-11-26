const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateImages,
  parseRetainedImages,
  assertTotalImageCount,
  uploadImages,
} = require("../src/services/cancha-images.service");

const jpgFile = (size = 3) => {
  const buffer = Buffer.alloc(size);
  buffer.set([0xff, 0xd8, 0xff]);
  return { buffer, mimetype: "image/jpeg" };
};

test("acepta hasta cinco imágenes JPG, PNG y WebP válidas", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const webp = Buffer.from("RIFF0000WEBP");

  const result = validateImages([
    jpgFile(),
    { buffer: png, mimetype: "image/png" },
    { buffer: webp, mimetype: "image/webp" },
    jpgFile(),
    jpgFile(),
  ]);

  assert.equal(result.length, 5);
  assert.deepEqual(result.map(({ extension }) => extension), [
    "jpg",
    "png",
    "webp",
    "jpg",
    "jpg",
  ]);
  assert.throws(() => validateImages([...result, jpgFile()]), { statusCode: 400 });
});

test("rechaza imágenes mayores de 5 MB", () => {
  const buffer = Buffer.alloc(5 * 1024 * 1024 + 1);
  buffer.set([0xff, 0xd8, 0xff]);

  assert.throws(
    () => validateImages([{ buffer, mimetype: "image/jpeg" }]),
    { statusCode: 400, message: "Cada imagen debe pesar como máximo 5 MB" }
  );
});

test("rechaza extensiones de tipo y contenido que no coinciden", () => {
  assert.throws(
    () => validateImages([{ buffer: Buffer.from("not an image"), mimetype: "image/jpeg" }]),
    { statusCode: 400, message: "Usa imágenes JPG, PNG o WebP válidas" }
  );
  assert.throws(
    () =>
      validateImages([
        { buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), mimetype: "image/jpeg" },
      ]),
    { statusCode: 400, message: "Usa imágenes JPG, PNG o WebP válidas" }
  );
});

test("solo conserva URLs únicas que ya pertenecen a la cancha", () => {
  const existing = ["https://storage.example/court-1.jpg", "https://storage.example/court-2.jpg"];

  assert.deepEqual(parseRetainedImages(undefined, existing), existing);
  assert.deepEqual(parseRetainedImages(JSON.stringify([existing[1]]), existing), [existing[1]]);
  assert.deepEqual(parseRetainedImages([], existing), []);
  assert.throws(
    () => parseRetainedImages(JSON.stringify(["https://elsewhere.example/image.jpg"]), existing),
    { statusCode: 400 }
  );
  assert.throws(
    () => parseRetainedImages([existing[0], existing[0]], existing),
    { statusCode: 400 }
  );
});

test("el limite de cinco considera las imágenes conservadas y las nuevas", () => {
  assert.doesNotThrow(() => assertTotalImageCount(4, 1));
  assert.throws(() => assertTotalImageCount(5, 1), { statusCode: 400 });
});

test("normaliza SUPABASE_URL cuando incluye /rest/v1 antes de subir una imagen", async () => {
  const envKeys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_STORAGE_BUCKET",
  ];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = global.fetch;
  const requests = [];
  process.env.SUPABASE_URL = "https://project.supabase.co/rest/v1/";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  process.env.SUPABASE_STORAGE_BUCKET = "court-images";
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, status: 200 };
  };

  try {
    const [uploaded] = await uploadImages([jpgFile()], 17);
    assert.match(requests[0].url, /^https:\/\/project\.supabase\.co\/storage\/v1\/object\/court-images\/17\//);
    assert.match(uploaded.publicUrl, /^https:\/\/project\.supabase\.co\/storage\/v1\/object\/public\/court-images\/17\//);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
