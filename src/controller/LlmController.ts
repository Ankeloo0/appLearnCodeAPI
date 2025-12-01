import { Request, Response } from 'express';
import { callLLM } from '../utils/llmService';
import Question from '../models/Question';
import Subtopic from '../models/Subtopic';
import Excersise from '../models/Excersise';
import UserProgress from '../models/UserProgress';

export class LlmController {

    static async evaluateExercise(req: Request, res: Response) {
        try {
            const { exerciseId } = req.params;
            const { userCode } = req.body;
            console.log(userCode);

            const userId = req.user?._id;

            if (!exerciseId || !userCode)
                return res.status(400).json({ error: "Faltan datos (exerciseId o userCode)" });

            const exercise = await Excersise.findById(exerciseId).populate("subtopic");
            if (!exercise)
                return res.status(404).json({ error: "Ejercicio no encontrado" });

            const sub = await Subtopic.findById(exercise.subtopic._id);
            if (!sub) {
                return res.status(404).json({ error: "Subtema no encontrado" });
            }

            if (sub.requiresExercise === false) {
                return res.status(400).json({ error: "Este subtema no requiere ejercicio" });
            }



            const prompt = `
Evalúa el siguiente código para java. Indica si el resultado coincide un poco o se acerca un poco con "${exercise.expectedOutput}".
Devuelve un JSON con { verdict: "correcto" | "incorrecto" }.

Código:
${userCode}
`;

            const result = await callLLM(prompt);
            const verdict = result.verdict?.toLowerCase() === "correcto";
            console.log(verdict);

            if (verdict) {
                // Actualizar progreso del usuario
                const userProgress = await UserProgress.findOneAndUpdate(
                    { user: userId, subtopic: exercise.subtopic._id },
                    {
                        $addToSet: { completedExercises: exercise._id },
                        $inc: { score: 20 },
                    },
                    { upsert: true, new: true }
                );

                // Verificar si completó todos los ejercicios y preguntas del subtema
                const totalExercises = await Excersise.countDocuments({
                    subtopic: exercise.subtopic._id,
                    user: userId // 👈 filtra solo los suyos
                });
                const totalQuestions = await Question.countDocuments({
                    subtopic: exercise.subtopic._id,
                    user: userId
                });


                if (
                    userProgress.completedExercises.length >= totalExercises &&
                    userProgress.answeredQuestions.length >= totalQuestions
                ) {
                    userProgress.completed = true;
                    await userProgress.save();

                    const subtopicId = exercise.subtopic._id;
                    await Question.deleteMany({ subtopic: subtopicId, user: userId });
                    await Excersise.deleteMany({ subtopic: subtopicId, user: userId });
                }
            }

            res.json({
                correct: verdict,
                expectedOutput: exercise.expectedOutput,
                explanation: exercise.solutionExplanation,
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async evaluateQuestion(req: Request, res: Response) {
        try {
            const { questionId } = req.params;
            const { selectedAnswer } = req.body;
            const userId = req.user?._id;
            console.log(questionId);
            console.log(selectedAnswer);
            console.log(userId);




            if (!questionId || !selectedAnswer)
                return res.status(400).json({ error: "Faltan datos (questionId o selectedAnswer)" });

            const question = await Question.findById(questionId).populate("subtopic");
            if (!question)
                return res.status(404).json({ error: "Pregunta no encontrada" });

            const isCorrect = selectedAnswer === question.correctAnswer;
            console.log(isCorrect);


            if (isCorrect) {
                const userProgress = await UserProgress.findOneAndUpdate(
                    { user: userId, subtopic: question.subtopic._id },
                    {
                        $addToSet: { answeredQuestions: question._id },
                        $inc: { score: 10 },
                    },
                    { upsert: true, new: true }
                );

                const totalExercises = await Excersise.countDocuments({
                    subtopic: question.subtopic._id,
                    user: userId
                });
                const totalQuestions = await Question.countDocuments({
                    subtopic: question.subtopic._id,
                    user: userId
                });


                if (
                    userProgress.completedExercises.length >= totalExercises &&
                    userProgress.answeredQuestions.length >= totalQuestions
                ) {
                    userProgress.completed = true;
                    await userProgress.save();
                }
            }

            res.json({
                correct: isCorrect,
                correctAnswer: question.correctAnswer,
                explanation: question.explanation,
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async generateQuestions(req: Request, res: Response) {
        const { subtopicId } = req.params;
        const userId = req.user?._id;
        console.log(subtopicId);


        if (!subtopicId)
            return res.status(400).json({ error: "Falta el ID del subtema" });

        try {
            const subtopic = await Subtopic.findById(subtopicId);
            if (!subtopic)
                return res.status(404).json({ error: "Subtema no encontrado" });

            const prompt = `
                Genera un JSON con 4 preguntas de opción múltiple basadas en el siguiente contenido:
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

            const data = await callLLM(prompt);

            const questions = data.questions || data.rawText?.questions;
            if (!Array.isArray(questions)) {
                return res.status(400).json({
                    error: "La respuesta del LLM no contiene preguntas válidas.",
                });
            }

            const savedQuestions = await Question.insertMany(
                questions.map((q: any) => ({
                    subtopic: subtopic._id,
                    user: userId,
                    question: q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation,
                    generatedByLLM: q.generatedByLLM ?? true,
                }))
            );

            res.status(201).json({
                success: true,
                subtopic: subtopic.title,
                savedCount: savedQuestions.length,
                questions: savedQuestions,
            });
        } catch (error: any) {
            console.error("❌ Error generando preguntas:", error);
            res.status(500).json({ error: error.message || "Error interno" });
        }
    }


    static async generateCodingExercise(req: Request, res: Response) {
        const { subtopicId } = req.params;
        const userId = req.user?._id;
        console.log(userId);


        if (!subtopicId)
            return res.status(400).json({ error: "Falta el subtema" });

        try {
            const subtopic = await Subtopic.findById(subtopicId);
            if (!subtopic)
                return res.status(404).json({ error: "Subtema no encontrado" });

            const prompt = `
                Crea un ejercicio práctico en java de programación sobre el tema "${subtopic.title}", 
                relacionado con el contenido: "${subtopic.content}".
                Asegúrate de que el ejercicio sea útil para estudiantes de programación.

                Devuelve el resultado **en formato JSON válido** con esta estructura exacta:
                {
                "title": "string",
                "description": "string",
                "codeTemplate": "string",
                "expectedOutput": "string",
                "solutionExplanation": "string"
                }
                `;

            // 🔍 Llamar al modelo
            const result = await callLLM(prompt);

            console.log(result);

            if (!result || !result.title || !result.description || !result.expectedOutput) {
                return res.status(400).json({ error: "El modelo no devolvió un JSON válido" });
            }

            const newExercise = await Excersise.create({
                subtopic: subtopicId,
                user: userId,
                question: result.question || "Resuelve el ejercicio descrito arriba.",
                codeTemplate: result.codeTemplate || "",
                expectedOutput: result.expectedOutput,
                solutionExplanation: result.solutionExplanation || "",
                generatedByLLM: true, // agregado para cumplir con el esquema
            });


            // ✅ Respuesta final
            res.status(201).json({
                message: "Ejercicio generado y guardado correctamente",
                exercise: newExercise,
            });

        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async evaluateCode(req: Request, res: Response) {
        const { userCode, expectedOutput } = req.body;
        if (!userCode || !expectedOutput)
            return res.status(400).json({ error: 'Faltan userCode o expectedOutput' });

        const prompt = `
            Evalúa el siguiente código. Indica si el resultado coincide con "${expectedOutput}".
            Devuelve un JSON con: { verdict, explanation, suggestions }

            Código:
            ${userCode}
        `

        try {
            const data = await callLLM(prompt);
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async generateHint(req: Request, res: Response) {
        const { userQuestion } = req.body;
        if (!userQuestion) return res.status(400).json({ error: 'Falta la pregunta del usuario' });

        const prompt = `
            Proporciona una pista progresiva o explicación paso a paso para la siguiente pregunta:
            "${userQuestion}"
            `
            ;

        try {
            const data = await callLLM(prompt);
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async normalizeContent(req: Request, res: Response) {
        const { notes } = req.body;
        if (!notes) return res.status(400).json({ error: 'Faltan notas o texto' });

        const prompt = `
Convierte el siguiente texto en un formato JSON estructurado para guardarlo en una base de datos:
"${notes}"
`;

        try {
            const data = await callLLM(prompt);
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async generateVariants(req: Request, res: Response) {
        const { baseQuestion } = req.body;
        if (!baseQuestion) return res.status(400).json({ error: 'Falta la pregunta base' });

        const prompt = `
Genera 3 variantes diferentes de la siguiente pregunta para evitar repetición:
"${baseQuestion}"
Formato JSON con nuevas versiones.
`;

        try {
            const data = await callLLM(prompt);
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async chatTutor(req: Request, res: Response) {
        const { question, subtopic } = req.body;
        if (!question) return res.status(400).json({ error: 'Falta la pregunta' });

        const prompt = `
Eres un tutor de programación. Responde la siguiente pregunta del estudiante sobre "${subtopic || 'programación en general'}":
"${question}"
`;

        try {
            const data = await callLLM(prompt);
            res.json(data);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
