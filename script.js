// @ts-nocheck
import { signUp, signIn, signOut, getCurrentUser } from './auth.js';
import { supabase } from './supabase.js'; // Importar supabase

/************************************************************************
 * VARIABLES GLOBALES
 ************************************************************************/
let folders = [];
let trash = [];
const REWARDS_FOLDER_NAME = 'Recompensas'; // Usar para identificar la carpeta por nombre
let _rewardsFolderObject = null; // Contendrá el objeto de la carpeta de recompensas del usuario actual
let currentFolderId = null;

let currentTheme = localStorage.getItem('appTheme') || 'dark';

let draggedFolderId = null;
let draggedTaskId = null;
let draggedStepIndex = null;

let presentationSteps = [];
let currentStepIndex = 0;
let timerSeconds = 0;
let currentStepCountdown = 0; 
let timerInterval = null;
let presentationOpen = false;
let currentPresentationTask = null;
let isPresentationMinimized = false; 
let isPresentationMode = false; 

let taskBeingScheduled = null;
let currentAlarmTask = null;
let taskBeingRewarded = null;
let folderOfTaskBeingRewarded = null;
let taskBeingMoved = null;
let folderOfTaskBeingMoved = null;
let isTaskCompletedBeingMoved = false;
let taskToShare = null; // Para la función de compartir

let lastPresentationInteraction = 0;
const PRESENTATION_DEBOUNCE_MS = 300; 

let lastHiddenTime = 0;
let wakeLock = null;

/************************************************************************
 * ELEMENTOS DEL DOM
 ************************************************************************/
const foldersSection = document.getElementById('foldersSection');
const folderContainer = document.getElementById('folderContainer');
const themeButton = document.getElementById('themeButton');
const importFileInput = document.getElementById('importFileInput');
const trashButton = document.getElementById('trashButton');
const newFolderInput = document.getElementById('newFolderInput');
const tasksSection = document.getElementById('tasksSection');
const headerDynamicTitle = document.getElementById('headerDynamicTitle');
const headerAuthIcon = document.getElementById('headerAuthIcon'); 
const authSection = document.getElementById('authSection'); 
const signupForm = document.getElementById('signupForm'); 
const signupEmail = document.getElementById('signupEmail'); 
const signupPassword = document.getElementById('signupPassword'); 
const signinForm = document.getElementById('signinForm'); 
const signinEmail = document.getElementById('signinEmail'); 
const signinPassword = document.getElementById('signinPassword'); 
const signOutButton = document.getElementById('signOutButton'); 
const newTaskInput = document.getElementById('newTaskInput');
const newTaskTimeInput = document.getElementById('newTaskTimeInput');
const tasksList = document.getElementById('tasksList');
const completedMiniFolder = document.getElementById('completedMiniFolder');
const completedMiniFolderList = document.getElementById('completedMiniFolderList');
const trashSection = document.getElementById('trashSection');
const trashList = document.getElementById('trashList');
const presentationModal = document.getElementById('presentationModal');
const presentationStep = document.getElementById('presentationStep');
const timerDisplay = document.getElementById('timerDisplay');
const scheduleModal = document.getElementById('scheduleModal');
const scheduleDateInput = document.getElementById('scheduleDateInput');
const saveScheduleBtn = document.getElementById('saveScheduleBtn');
const cancelScheduleBtn = document.getElementById('cancelScheduleBtn');
const alarmModal = document.getElementById('alarmModal');
const alarmTitle = document.getElementById('alarmTitle');
const disableAlarmBtn = document.getElementById('disableAlarmBtn');
const rewardSection = document.getElementById('rewardSection');
const rewardInput = document.getElementById('rewardInput');
const moveModal = document.getElementById('moveModal');
const targetFolderSelect = document.getElementById('targetFolderSelect');
const confirmMoveBtn = document.getElementById('confirmMoveBtn');
const cancelMoveBtn = document.getElementById('cancelMoveBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmMessageElem = document.getElementById('confirmMessage');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

/************************************************************************
 * EVENTOS DE CARGA
 ************************************************************************/
window.addEventListener('load', () => {
  applyTheme(currentTheme);
  window.addEventListener('popstate', handlePopState);
  setInterval(checkAlarms, 60 * 1000);
  setupChatEvents();
  setupShareEvents();
  setupAuthEvents(); 
  checkAuthStatus(); 

  const appTitleLink = document.getElementById('appTitleLink');
  if (appTitleLink) {
    appTitleLink.addEventListener('click', (e) => {
      e.preventDefault(); 
      showFolders(); 
    });
  }
});

function setupAuthEvents() {
  let userMenuOpen = false;
  if (headerAuthIcon) {
    headerAuthIcon.addEventListener('click', async () => {
      const user = await getCurrentUser();
      if (user) {
        userMenuOpen = !userMenuOpen;
        updateUserMenu(user, userMenuOpen);
      } else {
        showSection(authSection);
      }
    });
  }

  const chooseSigninBtn = document.getElementById('chooseSigninBtn');
  const chooseSignupBtn = document.getElementById('chooseSignupBtn');
  const authChoiceDiv = document.getElementById('authChoiceDiv');
  const authContainer = document.querySelector('.auth-container');

  if (chooseSigninBtn) chooseSigninBtn.addEventListener('click', () => {
    authChoiceDiv.style.display = 'none';
    authContainer.style.display = 'block';
    signinForm.style.display = 'block';
    signupForm.style.display = 'none';
  });

  if (chooseSignupBtn) chooseSignupBtn.addEventListener('click', () => {
    authChoiceDiv.style.display = 'none';
    authContainer.style.display = 'block';
    signupForm.style.display = 'block';
    signinForm.style.display = 'none';
  });

  if (signupForm) signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signupEmail.value;
    const password = signupPassword.value;
    try {
      await signUp(email, password);
      alert('Registro exitoso. Por favor, verifica tu correo electrónico.');
      signupForm.style.display = 'none';
      signinForm.style.display = 'block';
    } catch (error) {
      alert('Error al registrarse: ' + error.message);
    }
  });

  if (signinForm) signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = signinEmail.value;
    const password = signinPassword.value;
    try {
      await signIn(email, password);
      checkAuthStatus(); 
    } catch (error) {
      alert('Error al iniciar sesión: ' + error.message);
    }
  });
}

async function signOutAndRefresh() {
  try {
    await signOut();
    checkAuthStatus();
  } catch (error) {
    alert('Error al cerrar sesión: ' + error.message);
  }
}

function updateUserMenu(user, open) {
  const userMenu = document.getElementById('userMenu');
  if (!userMenu) return;
  userMenu.innerHTML = '';
  if (open) {
    const emailItem = document.createElement('div');
    emailItem.textContent = user.email;
    emailItem.style.padding = '0.5rem';
    emailItem.style.color = '#fff';
    emailItem.style.borderBottom = '1px solid #555';
    userMenu.appendChild(emailItem);
    const signOutButtonEl = document.createElement('button');
    signOutButtonEl.textContent = 'Cerrar sesión';
    signOutButtonEl.style.width = '100%';
    signOutButtonEl.style.padding = '0.5rem';
    signOutButtonEl.style.marginTop = '0.5rem';
    signOutButtonEl.style.background = 'transparent';
    signOutButtonEl.style.border = 'none';
    signOutButtonEl.style.color = '#fff';
    signOutButtonEl.style.cursor = 'pointer';
    signOutButtonEl.addEventListener('click', signOutAndRefresh);
    userMenu.appendChild(signOutButtonEl);
    userMenu.style.display = 'block';
  } else {
    userMenu.style.display = 'none';
  }
}

async function checkAuthStatus() {
  const user = await getCurrentUser();
  const aiButton = document.getElementById('aiButton');
  const chatModal = document.getElementById('chatModal');
  const authChoiceDiv = document.getElementById('authChoiceDiv');
  const authContainer = document.querySelector('.auth-container');

  if (user) {
    headerAuthIcon.innerHTML = `<span style="font-size: 0.8rem; margin-right: 5px;">${user.email}</span> 🚪`;
    headerAuthIcon.title = 'Cerrar sesión';
    if (authChoiceDiv) authChoiceDiv.style.display = 'none';
    if (authContainer) authContainer.style.display = 'none';
    if (aiButton) aiButton.style.display = 'block';
    if (chatModal) chatModal.style.display = 'none';
    await loadInitialDataFromSupabase(user.id); 
    showFolders(); 
  } else {
    headerAuthIcon.innerHTML = '👤'; 
    headerAuthIcon.title = 'Iniciar sesión';
    if (authChoiceDiv) authChoiceDiv.style.display = 'block';
    if (authContainer) authContainer.style.display = 'none';
    if (aiButton) aiButton.style.setProperty('display', 'none', 'important');
    if (chatModal) chatModal.style.setProperty('display', 'none', 'important');
    clearUserData();
    showSection(authSection);
  }
}

function setupShareEvents() {
  const closeShareBtn = document.getElementById('closeShareBtn');
  if(closeShareBtn) closeShareBtn.addEventListener('click', () => {
    document.getElementById('shareModal').style.display = 'none';
  });
  const whatsappShareBtn = document.getElementById('whatsappShareBtn');
  if(whatsappShareBtn) whatsappShareBtn.addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getWhatsAppShareLink(taskToShare);
    window.open(url, '_blank');
    document.getElementById('shareModal').style.display = 'none';
  });
  const telegramShareBtn = document.getElementById('telegramShareBtn');
  if(telegramShareBtn) telegramShareBtn.addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getTelegramShareLink(taskToShare);
    window.open(url, '_blank');
    document.getElementById('shareModal').style.display = 'none';
  });
  const emailShareBtn = document.getElementById('emailShareBtn');
  if(emailShareBtn) emailShareBtn.addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getEmailShareLink(taskToShare);
    window.location.href = url;
    document.getElementById('shareModal').style.display = 'none';
  });
  const facebookShareBtn = document.getElementById('facebookShareBtn');
  if(facebookShareBtn) facebookShareBtn.addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getFacebookShareLink(taskToShare);
    window.open(url, '_blank');
    document.getElementById('shareModal').style.display = 'none';
  });
  const twitterShareBtn = document.getElementById('twitterShareBtn');
  if(twitterShareBtn) twitterShareBtn.addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getTwitterShareLink(taskToShare);
    window.open(url, '_blank');
    document.getElementById('shareModal').style.display = 'none';
  });
  const linkedinShareBtn = document.getElementById('linkedinShareBtn');
  if(linkedinShareBtn) linkedinShareBtn.addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getLinkedInShareLink(taskToShare);
    window.open(url, '_blank');
    document.getElementById('shareModal').style.display = 'none';
  });
}

function getFacebookShareLink(task) {
  const text = encodeURIComponent(formatTaskForSharing(task));
  return `https://www.facebook.com/sharer/sharer.php?u=&quote=${text}`;
}
function getTwitterShareLink(task) {
  const text = encodeURIComponent(formatTaskForSharing(task));
  return `https://twitter.com/intent/tweet?text=${text}`;
}
function getLinkedInShareLink(task) {
  const title = encodeURIComponent(`Tarea: ${task.name}`);
  const summary = encodeURIComponent(formatTaskForSharing(task)); 
  return `https://www.linkedin.com/shareArticle?mini=true&title=${title}&summary=${summary}`;
}

if (newFolderInput) newFolderInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const name = newFolderInput.value.trim();
    if (name) {
      createFolder(name);
      newFolderInput.value = '';
    }
  }
});

if (newTaskInput) newTaskInput.addEventListener('keydown', (e) => {
  if (_rewardsFolderObject && currentFolderId === _rewardsFolderObject.id) return;
  if (e.key === 'Enter') {
    const taskName = newTaskInput.value.trim();
    if (taskName && currentFolderId) {
      createTask(currentFolderId, taskName);
      newTaskInput.value = '';
      if (newTaskTimeInput) newTaskTimeInput.value = '';
    }
  }
});

if (newTaskTimeInput) newTaskTimeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const taskName = newTaskInput.value.trim();
    if (taskName && currentFolderId) {
      createTask(currentFolderId, taskName);
      newTaskInput.value = '';
      newTaskTimeInput.value = '';
    }
  }
});

