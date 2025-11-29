// @ts-nocheck
import { signUp, signIn, signOut, getCurrentUser } from './auth.js';
import * as db from './db.js';

/************************************************************************
 * VARIABLES GLOBALES
 ************************************************************************/
// Estructura de cada carpeta: { id, name, tasks:[], finished:[], isDefaultRewards?:bool }
let folders = [];
let trash = [];
const rewardsFolderId = 'rewards-folder';
let currentFolderId = null;

let currentTheme = localStorage.getItem('appTheme') || 'dark';

let draggedFolderId = null;
let draggedTaskId = null;
let draggedStepIndex = null;

let presentationSteps = [];
let currentStepIndex = 0;
let timerSeconds = 0;
let currentStepCountdown = 0; // Temporizador específico para el paso actual
let timerInterval = null;
let presentationOpen = false;
let currentPresentationTask = null;
let isPresentationMinimized = false; // Estado para saber si está minimizada
let isPresentationMode = false; // Variable para controlar el modo de presentación

let taskBeingScheduled = null;
let currentAlarmTask = null;
let taskBeingRewarded = null;
let folderOfTaskBeingRewarded = null;
let taskBeingMoved = null;
let folderOfTaskBeingMoved = null;
let isTaskCompletedBeingMoved = false;

// NUEVAS VARIABLES PARA DEBOUNCE DE INTERACCIONES EN LA PRESENTACIÓN
let lastPresentationInteraction = 0;
const PRESENTATION_DEBOUNCE_MS = 300; // tiempo en milisegundos

// NUEVA VARIABLE GLOBAL PARA MARCAR EL OCULTAMIENTO
let lastHiddenTime = 0;

// Variable para almacenar el wake lock.
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
const headerAuthIcon = document.getElementById('headerAuthIcon'); // Nuevo
const authSection = document.getElementById('authSection'); // Nuevo
const signupForm = document.getElementById('signupForm'); // Nuevo
const signupEmail = document.getElementById('signupEmail'); // Nuevo
const signupPassword = document.getElementById('signupPassword'); // Nuevo
const signinForm = document.getElementById('signinForm'); // Nuevo
const signinEmail = document.getElementById('signinEmail'); // Nuevo
const signinPassword = document.getElementById('signinPassword'); // Nuevo
const signOutButton = document.getElementById('signOutButton'); // Nuevo
const newTaskInput = document.getElementById('newTaskInput');
// Nuevo input para asignar tiempo (en minutos) a la tarea
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

// Elementos del modal de confirmación
const confirmModal = document.getElementById('confirmModal');
const confirmMessageElem = document.getElementById('confirmMessage');
const confirmYesBtn = document.getElementById('confirmYesBtn');
const confirmNoBtn = document.getElementById('confirmNoBtn');

/************************************************************************
 * EVENTOS DE CARGA
 ************************************************************************/
window.addEventListener('load', () => {
  loadDataFromLocalStorage();
  ensureRewardsFolder();
  applyTheme(currentTheme);
  renderFolders();
  cleanOldTrashItems();
  window.addEventListener('popstate', handlePopState);
  setInterval(checkAlarms, 60 * 1000);
  setupChatEvents();
  setupShareEvents();
  setupAuthEvents(); // Nuevo: Configurar eventos de autenticación
  checkAuthStatus(); // Nuevo: Verificar estado de autenticación al cargar

  const appTitleLink = document.getElementById('appTitleLink');
  if (appTitleLink) {
    appTitleLink.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent default link behavior
      showFolders(); // Navigate to the home page (folders view)
    });
  }

});

function setupAuthEvents() {
  let userMenuOpen = false;

  // Header auth icon
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

  // Elementos de la nueva interfaz minimalista
  const authSelector = document.getElementById('authSelector');
  const signinView = document.getElementById('signinView');
  const signupView = document.getElementById('signupView');
  const btnShowSignin = document.getElementById('btnShowSignin');
  const btnShowSignup = document.getElementById('btnShowSignup');
  const backFromSignin = document.getElementById('backFromSignin');
  const backFromSignup = document.getElementById('backFromSignup');

  // Función para cambiar entre vistas
  const showView = (viewToShow) => {
    [authSelector, signinView, signupView].forEach(view => {
      if (view) view.classList.remove('active');
    });
    if (viewToShow) viewToShow.classList.add('active');
  };

  // Mostrar vista de inicio de sesión
  if (btnShowSignin) {
    btnShowSignin.addEventListener('click', () => showView(signinView));
  }

  // Mostrar vista de registro
  if (btnShowSignup) {
    btnShowSignup.addEventListener('click', () => showView(signupView));
  }

  // Volver al selector desde signin
  if (backFromSignin) {
    backFromSignin.addEventListener('click', () => showView(authSelector));
  }

  // Volver al selector desde signup
  if (backFromSignup) {
    backFromSignup.addEventListener('click', () => showView(authSelector));
  }

  // Formulario de registro
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = signupEmail.value.trim();
      const password = signupPassword.value;
      
      if (!email || !password) return;
      
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creando cuenta...';
      submitBtn.disabled = true;
      
      try {
        await signUp(email, password);
        submitBtn.textContent = '✓ Cuenta creada';
        setTimeout(() => {
          showView(signinView);
          signupForm.reset();
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }, 1500);
      } catch (error) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        showNotification(error.message, 'error');
      }
    });
  }

  // Formulario de inicio de sesión
  if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = signinEmail.value.trim();
      const password = signinPassword.value;
      
      if (!email || !password) return;
      
      const submitBtn = signinForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Iniciando...';
      submitBtn.disabled = true;
      
      try {
        await signIn(email, password);
        submitBtn.textContent = '✓ Bienvenido';
        setTimeout(() => {
          checkAuthStatus();
        }, 800);
      } catch (error) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        showNotification(error.message, 'error');
      }
    });
  }
}

// Función para mostrar notificaciones minimalistas
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background: ${type === 'error' ? 'rgba(255, 59, 48, 0.9)' : 'rgba(52, 199, 89, 0.9)'};
    color: white;
    border-radius: 12px;
    font-size: 0.9rem;
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Añadir animaciones CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(400px); opacity: 0; }
  }
