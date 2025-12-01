import { Request, Response } from "express";
import Topic from "../../models/Topic";
import Subject from "../../models/Subject";
import Subtopic from "../../models/Subtopic";
import UserProgress from "../../models/UserProgress";

class TopicAdminController {
static async createTopic(req: Request, res: Response) {
    try {
        const { subjectId } = req.params;
        const { title, description } = req.body;

        if (!subjectId || !title) {
            return res.status(400).json({ error: "Faltan campos obligatorios (subjectId, title)" });
        }

        const subject = await Subject.findById(subjectId);
        if (!subject) {
            return res.status(404).json({ error: "La materia especificada no existe" });
        }

        // Obtener último order
        const lastTopic = await Topic.find({ subject: subjectId })
            .sort({ order: -1 })
            .limit(1);

        const newOrder = lastTopic.length > 0 ? lastTopic[0].order + 1 : 0;

        const topic = await Topic.create({
            subject: subjectId,
            title,
            description,
            order: newOrder
        });

        res.status(201).json(topic);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear el tema" });
    }
}


  static async getTopics(req: Request, res: Response) {
    try {
      const topics = await Topic.find().populate("subject", "name");
      res.json(topics);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener los temas" });
    }
  }

  static async getTopicById(req: Request, res: Response) {
    try {
      const topic = await Topic.findById(req.params.id).populate("subject", "name");
      if (!topic) {
        return res.status(404).json({ error: "Tema no encontrado" });
      }
      res.json(topic);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener el tema" });
    }
  }

static async updateTopic(req: Request, res: Response) {
    try {
        const { title, description, subject: newSubjectId } = req.body;
        const topic = await Topic.findById(req.params.id);

        if (!topic) {
            return res.status(404).json({ error: "Tema no encontrado" });
        }

        const oldSubjectId = topic.subject.toString();

        // Actualizar datos básicos
        if (title) topic.title = title;
        if (description) topic.description = description;

        // Si el subject cambia, reasignar orden en ambos lados
        if (newSubjectId && newSubjectId !== oldSubjectId) {

            const newSubject = await Subject.findById(newSubjectId);
            if (!newSubject)
                return res.status(404).json({ error: "La nueva materia no existe" });

            // Reordenar los topics del viejo subject
            const oldTopics = await Topic.find({ subject: oldSubjectId }).sort({ order: 1 });
            for (let i = 0; i < oldTopics.length; i++) {
                oldTopics[i].order = i;
                await oldTopics[i].save();
            }

            // Nuevo order en el subject nuevo
            const lastTopic = await Topic.find({ subject: newSubjectId })
                .sort({ order: -1 })
                .limit(1);

            topic.order = lastTopic.length > 0 ? lastTopic[0].order + 1 : 0;
            topic.subject = newSubjectId;
        }

        await topic.save();
        res.json(topic);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar el tema" });
    }
}

static async deleteTopic(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const topic = await Topic.findByIdAndDelete(id);
        if (!topic) {
            return res.status(404).json({ error: "Tema no encontrado" });
        }

        // 1. Obtener subtemas del topic
        const subtopics = await Subtopic.find({ topic: id });
        const subtopicIds = subtopics.map(s => s._id);

        // 2. Borrar progreso asociado a esos subtemas
        await UserProgress.deleteMany({ subtopic: { $in: subtopicIds } });

        // 3. Borrar los subtemas
        await Subtopic.deleteMany({ topic: id });

        // 4. Reordenar topics del mismo subject
        const topics = await Topic.find({ subject: topic.subject }).sort({ order: 1 });

        for (let i = 0; i < topics.length; i++) {
            topics[i].order = i;
            await topics[i].save();
        }

        res.json({ message: "Tema, subtemas y progreso eliminado correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar el tema" });
    }
}

}

export default TopicAdminController;
