import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }    try {
        const { messages, appState } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }

        // Validate appState structure
        if (!appState || !Array.isArray(appState.folders)) {
            return res.status(400).json({ error: 'Invalid application state' });
        }
        
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY no está configurada');
        }

        // Configurar Gemini con la clave API de las variables de entorno
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        // Mapear mensajes al formato de Gemini
        const geminiMessages = messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        // Añadir el contexto del estado de la aplicación
        const chat = model.startChat({
            history: [{
                role: "user",
                parts: [{ text: `Eres un asistente útil que puede ayudar a organizar carpetas, tareas y pasos.
                Estado actual de la aplicación:
                \`\`\`json
                ${JSON.stringify(appState, null, 2)}
                \`\`\`
                ` }]
            }]
        });

        // Obtener respuesta
        const result = await chat.sendMessage(messages[messages.length - 1].content);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({
            choices: [{
                message: {
                    content: text
                }
            }]
        });
    } catch (error) {
        console.error('Error in chat API:', error);
        res.status(500).json({ 
            error: 'Error al procesar el mensaje',
            details: error.message 
        });
    }
}