`;
document.head.appendChild(style);

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

    const signOutButton = document.createElement('button');
    signOutButton.textContent = 'Cerrar sesión';
    signOutButton.style.width = '100%';
    signOutButton.style.padding = '0.5rem';
    signOutButton.style.marginTop = '0.5rem';
    signOutButton.style.background = 'transparent';
    signOutButton.style.border = 'none';
    signOutButton.style.color = '#fff';
    signOutButton.style.cursor = 'pointer';
    signOutButton.addEventListener('click', signOutAndRefresh);
    userMenu.appendChild(signOutButton);

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
    // Usuario logueado
    headerAuthIcon.innerHTML = `<span style="font-size: 0.8rem; margin-right: 5px;">${user.email}</span> 🚪`;
    headerAuthIcon.title = 'Cerrar sesión';
    if (authChoiceDiv) authChoiceDiv.style.display = 'none';
    if (authContainer) authContainer.style.display = 'none';
    // Mostrar el botón de AI y resetear el estado del chat
    if (aiButton) aiButton.style.display = 'block';
    if (chatModal) chatModal.style.display = 'none';
    // Cargar datos del usuario específico
    loadUserData(user.id);
    showFolders(); // Mostrar las carpetas si el usuario está logueado
  } else {
    // Usuario no logueado - MOSTRAR SOLO LA PANTALLA DE AUTENTICACIÓN
    headerAuthIcon.innerHTML = '👤'; // Icono de usuario
    headerAuthIcon.title = 'Iniciar sesión';
    if (authChoiceDiv) authChoiceDiv.style.display = 'block';
    if (authContainer) authContainer.style.display = 'none';
    // Ocultar el botón de AI y la ventana del chat
    if (aiButton) aiButton.style.display = 'none';
    if (chatModal) chatModal.style.display = 'none';
    // Limpiar datos cuando no hay usuario
    clearUserData();
    // Mostrar SOLO la sección de autenticación
    showSection(authSection);
  }
}

function setupShareEvents() {
  // Botón de cerrar modal
  document.getElementById('closeShareBtn').addEventListener('click', () => {
    document.getElementById('shareModal').style.display = 'none';
  });

  // Botón de compartir por WhatsApp
  document.getElementById('whatsappShareBtn').addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getWhatsAppShareLink(taskToShare);
    window.open(url, '_blank');
    document.getElementById('shareModal').style.display = 'none'; // Cerrar modal
  });

  // Botón de compartir por Telegram
  document.getElementById('telegramShareBtn').addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getTelegramShareLink(taskToShare);
    window.open(url, '_blank');
    document.getElementById('shareModal').style.display = 'none'; // Cerrar modal
  });

  // Botón de compartir por correo
  document.getElementById('emailShareBtn').addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getEmailShareLink(taskToShare);
    window.location.href = url;
    document.getElementById('shareModal').style.display = 'none'; // Cerrar modal
  });

  // Botón de compartir por Facebook
  document.getElementById('facebookShareBtn').addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getFacebookShareLink(taskToShare);
    window.open(url, '_blank');
    document.getElementById('shareModal').style.display = 'none'; // Cerrar modal
  });

  // Botón de compartir por Twitter
  document.getElementById('twitterShareBtn').addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getTwitterShareLink(taskToShare);
    window.open(url, '_blank');
    document.getElementById('shareModal').style.display = 'none'; // Cerrar modal
  });

  // Botón de compartir por LinkedIn
  document.getElementById('linkedinShareBtn').addEventListener('click', () => {
    if (!taskToShare) return;
    const url = getLinkedInShareLink(taskToShare);
    window.open(url, '_blank');
    document.getElementById('shareModal').style.display = 'none'; // Cerrar modal
  });
}

// Funciones para generar enlaces de compartir
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
  const summary = encodeURIComponent(formatTaskForSharing(task)); // Usar el formato completo para el resumen
  return `https://www.linkedin.com/shareArticle?mini=true&title=${title}&summary=${summary}`;
}

newFolderInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const name = newFolderInput.value.trim();
    if (name) {
      createFolder(name);
      newFolderInput.value = '';
    }
  }
});

// Listener para el input del nombre de la tarea
newTaskInput.addEventListener('keydown', (e) => {
  // Si estamos en la carpeta de recompensas, no permitimos crear "tareas"
  if (currentFolderId === rewardsFolderId) return;
  if (e.key === 'Enter') {
    const taskName = newTaskInput.value.trim();
    if (taskName && currentFolderId) {
      createTask(currentFolderId, taskName);
      newTaskInput.value = '';
      newTaskTimeInput.value = '';
    }
  }
});

// Listener adicional para el input del temporizador (tiempo)
newTaskTimeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const taskName = newTaskInput.value.trim();
    if (taskName && currentFolderId) {
      createTask(currentFolderId, taskName);
      newTaskInput.value = '';
      newTaskTimeInput.value = '';
    }
  }
});

themeButton.addEventListener('click', () => {
  if (currentTheme === 'dark') applyTheme('light');
  else if (currentTheme === 'light') applyTheme('cyberpunk');
  else applyTheme('dark');
});

importFileInput.addEventListener('change', (e) => {
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
      const importedFolders = importedJSON.folders.filter(f => !f.isDefaultRewards);
      folders = [...folders, ...importedFolders];
      ensureRewardsFolder();
      saveDataToLocalStorage();
      renderFolders();
      console.log("¡Datos importados con éxito!");
    } catch (err) {
      console.error("Error al leer el JSON: " + err);
    }
  };
  reader.readAsText(file);
  importFileInput.value = '';
});

trashButton.addEventListener('click', () => showTrash());
rewardInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = rewardInput.value.trim();
    if (text) {
      addReward(text);
      if (folderOfTaskBeingRewarded && taskBeingRewarded) {
        moveTaskToMiniFolder(folderOfTaskBeingRewarded, taskBeingRewarded);
      }
      rewardInput.value = '';
      rewardSection.style.display = 'none';
      tasksSection.style.display = 'block';
    }
  }
});

