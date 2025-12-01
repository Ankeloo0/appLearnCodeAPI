import { Router } from "express";
import SubjectAdminController from "../../controller/admin/SubjectAdminController";
import { authAdmin } from "../../middleware/authAdmin";
import { authenticate } from "../../middleware/auth";

const router = Router();

// Todas las rutas están protegidas y solo accesibles por admin
router.use(authenticate, authAdmin);

// Crear materia
router.post("/", SubjectAdminController.createSubject);

// Obtener todas las materias
router.get("/", SubjectAdminController.getSubjects);

// Obtener una materia por ID
router.get("/:id", SubjectAdminController.getSubjectById);

// Actualizar materia
router.put("/:id", SubjectAdminController.updateSubject);

// Eliminar materia
router.delete("/:id", SubjectAdminController.deleteSubject);

export default router;
