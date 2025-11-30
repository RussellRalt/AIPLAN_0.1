# AIPLAN 2025 - Gestor de Tareas Inteligente

## 📋 Descripción

AIPLAN es una aplicación web de gestión de tareas con inteligencia artificial integrada que permite organizar carpetas, tareas y pasos de manera eficiente. Incluye almacenamiento en la nube con Supabase para sincronizar tus notas entre dispositivos.

## ✨ Características Principales

- ✅ **Autenticación de Usuarios**: Sistema completo de registro e inicio de sesión con Supabase
- ☁️ **Almacenamiento en la Nube**: Todas tus notas se sincronizan automáticamente
- 🤖 **Asistente de IA**: Integración con OpenAI para gestionar tareas con lenguaje natural
- 📁 **Organización por Carpetas**: Crea carpetas para organizar tus tareas
- ⏱️ **Temporizadores**: Asigna tiempo estimado a cada tarea y paso
- 📅 **Programación**: Programa tareas para fechas específicas
- 🎯 **Sistema de Recompensas**: Motívate con recompensas al completar tareas
- 🗑️ **Papelera**: Recupera elementos eliminados accidentalmente
- 🌓 **Temas**: Modo oscuro, claro y cyberpunk
- 📤 **Compartir**: Comparte tareas por WhatsApp, Telegram, Email, etc.
- 👥 **Entidades**: Gestiona personas e instituciones relacionadas con tus tareas

## 🚀 Configuración del Proyecto

### Requisitos Previos

- Node.js 18.x o superior
- Cuenta de Supabase (gratuita)
- Navegador web moderno

### Instalación Local

1. **Clonar o descargar el proyecto**

2. **Instalar dependencias**
   ```bash
   cd aiplan2025
   npm install
   ```

3. **Configurar variables de entorno**
   
   El archivo `.env` ya está configurado con las credenciales de Supabase:
   ```
   PORT=3000
   SUPABASE_URL=https://tycaexhgfpzqjsojtnqd.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Iniciar el servidor**
   ```bash
   npm start
   ```

5. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 🗄️ Base de Datos Supabase

La base de datos ya está configurada con las siguientes tablas:

- **folders**: Carpetas de usuarios
- **tasks**: Tareas/notas
- **steps**: Pasos de cada tarea
- **trash**: Papelera
- **entities**: Entidades (personas/instituciones)

Todas las tablas tienen **Row Level Security (RLS)** habilitado para proteger los datos de cada usuario.

## 🤖 Integración de IA

La aplicación usa OpenAI (compatible con MCP) para el asistente inteligente. El modelo configurado es **gpt-4.1-mini** que ofrece:

- Respuestas rápidas y precisas
- Bajo costo de operación
- Compatibilidad con el sistema MCP de Manus

### Comandos de IA Disponibles

El asistente puede ejecutar las siguientes acciones:

- **Crear carpeta**: "crea una carpeta llamada Trabajo"
- **Crear tarea**: "crea una tarea Reunión en la carpeta Trabajo con 30 minutos"
- **Añadir paso**: "añade el paso Preparar agenda a la tarea Reunión"
- **Eliminar tarea**: "elimina la tarea Reunión"
- **Eliminar carpeta**: "elimina la carpeta Trabajo"
- **Listar carpetas**: "lista mis carpetas"
- **Listar tareas**: "lista las tareas en Trabajo"
- **Cambiar tema**: "cambia el tema a oscuro"
- **Programar tarea**: "programa la tarea Reunión para el 2025-12-01 a las 10:00"
- **Mover tarea**: "mueve la tarea Reunión a la carpeta Personal"

## 📱 Uso de la Aplicación

### Registro e Inicio de Sesión

1. Al abrir la aplicación, verás la pantalla de autenticación
2. Haz clic en "Registrarse" para crear una cuenta nueva
3. Ingresa tu correo electrónico y contraseña (mínimo 6 caracteres)
4. Verifica tu correo electrónico (Supabase envía un email de confirmación)
5. Inicia sesión con tus credenciales

### Gestión de Carpetas y Tareas

1. **Crear carpeta**: Escribe el nombre en el campo superior y presiona Enter
2. **Crear tarea**: Haz clic en una carpeta, escribe el nombre de la tarea y presiona Enter
3. **Añadir pasos**: Haz clic en una tarea para expandirla y añadir pasos
4. **Completar tarea**: Marca el checkbox junto a la tarea
5. **Programar tarea**: Haz clic en el icono de calendario

### Usar el Asistente de IA

1. Haz clic en el botón 🤖 en la esquina inferior derecha
2. Escribe tu solicitud en lenguaje natural
3. El asistente ejecutará la acción y te confirmará

### Sincronización Multi-Dispositivo

- Todos los cambios se guardan automáticamente en Supabase
- Inicia sesión desde cualquier dispositivo para acceder a tus notas
- Los datos se sincronizan en tiempo real

## 🌐 Despliegue en Producción

### Opción 1: Vercel (Recomendado)

1. Instala Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Despliega el proyecto:
   ```bash
   vercel
   ```

3. Sigue las instrucciones en pantalla

### Opción 2: Netlify

1. Crea un archivo `netlify.toml`:
   ```toml
   [build]
     command = "npm install"
     publish = "."

   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

