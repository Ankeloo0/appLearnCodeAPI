import { Router } from "express";
import SubjectAdminController from "../../controller/admin/SubjectAdminController";
import { authAdmin } from "../../middleware/authAdmin";
import { authenticate } from "../../middleware/auth";
import SubtopicAdminController from "../../controller/admin/SubtopicAdminController";

const router = Router();

// Todas las rutas están protegidas y solo accesibles por admin
router.use(authenticate, authAdmin);

// Crear materia
router.post("/:topicId", SubtopicAdminController.createSubtopic);

// Obtener todas las materias
router.get("/", SubtopicAdminController.getSubtopics);

// Obtener una materia por ID
router.get("/:id", SubtopicAdminController.getSubtopicById);

// Actualizar materia
router.put("/:id", SubtopicAdminController.updateSubtopic);

// Eliminar materia
router.delete("/:id", SubtopicAdminController.deleteSubtopic);

export default router;