if (themeButton) themeButton.addEventListener('click', () => {
  if (currentTheme === 'dark') applyTheme('light');
  else if (currentTheme === 'light') applyTheme('cyberpunk');
  else applyTheme('dark');
});

if (importFileInput) importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedJSON = JSON.parse(event.target.result);
      if (!importedJSON.folders) {
        console.log("El archivo no es válido o no contiene 'folders'.");
        return;
      }
      const importedFolders = importedJSON.folders.filter(f => !(f.name === REWARDS_FOLDER_NAME && f.isDefaultRewards === true) ); 
      // TODO: Aquí se debería hacer un UPSERT a Supabase para cada carpeta y sus tareas/pasos importados.
      folders = [...folders, ...importedFolders];
      ensureRewardsFolder(); 
      // saveDataToLocalStorage(); // Necesita ser reemplazado por lógica de Supabase
      renderFolders();
      console.log("¡Datos importados con éxito! (Solo localmente por ahora)");
    } catch (err) {
      console.error("Error al leer el JSON: " + err);
    }
  };
  reader.readAsText(file);
  importFileInput.value = '';
});

if (trashButton) trashButton.addEventListener('click', () => showTrash());
if (rewardInput) rewardInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = rewardInput.value.trim();
    if (text) {
      addReward(text);
      rewardInput.value = '';
      // showSection(tasksSection); // Se maneja en addReward
    }
  }
});

if (saveScheduleBtn) saveScheduleBtn.addEventListener('click', async () => { 
  if (!taskBeingScheduled) return;
  const newDateValue = scheduleDateInput.value;
  const newTimestamp = newDateValue ? new Date(newDateValue).getTime() : null;
  const oldTimestamp = taskBeingScheduled.scheduledTimestamp;

  const user = await getCurrentUser();
  if (!user) {
    console.error("Usuario no autenticado. No se puede actualizar la tarea.");
    return;
  }

  const { error } = await supabase
    .from('tasks')
    .update({ scheduled_timestamp: newTimestamp ? new Date(newTimestamp).toISOString() : null })
    .eq('id', taskBeingScheduled.id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error actualizando scheduled_timestamp en Supabase:', error);
    alert('Error al programar la tarea. Inténtalo de nuevo.');
    taskBeingScheduled.scheduledTimestamp = oldTimestamp; 
  } else {
    taskBeingScheduled.scheduledTimestamp = newTimestamp;
    console.log('scheduled_timestamp actualizado en Supabase para la tarea:', taskBeingScheduled.id);
    renderTasks();
  }
  closeScheduleModal();
});
if (cancelScheduleBtn) cancelScheduleBtn.addEventListener('click', () => closeScheduleModal());

if (disableAlarmBtn) disableAlarmBtn.addEventListener('click', async () => { 
  alarmModal.style.display = 'none';
  if (currentAlarmTask) {
    const user = await getCurrentUser();
    if (!user) {
      console.error("Usuario no autenticado. No se puede actualizar la tarea.");
      return;
    }
    // const oldTimestamp = currentAlarmTask.scheduledTimestamp; // No es necesario para revertir aquí
    const { error } = await supabase
      .from('tasks')
      .update({ scheduled_timestamp: null })
      .eq('id', currentAlarmTask.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error actualizando scheduled_timestamp a null en Supabase:', error);
      alert('Error al desactivar la alarma. Inténtalo de nuevo.');
    } else {
      currentAlarmTask.scheduledTimestamp = null;
      console.log('Alarma desactivada en Supabase para la tarea:', currentAlarmTask.id);
      renderTasks();
    }
  }
  currentAlarmTask = null;
});

function showConfirm(message, onConfirm, onCancel) {
  confirmMessageElem.textContent = message;
  confirmModal.style.display = 'flex';
  const handleYes = () => {
    confirmModal.style.display = 'none';
    confirmYesBtn.removeEventListener('click', handleYes);
    confirmNoBtn.removeEventListener('click', handleNo);
    if (onConfirm) onConfirm();
  };
  const handleNo = () => {
    confirmModal.style.display = 'none';
    confirmYesBtn.removeEventListener('click', handleYes);
    confirmNoBtn.removeEventListener('click', handleNo);
    if (onCancel) onCancel();
  };
  confirmYesBtn.addEventListener('click', handleYes);
  confirmNoBtn.addEventListener('click', handleNo);
}

window.removeEventListener('popstate', handlePopState);
window.addEventListener('popstate', handlePopState);

function handlePopState(event) {
  console.log('popstate event:', event.state);
  if (presentationOpen && !isPresentationMinimized) {
    console.log('Cerrando presentación por popstate');
    closePresentation(true);
    return; 
  }
  if (event.state) {
    if (event.state.rewards && _rewardsFolderObject) {
        openFolder(_rewardsFolderObject.id, false);
    } else if (event.state.folderId) {
      openFolder(event.state.folderId, false);
    } else if (event.state.trash) {
      showTrash(false);
    }
  } else {
    showFolders();
  }
}

function showSection(sectionToShow) {
  const sections = [foldersSection, tasksSection, trashSection, rewardSection, authSection];
  sections.forEach(section => {
    if (section) { 
        if (section === sectionToShow) {
        section.style.display = (section === authSection) ? 'flex' : 'block';
        } else {
        section.style.display = 'none';
        }
    }
  });
  const chatModal = document.getElementById('chatModal');
  const aiButton = document.getElementById('aiButton');
  if (sectionToShow === authSection) {
    if (chatModal) chatModal.style.display = 'none';
    if (aiButton) aiButton.style.display = 'none';
  }
  if (presentationModal && sectionToShow !== presentationModal && !isPresentationMinimized) {
    presentationModal.style.display = 'none';
  }
}

function showFolders() {
  showSection(foldersSection);
  currentFolderId = null;
  if(headerDynamicTitle) headerDynamicTitle.textContent = ''; 
}

function openFolder(folderId, pushToHistory = true) {
  console.log('openFolder ejecutado para folderId:', folderId);
  currentFolderId = folderId;
  const folder = folders.find(f => f.id === folderId);
  if (!folder) {
    console.log('Carpeta no encontrada:', folderId);
    showFolders(); 
    return;
  }
  if(headerDynamicTitle) headerDynamicTitle.textContent = folder.name; 
  showSection(tasksSection);
  renderTasks();
  if (pushToHistory) {
    if (_rewardsFolderObject && folderId === _rewardsFolderObject.id) {
      history.pushState({ rewards: true }, '', '');
    } else {
      history.pushState({ folderId }, '', '');
    }
  }
}

function showTrash(pushHistory = true) {
  showSection(trashSection);
  renderTrash();
  if(headerDynamicTitle) headerDynamicTitle.textContent = 'Papelera';
  if (pushHistory) {
    history.pushState({ trash: true }, '', '');
  }
}

function applyTheme(themeName) {
  document.body.classList.remove('light-theme', 'cyberpunk-theme');
  if (themeName === 'light') {
    document.body.classList.add('light-theme');
    if(themeButton) themeButton.textContent = '☀️';
  } else if (themeName === 'cyberpunk') {
    document.body.classList.add('cyberpunk-theme');
    if(themeButton) themeButton.textContent = '🔥';
  } else {
    if(themeButton) themeButton.textContent = '🌙';
  }
  currentTheme = themeName;
  localStorage.setItem('appTheme', themeName);
  const chatModal = document.getElementById('chatModal');
  if (chatModal) {
    chatModal.classList.remove('chat-dark', 'chat-light', 'chat-cyberpunk');
    if (themeName === 'light') chatModal.classList.add('chat-light');
    else if (themeName === 'cyberpunk') chatModal.classList.add('chat-cyberpunk');
    else chatModal.classList.add('chat-dark');
  }
}

async function ensureRewardsFolder() { 
  _rewardsFolderObject = folders.find(f => f.name === REWARDS_FOLDER_NAME && f.is_default_rewards === true);
  if (!_rewardsFolderObject) {
    const user = await getCurrentUser();
    if (user) { 
      console.log("Carpeta de Recompensas no encontrada para el usuario, creándola en Supabase...");
      const newRewardsFolderData = {
        user_id: user.id,
        name: REWARDS_FOLDER_NAME,
        is_default_rewards: true
      };
      const { data: createdFolder, error } = await supabase
        .from('folders')
        .insert(newRewardsFolderData)
        .select()
        .single();

      if (error) {
        console.error("Error creando la carpeta de recompensas por defecto en Supabase:", error);
      } else if (createdFolder) {
        _rewardsFolderObject = { ...createdFolder, tasks: [], finished: [] }; 
        folders.push(_rewardsFolderObject); 
        console.log("Carpeta de recompensas por defecto creada en Supabase y añadida localmente:", _rewardsFolderObject);
      }
    }
  } else {
    console.log("Carpeta de Recompensas encontrada localmente:", _rewardsFolderObject);
  }
}


function createFolder(name) {
  const folder = {
    name,
    tasks: [],
    finished: [],
    isDefaultRewards: false 
  };
  saveFolderToSupabase(folder); 
}

async function saveFolderToSupabase(folderData) {
  const user = await getCurrentUser();
  if (!user) {
    console.error("Usuario no autenticado. No se puede guardar la carpeta.");
    return;
  }
  const folderToInsert = {
    user_id: user.id,
    name: folderData.name,
    is_default_rewards: folderData.isDefaultRewards || false
  };
  const { data, error } = await supabase
    .from('folders')
    .insert(folderToInsert)
    .select() 
    .single(); 
  if (error) {
    console.error('Error guardando carpeta en Supabase:', error);
    alert('Error al crear la carpeta. Inténtalo de nuevo.');
  } else if (data) {
    console.log('Carpeta guardada en Supabase:', data);
    const newFolder = {
        id: data.id, 
        name: data.name,
        tasks: [], 
        finished: [], 
        is_default_rewards: data.is_default_rewards, 
        created_at: data.created_at 
    };
    folders.push(newFolder);
    if (newFolder.is_default_rewards) { 
        _rewardsFolderObject = newFolder;
    }
    renderFolders(); 
  }
}

function renderFolders() {
  if (!folderContainer) return;
  folderContainer.innerHTML = '';
  folders.forEach(folder => {
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder';
    folderDiv.dataset.id = folder.id;
    folderDiv.draggable = true;
    const miniFolder = document.createElement('div');
    miniFolder.className = 'mini-folder';
    miniFolder.innerHTML = '📁';
    // miniFolder.onclick = () => showFinishedTasks(folder.id); // Esta función no existe
    folderDiv.addEventListener('dragstart', handleFolderDragStart);
    folderDiv.addEventListener('dragover', handleFolderDragOver);
    folderDiv.addEventListener('drop', handleFolderDrop);
    folderDiv.addEventListener('click', () => openFolder(folder.id));
    const folderIcon = document.createElement('div');
    folderIcon.className = 'folder-icon';
    const folderName = document.createElement('div');
    folderName.className = 'folder-name';
    folderName.textContent = folder.name;
    const folderOptionsBtn = document.createElement('button');
    folderOptionsBtn.className = 'folder-options-btn';
    folderOptionsBtn.innerHTML = '⋮';
    folderOptionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFolderDropdownMenu(folder.id);
    });
    const folderDropdownMenu = document.createElement('div');
    folderDropdownMenu.className = 'folder-dropdown-menu';
    folderDropdownMenu.id = `folderMenu-${folder.id}`;
    const exportBtn = document.createElement('button');
    exportBtn.textContent = 'Exportar JSON';
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportFolder(folder);
      folderDropdownMenu.style.display = 'none';
    });
    folderDropdownMenu.appendChild(exportBtn);
    if (!folder.is_default_rewards) { 
      const renameBtn = document.createElement('button');
      renameBtn.textContent = 'Renombrar';
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renameFolder(folder);
        folderDropdownMenu.style.display = 'none';
      });
      folderDropdownMenu.appendChild(renameBtn);
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirm(`¿Eliminar la carpeta "${folder.name}"?`, () => {
          moveFolderToTrash(folder.id);
          folderDropdownMenu.style.display = 'none';
        });
      });
      folderDropdownMenu.appendChild(deleteBtn);
    }
    folderDiv.append(folderOptionsBtn, folderDropdownMenu, folderIcon, folderName);
    folderContainer.appendChild(folderDiv);
  });
}

