import { Request, Response } from "express"
import User from "../models/User";
import bcrypt from 'bcrypt'
import Token from "../models/Token";
import { generateToken } from "../utils/token";
import { transporter } from "../config/nodemailer";
import { generateJWT } from "../utils/jwt";
import Subtopic from "../models/Subtopic";
import UserProgress from "../models/UserProgress";

export class AuthController {
    static createAccount = async (req: Request, res: Response) => {
        try {
            const { password, email } = req.body;

            const userExist = await User.findOne({ email });
            if (userExist)
                return res.status(409).json({ error: "El usuario ya está registrado" });

            const user = new User(req.body);
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
            await user.save();

            // Crear progreso inicial para cada subtema existente
            const subtopics = await Subtopic.find();
            const progressDocs = subtopics.map((s) => ({
                user: user._id,
                subtopic: s._id,
                score: 0,
                completedExercises: [],
                answeredQuestions: [],
                completed: false
            }));
            await UserProgress.insertMany(progressDocs);

            res.status(201).json({ message: "Cuenta creada y progreso inicial configurado" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Hubo un error al crear la cuenta" });
        }
    };



    static login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body
            console.log(req.body);


            const user = await User.findOne({ email })

            if (!user) {
                const error = new Error('Usuario no encontrado')
                res.status(404).json({ error: error.message })
                return

            }

            //revisar password
            const isPasswordCorrect = await bcrypt.compare(password, user.password)

            if (!isPasswordCorrect) {
                const error = new Error('Password incorrecto')
                res.status(401).json({ error: error.message })
                return

            }

            const token = generateJWT({ id: user.id })

            res.json({ token })




        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })

        }
    }

    static adminLogin = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({ error: "Usuario no encontrado" });
            }

            const isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                return res.status(401).json({ error: "Password incorrecto" });
            }

            if (user.role !== "admin") {
                return res.status(403).json({ error: "Acceso denegado" });
            }

            const token = generateJWT({ id: user.id });
            res.json({ token, role: user.role });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Hubo un error en el login de admin" });
        }
    };


static forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email, old_password, new_password } = req.body;

        // 1. Verificar que el usuario exista
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'El usuario no existe' });
        }

        // 2. Verificar que la contraseña actual sea correcta
        const isPasswordValid = await bcrypt.compare(old_password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
        }

        // 3. Generar nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // 4. Actualizar contraseña
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ message: 'La contraseña se actualizó correctamente' });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Hubo un error en el servidor' });
    }
};


    static validateToken = async (req: Request, res: Response) => {
        try {
            console.log(req.body);

            const { token } = req.body

            console.log('Token recibido desde frontend:', token, typeof token);
            const tokenExists = await Token.findOne({ token: String(token) });
            console.log('Resultado de búsqueda en MongoDB:', tokenExists);

            if (!tokenExists) {
                const error = new Error('Token no valido')
                res.status(401).json({ error: error.message })
                return
            }

            res.status(201).send('Token valido, define tu nuevo password')

        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
            return

        }
    }


    static updatePasswordWithToken = async (req: Request, res: Response) => {
        try {

            const userId = req.user.id
            const salt = await bcrypt.genSalt(10)
            const user = await User.findById(userId)
            user.password = await bcrypt.hash(req.body.password, salt)

            await Promise.allSettled([
                user.save()
            ])

            res.status(201).send('El password se ha modificado correctamente')

        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
            return

        }
    }


static user = async (req: Request, res: Response) => {
    try {
        const user = req.user;

        const progress = await UserProgress.find({ user: user._id })
            .populate<{
                subtopic: {
                    _id: string;
                    title: string;
                    topic: string;
                    order: number;
                    requiresExercise: boolean;
                }
            }>("subtopic");

        const completedSubtopicsList = progress
            .filter(p => p.completed)
            .map(p => ({
                subtopicId: p.subtopic._id,
                title: p.subtopic.title,
                topic: p.subtopic.topic,
                order: p.subtopic.order,
                requiresExercise: p.subtopic.requiresExercise,
                score: p.score || 0,
                lastAccessed: p.lastAccessed
            }));

        const completedSubtopics = completedSubtopicsList.length;
        const totalScore = progress.reduce((acc, p) => acc + (p.score || 0), 0);

        return res.json({
            user,
            stats: {
                completedSubtopics,
                completedSubtopicsList,
                totalScore
            }
        });

    } catch (error: any) {
        console.error("❌ Error en user:", error);
        return res.status(500).json({ error: error.message });
    }
}



}