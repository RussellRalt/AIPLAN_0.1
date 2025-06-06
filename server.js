const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Importar la librería de Gemini
const app = express();

// Configura tu clave API de Gemini desde las variables de entorno
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde el directorio actual
app.use(express.static(__dirname));

app.post('/api/chat', async (req, res) => {
  console.log('Solicitud recibida en /api/chat');
  try {
    const messages = req.body.messages; // El historial completo de mensajes
    const appState = req.body.appState; // Obtener el estado de la aplicación del frontend

    // Mapear el historial de mensajes al formato de Gemini
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Construir el historial de mensajes para Gemini, incluyendo el estado de la aplicación
    // Construir el historial de mensajes para Gemini, incluyendo el estado de la aplicación
    // Construir el historial de mensajes para Gemini, incluyendo el estado de la aplicación

    // Construir el historial de mensajes para Gemini, incluyendo el estado de la aplicación
    const historyForGemini = [
      {
        role: "user",
        parts: [{ text: `Eres un asistente útil que puede ayudar a organizar carpetas, tareas y pasos.
        Tienes acceso al estado actual de la aplicación a través del siguiente objeto JSON:
        \`\`\`json
        ${JSON.stringify(appState, null, 2)}
        \`\`\`
        Tu objetivo es responder con un JSON en el campo 'action' y 'params' para que la aplicación ejecute la acción. Si necesitas realizar múltiples acciones, puedes responder con múltiples bloques JSON concatenados.

        Acciones disponibles:

        1.  **Crear Carpeta**:
            *   Petición: "crea una carpeta llamada [nombre de carpeta]"
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He creado la carpeta '[nombre de carpeta]'.", "action": "createFolder", "params": "[nombre de carpeta]" } \`\`\`

        2.  **Crear Tarea en Carpeta (con tiempo opcional)**:
            *   Petición: "crea una tarea [nombre de tarea] en la carpeta [nombre de carpeta] con [X] minutos" (donde [X] es un número)
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He creado la tarea '[nombre de tarea]' en la carpeta '[nombre de carpeta]' con [X] minutos.", "action": "createTask", "params": { "folderName": "[nombre de carpeta]", "taskName": "[nombre de tarea]", "totalTime": [X en minutos, como número entero] } } \`\`\`
            *   Si no se especifica tiempo: \`\`\`json { "content": "¡Claro! He creado la tarea '[nombre de tarea]' en la carpeta '[nombre de carpeta]'.", "action": "createTask", "params": { "folderName": "[nombre de carpeta]", "taskName": "[nombre de tarea]" } } \`\`\`

        3.  **Añadir Paso a Tarea**:
            *   Petición: "añade el paso [descripción del paso] a la tarea [nombre de tarea]"
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He añadido el paso '[descripción del paso]' a la tarea '[nombre de tarea]'.", "action": "addStep", "params": { "taskName": "[nombre de tarea]", "stepDescription": "[descripción del paso]" } } \`\`\`

        4.  **Eliminar Tarea**:
            *   Petición: "elimina la tarea [nombre de tarea]" (Si existen múltiples tareas con el mismo nombre, se eliminarán todas las que coincidan.)
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He eliminado la tarea '[nombre de tarea]'.", "action": "deleteTask", "params": { "taskName": "[nombre de tarea]" } } \`\`\`

        5.  **Eliminar Carpeta**:
            *   Petición: "elimina la carpeta [nombre de carpeta]" (Si existen múltiples carpetas con el mismo nombre, se eliminarán todas las que coincidan.)
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He eliminado la carpeta '[nombre de carpeta]'.", "action": "deleteFolder", "params": "[nombre de carpeta]" } \`\`\`
            *   Nota: La carpeta 'Recompensas' no puede ser eliminada.

        6.  **Listar Carpetas**:
            *   Petición: "lista mis carpetas" o "qué carpetas tengo"
            *   Respuesta conversacional, usando la información de 'appState.folders'.

        7.  **Listar Tareas en Carpeta**:
            *   Petición: "lista las tareas en [nombre de carpeta]"
            *   Respuesta conversacional, usando la información de 'appState.folders' para encontrar la carpeta y sus tareas.

        8.  **Listar Pasos de Tarea**:
            *   Petición: "lista los pasos de la tarea [nombre de tarea]"
            *   Respuesta conversacional, usando la información de 'appState.folders' para encontrar la tarea y sus pasos.

        9.  **Listar Papelera**:
            *   Petición: "lista la papelera" o "qué hay en la papelera"
            *   Respuesta conversacional, usando la información de 'appState.trash'.

        10. **Restaurar de Papelera**:
            *   Petición: "restaura [nombre de elemento] de la papelera"
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He restaurado '[nombre de elemento]' de la papelera.", "action": "restoreFromTrash", "params": "[nombre de elemento]" } \`\`\`

        11. **Eliminar Permanentemente de Papelera**:
            *   Petición: "elimina permanentemente [nombre de elemento] de la papelera"
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He eliminado permanentemente '[nombre de elemento]' de la papelera.", "action": "permanentlyDelete", "params": "[nombre de elemento]" } \`\`\`

        12. **Vaciar Papelera**:
            *   Petición: "vacía la papelera" o "limpia la papelera"
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He vaciado la papelera.", "action": "emptyTrash", "params": {} } \`\`\`

        13. **Cambiar Tema**:
            *   Petición: "cambia el tema a [claro/oscuro/retro]"
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He cambiado el tema a '[nombre de tema]'.", "action": "changeTheme", "params": "[nombre de tema]" } \`\`\`

        14. **Iniciar Presentación**:
            *   Petición: "inicia la presentación de la tarea [nombre de tarea]" o "dale play a la tarea [nombre de tarea]"
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! Iniciando la presentación de la tarea '[nombre de tarea]'.", "action": "startPresentation", "params": "[nombre de tarea]" } \`\`\`

        15. **Programar Tarea**:
            *   Petición: "programa la tarea [nombre de tarea] para el [fecha] a las [hora]"
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He programado la tarea '[nombre de tarea]' para el [fecha] a las [hora].", "action": "scheduleTask", "params": { "taskName": "[nombre de tarea]", "date": "[fecha en formato YYYY-MM-DD]", "time": "[hora en formato HH:MM]" } } \`\`\`

        16. **Mover Tarea**:
            *   Petición: "mueve la tarea [nombre de tarea] a la carpeta [nombre de carpeta]"
            *   Respuesta JSON: \`\`\`json { "content": "¡Claro! He movido la tarea '[nombre de tarea]' a la carpeta '[nombre de carpeta]'.", "action": "moveTask", "params": { "taskName": "[nombre de tarea]", "targetFolderName": "[nombre de carpeta]" } } \`\`\`

        Para cualquier otra pregunta, responde de forma conversacional.
        ` }],
      },
      {
        role: "model",
        parts: [{ text: "Entendido. ¿En qué puedo ayudarte?" }],
      },
      ...geminiMessages
    ];

    const chat = model.startChat({
      history: historyForGemini,
      generationConfig: {
        maxOutputTokens: 1000, // Aumentar el límite de tokens para evitar truncamiento
      },
    });

    const msgToSend = messages[messages.length - 1].content;
    let aiResponseContent = "Error: No se pudo obtener respuesta de Gemini.";
    let geminiResponseObject = null;

    try {
      const result = await chat.sendMessage(msgToSend);
      const response = await result.response;
      aiResponseContent = response.text();
      geminiResponseObject = response; // Guardar el objeto completo para depuración

      console.log('Respuesta cruda de Gemini:', aiResponseContent); // Depuración
      console.log('Respuesta completa de Gemini (objeto):', geminiResponseObject); // Nuevo log para ver el objeto completo
    } catch (geminiError) {
      console.error('Error al llamar a Gemini API:', geminiError);
      aiResponseContent = `Error al comunicarse con Gemini: ${geminiError.message}`;
      // Si el error tiene una respuesta HTTP, incluirla
      if (geminiError.response && geminiError.response.data) {
        aiResponseContent += ` Detalles: ${JSON.stringify(geminiError.response.data)}`;
      }
      // Enviar el error al frontend para que el usuario lo vea
      res.status(500).json({ error: aiResponseContent });
      return; // Salir de la función para evitar enviar doble respuesta
    }

    // Intentar parsear la respuesta de la IA para ver si contiene una acción
    let action = null;
    let params = null;
    let finalContent = aiResponseContent;

    // Limpiar la respuesta de Gemini de las comillas triples y la palabra "json"
    let cleanedResponseContent = aiResponseContent.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const parsedResponse = JSON.parse(cleanedResponseContent);
      if (parsedResponse.action && parsedResponse.params) {
        action = parsedResponse.action;
        params = parsedResponse.params;
        finalContent = parsedResponse.content || aiResponseContent; // Usar el contenido del JSON si existe
      }
    } catch (e) {
      // Si falla el parseo, no es un JSON de acción, se trata como texto normal
      console.log('No se pudo parsear como JSON de acción:', e.message);
    }

    // Si la IA no devolvió una acción explícita, intentar detectarla del texto
    if (!action && aiResponseContent.toLowerCase().includes('crear') && aiResponseContent.toLowerCase().includes('carpeta')) {
      const folderNameMatch = aiResponseContent.match(/carpeta (?:llamada |que se llame |)?["']?([^"']+)["']?/i);
      if (folderNameMatch && folderNameMatch[1]) {
        action = 'createFolder';
        params = folderNameMatch[1];
      }
    } else if (action === 'scheduleTask') {
      console.log(`Tarea "${params.taskName}" programada para el ${params.date} a las ${params.time}`);
      // Aquí podrías añadir lógica para guardar la tarea programada en una base de datos o un archivo
    } else if (action === 'moveTask') {
      console.log(`Tarea "${params.taskName}" movida a la carpeta "${params.targetFolderName}"`);
      // La lógica real de mover la tarea se manejará en el frontend (script.js)
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
    console.error('Error al comunicarse con Gemini API:', error);
    res.status(500).json({ error: 'Error al comunicarse con la API de Gemini: ' + error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
