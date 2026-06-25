// ==========================================================================
// ZENFOCUS PWA - LÓGICA PRINCIPAL (VANILLA JS)
// ==========================================================================

// --------------------------------------------------------------------------
// 1. GERENCIAMENTO DE ESTADO E INICIALIZAÇÃO
// --------------------------------------------------------------------------
const state = {
  pomodoro: {
    timerId: null,
    isPaused: true,
    currentMode: 'focus', // 'focus', 'short', 'long'
    timeRemaining: 1500, // 25 min em segundos
    totalDuration: 1500,
    sessionsCount: 1
  },
  habits: []
};

// Configurações dos Tempos (em segundos)
const TIMES = {
  focus: 1500,  // 25 min
  short: 300,   // 5 min
  long: 900     // 15 min
};

// Elementos DOM
const DOM = {
  // Navigation
  navPomodoro: document.getElementById('nav-pomodoro'),
  navHabits: document.getElementById('nav-habits'),
  pomodoroView: document.getElementById('pomodoro-view'),
  habitsView: document.getElementById('habits-view'),

  // Pomodoro
  timerDisplay: document.getElementById('timer-display'),
  timerStatusText: document.getElementById('timer-status-text'),
  timerProgress: document.getElementById('timer-progress'),
  btnModeFocus: document.getElementById('mode-focus'),
  btnModeShort: document.getElementById('mode-short'),
  btnModeLong: document.getElementById('mode-long'),
  btnTimerToggle: document.getElementById('timer-toggle'),
  btnTimerReset: document.getElementById('timer-reset'),
  btnTimerSkip: document.getElementById('timer-skip'),
  playIcon: document.getElementById('play-icon'),
  pauseIcon: document.getElementById('pause-icon'),
  sessionCountSpan: document.getElementById('session-count'),

  // Habits
  currentDateText: document.getElementById('current-date'),
  habitsCompletedText: document.getElementById('habits-completed'),
  habitsTotalText: document.getElementById('habits-total'),
  habitsProgressBar: document.getElementById('habits-progress-bar'),
  addHabitForm: document.getElementById('add-habit-form'),
  newHabitInput: document.getElementById('new-habit-input'),
  habitsList: document.getElementById('habits-list'),
  habitsEmptyState: document.getElementById('habits-empty-state'),

  // PWA
  pwaInstallBtn: document.getElementById('pwa-install-btn')
};

