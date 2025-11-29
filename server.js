import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();

// Configurar OpenRouter
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://aiplan.vercel.app',
    'X-Title': 'AIPLAN'
  }
});

// Modelo gratuito de OpenRouter
const AI_MODEL = 'x-ai/grok-beta'; // Modelo gratuito de Grok

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde el directorio actual
app.use(express.static(__dirname));

// Endpoint para el chat con IA
app.post('/api/chat', async (req, res) => {
  console.log('Solicitud recibida en /api/chat');
  try {
    const messages = req.body.messages; // El historial completo de mensajes
    const appState = req.body.appState; // Obtener el estado de la aplicación del frontend

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Formato de mensajes inválido' });
    }

    // Construir el prompt del sistema con las instrucciones y el estado de la app
    const systemPrompt = `Eres un asistente útil que puede ayudar a organizar carpetas, tareas y pasos en AIPLAN.
Tienes acceso al estado actual de la aplicación a través del siguiente objeto JSON:
\`\`\`json
${JSON.stringify(appState, null, 2)}
\`\`\`

Tu objetivo es responder con un JSON que incluya 'content', 'action' y 'params' para que la aplicación ejecute la acción.

Acciones disponibles:

1. **Crear Carpeta**:
   - Petición: "crea una carpeta llamada [nombre]"
   - Respuesta JSON: \`\`\`json { "content": "¡Claro! He creado la carpeta '[nombre]'.", "action": "createFolder", "params": "[nombre]" } \`\`\`

2. **Crear Tarea en Carpeta (con tiempo opcional)**:
   - Petición: "crea una tarea [nombre] en la carpeta [carpeta]" o "crea una tarea [nombre] de [X] minutos en [carpeta]"
   - Respuesta JSON SIN tiempo: \`\`\`json { "content": "¡Claro! He creado la tarea '[nombre]' en la carpeta '[carpeta]'.", "action": "createTask", "params": { "folderName": "[carpeta]", "taskName": "[nombre]" } } \`\`\`
   - Respuesta JSON CON tiempo: \`\`\`json { "content": "¡Claro! He creado la tarea '[nombre]' en la carpeta '[carpeta]' con duración de [X] minutos.", "action": "createTask", "params": { "folderName": "[carpeta]", "taskName": "[nombre]", "time": [X] } } \`\`\`
   - IMPORTANTE: El parámetro 'time' debe ser un número (minutos), NO un string. Ejemplos: "time": 30, "time": 45, "time": 60

3. **Añadir Paso a Tarea**:
   - Petición: "añade el paso [descripción] a la tarea [nombre]"
   - Respuesta JSON: \`\`\`json { "content": "¡Claro! He añadido el paso '[descripción]' a la tarea '[nombre]'.", "action": "addStep", "params": { "taskName": "[nombre]", "stepDescription": "[descripción]" } } \`\`\`

4. **Eliminar Tarea**:
   - Petición: "elimina la tarea [nombre]"
   - Respuesta JSON: \`\`\`json { "content": "¡Claro! He eliminado la tarea '[nombre]'.", "action": "deleteTask", "params": { "taskName": "[nombre]" } } \`\`\`

5. **Eliminar Carpeta**:
   - Petición: "elimina la carpeta [nombre]"
   - Respuesta JSON: \`\`\`json { "content": "¡Claro! He eliminado la carpeta '[nombre]'.", "action": "deleteFolder", "params": "[nombre]" } \`\`\`

6. **Listar Carpetas**:
   - Petición: "lista mis carpetas" o "qué carpetas tengo"
   - Respuesta conversacional usando la información de 'appState.folders'.

7. **Listar Tareas en Carpeta**:
   - Petición: "lista las tareas en [carpeta]"
   - Respuesta conversacional usando la información de 'appState.folders'.

8. **Listar Pasos de Tarea**:
   - Petición: "lista los pasos de la tarea [nombre]"
   - Respuesta conversacional usando la información de 'appState.folders'.

9. **Cambiar Tema**:
   - Petición: "cambia el tema a [claro/oscuro/retro]"
   - Respuesta JSON: \`\`\`json { "content": "¡Claro! He cambiado el tema a '[tema]'.", "action": "changeTheme", "params": "[tema]" } \`\`\`

10. **Iniciar Presentación**:
    - Petición: "inicia la presentación de la tarea [nombre]"
    - Respuesta JSON: \`\`\`json { "content": "¡Claro! Iniciando la presentación de la tarea '[nombre]'.", "action": "startPresentation", "params": "[nombre]" } \`\`\`

11. **Programar Tarea**:
    - Petición: "programa la tarea [nombre] para el [fecha] a las [hora]"
    - Respuesta JSON: \`\`\`json { "content": "¡Claro! He programado la tarea '[nombre]' para el [fecha] a las [hora].", "action": "scheduleTask", "params": { "taskName": "[nombre]", "date": "[YYYY-MM-DD]", "time": "[HH:MM]" } } \`\`\`

12. **Mover Tarea**:
    - Petición: "mueve la tarea [nombre] a la carpeta [carpeta]"
    - Respuesta JSON: \`\`\`json { "content": "¡Claro! He movido la tarea '[nombre]' a la carpeta '[carpeta]'.", "action": "moveTask", "params": { "taskName": "[nombre]", "targetFolderName": "[carpeta]" } } \`\`\`

Para cualquier otra pregunta, responde de forma conversacional y útil.

IMPORTANTE: Siempre responde en formato JSON válido cuando se solicite una acción.`;

    // Preparar mensajes para OpenAI
    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    // Llamar a la API de OpenAI
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponseContent = completion.choices[0].message.content;
    console.log('Respuesta de IA:', aiResponseContent);

    // Intentar parsear la respuesta de la IA para ver si contiene una acción
    let action = null;
    let params = null;
    let finalContent = aiResponseContent;

    // Limpiar la respuesta de posibles bloques de código
    let cleanedResponseContent = aiResponseContent.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const parsedResponse = JSON.parse(cleanedResponseContent);
      if (parsedResponse.action && parsedResponse.params !== undefined) {
        action = parsedResponse.action;
        params = parsedResponse.params;
        finalContent = parsedResponse.content || aiResponseContent;
      }
    } catch (e) {
      // Si falla el parseo, no es un JSON de acción, se trata como texto normal
      console.log('Respuesta no es JSON de acción, tratando como texto conversacional');
    }

    res.json({
      choices: [
        {
          message: {
            content: finalContent,
            action: action,
            params: params
          }
        }
      ]
    });

  } catch (error) {
    console.error('Error al comunicarse con la API de IA:', error);
    res.status(500).json({ 
      error: 'Error al comunicarse con la API de IA: ' + error.message 
    });
  }
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'AIPLAN API funcionando correctamente' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor AIPLAN ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 Usando modelo de IA: ${AI_MODEL}`);
  console.log(`🔑 API Key configurada: ${process.env.OPENAI_API_KEY ? 'Sí' : 'No'}`);
});
