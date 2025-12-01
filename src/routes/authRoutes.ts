import { Router } from "express";
import { PurebaC } from "../controller/PruebaC";
import { body, param } from "express-validator";
import { handleInputErrors } from "../middleware/validation";
import { AuthController } from "../controller/AuthController";
import { authenticate } from "../middleware/auth";
import { authAdmin } from "../middleware/authAdmin";

const router = Router()

router.post('/ia',
    PurebaC.generateAndSaveQuestions
)

router.post('/create-account',
    body('username')
        .notEmpty().withMessage('El nombre no debe estar vacio'),

    body('password')
        .isLength({min: 8}).withMessage('password con minimo 8 carateres'),

    body('password_confirmation').custom((value, {req}) => {
        if(value !== req.body.password){
            throw new Error('Los password no son iguales')
        }
        return true

    }),

    body('email')
        .isEmail().notEmpty().withMessage('E-mail no valido'),
    handleInputErrors,
    AuthController.createAccount
)

router.post('/login',
    body('email')
        .isEmail().notEmpty().withMessage('E-mail no valido'),
    body('password')
        .notEmpty().withMessage('password no debe ir vacio'),

    handleInputErrors,
    AuthController.login

)

router.post('/admin-login',
    body('email')
        .isEmail().notEmpty().withMessage('E-mail no valido'),
    body('password')
        .notEmpty().withMessage('password no debe ir vacio'),

    handleInputErrors,
    AuthController.adminLogin
);

router.get('/home',
    authenticate,
    authAdmin,   // 🚨 ahora solo admins pueden acceder
    AuthController.user
);


router.post('/forgot-password',

    // Validar email
    body('email')
        .notEmpty().withMessage('El email es obligatorio')
        .isEmail().withMessage('Email no válido'),

    // Validar contraseña actual
    body('old_password')
        .notEmpty().withMessage('Debes ingresar tu contraseña actual'),

    // Validar nueva contraseña
    body('new_password')
        .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener mínimo 8 caracteres'),

    handleInputErrors,
    AuthController.forgotPassword
);

router.post('/validate-token',
    body('token')
        .notEmpty().withMessage('El token no debe ir vacio'),
    handleInputErrors,
    AuthController.validateToken

)

router.post('/update-password/:token',
    param('token')
        .isNumeric().withMessage('Token no valido'),
    body('password')
        .isLength({min: 8}).withMessage('password con minimo 8 carateres'),

    body('password_confirmation').custom((value, {req}) => {
        if(value !== req.body.password){
            throw new Error('Los password no son iguales')
        }
        return true

    }),
    handleInputErrors,
    AuthController.updatePasswordWithToken

)


router.get('/user',
    authenticate,

    AuthController.user
)



export default router