2. Despliega desde el dashboard de Netlify

### Opción 3: Servidor Propio

1. Configura un servidor con Node.js
2. Clona el repositorio
3. Instala dependencias: `npm install`
4. Usa PM2 para mantener el servidor activo:
   ```bash
   npm install -g pm2
   pm2 start server.js --name aiplan
   pm2 save
   pm2 startup
   ```

## 🔒 Seguridad

- **Autenticación**: Supabase maneja la autenticación de forma segura
- **RLS**: Row Level Security protege los datos de cada usuario
- **HTTPS**: Usa siempre HTTPS en producción
- **Variables de Entorno**: Las claves API están protegidas

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express
- **Base de Datos**: Supabase (PostgreSQL)
- **IA**: OpenAI API (compatible con MCP)
- **Autenticación**: Supabase Auth
- **Despliegue**: Vercel/Netlify compatible

## 📝 Estructura del Proyecto

```
aiplan2025/
├── index.html          # Página principal
├── script.js           # Lógica de la aplicación
├── auth.js             # Sistema de autenticación
├── db.js               # Operaciones de base de datos
├── supabase.js         # Configuración de Supabase
├── server.js           # Servidor Express con IA
├── style.css           # Estilos principales
├── chat-styles.css     # Estilos del chat
├── manifest.json       # PWA manifest
├── package.json        # Dependencias
├── .env                # Variables de entorno
└── README.md           # Este archivo
```

## 🐛 Solución de Problemas

### El servidor no inicia

- Verifica que Node.js esté instalado: `node --version`
- Asegúrate de haber ejecutado `npm install`
- Revisa que el puerto 3000 esté disponible

### No puedo iniciar sesión

- Verifica que hayas confirmado tu correo electrónico
- Revisa las credenciales de Supabase en `supabase.js`
- Abre la consola del navegador para ver errores

### La IA no responde

- Verifica que la variable `OPENAI_API_KEY` esté configurada
- Revisa los logs del servidor en la terminal
- Asegúrate de tener conexión a internet

### Los datos no se sincronizan

- Verifica que estés autenticado
- Revisa la consola del navegador para errores
- Comprueba la configuración de Supabase

## 📄 Licencia

MIT License - Siéntete libre de usar y modificar este proyecto.

## 👨‍💻 Autor

Russell - AIPLAN 2025

## 🙏 Agradecimientos

- Supabase por el backend as a service
- OpenAI por la API de IA
- Manus por el entorno de desarrollo MCP

---

**¡Disfruta organizando tus tareas con AIPLAN!** 🚀
Sun Nov 30 10:56:41 EST 2025