saveScheduleBtn.addEventListener('click', () => {
  if (!taskBeingScheduled) return;
  const newDate = scheduleDateInput.value;
  taskBeingScheduled.scheduledTimestamp = newDate ? new Date(newDate).getTime() : null;
  closeScheduleModal();
  saveDataToLocalStorage();
  renderTasks();
});
cancelScheduleBtn.addEventListener('click', () => closeScheduleModal());
disableAlarmBtn.addEventListener('click', () => {
  alarmModal.style.display = 'none';
  if (currentAlarmTask) {
    currentAlarmTask.scheduledTimestamp = null;
    saveDataToLocalStorage();
    renderTasks();
  }
  currentAlarmTask = null;
});

/************************************************************************
 * CONFIRM MODAL PERSONALIZADO
 ************************************************************************/
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

/************************************************************************
 * HISTORIAL / NAVEGACIÓN
 ************************************************************************/
window.removeEventListener('popstate', handlePopState);
window.addEventListener('popstate', handlePopState);

function handlePopState(event) {
  console.log('popstate event:', event.state);
  // Si la presentación está activa en pantalla grande, cerrarla y detener navegación.
  if (presentationOpen && !isPresentationMinimized) {
    console.log('Cerrando presentación por popstate');
    closePresentation(true);
    return; // No procesar más cambios
  }
  // Procesa la navegación normal solo si hay un estado
  if (event.state) {
    if (event.state.rewards) {
      showFolders();
    } else if (event.state.folderId) {
      openFolder(event.state.folderId, false);
    } else if (event.state.trash) {
      showTrash(false);
    }
  } else {
    showFolders();
  }
}

// Función auxiliar para mostrar una sección y ocultar las demás
function showSection(sectionToShow) {
  const sections = [foldersSection, tasksSection, trashSection, rewardSection, authSection];
  sections.forEach(section => {
    if (section === sectionToShow) {
      if (section === authSection) {
        section.style.display = 'flex';
      } else {
        section.style.display = 'block';
      }
    } else {
      section.style.display = 'none';
    }
  });

  // Asegurar que el chat y el botón AI estén ocultos si se está mostrando la sección de autenticación
  const chatModal = document.getElementById('chatModal');
  const aiButton = document.getElementById('aiButton');
  if (sectionToShow === authSection) {
    if (chatModal) chatModal.style.display = 'none';
    if (aiButton) aiButton.style.display = 'none';
  }

  // Ocultar el modal de presentación si no es la sección de presentación
  if (sectionToShow !== presentationModal && !isPresentationMinimized) {
    presentationModal.style.display = 'none';
  }
}

function showFolders() {
  showSection(foldersSection);
  currentFolderId = null;
  headerDynamicTitle.textContent = ''; // Empty for main folders view
}

function openFolder(folderId, pushToHistory = true) {
  console.log('openFolder ejecutado para folderId:', folderId);
  currentFolderId = folderId;
  const folder = folders.find(f => f.id === folderId);
  if (!folder) {
    console.log('Carpeta no encontrada:', folderId);
    return;
  }

  headerDynamicTitle.textContent = folder.name; // Update dynamic title

  showSection(tasksSection);
  renderTasks();

  // Empuja el estado al historial: si es la carpeta de Recompensas, usa un estado especial
  if (pushToHistory) {
    if (folderId === rewardsFolderId) {
      history.pushState({ rewards: true }, '', '');
    } else {
      history.pushState({ folderId }, '', '');
    }
  }
}

function showTrash(pushHistory = true) {
  showSection(trashSection);
  renderTrash();

  // Update header for trash view
  headerDynamicTitle.textContent = 'Papelera';

  if (pushHistory) {
    history.pushState({ trash: true }, '', '');
  }
}

// ... Continúa con el resto de funciones de la sección CARPETAS.

/************************************************************************
 * TEMA
 ************************************************************************/
function applyTheme(themeName) {
  document.body.classList.remove('light-theme', 'cyberpunk-theme');
  if (themeName === 'light') {
    document.body.classList.add('light-theme');
    themeButton.textContent = '☀️';
  } else if (themeName === 'cyberpunk') {
    document.body.classList.add('cyberpunk-theme');
    themeButton.textContent = '🔥';
  } else {
    themeButton.textContent = '🌙';
  }
  currentTheme = themeName;
  localStorage.setItem('appTheme', themeName);
  
  // Actualiza el estilo del chat según el tema
  const chatModal = document.getElementById('chatModal');
  chatModal.classList.remove('chat-dark', 'chat-light', 'chat-cyberpunk');
  if (themeName === 'light') {
    chatModal.classList.add('chat-light');
  } else if (themeName === 'cyberpunk') {
    chatModal.classList.add('chat-cyberpunk');
  } else {
    chatModal.classList.add('chat-dark');
  }
}

/************************************************************************
 * CARPETAS
 ************************************************************************/
function ensureRewardsFolder() {
  let rf = folders.find(f => f.id === rewardsFolderId);
  if (!rf) {
    rf = {
      id: rewardsFolderId,
      name: 'Recompensas',
      tasks: [],
      finished: [],
      isDefaultRewards: true
    };
    folders.push(rf);
  }
}

function createFolder(name) {
  const folder = {
    id: generateId(),
    name,
    tasks: [],
    finished: [],
    isDefaultRewards: false
  };
  folders.push(folder);
  saveDataToLocalStorage();
  renderFolders();
}

