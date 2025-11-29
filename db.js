// Módulo para manejar operaciones de base de datos con Supabase
import { supabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

// ==================== CARPETAS ====================

export async function loadFolders() {
    try {
        const user = await getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('folders')
            .select('*')
            .eq('user_id', user.id)
            .order('position', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error al cargar carpetas:', error);
        return [];
    }
}

export async function saveFolder(folder) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const folderData = {
            user_id: user.id,
            name: folder.name,
            position: folder.position || 0,
            is_default_rewards: folder.isDefaultRewards || false
        };

        if (folder.id && folder.id.includes('-')) {
            // Es un UUID existente, actualizar
            const { data, error } = await supabase
                .from('folders')
                .update(folderData)
                .eq('id', folder.id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Nueva carpeta, insertar
            const { data, error } = await supabase
                .from('folders')
                .insert([folderData])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error('Error al guardar carpeta:', error);
        throw error;
    }
}

export async function deleteFolder(folderId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', folderId)
            .eq('user_id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error al eliminar carpeta:', error);
        throw error;
    }
}

// ==================== TAREAS ====================

export async function loadTasks(folderId) {
    try {
        const user = await getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .eq('folder_id', folderId)
            .order('position', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error al cargar tareas:', error);
        return [];
    }
}

export async function saveTask(task, folderId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const taskData = {
            user_id: user.id,
            folder_id: folderId,
            name: task.name,
            total_time: task.totalTime || 0,
            is_completed: task.isCompleted || false,
            scheduled_date: task.scheduledDate || null,
            position: task.position || 0
        };

        if (task.id && task.id.includes('-')) {
            // Es un UUID existente, actualizar
            const { data, error } = await supabase
                .from('tasks')
                .update(taskData)
                .eq('id', task.id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Nueva tarea, insertar
            const { data, error } = await supabase
                .from('tasks')
                .insert([taskData])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error('Error al guardar tarea:', error);
        throw error;
    }
}

export async function deleteTask(taskId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        throw error;
    }
}

// ==================== PASOS ====================

export async function loadSteps(taskId) {
    try {
        const user = await getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('steps')
            .select('*')
            .eq('user_id', user.id)
            .eq('task_id', taskId)
            .order('position', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error al cargar pasos:', error);
        return [];
    }
}

export async function saveStep(step, taskId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const stepData = {
            user_id: user.id,
            task_id: taskId,
            description: step.description,
            time_minutes: step.time || 0,
            is_completed: step.isCompleted || false,
            position: step.position || 0
        };

        if (step.id && step.id.includes('-')) {
            // Es un UUID existente, actualizar
            const { data, error } = await supabase
                .from('steps')
                .update(stepData)
                .eq('id', step.id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Nuevo paso, insertar
            const { data, error } = await supabase
                .from('steps')
                .insert([stepData])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error('Error al guardar paso:', error);
        throw error;
    }
}

export async function deleteStep(stepId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('steps')
            .delete()
            .eq('id', stepId)
            .eq('user_id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error al eliminar paso:', error);
        throw error;
    }
}

// ==================== PAPELERA ====================

export async function loadTrash() {
    try {
        const user = await getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('trash')
            .select('*')
            .eq('user_id', user.id)
            .order('deleted_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error al cargar papelera:', error);
        return [];
    }
}

export async function moveToTrash(itemType, itemData) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { data, error } = await supabase
            .from('trash')
            .insert([{
                user_id: user.id,
                item_type: itemType,
                item_data: itemData
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error al mover a papelera:', error);
        throw error;
    }
}

export async function deleteFromTrash(trashId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('trash')
            .delete()
            .eq('id', trashId)
            .eq('user_id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error al eliminar de papelera:', error);
        throw error;
    }
}

export async function emptyTrash() {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('trash')
            .delete()
            .eq('user_id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error al vaciar papelera:', error);
        throw error;
    }
}

// ==================== ENTIDADES ====================

export async function loadEntities() {
    try {
        const user = await getCurrentUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('entities')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error al cargar entidades:', error);
        return [];
    }
}

export async function saveEntity(entity) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const entityData = {
            user_id: user.id,
            name: entity.name,
            entity_type: entity.type
        };

        if (entity.id && entity.id.includes('-')) {
            // Es un UUID existente, actualizar
            const { data, error } = await supabase
                .from('entities')
                .update(entityData)
                .eq('id', entity.id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            // Nueva entidad, insertar
            const { data, error } = await supabase
                .from('entities')
                .insert([entityData])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    } catch (error) {
        console.error('Error al guardar entidad:', error);
        throw error;
    }
}

export async function deleteEntity(entityId) {
    try {
        const user = await getCurrentUser();
        if (!user) throw new Error('Usuario no autenticado');

        const { error } = await supabase
            .from('entities')
            .delete()
            .eq('id', entityId)
            .eq('user_id', user.id);

        if (error) throw error;
    } catch (error) {
        console.error('Error al eliminar entidad:', error);
        throw error;
    }
}

// ==================== SINCRONIZACIÓN ====================

export async function syncAllData() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            console.log('No hay usuario autenticado, omitiendo sincronización');
            return;
        }

        console.log('Sincronizando datos con Supabase...');
        
        // Esta función se llamará periódicamente para sincronizar cambios
        // Por ahora, solo registramos que se llamó
        console.log('Sincronización completada');
    } catch (error) {
        console.error('Error al sincronizar datos:', error);
    }
}
