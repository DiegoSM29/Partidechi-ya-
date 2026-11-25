const { Router } = require("express");
const confiabilidadController = require("../controllers/confiabilidad.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

const router = Router();
router.use(authenticate);

router.get("/", confiabilidadController.getMine);
router.post("/history/:id/reviews", confiabilidadController.requestReview);

router.get("/admin/reports", authorize("ADMINISTRADOR"), confiabilidadController.listReports);
router.patch("/admin/reports/:id", authorize("ADMINISTRADOR"), confiabilidadController.decideReport);
router.get("/admin/reviews", authorize("ADMINISTRADOR"), confiabilidadController.listReviews);
router.patch("/admin/reviews/:id", authorize("ADMINISTRADOR"), confiabilidadController.decideReview);
router.patch("/admin/users/:id/score", authorize("ADMINISTRADOR"), confiabilidadController.setScore);

module.exports = router;