function toggleFolderDropdownMenu(folderId) {
  document.querySelectorAll('.folder-dropdown-menu').forEach(menu => {
    menu.style.display = 'none';
  });
  const menu = document.getElementById(`folderMenu-${folderId}`);
  if (!menu) return;
  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
  if (menu.style.display === 'block') {
    setTimeout(() => {
      document.addEventListener('click', function clickListener(e) {
        if (!menu.contains(e.target) && !e.target.closest('.folder-options-btn')) {
          menu.style.display = 'none';
          document.removeEventListener('click', clickListener);
        }
      });
    }, 100);
  }
}

function renameFolder(folder) {
  const folderElement = document.querySelector(`[data-id="${folder.id}"]`);
  const nameElement = folderElement.querySelector('.folder-name');
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'folder-edit-input';
  editInput.value = folder.name;
  const finishEdit = async () => { 
    const newName = editInput.value.trim();
    const oldName = folder.name;
    if (newName && newName !== oldName) {
      const user = await getCurrentUser();
      if (!user) {
        console.error("Usuario no autenticado. No se puede renombrar la carpeta.");
        nameElement.textContent = oldName; 
        editInput.replaceWith(nameElement);
        return;
      }
      const { error } = await supabase
        .from('folders')
        .update({ name: newName })
        .eq('id', folder.id)
        .eq('user_id', user.id);
      if (error) {
        console.error('Error renombrando carpeta en Supabase:', error);
        alert('Error al renombrar la carpeta. Inténtalo de nuevo.');
        nameElement.textContent = oldName; 
      } else {
        console.log('Carpeta renombrada en Supabase.');
        folder.name = newName; 
        renderFolders(); 
      }
    } else {
      nameElement.textContent = oldName; 
    }
    editInput.replaceWith(nameElement);
  };
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finishEdit();
    if (e.key === 'Escape') {
      nameElement.textContent = folder.name;
      editInput.replaceWith(nameElement);
    }
  });
  editInput.addEventListener('blur', finishEdit);
  nameElement.replaceWith(editInput);
  editInput.focus();
}

async function moveFolderToTrash(folderId) { 
  const user = await getCurrentUser();
  if (!user) {
    console.error("Usuario no autenticado.");
    return;
  }
  const folderIndex = folders.findIndex(f => f.id === folderId);
  if (folderIndex === -1) return;
  const folderToTrash = { ...folders[folderIndex] }; 
  const trashEntry = {
    user_id: user.id,
    item_type: 'folder',
    original_item_id: folderToTrash.id, 
    item_data: folderToTrash, 
    deleted_at: new Date().toISOString()
  };
  const { data: newTrashItem, error: trashError } = await supabase
    .from('trash_items')
    .insert(trashEntry)
    .select()
    .single();
  if (trashError) {
    console.error('Error moviendo carpeta a la papelera de Supabase (trash_items):', trashError);
    alert('Error al mover la carpeta a la papelera.');
    return;
  }
  const { error: deleteError } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId)
    .eq('user_id', user.id);
  if (deleteError) {
    console.error('Error eliminando carpeta de Supabase (folders):', deleteError);
    alert('Error al eliminar la carpeta de la base de datos.');
    await supabase.from('trash_items').delete().eq('id', newTrashItem.id);
    return;
  }
  console.log('Carpeta movida a la papelera en Supabase:', folderToTrash.name);
  folders.splice(folderIndex, 1); 
  if (newTrashItem) {
      trash.push({
          id: newTrashItem.id, 
          type: 'folder',
          data: folderToTrash, 
          deletedAt: new Date(newTrashItem.deleted_at).getTime()
      });
  }
  renderFolders();
  if (currentFolderId === folderId) {
    showFolders(); 
  }
}

async function moveTaskToTrash(folder, taskId, isFinished = false) { 
  const arr = isFinished ? folder.finished : folder.tasks;
  const index = arr.findIndex(t => t.id === taskId);
  if (index === -1) return;
  const task = { ...arr[index] }; 
  
  const user = await getCurrentUser();
  if (!user) {
    console.error("Usuario no autenticado.");
    return;
  }
  const trashEntry = {
    user_id: user.id,
    item_type: 'task',
    original_item_id: task.id,
    item_data: { ...task, folderId: folder.id }, 
    deleted_at: new Date().toISOString()
  };
  const { data: newTrashItem, error: trashError } = await supabase
    .from('trash_items')
    .insert(trashEntry)
    .select()
    .single();
  if (trashError) {
    console.error('Error moviendo tarea a la papelera de Supabase (trash_items):', trashError);
    alert('Error al mover la tarea a la papelera.');
    return;
  }
  const { error: deleteError } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', user.id);
  if (deleteError) {
    console.error('Error eliminando tarea de Supabase (tasks):', deleteError);
    alert('Error al eliminar la tarea de la base de datos.');
    await supabase.from('trash_items').delete().eq('id', newTrashItem.id);
    return;
  }
  console.log('Tarea movida a la papelera en Supabase:', task.name);
  arr.splice(index, 1); 
  if (newTrashItem) {
      trash.push({
          id: newTrashItem.id,
          type: 'task',
          data: { ...task, folderId: folder.id },
          deletedAt: new Date(newTrashItem.deleted_at).getTime()
      });
  }
  if (tasksSection.style.display === 'block' && currentFolderId === folder.id) {
    renderTasks();
  }
}

function renderTrash() {
  if (!trashList) return;
  trashList.innerHTML = '';
  if (trash.length === 0) {
    trashList.innerHTML = '<p>La papelera está vacía.</p>';
    return;
  }
  trash.forEach(item => {
    const trashItemDiv = document.createElement('div');
    trashItemDiv.className = 'trash-item';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = item.type === 'folder'
      ? `Carpeta eliminada: ${item.data.name}`
      : `Tarea eliminada: ${item.data.task ? item.data.task.name : 'Nombre no disponible'}`; 
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'trash-buttons';
    const restoreBtn = document.createElement('button');
    restoreBtn.textContent = 'Restaurar';
    restoreBtn.addEventListener('click', () => restoreFromTrash(item.id));
    const permDeleteBtn = document.createElement('button');
    permDeleteBtn.textContent = 'Eliminar';
    permDeleteBtn.addEventListener('click', () => permanentlyDelete(item.id));
    buttonsDiv.append(restoreBtn, permDeleteBtn);
    trashItemDiv.append(titleSpan, buttonsDiv);
    trashList.appendChild(trashItemDiv);
  });
}

async function restoreFromTrash(trashItemId) { 
  const user = await getCurrentUser();
  if (!user) {
    console.error("Usuario no autenticado.");
    return;
  }

  const trashItemIndex = trash.findIndex(t => t.id === trashItemId);
  if (trashItemIndex === -1) return;
  const itemToRestore = { ...trash[trashItemIndex] }; // Copia del item

  // Eliminar de trash_items en Supabase PRIMERO
  const { error: deleteTrashError } = await supabase
    .from('trash_items')
    .delete()
    .eq('id', trashItemId)
    .eq('user_id', user.id);

  if (deleteTrashError) {
    console.error("Error eliminando item de la papelera de Supabase:", deleteTrashError);
    alert("Error al procesar la restauración (paso 1).");
    return;
  }

  // Si se eliminó de la papelera de Supabase, proceder a reinsertar
  if (itemToRestore.type === 'folder') {
    const folderData = itemToRestore.data;
    const folderToInsert = {
        user_id: user.id,
        name: folderData.name,
        is_default_rewards: folderData.is_default_rewards || false
        // No reinsertamos el ID original, dejamos que Supabase genere uno nuevo
        // o si se quiere mantener el ID original, asegurarse que no colisione.
        // Para simplificar, generamos nuevo ID.
    };
    const { data: restoredFolder, error: folderInsertError } = await supabase
      .from('folders')
      .insert(folderToInsert)
      .select()
      .single();

    if (folderInsertError) {
      console.error("Error restaurando carpeta en Supabase (folders):", folderInsertError);
      alert("Error al restaurar la carpeta (paso 2).");
      // Considerar reinsertar en trash_items si la restauración falla aquí
      await supabase.from('trash_items').insert(itemToRestore); // Reinsertar el objeto original del trash
      return;
    }
    
    if (restoredFolder) {
        const localRestoredFolder = { ...restoredFolder, tasks: [], finished: [] };
        // Restaurar tareas y pasos de la carpeta
        if (folderData.tasks && Array.isArray(folderData.tasks)) {
            for (const task of folderData.tasks) {
                const taskToInsert = { ...task, folder_id: restoredFolder.id, user_id: user.id, steps: undefined };
                delete taskToInsert.id; 
                const { data: restoredTask, error: taskInsertError } = await supabase.from('tasks').insert(taskToInsert).select().single();
                if (taskInsertError) console.error("Error restaurando tarea de carpeta:", taskInsertError);
                else if (restoredTask && task.steps && Array.isArray(task.steps)) {
                    localRestoredFolder.tasks.push({...restoredTask, steps: []}); // Añadir tarea restaurada a la carpeta local
                    for (let i = 0; i < task.steps.length; i++) {
                        await supabase.from('steps').insert({ task_id: restoredTask.id, user_id: user.id, description: task.steps[i], step_order: i });
                        localRestoredFolder.tasks.find(t => t.id === restoredTask.id).steps.push(task.steps[i]);
                    }
                }
            }
        }
         if (folderData.finished && Array.isArray(folderData.finished)) {
            for (const task of folderData.finished) {
                const taskToInsert = { ...task, folder_id: restoredFolder.id, user_id: user.id, steps: undefined, is_finished: true };
                delete taskToInsert.id; 
                const { data: restoredTask, error: taskInsertError } = await supabase.from('tasks').insert(taskToInsert).select().single();
                if (taskInsertError) console.error("Error restaurando tarea finalizada de carpeta:", taskInsertError);
                else if (restoredTask && task.steps && Array.isArray(task.steps)) {
                    localRestoredFolder.finished.push({...restoredTask, steps: []});
                     for (let i = 0; i < task.steps.length; i++) {
                        await supabase.from('steps').insert({ task_id: restoredTask.id, user_id: user.id, description: task.steps[i], step_order: i });
                        localRestoredFolder.finished.find(t => t.id === restoredTask.id).steps.push(task.steps[i]);
                    }
                }
            }
        }
        folders.push(localRestoredFolder);
    }

  } else if (itemToRestore.type === 'task') {
    const taskData = itemToRestore.data.task;
    const originalFolderId = itemToRestore.data.folderId;
    const taskToInsert = {
        folder_id: originalFolderId, 
        user_id: user.id,
        name: taskData.name,
        is_expanded: taskData.isExpanded || false,
        scheduled_timestamp: taskData.scheduledTimestamp ? new Date(taskData.scheduledTimestamp).toISOString() : null,
        current_step_index: taskData.currentStepIndex || 0,
        total_time: taskData.totalTime || null,
        is_reward: taskData.isReward || false,
        is_finished: taskData.is_finished || false 
    };
    const { data: restoredTask, error: taskInsertError } = await supabase
        .from('tasks')
        .insert(taskToInsert)
        .select()
        .single();
    
    if (taskInsertError) {
        console.error("Error restaurando tarea en Supabase (tasks):", taskInsertError);
        alert("Error al restaurar la tarea (paso 2).");
        await supabase.from('trash_items').insert(itemToRestore);
        return;
    }
    if (restoredTask && taskData.steps && Array.isArray(taskData.steps)) {
        for (let i = 0; i < taskData.steps.length; i++) {
            await supabase.from('steps').insert({ task_id: restoredTask.id, user_id: user.id, description: taskData.steps[i], step_order: i });
        }
    }
    if(restoredTask) {
        const folder = folders.find(f => f.id === originalFolderId);
        if (folder) {
            const localTask = { ...restoredTask, steps: taskData.steps || [], scheduledTimestamp: restoredTask.scheduled_timestamp ? new Date(restoredTask.scheduled_timestamp).getTime() : null };
            if (localTask.is_finished) folder.finished.push(localTask);
            else folder.tasks.push(localTask);
        }
    }
  }

  trash.splice(trashItemIndex, 1); 
  renderTrash();
  renderFolders();
  if (itemToRestore.type === 'task') renderTasks(); 
}

