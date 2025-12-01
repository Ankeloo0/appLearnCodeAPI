import { Request, Response } from "express";
import Subject from "../../models/Subject";
import Topic from "../../models/Topic";
import Subtopic from "../../models/Subtopic";
import UserProgress from "../../models/UserProgress";

class SubjectAdminController {
static async createSubject(req: Request, res: Response) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "El nombre de la materia es obligatorio" });
    }

    const existing = await Subject.findOne({ name });
    if (existing) {
      return res.status(400).json({ error: "Ya existe una materia con ese nombre" });
    }

    // Obtener el último subject para asignar order
    const lastSubject = await Subject.findOne().sort({ order: -1 });
    const order = lastSubject ? lastSubject.order + 1 : 0;

    const subject = await Subject.create({ 
      name, 
      description,
      order 
    });

    res.status(201).json(subject);

  } catch (error) {
    res.status(500).json({ error: "Error al crear la materia" });
  }
}


  static async getSubjects(req: Request, res: Response) {
    try {
      const subjects = await Subject.find();
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener las materias" });
    }
  }

  static async getSubjectById(req: Request, res: Response) {
    try {
      const subject = await Subject.findById(req.params.id);
      if (!subject) {
        return res.status(404).json({ error: "Materia no encontrada" });
      }
      res.json(subject);
    } catch (error) {
      res.status(500).json({ error: "Error al obtener la materia" });
    }
  }

static async updateSubject(req: Request, res: Response) {
  try {
    const { name, description } = req.body;
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return res.status(404).json({ error: "Materia no encontrada" });
    }

    if (name) subject.name = name;
    if (description) subject.description = description;

    await subject.save();
    res.json(subject);

  } catch (error) {
    res.status(500).json({ error: "Error al actualizar la materia" });
  }
}


static async deleteSubject(req: Request, res: Response) {
    try {
        const { id } = req.params;

        // 1. Eliminar la materia
        const subject = await Subject.findByIdAndDelete(id);
        if (!subject) {
            return res.status(404).json({ error: "Materia no encontrada" });
        }

        // 2. Obtener temas del subject
        const topics = await Topic.find({ subject: id });
        const topicIds = topics.map(t => t._id);

        // 3. Obtener subtemas de esos temas
        const subtopics = await Subtopic.find({ topic: { $in: topicIds } });
        const subtopicIds = subtopics.map(s => s._id);

        // 4. Borrar progreso asociado
        await UserProgress.deleteMany({ subtopic: { $in: subtopicIds } });

        // 5. Borrar subtemas y temas
        await Subtopic.deleteMany({ topic: { $in: topicIds } });
        await Topic.deleteMany({ subject: id });

        // 6. Reacomodar order de materias restantes
        const remainingSubjects = await Subject.find().sort({ order: 1 });

        for (let i = 0; i < remainingSubjects.length; i++) {
            await Subject.findByIdAndUpdate(remainingSubjects[i]._id, { order: i });
        }

        res.json({ message: "Materia, temas, subtemas y progreso eliminados correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar la materia" });
    }
}


}

export default SubjectAdminController;