// --------------------------------------------------------------------------
// 2. SINTETIZADOR DE ÁUDIO OFFLINE (Web Audio API)
// --------------------------------------------------------------------------
function playSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'complete') {
      // Chime melodioso (Acorde harmônico C5 - E5 - G5)
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // Dó, Mi, Sol
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.1 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.8);
        
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.9);
      });
    } else if (type === 'click') {
      // Clique sutil ao pressionar botões
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(700, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {
    console.warn('Web Audio API não iniciada/suportada.', e);
  }
}

// --------------------------------------------------------------------------
// 3. LOGICA DO CRONÔMETRO POMODORO
// --------------------------------------------------------------------------
function updateTimerDisplay() {
  const minutes = Math.floor(state.pomodoro.timeRemaining / 60);
  const seconds = state.pomodoro.timeRemaining % 60;
  
  // Atualiza texto principal
  DOM.timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // Atualiza título da aba para o usuário acompanhar
  const statusEmoji = state.pomodoro.currentMode === 'focus' ? '🎯' : '☕';
  document.title = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${statusEmoji} ZenFocus`;

  // Calcula e desenha o progresso no SVG circular
  const dasharray = 276.46; // 2 * Math.PI * 44 (raio)
  const fraction = state.pomodoro.timeRemaining / state.pomodoro.totalDuration;
  const dashoffset = dasharray - (fraction * dasharray);
  DOM.timerProgress.style.strokeDashoffset = dashoffset;
}

function setTimerMode(mode) {
  playSound('click');
  
  // Para cronômetro se estiver rodando
  if (state.pomodoro.timerId) {
    clearInterval(state.pomodoro.timerId);
    state.pomodoro.timerId = null;
  }
  
  state.pomodoro.isPaused = true;
  state.pomodoro.currentMode = mode;
  state.pomodoro.totalDuration = TIMES[mode];
  state.pomodoro.timeRemaining = TIMES[mode];
  
  // UI Icones de Play
  DOM.playIcon.classList.remove('hidden');
  DOM.pauseIcon.classList.add('hidden');
  DOM.btnTimerToggle.className = 'w-20 h-20 rounded-full flex items-center justify-center bg-white text-slate-950 hover:bg-slate-100 hover:scale-105 active:scale-95 shadow-xl shadow-white/10 neon-glow-violet transition-all duration-300';
  
  // Botões de Modo
  const activeClass = 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md';
  const inactiveClass = 'text-slate-400 hover:text-slate-200';
  
  DOM.btnModeFocus.className = `flex-1 py-2 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${mode === 'focus' ? activeClass : inactiveClass}`;
  DOM.btnModeShort.className = `flex-1 py-2 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${mode === 'short' ? activeClass : inactiveClass}`;
  DOM.btnModeLong.className = `flex-1 py-2 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${mode === 'long' ? activeClass : inactiveClass}`;
  
  // Cores do progresso e mensagens
  if (mode === 'focus') {
    DOM.timerStatusText.textContent = 'Hora de Focar';
    DOM.timerStatusText.className = 'text-xs font-bold tracking-widest text-violet-400 uppercase mt-2';
    DOM.timerProgress.className.baseVal = 'timer-circle stroke-violet-500';
  } else {
    DOM.timerStatusText.textContent = 'Hora de Descansar';
    DOM.timerStatusText.className = 'text-xs font-bold tracking-widest text-emerald-400 uppercase mt-2';
    DOM.timerProgress.className.baseVal = 'timer-circle stroke-emerald-500';
    DOM.btnTimerToggle.className = 'w-20 h-20 rounded-full flex items-center justify-center bg-white text-slate-950 hover:bg-slate-100 hover:scale-105 active:scale-95 shadow-xl shadow-white/10 neon-glow-emerald transition-all duration-300';
  }
  
  updateTimerDisplay();
}

function toggleTimer() {
  playSound('click');
  
  if (state.pomodoro.isPaused) {
    // Inicia Cronômetro
    state.pomodoro.isPaused = false;
    DOM.playIcon.classList.add('hidden');
    DOM.pauseIcon.classList.remove('hidden');
    
    // Animação de pulso no status do timer
    DOM.timerDisplay.classList.add('animate-pulse');
    
    state.pomodoro.timerId = setInterval(() => {
      state.pomodoro.timeRemaining--;
      updateTimerDisplay();
      
      if (state.pomodoro.timeRemaining <= 0) {
        clearInterval(state.pomodoro.timerId);
        state.pomodoro.timerId = null;
        state.pomodoro.isPaused = true;
        
        playSound('complete');
        
        // Transição automática de modo
        if (state.pomodoro.currentMode === 'focus') {
          if (state.pomodoro.sessionsCount % 4 === 0) {
            setTimerMode('long');
          } else {
            setTimerMode('short');
          }
          state.pomodoro.sessionsCount++;
          DOM.sessionCountSpan.textContent = `#${state.pomodoro.sessionsCount}`;
        } else {
          setTimerMode('focus');
        }
      }
    }, 1000);
  } else {
    // Pausa Cronômetro
    state.pomodoro.isPaused = true;
    clearInterval(state.pomodoro.timerId);
    state.pomodoro.timerId = null;
    DOM.playIcon.classList.remove('hidden');
    DOM.pauseIcon.classList.add('hidden');
    DOM.timerDisplay.classList.remove('animate-pulse');
  }
}

