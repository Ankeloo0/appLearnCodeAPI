import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const MODEL = process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b-instruct';

const SYSTEM_PROMPT = `Eres un tutor de programación como SoloLearn. Explica de forma clara, paso a paso, con ejemplos cortos en JavaScript y Python. Siempre responde en formato JSON con los campos: { "explicacion": string, "ejemplo": string, "ejercicio": string }`;

router.post('/', async (req: Request, res: Response) => {
  try {
    const { prompt, type } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, error: 'Debes enviar un prompt (string) en el body.' });
    }

    // Modificamos el prompt según el type
    let promptToSend = prompt;
    switch (type) {
      case 'explicacion':
        promptToSend = `Explica de manera clara y concisa: ${prompt}`;
        break;
      case 'ejercicio':
        promptToSend = `Genera un ejercicio práctico relacionado con: ${prompt}`;
        break;
      case 'evaluacion':
        promptToSend = `Evalúa este código y indica si es correcto, dando feedback paso a paso: ${prompt}`;
        break;
      case 'pregunta':
        promptToSend = `Genera 3 preguntas de opción múltiple con sus opciones y respuestas correctas sobre: ${prompt}. Devuélvelo en JSON con campos: question, options, correctAnswer, explanation.`;
        break;
      default:
        promptToSend = prompt;

    }

    const ollamaResp = await axios.post('http://127.0.0.1:11434/api/chat', {
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: promptToSend }
      ],
      stream: false
    }, { timeout: 120000 });

    const raw = ollamaResp.data?.response
      ?? ollamaResp.data?.output
      ?? ollamaResp.data?.choices?.[0]?.message?.content
      ?? (typeof ollamaResp.data === 'string' ? ollamaResp.data : JSON.stringify(ollamaResp.data));

    // Intentamos parsear JSON directo
    let parsedOutput: any;
    try {
      parsedOutput = JSON.parse(raw);
    } catch (err) {
      const match = String(raw).match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsedOutput = JSON.parse(match[0]);
        } catch (err2) {
          parsedOutput = { _raw: raw };
        }
      } else {
        parsedOutput = { _raw: raw };
      }
    }

    // Garantizar los campos de salida
    parsedOutput.explicacion = parsedOutput.explicacion ?? "No se pudo generar explicación.";
    parsedOutput.ejemplo = parsedOutput.ejemplo ?? "Sin ejemplo disponible.";
    parsedOutput.ejercicio = parsedOutput.ejercicio ?? "Sin ejercicio propuesto.";

    return res.json({
      success: true,
      model: MODEL,
      type: type ?? "default",
      input: prompt,
      output: parsedOutput
    });

  } catch (error: any) {
    console.error('Ollama error:', error.response?.data ?? error.message);
    return res.status(500).json({
      success: false,
      error: 'Error generando respuesta con Ollama',
      details: error.response?.data ?? error.message
    });
  }
});

export default router;
