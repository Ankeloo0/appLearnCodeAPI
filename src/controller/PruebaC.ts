  import { Request, Response } from "express";
  import { callLLM } from "../utils/llmService";

  export class PurebaC {
    static generateAndSaveQuestions = async (req: Request, res: Response) => {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Falta el prompt' });

      try {
        const questionsJson = await callLLM(prompt);
        return res.json(questionsJson);
      } catch (error: any) {
        return res.status(500).json({ error: error.message || 'Error interno' });
      }
    };
  }