function renderFolders() {
  folderContainer.innerHTML = '';
  folders.forEach(folder => {
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder';
    folderDiv.dataset.id = folder.id;
    folderDiv.draggable = true;

    const miniFolder = document.createElement('div');
    miniFolder.className = 'mini-folder';
    miniFolder.innerHTML = '📁';
    miniFolder.onclick = () => showFinishedTasks(folder.id);

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

    if (!folder.isDefaultRewards) {
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

window.addEventListener('popstate', (event) => {
  if (event.state) {
    // Si se detecta el estado especial de Recompensas, se vuelve a la vista de carpetas
    if (event.state.rewards) {
      showFolders();
    } else if (event.state.folderId) {
      openFolder(event.state.folderId, false);
    } else if (event.state.trash) {
      showTrash(false);
    }
  } else {
    // Por defecto, mostrar la vista de carpetas
    showFolders();
  }
});


function renameFolder(folder) {
  const folderElement = document.querySelector(`[data-id="${folder.id}"]`);
  const nameElement = folderElement.querySelector('.folder-name');

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'folder-edit-input';
  editInput.value = folder.name;

  const finishEdit = () => {
    const newName = editInput.value.trim();
    if (newName && newName !== folder.name) {
      folder.name = newName;
      saveDataToLocalStorage();
      renderFolders();
    } else {
      nameElement.textContent = folder.name;
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

/************************************************************************
 * PAPELERA
 ************************************************************************/
function moveFolderToTrash(folderId) {
  const idx = folders.findIndex(f => f.id === folderId);
  if (idx === -1) return;

  const folder = folders[idx];
  folders.splice(idx, 1);

  trash.push({
    id: generateId(),
    type: 'folder',
    data: folder,
    deletedAt: Date.now()
  });
  saveDataToLocalStorage();
  renderFolders();
  if (currentFolderId === folderId) showFolders();
}

function moveTaskToTrash(folder, taskId, isFinished = false) {
  const arr = isFinished ? folder.finished : folder.tasks;
  const index = arr.findIndex(t => t.id === taskId);
  if (index === -1) return;

  const task = arr[index];
  arr.splice(index, 1);

  trash.push({
    id: generateId(),
    type: 'task',
    data: { folderId: folder.id, task },
    deletedAt: Date.now()
  });
  saveDataToLocalStorage();
}

function renderTrash() {
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
      : `Tarea eliminada: ${item.data.task.name}`;

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

function restoreFromTrash(trashItemId) {
  const idx = trash.findIndex(t => t.id === trashItemId);
  if (idx === -1) return;
  const item = trash[idx];

  if (item.type === 'folder') folders.push(item.data);
  else if (item.type === 'task') {
    const folder = folders.find(f => f.id === item.data.folderId);
    if (folder) folder.tasks.push(item.data.task);
  }

  trash.splice(idx, 1);
  saveDataToLocalStorage();
  trashSection.style.display = 'block';
  renderTrash();
  renderFolders();
}

function permanentlyDelete(trashItemId) {
  trash = trash.filter(t => t.id !== trashItemId);
  saveDataToLocalStorage();
  renderTrash();
}

function cleanOldTrashItems() {
  const now = Date.now();
  const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
  trash = trash.filter(item => (now - item.deletedAt) < fifteenDaysMs);
  saveDataToLocalStorage();
}

/************************************************************************
 * EXPORTAR CARPETA
 ************************************************************************/
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

/************************************************************************
 * TAREAS (MODIFICACIONES PRINCIPALES)
 ************************************************************************/
function createTask(folderId, taskName, timeInMinutes = null) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  // Si la carpeta es de recompensas, no permitimos crear tareas
  if (folder.id === rewardsFolderId) return;
  
  // Determinar el tiempo total: usar el parámetro si se proporciona, sino leer del input
  let totalTime = null;
  if (timeInMinutes !== null && timeInMinutes !== undefined) {
    // Tiempo proporcionado por parámetro (desde IA)
    totalTime = parseInt(timeInMinutes, 10) * 60; // Convertir minutos a segundos
  } else if (newTaskTimeInput && newTaskTimeInput.value.trim() !== "") {
    // Tiempo desde el input manual
    totalTime = parseInt(newTaskTimeInput.value, 10) * 60; // Convertir minutos a segundos
  }
  const newTask = {
    id: generateId(),
    name: taskName,
    steps: [],
    isExpanded: false,
    scheduledTimestamp: null,
    currentStepIndex: 0,
    totalTime: totalTime, // Tiempo total en segundos (opcional)
    stepTimes: [] // Se calculará a medida que se agreguen pasos
  };
  folder.tasks.push(newTask);
  // Si la tarea tiene tiempo total, recalcular los tiempos de los pasos (incluso si no hay pasos aún)
  if (newTask.totalTime) {
    recalcStepTimes(newTask);
  }
  saveDataToLocalStorage();
  renderTasks();
}

function renderTasks() {
  console.log('renderTasks ejecutado para currentFolderId:', currentFolderId);
  const folder = folders.find(f => f.id === currentFolderId);
  if (!folder) {
    console.log('Carpeta no encontrada en renderTasks:', currentFolderId);
    return;
  }

  tasksList.innerHTML = '';
  completedMiniFolderList.innerHTML = '';

  folder.tasks.forEach(task => tasksList.appendChild(buildPendingTaskItem(folder, task)));

  // Si la carpeta es de recompensas, ocultamos ambos inputs
  if (folder.id === rewardsFolderId) {
    newTaskInput.style.display = 'none';
    newTaskTimeInput.style.display = 'none';
  } else {
    newTaskInput.style.display = 'block';
    newTaskTimeInput.style.display = 'block';
  }

  completedMiniFolder.style.display = 'block';
  completedMiniFolderList.innerHTML = '';
  folder.finished.forEach(task => completedMiniFolderList.appendChild(buildFinishedTaskItem(folder, task)));

  document.querySelector('.mini-folder-icon').onclick = () => {
    completedMiniFolder.classList.toggle('expanded');
  };
}

function renameTask(task) {
  const taskElement = document.querySelector(`[data-task-id="${task.id}"]`);
  const nameSpan = taskElement.querySelector('.task-name-text');

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'task-edit-input';
  editInput.value = task.name;

  const finishEdit = () => {
    const newName = editInput.value.trim();
    if (newName && newName !== task.name) {
      task.name = newName;
      saveDataToLocalStorage();
      renderTasks();
    } else {
      nameSpan.textContent = task.name;
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

  if (folder.id === rewardsFolderId || task.isReward) {
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showConfirm(`¿Eliminar "${task.name}"?`, () => {
        moveTaskToTrash(folder, task.id, false);
        saveDataToLocalStorage();
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
        saveDataToLocalStorage();
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
        saveDataToLocalStorage();
        renderTasks();
      });
    });

  taskButtons.append(restoreBtn, deleteBtn);
  taskHeader.append(taskNameSpan, taskButtons);
  taskDiv.appendChild(taskHeader);

  return taskDiv;
}

/************************************************************************
 * COMPLETAR TAREA
 ************************************************************************/
function openRewardSection(folder, task) {
  folderOfTaskBeingRewarded = folder;
  taskBeingRewarded = task;
  tasksSection.style.display = 'none';
  rewardSection.style.display = 'block';
}

function moveTaskToMiniFolder(folder, task) {
  folder.tasks = folder.tasks.filter(t => t.id !== task.id);

  if (task.reward) {
    const rewardsFolder = folders.find(f => f.id === rewardsFolderId);
    if (rewardsFolder) {
      rewardsFolder.tasks.unshift(task);
    }
  } else {
    folder.finished.push(task);
  }

  folderOfTaskBeingRewarded = null;
  taskBeingRewarded = null;
  saveDataToLocalStorage();
  renderTasks();
  renderFolders();
}

function restoreFromMiniFolder(folder, taskId) {
  const idx = folder.finished.findIndex(t => t.id === taskId);
  if (idx === -1) return;
  const t = folder.finished[idx];
  // Reiniciar el índice de paso y cualquier otro estado relacionado
  t.currentStepIndex = 0;
  // ...posible reinicio de otros estados de pasos si fuese necesario...
  folder.finished.splice(idx, 1);
  folder.tasks.push(t);
  saveDataToLocalStorage();
  renderTasks();
}

/************************************************************************
 * PASOS
 ************************************************************************/
// Función para compartir tarea
function shareTask(task) {
  taskToShare = task;
  const shareModal = document.getElementById('shareModal');
  shareModal.style.display = 'flex';

  // Añadir listener para cerrar el modal al hacer clic fuera
  setTimeout(() => { // Pequeño retraso para evitar que el clic que abre el modal lo cierre inmediatamente
    document.addEventListener('click', closeShareModalOnClickOutside);
  }, 50);
}

function closeShareModalOnClickOutside(event) {
  const shareModal = document.getElementById('shareModal');
  const shareButton = document.querySelector('.share-button'); // Asumiendo que hay un botón que abre el modal

  // Si el clic no fue dentro del modal y no fue en el botón que lo abre
  if (!shareModal.contains(event.target) && !event.target.closest('.share-button')) {
    shareModal.style.display = 'none';
    document.removeEventListener('click', closeShareModalOnClickOutside); // Eliminar el listener
  }
}

// Funciones para generar enlaces de compartir
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
  const body = formatTaskForSharing(task); // Usar el formato completo para el cuerpo del correo
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function addNewStep(task, inputElem) {
  const text = inputElem.value.trim();
  if (text) {
    task.steps.push(text);
    inputElem.value = '';
    if (task.totalTime) {
      recalcStepTimes(task);
    }
    saveDataToLocalStorage();
    renderTasks();
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
  task.steps.splice(stepIndex, 1);
  if (task.totalTime) {
    recalcStepTimes(task);
  }
  saveDataToLocalStorage();
  renderTasks();
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

  const finishEdit = () => {
    const newStep = editInput.value.trim();
    if (newStep && newStep !== task.steps[stepIndex]) {
      task.steps[stepIndex] = newStep;
      saveDataToLocalStorage();
      renderTasks();
    } else {
      // Si no hay cambio o el nuevo paso está vacío, simplemente restaurar el texto original
      stepTextSpan.textContent = task.steps[stepIndex];
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

function toggleTaskStepsVisibility(task, stepsDiv, toggleBtn) {
  task.isExpanded = !task.isExpanded;
  stepsDiv.style.display = task.isExpanded ? 'flex' : 'none';
  toggleBtn.textContent = task.isExpanded ? '▼' : '◀';
  saveDataToLocalStorage();
}

/************************************************************************
 * PRESENTACIÓN
 ************************************************************************/
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
      // Si hay tiempo total pero no hay pasos, el contador es el tiempo total
      currentStepCountdown = task.totalTime;
    }
  } else {
    // Si no hay tiempo total, el contador es 0
    currentStepCountdown = 0;
  }

  // Se elimina el pushState de presentación para no interferir con la navegación entre carpetas
  // history.pushState({ presentation: true }, '', '');
  presentationModal.style.display = 'flex';
  showPresentationStep();
  startTimer();
  addMinimizeButton();
  presentationModal.addEventListener('click', handlePresentationClick);
  presentationModal.addEventListener('touchstart', handleTouchStart);
  presentationModal.addEventListener('touchend', handleTouchEnd);
  requestWakeLock();
}

// Modificar el manejador de clic para descartar clics en el botón de minimizar/maximizar
function handlePresentationClick(e) {
  // Si el clic proviene del botón de minimizar, salir sin realizar acción.
  if (e.target.closest('#minimizePresentationBtn')) return;
  
  const now = Date.now();
  if (now - lastPresentationInteraction < PRESENTATION_DEBOUNCE_MS) return;
  lastPresentationInteraction = now;
  
  const halfWidth = window.innerWidth / 2;
  if (e.clientX > halfWidth) {
    nextStep(); // Click derecho: avanzar
  } else {
    prevStep(); // Click izquierdo: retroceder
  }
}

let touchStartX = 0; // Se conserva o agrega si no existe

function handleTouchStart(e) {
    // Capturamos la posición inicial del toque
    if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
    }
}

// Modificar el manejador de toque de forma similar:
function handleTouchEnd(e) {
  const now = Date.now();
  if (now - lastPresentationInteraction < PRESENTATION_DEBOUNCE_MS) return;
  lastPresentationInteraction = now;
  
  if (e.changedTouches && e.changedTouches[0]) {
    const touchEndX = e.changedTouches[0].clientX;
    const halfWidth = window.innerWidth / 2;
    if (touchEndX > halfWidth) {
      nextStep(); // Touch derecho: avanzar
    } else {
      prevStep(); // Touch izquierdo: retroceder
    }
  }
}

// Modificar la función prevStep para que reste el tiempo consumido, permitiendo números negativos
function prevStep() {
  if (currentStepIndex > 0) {
    if (currentPresentationTask && currentPresentationTask.totalTime) {
      // Guardamos el tiempo actual antes de retroceder
      const currentBaseTime = currentPresentationTask.stepTimes[currentStepIndex];
      currentStepIndex--;
      
      // Calculamos cuánto tiempo se ha consumido del paso actual
      const timeUsed = currentBaseTime - currentStepCountdown;
      
      // Al retroceder, tomamos el tiempo base del paso anterior y le restamos el tiempo usado
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
      // Al avanzar mantenemos el comportamiento de sumar el tiempo restante
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
  
  // Removemos los listeners de toque ya que no se usan en este estado.
  presentationModal.removeEventListener('touchstart', handleTouchStart);
  presentationModal.removeEventListener('touchend', handleTouchEnd);
  
  // Enganchamos el listener que determina el siguiente paso según la zona clickeada y el tiempo obtenido.
  presentationModal.addEventListener('click', handleFinalClick);
}

function handleFinalClick(e) {
  // Removemos el listener para evitar llamadas duplicadas
  presentationModal.removeEventListener('click', handleFinalClick);

  // Capturamos la carpeta y tarea actuales antes de forzar el cierre
  const currentFolder = folders.find(f => f.id === currentFolderId);
  const currentTask = currentPresentationTask;
  
  // Guardamos el tiempo restante antes de cerrar la presentación
  const savedTime = currentStepCountdown;

  // Forzamos el cierre de la presentación
  closePresentation(true);
  
  // Si se pulsó en la mitad derecha y el tiempo guardado es positivo, mostramos la recompensa
  if (e.clientX > window.innerWidth / 2 && savedTime > 0) {
    if (currentFolder && currentTask) {
      openRewardSection(currentFolder, currentTask);
    }
  } else {
    if (currentFolder && currentTask) {
      moveTaskToMiniFolder(currentFolder, currentTask);
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
      // Se decrementa el contador sin avanzar automáticamente al siguiente paso
      currentStepCountdown--;
      timerDisplay.textContent = formatTime(currentStepCountdown);
    } else {
      timerSeconds++;
      timerDisplay.textContent = formatTime(timerSeconds);
    }
  }, 1000);
}

/************************************************************************
 * FUNCIONALIDAD DE MINIMIZAR/EXPANDIR PRESENTACIÓN CON DRAG POR TOUCH
 ************************************************************************/
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
    btn.className = 'minimize-btn'; // Asegura que exista una clase con estilos definidos en CSS si es necesario
    btn.textContent = isPresentationMinimized ? 'Maximizar' : 'Minimizar';

    // Se asignan estilos en línea para posicionar el botón (opcional, de acuerdo al diseño deseado)
    btn.style.position = 'absolute';
    btn.style.top = '10px';
    btn.style.right = '10px';
    btn.style.zIndex = '10';

    // Al hacer clic se evita la propagación del evento, se alterna el estado y se actualiza el texto
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePresentationMinimized();
      btn.textContent = isPresentationMinimized ? 'Maximizar' : 'Minimizar';
    });

    // Inserta el botón en el contenedor de contenido de la presentación
    const presentationContent = presentationModal.querySelector('.presentation-content');
    if (presentationContent) {
      presentationContent.appendChild(btn);
    } else {
      // Si no se encuentra, se inserta directamente en el modal
      presentationModal.appendChild(btn);
    }
  }
}

/************************************************************************
 * CLOSE PRESENTATION
 ************************************************************************/
function closePresentation(force = false) {
  // Si la presentación está minimizada y no se fuerza, se evita el cierre
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
  if (currentPresentationTask) {
    currentPresentationTask.currentStepIndex = currentStepIndex;
  }
  saveDataToLocalStorage();
  renderTasks();
  currentPresentationTask = null;
  releaseWakeLock();
}

function formatTime(sec) {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/************************************************************************
 * RECOMPENSA
 ************************************************************************/
function addReward(text) {
  const rewardsFolder = folders.find(f => f.id === rewardsFolderId);
  if (rewardsFolder) {
    const rewardTask = {
      id: generateId(),
      name: text,
      steps: [],
      isExpanded: false,
      scheduledTimestamp: null,
      isReward: true,
      currentStepIndex: 0
    };
    rewardsFolder.tasks.unshift(rewardTask);
    saveDataToLocalStorage();
    renderFolders();
    if (folderOfTaskBeingRewarded && taskBeingRewarded) {
      moveTaskToMiniFolder(folderOfTaskBeingRewarded, taskBeingRewarded);
    }
    rewardSection.style.display = 'none';
    tasksSection.style.display = 'block';
  }
}

/************************************************************************
 * SCHEDULE
 ************************************************************************/
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
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/************************************************************************
 * ALARMA
 ************************************************************************/
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
  saveDataToLocalStorage();
}

/************************************************************************
 * DRAG & DROP
 ************************************************************************/
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
    saveDataToLocalStorage();
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
    saveDataToLocalStorage();
    renderTasks();
    return;
  }
  const draggedFinishedIndex = folder.finished.findIndex(t => t.id === draggedTaskId);
  const targetFinishedIndex = folder.finished.findIndex(t => t.id === targetTaskId);
  if (draggedFinishedIndex > -1 && targetFinishedIndex > -1) {
    const draggedTask = folder.finished[draggedFinishedIndex];
    folder.finished.splice(draggedFinishedIndex, 1);
    folder.finished.splice(targetFinishedIndex, 0, draggedTask);
    saveDataToLocalStorage();
    renderTasks();
  }
}

function handleStepDragStart(e) {
  draggedStepIndex = parseInt(e.currentTarget.dataset.stepIndex, 10);
}

function handleStepDragOver(e) {
  e.preventDefault();
}

function handleStepDrop(e, task) {
  e.preventDefault();
  const targetStepIndex = parseInt(e.currentTarget.dataset.stepIndex, 10);
  if (targetStepIndex === draggedStepIndex || isNaN(targetStepIndex)) return;
  const draggedStep = task.steps[draggedStepIndex];
  task.steps.splice(draggedStepIndex, 1);
  task.steps.splice(targetStepIndex, 0, draggedStep);
  saveDataToLocalStorage();
  renderTasks();
}

/************************************************************************
 * MOVER TAREA
 ************************************************************************/
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
    if (folder.id === folderOfTaskBeingMoved.id || folder.isDefaultRewards) return;
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    targetFolderSelect.appendChild(option);
  });
  moveModal.style.display = 'flex';
}