async function permanentlyDelete(trashItemId) { 
  const user = await getCurrentUser();
  if (!user) return;

  const trashItemIndex = trash.findIndex(t => t.id === trashItemId);
  if (trashItemIndex === -1) return;

  const { error } = await supabase
    .from('trash_items')
    .delete()
    .eq('id', trashItemId)
    .eq('user_id', user.id);

  if (error) {
    console.error("Error eliminando permanentemente de Supabase:", error);
    alert("Error al eliminar permanentemente. Inténtalo de nuevo.");
  } else {
    trash.splice(trashItemIndex, 1);
    renderTrash();
    console.log("Item eliminado permanentemente de la papelera de Supabase.");
  }
}

async function emptyTrash() { 
    const user = await getCurrentUser();
    if (!user) return;

    const { error } = await supabase
        .from('trash_items')
        .delete()
        .eq('user_id', user.id);

    if (error) {
        console.error("Error vaciando la papelera en Supabase:", error);
        alert("Error al vaciar la papelera. Inténtalo de nuevo.");
    } else {
        trash = [];
        renderTrash();
        console.log("Papelera vaciada en Supabase.");
    }
}


function cleanOldTrashItems() {
  // Esta lógica ahora debería ser manejada por Supabase (ej. con políticas o funciones programadas)
  // o al cargar los datos de la papelera. Por ahora, solo opera localmente.
  const now = Date.now();
  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
  trash = trash.filter(item => (now - item.deletedAt) < fifteenDaysMs);
  // No llamar a saveDataToLocalStorage()
}

function exportFolder(folder) {
  const dataToExport = { version: 1, folders: [folder] };
  const jsonString = JSON.stringify(dataToExport);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = `carpeta_${folder.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function createTask(folderId, taskName) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  if (_rewardsFolderObject && folder.id === _rewardsFolderObject.id) return; 
  let totalTime = null;
  if (newTaskTimeInput.value.trim() !== "") {
    totalTime = parseInt(newTaskTimeInput.value, 10) * 60; 
  }
  const newTask = {
    name: taskName,
    steps: [],
    isExpanded: false,
    scheduledTimestamp: null,
    currentStepIndex: 0,
    totalTime: totalTime, 
    stepTimes: [] 
  };
  saveTaskToSupabase(folder.id, newTask); 
}

async function saveTaskToSupabase(folderId, taskData) {
  const user = await getCurrentUser();
  if (!user) {
    console.error("Usuario no autenticado. No se puede guardar la tarea.");
    return;
  }
  const taskToInsert = {
    folder_id: folderId,
    user_id: user.id,
    name: taskData.name,
    is_expanded: taskData.isExpanded || false,
    scheduled_timestamp: taskData.scheduledTimestamp ? new Date(taskData.scheduledTimestamp).toISOString() : null,
    current_step_index: taskData.currentStepIndex || 0,
    total_time: taskData.totalTime || null,
    is_reward: taskData.isReward || false,
    is_finished: false 
  };
  const { data: insertedTask, error } = await supabase
    .from('tasks')
    .insert(taskToInsert)
    .select()
    .single();
  if (error) {
    console.error('Error guardando tarea en Supabase:', error);
    alert('Error al crear la tarea. Inténtalo de nuevo.');
  } else if (insertedTask) {
    console.log('Tarea guardada en Supabase:', insertedTask);
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      const newTaskForLocal = {
        id: insertedTask.id,
        name: insertedTask.name,
        steps: [], 
        isExpanded: insertedTask.is_expanded,
        scheduledTimestamp: insertedTask.scheduled_timestamp ? new Date(insertedTask.scheduled_timestamp).getTime() : null,
        currentStepIndex: insertedTask.current_step_index,
        totalTime: insertedTask.total_time,
        isReward: insertedTask.is_reward
      };
      folder.tasks.push(newTaskForLocal);
      if (newTaskForLocal.totalTime) {
        recalcStepTimes(newTaskForLocal); 
      }
      renderTasks(); 
    }
  }
}

function renderTasks() {
  if (!tasksList || !completedMiniFolderList) return;
  console.log('renderTasks ejecutado para currentFolderId:', currentFolderId);
  const folder = folders.find(f => f.id === currentFolderId);
  if (!folder) {
    console.log('Carpeta no encontrada en renderTasks:', currentFolderId);
    tasksList.innerHTML = ''; 
    completedMiniFolderList.innerHTML = '';
    return;
  }
  tasksList.innerHTML = '';
  completedMiniFolderList.innerHTML = '';
  folder.tasks.forEach(task => tasksList.appendChild(buildPendingTaskItem(folder, task)));
  if (newTaskInput && newTaskTimeInput) {
      if (_rewardsFolderObject && folder.id === _rewardsFolderObject.id) {
        newTaskInput.style.display = 'none';
        newTaskTimeInput.style.display = 'none';
      } else {
        newTaskInput.style.display = 'block';
        newTaskTimeInput.style.display = 'block';
      }
  }
  if (completedMiniFolder) completedMiniFolder.style.display = 'block';
  folder.finished.forEach(task => completedMiniFolderList.appendChild(buildFinishedTaskItem(folder, task)));
  const miniFolderIcon = document.querySelector('.mini-folder-icon');
  if (miniFolderIcon) miniFolderIcon.onclick = () => {
    if (completedMiniFolder) completedMiniFolder.classList.toggle('expanded');
  };
}

function renameTask(task) {
  const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
  const nameSpan = taskElement.querySelector('.task-name-text');
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'task-edit-input';
  editInput.value = task.name;
  const finishEdit = async () => { 
    const newName = editInput.value.trim();
    const oldName = task.name;
    if (newName && newName !== oldName) {
      const user = await getCurrentUser();
      if (!user) {
        console.error("Usuario no autenticado. No se puede renombrar la tarea.");
        nameSpan.textContent = oldName; 
        editInput.replaceWith(nameSpan);
        return;
      }
      const { error } = await supabase
        .from('tasks')
        .update({ name: newName })
        .eq('id', task.id)
        .eq('user_id', user.id);
      if (error) {
        console.error('Error renombrando tarea en Supabase:', error);
        alert('Error al renombrar la tarea. Inténtalo de nuevo.');
        nameSpan.textContent = oldName; 
      } else {
        console.log('Tarea renombrada en Supabase.');
        task.name = newName; 
        renderTasks(); 
      }
    } else {
      nameSpan.textContent = oldName; 
    }
    editInput.replaceWith(nameSpan);
  };
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finishEdit();
    if (e.key === 'Escape') {
      nameSpan.textContent = task.name;
      editInput.replaceWith(nameSpan);
    }
  });
  editInput.addEventListener('blur', finishEdit);
  nameSpan.replaceWith(editInput);
  editInput.focus();
}

function buildPendingTaskItem(folder, task) {
  const taskDiv = document.createElement('div');
  taskDiv.className = 'task';
  taskDiv.dataset.taskId = task.id;
  taskDiv.draggable = true;
  taskDiv.addEventListener('dragstart', handleTaskDragStart);
  taskDiv.addEventListener('dragover', handleTaskDragOver);
  taskDiv.addEventListener('drop', handleTaskDrop);
  const taskHeader = document.createElement('div');
  taskHeader.className = 'task-header';
  const taskNameSpan = document.createElement('span');
  taskNameSpan.className = 'task-name-text';
  taskNameSpan.textContent = task.name;
  const taskButtons = document.createElement('div');
  taskButtons.className = 'task-buttons';
  if ((_rewardsFolderObject && folder.id === _rewardsFolderObject.id) || task.isReward) {
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showConfirm(`¿Eliminar "${task.name}"?`, () => {
        moveTaskToTrash(folder, task.id, false);
        // No llamar a saveDataToLocalStorage()
        renderTasks();
      });
    });
    taskButtons.appendChild(deleteBtn);
  } else {
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = task.isExpanded ? '▼' : '◀';
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTaskStepsVisibility(task, taskStepsDiv, toggleBtn);
    });
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskElement = e.target.closest('.task');
      const taskId = taskElement.dataset.taskId;
      const taskObj = folder.tasks.find(t => t.id === taskId);
      renameTask(taskObj);
    });
    const moveBtn = document.createElement('button');
    moveBtn.textContent = '↪';
    moveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      inlineMoveTask(task, false);
    });
    const playBtn = document.createElement('button');
    playBtn.textContent = '▶';
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startPresentation(task);
    });
    const scheduleBtn = document.createElement('button');
    scheduleBtn.textContent = '📅';
    scheduleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openScheduleModal(task);
    });
    const menuBtn = document.createElement('button');
    menuBtn.className = 'menu-btn';
    menuBtn.textContent = '●●●';
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = e.currentTarget.nextElementSibling;
      menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      setTimeout(() => {
        document.addEventListener('click', function taskMenuClickListener(ev) {
          if (!menu.contains(ev.target)) {
            menu.style.display = 'none';
            document.removeEventListener('click', taskMenuClickListener);
          }
        });
      }, 100);
    });
    const taskMenu = document.createElement('div');
    taskMenu.className = 'task-menu';
    taskMenu.style.display = 'none';
    const editMenuItem = document.createElement('button');
    editMenuItem.textContent = 'Editar';
    editMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      renameTask(task);
      taskMenu.style.display = 'none';
    });
    const moveMenuItem = document.createElement('button');
    moveMenuItem.textContent = 'Mover';
    moveMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      inlineMoveTask(task, false);
      taskMenu.style.display = 'none';
    });
    const scheduleMenuItem = document.createElement('button');
    scheduleMenuItem.textContent = 'Programar';
    scheduleMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      openScheduleModal(task);
      taskMenu.style.display = 'none';
    });
    const deleteMenuItem = document.createElement('button');
    deleteMenuItem.textContent = 'Eliminar';
    deleteMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      showConfirm(`¿Eliminar la tarea "${task.name}"?`, () => {
        moveTaskToTrash(folder, task.id, false);
        // No llamar a saveDataToLocalStorage()
        renderTasks();
      });
      taskMenu.style.display = 'none';
    });
    const shareMenuItem = document.createElement('button');
    shareMenuItem.textContent = 'Compartir';
    shareMenuItem.addEventListener('click', (e) => {
      e.stopPropagation();
      shareTask(task);
      taskMenu.style.display = 'none';
    });
    taskMenu.append(editMenuItem, moveMenuItem, scheduleMenuItem, deleteMenuItem, shareMenuItem);
    taskButtons.append(toggleBtn, playBtn, menuBtn, taskMenu);
  }
  taskHeader.append(taskNameSpan, taskButtons);
  const taskStepsDiv = document.createElement('div');
  taskStepsDiv.className = 'task-steps';
  taskStepsDiv.style.display = task.isExpanded ? 'flex' : 'none';
  const newStepContainer = document.createElement('div');
  newStepContainer.className = 'new-step-container';
  const newStepInput = document.createElement('input');
  newStepInput.type = 'text';
  newStepInput.placeholder = 'Agrega un paso (Enter)...';
  newStepInput.className = 'new-step-input';
  newStepInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addNewStep(task, newStepInput);
    }
  });
  newStepContainer.appendChild(newStepInput);
  taskStepsDiv.appendChild(newStepContainer);
  task.steps.forEach((step, index) => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'step-item';
    stepDiv.draggable = true;
    stepDiv.dataset.stepIndex = index;
    stepDiv.addEventListener('dragstart', handleStepDragStart);
    stepDiv.addEventListener('dragover', handleStepDragOver);
    stepDiv.addEventListener('drop', (ev) => handleStepDrop(ev, task));
    const stepTextSpan = document.createElement('span');
    stepTextSpan.className = 'step-text';
    stepTextSpan.textContent = step;
    let completedIndex = 0;
    if (currentPresentationTask && currentPresentationTask.id === task.id) {
      completedIndex = currentStepIndex;
    } else if (task.currentStepIndex !== undefined) {
      completedIndex = task.currentStepIndex;
    }
    if (index < completedIndex) {
      stepTextSpan.classList.add('completed-step');
    }
    const stepButtons = document.createElement('div');
    stepButtons.className = 'step-buttons';
    const editStepBtn = document.createElement('button');
    editStepBtn.textContent = '✏';
    editStepBtn.addEventListener('click', () => inlineEditStep(task, index));
    const deleteStepBtn = document.createElement('button');
    deleteStepBtn.textContent = '🗑';
    deleteStepBtn.addEventListener('click', () => {
      showConfirm(`¿Eliminar el paso "${step}"?`, () => {
        removeStep(task, index);
      });
    });
    stepButtons.append(editStepBtn, deleteStepBtn);
    stepDiv.append(stepTextSpan, stepButtons);
    taskStepsDiv.appendChild(stepDiv);
  });
  taskDiv.append(taskHeader, taskStepsDiv);
  return taskDiv;
}

function buildFinishedTaskItem(folder, task) {
  const taskDiv = document.createElement('div');
  taskDiv.className = 'task';
  taskDiv.dataset.taskId = task.id;
  taskDiv.style.background = 'transparent';
  taskDiv.style.border = '1px solid rgba(255, 215, 0, 0.3)';
  const taskHeader = document.createElement('div');
  taskHeader.className = 'task-header';
  taskHeader.style.padding = '0.3rem';
  const taskNameSpan = document.createElement('span');
  taskNameSpan.className = 'task-name-text';
  taskNameSpan.textContent = `✅ ${task.name}`;
  taskNameSpan.style.color = '#ffd700';
  const taskButtons = document.createElement('div');
  taskButtons.className = 'task-buttons';
  const restoreBtn = document.createElement('button');
  restoreBtn.textContent = '↩';
  restoreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    restoreFromMiniFolder(folder, task.id);
  });
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showConfirm(`¿Eliminar "${task.name}"?`, () => {
        moveTaskToTrash(folder, task.id, true);
        // saveDataToLocalStorage(); // Eliminado
        renderTasks();
      });
    });
  taskButtons.append(restoreBtn, deleteBtn);
  taskHeader.append(taskNameSpan, taskButtons);
  taskDiv.appendChild(taskHeader);
  return taskDiv;
}

function openRewardSection(folder, task) {
  folderOfTaskBeingRewarded = folder;
  taskBeingRewarded = task;
  showSection(rewardSection);
}

async function markTaskAsFinishedInSupabase(task) {
    if (!task || !task.id) return false;
    const user = await getCurrentUser();
    if (!user) return false;

    const { error } = await supabase
        .from('tasks')
        .update({ is_finished: true })
        .eq('id', task.id)
        .eq('user_id', user.id);

    if (error) {
        console.error("Error marcando tarea como finalizada en Supabase:", error);
        alert("Error al finalizar la tarea.");
        return false;
    } else {
        console.log("Tarea marcada como finalizada en Supabase:", task.id);
        task.is_finished = true; // Actualizar objeto local
        return true;
    }
}

async function moveTaskToMiniFolder(folder, task) { 
  const success = await markTaskAsFinishedInSupabase(task);
  if (!success) return;

  const localFolder = folders.find(f => f.id === folder.id);
  if (localFolder) {
    localFolder.tasks = localFolder.tasks.filter(t => t.id !== task.id);
    if (!localFolder.finished) localFolder.finished = [];
    localFolder.finished.push(task); 
  }

  renderTasks();
  // renderFolders(); // No siempre es necesario re-renderizar todas las carpetas
}

async function restoreFromMiniFolder(folder, taskId) { 
  const idx = folder.finished.findIndex(t => t.id === taskId);
  if (idx === -1) return;
  const taskToRestore = folder.finished[idx];

  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabase
    .from('tasks')
    .update({ is_finished: false, scheduled_timestamp: null, current_step_index: 0 }) 
    .eq('id', taskToRestore.id)
    .eq('user_id', user.id);

  if (error) {
    console.error("Error restaurando tarea (actualizando is_finished a false) en Supabase:", error);
    alert("Error al restaurar la tarea.");
    return;
  }

  taskToRestore.is_finished = false;
  taskToRestore.scheduledTimestamp = null; 
  taskToRestore.currentStepIndex = 0; 

  folder.finished.splice(idx, 1);
  if (!folder.tasks) folder.tasks = [];
  folder.tasks.push(taskToRestore);
  
  renderTasks();
}

function shareTask(task) {
  taskToShare = task;
  const shareModal = document.getElementById('shareModal');
  shareModal.style.display = 'flex';
  setTimeout(() => { 
    document.addEventListener('click', closeShareModalOnClickOutside);
  }, 50);
}

function closeShareModalOnClickOutside(event) {
  const shareModal = document.getElementById('shareModal');
  if (shareModal && !shareModal.contains(event.target) && !event.target.closest('.share-button') && !event.target.closest('.menu-btn')) { 
    shareModal.style.display = 'none';
    document.removeEventListener('click', closeShareModalOnClickOutside); 
  }
}

function formatTaskForSharing(task) {
  let shareText = `Tarea: ${task.name}`;
  if (task.totalTime) {
    const minutes = Math.floor(task.totalTime / 60);
    shareText += `\nTiempo estimado: ${minutes} minutos`;
  }
  if (task.steps && task.steps.length > 0) {
    shareText += `\n\nPasos:`;
    task.steps.forEach((step, index) => {
      shareText += `\n${index + 1}. ${step}`;
    });
  }
  return shareText;
}

function getWhatsAppShareLink(task) {
  const text = formatTaskForSharing(task);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}
function getTelegramShareLink(task) {
  const text = formatTaskForSharing(task);
  return `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;
}
function getEmailShareLink(task) {
  const subject = `Tarea: ${task.name}`;
  const body = formatTaskForSharing(task); 
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function addNewStep(task, inputElem) {
  const text = inputElem.value.trim();
  if (text) {
    inputElem.value = '';
    saveStepToSupabase(task, text); 
    setTimeout(() => {
      const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
      if (taskElement) {
        const newInput = taskElement.querySelector('.new-step-input');
        if (newInput) newInput.focus();
      }
    }, 0);
  }
}

function removeStep(task, stepIndex) {
  deleteStepFromSupabase(task, stepIndex);
}

async function deleteStepFromSupabase(task, stepIndex) {
  const user = await getCurrentUser();
  if (!user) {
    console.error("Usuario no autenticado. No se puede eliminar el paso.");
    return;
  }
  if (!task || !task.id || task.steps[stepIndex] === undefined) {
    console.error("Tarea no válida, sin ID, o índice de paso incorrecto.");
    return;
  }
  const stepDescriptionToDelete = task.steps[stepIndex];
  const { error } = await supabase
    .from('steps')
    .delete()
    .eq('task_id', task.id)
    .eq('user_id', user.id)
    .eq('description', stepDescriptionToDelete) 
    .eq('step_order', stepIndex); 
  if (error) {
    console.error('Error eliminando paso de Supabase:', error);
    alert('Error al eliminar el paso. Inténtalo de nuevo.');
  } else {
    console.log('Paso eliminado de Supabase.');
    task.steps.splice(stepIndex, 1); 
    if (task.totalTime) {
      recalcStepTimes(task);
    }
    renderTasks();
  }
}

async function saveStepToSupabase(task, stepDescription) {
  const user = await getCurrentUser();
  if (!user) {
    console.error("Usuario no autenticado. No se puede guardar el paso.");
    return;
  }
  if (!task || !task.id) {
    console.error("Tarea no válida o sin ID para guardar el paso.");
    return;
  }
  const stepToInsert = {
    task_id: task.id,
    user_id: user.id,
    description: stepDescription,
    step_order: task.steps.length 
  };
  const { data: insertedStep, error } = await supabase
    .from('steps')
    .insert(stepToInsert)
    .select()
    .single();
  if (error) {
    console.error('Error guardando paso en Supabase:', error);
    alert('Error al añadir el paso. Inténtalo de nuevo.');
  } else if (insertedStep) {
    console.log('Paso guardado en Supabase:', insertedStep);
    task.steps.push(insertedStep.description); 
    if (task.totalTime) {
      recalcStepTimes(task); 
    }
    renderTasks(); 
  }
}

function inlineEditStep(task, stepIndex) {
  const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
  if (!taskElement) {
    console.error("No se encontró el contenedor de la tarea:", task.id);
    return;
  }
  const stepElement = taskElement.querySelector(`[data-step-index="${stepIndex}"]`);
  if (!stepElement) {
    console.error("No se encontró el paso:", stepIndex);
    return;
  }
  const stepTextSpan = stepElement.querySelector('.step-text');
  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'step-edit-input';
  editInput.value = task.steps[stepIndex];
  const finishEdit = async () => { 
    const newStepDescription = editInput.value.trim();
    const oldStepDescription = task.steps[stepIndex];
    if (newStepDescription && newStepDescription !== oldStepDescription) {
      const user = await getCurrentUser();
      if (!user) {
        console.error("Usuario no autenticado. No se puede editar el paso.");
        stepTextSpan.textContent = oldStepDescription; 
        editInput.replaceWith(stepTextSpan);
        return;
      }
      const { error } = await supabase
        .from('steps')
        .update({ description: newStepDescription })
        .eq('task_id', task.id)
        .eq('user_id', user.id)
        .eq('description', oldStepDescription) 
        .eq('step_order', stepIndex);
      if (error) {
        console.error('Error actualizando paso en Supabase:', error);
        alert('Error al editar el paso. Inténtalo de nuevo.');
        stepTextSpan.textContent = oldStepDescription; 
      } else {
        console.log('Paso actualizado en Supabase.');
        task.steps[stepIndex] = newStepDescription; 
        renderTasks(); 
      }
    } else {
      stepTextSpan.textContent = oldStepDescription;
    }
    editInput.replaceWith(stepTextSpan);
  };
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finishEdit();
    if (e.key === 'Escape') {
      stepTextSpan.textContent = task.steps[stepIndex];
      editInput.replaceWith(stepTextSpan);
    }
  });
  editInput.addEventListener('blur', finishEdit);
  stepTextSpan.replaceWith(editInput);
  editInput.focus();
}

