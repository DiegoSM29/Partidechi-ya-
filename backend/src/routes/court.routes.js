const { Router } = require("express");
const canchaController = require("../controllers/cancha.controller");
const horarioController = require("../controllers/horario.controller");
const reservaController = require("../controllers/reserva.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

const router = Router();

router.get("/", canchaController.listAll);
router.get("/mine", authenticate, authorize("PROPIETARIO"), canchaController.listMine);
router.get("/:id", canchaController.getById);
router.post("/", authenticate, authorize("PROPIETARIO"), canchaController.create);
router.patch("/:id", authenticate, authorize("PROPIETARIO"), canchaController.updateMine);
router.delete("/:id", authenticate, authorize("PROPIETARIO"), canchaController.deleteMine);

// Horarios de funcionamiento (se aceptan /schedules y /horarios como alias).
for (const base of ["schedules", "horarios"]) {
  router.get(`/:id/${base}`, horarioController.listSchedules);
  router.post(
    `/:id/${base}`,
    authenticate,
    authorize("PROPIETARIO"),
    horarioController.createSchedules
  );
  router.put(
    `/:id/${base}`,
    authenticate,
    authorize("PROPIETARIO"),
    horarioController.replaceSchedules
  );
  router.patch(
    `/:id/${base}/:scheduleId`,
    authenticate,
    authorize("PROPIETARIO"),
    horarioController.updateSchedule
  );
  router.put(
    `/:id/${base}/:scheduleId`,
    authenticate,
    authorize("PROPIETARIO"),
    horarioController.updateSchedule
  );
  router.delete(
    `/:id/${base}/:scheduleId`,
    authenticate,
    authorize("PROPIETARIO"),
    horarioController.deleteSchedule
  );
}

// La disponibilidad publica se deriva de horarios registrados y reservas.
router.get("/:id/availability", horarioController.getAvailability);

// Alias para solicitar una reserva indicando la cancha en la ruta.
router.post("/:id/reservations", authenticate, reservaController.create);

module.exports = router;