function resetTimer() {
  playSound('click');
  setTimerMode(state.pomodoro.currentMode);
  DOM.timerDisplay.classList.remove('animate-pulse');
}

function skipTimer() {
  playSound('click');
  if (state.pomodoro.currentMode === 'focus') {
    state.pomodoro.sessionsCount++;
    DOM.sessionCountSpan.textContent = `#${state.pomodoro.sessionsCount}`;
    setTimerMode('short');
  } else {
    setTimerMode('focus');
  }
}

// --------------------------------------------------------------------------
// 4. LÓGICA DO RASTREADOR DE HÁBITOS
// --------------------------------------------------------------------------
function formatDate() {
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  const dateStr = new Date().toLocaleDateString('pt-BR', options);
  DOM.currentDateText.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}

function loadHabits() {
  const localData = localStorage.getItem('zenfocus_habits');
  const lastVisit = localStorage.getItem('zenfocus_last_visit');
  
  const todayStr = new Date().toDateString();
  
  if (localData) {
    state.habits = JSON.parse(localData);
  } else {
    // Hábitos padrão iniciais
    state.habits = [
      { id: '1', text: 'Beber 2L de água', completed: false },
      { id: '2', text: 'Ler por 15 minutos', completed: false },
      { id: '3', text: 'Alongamento matinal', completed: false }
    ];
    saveHabits();
  }

  // Lógica Premium: Reseta os status de conclusão se for um novo dia
  if (lastVisit && lastVisit !== todayStr) {
    state.habits.forEach(h => h.completed = false);
    saveHabits();
  }
  
  localStorage.setItem('zenfocus_last_visit', todayStr);
  renderHabits();
}

function saveHabits() {
  localStorage.setItem('zenfocus_habits', JSON.stringify(state.habits));
}

function renderHabits() {
  DOM.habitsList.innerHTML = '';
  
  if (state.habits.length === 0) {
    DOM.habitsEmptyState.classList.remove('hidden');
    DOM.habitsTotalText.textContent = '0';
    DOM.habitsCompletedText.textContent = '0';
    DOM.habitsProgressBar.style.width = '0%';
    return;
  }
  
  DOM.habitsEmptyState.classList.add('hidden');
  
  let completedCount = 0;
  
  state.habits.forEach(habit => {
    if (habit.completed) completedCount++;
    
    const li = document.createElement('li');
    li.className = `glass-card p-4 rounded-xl flex items-center justify-between transition-all duration-300 ${habit.completed ? 'bg-violet-950/20 border-violet-500/20 opacity-75' : ''}`;
    
    li.innerHTML = `
      <div class="flex items-center space-x-3.5 flex-1 cursor-pointer select-none">
        <div class="habit-check flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all ${habit.completed ? 'bg-violet-500 border-violet-500 text-white' : 'border-white/20 hover:border-violet-500/50'}" data-id="${habit.id}">
          ${habit.completed ? `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5" d="M5 13l4 4L19 7" />
            </svg>
          ` : ''}
        </div>
        <span class="text-sm font-medium transition-all ${habit.completed ? 'line-through text-slate-500' : 'text-slate-200'}">${habit.text}</span>
      </div>
      <button class="habit-delete text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-all" data-id="${habit.id}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    `;
    
    // Adiciona evento de toggle no texto/checkbox
    li.querySelector('.flex-1').addEventListener('click', () => toggleHabit(habit.id));
    
    // Adiciona evento de deletar
    li.querySelector('.habit-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteHabit(habit.id);
    });
    
    DOM.habitsList.appendChild(li);
  });
  
  // Atualiza Estatísticas e Barra de Progresso
  const totalCount = state.habits.length;
  DOM.habitsTotalText.textContent = totalCount;
  DOM.habitsCompletedText.textContent = completedCount;
  
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  DOM.habitsProgressBar.style.width = `${percentage}%`;
}