function doMoveTask(targetFolderId) {
  if (!folderOfTaskBeingMoved || !taskBeingMoved) return;
  const arr = isTaskCompletedBeingMoved
    ? folderOfTaskBeingMoved.finished
    : folderOfTaskBeingMoved.tasks;
  const idx = arr.findIndex(t => t.id === taskBeingMoved.id);
  if (idx > -1) arr.splice(idx, 1);
  const targetFolder = folders.find(f => f.id === targetFolderId);
  if (targetFolder) targetFolder.tasks.push(taskBeingMoved);
  saveDataToLocalStorage();
  renderTasks();
  renderFolders();
  closeMoveModal();
}

function closeMoveModal() {
  moveModal.style.display = 'none';
  taskBeingMoved = null;
  folderOfTaskBeingMoved = null;
  isTaskCompletedBeingMoved = false;
}

/************************************************************************
 * LOCALSTORAGE
 ************************************************************************/
async function saveDataToLocalStorage() {
  const user = await getCurrentUser();
  if (user) {
    // Si hay un usuario logueado, guardar los datos asociados a su ID
    const userDataKey = `userData_${user.id}`;
    localStorage.setItem(userDataKey, JSON.stringify({ folders, trash }));
  } else {
    // Si no hay usuario, guardar en la clave general (para compatibilidad)
    localStorage.setItem('foldersDataV4', JSON.stringify({ folders, trash }));
  }
}

