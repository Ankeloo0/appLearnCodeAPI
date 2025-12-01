import { Request, Response } from "express";
import Subtopic from "../../models/Subtopic";
import Topic from "../../models/Topic";
import UserProgress from "../../models/UserProgress";
import User from "../../models/User";

class SubtopicAdminController {
static async createSubtopic(req: Request, res: Response) {
    try {
        const { topicId } = req.params;
        const { title, content, examples, requiresExercise } = req.body;

        if (!topicId || !title || !content) {
            return res.status(400).json({ error: "Faltan campos obligatorios (topic, title, content)" });
        }

        const topicExists = await Topic.findById(topicId);
        if (!topicExists) {
            return res.status(404).json({ error: "El tema especificado no existe" });
        }

        // Obtener último orden
        const last = await Subtopic.find({ topic: topicId })
            .sort({ order: -1 })
            .limit(1);

        const order = last.length > 0 ? last[0].order + 1 : 0;

        // Crear Subtema
        const subtopic = await Subtopic.create({
            topic: topicId,
            title,
            content,
            examples,
            requiresExercise,
            order
        });

        // ================================================
        // NUEVO: Crear progreso SOLO para usuarios con role: "user"
        // ================================================
        const users = await User.find({ role: "user" }, "_id");

        const progressDocs = users.map((u) => ({
            user: u._id,
            subtopic: subtopic._id,
            score: 0,
            completedExercises: [],
            answeredQuestions: [],
            completed: false
        }));

        await UserProgress.insertMany(progressDocs);

        res.status(201).json({
            message: "Subtema creado y progreso añadido para los usuarios",
            subtopic
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear el subtema" });
    }
}



    static async getSubtopics(req: Request, res: Response) {
        try {
            const subtopics = await Subtopic.find().populate("topic", "title");
            res.json(subtopics);
        } catch (error) {
            res.status(500).json({ error: "Error al obtener los subtemas" });
        }
    }

    static async getSubtopicById(req: Request, res: Response) {
        try {
            const subtopic = await Subtopic.findById(req.params.id).populate("topic", "title");
            if (!subtopic) {
                return res.status(404).json({ error: "Subtema no encontrado" });
            }
            res.json(subtopic);
        } catch (error) {
            res.status(500).json({ error: "Error al obtener el subtema" });
        }
    }

static async updateSubtopic(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { title, content, examples, requiresExercise, order } = req.body;

        const subtopic = await Subtopic.findById(id);
        if (!subtopic) {
            return res.status(404).json({ error: "Subtema no encontrado" });
        }

        const oldOrder = subtopic.order;

        // Actualizar datos normales
        if (title) subtopic.title = title;
        if (content) subtopic.content = content;
        if (examples) subtopic.examples = examples;
        if (requiresExercise !== undefined) subtopic.requiresExercise = requiresExercise;

        // Si el usuario quiere cambiar el orden:
        if (order !== undefined && order !== oldOrder) {
            const subtopics = await Subtopic.find({ topic: subtopic.topic }).sort({ order: 1 });

            // Remover del array el que se está editando
            const filtered = subtopics.filter(s => s._id.toString() !== id);

            // Insertarlo en la nueva posición
            filtered.splice(order, 0, subtopic);

            // Reasignar orden a todos
            await Promise.all(
                filtered.map((s, idx) => {
                    s.order = idx;
                    return s.save();
                })
            );
        }

        await subtopic.save();
        res.json(subtopic);
    } catch (error) {
        res.status(500).json({ error: "No se pudo actualizar el subtema" });
    }
}



static async deleteSubtopic(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // 1. Borrar el subtopic
        const subtopic = await Subtopic.findByIdAndDelete(id);
        if (!subtopic) {
            return res.status(404).json({ error: "Subtema no encontrado" });
        }

        // 2. Borrar progreso de todos los usuarios
        await UserProgress.deleteMany({ subtopic: id });

        // 3. Reacomodar orden de los subtopics restantes
        const remaining = await Subtopic.find({ topic: subtopic.topic }).sort({ order: 1 });

        await Promise.all(
            remaining.map((s, idx) => {
                s.order = idx;
                return s.save();
            })
        );

        res.json({ message: "Subtema eliminado, progreso limpiado y órdenes reasignados" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el subtema" });
    }
}


}

export default SubtopicAdminController;