async function toggleTaskStepsVisibility(task, stepsDiv, toggleBtn) { 
  task.isExpanded = !task.isExpanded;
  stepsDiv.style.display = task.isExpanded ? 'flex' : 'none';
  toggleBtn.textContent = task.isExpanded ? '▼' : '◀';
  const user = await getCurrentUser();
  if (!user) {
    console.error("Usuario no autenticado. No se puede actualizar la tarea.");
    task.isExpanded = !task.isExpanded;
    stepsDiv.style.display = task.isExpanded ? 'flex' : 'none';
    toggleBtn.textContent = task.isExpanded ? '▼' : '◀';
    return;
  }
  const { error } = await supabase
    .from('tasks')
    .update({ is_expanded: task.isExpanded })
    .eq('id', task.id)
    .eq('user_id', user.id);
  if (error) {
    console.error('Error actualizando is_expanded en Supabase:', error);
    task.isExpanded = !task.isExpanded;
    stepsDiv.style.display = task.isExpanded ? 'flex' : 'none';
    toggleBtn.textContent = task.isExpanded ? '▼' : '◀';
    alert('Error al actualizar la visibilidad de los pasos.');
  } else {
    console.log('is_expanded actualizado en Supabase para la tarea:', task.id);
  }
}

function startPresentation(task) {
  presentationSteps = task.steps;
  currentStepIndex = task.currentStepIndex || 0;
  presentationOpen = true;
  currentPresentationTask = task;
  if (task.totalTime) {
    if (task.steps.length > 0) {
      if (!task.stepTimes || task.stepTimes.length !== task.steps.length) {
        recalcStepTimes(task);
      }
      currentStepCountdown = task.stepTimes[currentStepIndex];
    } else {
      currentStepCountdown = task.totalTime;
    }
  } else {
    currentStepCountdown = 0;
  }
  presentationModal.style.display = 'flex';
  showPresentationStep();
  startTimer();
  addMinimizeButton();
  presentationModal.addEventListener('click', handlePresentationClick);
  presentationModal.addEventListener('touchstart', handleTouchStart);
  presentationModal.addEventListener('touchend', handleTouchEnd);
  requestWakeLock();
}