function loadDataFromLocalStorage() {
  const dataString = localStorage.getItem('foldersDataV4');
  if (dataString) {
    const dataObj = JSON.parse(dataString);
    folders = dataObj.folders || [];
    trash = dataObj.trash || [];
  } else {
    folders = [];
    trash = [];
  }
}

// Función para cargar datos específicos del usuario desde Supabase
async function loadUserData(userId) {
  try {
    console.log('Cargando datos del usuario desde Supabase...');
    
    // Cargar carpetas desde Supabase
    const loadedFolders = await db.loadFolders();
    folders = loadedFolders.map(f => ({
      id: f.id,
      name: f.name,
      tasks: [],
      finished: [],
      isDefaultRewards: f.is_default_rewards,
      position: f.position
    }));
    
    // Cargar tareas para cada carpeta
    for (const folder of folders) {
      const loadedTasks = await db.loadTasks(folder.id);
      for (const task of loadedTasks) {
        const loadedSteps = await db.loadSteps(task.id);
        const taskObj = {
          id: task.id,
          name: task.name,
          totalTime: task.total_time,
          isCompleted: task.is_completed,
          scheduledTimestamp: task.scheduled_date ? new Date(task.scheduled_date).getTime() : null,
          steps: loadedSteps.map(s => ({
            id: s.id,
            description: s.description,
            time: s.time_minutes,
            isCompleted: s.is_completed,
            position: s.position
          }))
        };
        
        if (task.is_completed) {
          folder.finished.push(taskObj);
        } else {
          folder.tasks.push(taskObj);
        }
      }
    }
    
    // Cargar papelera
    const loadedTrash = await db.loadTrash();
    trash = loadedTrash.map(t => ({
      id: t.id,
      type: t.item_type,
      data: t.item_data,
      deletedAt: new Date(t.deleted_at).getTime()
    }));
    
    console.log('Datos cargados desde Supabase:', { folders, trash });
    
    ensureRewardsFolder();
    renderFolders();
  } catch (error) {
    console.error('Error al cargar datos del usuario:', error);
    // Fallback a datos vacíos
    folders = [];
    trash = [];
    ensureRewardsFolder();
    renderFolders();
  }
}

