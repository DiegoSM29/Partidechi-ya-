const Module = require("node:module");
const path = require("node:path");
const { test } = require("node:test");
const assert = require("node:assert/strict");

const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const controllerPath = path.resolve(__dirname, "../src/controllers/notificacion.controller.js");
let countResult = 0;
let countFilter;

const fakePrisma = {
  notificacion: {
    count: async ({ where }) => {
      countFilter = where;
      return countResult;
    },
  },
};

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent, isMain);
  if (resolved === controllerPath) {
    const controller = originalLoad.call(this, request, parent, isMain);
    Module._load = originalLoad;
    return controller;
  }
  if (resolved === prismaPath) return fakePrisma;
  return originalLoad.call(this, request, parent, isMain);
};

const notificationController = require(controllerPath);

test("unreadCount cuenta solo las notificaciones no leídas del usuario autenticado", async () => {
  countResult = 3;
  countFilter = null;
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await notificationController.unreadCount(
    { user: { id_usuario: 27 } },
    response,
    (error) => {
      throw error;
    }
  );

  assert.deepEqual(countFilter, { id_usuario: 27, leida: false });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.count, 3);
});
