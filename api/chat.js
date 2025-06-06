import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, appState } = req.body;
        
        // Configurar Gemini con la clave API de las variables de entorno
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Mapear mensajes al formato de Gemini
        const geminiMessages = messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        // Añadir el contexto del estado de la aplicación
        const chat = model.startChat({
            history: [{
                role: "user",
                parts: [{ text: `Estado actual de la aplicación:\n${JSON.stringify(appState, null, 2)}` }]
            }]
        });

        // Obtener respuesta
        const result = await chat.sendMessage(messages[messages.length - 1].content);
        const response = await result.response;

        res.status(200).json({
            choices: [{
                message: {
                    content: response.text()
                }
            }]
        });
    } catch (error) {
        console.error('Error in chat API:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
    }
}