// Exponer loadUserData globalmente para que auth.js pueda llamarla
window.loadUserData = loadUserData;

// Función para limpiar datos cuando no hay usuario
function clearUserData() {
  folders = [];
  trash = [];
  ensureRewardsFolder();
  renderFolders();
  renderTasks();
}

// Exponer clearLocalData globalmente para que auth.js pueda llamarla
window.clearLocalData = clearUserData;

/************************************************************************
 * CHAT CON MCP SERVER
 ************************************************************************/
let chatHistory = [];

async function toggleChatModal() {
  const user = await getCurrentUser();
  const chatModal = document.getElementById('chatModal');
  
  // Solo permitir alternar el chat si el usuario está autenticado
  if (!user) {
    showSection(authSection);
    return;
  }
  
  // Usar clases para animaciones suaves
  chatModal.classList.toggle('active');
  
  // Enfocar el input cuando se abre
  if (chatModal.classList.contains('active')) {
    setTimeout(() => {
      const chatInput = document.getElementById('chatInput');
      if (chatInput) chatInput.focus();
    }, 100);
  }
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  const chatMessages = document.getElementById('chatMessages');
  const sendBtn = document.getElementById('sendChatBtn');
  
  // Mensaje del usuario
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-message user';
  userMsg.textContent = message;
  chatMessages.appendChild(userMsg);
  input.value = '';
  
  // Deshabilitar input mientras se procesa
  input.disabled = true;
  sendBtn.disabled = true;
  
  // Indicador de escritura
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'typing-indicator';
  typingIndicator.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(typingIndicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    chatHistory.push({ role: 'user', content: message });

    const appState = {
      folders: folders,
      trash: trash,
      currentFolderId: currentFolderId
    };

    const response = await fetch('/api/chat', { // Usar ruta relativa para el despliegue
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

    // Remover indicador de escritura
    typingIndicator.remove();
    
    // Mensaje de la IA
    const aiMsg = document.createElement('div');
    aiMsg.className = 'chat-message assistant';
    aiMsg.textContent = aiResponseContent;
    chatMessages.appendChild(aiMsg);

    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Rehabilitar input
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();

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
    
    // Remover indicador de escritura si existe
    if (typingIndicator && typingIndicator.parentNode) {
      typingIndicator.remove();
    }
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'chat-message assistant';
    errorMsg.textContent = 'Lo siento, hubo un error al procesar tu mensaje. Por favor, inténtalo de nuevo.';
    chatMessages.appendChild(errorMsg);
    
    // Rehabilitar input
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
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
          const timeInMinutes = params.time || params.duration || params.timeInMinutes || null;
          console.log(`Attempting to create task: ${params.taskName} in folder: ${params.folderName} with time: ${timeInMinutes} minutes`);
          createTask(folder.id, params.taskName, timeInMinutes);
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
          saveDataToLocalStorage();
          renderTasks();
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
        const foldersToDelete = folders.filter(f => f.name === params && !f.isDefaultRewards);
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
          if (item.type === 'task') return item.data.task.name === params;
          return false;
        });
        if (trashItemsToRestore.length > 0) {
          trashItemsToRestore.forEach(item => {
            console.log(`Restoring item ${item.data.name} from trash`);
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
          if (item.type === 'task') return item.data.task.name === params;
          return false;
        });
        if (trashItemsToDelete.length > 0) {
          trashItemsToDelete.forEach(item => {
            console.log(`Permanently deleting item ${item.data.name}`);
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
          taskToSchedule.scheduledTimestamp = new Date(dateTimeString).getTime();
          saveDataToLocalStorage();
          renderTasks();
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

          if (isFinishedTask) {
            sourceFolder.finished = sourceFolder.finished.filter(t => t.id !== taskToMove.id);
          } else {
            sourceFolder.tasks = sourceFolder.tasks.filter(t => t.id !== taskToMove.id);
          }

          targetFolder.tasks.push(taskToMove);

          saveDataToLocalStorage();
          renderTasks();
          renderFolders();
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

function emptyTrash() {
  trash = [];
  saveDataToLocalStorage();
  renderTrash();
}

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
  const closeChatBtn = document.getElementById('closeChatBtn');
  
  if (aiButton) {
    aiButton.addEventListener('click', toggleChatModal);
  }
  
  if (sendChatBtn) {
    sendChatBtn.addEventListener('click', sendMessage);
  }
  
  if (chatInput) {
    chatInput.addEventListener('keypress', function(e) {
      if(e.key === 'Enter') sendMessage();
    });
  }
  
  if (toggleChatHeader) {
    toggleChatHeader.addEventListener('click', toggleChatModal);
  }
  
  if (newChatBtn) {
    newChatBtn.addEventListener('click', newConversation);
  }
  
  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
      const chatModal = document.getElementById('chatModal');
      if (chatModal) chatModal.classList.remove('active');
    });
  }
}

/************************************************************************
 * UTILIDADES
 ************************************************************************/
function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

/*
 * Función para recalcular el tiempo asignado a cada paso
 * Se distribuye de forma equitativa: cada paso recibe (totalTime / número de pasos) segundos.
 */
function recalcStepTimes(task) {
  if (task.totalTime && task.steps.length > 0) {
    const allocated = Math.floor(task.totalTime / task.steps.length);
    task.stepTimes = [];
    for (let i = 0; i < task.steps.length; i++) {
      task.stepTimes.push(allocated);
    }
  }
}





// AGREGAR HANDLER PARA VISIBILITYCHANGE
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Guardar el momento en que la app se oculta
    lastHiddenTime = Date.now();
  } else {
    // Cuando se vuelve a ver la app, calcular el tiempo transcurrido en segundos
    const elapsedSec = Math.floor((Date.now() - lastHiddenTime) / 1000);
    // Corregido: ahora se permite que currentStepCountdown pueda ser negativo
    if (presentationOpen && currentPresentationTask && currentPresentationTask.totalTime) {
      currentStepCountdown = currentStepCountdown - elapsedSec;
      timerDisplay.textContent = formatTime(currentStepCountdown);
    }
    // (Opcional) Mostrar Notificación con el paso actual y tiempo restante
    if (Notification.permission === "granted") {
      const notificationOptions = {
        body: `Paso: "${presentationSteps[currentStepIndex]}"\nTiempo restante: ${formatTime(currentStepCountdown)}`
// icon: "icon.png" // Eliminado para evitar error 404
      };
      new Notification("Actualización de Temporizador", notificationOptions);
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }
});