function handlePresentationClick(e) {
  if (e.target.closest('#minimizePresentationBtn')) return;
  const now = Date.now();
  if (now - lastPresentationInteraction < PRESENTATION_DEBOUNCE_MS) return;
  lastPresentationInteraction = now;
  const halfWidth = window.innerWidth / 2;
  if (e.clientX > halfWidth) {
    nextStep(); 
  } else {
    prevStep(); 
  }
}

let touchStartX = 0; 
function handleTouchStart(e) {
    if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
    }
}

function handleTouchEnd(e) {
  const now = Date.now();
  if (now - lastPresentationInteraction < PRESENTATION_DEBOUNCE_MS) return;
  lastPresentationInteraction = now;
  if (e.changedTouches && e.changedTouches[0]) {
    const touchEndX = e.changedTouches[0].clientX;
    const halfWidth = window.innerWidth / 2;
    if (touchEndX > halfWidth) {
      nextStep(); 
    } else {
      prevStep(); 
    }
  }
}

function prevStep() {
  if (currentStepIndex > 0) {
    if (currentPresentationTask && currentPresentationTask.totalTime) {
      const currentBaseTime = currentPresentationTask.stepTimes[currentStepIndex];
      currentStepIndex--;
      const timeUsed = currentBaseTime - currentStepCountdown;
      currentStepCountdown = currentPresentationTask.stepTimes[currentStepIndex] - timeUsed;
    } else {
      currentStepIndex--;
    }
    showPresentationStep();
  }
}

function nextStep() {
  if (currentStepIndex < presentationSteps.length - 1) {
    if (currentPresentationTask && currentPresentationTask.totalTime) {
      let leftover = currentStepCountdown;
      currentStepIndex++;
      let baseTime = currentPresentationTask.stepTimes[currentStepIndex];
      currentStepCountdown = baseTime + leftover;
    } else {
      currentStepIndex++;
    }
    showPresentationStep();
  } else {
    showCongratulations();
  }
}

function showPresentationStep() {
  presentationStep.style.fontSize = '2rem';
  presentationStep.textContent = presentationSteps[currentStepIndex];
}

function showCongratulations() {
  presentationStep.style.fontSize = '3rem';
  presentationStep.textContent = '¡Felicidades! Has completado la tarea.';
  presentationModal.removeEventListener('touchstart', handleTouchStart);
  presentationModal.removeEventListener('touchend', handleTouchEnd);
  presentationModal.addEventListener('click', handleFinalClick);
}

async function handleFinalClick(e) { 
  presentationModal.removeEventListener('click', handleFinalClick);
  const currentFolder = folders.find(f => f.id === currentFolderId);
  const taskToFinish = currentPresentationTask; 
  const savedTime = currentStepCountdown;
  closePresentation(true); 
  if (e.clientX > window.innerWidth / 2 && savedTime > 0) {
    if (currentFolder && taskToFinish) {
      openRewardSection(currentFolder, taskToFinish); 
    }
  } else {
    if (currentFolder && taskToFinish) {
      await moveTaskToMiniFolder(currentFolder, taskToFinish); 
    }
  }
}

function startTimer() {
  if (currentPresentationTask && currentPresentationTask.totalTime) {
    timerDisplay.textContent = formatTime(currentStepCountdown);
  } else {
    timerSeconds = 0;
    timerDisplay.textContent = formatTime(timerSeconds);
  }
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (currentPresentationTask && currentPresentationTask.totalTime) {
      currentStepCountdown--;
      timerDisplay.textContent = formatTime(currentStepCountdown);
    } else {
      timerSeconds++;
      timerDisplay.textContent = formatTime(timerSeconds);
    }
  }, 1000);
}

function togglePresentationMinimized() {
  isPresentationMinimized = !isPresentationMinimized;
  if (isPresentationMinimized) {
    presentationModal.classList.add('minimized');
  } else {
    presentationModal.classList.remove('minimized');
  }
}

function addMinimizeButton() {
  if (!document.getElementById('minimizePresentationBtn')) {
    const btn = document.createElement('button');
    btn.id = 'minimizePresentationBtn';
    btn.className = 'minimize-btn'; 
    btn.textContent = isPresentationMinimized ? 'Maximizar' : 'Minimizar';
    btn.style.position = 'absolute';
    btn.style.top = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '10';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePresentationMinimized();
      btn.textContent = isPresentationMinimized ? 'Maximizar' : 'Minimizar';
    });
    const presentationContent = presentationModal.querySelector('.presentation-content');
    if (presentationContent) {
      presentationContent.appendChild(btn);
    } else {
      presentationModal.appendChild(btn);
    }
  }
}

async function closePresentation(force = false) { 
  if (isPresentationMinimized && !force) return;
  presentationModal.style.display = 'none';
  presentationOpen = false;
  clearInterval(timerInterval);
  timerInterval = null;
  timerSeconds = 0;
  currentStepCountdown = 0;
  timerDisplay.textContent = '00:00';
  presentationStep.textContent = '';
  if (isPresentationMinimized) {
    presentationModal.classList.remove('minimized');
    isPresentationMinimized = false;
  }
  const minBtn = document.getElementById('minimizePresentationBtn');
  if (minBtn) minBtn.remove();
  presentationModal.removeEventListener('click', handlePresentationClick);
  presentationModal.removeEventListener('touchstart', handleTouchStart);
  presentationModal.removeEventListener('touchend', handleTouchEnd);
  
  if (currentPresentationTask && currentPresentationTask.id) {
    const user = await getCurrentUser();
    if (user) {
        const { error } = await supabase
            .from('tasks')
            .update({ current_step_index: currentStepIndex })
            .eq('id', currentPresentationTask.id)
            .eq('user_id', user.id);
        if (error) console.error("Error guardando progreso de presentación en Supabase:", error);
        else currentPresentationTask.currentStepIndex = currentStepIndex; 
    }
  }
  renderTasks();
  currentPresentationTask = null;
  releaseWakeLock();
}

function formatTime(sec) {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

async function addReward(text) { 
  if (!_rewardsFolderObject || !_rewardsFolderObject.id) {
    console.error("La carpeta de Recompensas no está inicializada o no tiene ID. No se puede añadir recompensa.");
    alert("Error: La carpeta de recompensas no está disponible. Intenta recargar la página.");
    return;
  }
  const user = await getCurrentUser();
  if (!user) {
    console.error("Usuario no autenticado. No se puede añadir recompensa.");
    return;
  }

  const rewardTaskData = {
    folder_id: _rewardsFolderObject.id, 
    user_id: user.id,
    name: text,
    is_reward: true, 
    is_finished: false, 
    steps: [],
    is_expanded: false,
    scheduled_timestamp: null,
    current_step_index: 0,
    total_time: null
  };

  const { data: insertedRewardTask, error } = await supabase
    .from('tasks')
    .insert(rewardTaskData)
    .select()
    .single();

  if (error) {
    console.error('Error guardando tarea de recompensa en Supabase:', error);
    alert('Error al añadir la recompensa.');
  } else if (insertedRewardTask) {
    console.log('Tarea de recompensa guardada en Supabase:', insertedRewardTask);
    const localRewardTask = {
      id: insertedRewardTask.id,
      name: insertedRewardTask.name,
      steps: [],
      isExpanded: insertedRewardTask.is_expanded,
      scheduledTimestamp: insertedRewardTask.scheduled_timestamp ? new Date(insertedRewardTask.scheduled_timestamp).getTime() : null,
      isReward: insertedRewardTask.is_reward,
      currentStepIndex: insertedRewardTask.current_step_index,
      totalTime: insertedRewardTask.total_time
    };
    
    if (!_rewardsFolderObject.tasks) _rewardsFolderObject.tasks = [];
    _rewardsFolderObject.tasks.unshift(localRewardTask); 
    
    if (folderOfTaskBeingRewarded && taskBeingRewarded) {
      const success = await markTaskAsFinishedInSupabase(taskBeingRewarded);
      if (success) {
          const originalFolder = folders.find(f => f.id === folderOfTaskBeingRewarded.id);
          if (originalFolder) {
              originalFolder.tasks = originalFolder.tasks.filter(t => t.id !== taskBeingRewarded.id);
              if (!originalFolder.finished) originalFolder.finished = [];
              originalFolder.finished.push(taskBeingRewarded); 
          }
      }
    }
    
    rewardInput.value = '';
    showSection(tasksSection); 
    if (folderOfTaskBeingRewarded) {
        openFolder(folderOfTaskBeingRewarded.id, false); 
    } else if (_rewardsFolderObject && currentFolderId === _rewardsFolderObject.id) {
        openFolder(_rewardsFolderObject.id, false); 
    } else {
        showFolders(); 
    }
    renderFolders(); 
  }
  folderOfTaskBeingRewarded = null; 
  taskBeingRewarded = null;
}

async function moveTaskToMiniFolder(folder, task) { 
  const success = await markTaskAsFinishedInSupabase(task);
  if (!success) return;

  const localFolder = folders.find(f => f.id === folder.id);
  if (localFolder) {
    localFolder.tasks = localFolder.tasks.filter(t => t.id !== task.id);
    if (!localFolder.finished) localFolder.finished = [];
    localFolder.finished.push(task); 
  }

  renderTasks();
}

async function restoreFromMiniFolder(folder, taskId) { 
  const idx = folder.finished.findIndex(t => t.id === taskId);
  if (idx === -1) return;
  const taskToRestore = folder.finished[idx];

  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabase
    .from('tasks')
    .update({ is_finished: false, scheduled_timestamp: null, current_step_index: 0 }) 
    .eq('id', taskToRestore.id)
    .eq('user_id', user.id);

  if (error) {
    console.error("Error restaurando tarea (actualizando is_finished a false) en Supabase:", error);
    alert("Error al restaurar la tarea.");
    return;
  }

  taskToRestore.is_finished = false;
  taskToRestore.scheduledTimestamp = null; 
  taskToRestore.currentStepIndex = 0; 

  folder.finished.splice(idx, 1);
  if (!folder.tasks) folder.tasks = [];
  folder.tasks.push(taskToRestore);
  
  renderTasks();
}

function openScheduleModal(task) {
  taskBeingScheduled = task;
  scheduleDateInput.value = task.scheduledTimestamp ? toLocalDateTime(task.scheduledTimestamp) : '';
  scheduleModal.style.display = 'flex';
}
function closeScheduleModal() {
  scheduleModal.style.display = 'none';
  taskBeingScheduled = null;
}
function toLocalDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const offset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
}

function checkAlarms() {
  if (alarmModal.style.display === 'flex') return;
  const now = Date.now();
  for (let folder of folders) {
    for (let t of folder.tasks) {
      if (t.scheduledTimestamp && t.scheduledTimestamp <= now) {
        showAlarm(t);
        return;
      }
    }
  }
}

function showAlarm(task) {
  currentAlarmTask = task;
  alarmTitle.textContent = `¡Es hora de: "${task.name}"!`;
  alarmModal.style.display = 'flex';
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
}

