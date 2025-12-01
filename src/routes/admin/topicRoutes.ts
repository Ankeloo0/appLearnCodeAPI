import { Router } from "express";
import SubjectAdminController from "../../controller/admin/SubjectAdminController";
import { authAdmin } from "../../middleware/authAdmin";
import { authenticate } from "../../middleware/auth";
import TopicAdminController from "../../controller/admin/TopicAdminController";

const router = Router();

// Todas las rutas están protegidas y solo accesibles por admin
router.use(authenticate, authAdmin);

// Crear materia
router.post("/:subjectId", TopicAdminController.createTopic);

// Obtener todas las materias
router.get("/", TopicAdminController.getTopics);

// Obtener una materia por ID
router.get("/:id", TopicAdminController.getTopicById);

// Actualizar materia
router.put("/:id", TopicAdminController.updateTopic);

// Eliminar materia
router.delete("/:id", TopicAdminController.deleteTopic);

export default router;
