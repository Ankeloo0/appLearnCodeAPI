import { Request, Response } from "express";
import Subject from "../models/Subject";
import Topic from "../models/Topic";
import Subtopic from "../models/Subtopic";
import Excersise from "../models/Excersise";
import Question from "../models/Question";
import UserProgress from "../models/UserProgress";
import { callLLM } from "../utils/llmService";

export class ContentController {

    // -------- SUBJECTS --------
    static async getSubjects(req: Request, res: Response) {
        try {
            const userId = req.user.id;

            const subjects = await Subject.find({}).sort({ order: 1 });

            const response = [];

            for (let i = 0; i < subjects.length; i++) {
                const subject = subjects[i];

                // Primer materia SIEMPRE desbloqueada
                if (i === 0) {
                    response.push({ ...subject.toObject(), locked: false });
                    continue;
                }

                // Materia anterior
                const previousSubject = subjects[i - 1];

                const previousTopics = await Topic.find({ subject: previousSubject._id });
                const previousSubtopics = await Subtopic.find({
                    topic: { $in: previousTopics.map(t => t._id) }
                });

                if (previousSubtopics.length === 0) {
                    response.push({ ...subject.toObject(), locked: true });
                    continue;
                }

                const userProgress = await UserProgress.find({
                    user: userId,
                    subtopic: { $in: previousSubtopics.map(s => s._id) }
                });

                const allCompleted = userProgress.length === previousSubtopics.length &&
                    userProgress.every(p => p.completed);

                response.push({
                    ...subject.toObject(),
                    locked: !allCompleted
                });
            }

            res.json(response);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "No se pudieron obtener las materias" });
        }
    }






    static async getTopicsBySubject(req: Request, res: Response) {
        try {
            const { subjectId } = req.params;
            const userId = req.user.id;

            const topics = await Topic.find({ subject: subjectId }).sort({ order: 1 });

            const response = [];

            for (let i = 0; i < topics.length; i++) {
                const topic = topics[i];

                // Primer tema desbloqueado
                if (i === 0) {
                    response.push({ ...topic.toObject(), locked: false });
                    continue;
                }

                // Tema anterior
                const previousTopic = topics[i - 1];
                const prevSubtopics = await Subtopic.find({ topic: previousTopic._id });

                if (prevSubtopics.length === 0) {
                    response.push({ ...topic.toObject(), locked: true });
                    continue;
                }

                const completed = await UserProgress.countDocuments({
                    user: userId,
                    subtopic: { $in: prevSubtopics.map(s => s._id) },
                    completed: true
                });

                const allCompleted = completed === prevSubtopics.length;

                response.push({
                    ...topic.toObject(),
                    locked: !allCompleted
                });
            }

            res.json(response);

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: "No se pudieron obtener los temas" });
        }
    }



    static async createTopic(req: Request, res: Response) {
        try {
            const { title, description, subject } = req.body;
            if (!title || !subject) {
                return res.status(400).json({ error: "title y subject son requeridos" });
            }
            const topic = await Topic.create({ title, description, subject });
            res.status(201).json(topic);
        } catch (error) {
            res.status(500).json({ error: "No se pudo crear el tema" });
        }
    }

    static async updateTopic(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { title, description } = req.body;
            const updated = await Topic.findByIdAndUpdate(
                id,
                { title, description },
                { new: true }
            );
            if (!updated) return res.status(404).json({ error: "Tema no encontrado" });
            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: "No se pudo actualizar el tema" });
        }
    }

    static async deleteTopic(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const deleted = await Topic.findByIdAndDelete(id);
            if (!deleted) return res.status(404).json({ error: "Tema no encontrado" });
            res.json({ ok: true });
        } catch (error) {
            res.status(500).json({ error: "No se pudo eliminar el tema" });
        }
    }

    static async getSubtopicsByTopic(req: Request, res: Response) {
        try {
            const { topicId } = req.params;
            const userId = req.user.id;

            const subtopics = await Subtopic.find({ topic: topicId }).sort({ order: 1 });

            const response = [];

            for (let i = 0; i < subtopics.length; i++) {
                const sub = subtopics[i];

                // --- PRIMER SUBTEMA SIEMPRE DESBLOQUEADO ---
                if (i === 0) {
                    response.push({ ...sub.toObject(), locked: false });
                    continue;
                }

                // Subtema anterior
                const previousSubtopic = subtopics[i - 1];

                // Buscar si el usuario completó el subtema anterior
                const progress = await UserProgress.findOne({
                    user: userId,
                    subtopic: previousSubtopic._id
                });

                const completed = progress?.completed === true;

                response.push({
                    ...sub.toObject(),
                    locked: !completed
                });
            }

            return res.json(response);

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "No se pudieron obtener los subtemas" });
        }
    }


    static async getSubtopicDetail(req: Request, res: Response) {
        console.log("\n========== 📌 getSubtopicDetail START ==========");
        try {
            const { subtopicId } = req.params;
            const userId = req.user._id;

            console.log("➡️ Subtopic ID:", subtopicId);
            console.log("➡️ User ID:", userId);

            const subtopic = await Subtopic.findById(subtopicId);
            if (!subtopic) {
                console.log("❌ Subtopic no encontrado");
                return res.status(404).json({ error: "Subtema no encontrado" });
            }

            console.log("📘 Subtopic encontrado:", subtopic.title);

            // 1. Borrar previos
            await Question.deleteMany({ subtopic: subtopicId, user: userId });
            await Excersise.deleteMany({ subtopic: subtopicId, user: userId });
            await UserProgress.findOneAndUpdate(
                { user: userId, subtopic: subtopicId },
                {
                    completed: false,
                    score: 0,
                    answeredQuestions: [],
                    completedExercises: []
                },
                { upsert: true }
            );

            // 2. Generar preguntas
            const questionsPrompt = `
        Genera un JSON con 4 preguntas de opción múltiple basadas en:
        "${subtopic.content}"

        Formato:
        {
            "questions": [
                {
                    "question": "...",
                    "options": ["A", "B", "C", "D"],
                    "correctAnswer": "A",
                    "explanation": "...",
                    "generatedByLLM": true
                }
            ]
        }
        `;
            const qData = await callLLM(questionsPrompt);
            const questions = qData?.questions || qData?.rawText?.questions;

            if (!Array.isArray(questions)) {
                return res.status(400).json({ error: "LLM no generó preguntas válidas", llmResponse: qData });
            }

            const letters = ["A", "B", "C", "D"];

            const savedQuestions = await Question.insertMany(
                questions.map(q => {
                    let correctAnswer = q.correctAnswer;

                    // ⚡ Si correctAnswer es un texto, buscamos su índice en options
                    if (!letters.includes(correctAnswer)) {
                        const index = q.options.findIndex(opt =>
                            opt.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
                        );
                        if (index >= 0) correctAnswer = letters[index];
                        else correctAnswer = "A"; // fallback por si no encuentra coincidencia
                    }

                    return {
                        subtopic: subtopicId,
                        user: userId,
                        question: q.question,
                        options: q.options,
                        correctAnswer,
                        explanation: q.explanation,
                        generatedByLLM: true
                    };
                })
            );


            let savedExercise = null;

            // 3. Generar ejercicio solo si requiresExercise = true
            if (subtopic.requiresExercise !== false) {
                const exercisePrompt = `
                Devuelve SOLO un JSON válido (sin texto adicional) usando triple backticks.
                Asegúrate de que "expectedOutput" sea un snippet de código Java que funcione
                y que "solutionExplanation" explique los pasos.

                Formato:
                \`\`\`json
                {
                    "title": "string",
                    "description": "string",
                    "codeTemplate": "string",
                    "expectedOutput": "string (código Java)",
                    "solutionExplanation": "string",
                    "question": "string"
                }
                \`\`\`

                Crea un ejercicio práctico en Java sobre el tema "${subtopic.title}",
                relacionado con: "${subtopic.content}".
            `;

                const eDataRaw = await callLLM(exercisePrompt);

                // 🔧 JSON FIXER
                let eData: any = null;
                try {
                    if (typeof eDataRaw === "object" && eDataRaw.title) {
                        eData = eDataRaw;
                    } else {
                        const text = eDataRaw.rawText || eDataRaw;
                        const match = text.match(/```json([\s\S]*?)```/);
                        let jsonStr = match ? match[1] : text;
                        jsonStr = jsonStr.replace(/"\s*\+\s*"/g, "");
                        eData = JSON.parse(jsonStr);
                    }
                } catch (err) {
                    console.log("❌ ERROR: No se pudo parsear JSON del ejercicio, rawText:", eDataRaw);
                    return res.status(400).json({ error: "LLM no generó el ejercicio correctamente", llmResponse: eDataRaw });
                }

                if (!eData.title || !eData.description || !eData.expectedOutput) {
                    return res.status(400).json({ error: "JSON del ejercicio incompleto", llmResponse: eData });
                }

                savedExercise = await Excersise.create({
                    subtopic: subtopicId,
                    user: userId,
                    title: eData.title,
                    description: eData.description,
                    codeTemplate: eData.codeTemplate || "",
                    expectedOutput: eData.expectedOutput, // ✅ Aquí va el código Java como solución
                    solutionExplanation: eData.solutionExplanation || "",
                    generatedByLLM: true
                });
            }

            // 4. Respuesta final
            res.json({
                subtopic,
                exercises: savedExercise ? [savedExercise] : [],
                questions: savedQuestions
            });

            console.log("🎉 ÉXITO: SubtopicDetail completado correctamente");
        } catch (error: any) {
            console.log("❌ ERROR GENERAL:", error);
            res.status(500).json({ error: error.message });
        }
    }


    static async createSubtopic(req: Request, res: Response) {
        try {
            const { title, content, examples, requiresExercise, topic } = req.body;

            if (!title || !topic) {
                return res.status(400).json({ error: "title y topic son requeridos" });
            }

            // Obtener cantidad de subtemas actuales del tema
            const count = await Subtopic.countDocuments({ topic });

            const subtopic = await Subtopic.create({
                title,
                content,
                examples,
                requiresExercise,
                topic,
                order: count  // <-- así se asigna automáticamente
            });

            res.status(201).json(subtopic);
        } catch (error) {
            res.status(500).json({ error: "No se pudo crear el subtema" });
        }
    }


    static async updateSubtopic(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { title, description } = req.body;
            const updated = await Subtopic.findByIdAndUpdate(
                id,
                { title, description },
                { new: true }
            );
            if (!updated) return res.status(404).json({ error: "Subtema no encontrado" });
            res.json(updated);
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