function addHabit(text) {
  playSound('click');
  const newHabit = {
    id: Date.now().toString(),
    text: text.trim(),
    completed: false
  };
  state.habits.push(newHabit);
  saveHabits();
  renderHabits();
}

function toggleHabit(id) {
  const habit = state.habits.find(h => h.id === id);
  if (habit) {
    habit.completed = !habit.completed;
    playSound('click');
    saveHabits();
    renderHabits();
  }
}

function deleteHabit(id) {
  playSound('click');
  state.habits = state.habits.filter(h => h.id !== id);
  saveHabits();
  renderHabits();
}

// --------------------------------------------------------------------------
// 5. NAVEGAÇÃO DE PÁGINAS (Bottom Navigation)
// --------------------------------------------------------------------------
function switchTab(tab) {
  playSound('click');
  
  const activeBtnClass = 'flex flex-col items-center space-y-1 py-1 px-5 rounded-2xl bg-white/[0.04] text-violet-400 transition-all duration-300';
  const inactiveBtnClass = 'flex flex-col items-center space-y-1 py-1 px-5 rounded-2xl text-slate-400 hover:text-slate-200 transition-all duration-300';
  
  if (tab === 'pomodoro') {
    DOM.pomodoroView.classList.remove('hidden');
    DOM.habitsView.classList.add('hidden');
    DOM.navPomodoro.className = activeBtnClass;
    DOM.navHabits.className = inactiveBtnClass;
  } else {
    DOM.pomodoroView.classList.add('hidden');
    DOM.habitsView.classList.remove('hidden');
    DOM.navPomodoro.className = inactiveBtnClass;
    DOM.navHabits.className = activeBtnClass;
  }
}

// --------------------------------------------------------------------------
// 6. LÓGICA DE INSTALAÇÃO DO PWA (Banner customizado)
// --------------------------------------------------------------------------
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Impede que o mini-infobar do Chrome apareça no mobile
  e.preventDefault();
  // Guarda o evento para ser disparado depois
  deferredPrompt = e;
  // Exibe o botão de instalação elegante no cabeçalho
  DOM.pwaInstallBtn.classList.remove('hidden');
});

DOM.pwaInstallBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  playSound('click');
  // Abre o prompt de instalação nativo
  deferredPrompt.prompt();
  // Espera a escolha do usuário
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`Instalação do PWA: escolha do usuário = ${outcome}`);
  // Limpa o prompt para não ser usado de novo
  deferredPrompt = null;
  // Oculta o botão de instalação
  DOM.pwaInstallBtn.classList.add('hidden');
});

window.addEventListener('appinstalled', (evt) => {
  console.log('ZenFocus PWA instalado com sucesso!');
  DOM.pwaInstallBtn.classList.add('hidden');
});

// --------------------------------------------------------------------------
// 7. EVENT LISTENERS E STARTUP
// --------------------------------------------------------------------------
function setupEventListeners() {
  // Navegação
  DOM.navPomodoro.addEventListener('click', () => switchTab('pomodoro'));
  DOM.navHabits.addEventListener('click', () => switchTab('habits'));
  
  // Pomodoro
  DOM.btnModeFocus.addEventListener('click', () => setTimerMode('focus'));
  DOM.btnModeShort.addEventListener('click', () => setTimerMode('short'));
  DOM.btnModeLong.addEventListener('click', () => setTimerMode('long'));
  DOM.btnTimerToggle.addEventListener('click', toggleTimer);
  DOM.btnTimerReset.addEventListener('click', resetTimer);
  DOM.btnTimerSkip.addEventListener('click', skipTimer);
  
  // Hábitos
  DOM.addHabitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = DOM.newHabitInput.value.trim();
    if (text) {
      addHabit(text);
      DOM.newHabitInput.value = '';
    }
  });
}

// Inicializa a aplicação
function init() {
  formatDate();
  setupEventListeners();
  setTimerMode('focus');
  loadHabits();
}

window.addEventListener('DOMContentLoaded', init);