function handleFolderDragStart(e) {
  draggedFolderId = e.currentTarget.dataset.id;
}
function handleFolderDragOver(e) {
  e.preventDefault();
}
function handleFolderDrop(e) {
  e.preventDefault();
  const targetFolderId = e.currentTarget.dataset.id;
  if (!targetFolderId || targetFolderId === draggedFolderId) return;
  const draggedIndex = folders.findIndex(f => f.id === draggedFolderId);
  const targetIndex = folders.findIndex(f => f.id === targetFolderId);
  if (draggedIndex > -1 && targetIndex > -1) {
    const draggedFolder = folders[draggedIndex];
    folders.splice(draggedIndex, 1);
    folders.splice(targetIndex, 0, draggedFolder);
    // TODO: Actualizar orden de carpetas en Supabase si se implementa
    renderFolders();
  }
}
function handleTaskDragStart(e) {
  draggedTaskId = e.currentTarget.dataset.taskId;
}
function handleTaskDragOver(e) {
  e.preventDefault();
}
function handleTaskDrop(e) {
  e.preventDefault();
  const targetTaskId = e.currentTarget.dataset.taskId;
  if (!targetTaskId || targetTaskId === draggedTaskId) return;
  const folder = folders.find(f => f.id === currentFolderId);
  if (!folder) return;
  const draggedIndex = folder.tasks.findIndex(t => t.id === draggedTaskId);
  const targetIndex = folder.tasks.findIndex(t => t.id === targetTaskId);
  if (draggedIndex > -1 && targetIndex > -1) {
    const draggedTask = folder.tasks[draggedIndex];
    folder.tasks.splice(draggedIndex, 1);
    folder.tasks.splice(targetIndex, 0, draggedTask);
    // TODO: Actualizar orden de tareas en Supabase si se implementa
    renderTasks();
    return;
  }
  const draggedFinishedIndex = folder.finished.findIndex(t => t.id === draggedTaskId);
  const targetFinishedIndex = folder.finished.findIndex(t => t.id === targetTaskId);
  if (draggedFinishedIndex > -1 && targetFinishedIndex > -1) {
    const draggedTask = folder.finished[draggedFinishedIndex];
    folder.finished.splice(draggedFinishedIndex, 1);
    folder.finished.splice(targetFinishedIndex, 0, draggedTask);
    // TODO: Actualizar orden de tareas finalizadas en Supabase si se implementa
    renderTasks();
  }
}
function handleStepDragStart(e) {
  draggedStepIndex = parseInt(e.currentTarget.dataset.stepIndex, 10);
}
function handleStepDragOver(e) {
  e.preventDefault();
}
async function handleStepDrop(e, task) { 
  e.preventDefault();
  const targetStepIndex = parseInt(e.currentTarget.dataset.stepIndex, 10);
  if (targetStepIndex === draggedStepIndex || isNaN(targetStepIndex) || draggedStepIndex === null) return;

  const user = await getCurrentUser();
  if (!user) return;

  const draggedStepDescription = task.steps[draggedStepIndex];
  task.steps.splice(draggedStepIndex, 1);
  task.steps.splice(targetStepIndex, 0, draggedStepDescription);
  
  const updates = task.steps.map((desc, index) => 
    supabase
      .from('steps')
      .update({ step_order: index })
      .eq('task_id', task.id)
      .eq('user_id', user.id)
      .eq('description', desc) 
  );
  
  try {
    await Promise.all(updates);
    console.log("Órdenes de pasos actualizados en Supabase para la tarea:", task.id);
  } catch (error) {
    console.error("Error actualizando órdenes de pasos en Supabase:", error);
    alert("Error al reordenar los pasos.");
  }
  draggedStepIndex = null; 
  renderTasks();
}

confirmMoveBtn.addEventListener('click', () => {
  const targetFolderId = targetFolderSelect.value;
  if (!targetFolderId) return console.log('Selecciona una carpeta de destino.');
  doMoveTask(targetFolderId);
});
cancelMoveBtn.addEventListener('click', () => closeMoveModal());

function inlineMoveTask(task, isFinished) {
  taskBeingMoved = task;
  folderOfTaskBeingMoved = folders.find(f => f.id === currentFolderId);
  isTaskCompletedBeingMoved = isFinished;
  targetFolderSelect.innerHTML = '';
  folders.forEach(folder => {
    if (!folderOfTaskBeingMoved || folder.id === folderOfTaskBeingMoved.id || folder.is_default_rewards) return;
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    targetFolderSelect.appendChild(option);
  });
  moveModal.style.display = 'flex';
}

async function doMoveTask(targetFolderId) { 
  if (!folderOfTaskBeingMoved || !taskBeingMoved) return;

  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabase
    .from('tasks')
    .update({ folder_id: targetFolderId })
    .eq('id', taskBeingMoved.id)
    .eq('user_id', user.id);

  if (error) {
    console.error("Error moviendo tarea en Supabase:", error);
    alert("Error al mover la tarea.");
    return;
  }

  const arr = isTaskCompletedBeingMoved
    ? folderOfTaskBeingMoved.finished
    : folderOfTaskBeingMoved.tasks;
  const idx = arr.findIndex(t => t.id === taskBeingMoved.id);
  if (idx > -1) arr.splice(idx, 1);
  
  const targetFolder = folders.find(f => f.id === targetFolderId);
  if (targetFolder) {
    if (isTaskCompletedBeingMoved) {
        if(!targetFolder.finished) targetFolder.finished = [];
        targetFolder.finished.push(taskBeingMoved);
    } else {
        if(!targetFolder.tasks) targetFolder.tasks = [];
        targetFolder.tasks.push(taskBeingMoved);
    }
  }
  
  renderTasks(); 
  if (folderOfTaskBeingMoved.id !== targetFolderId) { 
      const originalFolderElement = document.querySelector(`.folder[data-id="${folderOfTaskBeingMoved.id}"] .folder-name`);
      if (originalFolderElement) { 
          renderFolders(); 
      }
  }
  closeMoveModal();
}

function closeMoveModal() {
  moveModal.style.display = 'none';
  taskBeingMoved = null;
  folderOfTaskBeingMoved = null;
  isTaskCompletedBeingMoved = false;
}

async function saveDataToLocalStorage() {
  // console.log("saveDataToLocalStorage llamada - debería estar obsoleta para usuarios logueados.");
}

function loadDataFromLocalStorage() {
  console.log("loadDataFromLocalStorage ya no debería ser la fuente principal para usuarios logueados.");
}
function loadUserData(userId) {
  console.warn("loadUserData (localStorage) llamada, debería usarse loadInitialDataFromSupabase");
}

async function loadInitialDataFromSupabase(userId) {
  if (!userId) {
    clearUserData();
    return;
  }
  console.log('Cargando datos desde Supabase para el usuario:', userId);
  const { data: foldersData, error: foldersError } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (foldersError) {
    console.error('Error cargando carpetas desde Supabase:', foldersError);
    folders = [];
  } else {
    folders = foldersData.map(f => ({ ...f, tasks: [], finished: [] })) || []; 
    console.log('Carpetas cargadas:', folders);
  }

  await ensureRewardsFolder(); 

  for (let folder of folders) {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*, steps (*)') 
      .eq('user_id', userId)
      .eq('folder_id', folder.id)
      .order('created_at', { ascending: true }) 
      .order('step_order', { foreignTable: 'steps', ascending: true }); 

    if (tasksError) {
      console.error(`Error cargando tareas para la carpeta ${folder.name}:`, tasksError);
    } else {
      folder.tasks = tasksData.filter(t => !t.is_finished).map(t => ({
        id: t.id,
        name: t.name,
        steps: t.steps ? t.steps.map(s => s.description) : [],
        isExpanded: t.is_expanded,
        scheduledTimestamp: t.scheduled_timestamp ? new Date(t.scheduled_timestamp).getTime() : null,
        currentStepIndex: t.current_step_index,
        totalTime: t.total_time,
        isReward: t.is_reward,
      })) || [];
      folder.finished = tasksData.filter(t => t.is_finished).map(t => ({
        id: t.id,
        name: t.name,
        steps: t.steps ? t.steps.map(s => s.description) : [],
        isReward: t.is_reward,
      })) || [];
    }
  }
  const { data: trashData, error: trashError } = await supabase
    .from('trash_items')
    .select('*')
    .eq('user_id', userId)
    .order('deleted_at', { ascending: false });
  if (trashError) {
    console.error('Error cargando papelera desde Supabase:', trashError);
    trash = [];
  } else {
    trash = trashData.map(item => ({
        id: item.id, 
        type: item.item_type,
        data: item.item_data, 
        deletedAt: new Date(item.deleted_at).getTime()
    })) || [];
    console.log('Papelera cargada:', trash);
  }
  renderFolders(); 
  if (currentFolderId) {
      const currentF = folders.find(f => f.id === currentFolderId);
      if (currentF) openFolder(currentFolderId, false); 
      else showFolders(); 
  } else {
    showFolders(); 
  }
  cleanOldTrashItems(); 
}

function clearUserData() {
  folders = [];
  trash = [];
  _rewardsFolderObject = null; 
  renderFolders();
  if(tasksList) tasksList.innerHTML = ''; 
  if(completedMiniFolderList) completedMiniFolderList.innerHTML = ''; 
}

let chatHistory = [];
async function toggleChatModal() {
  const user = await getCurrentUser();
  const chatModal = document.getElementById('chatModal');
  if (!user) {
    showSection(authSection); 
    return;
  }
  if (chatModal.style.display === 'block') {
    chatModal.style.display = 'none';
  } else {
    chatModal.style.display = 'block';
    chatModal.style.zIndex = '10000';
  }
}

async function sendMessage() {
  console.log('sendMessage() ejecutado');
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;
  const chatMessages = document.getElementById('chatMessages');
  const userMsg = document.createElement('div');
  userMsg.style.textAlign = 'right';
  userMsg.textContent = "👤 " + message;
  chatMessages.appendChild(userMsg);
  input.value = '';
  try {
    chatHistory.push({ role: 'user', content: message });
    const appState = {
      folders: folders.map(f => ({id: f.id, name: f.name, tasks: f.tasks.map(t => ({id: t.id, name: t.name, steps: t.steps.length }) ), finished_count: f.finished.length }) ), 
      trash_count: trash.length,
      currentFolder: currentFolderId ? folders.find(f=>f.id === currentFolderId)?.name : null
    };
    const response = await fetch('/api/chat', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages: chatHistory, appState: appState })
    });
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    const data = await response.json();
    const aiResponseContent = data.choices[0].message.content;
    chatHistory.push({ role: 'assistant', content: aiResponseContent });
    const aiMsg = document.createElement('div');
    aiMsg.style.textAlign = 'left';
    aiMsg.textContent = "🤖 " + aiResponseContent;
    chatMessages.appendChild(aiMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    const jsonRegex = /```json\n?([\s\S]*?)\n?```/g;
    let match;
    let hasAction = false;
    while ((match = jsonRegex.exec(aiResponseContent)) !== null) {
      try {
        const parsedAction = JSON.parse(match[1]);
        if (parsedAction.action && parsedAction.params) {
          console.log(`Executing action from JSON block: ${parsedAction.action} with params:`, parsedAction.params);
          executeAIAction(parsedAction.action, parsedAction.params);
          console.log(`Action ${parsedAction.action} executed. Current folders state:`, folders);
          hasAction = true;
        }
      } catch (e) {
        console.error('Error al parsear JSON de acción:', e);
      }
    }
    if (!hasAction && data.choices[0].message.action) {
      console.log(`Executing action from explicit message: ${data.choices[0].message.action} with params:`, data.choices[0].message.params);
      executeAIAction(data.choices[0].message.action, data.choices[0].message.params);
    }
  } catch (error) {
    console.error('Error:', error);
    const errorMsg = document.createElement('div');
    errorMsg.style.textAlign = 'left';
    errorMsg.textContent = "🤖 Lo siento, hubo un error al procesar tu mensaje.";
    chatMessages.appendChild(errorMsg);
  }
}

