const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

class TaskManagerMCP {
  constructor() {
    this.app = express();
    this.app.use(bodyParser.json());
    this.setupRoutes();
    // Inicializar con un estado vacío que será actualizado por el frontend
    this.appState = {
      folders: [],
      trash: [],
      currentFolderId: null
    };
    this.chatHistory = []; // Mantener el historial de chat para Deepseek
  }

  setupRoutes() {
    // API de Deepseek (integración de la API en este endpoint)
    this.app.post('/api/chat', async (req, res) => {
      try {
        const { messages, appState } = req.body; // Recibir messages y appState
        
        // Actualizar el estado interno del servidor con el appState del frontend
        if (appState) {
          this.appState.folders = appState.folders || [];
          this.appState.trash = appState.trash || [];
          this.appState.currentFolderId = appState.currentFolderId || null;
        }

        // Usar el historial de chat completo del frontend para la llamada a Deepseek
        // Esto asegura que Deepseek tenga el contexto completo de la conversación
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
          model: "deepseek-reasoning",
          messages: messages // Usar el historial de mensajes completo del frontend
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        // No es necesario mantener chatHistory aquí si el frontend lo maneja
        // this.chatHistory.push(
        //   { role: "user", content: message },
        //   { role: "assistant", content: response.data.choices[0].message.content }
        // );

        res.json(response.data);
      } catch (error) {
        console.error('Error calling Deepseek API:', error);
        res.status(500).json({ error: 'Failed to process chat message' });
      }
    });

    // Respuestas básicas del asistente (este endpoint no se usa con Deepseek)
    this.app.post('/chat', async (req, res) => {
      const message = req.body.message;
      let response = '';

      // Sistema básico de respuestas
      if (message.toLowerCase().includes('hola')) {
        response = '¡Hola! Soy tu asistente personal. ¿En qué puedo ayudarte?';
      } else if (message.toLowerCase().includes('como estas')) {
        response = '¡Muy bien, gracias! Estoy listo para ayudarte con tus tareas. ¿Qué necesitas?';
      } else if (message.toLowerCase().includes('crear carpeta')) {
        response = 'Claro, puedo ayudarte a crear una carpeta. ¿Qué nombre quieres darle?';
      } else {
        response = 'Estoy aquí para ayudarte. Puedo crear carpetas, agregar tareas y más. ¿Qué te gustaría hacer?';
      }

      res.json({ response });
    });

    // Gestión de carpetas (estas funciones ahora operarán sobre this.appState.folders)
    this.app.post('/api/folders', (req, res) => {
      const { name } = req.body;
      const newFolder = { id: Date.now(), name, tasks: [], finished: [], isDefaultRewards: false }; // Asegurar consistencia con el frontend
      this.appState.folders.push(newFolder);
      // No guardar en localStorage aquí, eso es responsabilidad del frontend
      res.json(newFolder);
    });

    // Gestión de tareas (estas funciones ahora operarán sobre this.appState.folders)
    this.app.post('/api/folders/:folderId/tasks', (req, res) => {
      const { folderId } = req.params;
      const { name, time } = req.body;
      const folder = this.appState.folders.find(f => f.id == folderId); // Usar appState.folders
      
      if (!folder) return res.status(404).json({ error: 'Folder not found' });

      const newTask = { 
        id: Date.now(), 
        name, 
        time: time || null,
        steps: [],
        isExpanded: false, // Consistencia con frontend
        scheduledTimestamp: null, // Consistencia con frontend
        currentStepIndex: 0, // Consistencia con frontend
        totalTime: time ? parseInt(time, 10) * 60 : null, // Convertir a segundos si se proporciona
        stepTimes: [] // Consistencia con frontend
      };
      folder.tasks.push(newTask);
      res.json(newTask);
    });

    // Gestión de pasos (estas funciones ahora operarán sobre this.appState.folders)
    this.app.post('/api/tasks/:taskId/steps', (req, res) => {
      const { taskId } = req.params;
      const { description } = req.body;
      
      for (const folder of this.appState.folders) { // Usar appState.folders
        const task = folder.tasks.find(t => t.id == taskId);
        if (task) {
          const newStep = description; // Los pasos son strings en el frontend
          task.steps.push(newStep);
          return res.json({ success: true, step: newStep }); // Devolver el paso añadido
        }
      }
      
      res.status(404).json({ error: 'Task not found' });
    });

    // Nuevo endpoint para eliminar carpetas por nombre (para que la IA pueda limpiar duplicados)
    this.app.delete('/api/folders/:name', (req, res) => {
      const { name } = req.params;
      const initialLength = this.appState.folders.length;
      this.appState.folders = this.appState.folders.filter(f => f.name !== name || f.isDefaultRewards); // No eliminar recompensas
      if (this.appState.folders.length < initialLength) {
        res.json({ success: true, message: `Carpeta "${name}" eliminada.` });
      } else {
        res.status(404).json({ error: `Carpeta "${name}" no encontrada o es una carpeta predeterminada.` });
      }
    });

    // Nuevo endpoint para eliminar tareas por nombre
    this.app.delete('/api/tasks/:name', (req, res) => {
      const { name } = req.params;
      let taskFoundAndDeleted = false;
      for (const folder of this.appState.folders) {
        const initialTaskLength = folder.tasks.length;
        folder.tasks = folder.tasks.filter(t => t.name !== name);
        if (folder.tasks.length < initialTaskLength) {
          taskFoundAndDeleted = true;
          break;
        }
        const initialFinishedLength = folder.finished.length;
        folder.finished = folder.finished.filter(t => t.name !== name);
        if (folder.finished.length < initialFinishedLength) {
          taskFoundAndDeleted = true;
          break;
        }
      }
      if (taskFoundAndDeleted) {
        res.json({ success: true, message: `Tarea "${name}" eliminada.` });
      } else {
        res.status(404).json({ error: `Tarea "${name}" no encontrada.` });
      }
    });

    // Nuevo endpoint para eliminar pasos por descripción
    this.app.delete('/api/tasks/:taskName/steps/:stepDescription', (req, res) => {
      const { taskName, stepDescription } = req.params;
      let stepFoundAndDeleted = false;
      for (const folder of this.appState.folders) {
        const task = folder.tasks.find(t => t.name === taskName);
        if (task) {
          const initialStepLength = task.steps.length;
          task.steps = task.steps.filter(s => s !== stepDescription);
          if (task.steps.length < initialStepLength) {
            stepFoundAndDeleted = true;
            break;
          }
        }
      }
      if (stepFoundAndDeleted) {
        res.json({ success: true, message: `Paso "${stepDescription}" eliminado de la tarea "${taskName}".` });
      } else {
        res.status(404).json({ error: `Paso "${stepDescription}" no encontrado en la tarea "${taskName}".` });
      }
    });

    // Obtener estructura completa (ahora devuelve el estado real)
    this.app.get('/api/structure', (req, res) => {
      res.json(this.appState); // Devolver el estado completo
    });
  }

  start(port = 3001) {
    this.server = this.app.listen(port, () => {
      console.log(`Task Manager MCP server running on port ${port}`);
    });
  }
}

module.exports = TaskManagerMCP;

// Iniciar servidor si se ejecuta directamente
if (require.main === module) {
  const server = new TaskManagerMCP();
  server.start();
}
