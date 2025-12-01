import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function callLLM(prompt: string): Promise<any> {
  try {
    const resp = await axios.post(
      GROQ_API_URL,
      {
        model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let textResponse = resp.data.choices[0].message.content.trim();

    // 🔍 Intentar extraer bloque JSON (entre ```json ... ```)
    const jsonMatch = textResponse.match(/```json\s*([\s\S]*?)```/i);
    if (jsonMatch) {
      textResponse = jsonMatch[1];
    } else {
      // Si no tiene bloque markdown, intentar detectar manualmente el primer '{' y último '}'
      const firstBrace = textResponse.indexOf('{');
      const lastBrace = textResponse.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        textResponse = textResponse.substring(firstBrace, lastBrace + 1);
      }
    }

    try {
      const parsed = JSON.parse(textResponse);
      return parsed;
    } catch (err) {
      console.warn('⚠️ No se pudo parsear el JSON, devolviendo texto crudo.');
      return { rawText: textResponse };
    }
  } catch (err: any) {
    console.error('Error al llamar a la API de Groq:', err.response?.data || err.message);
    throw new Error('Error al conectar con el modelo LLM');
  }
}