function executeAIAction(action, params) {
  console.log(`executeAIAction called: ${action} with params:`, params);
  switch (action) {
    case 'createFolder':
      if (params && typeof params === 'string') {
        console.log(`Attempting to create folder: ${params}`);
        createFolder(params);
      } else {
        console.log('No se proporcionó un nombre válido para la carpeta.');
      }
      break;
    case 'createTask':
      if (params && params.folderName && params.taskName) {
        const folder = folders.find(f => f.name === params.folderName);
        if (folder) {
          console.log(`Attempting to create task: ${params.taskName} in folder: ${params.folderName}`);
          createTask(folder.id, params.taskName);
        } else {
          console.log(`Carpeta "${params.folderName}" no encontrada.`);
        }
      } else {
        console.log('No se proporcionaron los parámetros necesarios para crear la tarea (nombre de carpeta y nombre de tarea).');
      }
      break;
    case 'addStep':
      if (params && params.taskName && params.stepDescription) {
        let taskFound = false;
        for (const folder of folders) {
          const task = folder.tasks.find(t => t.name === params.taskName);
          if (task) {
            console.log(`Attempting to add step: ${params.stepDescription} to task: ${params.taskName}`);
            addNewStep(task, { value: params.stepDescription });
            taskFound = true;
            break;
          }
        }
        if (!taskFound) {
          console.log(`Tarea "${params.taskName}" no encontrada.`);
        }
      } else {
        console.log('No se proporcionaron los parámetros necesarios para agregar el paso (nombre de tarea y descripción del paso).');
      }
      break;
    case 'deleteTask':
      if (params && params.taskName) {
        console.log(`Attempting to delete task: ${params.taskName}`);
        let tasksToDelete = [];
        for (const folder of folders) {
          let pendingTasks = folder.tasks.filter(t => t.name === params.taskName);
          let finishedTasks = folder.finished.filter(t => t.name === params.taskName);
          pendingTasks.forEach(task => tasksToDelete.push({ folder, task, isFinished: false }));
          finishedTasks.forEach(task => tasksToDelete.push({ folder, task, isFinished: true }));
        }
        if (tasksToDelete.length > 0) {
          tasksToDelete.forEach(({ folder, task, isFinished }) => {
            console.log(`Moving task ${task.name} to trash from folder ${folder.name}`);
            moveTaskToTrash(folder, task.id, isFinished);
          });
          // renderTasks(); // moveTaskToTrash ya lo hace si es necesario
        } else {
          console.log(`Tarea "${params.taskName}" no encontrada.`);
        }
      } else {
        console.log('No se proporcionó el nombre de la tarea a eliminar.');
      }
      break;
    case 'deleteFolder':
      if (params && typeof params === 'string') {
        console.log(`Attempting to delete folder: ${params}`);
        const foldersToDelete = folders.filter(f => f.name === params && !f.is_default_rewards);
        if (foldersToDelete.length > 0) {
          foldersToDelete.forEach(folder => {
            console.log(`Moving folder ${folder.name} to trash`);
            moveFolderToTrash(folder.id);
          });
        } else {
          console.log(`Carpeta "${params}" no encontrada o es una carpeta de recompensas.`);
        }
      } else {
        console.log('No se proporcionó un nombre válido para la carpeta a eliminar.');
      }
      break;
    case 'restoreFromTrash':
      if (params && typeof params === 'string') {
        console.log(`Attempting to restore from trash: ${params}`);
        const trashItemsToRestore = trash.filter(item => {
          if (item.type === 'folder') return item.data.name === params;
          if (item.type === 'task' && item.data.task) return item.data.task.name === params;
          return false;
        });
        if (trashItemsToRestore.length > 0) {
          trashItemsToRestore.forEach(item => {
            console.log(`Restoring item ${item.data.name || item.data.task.name} from trash`);
            restoreFromTrash(item.id);
          });
        } else {
          console.log(`"${params}" no encontrado en la papelera.`);
        }
      } else {
        console.log('No se proporcionó un nombre válido para restaurar.');
      }
      break;
    case 'permanentlyDelete':
      if (params && typeof params === 'string') {
        console.log(`Attempting to permanently delete from trash: ${params}`);
        const trashItemsToDelete = trash.filter(item => {
          if (item.type === 'folder') return item.data.name === params;
          if (item.type === 'task' && item.data.task) return item.data.task.name === params;
          return false;
        });
        if (trashItemsToDelete.length > 0) {
          trashItemsToDelete.forEach(item => {
            console.log(`Permanently deleting item ${item.data.name || item.data.task.name}`);
            permanentlyDelete(item.id);
          });
        } else {
          console.log(`"${params}" no encontrado en la papelera.`);
        }
      } else {
        console.log('No se proporcionó un nombre válido para eliminar permanentemente.');
      }
      break;
    case 'emptyTrash':
      console.log('Attempting to empty trash');
      emptyTrash();
      break;
    case 'changeTheme':
      if (params && typeof params === 'string') {
        console.log(`Attempting to change theme to: ${params}`);
        const themeMap = {
          'oscuro': 'dark',
          'claro': 'light',
          'retro': 'cyberpunk'
        };
        const mappedTheme = themeMap[params.toLowerCase()];
        if (mappedTheme) {
          applyTheme(mappedTheme);
        } else {
          console.log(`Tema "${params}" no reconocido. Los temas válidos son: claro, oscuro, retro.`);
        }
      } else {
        console.log('No se proporcionó un nombre de tema válido.');
      }
      break;
    case 'startPresentation':
      if (params && typeof params === 'string') {
        console.log(`Attempting to start presentation for task: ${params}`);
        const taskToPresent = findTaskByName(params);
        if (taskToPresent) {
          startPresentation(taskToPresent);
        } else {
          console.log(`Tarea "${params}" no encontrada para iniciar la presentación.`);
        }
      } else {
        console.log('No se proporcionó un nombre de tarea válido para iniciar la presentación.');
      }
      break;
    case 'scheduleTask':
      if (params && params.taskName && params.date && params.time) {
        console.log(`Attempting to schedule task: ${params.taskName} for ${params.date} at ${params.time}`);
        const taskToSchedule = findTaskByName(params.taskName);
        if (taskToSchedule) {
          const dateTimeString = `${params.date}T${params.time}`;
          const newTimestamp = new Date(dateTimeString).getTime();
          taskBeingScheduled = taskToSchedule; 
          scheduleDateInput.value = toLocalDateTime(newTimestamp); 
          saveScheduleBtn.click(); 
          console.log(`Tarea "${params.taskName}" programada para el ${params.date} a las ${params.time}.`);
        } else {
          console.log(`Tarea "${params.taskName}" no encontrada para programar.`);
        }
      } else {
        console.log('No se proporcionaron los parámetros necesarios para programar la tarea (nombre de tarea, fecha y hora).');
      }
      break;
    case 'moveTask':
      if (params && params.taskName && params.targetFolderName) {
        console.log(`Attempting to move task: ${params.taskName} to folder: ${params.targetFolderName}`);
        let taskToMove = null;
        let sourceFolder = null;
        let isFinishedTask = false;
        for (const folder of folders) {
          taskToMove = folder.tasks.find(t => t.name === params.taskName);
          if (taskToMove) {
            sourceFolder = folder;
            break;
          }
          taskToMove = folder.finished.find(t => t.name === params.taskName);
          if (taskToMove) {
            sourceFolder = folder;
            isFinishedTask = true;
            break;
          }
        }
        const targetFolder = folders.find(f => f.name === params.targetFolderName);
        if (taskToMove && sourceFolder && targetFolder) {
          if (sourceFolder.id === targetFolder.id) {
            console.log(`La tarea "${params.taskName}" ya está en la carpeta "${params.targetFolderName}".`);
            return;
          }
          taskBeingMoved = taskToMove;
          folderOfTaskBeingMoved = sourceFolder;
          isTaskCompletedBeingMoved = isFinishedTask;
          doMoveTask(targetFolder.id);
          console.log(`Tarea "${params.taskName}" movida a la carpeta "${params.targetFolderName}".`);
        } else {
          console.log('No se pudo mover la tarea. Asegúrate de que la tarea y la carpeta de destino existan.');
        }
      } else {
        console.log('No se proporcionaron los parámetros necesarios para mover la tarea (nombre de tarea y nombre de carpeta de destino).');
      }
      break;
    default:
      console.warn(`Acción de IA no reconocida: ${action}`);
        console.log(`Acción de IA no reconocida: ${action}`);
  }
}

function findTaskByName(taskName) {
  for (const folder of folders) {
    let task = folder.tasks.find(t => t.name === taskName);
    if (task) return task;
    task = folder.finished.find(t => t.name === taskName);
    if (task) return task;
  }
  return null;
}

// function emptyTrash() { // Reemplazada por versión async
//   trash = [];
//   saveDataToLocalStorage();
//   renderTrash();
// }

function newConversation() {
  document.getElementById('chatMessages').innerHTML = '';
  chatHistory = [];
}

function setupChatEvents() {
  console.log('setupChatEvents() ejecutado');
  const aiButton = document.getElementById('aiButton');
  const sendChatBtn = document.getElementById('sendChatBtn');
  const chatInput = document.getElementById('chatInput');
  const toggleChatHeader = document.getElementById('toggleChatHeader');
  const newChatBtn = document.getElementById('newChatBtn');

  if(aiButton) aiButton.addEventListener('click', toggleChatModal);
  if(sendChatBtn) sendChatBtn.addEventListener('click', sendMessage);
  if(chatInput) chatInput.addEventListener('keypress', function(e) {
    if(e.key === 'Enter') sendMessage();
  });
  if(toggleChatHeader) toggleChatHeader.addEventListener('click', toggleChatModal);
  if(newChatBtn) newChatBtn.addEventListener('click', newConversation);
}

function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

function recalcStepTimes(task) {
  if (task.totalTime && task.steps.length > 0) {
    const allocated = Math.floor(task.totalTime / task.steps.length);
    task.stepTimes = [];
    for (let i = 0; i < task.steps.length; i++) {
      task.stepTimes.push(allocated);
    }
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    lastHiddenTime = Date.now();
  } else {
    const elapsedSec = Math.floor((Date.now() - lastHiddenTime) / 1000);
    if (presentationOpen && currentPresentationTask && currentPresentationTask.totalTime) {
      currentStepCountdown = currentStepCountdown - elapsedSec;
      timerDisplay.textContent = formatTime(currentStepCountdown);
    }
    if (Notification.permission === "granted") {
      const notificationOptions = {
        body: `Paso: "${presentationSteps[currentStepIndex]}"\nTiempo restante: ${formatTime(currentStepCountdown)}`
      };
      new Notification("Actualización de Temporizador", notificationOptions);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }
});

function resetPresentationSteps() {
    const stepsList = document.getElementById('presentationStepsList');
    if (stepsList) {
        stepsList.querySelectorAll('li.completed').forEach(li => li.classList.remove('completed'));
    }
    const presentationStepEl = document.getElementById('presentationStep');
    if (presentationStepEl) presentationStepEl.innerHTML = '';
    const timerDisplayEl = document.getElementById('timerDisplay');
    if (timerDisplayEl) timerDisplayEl.textContent = '00:00';
}

let presentationTimer = {
    startTime: 0,
    elapsedTime: 0,
    previousStepTime: 0,
    currentStepStartTime: 0
};

function handlePresentationNavigation(direction) {
    // const currentStep = getCurrentStep(); // Esta función getCurrentStep() no está definida
    // const previousStepTime = presentationTimer.previousStepTime;
    // const currentTime = Date.now();
    // const stepDuration = currentTime - presentationTimer.currentStepStartTime;
    // if (direction === 'next') {
    //     presentationTimer.elapsedTime += stepDuration;
    // } else if (direction === 'prev') {
    //     presentationTimer.elapsedTime -= stepDuration;
    // }
    // presentationTimer.currentStepStartTime = currentTime;
    // updateTimerDisplay(presentationTimer.elapsedTime);
    // if (direction === 'next' && currentStep < presentationSteps.length - 1) {
    //     // setCurrentStep(currentStep + 1); // Esta función setCurrentStep() no está definida
    // } else if (direction === 'prev' && currentStep > 0) {
    //     // setCurrentStep(currentStep - 1); // Esta función setCurrentStep() no está definida
    // }
    console.warn("handlePresentationNavigation y funciones relacionadas (getCurrentStep, setCurrentStep) necesitan revisión o no están definidas.");
}

function updateTimerDisplay(elapsedTime) {
    const minutes = Math.floor(Math.abs(elapsedTime) / 60000);
    const seconds = Math.floor((Math.abs(elapsedTime) % 60000) / 1000);
    const sign = elapsedTime < 0 ? '-' : '';
    const timerDisplayEl = document.getElementById('timerDisplay');
    if(timerDisplayEl) timerDisplayEl.textContent = `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

document.addEventListener('keydown', (e) => {
    if (!isPresentationMode) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        handlePresentationNavigation('next');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        handlePresentationNavigation('prev');
    }
});

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        console.log('Wake Lock liberado');
      });
      console.log('Wake Lock activado');
    }
  } catch (err) {
    console.error(`Error al solicitar Wake Lock: ${err.message}`);
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
    console.log('Wake Lock liberado manualmente');
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wakeLock === null && presentationOpen) { 
    requestWakeLock();
  }
});
