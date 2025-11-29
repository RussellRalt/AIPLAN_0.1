// Sistema de autenticación mejorado para AIPLAN
import { supabase } from './supabase.js';

// Función para registrar un nuevo usuario
export async function signUp(email, password) {
    try {
        if (!email || !password) {
            throw new Error('El correo electrónico y la contraseña son requeridos');
        }

        if (password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: window.location.origin,
                data: {
                    email: email
                }
            }
        });

        if (error) {
            console.error('Error al registrar usuario:', error.message);
            throw error;
        }

        if (data.user && data.user.identities && data.user.identities.length === 0) {
            throw new Error('Este correo electrónico ya está registrado. Por favor, inicia sesión.');
        }

        console.log('Usuario registrado exitosamente:', data.user);
        return data.user;
    } catch (error) {
        console.error('Error en el proceso de registro:', error);
        throw error;
    }
}

// Función para iniciar sesión
export async function signIn(email, password) {
    try {
        if (!email || !password) {
            throw new Error('El correo electrónico y la contraseña son requeridos');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error('Error al iniciar sesión:', error.message);
            throw error;
        }

        console.log('Inicio de sesión exitoso:', data.user);
        return data.user;
    } catch (error) {
        console.error('Error en el proceso de inicio de sesión:', error);
        throw error;
    }
}

// Función para cerrar sesión
export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error al cerrar sesión:', error.message);
            throw error;
        }
        console.log('Sesión cerrada exitosamente');
    } catch (error) {
        console.error('Error en el proceso de cierre de sesión:', error);
        throw error;
    }
}

// Función para obtener el usuario actual
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            console.error('Error al obtener el usuario actual:', error.message);
            throw error;
        }
        return user;
    } catch (error) {
        console.error('Error al obtener el usuario actual:', error);
        throw error;
    }
}

// Función para manejar los cambios en el estado de autenticación
async function handleAuthStateChange(event, session) {
    console.log('Auth state changed:', event, session);
    const authSection = document.getElementById('authSection');
    const foldersSection = document.getElementById('foldersSection');
    const tasksSection = document.getElementById('tasksSection');
    const trashSection = document.getElementById('trashSection');
    const entitiesSection = document.getElementById('entitiesSection');
    const chatModal = document.getElementById('chatModal');
    const aiButton = document.getElementById('aiButton');
    const authChoiceDiv = document.getElementById('authChoiceDiv');
    const authContainer = document.querySelector('.auth-container');
    const headerAuthIcon = document.getElementById('headerAuthIcon');
    const globalHeader = document.querySelector('.global-fixed-header');
    
    // Manejar visibilidad del header primero
    if (globalHeader) {
        globalHeader.style.display = event === 'SIGNED_IN' ? 'flex' : 'none';
    }

    // Asegurarse de que el chat y el botón AI estén ocultos primero
    if (chatModal) chatModal.style.display = 'none';
    if (aiButton) aiButton.style.display = 'none';

    if (event === 'SIGNED_IN') {
        // Usuario autenticado - mostrar interfaz principal
        if (authSection) authSection.style.display = 'none';
        if (foldersSection) foldersSection.style.display = 'block';
        if (authChoiceDiv) authChoiceDiv.style.display = 'none';
        if (authContainer) authContainer.style.display = 'none';
        if (aiButton) aiButton.style.display = 'block';
        
        // Actualizar el icono de autenticación en el header
        if (headerAuthIcon && session?.user?.email) {
            headerAuthIcon.innerHTML = `<span style="font-size: 0.8rem; margin-right: 5px;">${session.user.email}</span> 🚪`;
            headerAuthIcon.title = 'Cerrar sesión';
        }
        
        // Cargar datos del usuario desde Supabase
        if (window.loadUserData) {
            await window.loadUserData();
        }
    } else if (event === 'SIGNED_OUT') {
        // Usuario no autenticado - mostrar interfaz de login
        if (authSection) authSection.style.display = 'flex';
        if (foldersSection) foldersSection.style.display = 'none';
        if (tasksSection) tasksSection.style.display = 'none';
        if (trashSection) trashSection.style.display = 'none';
        if (entitiesSection) entitiesSection.style.display = 'none';
        if (authChoiceDiv) authChoiceDiv.style.display = 'block';
        if (authContainer) authContainer.style.display = 'none';
        
        // Restablecer el icono de autenticación en el header
        if (headerAuthIcon) {
            headerAuthIcon.innerHTML = '👤';
            headerAuthIcon.title = 'Iniciar sesión';
        }
        
        // Limpiar datos locales
        if (window.clearLocalData) {
            window.clearLocalData();
        }
    }
}

// Configurar el listener de cambios en el estado de autenticación
supabase.auth.onAuthStateChange(handleAuthStateChange);

// Verificar el estado de autenticación inicial al cargar la página
export async function checkInitialAuthState() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error('Error al verificar la sesión inicial:', error);
            return;
        }
        
        // Manejar el estado inicial de autenticación
        await handleAuthStateChange(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
    } catch (error) {
        console.error('Error al verificar el estado de autenticación inicial:', error);
    }
}

// Llamar a la verificación inicial cuando se cargue el módulo
checkInitialAuthState();
