import { Router } from "express";
import UserAdminController from "../../controller/admin/UserAdminController";
import { authenticate } from "../../middleware/auth";
import { authAdmin } from "../../middleware/authAdmin";

const router = Router();

// Solo accesibles por administradores
router.use(authenticate, authAdmin);

// Crear un nuevo usuario (opcional: por si el admin quiere registrar manualmente)
router.post("/", UserAdminController.createUser);

// Obtener todos los usuarios
router.get("/", UserAdminController.getUsers);

// Obtener un usuario por ID
router.get("/:id", UserAdminController.getUserById);

// Actualizar un usuario
router.put("/:id", UserAdminController.updateUser);

// Eliminar un usuario
router.delete("/:id", UserAdminController.deleteUser);

export default router;