// Función para reiniciar la presentación de pasos al finalizar la tarea
function resetPresentationSteps() {
    const stepsList = document.getElementById('presentationStepsList');
    if (stepsList) {
        // Elimina la clase que resalta los pasos completados (por ejemplo, 'completed')
        stepsList.querySelectorAll('li.completed').forEach(li => li.classList.remove('completed'));
        // Opcional: limpiar completamente la lista
        // stepsList.innerHTML = '';
    }
    // Reinicia la visualización del paso actual y el timer
    const presentationStep = document.getElementById('presentationStep');
    if (presentationStep) presentationStep.innerHTML = '';
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) timerDisplay.textContent = '00:00';
}

let presentationTimer = {
    startTime: 0,
    elapsedTime: 0,
    previousStepTime: 0,
    currentStepStartTime: 0
};

function handlePresentationNavigation(direction) {
    const currentStep = getCurrentStep();
    const previousStepTime = presentationTimer.previousStepTime;
    const currentTime = Date.now();
    const stepDuration = currentTime - presentationTimer.currentStepStartTime;

    if (direction === 'next') {
        presentationTimer.elapsedTime += stepDuration;
    } else if (direction === 'prev') {
        presentationTimer.elapsedTime -= stepDuration;
    }

    presentationTimer.currentStepStartTime = currentTime;
    updateTimerDisplay(presentationTimer.elapsedTime);

    // Actualizar el paso actual según la dirección
    if (direction === 'next' && currentStep < presentationSteps.length - 1) {
        setCurrentStep(currentStep + 1);
    } else if (direction === 'prev' && currentStep > 0) {
        setCurrentStep(currentStep - 1);
    }
}

function updateTimerDisplay(elapsedTime) {
    const minutes = Math.floor(Math.abs(elapsedTime) / 60000);
    const seconds = Math.floor((Math.abs(elapsedTime) % 60000) / 1000);
    const sign = elapsedTime < 0 ? '-' : '';
    
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.textContent = `${sign}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Eventos de navegación
document.addEventListener('keydown', (e) => {
    if (!isPresentationMode) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        handlePresentationNavigation('next');
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        handlePresentationNavigation('prev');
    }
});

// Función para solicitar el wake lock.
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

// Función para liberar el wake lock.
function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
    console.log('Wake Lock liberado manualmente');
  }
}

// Reiniciar el wake lock si la visibilidad de la página cambia.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wakeLock === null) {
    requestWakeLock();
  }
});
