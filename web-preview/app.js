/**
 * Cat Line — Web Preview Emulator (Fidelidade Pixel Art 8-Bit)
 * Inclui:
 * - Provedor centralizado de relógio determinístico (Clock)
 * - Letras ampliadas para leitura confortável
 * - Gatinha caminhando pelo ambiente com animação de caminhar em 4 quadros (patinhas alternadas + direção)
 * - Novelo colorido na mão/patinha da gatinha com ela brincando
 * - Novelo que vai se enrolando à medida que o tempo da meta esgota
 * - Cada meta com um novelinho de cor diferente que muda na mão da gatinha ao ser selecionado
 */

// Provedor centralizado de relógio determinístico (clock.js)
const _clockImpl = (typeof CatLineClock !== 'undefined')
  ? CatLineClock
  : ((typeof window !== 'undefined' && window.CatLineClock)
      ? window.CatLineClock
      : ((typeof global !== 'undefined' && global.CatLineClock)
          ? global.CatLineClock
          : (typeof require === 'function' ? (function() {
              try { return require('./clock.js'); } catch (e) {
                try { return require('./web-preview/clock.js'); } catch (e2) {
                  try { return require('../web-preview/clock.js'); } catch (e3) { return null; }
                }
              }
            })() : null)));

const Clock = {
  now: () => (_clockImpl ? _clockImpl.now() : 1792984585000),
  newDate: (v) => (_clockImpl ? _clockImpl.newDate(v) : null),
  todayStr: () => (_clockImpl ? _clockImpl.todayStr() : '2026-10-25'),
  isoString: () => (_clockImpl ? _clockImpl.isoString() : '2026-10-25T12:00:00.000Z'),
  formatTime: (ms) => (_clockImpl ? _clockImpl.formatTime(ms) : '12:00')
};

// Configuração de release e depuração (Fase 6)
const IS_RELEASE = (typeof window !== 'undefined' && window.IS_RELEASE !== undefined) ? window.IS_RELEASE : true;

const PALETTE = {
  ink: '#181425',
  furWhite: '#FFFFFF',
  furCreamShadow: '#EAE1D3',
  grayDark: '#6B6967',
  grayMid: '#9B9793',
  orange: '#DF8F49',
  orangeShadow: '#B8652B',
  yarnPink: '#F0949E',
  yarnPinkDark: '#AD5E65',
  goldenYarn: '#F4C852',
  wallCream: '#F7E8D0',
  woodFloor: '#D4A373',
  leafGreen: '#63AB3F',
  windowBlue: '#4B80CA',
  cozyPurple: '#5A4E7C',
  alertRed: '#D95763'
};

// Catálogo de cores de novelo para cada meta
const YARN_COLORS = [
  { id: 'pink', name: 'Rosa Coral', main: '#F0949E', shadow: '#AD5E65', highlight: '#FFE0E5' },
  { id: 'gold', name: 'Dourado Solar', main: '#F4C852', shadow: '#B8860B', highlight: '#FFF3B0' },
  { id: 'blue', name: 'Azul Céu', main: '#4B80CA', shadow: '#2A4D7E', highlight: '#A8CAFF' },
  { id: 'green', name: 'Verde Folha', main: '#63AB3F', shadow: '#3B6E22', highlight: '#B6F09C' },
  { id: 'purple', name: 'Roxo Místico', main: '#8A6BBE', shadow: '#5A4E7C', highlight: '#D8C7FF' },
  { id: 'orange', name: 'Laranja Calico', main: '#DF8F49', shadow: '#B8652B', highlight: '#FFD1A6' },
  { id: 'red', name: 'Vermelho Rubi', main: '#D95763', shadow: '#8E2A34', highlight: '#FFB3BA' }
];

// Catálogo de Redes Sociais e Apps populares para travamento como recompensa
const SOCIAL_MEDIA_PRESETS = [
  { id: 'instagram', name: 'Instagram', pkg: 'com.instagram.android', icon: '📸', url: 'https://www.instagram.com', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'tiktok', name: 'TikTok', pkg: 'com.zhiliaoapp.musically', icon: '🎵', url: 'https://www.tiktok.com', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'youtube', name: 'YouTube', pkg: 'com.google.android.youtube', icon: '🔴', url: 'https://www.youtube.com', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'twitter', name: 'Twitter / X', pkg: 'com.twitter.android', icon: '🩵', url: 'https://x.com', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'facebook', name: 'Facebook', pkg: 'com.facebook.katana', icon: '📘', url: 'https://www.facebook.com', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'reddit', name: 'Reddit', pkg: 'com.reddit.frontpage', icon: '🤖', url: 'https://www.reddit.com', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'pinterest', name: 'Pinterest', pkg: 'com.pinterest', icon: '📌', url: 'https://www.pinterest.com', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'threads', name: 'Threads', pkg: 'com.instagram.barcelona', icon: '🧵', url: 'https://www.threads.net', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'netflix', name: 'Netflix', pkg: 'com.netflix.mediaclient', icon: '🎬', url: 'https://www.netflix.com', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'discord', name: 'Discord', pkg: 'com.discord', icon: '💬', url: 'https://discord.com/app', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'twitch', name: 'Twitch', pkg: 'tv.twitch.android.app', icon: '📺', url: 'https://www.twitch.tv', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' },
  { id: 'kwai', name: 'Kwai', pkg: 'com.kwai.video', icon: '🎥', url: 'https://www.kwai.com', defaultRigor: 3, windowStart: '00:00', windowEnd: '23:59' }
];

function resolveSocialAppMeta(rawName, rawPkg = '') {
  const cleanName = (rawName || '').trim();
  const low = cleanName.toLowerCase();
  const byName = SOCIAL_MEDIA_PRESETS.find(
    p => p.name.toLowerCase() === low || p.id === low || low.includes(p.id)
  );
  if (byName) {
    return {
      name: byName.name,
      pkg: byName.pkg,
      icon: byName.icon,
      url: byName.url
    };
  }
  const extraDict = [
    { match: 'spotify', name: 'Spotify', pkg: 'com.spotify.music', icon: '🎧', url: 'https://open.spotify.com' },
    { match: 'roblox', name: 'Roblox', pkg: 'com.roblox.client', icon: '🎮', url: 'https://www.roblox.com' },
    { match: 'telegram', name: 'Telegram', pkg: 'org.telegram.messenger', icon: '✈️', url: 'https://web.telegram.org' },
    { match: 'shopee', name: 'Shopee', pkg: 'com.shopee.br', icon: '🛍️', url: 'https://shopee.com.br' },
    { match: 'shein', name: 'Shein', pkg: 'com.zzkko', icon: '👗', url: 'https://br.shein.com' },
    { match: 'prime', name: 'Prime Video', pkg: 'com.amazon.avod.thirdpartyclient', icon: '🍿', url: 'https://www.primevideo.com' },
    { match: 'disney', name: 'Disney+', pkg: 'com.disney.disneyplus', icon: '🏰', url: 'https://www.disneyplus.com' },
    { match: 'jogo', name: cleanName || 'Jogos', pkg: 'app.custom.jogos', icon: '🎮', url: '' }
  ];
  const ext = extraDict.find(x => low.includes(x.match));
  if (ext) return ext;

  const slug = low.replace(/[^a-z0-9]/g, '') || ('app' + Clock.now());
  const customPkg = (rawPkg && rawPkg.trim() && rawPkg.trim() !== 'com.instagram.android')
    ? rawPkg.trim()
    : `app.custom.${slug}`;
  return {
    name: cleanName || 'App Trancado',
    pkg: customPkg,
    icon: '📱',
    url: ''
  };
}

// Níveis de Rigor (0 a 4) conforme o briefing do Cat Line
const RIGOR_LEVELS = [
  { level: 0, code: 'OBSERVAR', name: '0 Observar', desc: 'Apenas mede o tempo de tela sem interromper' },
  { level: 1, code: 'AVISO', name: '1 Aviso', desc: 'A gatinha avisa com carinho para lembrar o foco' },
  { level: 2, code: 'FRICCAO', name: '2 Fricção 15s', desc: 'Pausa reflexiva de 15 segundos antes de permitir abrir' },
  { level: 3, code: 'CONDICIONAL', name: '3 Condicional', desc: 'Travado até você cumprir os compromissos de hoje' },
  { level: 4, code: 'FIRME', name: '4 Firme', desc: 'Travado durante todo o horário definido' }
];

// Sintetizador Web Audio API Chiptune 8-Bit
class ChiptuneSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSquareSweep(startHz, endHz, durationMs, volume = 0.25) {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      const now = this.ctx.currentTime;
      const dur = durationMs / 1000;

      osc.frequency.setValueAtTime(startHz, now);
      osc.frequency.linearRampToValueAtTime(endHz, now + dur);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + dur);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  playMeowGreeting() {
    this.playSquareSweep(520, 780, 180, 0.3);
  }

  playMeowCelebrate() {
    this.playSquareSweep(580, 980, 240, 0.35);
  }

  playSuccessFanfare() {
    this.playSquareSweep(580, 980, 240, 0.35);
  }

  playPurr() {
    this.playSquareSweep(95, 115, 320, 0.2);
  }

  startFocusPurrAmbient() {
    if (this.purrInterval) return;
    this.playPurr();
    this.purrInterval = setInterval(() => {
      if (!this.muted) {
        this.playPurr();
      }
    }, 3200);
  }

  stopFocusPurrAmbient() {
    if (this.purrInterval) {
      clearInterval(this.purrInterval);
      this.purrInterval = null;
    }
  }

  playBlip() {
    this.playSquareSweep(680, 720, 30, 0.12);
  }

  playStep() {
    this.playSquareSweep(220, 180, 25, 0.06);
  }
}

const audio = new ChiptuneSynth();

// Estações do quarto por onde a gatinha caminha (dentro da grade virtual 180x120)
const ROOM_WAYPOINTS = [
  { name: 'Tapete Central', x: 90, y: 96 },
  { name: 'Estante de Estudos', x: 46, y: 76 },
  { name: 'Escrivaninha', x: 132, y: 78 },
  { name: 'Tigelinha', x: 126, y: 92 },
  { name: 'Caminha Rosa', x: 122, y: 106 },
  { name: 'Novelo do Tempo', x: 54, y: 102 }
];

// Classificador Inteligente da Atividade da Gatinha (Espelho da Rotina da Cliente)
function detectTaskCategory(task) {
  if (!task) return 'LIVRE_NOVELO';
  if (task.category) return task.category;
  const t = (task.title || '').toLowerCase();
  if (t.includes('estud') || t.includes('ler') || t.includes('livro') || t.includes('aula') || t.includes('curso') || t.includes('leitura') || t.includes('faculdad') || t.includes('prova') || t.includes('kotlin')) {
    return 'ESTUDO';
  }
  if (t.includes('trein') || t.includes('calistenia') || t.includes('academia') || t.includes('corr') || t.includes('caminhad') || t.includes('exercic') || t.includes('along') || t.includes('yoga') || t.includes('funcional')) {
    return 'TREINO';
  }
  if (t.includes('trabalh') || t.includes('reuni') || t.includes('projeto') || t.includes('email') || t.includes('relat') || t.includes('cod') || t.includes('client') || t.includes('dev') || t.includes('job')) {
    return 'TRABALHO';
  }
  if (t.includes('organiz') || t.includes('limp') || t.includes('lav') || t.includes('cas') || t.includes('escrivaninha') || t.includes('quarto') || t.includes('cozinh') || t.includes('arrum') || t.includes('louç')) {
    return 'CASA';
  }
  if (t.includes('água') || t.includes('agua') || t.includes('beb') || t.includes('almoç') || t.includes('jant') || t.includes('lanche') || t.includes('café') || t.includes('refeiç') || t.includes('comer') || t.includes('comida')) {
    return 'COMENDO_BEBENDO';
  }
  if (t.includes('dorm') || t.includes('descans') || t.includes('sono') || t.includes('soneca') || t.includes('pausa') || t.includes('medit')) {
    return 'DESCANSO_SONO';
  }
  return 'TRABALHO';
}

// Motor de Calibração e Análise de Duração Real vs. Estimada (Fase 2)
const EstimationEngine = {
  MIN_SAMPLES: 5,

  addSample(history, { category, taskTitle, estimatedDuration, actualDuration, completedAt }) {
    if (!history) history = [];
    const cat = (category || 'TRABALHO').toUpperCase();
    const est = Math.max(1, parseInt(estimatedDuration || '30', 10));
    const act = Math.max(1, parseInt(actualDuration || est, 10));
    const sample = {
      id: 'dur-' + Clock.now() + '-' + Math.floor(Math.random() * 1000),
      category: cat,
      taskTitle: taskTitle || '',
      estimatedDuration: est,
      actualDuration: act,
      completedAt: completedAt || Clock.isoString()
    };
    return [...history, sample];
  },

  analyzeCategory(history, category) {
    if (!history || !Array.isArray(history)) return null;
    const cat = category.toUpperCase();
    const samples = history.filter(s => s.category === cat && s.actualDuration > 0 && s.estimatedDuration > 0);

    // REGRA ESTRITA: Nenhuma sugestão com menos de 5 amostras concluídas
    if (samples.length < this.MIN_SAMPLES) {
      return {
        hasEnoughSamples: false,
        sampleCount: samples.length,
        requiredSamples: this.MIN_SAMPLES,
        category: cat,
        suggestion: null
      };
    }

    const actuals = samples.map(s => s.actualDuration).sort((a, b) => a - b);
    const estimates = samples.map(s => s.estimatedDuration);

    const mid = Math.floor(actuals.length / 2);
    const medianActual = actuals.length % 2 !== 0 ? actuals[mid] : Math.round((actuals[mid - 1] + actuals[mid]) / 2);
    const avgEstimate = Math.round(estimates.reduce((a, b) => a + b, 0) / estimates.length);
    const diff = Math.abs(medianActual - avgEstimate);

    let suggestion = null;
    if (diff >= 10 || diff / avgEstimate >= 0.25) {
      const catFriendlyNames = {
        'ESTUDO': 'Estudos',
        'TREINO': 'Treinos',
        'TRABALHO': 'Trabalho',
        'CASA': 'Organização e Casa',
        'COMENDO_BEBENDO': 'Refeições',
        'DESCANSO_SONO': 'Descanso'
      };
      const catName = catFriendlyNames[cat] || cat;
      const text = `Mamãe, você costuma levar cerca de ${medianActual} minutos em ${catName}, mas costuma planejar ${avgEstimate} minutos. Que tal calibrar os próximos compromissos para ${medianActual} minutos?`;

      suggestion = {
        category: cat,
        catFriendlyName: catName,
        currentEstimate: avgEstimate,
        suggestedEstimate: medianActual,
        sampleCount: samples.length,
        text
      };
    }

    return {
      hasEnoughSamples: true,
      sampleCount: samples.length,
      requiredSamples: this.MIN_SAMPLES,
      category: cat,
      medianActual,
      avgEstimate,
      suggestion
    };
  },

  findBestSuggestion(history, { calibrated = {}, dismissed = {} } = {}) {
    if (!history || !Array.isArray(history)) return null;
    const categories = ['ESTUDO', 'TREINO', 'TRABALHO', 'CASA', 'COMENDO_BEBENDO', 'DESCANSO_SONO'];
    for (const cat of categories) {
      const res = this.analyzeCategory(history, cat);
      if (res && res.suggestion) {
        if (calibrated[cat] === res.suggestion.suggestedEstimate) continue;
        if (dismissed[cat] === res.suggestion.suggestedEstimate) continue;
        return res.suggestion;
      }
    }
    return null;
  },

  applyCalibration(occurrences, category, newDuration) {
    if (!occurrences || !Array.isArray(occurrences)) return occurrences;
    const cat = category.toUpperCase();
    return occurrences.map(o => {
      if (o.state === 'PENDENTE' && detectTaskCategory(o) === cat) {
        return {
          ...o,
          estimatedDuration: newDuration
        };
      }
      return o;
    });
  }
};

if (typeof window !== 'undefined') {
  window.EstimationEngine = EstimationEngine;
}

// Motor de Replanejamento Inteligente e Gestão de Carga (Fase 3)
const replanEngine = {
  DEFAULT_CAPACITY_MIN: 420, // 7 horas de compromissos agendados por dia

  getDailyCapacity(briefing) {
    if (briefing && briefing.dailyCapacityMinutes && briefing.dailyCapacityMinutes > 0) {
      return briefing.dailyCapacityMinutes;
    }
    return this.DEFAULT_CAPACITY_MIN;
  },

  calculateDailyWorkload(occurrences, dayKey) {
    if (!occurrences || !Array.isArray(occurrences)) {
      return { totalMinutes: 0, pendingMinutes: 0, doneMinutes: 0, taskCount: 0, pendingTaskCount: 0 };
    }
    const day = dayKey || (typeof Clock !== 'undefined' ? Clock.todayStr() : '2026-10-25');
    const dayTasks = occurrences.filter(o => !o.date || o.date === day);

    let totalMinutes = 0;
    let pendingMinutes = 0;
    let doneMinutes = 0;
    let pendingTaskCount = 0;

    for (const task of dayTasks) {
      const dur = task.estimatedDuration || (task.effort === 'G' ? 60 : (task.effort === 'M' ? 30 : 15));
      totalMinutes += dur;
      if (task.state === 'FEITO') {
        doneMinutes += dur;
      } else {
        pendingMinutes += dur;
        pendingTaskCount++;
      }
    }

    return {
      dayKey: day,
      totalMinutes,
      pendingMinutes,
      doneMinutes,
      taskCount: dayTasks.length,
      pendingTaskCount
    };
  },

  checkOverload(occurrences, briefing, dayKey) {
    const workload = this.calculateDailyWorkload(occurrences, dayKey);
    const capacityMinutes = this.getDailyCapacity(briefing);
    const isOverloaded = workload.totalMinutes > capacityMinutes;
    const overloadMinutes = Math.max(0, workload.totalMinutes - capacityMinutes);
    const loadPercentage = Math.round((workload.totalMinutes / capacityMinutes) * 100);

    let warning = null;
    if (isOverloaded) {
      warning = `Mamãe, seu dia está com ${workload.totalMinutes} minutos agendados para uma capacidade recomendada de ${capacityMinutes} minutos. Que tal redistribuirmos o excesso com calma para manter nosso novelo leve?`;
    }

    return {
      isOverloaded,
      totalMinutes: workload.totalMinutes,
      pendingMinutes: workload.pendingMinutes,
      doneMinutes: workload.doneMinutes,
      capacityMinutes,
      overloadMinutes,
      loadPercentage,
      warning
    };
  },

  findDelayedTasks(occurrences, dayKey, currentTimeStr) {
    if (!occurrences || !Array.isArray(occurrences)) return [];
    const day = dayKey || (typeof Clock !== 'undefined' ? Clock.todayStr() : '2026-10-25');
    const nowTime = currentTimeStr || (typeof Clock !== 'undefined' ? Clock.formatTime() : '12:00');

    return occurrences.filter(o => {
      if (o.state !== 'PENDENTE') return false;
      const taskDay = o.date || day;
      if (taskDay < day) return true;
      if (taskDay === day && o.time && o.time < nowTime) return true;
      return false;
    });
  },

  getNextDay(dateStr) {
    if (typeof Clock !== 'undefined') {
      const d = Clock.newDate(dateStr + 'T12:00:00Z');
      d.setDate(d.getDate() + 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = Clock.newDate(dateStr + 'T12:00:00Z');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  },

  suggestReplan(occurrences, briefing, dayKey, currentTimeStr) {
    const day = dayKey || (typeof Clock !== 'undefined' ? Clock.todayStr() : '2026-10-25');
    const overload = this.checkOverload(occurrences, briefing, day);
    const delayed = this.findDelayedTasks(occurrences, day, currentTimeStr);
    const nextDay = this.getNextDay(day);

    if (!overload.isOverloaded && delayed.length === 0) {
      return null;
    }

    const tasksToMove = [];
    const candidates = delayed.length > 0
      ? delayed
      : occurrences.filter(o => o.state === 'PENDENTE' && (!o.date || o.date === day));

    let minutesSelected = 0;
    const targetToFree = overload.isOverloaded ? overload.overloadMinutes : 60;

    for (const t of candidates) {
      const dur = t.estimatedDuration || (t.effort === 'G' ? 60 : (t.effort === 'M' ? 30 : 15));
      tasksToMove.push({
        taskId: t.id,
        taskTitle: t.title,
        currentDate: t.date || day,
        suggestedDate: nextDay,
        suggestedTime: t.time || '10:00',
        duration: dur
      });
      minutesSelected += dur;
      if (minutesSelected >= targetToFree) break;
    }

    if (tasksToMove.length === 0) return null;

    let text = '';
    if (overload.isOverloaded) {
      text = `Mamãe, hoje temos ${overload.totalMinutes} minutos agendados, acima da meta acolhedora de ${overload.capacityMinutes} minutos. Para proteger sua energia, podemos mover ${tasksToMove.length} ${tasksToMove.length === 1 ? 'compromisso' : 'compromissos'} para amanhã?`;
    } else {
      text = `Mamãe, tudo bem não ter concluído tudo hoje! Nosso novelo continua firme. Posso adiar ${tasksToMove.length} ${tasksToMove.length === 1 ? 'tarefa pendente' : 'tarefas pendentes'} para amanhã para você ter um descanso tranquilo?`;
    }

    return {
      id: 'replan-' + Clock.now(),
      reason: overload.isOverloaded ? 'SOBRECARGA' : 'ATRASO',
      text,
      targetDate: nextDay,
      tasksToMove,
      freedMinutes: minutesSelected
    };
  },

  applyReplan(occurrences, tasksToMove) {
    if (!occurrences || !Array.isArray(occurrences)) return [];
    if (!tasksToMove || !Array.isArray(tasksToMove) || tasksToMove.length === 0) return occurrences;

    const moveMap = new Map();
    for (const m of tasksToMove) {
      moveMap.set(m.taskId, m);
    }

    return occurrences.map(o => {
      const move = moveMap.get(o.id);
      if (move && o.state === 'PENDENTE') {
        return {
          ...o,
          date: move.suggestedDate,
          time: move.suggestedTime || o.time,
          delayMin: 0
        };
      }
      return o;
    });
  }
};

if (typeof window !== 'undefined') {
  window.replanEngine = replanEngine;
}

// Motor de Insights Acionáveis e Correlações Saudáveis (Fase 4)
const insightsEngine = {
  MIN_DAYS: 7,

  addDailyRecord(history, { dayKey, screenTimeMinutes, socialApp, punctualityPct, goalsCompleted, totalGoals }) {
    if (!history || !Array.isArray(history)) history = [];
    const day = dayKey || (typeof Clock !== 'undefined' ? Clock.todayStr() : '2026-10-25');
    const existingIdx = history.findIndex(h => h.dayKey === day);
    const record = {
      dayKey: day,
      screenTimeMinutes: Math.max(0, parseInt(screenTimeMinutes || 0, 10)),
      socialApp: socialApp || 'redes sociais',
      punctualityPct: Math.max(0, Math.min(100, parseInt(punctualityPct || 0, 10))),
      goalsCompleted: Math.max(0, parseInt(goalsCompleted || 0, 10)),
      totalGoals: Math.max(0, parseInt(totalGoals || 0, 10))
    };
    if (existingIdx >= 0) {
      const copy = [...history];
      copy[existingIdx] = record;
      return copy;
    }
    return [...history, record];
  },

  analyzeCorrelation(history) {
    if (!history || !Array.isArray(history)) {
      return {
        hasEnoughData: false,
        dayCount: 0,
        requiredDays: this.MIN_DAYS,
        insight: null
      };
    }

    // REGRA ESTRITA: Exigir mínimo de 7 dias de dados antes de apresentar qualquer correlação
    if (history.length < this.MIN_DAYS) {
      return {
        hasEnoughData: false,
        dayCount: history.length,
        requiredDays: this.MIN_DAYS,
        insight: null
      };
    }

    const sorted = [...history].sort((a, b) => a.screenTimeMinutes - b.screenTimeMinutes);
    const mid = Math.floor(sorted.length / 2);
    const lowScreenDays = sorted.slice(0, mid);
    const highScreenDays = sorted.slice(mid);

    const avgPunctLow = Math.round(lowScreenDays.reduce((acc, d) => acc + d.punctualityPct, 0) / lowScreenDays.length);
    const avgPunctHigh = Math.round(highScreenDays.reduce((acc, d) => acc + d.punctualityPct, 0) / highScreenDays.length);
    const diffPct = avgPunctLow - avgPunctHigh;

    const appCounts = {};
    for (const d of history) {
      if (d.socialApp) {
        appCounts[d.socialApp] = (appCounts[d.socialApp] || 0) + 1;
      }
    }
    let topApp = 'redes sociais';
    let maxCount = 0;
    for (const [app, count] of Object.entries(appCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topApp = app;
      }
    }

    const appName = topApp === 'redes sociais' ? 'redes sociais' : topApp;
    const prep = appName === 'redes sociais' ? 'nas' : 'no';

    // LINGUAGEM DE COINCIDÊNCIA (NUNCA DE CAUSA, ZERO JULGAMENTO)
    let insightText = '';
    if (diffPct >= 5) {
      insightText = `Em dias com menos tempo ${prep} ${appName}, nosso fio tendeu a ficar mais pontual. Que tal preservarmos momentos de tranquilidade juntas?`;
    } else if (diffPct <= -5) {
      insightText = `Em dias com pausas ${prep} ${appName}, seu ritmo tendeu a se manter equilibrado com suas metas do novelo.`;
    } else {
      insightText = `Seu ritmo e pontualidade têm se mantido consistentes independentemente do tempo ${prep} ${appName}. Nosso fio segue firme e acolhedor!`;
    }

    return {
      hasEnoughData: true,
      dayCount: history.length,
      requiredDays: this.MIN_DAYS,
      lowScreenPunctuality: avgPunctLow,
      highScreenPunctuality: avgPunctHigh,
      diffPct,
      topApp: appName,
      insightText,
      sampleDays: history.length
    };
  }
};

if (typeof window !== 'undefined') {
  window.insightsEngine = insightsEngine;
}

// Motor do Banco de Minutos Gamificado (Fase 5)
const minuteBankEngine = {
  MINUTES_PER_TASK: (typeof CatLineCommitmentsConfig !== 'undefined' ? CatLineCommitmentsConfig.SOCIAL_MINUTES_PER_TASK : 5),

  isFocoActive(st) {
    if (!st || !st.flags) return true;
    return st.flags.FOCO !== false && st.flags.foco !== false;
  },

  creditMinutes(st, minutes, reason, referenceId) {
    if (!this.isFocoActive(st)) return null;
    if (!st.minuteBank) {
      st.minuteBank = { balanceMinutes: 0, totalEarnedMinutes: 0, totalConsumedMinutes: 0, transactions: [], processedDebitIds: {} };
    }
    const mins = Math.max(1, parseInt(minutes || 0, 10));
    const now = Clock.now();
    const safeRef = referenceId ? String(referenceId).replace(/[^a-zA-Z0-9_-]/g, '') : 'manual';
    const txId = `tx_cred_${safeRef}_${now}`;

    if (st.minuteBank.transactions && st.minuteBank.transactions.some(t => t.txId === txId)) {
      return null;
    }

    st.minuteBank.balanceMinutes = (st.minuteBank.balanceMinutes || 0) + mins;
    st.minuteBank.totalEarnedMinutes = (st.minuteBank.totalEarnedMinutes || 0) + mins;
    if (!Array.isArray(st.minuteBank.transactions)) st.minuteBank.transactions = [];
    const tx = {
      txId,
      minutes: mins,
      reason: reason || 'Crédito no banco',
      timestamp: now,
      type: 'CREDIT'
    };
    st.minuteBank.transactions.unshift(tx);
    if (st.minuteBank.transactions.length > 30) {
      st.minuteBank.transactions = st.minuteBank.transactions.slice(0, 30);
    }
    this.syncWithNative(st, txId);
    return tx;
  },

  reconcileDebits(st, rawDebits) {
    if (!st) return [];
    if (!st.minuteBank) {
      st.minuteBank = { balanceMinutes: 0, totalEarnedMinutes: 0, totalConsumedMinutes: 0, transactions: [], processedDebitIds: {} };
    }
    if (!st.minuteBank.processedDebitIds) st.minuteBank.processedDebitIds = {};
    if (!Array.isArray(st.minuteBank.transactions)) st.minuteBank.transactions = [];

    let debits = [];
    if (Array.isArray(rawDebits)) {
      debits = rawDebits;
    } else if (typeof rawDebits === 'string') {
      try { debits = JSON.parse(rawDebits); } catch (e) { debits = []; }
    } else if (typeof window !== 'undefined' && window.AndroidBlocker && window.AndroidBlocker.pollMinuteBankDebits) {
      try {
        const raw = window.AndroidBlocker.pollMinuteBankDebits();
        debits = JSON.parse(raw || '[]');
      } catch (e) { debits = []; }
    }

    const processed = [];
    for (const d of debits) {
      if (!d || !d.debitId) continue;
      if (!st.minuteBank.processedDebitIds[d.debitId]) {
        st.minuteBank.processedDebitIds[d.debitId] = true;
        const mins = Math.max(1, parseInt(d.consumedMinutes || 1, 10));
        st.minuteBank.balanceMinutes = Math.max(0, (st.minuteBank.balanceMinutes || 0) - mins);
        st.minuteBank.totalConsumedMinutes = (st.minuteBank.totalConsumedMinutes || 0) + mins;
        const tx = {
          txId: d.debitId,
          pkg: d.pkg,
          minutes: -mins,
          reason: `Uso no app ${d.pkg || 'trancado'}`,
          timestamp: Clock.now(),
          type: 'DEBIT'
        };
        st.minuteBank.transactions.unshift(tx);
        processed.push(tx);
      }
      if (typeof window !== 'undefined' && window.AndroidBlocker && window.AndroidBlocker.ackMinuteBankDebit) {
        try { window.AndroidBlocker.ackMinuteBankDebit(d.debitId); } catch (ignored) {}
      }
    }
    if (st.minuteBank.transactions.length > 30) {
      st.minuteBank.transactions = st.minuteBank.transactions.slice(0, 30);
    }
    if (processed.length > 0) {
      this.syncWithNative(st);
    }
    return processed;
  },

  syncWithNative(st, txId = null) {
    if (typeof window === 'undefined' || !window.AndroidBlocker || !window.AndroidBlocker.syncMinuteBank) return;
    try {
      const isFocoOn = this.isFocoActive(st);
      const balanceMins = (st && st.minuteBank && st.minuteBank.balanceMinutes) || 0;
      const payload = {
        focoEnabled: isFocoOn,
        balanceSeconds: Math.max(0, balanceMins * 60),
        txId: txId || `sync_${Clock.now()}`
      };
      window.AndroidBlocker.syncMinuteBank(JSON.stringify(payload));
    } catch (err) {
      console.warn('Cat Line: aviso ao sincronizar banco de minutos com nativo:', err);
    }
  }
};

if (typeof window !== 'undefined') {
  window.minuteBankEngine = minuteBankEngine;
}

// Motor do Relatório Beta Local Seguro (Fase 6 / v3.2.0 · Prompt 12)
const betaReportEngine = {
  generateAnonymousReport(st) {
    if (!st) return {};
    const occs = st.occurrences || [];
    const doneOccs = occs.filter(o => o.state === 'FEITO' || o.state === 'done');
    const missedOccs = occs.filter(o => o.state === 'missed' || o.state === 'perdido' || o.state === 'PERDIDO');
    const reschedOccs = occs.filter(o => o.state === 'rescheduled');
    const unmarkedOccs = occs.filter(o => o.state === 'unmarked');
    const pendingOccs = occs.filter(o => o.state === 'pending' || o.state === 'PENDENTE' || (!o.state && !o.done));
    const habits = st.habits || [];
    const doneHabits = habits.filter(h => h.completed);
    const rules = st.blockRules || [];
    const hist = st.dailyCorrelationHistory || [];
    const durHist = st.durationHistory || [];
    const mb = st.minuteBank || {};

    const totalTasks = occs.length;
    const completedTasks = doneOccs.length;
    const legacyCompletionRatePct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const denominator = completedTasks + missedOccs.length;
    const fulfillmentRatePct = denominator > 0 ? Math.round((completedTasks / denominator) * 100) : legacyCompletionRatePct;

    // Métricas agregadas de pontualidade e atraso
    const checkIns = st.checkIns || [];
    const checkInMap = {};
    checkIns.forEach(ci => { if (ci && ci.commitmentId) checkInMap[ci.commitmentId] = ci; });
    const delays = [];
    doneOccs.forEach(o => {
      const ci = checkInMap[o.id];
      if (ci && typeof ci.lateMinutes === 'number') delays.push(ci.lateMinutes);
    });
    const onTimeCount = delays.filter(d => d <= 10).length;
    const punctualityRatePct = doneOccs.length > 0 ? Math.round((onTimeCount / doneOccs.length) * 100) : 100;
    const sortedDelays = [...delays].sort((a, b) => a - b);
    const medianLateMinutes = sortedDelays.length > 0 ? sortedDelays[Math.floor(sortedDelays.length / 2)] : 0;

    // Métricas agregadas de metas e passos
    const goals = st.goals || [];
    let stepsTotal = 0;
    let stepsDone = 0;
    goals.forEach(g => {
      if (Array.isArray(g.steps)) {
        stepsTotal += g.steps.length;
        stepsDone += g.steps.filter(s => s && s.doneAt).length;
      }
    });
    const stepCompletionRatePct = stepsTotal > 0 ? Math.round((stepsDone / stepsTotal) * 100) : 0;

    // Métricas 100% anônimas e agregadas - ZERO texto livre da usuária e zero uso de rede
    return {
      appName: 'Cat Line',
      version: '3.2.0',
      versionCode: 13,
      generatedAt: Clock.isoString(),
      networkUsed: false,
      privacyGuarantee: 'Zero texto livre da usuária, zero chaves privadas e zero chamadas de rede',
      modules: {
        hoje: Boolean(st.flags && st.flags.HOJE),
        agenda: Boolean(st.flags && st.flags.AGENDA),
        habitos: Boolean(st.flags && st.flags.HABITOS),
        metas: Boolean(st.flags && st.flags.METAS),
        insights: Boolean(st.flags && st.flags.INSIGHTS),
        loja: Boolean(st.flags && st.flags.LOJA),
        conversa: Boolean(st.flags && st.flags.CONVERSA),
        foco: Boolean(st.flags && (st.flags.FOCO !== false && st.flags.foco !== false)),
        metasPassos: Boolean(st.flags && st.flags.METAS_PASSOS !== false),
        compromissos: Boolean(st.flags && st.flags.COMPROMISSOS !== false),
        logSemanal: Boolean(st.flags && st.flags.LOG_SEMANAL !== false)
      },
      telemetry: {
        occurrencesTotal: totalTasks,
        occurrencesDone: completedTasks,
        occurrencesMissed: missedOccs.length,
        occurrencesRescheduled: reschedOccs.length,
        occurrencesUnmarked: unmarkedOccs.length,
        occurrencesPending: pendingOccs.length,
        fulfillmentRatePct,
        completionRatePct: legacyCompletionRatePct,
        punctualityRatePct,
        medianLateMinutes,
        habitsTotal: habits.length,
        habitsDoneToday: doneHabits.length,
        goalsTotal: goals.length,
        goalStepsTotal: stepsTotal,
        goalStepsDone: stepsDone,
        goalStepCompletionRatePct: stepCompletionRatePct,
        dayClosuresTotal: (st.dayClosures || []).length,
        weeklyLogsTotal: (st.weeklyLogs || []).length,
        rewardEventsTotal: (st.rewardEvents || []).length,
        currencies: {
          peixinhos: (st.currencies && st.currencies.peixinhos) || 0,
          novelosDourados: (st.currencies && st.currencies.novelosDourados) || 0,
          vinculo: (st.currencies && st.currencies.vinculo) || 0
        },
        minuteBank: {
          balanceMinutes: mb.balanceMinutes || 0,
          totalEarnedMinutes: mb.totalEarnedMinutes || 0,
          totalConsumedMinutes: mb.totalConsumedMinutes || 0
        },
        calibrationSamplesCount: durHist.length,
        calibratedCategoriesCount: Object.keys(st.calibratedCategories || {}).length,
        correlationDaysCount: hist.length,
        blockRulesCount: rules.length,
        activeUnlockSessionsCount: (st.activeUnlockSessions || []).length
      }
    };
  }
};

if (typeof window !== 'undefined') {
  window.betaReportEngine = betaReportEngine;
}

// Motor de Metas e Passos (v3.2.0 · Prompt 3)
const goalStepEngine = (typeof CatLineGoalStepEngine !== 'undefined')
  ? (CatLineGoalStepEngine.goalStepEngine || CatLineGoalStepEngine)
  : (typeof window !== 'undefined' && window.CatLineGoalStepEngine ? (window.CatLineGoalStepEngine.goalStepEngine || window.CatLineGoalStepEngine) : (typeof window !== 'undefined' && window.goalStepEngine ? window.goalStepEngine : (typeof globalThis !== 'undefined' && globalThis.goalStepEngine ? globalThis.goalStepEngine : null)));

if (typeof window !== 'undefined' && goalStepEngine) {
  window.goalStepEngine = goalStepEngine;
}

// Máquina de Estados do Compromisso (v3.2.0 · Prompt 4)
const commitmentStateMachine = (typeof CommitmentStateMachineModule !== 'undefined')
  ? CommitmentStateMachineModule.commitmentStateMachine
  : (typeof window !== 'undefined' && window.commitmentStateMachine ? window.commitmentStateMachine : null);

if (typeof window !== 'undefined' && commitmentStateMachine) {
  window.commitmentStateMachine = commitmentStateMachine;
}

// Motor de Métricas de Atraso (v3.2.0 · Prompt 5)
const delayMetricsEngine = (typeof CatLineDelayMetricsEngine !== 'undefined')
  ? CatLineDelayMetricsEngine.delayMetricsEngine
  : (typeof window !== 'undefined' && window.CatLineDelayMetricsEngine ? window.CatLineDelayMetricsEngine.delayMetricsEngine : null);

if (typeof window !== 'undefined' && delayMetricsEngine) {
  window.delayMetricsEngine = delayMetricsEngine;
}

// Livro-Razão de Recompensas e Anti-Farm (v3.2.0 · Prompt 6)
const rewardLedgerEngine = (typeof CatLineRewardLedgerEngine !== 'undefined')
  ? CatLineRewardLedgerEngine.rewardLedgerEngine
  : (typeof window !== 'undefined' && window.CatLineRewardLedgerEngine ? window.CatLineRewardLedgerEngine.rewardLedgerEngine : (typeof window !== 'undefined' && window.rewardLedgerEngine ? window.rewardLedgerEngine : (typeof globalThis !== 'undefined' && globalThis.rewardLedgerEngine ? globalThis.rewardLedgerEngine : null)));

if (typeof window !== 'undefined' && rewardLedgerEngine) {
  window.rewardLedgerEngine = rewardLedgerEngine;
}

// Fechamento do Dia (v3.2.0 · Prompt 7)
const dayClosureEngine = (typeof CatLineDayClosureEngine !== 'undefined')
  ? CatLineDayClosureEngine.dayClosureEngine
  : (typeof window !== 'undefined' && window.CatLineDayClosureEngine ? window.CatLineDayClosureEngine.dayClosureEngine : null);

if (typeof window !== 'undefined' && dayClosureEngine) {
  window.dayClosureEngine = dayClosureEngine;
}

// Motor de Log Semanal e Snapshot Imutável (v3.2.0 · Prompt 11)
const weeklyLogEngine = (typeof CatLineWeeklyLogEngine !== 'undefined')
  ? (CatLineWeeklyLogEngine.weeklyLogEngine || CatLineWeeklyLogEngine)
  : (typeof window !== 'undefined' && window.CatLineWeeklyLogEngine ? (window.CatLineWeeklyLogEngine.weeklyLogEngine || window.CatLineWeeklyLogEngine) : (typeof window !== 'undefined' && window.weeklyLogEngine ? window.weeklyLogEngine : (typeof globalThis !== 'undefined' && globalThis.weeklyLogEngine ? globalThis.weeklyLogEngine : null)));

if (typeof window !== 'undefined' && weeklyLogEngine) {
  window.weeklyLogEngine = weeklyLogEngine;
}

// Motor de Backup e Mesclagem Idempotente com Schema v2 (v3.2.0 · Prompt 13)
const backupEngine = (typeof CatLineBackupEngine !== 'undefined')
  ? (CatLineBackupEngine.backupEngine || CatLineBackupEngine)
  : (typeof window !== 'undefined' && window.CatLineBackupEngine ? (window.CatLineBackupEngine.backupEngine || window.CatLineBackupEngine) : (typeof window !== 'undefined' && window.backupEngine ? window.backupEngine : (typeof globalThis !== 'undefined' && globalThis.backupEngine ? globalThis.backupEngine : null)));

if (typeof window !== 'undefined' && backupEngine) {
  window.backupEngine = backupEngine;
}

// Configuração Declarativa Versionada (v3.2.0 · AD-10)
const defaultCommitmentsConfig = (typeof CatLineCommitmentsConfig !== 'undefined')
  ? CatLineCommitmentsConfig.DEFAULT_CONFIG
  : {
      version: 1,
      dayBoundary: { logicalDayStartHour: 4 },
      punctuality: { toleranceMinutes: 10 },
      week: { closesOn: 'sunday' },
      undoWindowMinutes: 10,
      rewards: {
        commitmentDone: { fish: 2 },
        onTimeBonus: { fish: 1 },
        stepDone: { fish: 3 },
        goalDone: { fish: 20, bond: 5 },
        dayClosure: { bond: 1 },
        retroactiveMultiplier: 0.5
      },
      caps: {
        fishPerLogicalDay: 15,
        socialMinutesEarnedPerDay: 30,
        minCommitmentMinutesToReward: 5
      },
      socialMinutesPerTask: 5
    };

// Estado Global da Aplicação
const state = {
  commitmentsConfig: defaultCommitmentsConfig,
  dayKey: '2026-10-25',
  currencies: {
    peixinhos: 120,
    novelosDourados: 2,
    vinculo: 240
  },
  selectedGoalId: 'g-1',
  durationHistory: [],
  pendingCalibrationSuggestion: null,
  calibratedCategories: {},
  dismissedSuggestions: {},
  pendingReplanPlan: null,
  dismissedReplanId: null,
  dismissedReplanDay: null,
  dailyCorrelationHistory: [
    { dayKey: '2026-10-19', screenTimeMinutes: 25, socialApp: 'Instagram', punctualityPct: 92, goalsCompleted: 2, totalGoals: 2 },
    { dayKey: '2026-10-20', screenTimeMinutes: 75, socialApp: 'Instagram', punctualityPct: 70, goalsCompleted: 1, totalGoals: 2 },
    { dayKey: '2026-10-21', screenTimeMinutes: 30, socialApp: 'Instagram', punctualityPct: 90, goalsCompleted: 2, totalGoals: 2 },
    { dayKey: '2026-10-22', screenTimeMinutes: 80, socialApp: 'Instagram', punctualityPct: 65, goalsCompleted: 1, totalGoals: 2 },
    { dayKey: '2026-10-23', screenTimeMinutes: 20, socialApp: 'Instagram', punctualityPct: 95, goalsCompleted: 2, totalGoals: 2 },
    { dayKey: '2026-10-24', screenTimeMinutes: 90, socialApp: 'Instagram', punctualityPct: 60, goalsCompleted: 1, totalGoals: 2 },
    { dayKey: '2026-10-25', screenTimeMinutes: 35, socialApp: 'Instagram', punctualityPct: 88, goalsCompleted: 2, totalGoals: 2 }
  ],
  minuteBank: {
    balanceMinutes: 30,
    totalEarnedMinutes: 30,
    totalConsumedMinutes: 0,
    transactions: [
      { txId: 'init_welcome', minutes: 30, reason: 'Bônus inicial acolhedor', timestamp: '2026-10-25T08:00:00Z', type: 'CREDIT' }
    ],
    processedDebitIds: {}
  },
  cat: {
    name: 'Gatinha',
    mood: 'FELIZ',
    equipped: ['laco_rosa'],
    owned: ['laco_rosa'],
    reserveYarns: 1,
    isRestMode: false,
    animationTag: 'brincando_novelo',
    // Posição virtual na sala (0..180 x, 72..108 y)
    x: 90,
    y: 96,
    targetX: 132,
    targetY: 78,
    stationName: 'Tapete Central',
    isWalking: true,
    facingRight: true,
    walkFrame: 0,
    playPawFrame: 0,
    waitTicks: 0,
    speechText: 'Oi! Vamos cuidar do seu dia?'
  },
  flags: {
    HOJE: true,
    AGENDA: true,
    HABITOS: true,
    METAS: true,
    INSIGHTS: true,
    LOJA: true,
    CONVERSA: true,
    FOCO: true,
    NOVELO_GRACINHAS: true,
    METAS_PASSOS: true,
    COMPROMISSOS: true,
    LOG_SEMANAL: true
  },
  set moduleFlags(flags) {
    if (flags && typeof flags === 'object') {
      if (flags.metasPassos !== undefined) state.flags.METAS_PASSOS = Boolean(flags.metasPassos);
      if (flags.compromissos !== undefined) state.flags.COMPROMISSOS = Boolean(flags.compromissos);
      if (flags.logSemanal !== undefined) state.flags.LOG_SEMANAL = Boolean(flags.logSemanal);
    }
  },
  get moduleFlags() {
    return {
      get metasPassos() { return state.flags.METAS_PASSOS !== false; },
      set metasPassos(val) { state.flags.METAS_PASSOS = Boolean(val); },
      get compromissos() { return state.flags.COMPROMISSOS !== false; },
      set compromissos(val) { state.flags.COMPROMISSOS = Boolean(val); },
      get logSemanal() { return state.flags.LOG_SEMANAL !== false; },
      set logSemanal(val) { state.flags.LOG_SEMANAL = Boolean(val); }
    };
  },
  editingOccurrenceId: null,
  editingHabitId: null,
  editingGoalId: null,
  analyticsPeriod: '7d',
  overcomingTargetMin: 10,
  activeTab: 'hoje',
  activeExecutionId: 'occ-2', // Treino ativo por padrão como demonstração viva
  activeExecutionType: 'occurrence',
  occurrences: [
    { id: 'occ-1', title: 'Estudar Kotlin & Compose', effort: 'M', reward: 10, time: '14:00', plannedStart: '2026-10-25T14:00:00', plannedZone: 'America/Sao_Paulo', plannedMinutes: 30, category: 'ESTUDAR_LER', recurrenceRule: 'Todos os dias', goalId: 'g-1', stepId: null, state: 'done', delayMin: -5, rescheduledFromId: null, createdAt: '2026-10-25T08:00:00Z' },
    { id: 'occ-2', title: 'Treino de Calistenia', effort: 'G', reward: 20, time: '17:30', plannedStart: '2026-10-25T17:30:00', plannedZone: 'America/Sao_Paulo', plannedMinutes: 60, category: 'TREINAR', recurrenceRule: 'Todos os dias', goalId: null, stepId: null, state: 'pending', delayMin: 0, rescheduledFromId: null, createdAt: '2026-10-25T08:00:00Z' },
    { id: 'occ-3', title: 'Organizar Escrivaninha', effort: 'P', reward: 5, time: '20:00', plannedStart: '2026-10-25T20:00:00', plannedZone: 'America/Sao_Paulo', plannedMinutes: 15, category: 'CUIDAR_CASA', recurrenceRule: 'Todos os dias', goalId: null, stepId: null, state: 'pending', delayMin: 0, rescheduledFromId: null, createdAt: '2026-10-25T08:00:00Z' }
  ],
  checkIns: [
    { id: 'chk_occ-1', commitmentId: 'occ-1', actualAt: '2026-10-25T13:55:00Z', retroactive: false, lateMinutes: -5 }
  ],
  rewardEvents: [],
  dayClosures: [],
  weeklyLogs: [],
  scheduledStepPreFill: null,
  editingStepId: null,
  activeStepPrompt: null,
  activeRetroModal: null,
  activeRescheduleModal: null,
  activeDayClosureModal: null,
  activeWeeklyLogModal: null,
  quickCreateSelectedGoalId: null,
  schemaVersion: 2,
  habits: [
    { id: 'hab-1', title: 'Beber 2L de Água', streak: 8, bestStreak: 15, frequency: 'Todos os dias', window: '21:00', totalCheckIns: 24, completed: true },
    { id: 'hab-2', title: 'Leitura de 10 Páginas', streak: 4, bestStreak: 12, frequency: 'Dias úteis', window: '22:30', totalCheckIns: 18, completed: false }
  ],
  // Cada meta tem um novelinho de cor diferente e um cronômetro regressivo que se esgota em dias/horas enrolando o novelo
  goals: [
    {
      id: 'g-1',
      horizon: 'SEMANA',
      title: 'Entregar Projeto Cat Line',
      yarnColorId: 'pink',
      yarnColor: 'pink',
      targetDate: null,
      archived: false,
      createdAt: '2026-10-25T00:00:00.000Z',
      steps: [
        { id: 's-1-1', goalId: 'g-1', title: 'Definir arquitetura e módulos', order: 1, estMinutes: 30, targetDate: '2026-10-26', doneAt: '2026-10-25T10:00:00.000Z', archived: false },
        { id: 's-1-2', goalId: 'g-1', title: 'Construir motor de metas e passos', order: 2, estMinutes: 45, targetDate: '2026-10-27', doneAt: null, archived: false },
        { id: 's-1-3', goalId: 'g-1', title: 'Escrever suíte de testes unitários', order: 3, estMinutes: 40, targetDate: '2026-10-28', doneAt: null, archived: false }
      ],
      totalDays: 7,
      totalSeconds: 7 * 86400,     // 7 dias
      remainingSeconds: Math.floor(3.6 * 86400),  // 3d 14h 24m restantes -> 49% enrolado pelo tempo!
      progress: 0.75,
      reward: 'Tomar café especial',
      rewardCost: 100
    },
    {
      id: 'g-2',
      horizon: 'MES',
      title: 'Zero atrasos na rotina',
      yarnColorId: 'gold',
      yarnColor: 'gold',
      targetDate: null,
      archived: false,
      createdAt: '2026-10-25T00:00:00.000Z',
      steps: [],
      totalDays: 30,
      totalSeconds: 30 * 86400,     // 30 dias
      remainingSeconds: Math.floor(18.35 * 86400), // 18d 08h 24m restantes -> 39% enrolado
      progress: 0.50,
      reward: 'Jantar comemorativo',
      rewardCost: 600
    },
    {
      id: 'g-3',
      horizon: 'SEMANA',
      title: 'Dominar Pixel Art & Shaders',
      yarnColorId: 'blue',
      yarnColor: 'blue',
      targetDate: null,
      archived: false,
      createdAt: '2026-10-25T00:00:00.000Z',
      steps: [
        { id: 's-1-1', goalId: 'g-1', title: 'Definir arquitetura e módulos', order: 1, estMinutes: 30, targetDate: '2026-10-26', doneAt: '2026-10-25T10:00:00.000Z', archived: false },
        { id: 's-1-2', goalId: 'g-1', title: 'Construir motor de metas e passos', order: 2, estMinutes: 45, targetDate: '2026-10-27', doneAt: null, archived: false },
        { id: 's-1-3', goalId: 'g-1', title: 'Escrever suíte de testes unitários', order: 3, estMinutes: 40, targetDate: '2026-10-28', doneAt: null, archived: false }
      ],
      totalDays: 7,
      totalSeconds: 7 * 86400,      // 7 dias
      remainingSeconds: Math.floor(1.85 * 86400),  // 1d 20h 24m restantes -> 74% enrolado!
      progress: 0.60,
      reward: 'Assistir 2 episódios',
      rewardCost: 100
    },
    {
      id: 'g-4',
      horizon: 'TRIMESTRE',
      title: 'Rotina Saudável Completa',
      yarnColorId: 'green',
      yarnColor: 'green',
      targetDate: null,
      archived: false,
      createdAt: '2026-10-25T00:00:00.000Z',
      steps: [],
      totalDays: 90,
      totalSeconds: 90 * 86400,     // 90 dias
      remainingSeconds: Math.floor(62.5 * 86400), // 62d 12h restantes -> 31% enrolado
      progress: 0.40,
      reward: 'Dia de Spa em casa',
      rewardCost: 600
    }
  ],
  briefing: {
    active: false,
    step: 1, // 1: Ritmo, 2: Hábitos, 3: Metas, 4: Foco, 5: Resumo
    hasDoneOnce: true,
    lastCompletedDate: '2026-10-25',
    wakeTime: '07:30',
    sleepTime: '23:00',
    focusPeriod: 'Manhã',
    selectedHabits: ['Beber 2L de Água', 'Leitura diária', 'Treino / Movimento'],
    habitTimes: {
      'Beber 2L de Água': '20:00',
      'Leitura diária': '22:30',
      'Treino / Movimento': '18:00'
    },
    goalTitle: 'Entregar Projeto Cat Line',
    goalHorizon: 'MES',
    goalDays: 30,
    goalColor: 'gold',
    goalReward: 'Jantar especial comemorativo',
    selectedApps: ['Instagram', 'TikTok'],
    blockRigor: 2,
    windowStart: '09:00',
    windowEnd: '20:00'
  },
  analyticsData: {
    '7d': [-2, 4, 3, -5, 2, 4, 1],
    '14d': [7, 6, 4, 3, 5, 2, 4, 3, -2, 5, 4, 2, 1, 0],
    '30d': [14, 12, 10, 8, 7, 9, 6, 5, 4, 6, 5, 3, 2, 4, 3, -2, 5, 4, 2, 1, 3, 0, -1, 2, 1, 3, 0, -2, 1, 0],
    weeklyDays: [
      { day: 'Seg', pct: 85, onTime: 12, total: 14 },
      { day: 'Ter', pct: 90, onTime: 14, total: 15 },
      { day: 'Qua', pct: 75, onTime: 9, total: 12 },
      { day: 'Qui', pct: 82, onTime: 10, total: 12 },
      { day: 'Sex', pct: 70, onTime: 8, total: 11 },
      { day: 'Sáb', pct: 95, onTime: 13, total: 14 },
      { day: 'Dom', pct: 92, onTime: 11, total: 12 }
    ],
    periodsOfDay: [
      { name: 'Manhã · 06h às 12h', pct: 92, avgDelay: '1 min', count: 18, color: '#63AB3F' },
      { name: 'Tarde · 12h às 18h', pct: 85, avgDelay: '4 min', count: 24, color: '#DF8F49' },
      { name: 'Noite · 18h às 24h', pct: 68, avgDelay: '14 min', count: 15, color: '#D95763' },
      { name: 'Madrugada · 00h às 06h', pct: 100, avgDelay: '0 min', count: 2, color: '#5A4E7C' }
    ]
  },
  delayHistory7Days: [2, 4, 3, -2, 5, 4, 2],
  blockRules: [
    { id: 'br-1', name: 'Instagram', pkg: 'com.instagram.android', icon: '📸', url: 'https://www.instagram.com', rigor: 3, windowStart: '00:00', windowEnd: '23:59', days: 'Todos os dias', enabled: true },
    { id: 'br-2', name: 'TikTok', pkg: 'com.zhiliaoapp.musically', icon: '🎵', url: 'https://www.tiktok.com', rigor: 3, windowStart: '00:00', windowEnd: '23:59', days: 'Todos os dias', enabled: true },
    { id: 'br-3', name: 'Twitter / X', pkg: 'com.twitter.android', icon: '🩵', url: 'https://x.com', rigor: 3, windowStart: '00:00', windowEnd: '23:59', days: 'Todos os dias', enabled: true },
    { id: 'br-4', name: 'YouTube', pkg: 'com.google.android.youtube', icon: '🔴', url: 'https://www.youtube.com', rigor: 3, windowStart: '00:00', windowEnd: '23:59', days: 'Todos os dias', enabled: true }
  ],
  selectedPresetId: 'instagram',
  editingBlockRuleId: null,
  activeUnlockSessions: [],
  blockerMigratedV3: true,
  simulatedModal: null,
  messages: [
    { fromUser: false, text: "Oi! Estou aqui com você. Toque em uma meta para trocar a cor do novelo." }
  ],
  realLifeRewards: [
    { id: 'rw-1', title: 'Café especial na cafeteria favorita', cost: 30, icon: '☕', redeemedCount: 1, lastRedeemedAt: null },
    { id: 'rw-2', title: 'Assistir 2 episódios de série sem culpa', cost: 45, icon: '🎬', redeemedCount: 2, lastRedeemedAt: null },
    { id: 'rw-3', title: 'Banho relaxante com música e velas', cost: 40, icon: '🧖‍♀️', redeemedCount: 0, lastRedeemedAt: null },
    { id: 'rw-4', title: 'Pedir delivery favorito no jantar', cost: 70, icon: '🍕', redeemedCount: 1, lastRedeemedAt: null },
    { id: 'rw-5', title: 'Comprar um livro novo ou mimo desejado', cost: 120, icon: '📚', redeemedCount: 0, lastRedeemedAt: null },
    { id: 'rw-6', title: 'Sobremesa ou sorvete artesanal', cost: 25, icon: '🍦', redeemedCount: 0, lastRedeemedAt: null }
  ],
  editingRewardId: null,
  newRewardEmoji: '☕',
  celebratingReward: null,
  rotinaSubTab: 'agenda',
  maisSubTab: 'insights',
  quickCreateType: 'occurrence',
  darkMode: false,
  largeFont: false,
  lastDeletedItem: null,
  notificationsEnabled: false,
  notifiedTodayKeys: []
};

// ==========================================
// PERSISTÊNCIA NA MEMÓRIA DO CELULAR (LOCALSTORAGE)
// Salva tudo localmente no aparelho (sem necessidade de Supabase, nuvem ou banco externo)
// ==========================================
const STORAGE_KEY = 'CATLINE_DEVICE_STORAGE_V1';

// Motor do Livro-Razão de Recompensas (v3.2.0 - Idempotência por idempotencyKey)
const rewardEventStore = {
  insert(st, event) {
    if (!st) return false;
    if (!st.rewardEvents) st.rewardEvents = [];
    if (!event || !event.idempotencyKey) {
      throw new Error("RewardEvent deve possuir um idempotencyKey válido");
    }
    const exists = st.rewardEvents.some(e => e.idempotencyKey === event.idempotencyKey);
    if (exists) {
      return false; // Idempotência garantida: duplicatas com a mesma chave são ignoradas
    }
    st.rewardEvents.push({
      id: event.id || ('rev_' + Clock.now() + '_' + Math.random().toString(36).substr(2, 6)),
      idempotencyKey: event.idempotencyKey,
      kind: event.kind,
      fishDelta: Number(event.fishDelta || 0),
      bondDelta: Number(event.bondDelta || 0),
      refId: event.refId || '',
      at: event.at || Clock.isoString(),
      logicalDay: event.logicalDay || (typeof Clock !== 'undefined' ? Clock.todayStr() : '2026-10-25')
    });
    return true;
  },

  getAll(st) {
    return (st && st.rewardEvents) || [];
  },

  has(st, idempotencyKey) {
    return Boolean(st && st.rewardEvents && st.rewardEvents.some(e => e.idempotencyKey === idempotencyKey));
  }
};

if (typeof window !== 'undefined') {
  window.rewardEventStore = rewardEventStore;
}

// Motor de Migração de Dados (v3.1.0 -> v3.2.0)
const migrationEngine = {
  CURRENT_SCHEMA_VERSION: 2,

  migrateV310ToV320(saved) {
    if (!saved || typeof saved !== 'object') return saved;
    const migrated = { ...saved };

    // 1. Metas com passos (Goal e GoalStep)
    if (Array.isArray(migrated.goals)) {
      migrated.goals = migrated.goals.map(g => ({
        ...g,
        id: g.id,
        title: g.title,
        horizon: g.horizon || 'SEMANA',
        yarnColor: g.yarnColor || g.yarnColorId || 'pink',
        yarnColorId: g.yarnColorId || g.yarnColor || 'pink',
        targetDate: g.targetDate || null,
        archived: Boolean(g.archived),
        createdAt: g.createdAt || (typeof Clock !== 'undefined' ? Clock.isoString() : '2026-10-25T00:00:00.000Z'),
        steps: Array.isArray(g.steps) ? g.steps.map(s => ({
          id: s.id,
          goalId: s.goalId || g.id,
          title: s.title,
          order: Number.isFinite(s.order) ? s.order : 0,
          estMinutes: s.estMinutes || null,
          targetDate: s.targetDate || null,
          doneAt: s.doneAt || null,
          archived: Boolean(s.archived)
        })) : []
      }));
    } else {
      migrated.goals = [];
    }

    // 2. checkIns
    if (!Array.isArray(migrated.checkIns)) {
      migrated.checkIns = [];
    }

    // 3. Compromissos (Commitment e Occurrence)
    if (Array.isArray(migrated.occurrences)) {
      migrated.occurrences = migrated.occurrences.map(o => {
        let newState = 'pending';
        if (o.state === 'FEITO' || o.state === 'done') {
          newState = 'done';
        } else if (o.state === 'PERDIDO' || o.state === 'missed') {
          newState = 'missed';
        } else if (o.state === 'PULADO' || o.state === 'rescheduled') {
          newState = 'rescheduled';
        } else if (o.state === 'unmarked') {
          newState = 'unmarked';
        } else {
          newState = 'pending';
        }

        const dateStr = o.date || (typeof Clock !== 'undefined' ? Clock.todayStr() : '2026-10-25');
        const timeStr = o.time || '12:00';
        const plannedStart = o.plannedStart || `${dateStr}T${timeStr}:00`;

        if (newState === 'done') {
          const chkId = 'chk_' + o.id;
          if (!migrated.checkIns.some(c => c.commitmentId === o.id || c.id === chkId)) {
            migrated.checkIns.push({
              id: chkId,
              commitmentId: o.id,
              actualAt: o.completedAt || (typeof Clock !== 'undefined' ? Clock.isoString() : `${dateStr}T${timeStr}:00`),
              retroactive: Boolean(o.isRetroactive),
              lateMinutes: Number.isFinite(o.delayMin) ? o.delayMin : 0
            });
          }
        }

        return {
          ...o,
          plannedStart,
          plannedZone: o.plannedZone || 'America/Sao_Paulo',
          plannedMinutes: o.plannedMinutes || o.estimatedDuration || (o.effort === 'G' ? 60 : (o.effort === 'M' ? 30 : 15)),
          category: o.category || (typeof detectTaskCategory === 'function' ? detectTaskCategory(o) : 'GERAL'),
          recurrenceRule: o.recurrenceRule || o.recurrence || 'Todos os dias',
          goalId: o.goalId || null,
          stepId: o.stepId || null,
          state: newState,
          rescheduledFromId: o.rescheduledFromId || null,
          createdAt: o.createdAt || (typeof Clock !== 'undefined' ? Clock.isoString() : '2026-10-25T00:00:00.000Z')
        };
      });
    } else {
      migrated.occurrences = [];
    }

    // 4. RewardEvents com deduplicação por idempotencyKey
    if (Array.isArray(migrated.rewardEvents)) {
      const seen = new Set();
      const uniqueEvents = [];
      for (const e of migrated.rewardEvents) {
        if (e && e.idempotencyKey && !seen.has(e.idempotencyKey)) {
          seen.add(e.idempotencyKey);
          uniqueEvents.push(e);
        }
      }
      migrated.rewardEvents = uniqueEvents;
    } else {
      migrated.rewardEvents = [];
    }

    // 5. DayClosures
    if (!Array.isArray(migrated.dayClosures)) {
      migrated.dayClosures = [];
    }

    // 6. WeeklyLogs
    if (!Array.isArray(migrated.weeklyLogs)) {
      migrated.weeklyLogs = [];
    }

    migrated.schemaVersion = this.CURRENT_SCHEMA_VERSION;
    return migrated;
  }
};

if (typeof window !== 'undefined') {
  window.migrationEngine = migrationEngine;
}

// Bloqueio real (APK Android): envia regras, descanso e pendências para o serviço nativo
const BLOCKER_FRICTION_SECONDS = 15;
const BLOCKER_PASS_MINUTES = 15;
function syncNativeBlocker() {
  const nb = window.AndroidBlocker;
  if (!nb) return;
  try {
    const isFocoOn = state.flags.FOCO !== false && state.flags.foco !== false;
    nb.syncState(JSON.stringify({
      focoEnabled: isFocoOn,
      restMode: !!state.cat.isRestMode,
      pending: state.occurrences.filter(o => o.state === 'PENDENTE').length,
      frictionSeconds: BLOCKER_FRICTION_SECONDS,
      passMinutes: BLOCKER_PASS_MINUTES,
      rules: state.blockRules.map(r => ({
        pkg: r.pkg,
        name: r.name,
        rigor: r.rigor,
        windowStart: r.windowStart,
        windowEnd: r.windowEnd,
        days: r.days,
        enabled: !!r.enabled
      }))
    }));

    if (typeof minuteBankEngine !== 'undefined') {
      minuteBankEngine.reconcileDebits(state);
      minuteBankEngine.syncWithNative(state);
    }
  } catch (e) {}
}

function saveStateToDeviceStorage() {
  syncNativeBlocker();
  try {
    const toSave = {
      schemaVersion: 2,
      savedAt: Clock.now(),
      dayKey: state.dayKey,
      currencies: state.currencies,
      selectedGoalId: state.selectedGoalId,
      cat: {
        name: state.cat.name,
        mood: state.cat.mood,
        equipped: state.cat.equipped,
        owned: state.cat.owned,
        reserveYarns: state.cat.reserveYarns,
        isRestMode: state.cat.isRestMode,
        speechText: state.cat.speechText
      },
      flags: state.flags,
      occurrences: state.occurrences,
      checkIns: state.checkIns || [],
      rewardEvents: state.rewardEvents || [],
      dayClosures: state.dayClosures || [],
      weeklyLogs: state.weeklyLogs || [],
      habits: state.habits,
      goals: state.goals,
      briefing: state.briefing,
      blockRules: state.blockRules,
      activeUnlockSessions: state.activeUnlockSessions,
      blockerMigratedV3: true,
      messages: state.messages,
      overcomingTargetMin: state.overcomingTargetMin,
      realLifeRewards: state.realLifeRewards,
      durationHistory: state.durationHistory,
      pendingCalibrationSuggestion: state.pendingCalibrationSuggestion,
      calibratedCategories: state.calibratedCategories,
      dismissedSuggestions: state.dismissedSuggestions,
      pendingReplanPlan: state.pendingReplanPlan,
      dismissedReplanId: state.dismissedReplanId,
      dismissedReplanDay: state.dismissedReplanDay,
      dailyCorrelationHistory: state.dailyCorrelationHistory,
      minuteBank: state.minuteBank,
      darkMode: state.darkMode,
      largeFont: state.largeFont,
      notificationsEnabled: state.notificationsEnabled
    };
    const serialized = JSON.stringify(toSave);
    localStorage.setItem(STORAGE_KEY, serialized);
    // Espelhamento redundante no cofre nativo do Android (evita perda entre atualizacoes de APK)
    if (window.AndroidBlocker && typeof window.AndroidBlocker.putSecret === 'function') {
      try { window.AndroidBlocker.putSecret('catline_backup_state', serialized); } catch (e) {}
    }
  } catch (err) {
    console.warn('Cat Line: aviso ao salvar na memória do celular:', err);
  }
}

function loadStateFromDeviceStorage() {
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    // Se o localStorage da WebView vier vazio (ex: atualizacao ou limpeza de cache), restaura do cofre nativo
    if (!raw && window.AndroidBlocker && typeof window.AndroidBlocker.getSecret === 'function') {
      try {
        const vaultState = window.AndroidBlocker.getSecret('catline_backup_state');
        if (vaultState && vaultState.length > 10) {
          raw = vaultState;
          localStorage.setItem(STORAGE_KEY, vaultState);
          console.log('Cat Line: dados restaurados do cofre nativo do Android!');
        }
      } catch (e) {}
    }
    if (!raw) return;
    let data = JSON.parse(raw);

    // Migração de esquema para v3.2.0 se versão antiga
    if (!data.schemaVersion || data.schemaVersion < 2) {
      data = migrationEngine.migrateV310ToV320(data);
    }

    state.schemaVersion = data.schemaVersion || 2;
    if (Array.isArray(data.checkIns)) state.checkIns = data.checkIns;
    if (Array.isArray(data.rewardEvents)) state.rewardEvents = data.rewardEvents;
    if (Array.isArray(data.dayClosures)) state.dayClosures = data.dayClosures;
    if (Array.isArray(data.weeklyLogs)) state.weeklyLogs = data.weeklyLogs;

    if (data.currencies) state.currencies = { ...state.currencies, ...data.currencies };
    if (data.selectedGoalId) state.selectedGoalId = data.selectedGoalId;
    if (data.cat) {
      if (data.cat.name) state.cat.name = data.cat.name;
      if (data.cat.mood) state.cat.mood = data.cat.mood;
      if (data.cat.equipped) state.cat.equipped = data.cat.equipped;
      if (data.cat.owned) state.cat.owned = data.cat.owned;
      if (data.cat.reserveYarns !== undefined) state.cat.reserveYarns = data.cat.reserveYarns;
      if (data.cat.isRestMode !== undefined) state.cat.isRestMode = data.cat.isRestMode;
    }
    if (data.flags) state.flags = { ...state.flags, ...data.flags };
    if (Array.isArray(data.occurrences)) {
      state.occurrences = data.occurrences.map(o => ({
        recurrence: "Todos os dias",
        date: state.dayKey,
        plannedZone: "America/Sao_Paulo",
        stepId: null,
        rescheduledFromId: null,
        ...o
      }));
    }
    if (Array.isArray(data.habits)) state.habits = data.habits;
    if (Array.isArray(data.goals)) {
      state.goals = data.goals.map(g => ({
        steps: [],
        yarnColor: g.yarnColorId || 'pink',
        archived: false,
        ...g
      }));
      // Calcula o tempo decorrido com o celular desligado ou app em segundo plano
      if (data.savedAt && !state.cat.isRestMode) {
        const elapsedSec = Math.floor((Clock.now() - data.savedAt) / 1000);
        if (elapsedSec > 0) {
          state.goals.forEach(g => {
            if (g.remainingSeconds > 0) {
              g.remainingSeconds = Math.max(0, g.remainingSeconds - elapsedSec);
            }
          });
        }
      }
    }
    if (data.briefing) state.briefing = { ...state.briefing, ...data.briefing, active: false };
    if (Array.isArray(data.activeUnlockSessions)) {
      state.activeUnlockSessions = data.activeUnlockSessions.filter(s => s && s.expiresAt > Clock.now());
    }
    if (Array.isArray(data.blockRules)) {
      state.blockRules = data.blockRules.map(r => {
        const meta = resolveSocialAppMeta(r.name, r.pkg);
        if (!data.blockerMigratedV3) {
          return {
            ...r,
            pkg: meta.pkg,
            icon: r.icon || meta.icon,
            url: r.url || meta.url,
            rigor: Math.max(3, r.rigor || 3),
            windowStart: '00:00',
            windowEnd: '23:59',
            days: 'Todos os dias',
            enabled: true
          };
        }
        return {
          ...r,
          pkg: r.pkg || meta.pkg,
          icon: r.icon || meta.icon,
          url: r.url || meta.url
        };
      });
    }
    if (Array.isArray(data.messages)) state.messages = data.messages;
    if (data.overcomingTargetMin !== undefined) state.overcomingTargetMin = data.overcomingTargetMin;
    if (Array.isArray(data.realLifeRewards)) state.realLifeRewards = data.realLifeRewards;
    if (Array.isArray(data.durationHistory)) state.durationHistory = data.durationHistory;
    if (data.pendingCalibrationSuggestion) state.pendingCalibrationSuggestion = data.pendingCalibrationSuggestion;
    if (data.calibratedCategories) state.calibratedCategories = data.calibratedCategories;
    if (data.dismissedSuggestions) state.dismissedSuggestions = data.dismissedSuggestions;
    if (data.pendingReplanPlan) state.pendingReplanPlan = data.pendingReplanPlan;
    if (data.dismissedReplanId) state.dismissedReplanId = data.dismissedReplanId;
    if (data.dismissedReplanDay) state.dismissedReplanDay = data.dismissedReplanDay;
    if (Array.isArray(data.dailyCorrelationHistory)) state.dailyCorrelationHistory = data.dailyCorrelationHistory;
    if (data.minuteBank) {
      state.minuteBank = {
        ...state.minuteBank,
        ...data.minuteBank,
        processedDebitIds: {
          ...((state.minuteBank && state.minuteBank.processedDebitIds) || {}),
          ...((data.minuteBank && data.minuteBank.processedDebitIds) || {})
        }
      };
    }
    if (data.darkMode !== undefined) state.darkMode = Boolean(data.darkMode);
    if (data.largeFont !== undefined) state.largeFont = Boolean(data.largeFont);
    if (data.notificationsEnabled !== undefined) state.notificationsEnabled = Boolean(data.notificationsEnabled);

    if (typeof minuteBankEngine !== 'undefined') {
      minuteBankEngine.reconcileDebits(state);
      minuteBankEngine.syncWithNative(state);
    }

    console.log('Cat Line: dados recuperados da memória local do celular com sucesso!');
  } catch (err) {
    console.warn('Cat Line: aviso ao carregar da memória local:', err);
  }
}

function clearDeviceStorageAndReset() {
  if (confirm("Deseja apagar os dados salvos na memória deste celular e reiniciar o Cat Line do zero?")) {
    localStorage.removeItem(STORAGE_KEY);
    if (window.AndroidBlocker && typeof window.AndroidBlocker.removeSecret === 'function') {
      try { window.AndroidBlocker.removeSecret('catline_backup_state'); } catch (e) {}
    }
    window.location.reload();
  }
}

window.clearDeviceStorageAndReset = clearDeviceStorageAndReset;

// Carrega o estado salvo na memória imediatamente
loadStateFromDeviceStorage();

// Garante salvamento automático ao sair do app ou bloquear a tela do celular
window.addEventListener('beforeunload', saveStateToDeviceStorage);
window.addEventListener('pagehide', saveStateToDeviceStorage);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveStateToDeviceStorage();
  }
});

function getYarnPalette(colorId) {
  return YARN_COLORS.find(c => c.id === colorId) || YARN_COLORS[0];
}

function getSelectedGoal() {
  return state.goals.find(g => g.id === state.selectedGoalId) || state.goals[0];
}

function getWoundFractionByTime(goal) {
  if (!goal || goal.totalSeconds <= 0) return 0.5;
  const elapsed = Math.max(0, goal.totalSeconds - goal.remainingSeconds);
  return Math.min(1, Math.max(0.08, elapsed / goal.totalSeconds));
}

function formatRemainingTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const remS = s % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(remS).padStart(2, '0')}s`;
  }
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m ${String(remS).padStart(2, '0')}s`;
  }
  return `${String(mins).padStart(2, '0')}m ${String(remS).padStart(2, '0')}s`;
}

// Desenha um mini novelo 8-bit autêntico (com fios cruzados e pontinha de lã) para os chips seletores
function drawMiniYarnBallCanvas(canvas, colorId, tick = 0) {
  const ctx = canvas.getContext('2d');
  const pal = getYarnPalette(colorId);
  const px = 2; // 11x11 grade virtual em canvas 22x22
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  function pRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * px, y * px, w * px, h * px);
  }

  // Contorno circular 8-bit do novelinho
  pRect(3, 1, 5, 9, PALETTE.ink);
  pRect(2, 2, 7, 7, PALETTE.ink);
  pRect(1, 3, 9, 5, PALETTE.ink);

  // Miolo colorido do novelo
  pRect(3, 2, 5, 7, pal.main);
  pRect(2, 3, 7, 5, pal.main);

  // Sombra inferior direita
  pRect(5, 6, 3, 2, pal.shadow);
  pRect(6, 4, 2, 3, pal.shadow);

  // Fios internos cruzados (giram sutilmente)
  const shift = Math.floor(tick / 12) % 2;
  pRect(3 + shift, 3, 3, 1, pal.shadow);
  pRect(2, 5, 4, 1, pal.shadow);
  pRect(4, 4 + shift, 2, 2, pal.highlight);

  // Pontinha de fio saindo do novelo
  pRect(8, 8, 2, 1, PALETTE.ink);
  pRect(9, 7 + shift, 2, 1, pal.main);
}

// Desenha o Componente Completo do Novelo Enrolando o Fio à medida que o tempo esgota!
function drawWindingYarnCanvas(canvas, goal, tick) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width > 0 && (canvas.width !== Math.floor(rect.width) || canvas.height !== 52)) {
    canvas.width = Math.floor(rect.width);
    canvas.height = 52;
  }

  const ctx = canvas.getContext('2d');
  const px = 2; // Escala inteira 2x2 px por bloco 8-bit
  const vw = Math.floor(canvas.width / px);
  const vh = Math.floor(canvas.height / px); // ~26 blocos de altura
  const cy = Math.floor(vh / 2);

  const pal = getYarnPalette(goal.yarnColorId);
  const woundFraction = getWoundFractionByTime(goal); // 0.08 .. 1.0

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  function pRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x) * px, Math.floor(y) * px, Math.ceil(w) * px, Math.ceil(h) * px);
  }

  // 1. Fundo pontilhado sutil da trilha do tempo
  for (let gx = 28; gx < vw - 14; gx += 6) {
    pRect(gx, cy + 7, 2, 1, '#e4d5bc');
  }

  // 2. Carretel / Agulha de Madeira na direita (de onde o fio solto está se desenrolando)
  const spoolX = vw - 10;
  // Haste de madeira
  pRect(spoolX - 1, 4, 3, vh - 8, PALETTE.ink);
  pRect(spoolX, 5, 1, vh - 10, PALETTE.orangeShadow);
  pRect(spoolX - 2, 3, 5, 2, PALETTE.ink);
  pRect(spoolX - 2, vh - 5, 5, 2, PALETTE.ink);

  // Lã restante no carretel da direita (diminui conforme o novelo da esquerda enrola tudo!)
  const remFraction = Math.max(0, 1 - woundFraction);
  const remThick = Math.max(1, Math.round(remFraction * 4));
  const remHeight = Math.max(3, Math.round(remFraction * 12));
  if (remFraction > 0.03) {
    pRect(spoolX - remThick - 1, cy - Math.floor(remHeight / 2) - 1, remThick * 2 + 3, remHeight + 2, PALETTE.ink);
    pRect(spoolX - remThick, cy - Math.floor(remHeight / 2), remThick * 2 + 1, remHeight, pal.main);
    pRect(spoolX - remThick, cy, remThick * 2 + 1, 2, pal.shadow);
  }

  // 3. O NOVELO DE LÃ ENROLANDO (Esquerda, girando e crescendo conforme enrola o fio!)
  // O raio cresce de 6 até 10 blocos (24px a 40px reais) conforme woundFraction avança
  const r = Math.round(6 + woundFraction * 4);
  const ballCx = 14;
  const ballCy = cy;
  const spinPhase = Math.floor(tick / 4) % 6;
  const bobY = (Math.floor(tick / 8) % 2 === 0) ? 0 : -1;

  // Sombra embaixo do novelo
  pRect(ballCx - r + 2, ballCy + r + 1, (r - 2) * 2, 2, 'rgba(24, 20, 37, 0.22)');

  // Desenha esfera pixelada 8-bit com contorno preto e texturas de lã cruzadas girando
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const distSq = dx * dx + dy * dy;
      if (distSq <= r * r + 1) {
        const isBorder = distSq >= (r - 1.35) * (r - 1.35);
        let color = pal.main;

        if (isBorder) {
          color = PALETTE.ink;
        } else {
          // Sombra em meia-lua no canto inferior direito
          if (dx + dy > r * 0.45) {
            color = pal.shadow;
          }
          // Fios de lã curvados que giram dentro do novelo (animação de enrolar!)
          const wrapWave1 = Math.round(Math.sin((dy + spinPhase) * 0.65) * 2);
          const wrapWave2 = Math.round(Math.cos((dx - spinPhase) * 0.65) * 2);
          if ((dx + dy + spinPhase) % 5 === 0 || (dx - dy - spinPhase + 12) % 6 === 0) {
            color = pal.shadow;
          } else if (dx === wrapWave1 || dy === wrapWave2) {
            color = pal.highlight;
          }
          // Brilho no topo esquerdo
          if (dx < -r * 0.25 && dy < -r * 0.25 && distSq < (r - 2) * (r - 2)) {
            color = pal.highlight;
          }
        }
        pRect(ballCx + dx, ballCy + dy + bobY, 1, 1, color);
      }
    }
  }

  // Laçada externa girando ao redor do novelo (mostra a volta do fio se enrolando nele)
  const loopAngle = (tick * 0.22) % (Math.PI * 2);
  const lx = ballCx + Math.round(Math.cos(loopAngle) * (r + 1));
  const ly = ballCy + bobY + Math.round(Math.sin(loopAngle) * (r + 1));
  pRect(lx, ly, 2, 2, PALETTE.ink);
  pRect(lx, ly, 1, 1, pal.highlight);

  // 4. O FIO E A TRANÇA DE PROGRESSO (Do Novelo até o Carretel da direita)
  const trackStartX = ballCx + r + 1;
  const trackEndX = spoolX - remThick - 1;
  const totalTrackW = Math.max(10, trackEndX - trackStartX);
  const splitX = Math.round(trackStartX + totalTrackW * woundFraction);

  // Parte A (trackStartX .. splitX): Cordão/Trança de Lã já enrolada (com gomos de lã torcida!)
  for (let x = trackStartX; x <= splitX; x++) {
    const twist = (x + Math.floor(tick / 2)) % 5;
    const braidBob = Math.round(Math.sin((x * 0.35) + (tick * 0.25)) * 0.7);
    const by = cy + braidBob;

    // Bordas superior e inferior da trança de lã
    pRect(x, by - 3, 1, 1, PALETTE.ink);
    pRect(x, by + 3, 1, 1, PALETTE.ink);

    // Miolo trançado de 5 blocos com textura diagonal de fio torcido se movendo para o novelo
    pRect(x, by - 2, 1, 5, pal.main);
    if (twist === 0 || twist === 1) {
      pRect(x, by - 2 + twist, 1, 2, pal.highlight);
      pRect(x, by + 1, 1, 2, pal.shadow);
    } else if (twist === 3) {
      pRect(x, by - 1, 1, 2, pal.shadow);
    }
  }

  // Nó/Espiral ativo no ponto exato do progresso (splitX) puxando o fio solto!
  const knotBob = Math.round(Math.sin(tick * 0.3) * 1.5);
  pRect(splitX - 2, cy - 4 + knotBob, 5, 9, PALETTE.ink);
  pRect(splitX - 1, cy - 3 + knotBob, 3, 7, pal.main);
  pRect(splitX - 1, cy - 2 + knotBob + (Math.floor(tick / 3) % 3), 3, 2, pal.highlight);

  // Parte B (splitX + 2 .. trackEndX): O FIO SOLTO ONDULANDO sendo puxado para dentro do novelo!
  for (let x = splitX + 3; x < trackEndX; x++) {
    // Onda senoidal que viaja da direita para a esquerda (+ tick * 0.32) puxando o fio!
    const wave = Math.sin((x * 0.32) + (tick * 0.32)) * 2.4;
    const wy = cy + Math.round(wave);

    const fiberTick = (x + Math.floor(tick / 1.5)) % 4;
    // Contorno escuro embaixo do fio para destacar no fundo creme
    pRect(x, wy + 1, 1, 1, PALETTE.ink);
    // Fio colorido com fibras se movendo para a esquerda
    pRect(x, wy, 1, 1, fiberTick === 0 ? pal.shadow : (fiberTick === 2 ? pal.highlight : pal.main));
  }

  // 5. Efeitinhos 8-bit de movimento ("enrolando!") perto do novelo
  if (Math.floor(tick / 10) % 2 === 0) {
    pRect(ballCx - r - 2, ballCy - r + 1, 2, 1, pal.shadow);
    pRect(ballCx - r - 3, ballCy - r + 2, 1, 2, pal.shadow);
  } else {
    pRect(ballCx + r + 1, ballCy - r, 2, 1, pal.shadow);
    pRect(ballCx + r + 2, ballCy - r + 1, 1, 2, pal.shadow);
  }
}

// Renderizador da Cena Canvas 8-Bit (Grade virtual de 180 px x 120 px -> 360x240 em escala 2x)
class SceneCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.vWidth = 180;
    this.vHeight = 120;
    this.frameTick = 0;
    this.tailTick = 0;
    this.scale = 2;
    this.destroyed = false;

    this.initResize();
    this.startLoop();
  }

  initResize() {
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: 396, height: 240 };
    const w = Math.max(360, Math.floor(rect.width || 396));
    const h = 240;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.scale = Math.max(1, Math.min(Math.floor(w / this.vWidth), Math.floor(h / this.vHeight)));
  }

  startLoop() {
    const loop = () => {
      if (this.destroyed || !document.body.contains(this.canvas)) return;
      this.frameTick++;
      this.updateCatPhysics();
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // Descobre a atividade que a cliente está executando agora
  getActiveActivity() {
    if (state.activeExecutionId) {
      if (state.activeExecutionType === 'habit') {
        const h = state.habits.find(x => x.id === state.activeExecutionId);
        if (h) {
          const cat = detectTaskCategory(h);
          return {
            id: h.id,
            type: 'habit',
            title: h.title,
            category: cat,
            description: 'Executando hábito com a gatinha'
          };
        }
      } else {
        const occ = state.occurrences.find(x => x.id === state.activeExecutionId);
        if (occ) {
          const cat = detectTaskCategory(occ);
          return {
            id: occ.id,
            type: 'occurrence',
            title: occ.title,
            category: cat,
            description: 'Executando compromisso com a gatinha'
          };
        }
      }
    }

    // Se não há tarefa manual ativa, verifica se há compromisso agendado próximo do horário atual
    const now = Clock.newDate();
    const curTotalMin = now.getHours() * 60 + now.getMinutes();

    const matchingOcc = state.occurrences.find(o => {
      if (o.state === 'FEITO') return false;
      const parts = o.time.split(':').map(Number);
      if (isNaN(parts[0])) return false;
      const occMin = parts[0] * 60 + (parts[1] || 0);
      return Math.abs(curTotalMin - occMin) <= 45;
    });

    if (matchingOcc) {
      return {
        id: matchingOcc.id,
        type: 'occurrence',
        title: matchingOcc.title,
        category: detectTaskCategory(matchingOcc),
        description: 'No horário do compromisso',
        isAutoScheduled: true
      };
    }

    // Verifica se é horário de descanso / sono da usuária (briefing)
    if (state.briefing && state.briefing.sleepTime && state.briefing.wakeTime) {
      const sleepParts = state.briefing.sleepTime.split(':').map(Number);
      const wakeParts = state.briefing.wakeTime.split(':').map(Number);
      const sleepMin = sleepParts[0] * 60 + (sleepParts[1] || 0);
      const wakeMin = wakeParts[0] * 60 + (wakeParts[1] || 0);
      if (curTotalMin >= sleepMin || curTotalMin < wakeMin) {
        return {
          id: 'sleep',
          type: 'routine',
          title: 'Hora do Sono & Descanso',
          category: 'DESCANSO_SONO',
          description: 'Gatinha dormindo na caminha',
          isAutoScheduled: true
        };
      }
    }

    return null;
  }

  updateCatPhysics() {
    const cat = state.cat;
    const activity = this.getActiveActivity();

    // Se houver atividade em execução, define o posto correto no quarto!
    if (activity) {
      let targetPost = { x: 90, y: 88, name: 'Tapete de Treino' };
      if (activity.category === 'ESTUDO') {
        targetPost = { x: 46, y: 76, name: 'Estante de Estudos' };
      } else if (activity.category === 'TRABALHO') {
        targetPost = { x: 132, y: 72, name: 'Escrivaninha de Trabalho' };
      } else if (activity.category === 'CASA') {
        targetPost = { x: 70, y: 92, name: 'Organização da Casa' };
      } else if (activity.category === 'COMENDO_BEBENDO') {
        targetPost = { x: 126, y: 88, name: 'Tigelinha' };
      } else if (activity.category === 'DESCANSO_SONO') {
        targetPost = { x: 122, y: 104, name: 'Caminha Rosa' };
      }

      cat.targetX = targetPost.x;
      cat.targetY = targetPost.y;
      cat.stationName = targetPost.name;
    }

    // Animação da cauda
    if (this.frameTick % 10 === 0) {
      this.tailTick = (this.tailTick + 1) % 4;
    }

    // Animação da patinha
    if (this.frameTick % 7 === 0) {
      cat.playPawFrame = (cat.playPawFrame + 1) % 4;
    }

    // Movimento de caminhada pelo ambiente até o posto da tarefa
    const dx = cat.targetX - cat.x;
    const dy = cat.targetY - cat.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1.2) {
      cat.isWalking = true;
      cat.facingRight = dx >= 0;
      const speed = 0.55;
      cat.x += (dx / dist) * speed;
      cat.y += (dy / dist) * speed;

      if (this.frameTick % 6 === 0) {
        cat.walkFrame = (cat.walkFrame + 1) % 4;
      }
    } else {
      cat.isWalking = false;
      cat.walkFrame = 0;
      cat.waitTicks++;

      // Quando não há tarefa ativa, passeia livremente após alguns segundos
      if (!activity && cat.waitTicks > 210) {
        cat.waitTicks = 0;
        this.pickNextWaypoint();
      }
    }
  }

  pickNextWaypoint() {
    const cat = state.cat;
    const candidates = ROOM_WAYPOINTS.filter(w => Math.hypot(w.x - cat.x, w.y - cat.y) > 25);
    const next = candidates[Math.floor(Math.random() * candidates.length)] || ROOM_WAYPOINTS[0];
    cat.targetX = next.x;
    cat.targetY = next.y;
    cat.stationName = next.name;
    cat.waitTicks = 0;
  }

  walkToVirtualCoords(vx, vy, customLabel = 'Ponto escolhido') {
    state.activeExecutionId = null;
    state.activeExecutionType = null;
    state.cat.targetX = Math.max(32, Math.min(148, vx));
    state.cat.targetY = Math.max(72, Math.min(108, vy));
    state.cat.stationName = customLabel;
    state.cat.waitTicks = 0;
  }

  draw() {
    this.initResize();
    const ctx = this.ctx;
    const s = this.scale;
    const originX = Math.max(0, (this.canvas.width - this.vWidth * s) / 2);

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.imageSmoothingEnabled = false;

    function vRect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.floor(originX + x * s),
        Math.floor(y * s),
        Math.ceil(w * s),
        Math.ceil(h * s)
      );
    }

    // 1. Fundo da Sala (Parede Creme e Piso de Madeira)
    vRect(0, 0, 180, 44, PALETTE.wallCream);
    vRect(0, 44, 180, 2, PALETTE.ink);
    vRect(0, 46, 180, this.vHeight - 46, PALETTE.woodFloor);

    // Janela 8-bit com céu e nuvem
    vRect(74, 8, 32, 26, PALETTE.ink);
    vRect(76, 10, 28, 22, PALETTE.windowBlue);
    vRect(89, 10, 2, 22, PALETTE.ink);
    vRect(76, 20, 28, 2, PALETTE.ink);

    // Tapete Roxo Central (com marcação de treino)
    vRect(46, 66, 88, 42, PALETTE.cozyPurple);
    vRect(48, 68, 84, 38, '#6A5D90');

    // Estante de Estudo (Esquerda)
    vRect(12, 16, 28, 28, PALETTE.orangeShadow);
    vRect(14, 20, 24, 6, PALETTE.leafGreen);
    vRect(14, 30, 24, 6, PALETTE.alertRed);

    // Escrivaninha de Trabalho (Direita)
    vRect(136, 24, 32, 20, PALETTE.orangeShadow);
    vRect(144, 18, 14, 10, PALETTE.windowBlue);

    // Tigelinha de Ração
    vRect(148, 76, 14, 8, PALETTE.alertRed);
    vRect(150, 78, 10, 4, PALETTE.furCreamShadow);

    // Caminha da Gatinha
    vRect(136, 94, 34, 18, PALETTE.yarnPink);
    vRect(139, 97, 28, 12, PALETTE.furCreamShadow);

    // Meta selecionada e cor do novelo ativo
    const selectedGoal = getSelectedGoal();
    const yarnPalette = getYarnPalette(selectedGoal.yarnColorId);
    const woundFraction = getWoundFractionByTime(selectedGoal);

    // 2. Fuso / Novelo da Meta se Enrolando à medida que o tempo esgota
    const spoolCenterX = 24;
    const spoolCenterY = 96;
    this.drawWindingGoalSpool(vRect, spoolCenterX, spoolCenterY, yarnPalette, woundFraction);

    // 3. Atividade atual em execução
    const activity = this.getActiveActivity();

    // 4. Gatinha Calico executando a atividade espelho ou caminhando livre
    const catTopLeftX = Math.round(state.cat.x - 32);
    const catTopLeftY = Math.round(state.cat.y - 54);

    const pawYarnPos = this.drawCalicoCatWithYarnInPaws(
      vRect,
      catTopLeftX,
      catTopLeftY,
      yarnPalette,
      activity
    );

    // 5. Fio de Lã conectando o novelo na mão da gatinha ao novelo do tempo
    this.drawConnectingYarnThread(
      vRect,
      pawYarnPos.x,
      pawYarnPos.y,
      spoolCenterX,
      spoolCenterY,
      yarnPalette
    );
  }

  // Desenha o Novelo do Tempo que vai se enrolando conforme o tempo da meta esgota
  drawWindingGoalSpool(vRect, cx, cy, yarnPalette, woundFraction) {
    vRect(cx - 14, cy + 8, 28, 6, PALETTE.ink);
    vRect(cx - 13, cy + 9, 26, 4, PALETTE.furCreamShadow);

    const radius = Math.round(4 + woundFraction * 8);
    const d = radius * 2;
    const left = cx - radius;
    const top = cy - radius + 2;

    vRect(left - 1, top - 1, d + 2, d + 2, PALETTE.ink);
    vRect(left, top, d, d, yarnPalette.main);

    const spinOffset = Math.floor(this.frameTick / 10) % 3;
    for (let r = 2; r < radius; r += 3) {
      vRect(cx - r + spinOffset - 1, cy - r + 2, r * 2, 1, yarnPalette.shadow);
      vRect(cx - r, cy + r - spinOffset + 1, r * 2, 1, yarnPalette.highlight);
    }
  }

  // Desenha o fio ligando o novelo na patinha da gatinha ao novelo do tempo
  drawConnectingYarnThread(vRect, x1, y1, x2, y2, yarnPalette) {
    const steps = 18;
    const wavePhase = this.frameTick * 0.15;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(x1 + (x2 - x1) * t);
      const sag = Math.sin(t * Math.PI) * 6 + Math.sin(wavePhase + t * 6) * 1.5;
      const py = Math.round(y1 + (y2 - y1) * t + sag);
      vRect(px, py, 2, 2, i % 4 === 0 ? yarnPalette.shadow : yarnPalette.main);
    }
  }

  // Desenha a Gatinha Calico com ANIMAÇÃO DEDICADA DA ATIVIDADE EM EXECUÇÃO
  drawCalicoCatWithYarnInPaws(vRect, x, y, yarnPalette, activity) {
    const isWalking = state.cat.isWalking;
    const walkFrame = state.cat.walkFrame;
    const facingRight = state.cat.facingRight;
    const catCategory = activity ? activity.category : 'LIVRE_NOVELO';

    // Movimento vertical do corpo
    let strideBob = 0;
    if (isWalking) {
      strideBob = (walkFrame % 2 === 1 ? -2 : 0);
    } else if (catCategory === 'TREINO') {
      // Pulinho rítmico do treino de calistenia/exercício!
      strideBob = (this.frameTick % 20 < 10) ? -4 : 0;
    } else {
      strideBob = ((this.frameTick % 24 < 12) ? 1 : 0);
    }
    const by = y + strideBob;

    // Sombra no chão
    vRect(x + 16, y + 55, 32, 4, 'rgba(24, 20, 37, 0.35)');

    // 1. Cauda tricolor animada
    const tailOff = (this.tailTick === 1) ? 2 : (this.tailTick === 3 ? -2 : 0);
    const tailX = facingRight ? (x + 10) : (x + 44);
    vRect(tailX, by + 38 + tailOff, 8, 10, PALETTE.ink);
    vRect(tailX + 1, by + 39 + tailOff, 6, 4, PALETTE.grayDark);
    vRect(tailX + 1, by + 43 + tailOff, 6, 4, PALETTE.orange);

    // 2. Orelhas Calico
    vRect(x + 18, by + 10, 9, 8, PALETTE.ink);
    vRect(x + 19, by + 11, 7, 6, PALETTE.grayDark);
    vRect(x + 21, by + 13, 4, 4, PALETTE.yarnPink);

    vRect(x + 37, by + 10, 9, 8, PALETTE.ink);
    vRect(x + 38, by + 11, 7, 6, PALETTE.orange);
    vRect(x + 39, by + 13, 4, 4, PALETTE.yarnPink);

    // 3. Cabeça Calico
    vRect(x + 16, by + 17, 32, 18, PALETTE.ink);
    vRect(x + 17, by + 18, 30, 16, PALETTE.furWhite);
    vRect(x + 17, by + 18, 10, 8, PALETTE.grayDark);
    vRect(x + 37, by + 18, 10, 8, PALETTE.orange);

    const faceShift = facingRight ? 2 : -2;

    // Bochechas e focinho
    vRect(x + 20 + faceShift, by + 28, 4, 2, PALETTE.yarnPink);
    vRect(x + 40 + faceShift, by + 28, 4, 2, PALETTE.yarnPink);
    vRect(x + 31 + faceShift, by + 27, 2, 2, PALETTE.yarnPinkDark);

    // Boquinha
    vRect(x + 29 + faceShift, by + 29, 2, 2, PALETTE.ink);
    vRect(x + 33 + faceShift, by + 29, 2, 2, PALETTE.ink);

    // Olhos
    const isSleeping = (catCategory === 'DESCANSO_SONO');
    const isBlinking = (this.frameTick % 120 > 113);
    if (isSleeping || isBlinking || state.cat.mood === 'SONOLENTA') {
      vRect(x + 23 + faceShift, by + 26, 4, 1, PALETTE.ink);
      vRect(x + 37 + faceShift, by + 26, 4, 1, PALETTE.ink);
    } else {
      vRect(x + 24 + faceShift, by + 24, 2, 4, PALETTE.ink);
      vRect(x + 38 + faceShift, by + 24, 2, 4, PALETTE.ink);
    }

    // 4. Tronco
    vRect(x + 18, by + 35, 28, 16, PALETTE.ink);
    vRect(x + 19, by + 36, 26, 14, PALETTE.furWhite);
    vRect(x + 20, by + 38, 7, 6, PALETTE.orange);

    // 5. Patinhas Traseiras
    const legLiftA = isWalking ? (walkFrame === 0 ? -3 : (walkFrame === 2 ? 1 : 0)) : 0;
    const legLiftB = isWalking ? (walkFrame === 2 ? -3 : (walkFrame === 0 ? 1 : 0)) : 0;
    const legShiftA = isWalking ? (walkFrame === 0 ? 2 : (walkFrame === 2 ? -2 : 0)) : 0;
    const legShiftB = isWalking ? (walkFrame === 2 ? 2 : (walkFrame === 0 ? -2 : 0)) : 0;

    vRect(x + 19 + legShiftA, by + 49 + legLiftA, 6, 8, PALETTE.ink);
    vRect(x + 20 + legShiftA, by + 49 + legLiftA, 4, 7, PALETTE.furWhite);

    vRect(x + 39 + legShiftB, by + 49 + legLiftB, 6, 8, PALETTE.ink);
    vRect(x + 40 + legShiftB, by + 49 + legLiftB, 4, 7, PALETTE.furWhite);

    vRect(x + 26 - legShiftB, by + 50 + legLiftB, 6, 8, PALETTE.ink);
    vRect(x + 27 - legShiftB, by + 50 + legLiftB, 4, 7, PALETTE.furWhite);

    // 6. Patinha Dianteira e Novelo
    const pawPlayWave = (state.cat.playPawFrame % 2 === 0) ? -2 : 2;
    const handX = facingRight ? (x + 42) : (x + 14);
    const handY = by + 42 + pawPlayWave;

    vRect(handX, handY, 8, 6, PALETTE.ink);
    vRect(handX + 1, handY + 1, 6, 4, PALETTE.furWhite);
    vRect(handX + (facingRight ? 5 : 1), handY + 1, 2, 4, PALETTE.orange);

    // Novelo da meta selecionada
    const yarnBounce = (state.cat.playPawFrame === 1) ? -3 : (state.cat.playPawFrame === 3 ? 2 : 0);
    const yarnX = facingRight ? (handX + 5) : (handX - 9);
    const yarnY = handY + 1 + yarnBounce;

    vRect(yarnX, yarnY, 12, 12, PALETTE.ink);
    vRect(yarnX + 1, yarnY + 1, 10, 10, yarnPalette.main);
    const stripeShift = state.cat.playPawFrame % 3;
    vRect(yarnX + 2 + stripeShift, yarnY + 3, 5, 2, yarnPalette.shadow);
    vRect(yarnX + 3, yarnY + 6 + (stripeShift % 2), 6, 2, yarnPalette.shadow);
    vRect(yarnX + 2, yarnY + 2, 3, 2, yarnPalette.highlight);

    // ==========================================
    // ANIMAÇÕES VIVAS ESPECÍFICAS DA TAREFA:
    // ==========================================

    if (catCategory === 'ESTUDO') {
      // 👓 Óculos 8-bit de leitura na gatinha
      vRect(x + 21 + faceShift, by + 22, 6, 6, PALETTE.ink);
      vRect(x + 22 + faceShift, by + 23, 4, 4, '#cce7ff');
      vRect(x + 35 + faceShift, by + 22, 6, 6, PALETTE.ink);
      vRect(x + 36 + faceShift, by + 23, 4, 4, '#cce7ff');
      vRect(x + 27 + faceShift, by + 24, 8, 2, PALETTE.ink);

      // 📖 Livro Aberto com páginas folheando
      const bookX = facingRight ? (x + 36) : (x + 12);
      const bookY = by + 46;
      vRect(bookX, bookY, 18, 12, PALETTE.ink);
      vRect(bookX + 1, bookY + 1, 7, 10, '#fffbf0');
      vRect(bookX + 9, bookY + 1, 7, 10, '#fffbf0');
      vRect(bookX + 8, bookY + 1, 1, 10, PALETTE.grayDark);
      // Linhas de texto pixel art
      vRect(bookX + 2, bookY + 3, 5, 1, PALETTE.grayDark);
      vRect(bookX + 2, bookY + 5, 5, 1, PALETTE.grayDark);
      vRect(bookX + 10, bookY + 3, 5, 1, PALETTE.grayDark);
      vRect(bookX + 10, bookY + 5, 5, 1, PALETTE.grayDark);

      // Página virando animada
      if (this.frameTick % 40 < 12) {
        vRect(bookX + 8, bookY - 2, 4, 8, '#f5ecd8');
      }
    } else if (catCategory === 'TREINO') {
      // 🏃‍♀️ Faixa esportiva vermelha de treino na cabeça
      vRect(x + 16, by + 16, 32, 4, PALETTE.alertRed);
      vRect(tailX - 2, by + 14, 5, 6, PALETTE.alertRed); // nó da faixa

      // Gotinhas de esforço e energia saindo da cabecinha
      const sweatTick = (this.frameTick % 16);
      vRect(x + 12, by + 12 - sweatTick, 3, 3, PALETTE.windowBlue);
      vRect(x + 48, by + 12 - ((sweatTick + 8) % 16), 3, 3, PALETTE.windowBlue);

      // Patinha erguida no salto
      if (strideBob < 0) {
        vRect(handX, handY - 6, 6, 6, PALETTE.furWhite);
      }
    } else if (catCategory === 'TRABALHO') {
      // 💻 Notebook 8-bit aberto na escrivaninha
      const laptopX = facingRight ? (x + 40) : (x + 10);
      const laptopY = by + 42;
      vRect(laptopX, laptopY - 6, 16, 12, PALETTE.ink);
      vRect(laptopX + 1, laptopY - 5, 14, 10, PALETTE.windowBlue);
      // Linhas de código piscando
      vRect(laptopX + 3, laptopY - 3, 7, 1, PALETTE.leafGreen);
      vRect(laptopX + 3, laptopY - 1, 5, 1, PALETTE.orange);
      vRect(laptopX + 3, laptopY + 1, 9, 1, PALETTE.leafGreen);
      // Tecladinho
      vRect(laptopX - 2, laptopY + 6, 18, 4, PALETTE.ink);
      vRect(laptopX - 1, laptopY + 7, 16, 2, PALETTE.grayDark);

      // Patinhas digitando alternadamente
      const typeAlt = (this.frameTick % 8 < 4);
      vRect(laptopX + 2, laptopY + 5 + (typeAlt ? -1 : 1), 4, 3, PALETTE.furWhite);
      vRect(laptopX + 8, laptopY + 5 + (typeAlt ? 1 : -1), 4, 3, PALETTE.furWhite);

      // ☕ Xícara de café com fumacinha
      vRect(laptopX + 20, laptopY + 4, 6, 7, PALETTE.yarnPink);
      vRect(laptopX + 21, laptopY + 1 - (this.frameTick % 8), 2, 2, 'rgba(255,255,255,0.7)');
    } else if (catCategory === 'CASA') {
      // 🧹 Vassourinha de palha varrendo o chão
      const broomAngle = Math.sin(this.frameTick * 0.2) * 4;
      const broomX = (facingRight ? (x + 44) : (x + 14)) + broomAngle;
      const broomY = by + 34;
      // Cabo
      vRect(broomX, broomY - 6, 3, 18, PALETTE.orangeShadow);
      // Cerdas de palha
      vRect(broomX - 4, broomY + 12, 11, 7, '#E0BA62');
      vRect(broomX - 5, broomY + 18, 13, 2, PALETTE.ink);

      // ✨ Brilhinhos de limpeza subindo
      const sparkleA = (this.frameTick % 18);
      vRect(x + 8 + sparkleA * 2, by + 50 - sparkleA, 3, 3, PALETTE.goldHighlight);
    } else if (catCategory === 'COMENDO_BEBENDO') {
      // 💧 Tigelinha com água/ração e coraçõezinhos rosas
      const heartTick = (this.frameTick % 20);
      vRect(x + 42, by + 18 - heartTick, 4, 4, PALETTE.yarnPink);
    } else if (catCategory === 'DESCANSO_SONO') {
      // 💤 "Z z z" subindo em direção ao teto
      const zPhase = (this.frameTick % 40);
      vRect(x + 38 + (zPhase / 3), by + 10 - zPhase, 5, 5, PALETTE.cozyPurple);
      vRect(x + 44 + (zPhase / 3), by + 4 - zPhase, 4, 4, PALETTE.cozyPurple);
    }

    // 8. Acessórios Equipados Visíveis no Sprite
    if (state.cat.equipped.includes('laco_rosa')) {
      vRect(x + 37, by + 12, 6, 5, PALETTE.ink);
      vRect(x + 38, by + 13, 4, 3, PALETTE.yarnPink);
    }
    if (state.cat.equipped.includes('coroa_ouro')) {
      // Coroa dourada real com rubi brilhando
      vRect(x + 23, by + 7, 18, 3, PALETTE.ink);
      vRect(x + 24, by + 8, 16, 2, PALETTE.goldHighlight);
      vRect(x + 23, by + 3, 4, 5, PALETTE.goldHighlight);
      vRect(x + 30, by + 1, 4, 7, PALETTE.goldHighlight);
      vRect(x + 37, by + 3, 4, 5, PALETTE.goldHighlight);
      vRect(x + 31, by + 4, 2, 2, PALETTE.alertRed);
    }
    if (state.cat.equipped.includes('chapeu_mago')) {
      // Chapéu místico de bruxinha/mago com estrelinha
      vRect(x + 18, by + 8, 28, 4, PALETTE.ink);
      vRect(x + 19, by + 9, 26, 2, PALETTE.cozyPurple);
      vRect(x + 24, by + 2, 16, 6, PALETTE.cozyPurple);
      vRect(x + 28, by - 4, 8, 6, PALETTE.cozyPurple);
      vRect(x + 31, by - 8, 4, 4, PALETTE.goldHighlight);
    }
    if (state.cat.equipped.includes('coleira_sino')) {
      // Coleira vermelha no pescoço com sininho dourado
      vRect(x + 21, by + 34, 22, 3, PALETTE.alertRed);
      vRect(x + 30, by + 36, 4, 4, PALETTE.goldHighlight);
      vRect(x + 31, by + 39, 2, 1, PALETTE.ink);
    }
    if (state.cat.equipped.includes('oculos_escuros')) {
      // Óculos escuros pixel art com brilho reflexivo
      vRect(x + 21 + faceShift, by + 22, 9, 7, PALETTE.ink);
      vRect(x + 22 + faceShift, by + 23, 7, 5, '#1e1c2b');
      vRect(x + 23 + faceShift, by + 23, 2, 2, '#ffffff');
      vRect(x + 34 + faceShift, by + 22, 9, 7, PALETTE.ink);
      vRect(x + 35 + faceShift, by + 23, 7, 5, '#1e1c2b');
      vRect(x + 36 + faceShift, by + 23, 2, 2, '#ffffff');
      vRect(x + 30 + faceShift, by + 24, 4, 2, PALETTE.ink);
    }

    return { x: yarnX + 6, y: yarnY + 6 };
  }
}

// UI Controller Principal
class AppUI {
  persist() {
    saveStateToDeviceStorage();
  }

  constructor() {
    this.contentEl = document.getElementById('app-content');
    this.navEl = document.getElementById('bottom-nav');
    this.togglesEl = document.getElementById('module-toggles-container');
    this.sceneInstance = null;

    this.initSidebarControls();
    this.initModuleToggles();
    this.renderNav();
    this.renderActiveTab();
    this.updateHUD();
    this.startAnticsRotation();
    this.startGoalTimeCountdown();
    this.startWindingYarnCanvasesLoop();
    this.applyAccessibilityClasses();
    this.startReminderCheckerLoop();
    syncNativeBlocker();
    this.checkNativeCompletedTasks();
    this.syncNativeReminders();
    this.checkAppUpdate();
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkNativeCompletedTasks();
        this.syncNativeReminders();
        if (state.activeTab === 'foco' || state.activeTab === 'mais') this.renderActiveTab();
      }
    });
  }

  // Loop de animação dedicado para todos os novelos enrolando o fio (30 FPS)
  startWindingYarnCanvasesLoop() {
    let yarnAnimTick = 0;
    const loop = () => {
      yarnAnimTick++;
      document.querySelectorAll('.novelo-winding-canvas').forEach(canvas => {
        const goalId = canvas.getAttribute('data-goal-id');
        const goal = state.goals.find(g => g.id === goalId) || getSelectedGoal();
        drawWindingYarnCanvas(canvas, goal, yarnAnimTick);
      });
      document.querySelectorAll('.mini-yarn-canvas').forEach(canvas => {
        const colorId = canvas.getAttribute('data-color') || 'pink';
        drawMiniYarnBallCanvas(canvas, colorId, yarnAnimTick);
      });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  initSidebarControls() {
    const meowBtn = document.getElementById('btn-sound-meow');
    if (meowBtn) meowBtn.onclick = () => audio.playMeowGreeting();
    const purrBtn = document.getElementById('btn-sound-purr');
    if (purrBtn) purrBtn.onclick = () => audio.playPurr();
    const muteChk = document.getElementById('chk-audio-mute');
    if (muteChk) {
      muteChk.onchange = (e) => {
        audio.muted = e.target.checked;
      };
    }

    const btnWalk = document.getElementById('btn-walk-next');
    if (btnWalk) {
      btnWalk.onclick = () => {
        if (this.sceneInstance) {
          this.sceneInstance.pickNextWaypoint();
          audio.playStep();
        }
      };
    }

    const btnAdvance = document.getElementById('btn-advance-time');
    if (btnAdvance) {
      btnAdvance.onclick = () => {
        this.advanceGoalsTime(15 * 60); // Avança 15 minutos
      };
    }

    const btnAdvanceDay = document.getElementById('btn-advance-day');
    if (btnAdvanceDay) {
      btnAdvanceDay.onclick = () => {
        this.advanceGoalsTime(86400); // Avança 1 dia
      };
    }
  }

  // Relógio em tempo real que faz o tempo das metas esgotar e o novelo se enrolar
  startGoalTimeCountdown() {
    let tickCount = 0;
    setInterval(() => {
      if (state.cat.isRestMode) return;
      state.goals.forEach(g => {
        if (g.remainingSeconds > 0) {
          g.remainingSeconds = Math.max(0, g.remainingSeconds - 1);
        }
      });
      this.refreshLiveTimersInDOM();
      tickCount++;
      if (tickCount % 10 === 0) {
        this.persist();
      }
    }, 1000);
  }

  advanceGoalsTime(secondsDelta) {
    state.goals.forEach(g => {
      g.remainingSeconds = Math.max(0, g.remainingSeconds - secondsDelta);
    });
    const sel = getSelectedGoal();
    const pct = Math.round(getWoundFractionByTime(sel) * 100);
    audio.playBlip();
    const remStr = formatRemainingTime(sel.remainingSeconds);
    if (state.activeTab === 'hoje' || state.activeTab === 'metas') {
      this.renderActiveTab();
    }
    this.persist();
  }

  refreshLiveTimersInDOM() {
    state.goals.forEach(g => {
      const timerEl = document.getElementById(`goal-timer-${g.id}`);
      const barEl = document.getElementById(`goal-timebar-${g.id}`);
      const pctEl = document.getElementById(`goal-timepct-${g.id}`);
      const woundPct = Math.round(getWoundFractionByTime(g) * 100);
      if (timerEl) timerEl.textContent = formatRemainingTime(g.remainingSeconds);
      if (barEl) barEl.style.width = `${woundPct}%`;
      if (pctEl) pctEl.textContent = `${woundPct}% enrolado`;
    });
  }

  selectGoalYarn(goalId) {
    state.selectedGoalId = goalId;
    const goal = getSelectedGoal();
    const palette = getYarnPalette(goal.yarnColorId);
    const woundPct = Math.round(getWoundFractionByTime(goal) * 100);
    audio.playMeowGreeting();
    this.renderActiveTab();
    this.persist();
  }

  initModuleToggles() {
    if (!this.togglesEl) return;
    const modules = [
      { key: 'HOJE', label: 'Hoje · Cena & Checklist', lock: true },
      { key: 'AGENDA', label: 'Agenda & Prazos' },
      { key: 'HABITOS', label: 'Hábitos & Sequências' },
      { key: 'METAS', label: 'Metas & Novelos' },
      { key: 'METAS_PASSOS', label: 'Metas com Passos' },
      { key: 'COMPROMISSOS', label: 'Compromissos & Check-in' },
      { key: 'LOG_SEMANAL', label: 'Log Semanal & Carta' },
      { key: 'INSIGHTS', label: 'O Fio & Insights' },
      { key: 'LOJA', label: 'Lojinha & Cosméticos' },
      { key: 'CONVERSA', label: 'Chat & Diálogo' },
      { key: 'FOCO', label: 'Foco & Bloqueio' }
    ];

    this.togglesEl.innerHTML = '';
    modules.forEach(m => {
      const row = document.createElement('div');
      row.className = `mod-toggle-item ${m.lock ? 'disabled-row' : ''}`;
      row.innerHTML = `
        <span>${m.label} ${m.lock ? '· Núcleo' : ''}</span>
        <input type="checkbox" ${state.flags[m.key] ? 'checked' : ''} ${m.lock ? 'disabled' : ''}>
      `;
      const input = row.querySelector('input');
      if (input) {
        input.onchange = () => {
          state.flags[m.key] = input.checked;
          if (m.key === 'FOCO') {
            state.flags.foco = input.checked;
            if (typeof minuteBankEngine !== 'undefined') {
              minuteBankEngine.syncWithNative(state);
            }
          }
          const anticStrip = document.getElementById('yarn-antic-strip');
          if (anticStrip && m.key === 'NOVELO_GRACINHAS') {
            anticStrip.style.display = input.checked ? 'flex' : 'none';
          }
          if (!state.flags[state.activeTab.toUpperCase()]) {
            state.activeTab = 'hoje';
          }
          this.renderNav();
          this.renderActiveTab();
        };
      }
      this.togglesEl.appendChild(row);
    });
  }

  updateHUD() {
    document.getElementById('val-fish').textContent = state.currencies.peixinhos;
    document.getElementById('val-gold').textContent = state.currencies.novelosDourados;
    document.getElementById('val-bond').textContent = state.currencies.vinculo;
    document.getElementById('hud-daykey').textContent = `Dia: ${state.dayKey}`;
  }

  renderNav() {
    // 5 Abas Ergonômicas que cabem em qualquer celular de 360px sem rolagem!
    const navItems = [
      { id: 'hoje', icon: '🏠', label: 'Hoje', matchTabs: ['hoje'] },
      { id: 'rotina', icon: '📅', label: 'Rotina', matchTabs: ['rotina', 'agenda', 'habitos'] },
      { id: 'metas', icon: '🎯', label: 'Metas', matchTabs: ['metas'] },
      { id: 'loja', icon: '🐱', label: 'Gatinha', matchTabs: ['loja'] },
      { id: 'mais', icon: '✨', label: 'Mais', matchTabs: ['mais', 'insights', 'conversa', 'foco'] }
    ];

    this.navEl.innerHTML = '';
    navItems.forEach(item => {
      const isActive = item.matchTabs.includes(state.activeTab);
      const btn = document.createElement('div');
      btn.className = `nav-item ${isActive ? 'active' : ''}`;
      btn.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;
      btn.onclick = () => {
        state.activeTab = item.id;
        this.renderNav();
        this.renderActiveTab();
      };
      this.navEl.appendChild(btn);
    });
  }

  renderActiveTab() {
    if (this.sceneInstance) {
      this.sceneInstance.destroyed = true;
      this.sceneInstance = null;
    }
    if (state.briefing && state.briefing.active) {
      this.renderBriefingWizard();
      return;
    }
    this.checkDailyReplan();
    switch (state.activeTab) {
      case 'hoje': this.renderTabHoje(); break;
      case 'rotina':
      case 'agenda':
      case 'habitos':
        if (state.activeTab === 'agenda') state.rotinaSubTab = 'agenda';
        if (state.activeTab === 'habitos') state.rotinaSubTab = 'habitos';
        this.renderTabRotina();
        break;
      case 'metas': this.renderTabMetas(); break;
      case 'loja': this.renderTabLoja(); break;
      case 'mais':
      case 'insights':
      case 'conversa':
      case 'foco':
        if (state.activeTab === 'insights') state.maisSubTab = 'insights';
        if (state.activeTab === 'conversa') state.maisSubTab = 'conversa';
        if (state.activeTab === 'foco') state.maisSubTab = 'foco';
        this.renderTabMais();
        break;
      default:
        this.renderTabHoje();
    }
    this.renderGlobalBlockerModalOverlay();
  }

  renderTabHoje() {
    const selectedGoal = getSelectedGoal();
    const selectedPalette = getYarnPalette(selectedGoal.yarnColorId);
    const woundPct = Math.round(getWoundFractionByTime(selectedGoal) * 100);

    this.contentEl.innerHTML = `
      ${state.availableUpdate ? `
        <div class="pixel-card cream" style="border-left: 5px solid #27ae60; margin-bottom: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <span style="font-size: 13px;">🆕 Versão <strong>v${state.availableUpdate.version}</strong> disponível!</span>
          <div style="display: flex; gap: 6px;">
            <a href="${state.availableUpdate.url}" target="_blank" class="pixel-btn btn-sm btn-green" style="text-decoration:none;">Atualizar</a>
            <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.dismissUpdateBanner()">✕</button>
          </div>
        </div>
      ` : ''}
      <!-- Balão de Fala com a Gatinha -->
      <div class="speech-bubble-container">
        <div class="speech-bubble-box" id="speech-bubble-text">${state.cat.speechText}</div>
        <div class="speech-bubble-tail"></div>
      </div>

      <!-- Banner Dinâmico: Espelho da Rotina da Cliente -->
      ${(() => {
        let activeObj = null;
        if (state.activeExecutionId) {
          if (state.activeExecutionType === "habit") {
            const h = state.habits.find(x => x.id === state.activeExecutionId);
            if (h) activeObj = { id: h.id, type: "habit", title: h.title, cat: detectTaskCategory(h) };
          } else {
            const o = state.occurrences.find(x => x.id === state.activeExecutionId);
            if (o) activeObj = { id: o.id, type: "occurrence", title: o.title, cat: detectTaskCategory(o) };
          }
        }
        const catLabels = {
          ESTUDO: "📖 Estudando",
          TREINO: "🏃‍♀️ Treinando",
          TRABALHO: "💻 Trabalhando",
          CASA: "🧹 Cuidando da casa",
          COMENDO_BEBENDO: "💧 Comendo e bebendo",
          DESCANSO_SONO: "💤 Descansando"
        };
        const statusLabel = activeObj ? (catLabels[activeObj.cat] || "🐾 Focando com você") : "🧶 Modo Livre";

        return `
          <div class="pixel-card active-now-card" style="margin-bottom: 8px; border-left: 6px solid ${activeObj ? PALETTE.leafGreen : PALETTE.orange}; background: ${activeObj ? "#f0fff4" : "#fff"};">
            <div class="mobile-stack-card">
              <div class="mobile-stack-info">
                <span style="font-size: 11px; font-weight: 700; color: ${activeObj ? PALETTE.leafGreen : PALETTE.orange}; letter-spacing: 0.5px;">⚡ FAZENDO AGORA COM A GATINHA:</span>
                <div style="font-size: 16px; font-weight: 700; color: ${PALETTE.ink}; margin-top: 2px; line-height: 1.25;">
                  ${activeObj ? activeObj.title : "Nenhuma tarefa em execução manual"}
                </div>
                <span style="font-size: 13px; color: ${PALETTE.cozyPurple}; font-weight: 700; display: block; margin-top: 2px;">
                  ${statusLabel}
                </span>
              </div>
              ${activeObj
                ? `
                  <div class="mobile-action-grid-3">
                    <button class="pixel-btn btn-sm btn-green" onclick="${activeObj.type === "habit" ? `window.app.completeHabit('${activeObj.id}')` : `window.app.markDone('${activeObj.id}')`}">✓ Feito</button>
                    <button class="pixel-btn btn-sm btn-purple" onclick="window.app.openFocusTimer(25)" title="Iniciar temporizador Pomodoro">🧶 Pomodoro</button>
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.stopActiveExecution()" title="Pausar execução">⏸️ Pausar</button>
                  </div>
                `
                : ""
              }
            </div>
          </div>
        `;
      })()}

      <!-- Cena Canvas da Gatinha Caminhando e Brincando com o Novelo na Mão -->
      <div class="scene-canvas-container" id="scene-container">
        <canvas id="scene-canvas"></canvas>
      </div>

      <!-- Card de Replanejamento e Calibração -->
      ${this.renderReplanCard()}
      ${this.renderCalibrationCard()}

      <!-- Card do Briefing Mensal & Planejamento de Rotina -->
      <div class="pixel-card cream" style="border: 3px solid ${PALETTE.cozyPurple}; box-shadow: 3px 3px 0 ${PALETTE.cozyPurple};">
        <div class="mobile-stack-card">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px; flex-shrink: 0;">📝</span>
            <div style="flex: 1; min-width: 0;">
              <strong style="font-size: 15px; display: block;">Briefing Mensal · Rotina & Metas</strong>
              <span style="font-size: 12px; color: ${PALETTE.grayDark};">Último: ${state.briefing.lastCompletedDate} · Planeje ou edite sua rotina</span>
            </div>
          </div>
          <button class="pixel-btn btn-sm btn-purple" style="width: 100%; margin-top: 2px;" onclick="window.app.startBriefing()">
            📝 ${state.briefing.hasDoneOnce ? 'Editar Briefing Mensal' : 'Fazer Briefing Mensal'}
          </button>
        </div>
      </div>

      <!-- Seletor de Novelinhos por Meta (Muda a cor na mão da gatinha + Enrola com o tempo) -->
      <div class="goal-yarn-selector">
        <div class="goal-yarn-selector-title">
          <span>🧶 Novelo na Mão da Gatinha</span>
        </div>
        <div class="goal-yarn-chips">
          ${state.goals.map(g => {
            const isSel = g.id === state.selectedGoalId;
            return `
              <button class="yarn-chip ${isSel ? 'selected' : ''}" onclick="window.app.selectGoalYarn('${g.id}')">
                <canvas class="yarn-color-dot mini-yarn-canvas" width="22" height="22" data-color="${g.yarnColorId}"></canvas>
                <span>${g.title}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- Animação 8-bit do Novelo se Enrolando com o Fio à medida que o tempo da meta esgota -->
        <div class="novelo-bar-wrap" style="margin-top: 6px;">
          <div class="flex-row space-between">
            <span class="novelo-bar-label">⏳ Tempo restante: <strong id="goal-timer-${selectedGoal.id}">${formatRemainingTime(selectedGoal.remainingSeconds)}</strong></span>
            <span style="font-size: 15px; font-weight: 700; color: ${selectedPalette.shadow};" id="goal-timepct-${selectedGoal.id}">${woundPct}% enrolado</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
            <canvas class="novelo-winding-canvas" data-goal-id="${selectedGoal.id}" style="width: 100%; height: 50px;"></canvas>
            ${IS_RELEASE ? '' : `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <button class="pixel-btn btn-sm" onclick="window.app.advanceGoalsTime(900)" title="Avançar 15 minutos">⏳ Avançar 15m</button>
                <button class="pixel-btn btn-sm btn-gold" onclick="window.app.advanceGoalsTime(86400)" title="Avançar 1 dia">⏳ Avançar 1 Dia</button>
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Linha do Tempo Vertical Unificada do Dia (Compromissos + Hábitos) com Gestos Swipe -->
      <div class="pixel-card">
        <div class="mobile-stack-card" style="margin-bottom: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div>
              <h4 style="margin-bottom: 2px;">⏳ Linha do Tempo de Hoje · ${state.occurrences.filter(o => o.state === 'FEITO').length + state.habits.filter(h => h.completed).length} de ${state.occurrences.length + state.habits.length} feitos</h4>
              <span style="font-size: 12px; color: ${PALETTE.grayDark};">Compromissos e Hábitos ordenados por horário</span>
            </div>
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
              <button class="pixel-btn btn-sm btn-gold" onclick="window.app.openQuickCreateSheet('once')" title="Atividade que só vai fazer 1 ou 2 vezes">⚡ Avulsa</button>
              <button class="pixel-btn btn-sm btn-green" onclick="window.app.openQuickCreateSheet('occurrence')">＋ Criar</button>
            </div>
          </div>
        </div>

        <div class="swipe-hint-pill" style="margin: 8px 0;">
          👉 Deslize o card para a Direita para Concluir · Deslize para a Esquerda para Excluir
        </div>

        <div class="timeline-section-wrap" id="hoje-timeline-list">
          ${this.buildUnifiedTimelineHtml()}
        </div>
      </div>

      ${this.renderLockedAppsVaultCard('hoje')}

      <div class="pixel-card" style="margin-top: 12px; background: #fffdf5; border: 2px solid ${PALETTE.orange};">
        <div class="mobile-stack-card">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 20px;">🎁</span>
              <strong style="font-size: 15px; color: ${PALETTE.orange};">Mimos da Vida Real</strong>
            </div>
            <p style="font-size: 13px; color: ${PALETTE.ink}; margin: 4px 0 0 0;">
              Você acumulou <strong>${state.currencies.peixinhos} 🐟</strong>! Que tal se presentear com algo que você ama?
            </p>
          </div>
          <button class="pixel-btn btn-sm btn-gold" onclick="window.app.switchTab('loja')" style="width: 100%;">
            🎁 Ver Mimos & Me Presentear
          </button>
        </div>
      </div>
    `;

    // Renderiza Modal de Foco Pomodoro se estiver ativo
    if (state.focusTimer && state.focusTimer.active) {
      const s = state.focusTimer.remSec;
      const mins = Math.floor(s / 60);
      const remS = s % 60;
      const timeStr = `${String(mins).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
      const selG = getSelectedGoal();
      let activeTitle = 'Foco Produtivo';
      if (state.activeExecutionId) {
        if (state.activeExecutionType === 'habit') {
          const h = state.habits.find(x => x.id === state.activeExecutionId);
          if (h) activeTitle = h.title;
        } else {
          const occ = state.occurrences.find(x => x.id === state.activeExecutionId);
          if (occ) activeTitle = occ.title;
        }
      }

      const focusOverlayHtml = `
        <div class="simulated-overlay-backdrop" style="display: flex; align-items: center; justify-content: center;">
          <div class="pixel-card" style="max-width: 360px; width: 92%; margin: auto; text-align: center; border: 4px solid ${PALETTE.cozyPurple}; box-shadow: 6px 6px 0 ${PALETTE.cozyPurple}; background: #fffbf0;">
            <div class="flex-row space-between" style="align-items: center; border-bottom: 2px dashed ${PALETTE.ink}; padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-size: 16px; font-weight: 700; color: ${PALETTE.cozyPurple};">🧶 Foco · Puxar o Fio</span>
              <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.closeFocusTimer()">✕</button>
            </div>

            <div style="font-family: var(--font-short); font-size: 44px; color: ${PALETTE.cozyPurple}; font-weight: 700; margin: 8px 0; letter-spacing: 2px;" id="focus-live-timer">
              ${timeStr}
            </div>

            <div style="margin: 8px 0;">
              <canvas class="novelo-winding-canvas" data-goal-id="${selG.id}"></canvas>
            </div>

            <p style="font-size: 14px; color: ${PALETTE.ink}; margin: 6px 0;">
              Tarefa: <strong>${activeTitle}</strong>
            </p>
            <span style="font-size: 12px; color: ${PALETTE.grayDark};">A gatinha está concentrada no quarto puxando o fio com você!</span>

            <div class="flex-row" style="justify-content: center; gap: 6px; margin-top: 12px; flex-wrap: wrap;">
              <button class="pixel-btn btn-sm ${state.focusTimer.purrSound ? 'btn-purple' : 'btn-secondary'}" onclick="window.app.toggleFocusPurrSound()">
                ${state.focusTimer.purrSound ? '🔊 Ronrom: Ligado' : '🔈 Ronrom: Mudo'}
              </button>
              <button class="pixel-btn btn-sm ${state.focusTimer.isPaused ? 'btn-green' : 'btn-secondary'}" onclick="window.app.togglePauseFocus()">
                ${state.focusTimer.isPaused ? '▶️ Continuar' : '⏸️ Pausar'}
              </button>
              <button class="pixel-btn btn-sm btn-green" onclick="window.app.completeFocusEarly()">✓ Concluir (+15🐟)</button>
            </div>

            <div class="flex-row" style="justify-content: center; gap: 6px; margin-top: 10px;">
              <button class="preset-chip-btn ${state.focusTimer.totalSec === 900 ? 'active' : ''}" onclick="window.app.setFocusDuration(15)">15 Min</button>
              <button class="preset-chip-btn ${state.focusTimer.totalSec === 1500 ? 'active' : ''}" onclick="window.app.setFocusDuration(25)">25 Min (Pomodoro)</button>
              <button class="preset-chip-btn ${state.focusTimer.totalSec === 2700 ? 'active' : ''}" onclick="window.app.setFocusDuration(45)">45 Min</button>
            </div>
          </div>
        </div>
      `;

      const overlayContainer = document.createElement('div');
      overlayContainer.innerHTML = focusOverlayHtml;
      this.contentEl.appendChild(overlayContainer.firstElementChild);
    }

    // Inicia Canvas Interativo (Clique faz a gatinha caminhar até o ponto clicado e miar!)
    const canvas = document.getElementById('scene-canvas');
    if (canvas) {
      this.sceneInstance = new SceneCanvas(canvas);
      const container = document.getElementById('scene-container');
      container.onclick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scale = this.sceneInstance.scale;
        const originX = Math.max(0, (canvas.width - this.sceneInstance.vWidth * scale) / 2);
        const clickVx = Math.round((e.clientX - rect.left - originX) / scale);
        const clickVy = Math.round((e.clientY - rect.top) / scale) + 25;

        // Se tocou / clicou pertinho da gatinha, faz CARINHO HÁPTICO!
        const distToCat = Math.hypot(clickVx - state.cat.x, clickVy - state.cat.y);
        if (distToCat < 28) {
          if (navigator.vibrate) {
            navigator.vibrate([35, 45, 55, 45, 65]);
          }
          audio.playPurr();
          state.currencies.vinculo += 1;
          this.updateHUD();
          const purrQuotes = [
            "Ronrom... +1 Vínculo ♥",
            "Prrr... +1 Vínculo ♥",
            "Que gostoso! +1 Vínculo ♥",
            "Vamos vencer o dia juntas! +1 Vínculo ♥"
          ];
          this.setCatSpeech(purrQuotes[Math.floor(Math.random() * purrQuotes.length)]);
          this.persist();
          return;
        }

        this.sceneInstance.walkToVirtualCoords(clickVx, clickVy, 'Ponto tocado');
        audio.playMeowGreeting();
        const pal = getYarnPalette(getSelectedGoal().yarnColorId);
      };
    }
    this.attachSwipeListenersToTimeline();
    this.renderCommitmentModals();
  }

  setCatSpeech(text) {
    state.cat.speechText = text;
    const el = document.getElementById('speech-bubble-text');
    if (!el) return;

    el.textContent = '';
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        el.textContent += text[i];
        if (i % 2 === 0) audio.playBlip();
        i++;
      } else {
        clearInterval(timer);
      }
    }, 24);
  }

  unmarkDone(id) {
    this.undoCommitmentCheckIn(id, true);
    const occ = state.occurrences.find(o => o.id === id);
    if (occ) occ.state = "PENDENTE";
  }

  uncompleteHabit(id) {
    const h = state.habits.find(x => x.id === id);
    if (!h || !h.completed) return;
    h.completed = false;
    h.streak = Math.max(0, h.streak - 1);
    h.totalCheckIns = Math.max(0, (h.totalCheckIns || 1) - 1);
    state.currencies.peixinhos = Math.max(0, state.currencies.peixinhos - 8);
    state.currencies.vinculo = Math.max(0, state.currencies.vinculo - 8);
    audio.playBlip();
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  startActiveExecution(id, type = 'occurrence') {
    state.activeExecutionId = id;
    state.activeExecutionType = type;
    audio.playMeowCelebrate();

    let title = 'Atividade';
    let cat = 'TRABALHO';
    if (type === 'habit') {
      const h = state.habits.find(x => x.id === id);
      if (h) {
        h.startedAt = Clock.now();
        title = h.title;
        cat = detectTaskCategory(h);
      }
    } else {
      const occ = state.occurrences.find(x => x.id === id);
      if (occ) {
        occ.startedAt = Clock.now();
        title = occ.title;
        cat = detectTaskCategory(occ);
      }
    }

    const messages = {
      ESTUDO: `Vamos estudar "${title}" juntas! 📖`,
      TREINO: `Vamos treinar "${title}" juntas! 🏃‍♀️`,
      TRABALHO: `Foco total em "${title}"! 💻`,
      CASA: `Vamos organizar "${title}" juntas! 🧹`,
      COMENDO_BEBENDO: `Hora de "${title}"! 💧`,
      DESCANSO_SONO: `Hora de descansar: "${title}" 💤`
    };

    this.setCatSpeech(messages[cat] || `Fazendo "${title}" com você! ♥`);
    this.renderActiveTab();
    this.persist();
  }

  stopActiveExecution() {
    state.activeExecutionId = null;
    state.activeExecutionType = null;
    audio.playBlip();
    this.setCatSpeech("Tarefa pausada.");
    this.renderActiveTab();
    this.persist();
  }

  checkInLive(id) {
    const occ = state.occurrences.find(o => o.id === id);
    if (!occ) return;
    const isAlreadyDone = occ.state === 'FEITO' || occ.state === 'done';
    if (isAlreadyDone) return;

    const plannedStart = occ.plannedStart || `${occ.date || state.dayKey}T${occ.time || '12:00'}:00`;
    const actualIso = Clock.isoString();
    const plannedZone = occ.plannedZone || 'America/Sao_Paulo';

    let lateMinutes = 0;
    if (typeof commitmentStateMachine !== 'undefined' && commitmentStateMachine) {
      lateMinutes = commitmentStateMachine.calculateLateMinutes(plannedStart, actualIso, plannedZone);
    } else {
      const pEpoch = Date.parse(plannedStart);
      const aEpoch = Clock.now();
      lateMinutes = Math.round((aEpoch - pEpoch) / 60000);
    }

    occ.state = 'done';
    occ.completedAt = actualIso;
    occ.delayMin = lateMinutes;

    if (state.activeExecutionId === id) {
      if (occ.startedAt) {
        occ.actualDuration = Math.max(1, Math.round((Clock.now() - occ.startedAt) / 60000));
      }
      state.activeExecutionId = null;
      state.activeExecutionType = null;
    }
    if (!occ.actualDuration) {
      occ.actualDuration = occ.estimatedDuration || occ.plannedMinutes || (occ.effort === 'G' ? 60 : (occ.effort === 'M' ? 30 : 15));
    }
    this.recordDurationSample(occ);

    if (!state.checkIns) state.checkIns = [];
    const existingChk = state.checkIns.find(c => c.commitmentId === occ.id);
    const checkInRecord = existingChk || {
      id: 'chk_' + occ.id + '_' + Clock.now(),
      commitmentId: occ.id,
      actualAt: actualIso,
      retroactive: false,
      lateMinutes: lateMinutes
    };
    if (!existingChk) {
      state.checkIns.push(checkInRecord);
    }

    const tol = (state.commitmentsConfig && state.commitmentsConfig.punctuality) ? state.commitmentsConfig.punctuality.toleranceMinutes : 10;
    const isPunctual = lateMinutes <= tol;

    if (!state.rewardEvents) state.rewardEvents = [];
    if (typeof rewardLedgerEngine !== 'undefined' && rewardLedgerEngine) {
      const cfg = state.commitmentsConfig || (typeof CatLineCommitmentsConfig !== 'undefined' ? CatLineCommitmentsConfig.DEFAULT_CONFIG : {});
      const ledgerRes = rewardLedgerEngine.awardCommitmentDone(occ, checkInRecord, state.rewardEvents, cfg, state.dayKey);
      if (ledgerRes && ledgerRes.events) {
        state.rewardEvents.push(...ledgerRes.events);
        state.currencies.peixinhos += (ledgerRes.fishGranted || 0);
      }
      if (ledgerRes && ledgerRes.socialMinutesGranted > 0 && typeof minuteBankEngine !== 'undefined') {
        minuteBankEngine.creditMinutes(state, ledgerRes.socialMinutesGranted, 'Compromisso concluído', id);
      }
    } else {
      const rew = occ.reward || 10;
      state.currencies.peixinhos += rew;
      state.currencies.vinculo += rew;
      if (typeof minuteBankEngine !== 'undefined') {
        minuteBankEngine.creditMinutes(state, minuteBankEngine.MINUTES_PER_TASK, 'Compromisso concluído', id);
      }
    }

    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    if (isPunctual) {
      this.setCatSpeech('No prazo com carinho!');
    } else {
      this.setCatSpeech('Cumprido com carinho! O importante é continuar.');
    }

    this.promptStepCompletionIfLinked(occ);
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  promptStepCompletionIfLinked(occ) {
    if (!occ || !occ.stepId || !occ.goalId) return;
    const goal = (state.goals || []).find(g => g.id === occ.goalId);
    if (!goal || !goal.steps) return;
    const step = goal.steps.find(s => s.id === occ.stepId);
    if (!step || step.doneAt) return;

    state.activeStepPrompt = {
      commitmentId: occ.id,
      goalId: goal.id,
      stepId: step.id,
      stepTitle: step.title,
      goalTitle: goal.title
    };
  }

  confirmStepDoneFromCommitment(goalId, stepId) {
    const goal = (state.goals || []).find(g => g.id === goalId);
    if (!state.rewardEvents) state.rewardEvents = [];
    if (goal) {
      if (typeof goalStepEngine !== 'undefined' && goalStepEngine && typeof goalStepEngine.completeStep === 'function') {
        goalStepEngine.completeStep(goal, stepId);
      } else if (typeof goalStepEngine !== 'undefined' && goalStepEngine && typeof goalStepEngine.toggleStepDone === 'function') {
        goalStepEngine.toggleStepDone(goal, stepId);
      } else {
        const step = (goal.steps || []).find(s => s.id === stepId);
        if (step) {
          step.doneAt = Clock.isoString();
          if (typeof goalStepEngine !== 'undefined' && goalStepEngine && typeof goalStepEngine.calculateProgress === 'function') {
            goal.progress = goalStepEngine.calculateProgress(goal);
          }
        }
      }

      const activeRewardEngine = (typeof rewardLedgerEngine !== 'undefined' && rewardLedgerEngine)
        ? rewardLedgerEngine
        : (typeof CatLineRewardLedgerEngine !== 'undefined' ? (CatLineRewardLedgerEngine.rewardLedgerEngine || CatLineRewardLedgerEngine) : (typeof window !== 'undefined' && window.rewardLedgerEngine ? window.rewardLedgerEngine : null));

      if (activeRewardEngine) {
        const stepObj = (goal.steps || []).find(s => s.id === stepId) || { id: stepId, goalId: goal.id };
        const cfg = state.commitmentsConfig || (typeof CatLineCommitmentsConfig !== 'undefined' ? (CatLineCommitmentsConfig.DEFAULT_CONFIG || CatLineCommitmentsConfig) : {});
        const stepRes = activeRewardEngine.awardStepDone(stepObj, state.rewardEvents, cfg, state.dayKey);
        if (stepRes && stepRes.events) {
          state.rewardEvents.push(...stepRes.events);
          state.currencies.peixinhos += (stepRes.fishGranted || 0);
        }
      }
    }
    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.setCatSpeech('Passo concluído com carinho!');
    state.activeStepPrompt = null;
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  closeStepPromptDialog() {
    state.activeStepPrompt = null;
    audio.playBlip();
    this.renderActiveTab();
  }

  openRetroCheckInDialog(id) {
    const occ = state.occurrences.find(o => o.id === id);
    if (!occ) return;
    state.activeRetroModal = {
      commitmentId: id,
      title: occ.title,
      time: occ.time || '18:00'
    };
    audio.playBlip();
    this.renderActiveTab();
  }

  closeRetroCheckInDialog() {
    state.activeRetroModal = null;
    audio.playBlip();
    this.renderActiveTab();
  }

  confirmRetroCheckIn(id, actualTime) {
    const occ = state.occurrences.find(o => o.id === id);
    if (!occ) return;
    const isAlreadyDone = occ.state === 'FEITO' || occ.state === 'done';
    if (isAlreadyDone) return;

    const timeVal = actualTime || (document.getElementById('retro-checkin-time-input') ? document.getElementById('retro-checkin-time-input').value : (occ.time || '18:00'));
    const dateVal = occ.date || state.dayKey;
    const actualIso = `${dateVal}T${timeVal}:00`;
    const plannedStart = occ.plannedStart || `${dateVal}T${occ.time || '12:00'}:00`;
    const plannedZone = occ.plannedZone || 'America/Sao_Paulo';

    let lateMinutes = 0;
    if (typeof commitmentStateMachine !== 'undefined' && commitmentStateMachine) {
      lateMinutes = commitmentStateMachine.calculateLateMinutes(plannedStart, actualIso, plannedZone);
    } else {
      const pEpoch = Date.parse(plannedStart);
      const aEpoch = Date.parse(actualIso);
      lateMinutes = Math.round((aEpoch - pEpoch) / 60000);
    }

    occ.state = 'done';
    occ.completedAt = actualIso;
    occ.delayMin = lateMinutes;

    if (!occ.actualDuration) {
      occ.actualDuration = occ.estimatedDuration || occ.plannedMinutes || (occ.effort === 'G' ? 60 : (occ.effort === 'M' ? 30 : 15));
    }
    this.recordDurationSample(occ);

    const checkInRecord = {
      id: 'chk_' + occ.id + '_' + Clock.now(),
      commitmentId: occ.id,
      actualAt: actualIso,
      retroactive: true,
      lateMinutes: lateMinutes
    };
    if (!state.checkIns) state.checkIns = [];
    state.checkIns.push(checkInRecord);

    if (!state.rewardEvents) state.rewardEvents = [];
    if (typeof rewardLedgerEngine !== 'undefined' && rewardLedgerEngine) {
      const cfg = state.commitmentsConfig || (typeof CatLineCommitmentsConfig !== 'undefined' ? CatLineCommitmentsConfig.DEFAULT_CONFIG : {});
      const ledgerRes = rewardLedgerEngine.awardCommitmentDone(occ, checkInRecord, state.rewardEvents, cfg, state.dayKey);
      if (ledgerRes && ledgerRes.events) {
        state.rewardEvents.push(...ledgerRes.events);
        state.currencies.peixinhos += (ledgerRes.fishGranted || 0);
      }
    } else {
      const half = Math.round((occ.reward || 10) * 0.5);
      state.currencies.peixinhos += half;
      state.currencies.vinculo += half;
    }

    state.activeRetroModal = null;
    audio.playMeowGreeting();
    this.setCatSpeech('Check-in retroativo gravado com acolhimento!');
    this.promptStepCompletionIfLinked(occ);
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  markCommitmentMissed(id) {
    const occ = state.occurrences.find(o => o.id === id);
    if (!occ) return;
    if (typeof commitmentStateMachine !== 'undefined' && commitmentStateMachine) {
      try {
        commitmentStateMachine.markMissed(occ);
      } catch (_) {}
    }
    occ.state = 'missed';
    audio.playBlip();
    this.setCatSpeech('Tudo bem, mamãe! Sem cobrança. O novelo continua com você!');
    this.renderActiveTab();
    this.persist();
  }

  openRescheduleDialog(id) {
    const occ = state.occurrences.find(o => o.id === id);
    if (!occ) return;
    state.activeRescheduleModal = {
      commitmentId: id,
      title: occ.title,
      newTime: occ.time || '19:00',
      newDate: state.dayKey
    };
    audio.playBlip();
    this.renderActiveTab();
  }

  closeRescheduleDialog() {
    state.activeRescheduleModal = null;
    audio.playBlip();
    this.renderActiveTab();
  }

  confirmReschedule(id, newTime, newDate) {
    const occ = state.occurrences.find(o => o.id === id);
    if (!occ) return;
    const timeInput = newTime || (document.getElementById('reschedule-time-input') ? document.getElementById('reschedule-time-input').value : '19:00');
    const dateInput = newDate || (document.getElementById('reschedule-date-input') ? document.getElementById('reschedule-date-input').value : state.dayKey);
    const newPlannedStart = `${dateInput}T${timeInput}:00`;

    occ.state = 'rescheduled';
    const newId = 'occ-' + Clock.now();
    const replacement = {
      ...occ,
      id: newId,
      time: timeInput,
      date: dateInput,
      plannedStart: newPlannedStart,
      state: 'pending',
      rescheduledFromId: occ.id,
      createdAt: Clock.isoString(),
      delayMin: 0
    };
    delete replacement.completedAt;
    delete replacement.actualDuration;

    state.occurrences.push(replacement);
    state.activeRescheduleModal = null;
    audio.playMeowGreeting();
    this.setCatSpeech('Compromisso remarcado com acolhimento! Vamos no seu tempo.');
    this.renderActiveTab();
    this.persist();
  }

  undoCommitmentCheckIn(id, force = false) {
    const occ = state.occurrences.find(o => o.id === id);
    if (!occ) return;
    const chk = (state.checkIns || []).filter(c => c.commitmentId === id).slice(-1)[0];

    const undoWindowMinutes = (state.commitmentsConfig && state.commitmentsConfig.undoWindowMinutes) || 10;
    if (chk && chk.actualAt && !force) {
      const chkEpoch = typeof chk.actualAt === 'number' ? chk.actualAt : Date.parse(chk.actualAt);
      const elapsedMin = Math.round((Clock.now() - chkEpoch) / 60000);
      if (elapsedMin > undoWindowMinutes || elapsedMin < 0) {
        this.setCatSpeech('A janela de desfazer já encerrou.');
        return;
      }
    }

    occ.state = 'pending';
    delete occ.completedAt;

    if (!state.rewardEvents) state.rewardEvents = [];
    if (typeof rewardLedgerEngine !== 'undefined' && rewardLedgerEngine) {
      const undoRes = rewardLedgerEngine.compensateCommitmentUndo(id, state.rewardEvents, state.dayKey);
      if (undoRes && undoRes.events) {
        state.rewardEvents.push(...undoRes.events);
        state.currencies.peixinhos = Math.max(0, state.currencies.peixinhos - (undoRes.fishDeducted || 0));
      }
    } else {
      state.currencies.peixinhos = Math.max(0, state.currencies.peixinhos - (occ.reward || 10));
      state.currencies.vinculo = Math.max(0, state.currencies.vinculo - (occ.reward || 10));
    }

    if (chk) {
      state.checkIns = state.checkIns.filter(c => c.id !== chk.id);
    }

    audio.playBlip();
    this.setCatSpeech('Check-in desfeito. Tudo pronto para quando quiser fazer!');
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  renderCommitmentModals() {
    if (state.activeStepPrompt) {
      const p = state.activeStepPrompt;
      const html = `
        <div class="simulated-overlay-backdrop" id="step-prompt-modal" style="display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div class="pixel-card" style="max-width: 360px; width: 92%; margin: auto; text-align: center; border: 4px solid ${PALETTE.cozyPurple}; box-shadow: 6px 6px 0 ${PALETTE.cozyPurple}; background: #fffbf0; padding: 16px;">
            <div style="font-size: 28px; margin-bottom: 6px;">🐾🧶</div>
            <h3 style="font-size: 16px; margin: 0 0 6px 0; color: ${PALETTE.cozyPurple};">Passo da Meta</h3>
            <p style="font-size: 14px; color: ${PALETTE.ink}; margin: 8px 0; line-height: 1.4;">
              Esse passo da meta foi concluído?
              <br>
              <strong style="color: ${PALETTE.orange}; font-size: 15px;">${p.stepTitle}</strong>
            </p>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
              <button class="pixel-btn btn-green" style="width: 100%; min-height: 48px; font-size: 14px;" onclick="window.app.confirmStepDoneFromCommitment('${p.goalId}', '${p.stepId}')">
                ✓ Sim, concluir passo
              </button>
              <button class="pixel-btn btn-secondary" style="width: 100%; min-height: 48px; font-size: 14px;" onclick="window.app.closeStepPromptDialog()">
                Ainda em andamento
              </button>
            </div>
          </div>
        </div>
      `;
      if (this.contentEl.insertAdjacentHTML) {
        this.contentEl.insertAdjacentHTML('beforeend', html);
      } else {
        const div = document.createElement('div');
        div.innerHTML = html;
        this.contentEl.appendChild(div.firstElementChild);
      }
    }

    if (state.activeRetroModal) {
      const r = state.activeRetroModal;
      const html = `
        <div class="simulated-overlay-backdrop" id="retro-checkin-modal" style="display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div class="pixel-card" style="max-width: 360px; width: 92%; margin: auto; text-align: center; border: 4px solid ${PALETTE.cozyPurple}; box-shadow: 6px 6px 0 ${PALETTE.cozyPurple}; background: #fffbf0; padding: 16px;">
            <div style="font-size: 28px; margin-bottom: 6px;">🕒🐾</div>
            <h3 style="font-size: 16px; margin: 0 0 6px 0; color: ${PALETTE.cozyPurple};">Check-in Retroativo</h3>
            <p style="font-size: 13px; color: ${PALETTE.ink}; margin: 6px 0;">
              Que horas você cumpriu <strong>${r.title}</strong>?
            </p>
            <div style="margin: 12px 0;">
              <input type="time" id="retro-checkin-time-input" class="pixel-input" value="${r.time}" style="font-size: 16px; padding: 8px; text-align: center; width: 140px;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
              <button class="pixel-btn btn-green" style="width: 100%; min-height: 48px; font-size: 14px;" onclick="window.app.confirmRetroCheckIn('${r.commitmentId}')">
                ✓ Confirmar Check-in Retroativo
              </button>
              <button class="pixel-btn btn-secondary" style="width: 100%; min-height: 48px; font-size: 14px;" onclick="window.app.closeRetroCheckInDialog()">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      `;
      if (this.contentEl.insertAdjacentHTML) {
        this.contentEl.insertAdjacentHTML('beforeend', html);
      } else {
        const div = document.createElement('div');
        div.innerHTML = html;
        this.contentEl.appendChild(div.firstElementChild);
      }
    }

    if (state.activeRescheduleModal) {
      const s = state.activeRescheduleModal;
      const html = `
        <div class="simulated-overlay-backdrop" id="reschedule-modal" style="display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div class="pixel-card" style="max-width: 360px; width: 92%; margin: auto; text-align: center; border: 4px solid ${PALETTE.orange}; box-shadow: 6px 6px 0 ${PALETTE.orange}; background: #fffbf0; padding: 16px;">
            <div style="font-size: 28px; margin-bottom: 6px;">🗓️🐾</div>
            <h3 style="font-size: 16px; margin: 0 0 6px 0; color: ${PALETTE.orange};">Remarcar Compromisso</h3>
            <p style="font-size: 13px; color: ${PALETTE.ink}; margin: 6px 0;">
              Escolha o novo momento para <strong>${s.title}</strong>:
            </p>
            <div style="display: flex; gap: 8px; margin: 12px 0; justify-content: center;">
              <input type="date" id="reschedule-date-input" class="pixel-input" value="${s.newDate}" style="font-size: 14px; padding: 6px;">
              <input type="time" id="reschedule-time-input" class="pixel-input" value="${s.newTime}" style="font-size: 14px; padding: 6px;">
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
              <button class="pixel-btn btn-gold" style="width: 100%; min-height: 48px; font-size: 14px;" onclick="window.app.confirmReschedule('${s.commitmentId}')">
                ✓ Confirmar Remarcação
              </button>
              <button class="pixel-btn btn-secondary" style="width: 100%; min-height: 48px; font-size: 14px;" onclick="window.app.closeRescheduleDialog()">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      `;
      if (this.contentEl.insertAdjacentHTML) {
        this.contentEl.insertAdjacentHTML('beforeend', html);
      } else {
        const div = document.createElement('div');
        div.innerHTML = html;
        this.contentEl.appendChild(div.firstElementChild);
      }
    }

    this.renderDayClosureModal();
    this.renderWeeklyLogModal();
  }

  computeLogicalDay(ms, startHour = 4) {
    const d = Clock.newDate(ms !== undefined ? ms : Clock.now());
    if (d.getHours() < startHour) {
      d.setDate(d.getDate() - 1);
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  addDaysToIso(dateStr, days) {
    const p = String(dateStr).split('-').map(Number);
    const d = Clock.newDate(Date.UTC(p[0], p[1] - 1, p[2] + days, 12, 0, 0));
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  checkDayClosureTrigger() {
    const cfg = state.commitmentsConfig || (typeof CatLineCommitmentsConfig !== 'undefined' ? CatLineCommitmentsConfig.DEFAULT_CONFIG : {});
    const startHour = (cfg && cfg.dayBoundary && cfg.dayBoundary.logicalDayStartHour !== undefined)
      ? cfg.dayBoundary.logicalDayStartHour : 4;
    const currLogical = this.computeLogicalDay(Clock.now(), startHour);

    const prevLogical = this.addDaysToIso(currLogical, -1);
    const yesterdayClosed = (state.dayClosures || []).some(cl => cl.logicalDay === prevLogical);

    if (!yesterdayClosed) {
      const unresolved = (typeof dayClosureEngine !== 'undefined' && dayClosureEngine)
        ? dayClosureEngine.findUnresolved(prevLogical, state.occurrences)
        : (state.occurrences || []).filter(o => {
            const oDate = o.date || (o.plannedStart ? o.plannedStart.substring(0, 10) : state.dayKey);
            return oDate === prevLogical && (o.state === 'pending' || o.state === 'unmarked');
          });

      if (unresolved.length > 0) {
        this.openDayClosureModal(prevLogical);
      }
    }

    state.dayKey = currLogical;
  }

  openDayClosureModal(logicalDay) {
    const targetDay = logicalDay || this.addDaysToIso(state.dayKey, -1);
    if (!state.dayClosures) state.dayClosures = [];
    if (!state.rewardEvents) state.rewardEvents = [];

    const unresolved = (state.occurrences || []).filter(o => {
      const oDate = o.date || (o.plannedStart ? o.plannedStart.substring(0, 10) : state.dayKey);
      return oDate === targetDay && (o.state === 'pending' || o.state === 'unmarked');
    });

    unresolved.forEach(c => {
      if (c.state === 'pending') c.state = 'unmarked';
    });

    state.activeDayClosureModal = {
      logicalDay: targetDay,
      unresolved: unresolved.map(c => c.id)
    };

    this.setCatSpeech('Oi! Vamos fechar o dia de ontem juntinhas sem pressa?');
    audio.playMeowGreeting();
    this.renderActiveTab();
  }

  closeDayClosureModal() {
    state.activeDayClosureModal = null;
    audio.playBlip();
    this.renderActiveTab();
  }

  resolveClosureItemDone(commId, actualTime) {
    const occ = (state.occurrences || []).find(o => o.id === commId);
    if (!occ) return;
    const inputEl = document.getElementById(`closure-time-${commId}`);
    const timeVal = actualTime || (inputEl ? inputEl.value : null) || occ.time || '18:00';
    const targetDay = state.activeDayClosureModal ? state.activeDayClosureModal.logicalDay : (occ.date || state.dayKey);
    const actualIso = `${targetDay}T${timeVal}:00`;

    let checkInRecord = null;
    if (typeof dayClosureEngine !== 'undefined' && dayClosureEngine) {
      const res = dayClosureEngine.resolveAsDone(occ, actualIso);
      if (res && res.commitment) {
        Object.assign(occ, res.commitment);
      }
      if (res && res.checkIn) {
        checkInRecord = res.checkIn;
      }
    } else {
      occ.state = 'done';
      occ.completedAt = actualIso;
      occ.delayMin = 0;
    }

    occ.completedAt = actualIso;

    if (!checkInRecord) {
      checkInRecord = {
        id: 'chk_' + occ.id + '_' + Clock.now(),
        commitmentId: occ.id,
        actualAt: actualIso,
        retroactive: true,
        lateMinutes: occ.delayMin || 0
      };
    }
    if (!state.checkIns) state.checkIns = [];
    state.checkIns.push(checkInRecord);

    const activeRewardEngine = (typeof rewardLedgerEngine !== 'undefined' && rewardLedgerEngine)
      ? rewardLedgerEngine
      : (typeof CatLineRewardLedgerEngine !== 'undefined' ? (CatLineRewardLedgerEngine.rewardLedgerEngine || CatLineRewardLedgerEngine) : null);

    if (activeRewardEngine) {
      const cfg = state.commitmentsConfig || (typeof CatLineCommitmentsConfig !== 'undefined' ? (CatLineCommitmentsConfig.DEFAULT_CONFIG || CatLineCommitmentsConfig) : {});
      const ledgerRes = activeRewardEngine.awardCommitmentDone(occ, checkInRecord, state.rewardEvents, cfg, targetDay);
      if (ledgerRes && ledgerRes.events) {
        state.rewardEvents.push(...ledgerRes.events);
        state.currencies.peixinhos += (ledgerRes.fishGranted || 0);
      }
    }

    if (state.activeDayClosureModal && state.activeDayClosureModal.unresolved) {
      state.activeDayClosureModal.unresolved = state.activeDayClosureModal.unresolved.filter(id => id !== commId);
    }

    audio.playMeowCelebrate();
    this.setCatSpeech(`"${occ.title}" marcado como cumprido!`);
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  resolveClosureItemMissed(commId) {
    const occ = (state.occurrences || []).find(o => o.id === commId);
    if (!occ) return;
    if (typeof dayClosureEngine !== 'undefined' && dayClosureEngine) {
      const res = dayClosureEngine.resolveAsMissed(occ);
      if (res && res.commitment) {
        Object.assign(occ, res.commitment);
      }
    } else {
      occ.state = 'missed';
    }

    if (state.activeDayClosureModal && state.activeDayClosureModal.unresolved) {
      state.activeDayClosureModal.unresolved = state.activeDayClosureModal.unresolved.filter(id => id !== commId);
    }

    audio.playBlip();
    this.setCatSpeech('Tudo bem! Registrar a verdade com carinho vale muito!');
    this.renderActiveTab();
    this.persist();
  }

  resolveClosureItemReschedule(commId, newTime, newDate) {
    const occ = (state.occurrences || []).find(o => o.id === commId);
    if (!occ) return;
    const targetNewDate = newDate || state.dayKey;
    const targetNewTime = newTime || '09:00';

    if (typeof dayClosureEngine !== 'undefined' && dayClosureEngine) {
      const res = dayClosureEngine.resolveAsRescheduled(occ, {
        newPlannedStart: `${targetNewDate}T${targetNewTime}:00`,
        targetPlannedStart: `${targetNewDate}T${targetNewTime}:00`,
        targetDate: targetNewDate,
        targetTime: targetNewTime
      });
      if (res && res.original) {
        Object.assign(occ, res.original);
      }
      if (res && res.replacement) {
        res.replacement.time = targetNewTime;
        res.replacement.date = targetNewDate;
        if (!state.occurrences.some(o => o.id === res.replacement.id)) {
          state.occurrences.push(res.replacement);
        }
      }
    } else {
      occ.state = 'rescheduled';
      const newId = 'comm_' + Clock.now() + '_' + Math.random().toString(36).substr(2, 4);
      state.occurrences.push({
        id: newId,
        title: occ.title,
        time: targetNewTime,
        date: targetNewDate,
        plannedStart: `${targetNewDate}T${targetNewTime}:00`,
        plannedZone: occ.plannedZone || 'America/Sao_Paulo',
        plannedMinutes: occ.plannedMinutes,
        category: occ.category,
        goalId: occ.goalId,
        stepId: occ.stepId,
        state: 'pending',
        rescheduledFromId: occ.id,
        createdAt: Clock.isoString()
      });
    }

    if (state.activeDayClosureModal && state.activeDayClosureModal.unresolved) {
      state.activeDayClosureModal.unresolved = state.activeDayClosureModal.unresolved.filter(id => id !== commId);
    }

    audio.playBlip();
    this.setCatSpeech('Compromisso remarcado com acolhimento!');
    this.renderActiveTab();
    this.persist();
  }

  resolveAllClosureItemsAsPlanned() {
    if (!state.activeDayClosureModal || !state.activeDayClosureModal.unresolved) return;
    const unresIds = [...state.activeDayClosureModal.unresolved];
    if (unresIds.length === 0) return;

    if (typeof confirm === 'function') {
      const ok = confirm('Deseja marcar todos os compromissos restantes como cumpridos no horário planejado?');
      if (!ok) return;
    }

    const targetDay = state.activeDayClosureModal.logicalDay;
    const unresOccs = state.occurrences.filter(o => unresIds.includes(o.id));

    if (typeof dayClosureEngine !== 'undefined' && dayClosureEngine) {
      const res = dayClosureEngine.resolveAllAsPlanned(unresOccs);
      if (res && res.updatedCommitments) {
        res.updatedCommitments.forEach(up => {
          const orig = unresOccs.find(o => o.id === up.id);
          if (orig) Object.assign(orig, up);
        });
      }
      if (res && res.createdCheckIns) {
        if (!state.checkIns) state.checkIns = [];
        state.checkIns.push(...res.createdCheckIns);
      }
    } else {
      unresOccs.forEach(c => {
        c.state = 'done';
        c.completedAt = c.plannedStart;
        c.delayMin = 0;
        if (!state.checkIns) state.checkIns = [];
        state.checkIns.push({
          id: 'chk_' + c.id + '_' + Clock.now(),
          commitmentId: c.id,
          actualAt: c.plannedStart,
          retroactive: true,
          lateMinutes: 0
        });
      });
    }

    const activeRewardEngine = (typeof rewardLedgerEngine !== 'undefined' && rewardLedgerEngine)
      ? rewardLedgerEngine
      : (typeof CatLineRewardLedgerEngine !== 'undefined' ? (CatLineRewardLedgerEngine.rewardLedgerEngine || CatLineRewardLedgerEngine) : null);

    if (activeRewardEngine) {
      const cfg = state.commitmentsConfig || (typeof CatLineCommitmentsConfig !== 'undefined' ? (CatLineCommitmentsConfig.DEFAULT_CONFIG || CatLineCommitmentsConfig) : {});
      unresOccs.forEach(c => {
        const chk = (state.checkIns || []).find(ci => ci.commitmentId === c.id) || {
          id: 'chk_' + c.id, commitmentId: c.id, actualAt: c.plannedStart, retroactive: true, lateMinutes: 0
        };
        const ledgerRes = activeRewardEngine.awardCommitmentDone(c, chk, state.rewardEvents, cfg, targetDay);
        if (ledgerRes && ledgerRes.events) {
          state.rewardEvents.push(...ledgerRes.events);
          state.currencies.peixinhos += (ledgerRes.fishGranted || 0);
        }
      });
    }

    state.activeDayClosureModal.unresolved = [];
    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.setCatSpeech('Todos os compromissos marcados no horário planejado com amor!');
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  postponeDayClosure() {
    if (state.activeDayClosureModal && state.activeDayClosureModal.unresolved) {
      const unresIds = state.activeDayClosureModal.unresolved;
      const unresOccs = state.occurrences.filter(o => unresIds.includes(o.id));
      if (typeof dayClosureEngine !== 'undefined' && dayClosureEngine) {
        const res = dayClosureEngine.postpone(unresOccs);
        if (Array.isArray(res)) {
          res.forEach(up => {
            const orig = unresOccs.find(o => o.id === up.id);
            if (orig) Object.assign(orig, up);
          });
        }
      } else {
        unresOccs.forEach(c => {
          if (c.state === 'pending') c.state = 'unmarked';
        });
      }
    }
    state.activeDayClosureModal = null;
    audio.playBlip();
    this.setCatSpeech('Tudo bem, podemos ver isso depois com calma! 🐾');
    this.renderActiveTab();
    this.persist();
  }

  finalizeDayClosure() {
    const targetDay = state.activeDayClosureModal ? state.activeDayClosureModal.logicalDay : this.addDaysToIso(state.dayKey, -1);
    if (!state.dayClosures) state.dayClosures = [];
    if (!state.rewardEvents) state.rewardEvents = [];

    if (typeof dayClosureEngine !== 'undefined' && dayClosureEngine) {
      const cfg = state.commitmentsConfig || (typeof CatLineCommitmentsConfig !== 'undefined' ? (CatLineCommitmentsConfig.DEFAULT_CONFIG || CatLineCommitmentsConfig) : {});
      const res = dayClosureEngine.closeDay(targetDay, state.occurrences, state.dayClosures, state.rewardEvents, cfg);
      if (!res.wasAlreadyClosed) {
        state.dayClosures.push(res.closure);
        if (res.rewardEvents && res.rewardEvents.length > 0) {
          state.rewardEvents.push(...res.rewardEvents);
          if (state.currencies.vinculo !== undefined) {
            state.currencies.vinculo += (res.rewardEvents[0].bondDelta || 1);
          } else if (state.currencies.hearts !== undefined) {
            state.currencies.hearts += (res.rewardEvents[0].bondDelta || 1);
          }
        }
      }
    } else {
      const already = state.dayClosures.some(cl => cl.logicalDay === targetDay);
      if (!already) {
        state.dayClosures.push({
          logicalDay: targetDay,
          closedAt: Clock.isoString()
        });
        state.rewardEvents.push({
          id: `rew_day_closure_${targetDay}`,
          idempotencyKey: `day_closure:${targetDay}`,
          kind: 'day_closure',
          fishDelta: 0,
          bondDelta: 1,
          refId: targetDay,
          at: Clock.isoString(),
          logicalDay: targetDay
        });
        if (state.currencies.vinculo !== undefined) state.currencies.vinculo += 1;
      }
    }

    state.activeDayClosureModal = null;
    audio.playSuccessFanfare();
    this.spawnPixelConfetti();
    this.setCatSpeech('Dia fechado com carinho! +1♥');
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  renderDayClosureModal() {
    if (!state.activeDayClosureModal) return;
    const m = state.activeDayClosureModal;
    const unresolvedList = (state.occurrences || []).filter(o => (m.unresolved || []).includes(o.id));

    const html = `
      <div class="simulated-overlay-backdrop" id="day-closure-modal-overlay" style="display: flex; align-items: center; justify-content: center; z-index: 10000;">
        <div class="day-closure-modal-box">
          <div class="day-closure-cat-header">
            <span style="font-size: 32px;">🐱🌙</span>
            <div>
              <strong style="font-size: 15px; display: block; color: ${PALETTE.cozyPurple};">Fechamento do Dia · ${m.logicalDay}</strong>
              <span style="font-size: 13px; color: ${PALETTE.ink};">Vamos fechar o dia de ontem juntinhas sem pressa?</span>
            </div>
          </div>

          ${unresolvedList.length > 0 ? `
            <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px; color: ${PALETTE.ink};">
              Compromissos sem marcação de ontem: ${unresolvedList.length}
            </div>
            <div class="closure-unresolved-list">
              ${unresolvedList.map(item => `
                <div class="closure-task-card" id="closure-item-${item.id}">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <strong style="font-size: 14px; color: ${PALETTE.ink};">${item.title}</strong>
                    <span style="font-size: 12px; font-weight: 700; color: #666;">Planejado: ${item.time || '12:00'}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 12px; color: #555;">Horário real:</span>
                    <input type="time" id="closure-time-${item.id}" class="pixel-input" value="${item.time || '12:00'}" style="font-size: 12px; padding: 4px; width: 95px;">
                  </div>
                  <div class="closure-actions-row">
                    <button class="pixel-btn btn-green" onclick="window.app.resolveClosureItemDone('${item.id}')">
                      ✓ Cumpri
                    </button>
                    <button class="pixel-btn btn-secondary" onclick="window.app.resolveClosureItemMissed('${item.id}')">
                      Não cumpri
                    </button>
                    <button class="pixel-btn btn-gold" onclick="window.app.resolveClosureItemReschedule('${item.id}')">
                      Remarcar
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="margin: 12px 0;">
              <button class="pixel-btn btn-gold" style="width: 100%; min-height: 48px; font-size: 13px;" onclick="window.app.resolveAllClosureItemsAsPlanned()">
                ✨ Marcar todos no horário planejado
              </button>
            </div>
          ` : `
            <div style="text-align: center; padding: 16px 8px; background: #fffdf7; border: 2px dashed ${PALETTE.leafGreen}; border-radius: 4px; margin: 12px 0;">
              <span style="font-size: 26px;">🐾✨</span>
              <p style="font-size: 14px; margin: 6px 0; color: ${PALETTE.ink};">
                Todos os compromissos de ontem foram organizados com carinho!
              </p>
            </div>
          `}

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
            <button class="pixel-btn btn-green" style="width: 100%; min-height: 48px; font-size: 14px;" onclick="window.app.finalizeDayClosure()">
              🐾 Concluir Fechamento do Dia
            </button>
            <button class="pixel-btn btn-secondary" style="width: 100%; min-height: 48px; font-size: 14px;" onclick="window.app.postponeDayClosure()">
              Adiar resolução
            </button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = html;
    if (this.contentEl.insertAdjacentHTML) {
      this.contentEl.insertAdjacentHTML('beforeend', html);
    } else if (div.firstElementChild) {
      this.contentEl.appendChild(div.firstElementChild);
    }
  }

  markDone(id) {
    this.checkInLive(id);
    const occ = state.occurrences.find(o => o.id === id);
    if (occ) {
      occ.state = 'FEITO';
      const maxRuns = occ.maxRuns || (occ.recurrence === 'Pontual · 2 vezes' ? 2 : (occ.recurrence === 'Pontual · 1 vez' ? 1 : 0));
      if (maxRuns > 0) {
        occ.maxRuns = maxRuns;
        occ.completedRuns = (occ.completedRuns || 0) + 1;
        if (occ.completedRuns >= maxRuns) {
          occ.completedAllRuns = true;
          this.setCatSpeech(`Prontinho! "${occ.title}" (${occ.completedRuns}/${maxRuns}) finalizada de vez!`);
        } else {
          this.setCatSpeech(`Boa! "${occ.title}" ${occ.completedRuns}/${maxRuns} feita — falta só mais 1 vez!`);
        }
        this.persist();
        this.renderActiveTab();
      }
    }
  }

  reopenSecondRun(id) {
    const occ = state.occurrences.find(o => o.id === id);
    if (!occ) return;
    occ.state = 'pending';
    occ.completedAllRuns = false;
    audio.playBlip();
    this.setCatSpeech(`Bora para a ${Math.min((occ.completedRuns || 1) + 1, occ.maxRuns || 2)}ª vez de "${occ.title}"!`);
    this.persist();
    this.renderActiveTab();
    this.syncNativeReminders();
  }

  retroCheckIn(id) {
    this.confirmRetroCheckIn(id);
    const occ = state.occurrences.find(o => o.id === id);
    if (occ) occ.state = 'FEITO';
  }

  // Motor de Log Semanal e Snapshot Imutável (v3.2.0 · Prompt 11)
  generateWeeklyLog(referenceDate) {
    if (state.flags && state.flags.LOG_SEMANAL === false) return null;
    const targetDate = referenceDate || state.dayKey;
    if (!state.weeklyLogs) state.weeklyLogs = [];

    const engine = (typeof weeklyLogEngine !== 'undefined' && weeklyLogEngine)
      ? weeklyLogEngine
      : (typeof CatLineWeeklyLogEngine !== 'undefined' ? (CatLineWeeklyLogEngine.weeklyLogEngine || CatLineWeeklyLogEngine) : null);

    const cfg = state.commitmentsConfig || (typeof CatLineCommitmentsConfig !== 'undefined' ? (CatLineCommitmentsConfig.DEFAULT_CONFIG || CatLineCommitmentsConfig) : {});
    const period = engine ? engine.calculatePeriod(targetDate, (cfg.week && cfg.week.closesOn) || 'sunday') : { start: targetDate, end: targetDate };

    const existing = state.weeklyLogs.find(wl => wl.weekStartLogicalDay === period.start);
    if (existing) {
      return existing;
    }

    const uniqueDays = new Set((state.occurrences || []).map(o => o.date || (o.plannedStart ? o.plannedStart.substring(0, 10) : state.dayKey)));
    (state.checkIns || []).forEach(ci => {
      if (ci.actualAt) uniqueDays.add(ci.actualAt.substring(0, 10));
    });
    const historyDayCount = Math.max(uniqueDays.size, (state.dailyHistory || []).length);

    const prevWeekLog = state.weeklyLogs[state.weeklyLogs.length - 1];
    let prevWeekSnapshot = null;
    if (prevWeekLog && prevWeekLog.snapshotJson) {
      try { prevWeekSnapshot = JSON.parse(prevWeekLog.snapshotJson); } catch (e) {}
    }

    let weeklyLog = null;
    if (engine) {
      weeklyLog = engine.createWeeklyLog({
        commitments: state.occurrences || [],
        checkIns: state.checkIns || [],
        rewardEvents: state.rewardEvents || [],
        goals: state.goals || [],
        historyDayCount,
        prevWeekSnapshot,
        config: cfg,
        referenceDate: targetDate
      });
    } else {
      const snap = {
        period,
        totals: { planned: (state.occurrences || []).length, done: 0, missed: 0, rescheduled: 0, unmarkedPending: 0 },
        rates: { fulfillment: 1.0, punctuality: 1.0, medianLateMinutes: 0 },
        vsPreviousWeek: null,
        bestDay: historyDayCount >= 7 ? 'Segunda-feira' : null,
        bestTimeSlot: historyDayCount >= 7 ? 'Manhã' : null,
        goals: [],
        rewards: { fish: 0, bond: 0 },
        letter: { templateIds: ['greet_few_days'], renderedText: 'Oi! Estamos dando os primeiros passos juntinhas!' },
        configVersion: 1
      };
      weeklyLog = {
        weekStartLogicalDay: period.start,
        snapshotJson: JSON.stringify(snap),
        configVersion: 1,
        createdAt: Clock.isoString()
      };
    }

    state.weeklyLogs.push(weeklyLog);
    this.persist();
    return weeklyLog;
  }

  openWeeklyLogViewer(weekStartDay) {
    if (state.flags && state.flags.LOG_SEMANAL === false) return;
    if (!state.weeklyLogs) state.weeklyLogs = [];
    let log = null;
    if (weekStartDay) {
      log = state.weeklyLogs.find(wl => wl.weekStartLogicalDay === weekStartDay);
    }
    if (!log) {
      log = this.generateWeeklyLog(state.dayKey);
    }

    if (!log || !log.snapshotJson) return;

    try {
      state.activeWeeklyLogModal = JSON.parse(log.snapshotJson);
    } catch (e) {
      state.activeWeeklyLogModal = null;
    }

    audio.playMeowGreeting();
    this.renderActiveTab();
  }

  closeWeeklyLogViewer() {
    state.activeWeeklyLogModal = null;
    audio.playBlip();
    this.renderActiveTab();
  }

  acceptGentleSuggestion(commitmentId, proposedTime) {
    if (typeof confirm === 'function') {
      const ok = confirm(`Deseja ajustar o horário planejado para ${proposedTime}?`);
      if (!ok) return;
    }

    const occ = (state.occurrences || []).find(o => o.id === commitmentId);
    if (occ) {
      occ.time = proposedTime;
      if (occ.plannedStart && occ.plannedStart.length >= 16) {
        occ.plannedStart = `${occ.plannedStart.substring(0, 10)}T${proposedTime}:00`;
      }
    }

    if (state.activeWeeklyLogModal) {
      state.activeWeeklyLogModal.gentleSuggestion = null;
    }

    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.setCatSpeech('Horário ajustado com carinho! Vamos testar esse novo ritmo juntinhas.');
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  renderWeeklyLogModal() {
    if (!state.activeWeeklyLogModal) return;
    const s = state.activeWeeklyLogModal;

    const html = `
      <div class="simulated-overlay-backdrop" id="weekly-log-modal-overlay" style="display: flex; align-items: center; justify-content: center; z-index: 10000;">
        <div class="weekly-log-modal-box">
          <div class="weekly-log-header">
            <span style="font-size: 32px;">🐾📖</span>
            <div>
              <strong style="font-size: 15px; display: block; color: ${PALETTE.cozyPurple};">Log Semanal · ${s.period.start} a ${s.period.end}</strong>
              <span style="font-size: 13px; color: ${PALETTE.ink};">Olhando nossa semana com carinho e sem cobrança</span>
            </div>
          </div>

          <!-- Métricas e Taxas da Semana -->
          <div class="weekly-stat-grid">
            <div class="weekly-stat-card">
              <span style="font-size: 11px; color: #666; font-weight: 700;">CUMPRIMENTO</span>
              <strong style="font-size: 18px; color: ${PALETTE.leafGreen}; display: block;">${Math.round(s.rates.fulfillment * 100)}%</strong>
              <span style="font-size: 11px; color: #555;">${s.totals.done} de ${s.totals.planned} feitos</span>
            </div>
            <div class="weekly-stat-card">
              <span style="font-size: 11px; color: #666; font-weight: 700;">PONTUALIDADE</span>
              <strong style="font-size: 18px; color: ${PALETTE.windowBlue}; display: block;">${Math.round(s.rates.punctuality * 100)}%</strong>
              <span style="font-size: 11px; color: #555;">Mediana: ${s.rates.medianLateMinutes}m</span>
            </div>
          </div>

          <!-- Comparativo com Semana Anterior (se houver >= 7 dias) -->
          ${s.vsPreviousWeek ? `
            <div style="background: #ffffff; border: 2px solid ${PALETTE.ink}; border-radius: 4px; padding: 8px; margin: 8px 0; font-size: 12px;">
              <strong>Evolução vs. Semana Anterior:</strong>
              <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                <span>Cumprimento: ${s.vsPreviousWeek.fulfillmentDelta >= 0 ? '+' : ''}${Math.round(s.vsPreviousWeek.fulfillmentDelta * 100)}%</span>
                <span>Mediana de atraso: ${s.vsPreviousWeek.medianLateDelta >= 0 ? '+' : ''}${s.vsPreviousWeek.medianLateDelta}m</span>
              </div>
            </div>
          ` : `
            <div style="background: #fffdf5; border: 1.5px dashed #ccc; border-radius: 4px; padding: 6px; margin: 6px 0; font-size: 11px; color: #666; text-align: center;">
              Comparativo disponível a partir de 7 dias de dados
            </div>
          `}

          <!-- Melhores Dias e Horários (se houver >= 7 dias) -->
          ${s.bestDay && s.bestTimeSlot ? `
            <div style="background: #ffffff; border: 2px solid ${PALETTE.goldenYarn}; border-radius: 4px; padding: 8px; margin: 8px 0; font-size: 12px;">
              ⭐ <strong>Melhor ritmo:</strong> ${s.bestDay} no período da ${s.bestTimeSlot.toLowerCase()}
            </div>
          ` : ''}

          <!-- Metas e Passos Concluídos -->
          ${s.goals && s.goals.length > 0 ? `
            <div style="margin: 8px 0;">
              <strong style="font-size: 13px; color: ${PALETTE.cozyPurple};">🐾 Metas e Passos da Semana:</strong>
              <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
                ${s.goals.map(g => `
                  <div style="background: #ffffff; border: 1.5px solid ${PALETTE.ink}; border-radius: 4px; padding: 6px; font-size: 12px; display: flex; justify-content: space-between;">
                    <span>${g.title}</span>
                    <strong>${g.stepsDoneThisWeek} passos concluídos</strong>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Recompensas da Semana -->
          <div style="background: #fffdf5; border: 2px solid ${PALETTE.orange}; border-radius: 4px; padding: 8px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <span>🐟 Recompensas Conquistadas:</span>
            <strong>${s.rewards.fish} peixinhos · ${s.rewards.bond} vínculo</strong>
          </div>

          <!-- Carta da Gatinha (sem LLM) -->
          <div class="weekly-letter-card">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 18px;">🐱💌</span>
              <strong style="color: ${PALETTE.cozyPurple}; font-size: 13px;">Carta da Gatinha:</strong>
            </div>
            <p style="margin: 0;">${s.letter.renderedText}</p>
          </div>

          <!-- Sugestão Gentil de Horário -->
          ${s.gentleSuggestion ? `
            <div style="background: #f0f7ff; border: 2px solid ${PALETTE.windowBlue}; border-radius: 4px; padding: 10px; margin: 10px 0;">
              <strong style="color: ${PALETTE.windowBlue}; font-size: 13px; display: block; margin-bottom: 4px;">💡 Sugestão Gentil de Ritmo:</strong>
              <p style="font-size: 12px; margin: 0 0 8px 0; color: ${PALETTE.ink};">
                Parece que você tendeu a cumprir <strong>${s.gentleSuggestion.commitmentTitle}</strong> com cerca de ${s.gentleSuggestion.medianLateMinutes} minutos de flexibilidade. Que tal ajustar para <strong>${s.gentleSuggestion.proposedNewTime}</strong>?
              </p>
              <button class="pixel-btn btn-gold" style="width: 100%; min-height: 48px; font-size: 13px;" onclick="window.app.acceptGentleSuggestion('${s.gentleSuggestion.commitmentId}', '${s.gentleSuggestion.proposedNewTime}')">
                ✓ Aceitar sugestão de horário
              </button>
            </div>
          ` : ''}

          <div style="margin-top: 14px;">
            <button class="pixel-btn btn-secondary" style="width: 100%; min-height: 48px; font-size: 14px;" onclick="window.app.closeWeeklyLogViewer()">
              Fechar Log Semanal
            </button>
          </div>
        </div>
      </div>
    `;

    if (this.contentEl.insertAdjacentHTML) {
      this.contentEl.insertAdjacentHTML('beforeend', html);
    } else {
      const div = document.createElement('div');
      div.innerHTML = html;
      this.contentEl.appendChild(div.firstElementChild);
    }
  }

  // Motor de Estimativa vs. Tempo Real (Fase 2)
  recordDurationSample(item) {
    if (!item) return;
    const cat = detectTaskCategory(item);
    const est = item.estimatedDuration || (item.effort === 'G' ? 60 : (item.effort === 'M' ? 30 : 15));
    const act = item.actualDuration || est;
    state.durationHistory = EstimationEngine.addSample(state.durationHistory, {
      category: cat,
      taskTitle: item.title,
      estimatedDuration: est,
      actualDuration: act,
      completedAt: item.completedAt || Clock.isoString()
    });

    if (!state.pendingCalibrationSuggestion) {
      const bestSug = EstimationEngine.findBestSuggestion(state.durationHistory, {
        calibrated: state.calibratedCategories || {},
        dismissed: state.dismissedSuggestions || {}
      });
      if (bestSug) {
        state.pendingCalibrationSuggestion = bestSug;
      }
    }
  }

  acceptCalibration() {
    if (!state.pendingCalibrationSuggestion) return;
    const sug = state.pendingCalibrationSuggestion;
    state.calibratedCategories = state.calibratedCategories || {};
    state.calibratedCategories[sug.category] = sug.suggestedEstimate;
    state.occurrences = EstimationEngine.applyCalibration(state.occurrences, sug.category, sug.suggestedEstimate);
    state.pendingCalibrationSuggestion = null;
    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.setCatSpeech(`Prontinho! Ajustei a duração estimada para ${sug.suggestedEstimate} minutos nas tarefas de ${sug.catFriendlyName}.`);
    this.renderActiveTab();
    this.persist();
  }

  dismissCalibration() {
    if (!state.pendingCalibrationSuggestion) return;
    const sug = state.pendingCalibrationSuggestion;
    state.dismissedSuggestions = state.dismissedSuggestions || {};
    state.dismissedSuggestions[sug.category] = sug.suggestedEstimate;
    state.pendingCalibrationSuggestion = null;
    audio.playBlip();
    this.setCatSpeech("Sem problemas! Mantivemos seus horários e durações como estavam.");
    this.renderActiveTab();
    this.persist();
  }

  renderCalibrationCard() {
    if (!state.pendingCalibrationSuggestion) return '';
    const sug = state.pendingCalibrationSuggestion;
    return `
      <div class="pixel-card lilac calibration-card" style="border: 2px solid #8e44ad; background: #fbf5ff; margin-bottom: 12px;">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 26px;">🧶</span>
          <div style="flex: 1;">
            <strong style="color: #6c3483; font-size: 15px; display: block; margin-bottom: 4px;">Dica de Calibração da Gatinha</strong>
            <p style="font-size: 13px; color: ${PALETTE.ink}; margin: 0 0 10px 0; line-height: 1.4;">
              ${sug.text}
            </p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="pixel-btn btn-sm btn-green" onclick="window.app.acceptCalibration()">Aceitar Ajuste ✓</button>
              <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.dismissCalibration()">Agora Não</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Motor de Replanejamento Inteligente e Gestão de Carga (Fase 3)
  checkDailyReplan() {
    if (state.pendingReplanPlan) return;
    if (state.dismissedReplanDay === state.dayKey) return;
    const plan = replanEngine.suggestReplan(
      state.occurrences,
      state.briefing,
      state.dayKey,
      typeof Clock !== 'undefined' ? Clock.formatTime() : '12:00'
    );
    if (plan && plan.id !== state.dismissedReplanId) {
      state.pendingReplanPlan = plan;
    }
  }

  acceptReplan() {
    if (!state.pendingReplanPlan) return;
    const plan = state.pendingReplanPlan;
    state.occurrences = replanEngine.applyReplan(state.occurrences, plan.tasksToMove);
    state.pendingReplanPlan = null;
    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.setCatSpeech("Replanejamento aplicado com carinho! Distribuímos suas tarefas para proteger seu tempo.");
    this.renderActiveTab();
    this.persist();
  }

  dismissReplan() {
    if (!state.pendingReplanPlan) return;
    state.dismissedReplanId = state.pendingReplanPlan.id;
    state.dismissedReplanDay = state.dayKey;
    state.pendingReplanPlan = null;
    audio.playBlip();
    this.setCatSpeech("Tudo bem! Mantivemos todos os seus compromissos no horário planejado.");
    this.renderActiveTab();
    this.persist();
  }

  renderReplanCard() {
    if (!state.pendingReplanPlan) return '';
    const plan = state.pendingReplanPlan;
    return `
      <div class="pixel-card lilac replan-card" style="border: 2px solid #8e44ad; background: #fbf5ff; margin-bottom: 12px;">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 26px;">🧶</span>
          <div style="flex: 1;">
            <strong style="color: #6c3483; font-size: 15px; display: block; margin-bottom: 4px;">Acolhimento da Gatinha · Replanejamento</strong>
            <p style="font-size: 13px; color: ${PALETTE.ink}; margin: 0 0 10px 0; line-height: 1.4;">
              ${plan.text}
            </p>
            <div style="background: #fff; border: 1px dashed #8e44ad; border-radius: 4px; padding: 8px; margin-bottom: 10px; font-size: 13px;">
              <strong style="color: #6c3483;">Proposta para amanhã:</strong>
              <ul style="margin: 4px 0 0 16px; padding: 0;">
                ${plan.tasksToMove.map(t => `<li><strong>${t.taskTitle}</strong>: ${t.duration} min</li>`).join('')}
              </ul>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="pixel-btn btn-sm btn-green" onclick="window.app.acceptReplan()">Replanejar com Carinho ✓</button>
              <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.dismissReplan()">Manter Como Está</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Motor de Insights Acionáveis e Correlações Saudáveis (Fase 4)
  renderCorrelationInsightCard() {
    const analysis = insightsEngine.analyzeCorrelation(state.dailyCorrelationHistory);
    if (!analysis.hasEnoughData) {
      const current = analysis.dayCount;
      const total = analysis.requiredDays;
      const pct = Math.round((current / total) * 100);
      return `
        <div class="pixel-card lilac correlation-card" style="border: 2px solid #8e44ad; background: #fbf5ff; margin-bottom: 12px;">
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 26px;">🔍</span>
            <div style="flex: 1;">
              <strong style="color: #6c3483; font-size: 15px; display: block; margin-bottom: 4px;">Observação do Fio e Tempo de Tela</strong>
              <p style="font-size: 13px; color: ${PALETTE.ink}; margin: 0 0 8px 0; line-height: 1.4;">
                A gatinha está acompanhando seu ritmo com carinho. Faltam ${total - current} dias de observação para identificarmos juntas as coincidências saudáveis entre tempo de tela e pontualidade.
              </p>
              <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: #8e44ad; transition: width 0.3s ease;"></div>
              </div>
              <span style="font-size: 11px; color: ${PALETTE.grayDark}; display: block; margin-top: 4px;">
                ${current} de ${total} dias registrados
              </span>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="pixel-card lilac correlation-card" style="border: 2px solid #8e44ad; background: #fbf5ff; margin-bottom: 12px;">
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 26px;">🧶</span>
          <div style="flex: 1;">
            <strong style="color: #6c3483; font-size: 15px; display: block; margin-bottom: 4px;">Descoberta da Gatinha · Coincidências do Fio</strong>
            <p style="font-size: 13px; color: ${PALETTE.ink}; margin: 0 0 10px 0; line-height: 1.4;">
              ${analysis.insightText}
            </p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #fff; border: 1px dashed #8e44ad; border-radius: 4px; padding: 8px;">
              <div>
                <span style="font-size: 11px; color: ${PALETTE.grayDark}; display: block;">MENOS TEMPO DE TELA</span>
                <strong style="font-size: 16px; color: #27ae60;">${analysis.lowScreenPunctuality}% no prazo</strong>
              </div>
              <div>
                <span style="font-size: 11px; color: ${PALETTE.grayDark}; display: block;">MAIS TEMPO DE TELA</span>
                <strong style="font-size: 16px; color: #e67e22;">${analysis.highScreenPunctuality}% no prazo</strong>
              </div>
            </div>
            <span style="font-size: 11px; color: ${PALETTE.grayDark}; display: block; margin-top: 6px;">
              Coincidência observada em ${analysis.dayCount} dias de uso
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderWeeklyLogCard() {
    if (state.flags && state.flags.LOG_SEMANAL === false) {
      return '';
    }
    const weeklyLogs = state.weeklyLogs || [];
    const latestLog = weeklyLogs[weeklyLogs.length - 1];
    let subtitle = "Snapshot imutável com taxas de pontualidade, cumprimento e reflexão acolhedora da gatinha.";
    if (latestLog && latestLog.snapshotJson) {
      try {
        const snap = JSON.parse(latestLog.snapshotJson);
        const ratePct = Math.round((snap.rates ? snap.rates.fulfillment : 1) * 100);
        subtitle = `Semana ${snap.period ? snap.period.start : state.dayKey}: ${ratePct}% de cumprimento · Carta pronta!`;
      } catch (e) {}
    }

    return `
      <div class="pixel-card" id="card-weekly-log" style="border: 2px solid ${PALETTE.cozyPurple}; background: #fffdfb; margin-bottom: 12px;">
        <div class="flex-row space-between" style="align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">🐾📖</span>
            <div>
              <h4 style="margin: 0; color: ${PALETTE.cozyPurple};">Log Semanal da Gatinha</h4>
              <span style="font-size: 13px; color: ${PALETTE.grayDark};">${subtitle}</span>
            </div>
          </div>
          <button class="pixel-btn btn-sm btn-pink" style="min-height: 48px; min-width: 48px; font-size: 13px;" onclick="window.app.openWeeklyLogViewer()">Ver Carta</button>
        </div>
      </div>
    `;
  }

  renderDelayBreakdownCard() {
    if (state.flags && state.flags.COMPROMISSOS === false) {
      return '';
    }
    const engine = (typeof delayMetricsEngine !== 'undefined' && delayMetricsEngine)
      ? delayMetricsEngine
      : (typeof CatLineDelayMetricsEngine !== 'undefined' ? (CatLineDelayMetricsEngine.delayMetricsEngine || CatLineDelayMetricsEngine) : null);

    if (!engine) return '';

    const cfg = state.commitmentsConfig || (typeof CatLineCommitmentsConfig !== 'undefined' ? (CatLineCommitmentsConfig.DEFAULT_CONFIG || CatLineCommitmentsConfig) : {});
    const metrics = engine.computeMetrics(state.occurrences || [], state.checkIns || [], cfg, 'America/Sao_Paulo');

    if (!metrics.hasSufficientData) {
      return `
        <div class="pixel-card cream" id="card-delay-breakdowns" style="border-left: 6px solid ${PALETTE.goldenYarn}; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">🐾🧶</span>
            <div>
              <strong style="font-size: 15px; color: ${PALETTE.ink}; display: block;">Ritmo e Pontualidade da Rotina</strong>
              <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin: 4px 0 0 0;">
                ${metrics.gentleObservation} (${metrics.uniqueDaysCount} de 7 dias observados)
              </p>
            </div>
          </div>
        </div>
      `;
    }

    const b = metrics.breakdown || {};
    const catKeys = Object.keys(b.byCategory || {});
    const dowKeys = Object.keys(b.byDayOfWeek || {});
    const slotKeys = Object.keys(b.byTimeSlot || {});
    const dowNames = { '1': 'Segunda', '2': 'Terça', '3': 'Quarta', '4': 'Quinta', '5': 'Sexta', '6': 'Sábado', '7': 'Domingo' };
    const slotNames = { madrugada: 'Madrugada', manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };

    return `
      <div class="pixel-card" id="card-delay-breakdowns" style="margin-bottom: 12px;">
        <h4>📊 Recortes de Pontualidade & Ritmo</h4>
        <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin: 4px 0 10px 0;">
          ${metrics.gentleObservation}
        </p>

        <!-- Recorte por Categoria -->
        <div style="margin-bottom: 12px;">
          <strong style="font-size: 13px; color: ${PALETTE.cozyPurple}; display: block; margin-bottom: 4px;">Recorte por Categoria:</strong>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${catKeys.map(k => {
              const item = b.byCategory[k];
              const pct = Math.round(item.punctualityRate * 100);
              return `
                <div class="breakdown-row" style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 6px; background: ${PALETTE.wallCream}; border: 1px solid #e0e0e0;">
                  <span><strong>${k}</strong> · ${item.doneCount} feitos</span>
                  <span>Pontual: <strong>${pct}%</strong> · Mediana: <strong>${Math.round(item.medianLateMinutes)} min</strong></span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Recorte por Dia da Semana -->
        <div style="margin-bottom: 12px;">
          <strong style="font-size: 13px; color: ${PALETTE.cozyPurple}; display: block; margin-bottom: 4px;">Recorte por Dia da Semana:</strong>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${dowKeys.map(k => {
              const item = b.byDayOfWeek[k];
              const pct = Math.round(item.punctualityRate * 100);
              return `
                <div class="breakdown-row" style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 6px; background: ${PALETTE.wallCream}; border: 1px solid #e0e0e0;">
                  <span><strong>${dowNames[k] || k}</strong> · ${item.doneCount} feitos</span>
                  <span>Pontual: <strong>${pct}%</strong> · Mediana: <strong>${Math.round(item.medianLateMinutes)} min</strong></span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Recorte por Faixa de Horário -->
        <div>
          <strong style="font-size: 13px; color: ${PALETTE.cozyPurple}; display: block; margin-bottom: 4px;">Recorte por Faixa de Horário:</strong>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            ${slotKeys.map(k => {
              const item = b.byTimeSlot[k];
              const pct = Math.round(item.punctualityRate * 100);
              return `
                <div class="breakdown-row" style="display: flex; justify-content: space-between; font-size: 13px; padding: 4px 6px; background: ${PALETTE.wallCream}; border: 1px solid #e0e0e0;">
                  <span><strong>${slotNames[k] || k}</strong> · ${item.doneCount} feitos</span>
                  <span>Pontual: <strong>${pct}%</strong> · Mediana: <strong>${Math.round(item.medianLateMinutes)} min</strong></span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // Relatório Beta Local Seguro (Fase 6)
  renderBetaReportCard() {
    const report = betaReportEngine.generateAnonymousReport(state);
    const reportJson = JSON.stringify(report, null, 2);

    return `
      <div class="pixel-card lilac" style="border: 2px solid #5d6d7e; background: #f8f9f9; margin-top: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #5d6d7e; text-transform: uppercase; letter-spacing: 0.5px; display: block;">
              Auditoria & Suporte Beta
            </span>
            <strong style="font-size: 16px; color: #2c3e50; display: block;">
              Relatório Beta Local Seguro
            </strong>
          </div>
          <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.copyBetaReportToClipboard()">
            📋 Copiar Relatório
          </button>
        </div>

        <p style="font-size: 12px; color: ${PALETTE.grayDark}; margin: 6px 0 10px 0; line-height: 1.4;">
          Diagnóstico local gerado sem uso de internet. Este relatório contém apenas contagens estatísticas anônimas, sem nenhum texto livre ou compromisso pessoal.
        </p>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #fff; border: 1px solid #d5d8dc; border-radius: 4px; padding: 8px; font-size: 11px;">
          <div>
            <span style="color: ${PALETTE.grayDark}; display: block;">VERSÃO</span>
            <strong style="color: #2c3e50;">v${report.version}</strong>
          </div>
          <div>
            <span style="color: ${PALETTE.grayDark}; display: block;">PONTUALIDADE</span>
            <strong style="color: #27ae60;">${report.telemetry.completionRatePct}%</strong>
          </div>
          <div>
            <span style="color: ${PALETTE.grayDark}; display: block;">REDE USADA</span>
            <strong style="color: #2980b9;">0 bytes · Offline</strong>
          </div>
        </div>

        <details style="margin-top: 8px; font-size: 11px;">
          <summary style="cursor: pointer; color: #5d6d7e; font-weight: 700;">Ver Dados Técnicos do Relatório</summary>
          <pre style="background: #2c3e50; color: #ecf0f1; padding: 8px; border-radius: 4px; overflow-x: auto; font-size: 10px; margin-top: 6px; max-height: 180px;">${reportJson}</pre>
        </details>
      </div>
    `;
  }

  copyBetaReportToClipboard() {
    const report = betaReportEngine.generateAnonymousReport(state);
    const jsonStr = JSON.stringify(report, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        audio.playBlip();
        alert("Relatório anônimo copiado para a área de transferência com sucesso!");
      }).catch(() => {
        alert("Não foi possível copiar automaticamente.");
      });
    } else {
      prompt("Copie os dados do relatório abaixo:", jsonStr);
    }
  }

  // CRUD de Compromissos (Hoje & Agenda)
  startEditOccurrence(id) {
    state.editingOccurrenceId = id;
    audio.playBlip();
    this.renderActiveTab();
  }

  cancelEditOccurrence() {
    state.editingOccurrenceId = null;
    audio.playBlip();
    this.renderActiveTab();
  }

  dismissUpdateBanner() {
    state.availableUpdate = null;
    this.renderActiveTab();
  }

  selectAgendaDay(dayStr) {
    state.agendaSelectedDay = dayStr;
    audio.playBlip();
    this.renderActiveTab();
  }

  hasTimeConflict(occ) {
    const st = String(occ.state || 'pending').toLowerCase();
    if (st === 'done' || st === 'feito') return false;
    const toMin = (hhmm) => {
      const [h, m] = String(hhmm || '00:00').split(':').map(Number);
      return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
    };
    const startA = toMin(occ.time);
    const endA = startA + (occ.estimatedDuration || occ.plannedMinutes || 30);
    const dayA = occ.date || state.dayKey;
    return (state.occurrences || []).some(other => {
      if (other.id === occ.id) return false;
      const ost = String(other.state || 'pending').toLowerCase();
      if (ost === 'done' || ost === 'feito') return false;
      const dayB = other.date || state.dayKey;
      if (dayA !== dayB) return false;
      const startB = toMin(other.time);
      const endB = startB + (other.estimatedDuration || other.plannedMinutes || 30);
      return startA < endB && startB < endA;
    });
  }

  renderAgendaWeekStrip(selectedDay) {
    const base = Clock.newDate(state.dayKey + 'T12:00:00');
    const dow = (base.getDay() + 6) % 7; // Seg=0 .. Dom=6
    const monday = Clock.newDate(base.getTime() - dow * 86400000);
    const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const d = Clock.newDate(monday.getTime() + i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const dayOccs = (state.occurrences || []).filter(o => (o.date || state.dayKey) === iso || (!o.date && iso === state.dayKey));
      const mins = dayOccs.reduce((acc, o) => acc + (o.estimatedDuration || o.plannedMinutes || 30), 0);
      const isSel = iso === selectedDay;
      const isToday = iso === state.dayKey;
      cells.push(`
        <button onclick="window.app.selectAgendaDay('${iso}')" style="flex:1; min-width:42px; padding:6px 4px; border-radius:8px; border:2px solid ${isSel ? PALETTE.cozyPurple : '#d5d8dc'}; background:${isSel ? '#f3ecff' : '#fff'}; cursor:pointer; text-align:center;">
          <div style="font-size:11px; font-weight:700; color:${isToday ? '#e67e22' : PALETTE.grayDark};">${labels[i]}</div>
          <div style="font-size:13px; font-weight:800; color:${PALETTE.ink};">${iso.slice(8, 10)}</div>
          <div style="font-size:10px; color:${PALETTE.cozyPurple};">${dayOccs.length} · ${mins}m</div>
        </button>
      `);
    }
    return `
      <div class="pixel-card cream" style="margin-bottom: 10px; padding: 10px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <strong style="font-size:13px;">🗓️ Visão da Semana</strong>
          <span style="font-size:11px; color:${PALETTE.grayDark};">Toque no dia para ver ou agendar</span>
        </div>
        <div style="display:flex; gap:4px; overflow-x:auto;">${cells.join('')}</div>
      </div>
    `;
  }

  saveEditOccurrence(id) {
    const occ = state.occurrences.find(o => o.id === id);
    if (!occ) return;
    const titleEl = document.getElementById(`edit-occ-title-${id}`);
    const timeEl = document.getElementById(`edit-occ-time-${id}`);
    const effortEl = document.getElementById(`edit-occ-effort-${id}`);
    const recurrenceEl = document.getElementById(`edit-occ-recurrence-${id}`);
    const dateEl = document.getElementById(`edit-occ-date-${id}`);
    if (titleEl && titleEl.value.trim()) occ.title = titleEl.value.trim();
    if (timeEl && timeEl.value) occ.time = timeEl.value;
    if (effortEl) {
      occ.effort = effortEl.value;
      occ.reward = occ.effort === 'G' ? 20 : (occ.effort === 'M' ? 10 : 5);
    }
    const durEl = document.getElementById(`edit-occ-duration-${id}`);
    if (durEl && durEl.value) occ.estimatedDuration = parseInt(durEl.value, 10);
    if (recurrenceEl) {
      occ.recurrence = recurrenceEl.value;
      occ.maxRuns = occ.recurrence === 'Pontual · 2 vezes' ? 2 : (occ.recurrence === 'Pontual · 1 vez' ? 1 : 0);
    }
    const notesEl = document.getElementById(`edit-occ-notes-${id}`);
    if (notesEl) occ.notes = notesEl.value.trim();
    if (dateEl && dateEl.value) occ.date = dateEl.value;
    state.editingOccurrenceId = null;
    audio.playMeowGreeting();
    this.renderActiveTab();
    this.persist();
  }

  deleteOccurrence(id) {
    const idx = state.occurrences.findIndex(o => o.id === id);
    if (idx === -1) return;
    const occ = state.occurrences[idx];
    state.lastDeletedItem = { type: 'occurrence', item: { ...occ }, index: idx };
    state.occurrences.splice(idx, 1);
    if (state.editingOccurrenceId === id) state.editingOccurrenceId = null;
    audio.playBlip();
    this.setCatSpeech(`"${occ.title}" foi descartado. Toque em Desfazer abaixo se foi sem querer!`);
    this.showUndoSnackbar(`Compromisso "${occ.title}" excluído`);
    this.renderActiveTab();
    this.persist();
  }

  renderTabAgenda() {
    const selDay = state.agendaSelectedDay || state.dayKey;
    const workload = replanEngine.calculateDailyWorkload(state.occurrences, selDay);
    const capacity = replanEngine.getDailyCapacity(state.briefing);
    const isOver = workload.totalMinutes > capacity;
    const pct = Math.min(100, Math.round((workload.totalMinutes / capacity) * 100));

    const pre = state.scheduledStepPreFill;
    const initialTitle = pre ? pre.title : '';
    const initialDuration = pre && pre.estMinutes ? pre.estMinutes : 30;

    this.contentEl.innerHTML = `
      ${this.renderAgendaWeekStrip(selDay)}
      <div class="pixel-card">
        <h4>📅 Agenda · Novo Compromisso</h4>
        <p style="font-size: 14px; color: ${PALETTE.grayDark}; margin-bottom: 10px;">Defina título, horário, esforço, duração estimada e frequência recorrente:</p>
        ${pre ? `
          <div style="background: #e8f8f5; padding: 6px 10px; border: 1px dashed #27ae60; font-size: 13px; margin-bottom: 8px;">
            🧶 Agendando passo da meta: <strong>${pre.title}</strong>
          </div>
        ` : ''}
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="flex-row">
            <span style="font-size: 20px;">🧶</span>
            <input type="text" id="new-task-title" class="pixel-input" placeholder="Título do compromisso: Treino, Reunião, Estudo" value="${initialTitle}">
          </div>
          <div class="flex-row">
            <span style="font-size: 20px;">⏰</span>
            <input type="time" id="new-task-time" class="pixel-input" value="19:00">
            <select id="new-task-effort" class="pixel-input" style="flex: 1; min-width: 100px;">
              <option value="P">Esforço P (+5🐟)</option>
              <option value="M" selected>Esforço M (+10🐟)</option>
              <option value="G">Esforço G (+20🐟)</option>
            </select>
            <select id="new-task-duration" class="pixel-input" style="flex: 1; min-width: 110px;">
              <option value="15" ${initialDuration === 15 ? 'selected' : ''}>Duração: 15 min</option>
              <option value="30" ${initialDuration === 30 ? 'selected' : ''}>Duração: 30 min</option>
              <option value="45" ${initialDuration === 45 ? 'selected' : ''}>Duração: 45 min</option>
              <option value="60" ${initialDuration === 60 ? 'selected' : ''}>Duração: 60 min</option>
              <option value="90" ${initialDuration === 90 ? 'selected' : ''}>Duração: 90 min</option>
              <option value="120" ${initialDuration === 120 ? 'selected' : ''}>Duração: 120 min</option>
            </select>
          </div>
          <div class="flex-row">
            <span style="font-size: 20px;">🔄</span>
            <select id="new-task-recurrence" class="pixel-input">
              <option value="Todos os dias" selected>🔄 Recorrente · Todos os dias</option>
              <option value="Dias úteis">💼 Recorrente · Dias úteis de segunda a sexta</option>
              <option value="Finais de semana">🏖️ Recorrente · Finais de semana sábado e domingo</option>
              <option value="3x por semana">✨ Recorrente · 3x por semana</option>
              <option value="Semanal">📆 Recorrente · Semanal uma vez por semana</option>
              <option value="Apenas hoje">📌 Pontual · Apenas hoje</option>
              <option value="Pontual · 1 vez">⚡ Pontual · Só 1 vez</option>
              <option value="Pontual · 2 vezes">⚡ Pontual · Só 2 vezes</option>
              <option value="Data específica">📅 Pontual · Data específica</option>
            </select>
            <input type="date" id="new-task-date" class="pixel-input" value="${selDay}" style="flex: 1; min-width: 120px;" title="Data do compromisso">
          </div>
          <input type="text" id="new-task-notes" class="pixel-input" placeholder="📝 Notas / checklist rápido (opcional)">
          <button class="pixel-btn btn-green" onclick="window.app.addCommitment()">Enrolar na Agenda</button>
        </div>
      </div>

      <!-- Barra Resumo de Carga Diária -->
      <div class="pixel-card cream" style="border-left: 6px solid ${isOver ? '#e67e22' : PALETTE.cozyPurple}; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px;">
          <strong>⏱️ Carga Diária Planejada:</strong>
          <span style="font-weight: 700; color: ${isOver ? '#d35400' : PALETTE.cozyPurple};">
            ${workload.totalMinutes} min de ${capacity} min acolhedores
          </span>
        </div>
        <div style="width: 100%; height: 8px; background: #e0e0e0; margin-top: 8px; border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${pct}%; background: ${isOver ? '#e67e22' : '#27ae60'}; transition: width 0.3s ease;"></div>
        </div>
      </div>

      <!-- Card de Replanejamento e Calibração -->
      ${this.renderReplanCard()}
      ${this.renderCalibrationCard()}

      <div class="pixel-card cream">
        <div class="flex-row space-between">
          <h4>Compromissos Agendados (${state.occurrences.filter(o => o.state === 'FEITO').length}/${state.occurrences.length})</h4>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
          ${state.occurrences.map(o => {
            const isEditing = state.editingOccurrenceId === o.id;
            const rec = o.recurrence || 'Todos os dias';
            const isDone = o.state === 'FEITO';
            if (isEditing) {
              return `
                <div class="inline-edit-box">
                  <strong>✏️ Editar Compromisso:</strong>
                  <input type="text" id="edit-occ-title-${o.id}" class="pixel-input" value="${o.title}">
                  <div class="flex-row">
                    <input type="time" id="edit-occ-time-${o.id}" class="pixel-input" value="${o.time}">
                    <select id="edit-occ-effort-${o.id}" class="pixel-input">
                      <option value="P" ${o.effort === 'P' ? 'selected' : ''}>P (+5🐟)</option>
                      <option value="M" ${o.effort === 'M' ? 'selected' : ''}>M (+10🐟)</option>
                      <option value="G" ${o.effort === 'G' ? 'selected' : ''}>G (+20🐟)</option>
                    </select>
                    <select id="edit-occ-duration-${o.id}" class="pixel-input" style="flex: 1;">
                      <option value="15" ${(o.estimatedDuration || 30) === 15 ? 'selected' : ''}>15 min</option>
                      <option value="30" ${(o.estimatedDuration || 30) === 30 ? 'selected' : ''}>30 min</option>
                      <option value="45" ${(o.estimatedDuration || 30) === 45 ? 'selected' : ''}>45 min</option>
                      <option value="60" ${(o.estimatedDuration || 30) === 60 ? 'selected' : ''}>60 min</option>
                      <option value="90" ${(o.estimatedDuration || 30) === 90 ? 'selected' : ''}>90 min</option>
                      <option value="120" ${(o.estimatedDuration || 30) === 120 ? 'selected' : ''}>120 min</option>
                    </select>
                  </div>
                  <div class="flex-row">
                    <select id="edit-occ-recurrence-${o.id}" class="pixel-input">
                      <option value="Todos os dias" ${rec === 'Todos os dias' ? 'selected' : ''}>🔄 Todos os dias</option>
                      <option value="Dias úteis" ${rec === 'Dias úteis' ? 'selected' : ''}>💼 Dias úteis de segunda a sexta</option>
                      <option value="Finais de semana" ${rec === 'Finais de semana' ? 'selected' : ''}>🏖️ Finais de semana sábado e domingo</option>
                      <option value="3x por semana" ${rec === '3x por semana' ? 'selected' : ''}>✨ 3x por semana</option>
                      <option value="Semanal" ${rec === 'Semanal' ? 'selected' : ''}>📆 Semanal uma vez por semana</option>
                      <option value="Apenas hoje" ${rec === 'Apenas hoje' ? 'selected' : ''}>📌 Apenas hoje</option>
                      <option value="Data específica" ${rec === 'Data específica' ? 'selected' : ''}>📅 Data específica</option>
                    </select>
                    <input type="date" id="edit-occ-date-${o.id}" class="pixel-input" value="${o.date || state.dayKey}" style="flex: 1; min-width: 120px;">
                  </div>
                  <div class="flex-row space-between" style="margin-top: 4px;">
                    <button class="pixel-btn btn-sm btn-green" onclick="window.app.saveEditOccurrence('${o.id}')">Salvar</button>
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.cancelEditOccurrence()">Cancelar</button>
                  </div>
                </div>
              `;
            }
            return `
              <div class="mobile-stack-item" style="background: ${isDone ? '#e6f4ea' : '#fff'}; padding: 10px 12px; border: 2px solid ${PALETTE.ink}; font-size: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                  <div style="flex: 1; min-width: 0;">
                    <strong style="font-size: 16px; display: block; word-break: break-word;">${o.title}</strong>
                    <span style="font-size: 13px; color: ${PALETTE.grayDark}; display: block; margin-top: 2px;">
                      ⏰ ${o.time} · ⏱️ ${o.estimatedDuration || (o.effort === 'G' ? 60 : (o.effort === 'M' ? 30 : 15))} min · Esforço ${o.effort} (+${o.reward}🐟) · <span style="color: ${PALETTE.cozyPurple}; font-weight: 700;">${rec}</span>
                    </span>
                    ${isDone && o.actualDuration ? `
                      <span style="font-size: 12px; color: #2e7d32; display: block; margin-top: 2px;">
                        ✓ Concluído em ${o.actualDuration} min
                      </span>
                    ` : ''}
                  </div>
                  <span class="status-badge-pill ${isDone ? 'done' : 'pending'}">
                    ${isDone ? 'FEITO ✓' : 'PENDENTE'}
                  </span>
                </div>
                <div class="card-action-footer">
                  ${isDone
                    ? `
                      <button class="pixel-btn btn-sm btn-secondary" style="flex: 1;" onclick="window.app.unmarkDone('${o.id}')" title="Reabrir">↩ Reabrir Compromisso</button>
                    `
                    : `
                      <button class="pixel-btn btn-sm btn-green" style="flex: 1.3;" onclick="window.app.markDone('${o.id}')" title="Marcar como Feito">✓ Feito (+${o.reward}🐟)</button>
                      <button class="pixel-btn btn-sm" style="flex: 1;" onclick="window.app.startActiveExecution('${o.id}', 'occurrence')" title="Fazer com a gatinha">▶️ Fazer</button>
                      <button class="pixel-btn btn-sm btn-purple" onclick="window.app.retroCheckIn('${o.id}')" title="Check-in Retroativo">Retro</button>
                    `
                  }
                  <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditOccurrence('${o.id}')" title="Editar">✏️</button>
                  <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteOccurrence('${o.id}')" title="Descartar">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    this.renderCommitmentModals();
  }

  addCommitment() {
    const titleEl = document.getElementById('new-task-title');
    const timeEl = document.getElementById('new-task-time');
    const effortEl = document.getElementById('new-task-effort');
    const durationEl = document.getElementById('new-task-duration');
    const recurrenceEl = document.getElementById('new-task-recurrence');
    const dateEl = document.getElementById('new-task-date');

    const title = titleEl ? titleEl.value.trim() : '';
    const time = timeEl ? timeEl.value : '19:00';
    const effort = effortEl ? effortEl.value : 'M';
    const estimatedDuration = durationEl ? parseInt(durationEl.value, 10) : (effort === 'G' ? 60 : (effort === 'M' ? 30 : 15));
    const recurrence = recurrenceEl ? recurrenceEl.value : 'Todos os dias';
    const date = dateEl && dateEl.value ? dateEl.value : state.dayKey;
    const notesEl = document.getElementById('new-task-notes');
    const notes = notesEl ? notesEl.value.trim() : '';
    if (!title) return;

    const reward = effort === 'G' ? 20 : (effort === 'M' ? 10 : 5);
    const pre = state.scheduledStepPreFill;
    const goalId = pre ? pre.goalId : null;
    const stepId = pre ? pre.stepId : null;
    const maxRuns = recurrence === 'Pontual · 2 vezes' ? 2 : (recurrence === 'Pontual · 1 vez' ? 1 : 0);

    state.occurrences.push({
      id: `occ-${Clock.now()}`,
      title,
      time,
      plannedStart: `${date}T${time}:00`,
      plannedZone: 'America/Sao_Paulo',
      plannedMinutes: estimatedDuration,
      goalId,
      stepId,
      category: 'ESTUDAR_LER',
      effort,
      reward,
      estimatedDuration,
      recurrence,
      maxRuns,
      completedRuns: 0,
      notes,
      date,
      state: 'pending',
      delayMin: 0
    });

    state.scheduledStepPreFill = null;

    audio.playMeowGreeting();
    this.setCatSpeech(`Compromisso "${title}" adicionado.`);
    this.renderActiveTab();
    this.persist();
  }

  // CRUD de Hábitos
  createHabit() {
    const titleEl = document.getElementById('new-habit-title');
    const windowEl = document.getElementById('new-habit-window');
    const freqEl = document.getElementById('new-habit-freq');
    const title = titleEl ? titleEl.value.trim() : '';
    if (!title) return;

    const newHabit = {
      id: `hab-${Clock.now()}`,
      title,
      window: (windowEl && windowEl.value) || '22:00',
      frequency: (freqEl && freqEl.value) || 'Todos os dias',
      streak: 0,
      bestStreak: 0,
      totalCheckIns: 0,
      completed: false
    };

    state.habits.push(newHabit);
    audio.playMeowCelebrate();
    this.setCatSpeech(`Hábito "${title}" criado.`);
    this.renderActiveTab();
    this.persist();
  }

  startEditHabit(id) {
    state.editingHabitId = id;
    audio.playBlip();
    this.renderActiveTab();
  }

  cancelEditHabit() {
    state.editingHabitId = null;
    audio.playBlip();
    this.renderActiveTab();
  }

  saveEditHabit(id) {
    const habit = state.habits.find(h => h.id === id);
    if (!habit) return;
    const titleEl = document.getElementById(`edit-habit-title-${id}`);
    const windowEl = document.getElementById(`edit-habit-window-${id}`);
    const freqEl = document.getElementById(`edit-habit-freq-${id}`);
    const streakEl = document.getElementById(`edit-habit-streak-${id}`);

    if (titleEl && titleEl.value.trim()) habit.title = titleEl.value.trim();
    if (windowEl && windowEl.value) habit.window = windowEl.value;
    if (freqEl) habit.frequency = freqEl.value;
    if (streakEl) habit.streak = Math.max(0, parseInt(streakEl.value || '0', 10));

    state.editingHabitId = null;
    audio.playMeowGreeting();
    this.renderActiveTab();
    this.persist();
  }

  deleteHabit(id) {
    const idx = state.habits.findIndex(h => h.id === id);
    if (idx === -1) return;
    const habit = state.habits[idx];
    state.lastDeletedItem = { type: 'habit', item: { ...habit }, index: idx };
    state.habits.splice(idx, 1);
    if (state.editingHabitId === id) state.editingHabitId = null;
    audio.playBlip();
    this.setCatSpeech(`Hábito "${habit.title}" descartado. Você pode desfazer abaixo!`);
    this.showUndoSnackbar(`Hábito "${habit.title}" excluído`);
    this.renderActiveTab();
    this.persist();
  }

  renderTabHabitos() {
    this.contentEl.innerHTML = `
      <!-- Formulário: Novo Hábito -->
      <div class="pixel-card">
        <h4>🔄 Criar Novo Hábito</h4>
        <p style="font-size: 14px; color: ${PALETTE.grayDark}; margin-bottom: 10px;">Defina seu hábito, janela de horário e frequência:</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="new-habit-title" class="pixel-input" placeholder="Título do hábito">
          <div class="flex-row">
            <input type="time" id="new-habit-window" class="pixel-input" value="21:00" title="Janela de horário limite">
            <select id="new-habit-freq" class="pixel-input">
              <option value="Todos os dias">Todos os dias</option>
              <option value="Dias úteis">Dias úteis</option>
              <option value="3x por semana">3x por semana</option>
              <option value="Finais de semana">Finais de semana</option>
            </select>
          </div>
          <button class="pixel-btn btn-green" onclick="window.app.createHabit()">Criar Hábito</button>
        </div>
      </div>

      <!-- Lista de Hábitos: Editáveis e Descartáveis -->
      <div class="pixel-card">
        <div class="flex-row space-between">
          <h4>Seus Hábitos Ativos</h4>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
          ${state.habits.map(h => {
            const isEditing = state.editingHabitId === h.id;
            if (isEditing) {
              return `
                <div class="inline-edit-box">
                  <strong>✏️ Editar Hábito:</strong>
                  <input type="text" id="edit-habit-title-${h.id}" class="pixel-input" value="${h.title}">
                  <div class="flex-row">
                    <input type="time" id="edit-habit-window-${h.id}" class="pixel-input" value="${h.window}">
                    <select id="edit-habit-freq-${h.id}" class="pixel-input">
                      <option value="Todos os dias" ${h.frequency === 'Todos os dias' ? 'selected' : ''}>Todos os dias</option>
                      <option value="Dias úteis" ${h.frequency === 'Dias úteis' ? 'selected' : ''}>Dias úteis</option>
                      <option value="3x por semana" ${h.frequency === '3x por semana' ? 'selected' : ''}>3x por semana</option>
                      <option value="Finais de semana" ${h.frequency === 'Finais de semana' ? 'selected' : ''}>Finais de semana</option>
                    </select>
                  </div>
                  <div class="flex-row">
                    <span style="font-size: 14px;">Sequência atual:</span>
                    <input type="number" id="edit-habit-streak-${h.id}" class="pixel-input" value="${h.streak}" style="width: 90px;" min="0">
                  </div>
                  <div class="flex-row space-between" style="margin-top: 4px;">
                    <button class="pixel-btn btn-sm btn-green" onclick="window.app.saveEditHabit('${h.id}')">Salvar</button>
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.cancelEditHabit()">Cancelar</button>
                  </div>
                </div>
              `;
            }
            return `
              <div class="mobile-stack-item" style="background: ${h.completed ? '#e6f4ea' : PALETTE.wallCream}; padding: 10px 12px; border: 2px solid ${PALETTE.ink};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                  <div style="flex: 1; min-width: 0;">
                    <strong style="font-size: 16px; display: block; word-break: break-word;">${h.title}</strong>
                    <span style="font-size: 13px; color: ${PALETTE.grayDark}; display: block; margin-top: 2px;">
                      🔥 Sequência: <strong>${h.streak}d</strong> (Recorde: ${h.bestStreak || h.streak}d) · Até ${h.window} · ${h.frequency || 'Diário'}
                    </span>
                  </div>
                  <span class="status-badge-pill ${h.completed ? 'done' : 'pending'}">
                    ${h.completed ? 'CUMPRIDO ✓' : '+8🐟'}
                  </span>
                </div>
                <div class="card-action-footer">
                  ${h.completed
                    ? `<button class="pixel-btn btn-sm btn-secondary" style="flex: 1;" onclick="window.app.uncompleteHabit('${h.id}')">↩ Reabrir Hábito</button>`
                    : `
                      <button class="pixel-btn btn-sm btn-green" style="flex: 1.3;" onclick="window.app.completeHabit('${h.id}')">✓ Cumprir Hábito (+8🐟)</button>
                      <button class="pixel-btn btn-sm" style="flex: 1;" onclick="window.app.startActiveExecution('${h.id}', 'habit')">▶️ Fazer Agora</button>
                    `
                  }
                  <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditHabit('${h.id}')" title="Editar">✏️</button>
                  <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteHabit('${h.id}')" title="Descartar">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pixel-card cream">
        <h4>Novelo Reserva</h4>
        <p>Você tem <strong>${state.cat.reserveYarns}</strong> novelos reserva guardados para proteger sequências em dias perdidos.</p>
        <button class="pixel-btn btn-gold" style="margin-top: 10px;" onclick="window.app.useReserveYarn()">Usar Novelo Reserva</button>
      </div>
    `;
  }

  completeHabit(id) {
    const h = state.habits.find(x => x.id === id);
    if (!h || h.completed) return;
    h.completed = true;
    if (state.activeExecutionId === id) {
      if (h.startedAt) {
        h.actualDuration = Math.max(1, Math.round((Clock.now() - h.startedAt) / 60000));
      }
      state.activeExecutionId = null;
      state.activeExecutionType = null;
    }
    if (!h.actualDuration) {
      h.actualDuration = h.estimatedDuration || 15;
    }
    h.completedAt = Clock.isoString();
    this.recordDurationSample(h);

    h.streak++;
    h.totalCheckIns = (h.totalCheckIns || 0) + 1;
    if (h.streak > (h.bestStreak || 0)) h.bestStreak = h.streak;
    state.currencies.peixinhos += 8;
    state.currencies.vinculo += 8;
    if (typeof minuteBankEngine !== 'undefined') {
      minuteBankEngine.creditMinutes(state, minuteBankEngine.MINUTES_PER_TASK, 'Hábito cumprido', id);
    }

    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.setCatSpeech(`Hábito "${h.title}" cumprido! +8🐟`);
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  useReserveYarn() {
    if (state.cat.reserveYarns > 0) {
      state.cat.reserveYarns--;
      audio.playMeowCelebrate();
      alert("Novelo reserva ativado! Sua sequência de hábitos de ontem foi protegida.");
      this.renderActiveTab();
      this.persist();
    } else {
      alert("Você não tem novelos reserva guardados no momento.");
    }
  }

  // CRUD de Metas com Cronômetro em Dias
  updateGoalDaysByHorizon(horizonVal, daysInputId) {
    const input = document.getElementById(daysInputId);
    if (!input) return;
    if (horizonVal === 'SEMANA') input.value = 7;
    else if (horizonVal === 'MES') input.value = 30;
    else if (horizonVal === 'TRIMESTRE') input.value = 90;
    else if (horizonVal === 'VIDA') input.value = 365;
  }

  createGoalWithColor() {
    const titleEl = document.getElementById('new-goal-title');
    const horizonEl = document.getElementById('new-goal-horizon');
    const colorEl = document.getElementById('new-goal-color');
    const daysEl = document.getElementById('new-goal-days');
    const rewardEl = document.getElementById('new-goal-reward');
    const costEl = document.getElementById('new-goal-cost');

    const title = titleEl ? titleEl.value.trim() : '';
    if (!title) return;

    const days = Math.max(1, parseInt((daysEl && daysEl.value) || '7', 10));
    const totalSecs = days * 86400;
    const newId = `g-${Clock.now()}`;
    const newGoal = {
      id: newId,
      horizon: (horizonEl && horizonEl.value) || 'SEMANA',
      title,
      yarnColorId: (colorEl && colorEl.value) || 'pink',
      totalDays: days,
      totalSeconds: totalSecs,
      remainingSeconds: totalSecs,
      progress: 0.0,
      reward: (rewardEl && rewardEl.value.trim()) || 'Mimo Especial',
      rewardCost: Math.max(10, parseInt((costEl && costEl.value) || '100', 10))
    };

    state.goals.unshift(newGoal);
    state.selectedGoalId = newId;
    audio.playMeowCelebrate();
    this.setCatSpeech(`Meta "${title}" criada para ${days} dias.`);
    this.renderTabMetas();
    this.persist();
  }

  startEditGoal(id) {
    state.editingGoalId = id;
    audio.playBlip();
    this.renderTabMetas();
  }

  cancelEditGoal() {
    state.editingGoalId = null;
    audio.playBlip();
    this.renderTabMetas();
  }

  saveEditGoal(id) {
    const g = state.goals.find(x => x.id === id);
    if (!g) return;
    const titleEl = document.getElementById(`edit-goal-title-${id}`);
    const horizonEl = document.getElementById(`edit-goal-horizon-${id}`);
    const colorEl = document.getElementById(`edit-goal-color-${id}`);
    const daysEl = document.getElementById(`edit-goal-days-${id}`);
    const rewardEl = document.getElementById(`edit-goal-reward-${id}`);
    const costEl = document.getElementById(`edit-goal-cost-${id}`);

    if (titleEl && titleEl.value.trim()) g.title = titleEl.value.trim();
    if (horizonEl) g.horizon = horizonEl.value;
    if (colorEl) g.yarnColorId = colorEl.value;
    if (daysEl) {
      const days = Math.max(1, parseInt(daysEl.value || '7', 10));
      g.totalDays = days;
      const newTotal = days * 86400;
      if (newTotal !== g.totalSeconds) {
        const ratio = g.totalSeconds > 0 ? (g.remainingSeconds / g.totalSeconds) : 1;
        g.totalSeconds = newTotal;
        g.remainingSeconds = Math.round(newTotal * ratio);
      }
    }
    if (rewardEl && rewardEl.value.trim()) g.reward = rewardEl.value.trim();
    if (costEl) g.rewardCost = Math.max(10, parseInt(costEl.value || '100', 10));

    state.editingGoalId = null;
    audio.playMeowGreeting();
    this.setCatSpeech(`Meta "${g.title}" atualizada com sucesso!`);
    this.renderTabMetas();
    this.persist();
  }

  deleteGoal(id) {
    const g = state.goals.find(x => x.id === id);
    const title = g ? g.title : 'Meta';
    state.goals = state.goals.filter(x => x.id !== id);
    if (state.editingGoalId === id) state.editingGoalId = null;

    // Se a meta descartada era a selecionada na patinha da gatinha, seleciona a primeira restante ou cria fallback
    if (state.selectedGoalId === id) {
      if (state.goals.length > 0) {
        state.selectedGoalId = state.goals[0].id;
      } else {
        const fallbackId = `g-${Clock.now()}`;
        state.goals.push({
          id: fallbackId,
          horizon: 'SEMANA',
          title: 'Nova Meta Pessoal',
          yarnColorId: 'pink',
          totalDays: 7,
          totalSeconds: 7 * 86400,
          remainingSeconds: 7 * 86400,
          progress: 0.0,
          reward: 'Descanso Especial',
          rewardCost: 100
        });
        state.selectedGoalId = fallbackId;
      }
    }

    audio.playBlip();
    this.setCatSpeech(`Meta "${title}" descartada.`);
    this.renderTabMetas();
    this.persist();
  }

  // Gestão de Passos de Metas (v3.2.0 · Prompt 8)
  addStepToGoal(goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;
    const titleEl = document.getElementById(`new-step-title-${goalId}`);
    const estEl = document.getElementById(`new-step-est-${goalId}`);
    const title = titleEl ? titleEl.value.trim() : '';
    const estMinutes = estEl && estEl.value ? parseInt(estEl.value, 10) : null;
    if (!title) return;

    if (goalStepEngine) {
      goalStepEngine.addStep(goal, title, estMinutes);
    } else {
      if (!goal.steps) goal.steps = [];
      const order = goal.steps.length + 1;
      goal.steps.push({
        id: 'step_' + Clock.now(),
        goalId: goal.id,
        title,
        order,
        estMinutes,
        targetDate: null,
        doneAt: null,
        archived: false
      });
    }

    audio.playBlip();
    this.setCatSpeech(`Passo "${title}" adicionado à meta!`);
    this.renderTabMetas();
    this.persist();
  }

  startEditStep(stepId) {
    state.editingStepId = stepId;
    audio.playBlip();
    this.renderTabMetas();
  }

  cancelEditStep() {
    state.editingStepId = null;
    audio.playBlip();
    this.renderTabMetas();
  }

  saveEditStep(goalId, stepId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal || !goal.steps) return;
    const titleEl = document.getElementById(`edit-step-title-${stepId}`);
    const estEl = document.getElementById(`edit-step-est-${stepId}`);
    const newTitle = titleEl ? titleEl.value.trim() : '';
    const newEst = estEl && estEl.value ? parseInt(estEl.value, 10) : null;
    if (!newTitle) return;

    if (goalStepEngine) {
      goalStepEngine.renameStep(goal, stepId, newTitle);
      const step = goal.steps.find(s => s.id === stepId);
      if (step) step.estMinutes = newEst;
    } else {
      const step = goal.steps.find(s => s.id === stepId);
      if (step) {
        step.title = newTitle;
        step.estMinutes = newEst;
      }
    }

    state.editingStepId = null;
    audio.playBlip();
    this.renderTabMetas();
    this.persist();
  }

  reorderGoalStep(goalId, stepId, delta) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal || !goal.steps) return;
    const step = goal.steps.find(s => s.id === stepId);
    if (!step) return;

    const newOrder = step.order + delta;
    if (goalStepEngine) {
      goalStepEngine.reorderStep(goal, stepId, newOrder);
    } else {
      step.order = Math.max(1, newOrder);
      goal.steps.sort((a, b) => a.order - b.order);
    }

    audio.playBlip();
    this.renderTabMetas();
    this.persist();
  }

  splitGoalStep(goalId, stepId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal || !goal.steps) return;
    const step = goal.steps.find(s => s.id === stepId);
    if (!step) return;

    const title1 = step.title + ' · Parte 1';
    const title2 = step.title + ' · Parte 2';
    const halfEst = step.estMinutes ? Math.max(5, Math.round(step.estMinutes / 2)) : null;

    if (goalStepEngine) {
      goalStepEngine.splitStep(goal, stepId, title1, title2, halfEst, halfEst);
    } else {
      step.title = title1;
      step.estMinutes = halfEst;
      goal.steps.push({
        id: 'step_' + Clock.now(),
        goalId: goal.id,
        title: title2,
        order: step.order + 1,
        estMinutes: halfEst,
        targetDate: step.targetDate,
        doneAt: null,
        archived: false
      });
      goal.steps.sort((a, b) => a.order - b.order);
    }

    audio.playMeowGreeting();
    this.setCatSpeech(`Passo dividido em 2 etapas mais leves!`);
    this.renderTabMetas();
    this.persist();
  }

  archiveGoalStep(goalId, stepId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal || !goal.steps) return;

    if (goalStepEngine) {
      goalStepEngine.archiveStep(goal, stepId);
    } else {
      const step = goal.steps.find(s => s.id === stepId);
      if (step) step.archived = true;
    }

    audio.playBlip();
    this.setCatSpeech(`Passo arquivado.`);
    this.renderTabMetas();
    this.persist();
  }

  toggleGoalStepDone(goalId, stepId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal || !goal.steps) return;
    const step = goal.steps.find(s => s.id === stepId);
    if (!step) return;

    const willBeDone = !step.doneAt;
    const nowIso = Clock.isoString();

    if (goalStepEngine) {
      goalStepEngine.toggleStepDone(goal, stepId, willBeDone ? nowIso : null);
    } else {
      step.doneAt = willBeDone ? nowIso : null;
    }

    if (willBeDone && rewardLedgerEngine) {
      const res = rewardLedgerEngine.awardStepDone(step, state.rewardEvents, state.commitmentsConfig, state.dayKey);
      if (res.events && res.events.length > 0) {
        state.rewardEvents = [...state.rewardEvents, ...res.events];
        state.currencies.peixinhos += res.fishGranted;
      }

      // Verifica se a meta foi concluída
      const progress = goalStepEngine ? goalStepEngine.calculateProgress(goal) : 0;
      if (progress >= 1.0) {
        const goalRes = rewardLedgerEngine.awardGoalDone(goal, state.rewardEvents, state.commitmentsConfig, state.dayKey);
        if (goalRes.events && goalRes.events.length > 0) {
          state.rewardEvents = [...state.rewardEvents, ...goalRes.events];
          state.currencies.peixinhos += goalRes.fishGranted;
          state.currencies.vinculo += goalRes.bondGranted;
          audio.playSuccessFanfare();
          this.setCatSpeech(`Parabéns! Meta "${goal.title}" 100% concluída! Ganhou ${goalRes.fishGranted}🐟 e ${goalRes.bondGranted}♥!`);
        }
      } else {
        audio.playMeowGreeting();
        this.setCatSpeech(`Passo concluído! +${res.fishGranted}🐟`);
      }
    } else {
      audio.playBlip();
    }

    this.renderTabMetas();
    this.persist();
  }

  scheduleStep(goalId, stepId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal || !goal.steps) return;
    const step = goal.steps.find(s => s.id === stepId);
    if (!step) return;

    state.scheduledStepPreFill = {
      goalId: goal.id,
      stepId: step.id,
      title: step.title,
      estMinutes: step.estMinutes || 30
    };

    audio.playBlip();
    this.switchTab('agenda');
    this.setCatSpeech(`Agendando passo "${step.title}"!`);
  }

  renderTabMetas() {
    this.contentEl.innerHTML = `
      <div class="pixel-card">
        <h4>🎯 Nova Meta com Novelo Colorido</h4>
        <p style="font-size: 14px; color: ${PALETTE.grayDark}; margin-bottom: 10px;">Defina o título, horizonte em dias, cor do novelo e mimo real:</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="new-goal-title" class="pixel-input" placeholder="Título da meta">
          <div class="flex-row">
            <select id="new-goal-horizon" class="pixel-input" style="width: 155px;" onchange="window.app.updateGoalDaysByHorizon(this.value, 'new-goal-days')">
              <option value="SEMANA">Semana · 7 dias</option>
              <option value="MES">Mês · 30 dias</option>
              <option value="TRIMESTRE">Trimestre · 90 dias</option>
              <option value="VIDA">Vida · 365 dias</option>
            </select>
            <select id="new-goal-color" class="pixel-input">
              ${YARN_COLORS.map(c => `<option value="${c.id}">Novelo ${c.name}</option>`).join('')}
            </select>
            <div class="flex-row" style="gap: 4px;">
              <input type="number" id="new-goal-days" class="pixel-input" value="7" min="1" max="3650" style="width: 80px;" title="Duração total em dias">
              <span style="font-size: 13px; font-weight: 700;">dias</span>
            </div>
          </div>
          <div class="flex-row">
            <input type="text" id="new-goal-reward" class="pixel-input" placeholder="Mimo real">
            <input type="number" id="new-goal-cost" class="pixel-input" value="100" min="10" max="1000" style="width: 110px;" title="Custo em Peixinhos">
          </div>
          <button class="pixel-btn btn-green" onclick="window.app.createGoalWithColor()">Criar Meta & Dar Novelo à Gatinha</button>
        </div>
      </div>

      <div class="pixel-card">
        <div class="flex-row space-between">
          <h4>🧶 Suas Metas</h4>
        </div>
        <p style="font-size: 14px; color: ${PALETTE.grayDark}; margin: 6px 0 10px 0;">O novelo enrola com o tempo em dias. Você pode editar qualquer meta, alterar cores ou descartar:</p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${state.goals.map(g => {
            const pal = getYarnPalette(g.yarnColorId);
            const isSel = g.id === state.selectedGoalId;
            const isEditing = state.editingGoalId === g.id;
            const currentDays = g.totalDays || Math.max(1, Math.round(g.totalSeconds / 86400));
            const activeSteps = (g.steps || []).filter(s => !s.archived);
            const stepProgressFraction = goalStepEngine ? goalStepEngine.calculateProgress(g) : (g.progress || 0);
            const stepProgressPct = Math.round(stepProgressFraction * 100);
            const woundPct = Math.max(stepProgressPct, Math.round(getWoundFractionByTime(g) * 100));

            if (isEditing) {
              return `
                <div class="inline-edit-box">
                  <strong>✏️ Editar Meta:</strong>
                  <input type="text" id="edit-goal-title-${g.id}" class="pixel-input" value="${g.title}">
                  <div class="flex-row">
                    <select id="edit-goal-horizon-${g.id}" class="pixel-input" style="width: 155px;" onchange="window.app.updateGoalDaysByHorizon(this.value, 'edit-goal-days-${g.id}')">
                      <option value="SEMANA" ${g.horizon === 'SEMANA' ? 'selected' : ''}>Semana · 7 dias</option>
                      <option value="MES" ${g.horizon === 'MES' ? 'selected' : ''}>Mês · 30 dias</option>
                      <option value="TRIMESTRE" ${g.horizon === 'TRIMESTRE' ? 'selected' : ''}>Trimestre · 90 dias</option>
                      <option value="VIDA" ${g.horizon === 'VIDA' ? 'selected' : ''}>Vida · 365 dias</option>
                    </select>
                    <select id="edit-goal-color-${g.id}" class="pixel-input">
                      ${YARN_COLORS.map(c => `<option value="${c.id}" ${c.id === g.yarnColorId ? 'selected' : ''}>Novelo ${c.name}</option>`).join('')}
                    </select>
                    <div class="flex-row" style="gap: 4px;">
                      <input type="number" id="edit-goal-days-${g.id}" class="pixel-input" value="${currentDays}" style="width: 80px;" title="Duração total em dias">
                      <span style="font-size: 13px; font-weight: 700;">dias</span>
                    </div>
                  </div>
                  <div class="flex-row">
                    <input type="text" id="edit-goal-reward-${g.id}" class="pixel-input" value="${g.reward || ''}" placeholder="Mimo real">
                    <input type="number" id="edit-goal-cost-${g.id}" class="pixel-input" value="${g.rewardCost}" style="width: 100px;" title="Custo 🐟">
                  </div>
                  <div class="flex-row space-between" style="margin-top: 4px;">
                    <button class="pixel-btn btn-sm btn-green" onclick="window.app.saveEditGoal('${g.id}')">Salvar</button>
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.cancelEditGoal()">Cancelar</button>
                  </div>
                </div>
              `;
            }

            return `
              <div style="background: ${isSel ? '#fff6d6' : PALETTE.wallCream}; padding: 12px; border: ${isSel ? '3px' : '2px'} solid ${PALETTE.ink}; box-shadow: ${isSel ? '3px 3px 0 ' + PALETTE.ink : 'none'};">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <canvas class="yarn-color-dot mini-yarn-canvas" width="22" height="22" data-color="${g.yarnColorId}" style="flex-shrink: 0; margin-top: 2px;"></canvas>
                    <div style="flex: 1; min-width: 0;">
                      <strong style="font-size: 16px; display: block; word-break: break-word;">${g.horizon} · ${g.title} (${currentDays}d)</strong>
                      <span style="font-size: 13px; color: ${pal.shadow}; font-weight: 700;">Novelo ${pal.name} · ⏳ <span id="goal-timer-${g.id}">${formatRemainingTime(g.remainingSeconds)}</span></span>
                    </div>
                  </div>
                  <div class="card-action-footer">
                    <button class="pixel-btn btn-sm ${isSel ? 'btn-gold' : ''}" style="flex: 1;" onclick="window.app.selectGoalYarn('${g.id}')">
                      ${isSel ? '🐾 Na Patinha da Gatinha ✓' : '🐾 Colocar na Patinha'}
                    </button>
                    <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditGoal('${g.id}')" title="Editar">✏️</button>
                    <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteGoal('${g.id}')" title="Descartar">🗑️</button>
                  </div>
                </div>

                <!-- Animação 8-bit do Novelo se Enrolando pelo Tempo -->
                <div class="novelo-bar-track-row" style="margin: 10px 0 6px 0;">
                  <canvas class="novelo-winding-canvas" data-goal-id="${g.id}"></canvas>
                  <span style="font-size: 14px; font-weight: 700; min-width: 78px; text-align: right;" id="goal-timepct-${g.id}">${woundPct}% enrolado</span>
                </div>

                <!-- Passos da Meta v3.2.0 · Prompt 8 -->
                ${(state.flags && state.flags.METAS_PASSOS === false) ? '' : `
                <div class="goal-steps-wrapper" style="margin-top: 10px; padding-top: 8px; border-top: 2px dashed #d5dbdb;">
                  <div class="flex-row space-between" style="margin-bottom: 6px;">
                    <strong style="font-size: 14px; color: ${PALETTE.cozyPurple};">🐾 Passos da Meta · Progresso: ${stepProgressPct}%</strong>
                    <span style="font-size: 13px; font-weight: 700;">${activeSteps.filter(s => s.doneAt).length} de ${activeSteps.length} concluídos</span>
                  </div>

                  <div style="width: 100%; height: 10px; background: #e0e0e0; border: 1px solid ${PALETTE.ink}; margin-bottom: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${stepProgressPct}%; background: ${pal.color}; transition: width 0.3s;"></div>
                  </div>

                  <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
                    ${activeSteps.map(step => {
                      const isDone = Boolean(step.doneAt);
                      const isEditing = state.editingStepId === step.id;

                      if (isEditing) {
                        return `
                          <div style="display: flex; gap: 4px; align-items: center; background: #fff; padding: 6px; border: 1px solid ${PALETTE.ink};">
                            <input type="text" id="edit-step-title-${step.id}" class="pixel-input" value="${step.title}" style="flex: 1;">
                            <input type="number" id="edit-step-est-${step.id}" class="pixel-input" value="${step.estMinutes || ''}" placeholder="Min" style="width: 60px;">
                            <button class="pixel-btn btn-sm btn-green" style="min-width: 48px; min-height: 48px;" onclick="window.app.saveEditStep('${g.id}', '${step.id}')">Salvar</button>
                            <button class="pixel-btn btn-sm btn-secondary" style="min-width: 48px; min-height: 48px;" onclick="window.app.cancelEditStep()">✕</button>
                          </div>
                        `;
                      }

                      return `
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; background: ${isDone ? '#e8f8f5' : '#ffffff'}; padding: 6px 8px; border: 1px solid ${isDone ? '#27ae60' : '#bdc3c7'};">
                          <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                            <button class="pixel-btn btn-sm ${isDone ? 'btn-green' : ''}" style="min-width: 48px; min-height: 48px; font-size: 18px; padding: 0;" onclick="window.app.toggleGoalStepDone('${g.id}', '${step.id}')" title="Marcar como concluído">
                              ${isDone ? '✓' : '○'}
                            </button>
                            <div style="display: flex; flex-direction: column; min-width: 0;">
                              <span style="font-size: 14px; font-weight: 600; text-decoration: ${isDone ? 'line-through' : 'none'}; color: ${isDone ? '#27ae60' : PALETTE.ink}; word-break: break-word;">${step.title}</span>
                              ${step.estMinutes ? `<span style="font-size: 12px; color: ${PALETTE.grayDark}; font-weight: 700;">⏱️ ${step.estMinutes} min</span>` : ''}
                            </div>
                          </div>
                          <div style="display: flex; gap: 4px; align-items: center;">
                            <button class="pixel-btn btn-sm btn-icon" style="min-width: 48px; min-height: 48px;" onclick="window.app.startEditStep('${step.id}')" title="Renomear passo">✏️</button>
                            <button class="pixel-btn btn-sm btn-icon" style="min-width: 48px; min-height: 48px;" onclick="window.app.reorderGoalStep('${g.id}', '${step.id}', -1)" title="Subir">▲</button>
                            <button class="pixel-btn btn-sm btn-icon" style="min-width: 48px; min-height: 48px;" onclick="window.app.reorderGoalStep('${g.id}', '${step.id}', 1)" title="Descer">▼</button>
                            <button class="pixel-btn btn-sm btn-icon" style="min-width: 48px; min-height: 48px;" onclick="window.app.splitGoalStep('${g.id}', '${step.id}')" title="Dividir passo em dois">✂️</button>
                            <button class="pixel-btn btn-sm btn-icon" style="min-width: 48px; min-height: 48px;" onclick="window.app.archiveGoalStep('${g.id}', '${step.id}')" title="Arquivar passo">📦</button>
                            <button class="pixel-btn btn-sm btn-pink" style="min-height: 48px; font-size: 13px;" onclick="window.app.scheduleStep('${g.id}', '${step.id}')" title="Agendar este passo">📅 Agendar</button>
                          </div>
                        </div>
                      `;
                    }).join('')}
                  </div>

                  <!-- Form para Adicionar Passo -->
                  <div style="display: flex; gap: 6px; align-items: center;">
                    <input type="text" id="new-step-title-${g.id}" class="pixel-input" placeholder="Novo passo da meta..." style="flex: 1;">
                    <input type="number" id="new-step-est-${g.id}" class="pixel-input" placeholder="Min" style="width: 70px;">
                    <button class="pixel-btn btn-sm btn-green" style="min-height: 48px; min-width: 80px;" onclick="window.app.addStepToGoal('${g.id}')">+ Passo</button>
                  </div>
                </div>
                `}

                <div class="flex-row space-between" style="margin-top: 8px;">
                  <span style="font-size: 14px;">🎁 Mimo: <strong>${g.reward}</strong> · ${g.rewardCost}🐟</span>
                  <div class="flex-row">
                    <button class="pixel-btn btn-sm" onclick="window.app.advanceGoal('${g.id}')">+25% Tarefa</button>
                    <button class="pixel-btn btn-sm btn-pink" ${g.progress < 1 ? 'disabled' : ''} onclick="window.app.redeemRealReward('${g.id}')">Resgatar</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Analytics Profundo ("Mais Analytics")
  setAnalyticsPeriod(period) {
    state.analyticsPeriod = period;
    audio.playBlip();
    this.renderActiveTab();
  }

  setOvercomingTarget(val) {
    state.overcomingTargetMin = Math.max(1, parseInt(val || '10', 10));
    audio.playBlip();
    this.renderActiveTab();
    this.persist();
  }

  exportJsonBackup() {
    const engine = (typeof backupEngine !== 'undefined' && backupEngine)
      ? backupEngine
      : (typeof CatLineBackupEngine !== 'undefined' ? (CatLineBackupEngine.backupEngine || CatLineBackupEngine) : null);

    const backupData = engine ? engine.createExportPayload(state) : {
      appName: 'Cat Line',
      version: '3.2.0',
      schemaVersion: 2,
      exportedAt: Clock.isoString(),
      dayKey: state.dayKey,
      currencies: state.currencies,
      goals: state.goals,
      occurrences: state.occurrences,
      checkIns: state.checkIns || [],
      rewardEvents: state.rewardEvents || [],
      dayClosures: state.dayClosures || [],
      weeklyLogs: state.weeklyLogs || [],
      habits: state.habits
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catline_backup_${state.dayKey}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    alert("Backup JSON completo exportado com sucesso! Todos os seus mimos, hábitos, metas e compromissos estão salvos.");
  }

  triggerImportBackup() {
    const input = document.getElementById('json-backup-input');
    if (input) input.click();
  }

  importJsonBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target.result;
        const engine = (typeof backupEngine !== 'undefined' && backupEngine)
          ? backupEngine
          : (typeof CatLineBackupEngine !== 'undefined' ? (CatLineBackupEngine.backupEngine || CatLineBackupEngine) : null);

        let validated = engine ? engine.validateBackup(raw) : { valid: true, data: JSON.parse(raw), summary: {} };
        if (!validated.valid) {
          alert("Arquivo de backup inválido ou corrompido.");
          return;
        }

        const promptMsg = engine ? engine.getConfirmationPrompt(validated.summary) : "Deseja importar este backup?";
        if (typeof confirm === 'function') {
          const ok = confirm(promptMsg);
          if (!ok) return;
        }

        if (engine) {
          const merged = engine.mergeBackup(state, validated.data);
          Object.assign(state, merged);
        } else {
          const data = validated.data;
          if (Array.isArray(data.goals)) state.goals = data.goals;
          if (Array.isArray(data.occurrences)) state.occurrences = data.occurrences;
          if (Array.isArray(data.checkIns)) state.checkIns = data.checkIns;
          if (Array.isArray(data.rewardEvents)) state.rewardEvents = data.rewardEvents;
          if (Array.isArray(data.dayClosures)) state.dayClosures = data.dayClosures;
          if (Array.isArray(data.weeklyLogs)) state.weeklyLogs = data.weeklyLogs;
        }

        this.applyAccessibilityClasses();
        try { audio.playMeowCelebrate(); } catch (e) {}
        try { this.spawnPixelConfetti(); } catch (e) {}
        alert("Backup completo importado e restaurado com sucesso!");
        this.updateHUD();
        this.renderActiveTab();
        this.persist();
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) console.error('importJsonBackup error:', err);
        alert("Erro ao ler arquivo de backup JSON.");
      }
    };
    reader.readAsText(file);
  }

  renderTabInsights() {
    const period = state.analyticsPeriod || '7d';
    const dataPoints = state.analyticsData[period] || state.analyticsData['7d'];
    const daysLabel = period === '30d' ? '30 Dias' : (period === '14d' ? '14 Dias' : '7 Dias');

    // Cálculos de Analytics
    const onTimeCount = dataPoints.filter(d => d <= 5).length;
    const onTimePct = Math.round((onTimeCount / dataPoints.length) * 100);
    const sorted = [...dataPoints].sort((a, b) => a - b);
    const medianDelay = sorted[Math.floor(sorted.length / 2)];
    const habitsCompleted = state.habits.filter(h => h.completed).length;
    const habitsPct = state.habits.length > 0 ? Math.round((habitsCompleted / state.habits.length) * 100) : 100;
    const isTargetMet = medianDelay <= state.overcomingTargetMin;

    this.contentEl.innerHTML = `
      <!-- Seletor de Período -->
      <div class="analytics-period-bar">
        <button class="period-pill ${period === '7d' ? 'active' : ''}" onclick="window.app.setAnalyticsPeriod('7d')">7 Dias</button>
        <button class="period-pill ${period === '14d' ? 'active' : ''}" onclick="window.app.setAnalyticsPeriod('14d')">14 Dias</button>
        <button class="period-pill ${period === '30d' ? 'active' : ''}" onclick="window.app.setAnalyticsPeriod('30d')">30 Dias</button>
      </div>

      <!-- Card de Replanejamento e Calibração -->
      ${this.renderReplanCard()}
      ${this.renderCalibrationCard()}
      ${this.renderCorrelationInsightCard()}
      ${this.renderWeeklyLogCard()}
      ${this.renderDelayBreakdownCard()}

      <!-- Grid de Indicadores Principais -->
      <div class="analytics-stat-grid">
        <div class="stat-pill-card">
          <span class="stat-pill-title">TAXA NO PRAZO</span>
          <span class="stat-pill-value">${onTimePct}%</span>
          <span class="stat-pill-sub">${onTimeCount} de ${dataPoints.length} dias no prazo</span>
        </div>
        <div class="stat-pill-card">
          <span class="stat-pill-title">MEDIANA DE ATRASO</span>
          <span class="stat-pill-value" style="color: ${medianDelay <= 5 ? PALETTE.leafGreen : PALETTE.alertRed};">${medianDelay} min</span>
          <span class="stat-pill-sub">Tolerância: até 5 min</span>
        </div>
        <div class="stat-pill-card">
          <span class="stat-pill-title">CONSISTÊNCIA HÁBITOS</span>
          <span class="stat-pill-value" style="color: ${PALETTE.cozyPurple};">${habitsPct}%</span>
          <span class="stat-pill-sub">${habitsCompleted}/${state.habits.length} cumpridos hoje</span>
        </div>
        <div class="stat-pill-card">
          <span class="stat-pill-title">ECONOMIA DO PERÍODO</span>
          <span class="stat-pill-value" style="color: ${PALETTE.goldenYarn};">+${dataPoints.length * 15}🐟</span>
          <span class="stat-pill-sub">${state.currencies.novelosDourados} 🧶 Dourados</span>
        </div>
      </div>

      <!-- Gráfico "O Fio" (Curva de Atraso e Pontualidade) -->
      <div class="pixel-card">
        <div class="flex-row space-between">
          <h4>📈 O Fio · Curva de Atraso · ${daysLabel}</h4>
          <span style="font-size: 13px; font-weight: 700; color: ${PALETTE.leafGreen};">Linha verde: 5 min</span>
        </div>
        <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin: 4px 0 8px 0;">Nós no fio representam cada dia. Abaixo da linha verde = feito no prazo!</p>
        <canvas id="delay-chart" class="delay-graph-canvas"></canvas>
      </div>

      <!-- Novo Gráfico: Pontualidade por Dia da Semana -->
      <div class="pixel-card">
        <h4>📊 Pontualidade por Dia da Semana</h4>
        <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin: 4px 0 8px 0;">Taxa de sucesso histórico em cada dia da semana:</p>
        <canvas id="weekly-bar-chart" class="analytics-bar-canvas"></canvas>
      </div>

      <!-- Mapa de Horários Críticos (Heatmap de Rotina) -->
      <div class="pixel-card">
        <h4>⏰ Horários Críticos do Dia</h4>
        <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin-bottom: 6px;">Onde você é mais pontual vs onde ocorrem atrasos:</p>
        <div class="heatmap-list">
          ${state.analyticsData.periodsOfDay.map(p => `
            <div class="heatmap-row">
              <span class="heatmap-label">${p.name.split(' ')[0]}</span>
              <div class="heatmap-track">
                <div class="heatmap-fill" style="width: ${p.pct}%; background: ${p.color};"></div>
              </div>
              <span class="heatmap-val">${p.pct}%</span>
              <span style="font-size: 11px; color: ${PALETTE.grayDark}; width: 80px;">Méd: ${p.avgDelay}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Desafio de Superação de Atraso -->
      <div class="pixel-card cream">
        <div class="flex-row space-between">
          <h4>🎯 Meta de Superação da Usuária</h4>
          <span style="font-size: 13px; font-weight: 700; color: ${isTargetMet ? PALETTE.leafGreen : PALETTE.orangeShadow};">
            ${isTargetMet ? 'METAS SUPERADA! 🎉' : 'EM PROGRESSO'}
          </span>
        </div>
        <p style="font-size: 14px; margin: 6px 0;">
          Sua meta: Manter o atraso mediano abaixo de <strong>${state.overcomingTargetMin} min</strong>.
          Seu atraso atual é <strong>${medianDelay} min</strong>!
        </p>
        <div class="flex-row" style="margin-top: 6px;">
          <span style="font-size: 13px;">Ajustar meta:</span>
          <input type="number" id="input-overcoming" class="pixel-input" value="${state.overcomingTargetMin}" style="width: 80px;" min="1" max="60">
          <button class="pixel-btn btn-sm btn-green" onclick="window.app.setOvercomingTarget(document.getElementById('input-overcoming').value)">Definir Meta</button>
        </div>
      </div>

      <!-- Memória do Celular & Privacidade -->
      <div class="pixel-card">
        <h4>💾 Memória do Celular & Privacidade</h4>
        <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin-bottom: 8px;">
          <strong>100% Offline e Seguro:</strong> Todos os seus dados como rotina, hábitos, metas, novelos e bloqueios ficam salvos diretamente na memória do seu celular. Não depende de Supabase nem internet para lembrar do seu progresso!
        </p>
        <div class="flex-row" style="flex-wrap: wrap; gap: 8px;">
          <button class="pixel-btn btn-sm btn-pink" onclick="window.app.exportJsonBackup()">Exportar Backup</button>
          <button class="pixel-btn btn-sm btn-purple" onclick="window.app.triggerImportBackup()">Importar Backup</button>
          <button class="pixel-btn btn-sm btn-red" onclick="window.clearDeviceStorageAndReset()">Limpar Memória</button>
          <input type="file" id="json-backup-input" style="display: none;" accept=".json" onchange="window.app.importJsonBackup(event)">
        </div>
      </div>

      <!-- Relatório Beta Local Seguro (Fase 6) -->
      ${this.renderBetaReportCard()}
    `;

    setTimeout(() => {
      this.drawDelayChart(period);
      this.drawWeeklyBarChart();
    }, 50);
  }

  drawDelayChart(period) {
    const canvas = document.getElementById('delay-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.max(300, rect.width - 28);
    canvas.height = 120;

    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Linha guia verde de tolerância (5 min)
    const zeroY = 65;
    const tolY = zeroY - (5 * 3);
    ctx.strokeStyle = PALETTE.leafGreen;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, tolY);
    ctx.lineTo(canvas.width, tolY);
    ctx.stroke();
    ctx.setLineDash([]);

    const points = state.analyticsData[period] || state.analyticsData['7d'];
    const stepX = (canvas.width - 36) / Math.max(1, points.length - 1);

    // Desenha o Fio de Lã Rosa
    ctx.strokeStyle = PALETTE.yarnPinkDark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    points.forEach((val, i) => {
      const x = 18 + i * stepX;
      const y = zeroY - (val * 3);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Nós de Lã nos dias
    points.forEach((val, i) => {
      const x = 18 + i * stepX;
      const y = zeroY - (val * 3);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.fillStyle = (val <= 5) ? PALETTE.leafGreen : PALETTE.yarnPink;
      ctx.fillRect(x - 3, y - 3, 6, 6);
    });
  }

  drawWeeklyBarChart() {
    const canvas = document.getElementById('weekly-bar-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.max(300, rect.width - 28);
    canvas.height = 120;

    ctx.fillStyle = '#fff8f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const days = state.analyticsData.weeklyDays;
    const barWidth = Math.floor((canvas.width - 40) / days.length);
    const chartHeight = 80;
    const startY = 95;

    days.forEach((d, i) => {
      const x = 20 + i * barWidth;
      const barH = Math.round((d.pct / 100) * chartHeight);
      const y = startY - barH;

      // Barra com contorno 8-bit
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 4, y - 2, barWidth - 8, barH + 2);

      ctx.fillStyle = d.pct >= 85 ? PALETTE.leafGreen : (d.pct >= 75 ? PALETTE.orange : PALETTE.alertRed);
      ctx.fillRect(x + 5, y - 1, barWidth - 10, barH);

      // Rótulo do dia
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '12px "Pixelify Sans", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(d.day, x + barWidth / 2, startY + 16);

      // Porcentagem no topo da barra
      ctx.fillText(`${d.pct}%`, x + barWidth / 2, y - 6);
    });
  }

  renderTabLoja() {
    const shopItems = [
      { id: 'laco_rosa', name: 'Laço Rosa Pixel', desc: 'Clássico charmoso na orelhinha', cost: 0, icon: '🎀', isConsumable: false },
      { id: 'coroa_ouro', name: 'Coroa Dourada Real', desc: 'Coroa de princesa com rubi central', cost: 120, icon: '👑', isConsumable: false },
      { id: 'chapeu_mago', name: 'Chapéu de Mago 8-Bit', desc: 'Místico pontudo com estrela mágica', cost: 75, icon: '🧙‍♂️', isConsumable: false },
      { id: 'coleira_sino', name: 'Coleira com Sino de Ouro', desc: 'Toca sininho a cada passinho', cost: 50, icon: '🔔', isConsumable: false },
      { id: 'oculos_escuros', name: 'Óculos Escuros Pixel', desc: 'Estilosa e focada nas metas', cost: 60, icon: '🕶️', isConsumable: false },
      { id: 'petisco', name: 'Petisco de Salmão Fresco', desc: 'Aumenta +15 Vínculo com a gatinha', cost: 20, bond: 15, icon: '🐟', isConsumable: true },
      { id: 'novelo_reserva', name: 'Novelo Reserva Extra', desc: 'Protege sequências em dias perdidos', cost: 80, icon: '🧶', isConsumable: true }
    ];

    const popularEmojis = ['☕', '🎬', '🧖‍♀️', '🍕', '📚', '🍦', '🛍️', '🎮', '💆‍♀️', '🍰', '🍷', '💅', '🌿', '✈️', '🛁', '💐'];

    this.contentEl.innerHTML = `
      <!-- BANNER DE COMEMORAÇÃO DE MIMO RESGATADO -->
      ${state.celebratingReward ? `
        <div class="pixel-card" style="background: #e8f5e9; border: 3px solid #2e7d32; box-shadow: 4px 4px 0 #2e7d32; text-align: center; margin-bottom: 14px;">
          <div style="font-size: 36px; margin: 4px 0;">🎉 ${state.celebratingReward.icon} ✨</div>
          <h4 style="color: #1b5e20; margin-bottom: 4px;">PARABÉNS! VOCÊ SE PRESENTEOU!</h4>
          <p style="font-size: 16px; font-weight: 700; color: ${PALETTE.ink}; margin: 4px 0;">
            "${state.celebratingReward.title}"
          </p>
          <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin-bottom: 10px; line-height: 1.4;">
            Você se dedicou aos seus hábitos e metas. Vá desfrutar do seu momento sem culpa! A gatinha está cheia de orgulho! 🐱💕
          </p>
          <button class="pixel-btn btn-green" onclick="window.app.dismissRewardCelebration()" style="width: 100%;">
            Aproveitar Agora com Amor! ✓
          </button>
        </div>
      ` : ''}

      <!-- SEÇÃO 0: COFRE DE REDES SOCIAIS TRANCADAS (DESTRAVAR COMO RECOMPENSA) -->
      ${this.renderLockedAppsVaultCard('loja')}

      <!-- SEÇÃO 1: MIMOS DA VIDA REAL -->
      <div class="pixel-card" style="border-left: 6px solid ${PALETTE.orange}; margin-bottom: 14px;">
        <div class="flex-row space-between" style="align-items: center; margin-bottom: 6px;">
          <div>
            <h4 style="margin: 0; display: flex; align-items: center; gap: 6px;">
              <span>🎁</span> Mimos da Vida Real
            </h4>
            <span style="font-size: 12px; color: ${PALETTE.grayDark};">Auto-recompensas editáveis para você</span>
          </div>
          <div style="text-align: right;">
            <span style="font-size: 14px; font-weight: 700; color: ${PALETTE.orange};">
              Saldo: ${state.currencies.peixinhos} 🐟
            </span>
          </div>
        </div>
        <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin-bottom: 12px; line-height: 1.4;">
          Cumpra seus hábitos e tarefas para acumular Peixinhos. Troque seu saldo por momentos especiais que você mesma define e merece desfrutar:
        </p>

        <!-- LISTA DE MIMOS -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px;">
          ${(state.realLifeRewards || []).map(rw => {
            const isEditing = state.editingRewardId === rw.id;
            const canAfford = state.currencies.peixinhos >= rw.cost;

            if (isEditing) {
              return `
                <div style="background: #fffdf5; padding: 12px; border: 2px dashed ${PALETTE.orange}; display: flex; flex-direction: column; gap: 8px;">
                  <strong style="font-size: 13px; color: ${PALETTE.orange};">✏️ Editando Mimo:</strong>
                  <div>
                    <label style="font-size: 12px; font-weight: 700; color: ${PALETTE.ink};">Nome do mimo ou momento:</label>
                    <input type="text" id="edit-rw-title-${rw.id}" value="${rw.title.replace(/"/g, '&quot;')}" style="width: 100%; box-sizing: border-box; padding: 7px 9px; border: 2px solid ${PALETTE.ink}; font-family: var(--font-body); font-size: 14px; margin-top: 3px;">
                  </div>
                  <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <div>
                      <label style="font-size: 12px; font-weight: 700; color: ${PALETTE.ink};">Custo em Peixinhos 🐟:</label><br>
                      <input type="number" id="edit-rw-cost-${rw.id}" value="${rw.cost}" min="5" step="5" style="width: 90px; padding: 6px 8px; border: 2px solid ${PALETTE.ink}; font-family: var(--font-body); font-size: 14px; margin-top: 3px;">
                    </div>
                    <div>
                      <label style="font-size: 12px; font-weight: 700; color: ${PALETTE.ink};">Ícone / Emoji:</label><br>
                      <input type="text" id="edit-rw-icon-${rw.id}" value="${rw.icon}" style="width: 60px; text-align: center; font-size: 18px; padding: 4px; border: 2px solid ${PALETTE.ink}; margin-top: 3px;">
                    </div>
                  </div>
                  <div>
                    <span style="font-size: 11px; color: ${PALETTE.grayDark};">Ou escolha rápido:</span>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px;">
                      ${popularEmojis.map(em => `
                        <button type="button" class="pixel-btn btn-sm btn-secondary" style="padding: 2px 6px; font-size: 14px;" onclick="document.getElementById('edit-rw-icon-${rw.id}').value = '${em}';">${em}</button>
                      `).join('')}
                    </div>
                  </div>
                  <div style="display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px;">
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.cancelEditRealReward()">Cancelar</button>
                    <button class="pixel-btn btn-sm btn-green" onclick="window.app.saveEditRealReward('${rw.id}')">Salvar Mimo ✓</button>
                  </div>
                </div>
              `;
            }

            return `
              <div class="mobile-stack-item" style="background: ${canAfford ? '#ffffff' : '#fafafa'}; padding: 10px 12px; border: 2px solid ${PALETTE.ink};">
                <div style="display: flex; align-items: flex-start; gap: 10px; width: 100%;">
                  <span style="font-size: 26px; flex-shrink: 0; background: ${PALETTE.wallCream}; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border: 2px solid ${PALETTE.ink}; border-radius: 6px;">${rw.icon}</span>
                  <div style="flex: 1; min-width: 0;">
                    <strong style="font-size: 15px; color: ${PALETTE.ink}; display: block; line-height: 1.3; word-break: break-word;">${rw.title}</strong>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 4px;">
                      <span class="pixel-badge" style="background: #fff3e0; color: ${PALETTE.orangeShadow}; font-weight: 700; font-size: 12px; padding: 2px 6px; border: 1px solid ${PALETTE.orange}; border-radius: 3px;">
                        🐟 ${rw.cost} Peixinhos
                      </span>
                      ${rw.redeemedCount > 0 ? `
                        <span class="pixel-badge" style="background: #e8f5e9; color: #2e7d32; font-weight: 700; font-size: 11px; padding: 2px 6px; border: 1px solid #2e7d32; border-radius: 3px;">
                          ✨ ${rw.redeemedCount}x desfrutado
                        </span>
                      ` : ''}
                      ${rw.lastRedeemedAt ? `
                        <span style="font-size: 11px; color: ${PALETTE.grayDark};">Último: ${rw.lastRedeemedAt}</span>
                      ` : ''}
                    </div>
                  </div>
                </div>
                <div class="card-action-footer">
                  ${canAfford ? `
                    <button class="pixel-btn btn-sm btn-green" style="flex: 1;" onclick="window.app.redeemRealReward('${rw.id}')" title="Resgatar agora">
                      🎁 Me Presentear (${rw.cost}🐟)
                    </button>
                  ` : `
                    <button class="pixel-btn btn-sm btn-secondary" style="flex: 1;" onclick="window.app.redeemRealReward('${rw.id}')" title="Faltam ${rw.cost - state.currencies.peixinhos}🐟">
                      🔒 Faltam ${rw.cost - state.currencies.peixinhos}🐟
                    </button>
                  `}
                  <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditRealReward('${rw.id}')" title="Editar mimo">✏️</button>
                  <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteRealReward('${rw.id}')" title="Excluir mimo">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- FORMULÁRIO PARA ADICIONAR NOVO MIMO -->
        <div style="background: ${PALETTE.wallCream}; padding: 10px 12px; border: 2px dashed ${PALETTE.ink}; margin-top: 6px;">
          <strong style="font-size: 13px; color: ${PALETTE.ink}; display: block; margin-bottom: 6px;">
            ➕ Criar Novo Mimo da Vida Real
          </strong>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <input type="text" id="new-reward-title" class="pixel-input" placeholder="Ex: Café na cafeteria, Dia de spa, Pedir pizza...">
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="font-size: 13px; font-weight: 700;">Custo:</span>
                <input type="number" id="new-reward-cost" class="pixel-input" value="40" min="5" step="5" style="width: 78px;" title="Custo em Peixinhos">
                <span style="font-size: 14px; font-weight: bold;">🐟</span>
              </div>
              <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap; flex: 1;">
                <span style="font-size: 12px; color: ${PALETTE.grayDark};">Ícone:</span>
                ${popularEmojis.slice(0, 8).map(em => `
                  <button type="button" class="pixel-btn btn-sm ${state.newRewardEmoji === em ? 'btn-gold' : 'btn-secondary'}" style="padding: 3px 6px; font-size: 14px;" onclick="window.app.setNewRewardEmoji('${em}')">${em}</button>
                `).join('')}
              </div>
            </div>
            <button class="pixel-btn btn-gold" style="width: 100%;" onclick="window.app.createRealReward()">
              ➕ Adicionar Mimo da Vida Real
            </button>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 2: LOJINHA DA GATINHA -->
      <div class="pixel-card">
        <div class="flex-row space-between" style="align-items: center;">
          <h4>🛍️ Lojinha da Gatinha</h4>
          <span style="font-size: 13px; font-weight: 700; color: ${PALETTE.orange};">Saldo: ${state.currencies.peixinhos}🐟 · ${state.currencies.vinculo}♥</span>
        </div>
        <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin-bottom: 10px;">Personalize a gatinha. Os itens equipados aparecem no sprite em tempo real:</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${shopItems.map(item => {
            const isOwned = state.cat.owned.includes(item.id) || item.cost === 0;
            const isEquipped = state.cat.equipped.includes(item.id);

            let actionBtn = '';
            if (item.isConsumable) {
              if (item.id === 'novelo_reserva') {
                actionBtn = `<button class="pixel-btn btn-sm btn-gold" onclick="window.app.buyItem('novelo_reserva', ${item.cost})">Comprar (${item.cost}🐟)</button>`;
              } else {
                actionBtn = `<button class="pixel-btn btn-sm btn-pink" onclick="window.app.buyItem('${item.id}', ${item.cost}, ${item.bond || 0})">Comprar (${item.cost}🐟)</button>`;
              }
            } else {
              if (isOwned) {
                actionBtn = `<button class="pixel-btn btn-sm ${isEquipped ? 'btn-green' : 'btn-secondary'}" onclick="window.app.toggleEquip('${item.id}')">
                  ${isEquipped ? 'Equipado ✓' : 'Equipar'}
                </button>`;
              } else {
                actionBtn = `<button class="pixel-btn btn-sm" onclick="window.app.buyItem('${item.id}', ${item.cost})">
                  Comprar (${item.cost}🐟)
                </button>`;
              }
            }

            return `
              <div class="mobile-stack-item" style="background: ${isEquipped ? '#f0fff4' : PALETTE.wallCream}; padding: 10px 12px; border: 2px solid ${PALETTE.ink};">
                <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
                  <span style="font-size: 24px; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; background: #fff; border: 2px solid ${PALETTE.ink}; border-radius: 6px; flex-shrink: 0;">${item.icon}</span>
                  <div style="flex: 1; min-width: 0;">
                    <strong style="font-size: 15px; display: block;">${item.name}</strong>
                    <span style="font-size: 12px; color: ${PALETTE.grayDark}; display: block;">${item.desc}</span>
                  </div>
                </div>
                <div class="card-action-footer">
                  ${actionBtn.replace('class="pixel-btn btn-sm', 'style="width:100%;" class="pixel-btn btn-sm')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- SEÇÃO 3: MODO DESCANSO -->
      <div class="pixel-card cream">
        <h4>Modo Descanso</h4>
        <p>Pausa o tempo das metas, sequências e humor sem perda para dias de folga:</p>
        <button class="pixel-btn btn-purple" style="margin-top: 8px;" onclick="window.app.toggleRestMode()">
          ${state.cat.isRestMode ? 'Desativar Modo Descanso' : 'Ativar Modo Descanso'}
        </button>
      </div>
    `;
  }

  toggleEquip(item) {
    if (state.cat.equipped.includes(item)) {
      state.cat.equipped = state.cat.equipped.filter(x => x !== item);
    } else {
      state.cat.equipped.push(item);
    }
    audio.playBlip();
    this.renderTabLoja();
    this.persist();
  }

  buyItem(item, cost, bond = 0) {
    if (item === 'novelo_reserva') {
      if (state.currencies.peixinhos >= cost) {
        state.currencies.peixinhos -= cost;
        state.cat.reserveYarns = (state.cat.reserveYarns || 0) + 1;
        audio.playMeowCelebrate();
        this.setCatSpeech("Novelo reserva adquirido! Suas sequências estão protegidas.");
        this.updateHUD();
        this.renderTabLoja();
        this.persist();
      } else {
        alert("Peixinhos insuficientes!");
      }
      return;
    }

    if (state.cat.owned.includes(item)) {
      this.toggleEquip(item);
      return;
    }
    if (state.currencies.peixinhos >= cost) {
      state.currencies.peixinhos -= cost;
      if (bond > 0) state.currencies.vinculo += bond;
      if (!bond) {
        state.cat.owned.push(item);
        if (!state.cat.equipped.includes(item)) {
          state.cat.equipped.push(item);
        }
      }
      audio.playMeowCelebrate();
      this.setCatSpeech("Acessório comprado e equipado!");
      this.updateHUD();
      this.renderTabLoja();
      this.persist();
    } else {
      alert("Peixinhos insuficientes!");
    }
  }

  // ==========================================
  // MIMOS DA VIDA REAL (AUTO-RECOMPENSAS)
  // ==========================================

  switchTab(tabId) {
    state.activeTab = tabId;
    this.renderNav();
    this.renderActiveTab();
  }

  setNewRewardEmoji(emoji) {
    state.newRewardEmoji = emoji;
    this.renderTabLoja();
  }

  createRealReward() {
    const titleInput = document.getElementById('new-reward-title');
    const costInput = document.getElementById('new-reward-cost');
    if (!titleInput || !costInput) return;

    const title = titleInput.value.trim();
    if (!title) {
      alert("Por favor, digite o nome do seu mimo da vida real · Café especial, Assistir série...");
      titleInput.focus();
      return;
    }

    const cost = Math.max(5, parseInt(costInput.value) || 40);
    const icon = state.newRewardEmoji || '☕';
    const newReward = {
      id: 'rw-' + Clock.now(),
      title: title,
      cost: cost,
      icon: icon,
      redeemedCount: 0,
      lastRedeemedAt: null
    };

    if (!Array.isArray(state.realLifeRewards)) state.realLifeRewards = [];
    state.realLifeRewards.push(newReward);

    audio.playMeowCelebrate();
    this.setCatSpeech(`Mimo "${title}" adicionado. 🎁`);
    this.persist();
    this.renderTabLoja();
  }

  startEditRealReward(id) {
    state.editingRewardId = id;
    this.renderTabLoja();
  }

  cancelEditRealReward() {
    state.editingRewardId = null;
    this.renderTabLoja();
  }

  saveEditRealReward(id) {
    const rw = (state.realLifeRewards || []).find(x => x.id === id);
    if (!rw) return;

    const titleInput = document.getElementById(`edit-rw-title-${id}`);
    const costInput = document.getElementById(`edit-rw-cost-${id}`);
    const iconInput = document.getElementById(`edit-rw-icon-${id}`);

    if (titleInput && titleInput.value.trim()) {
      rw.title = titleInput.value.trim();
    }
    if (costInput) {
      rw.cost = Math.max(5, parseInt(costInput.value) || 40);
    }
    if (iconInput && iconInput.value.trim()) {
      rw.icon = iconInput.value.trim();
    }

    state.editingRewardId = null;
    audio.playBlip();
    this.persist();
    this.renderTabLoja();
  }

  deleteRealReward(id) {
    const rw = (state.realLifeRewards || []).find(x => x.id === id);
    const title = rw ? rw.title : "este mimo";
    if (!confirm(`Deseja remover o mimo "${title}" da sua lista?`)) return;

    state.realLifeRewards = (state.realLifeRewards || []).filter(x => x.id !== id);
    if (state.editingRewardId === id) state.editingRewardId = null;
    if (state.celebratingReward && state.celebratingReward.id === id) state.celebratingReward = null;

    audio.playBlip();
    this.setCatSpeech(`Mimo "${title}" descartado.`);
    this.persist();
    this.renderTabLoja();
  }

  redeemRealReward(id) {
    const rw = (state.realLifeRewards || []).find(x => x.id === id);
    if (!rw) return;

    if (state.currencies.peixinhos < rw.cost) {
      const falta = rw.cost - state.currencies.peixinhos;
      alert(`Você tem ${state.currencies.peixinhos}🐟. Faltam ${falta}🐟 para este mimo. Continue cumprindo seus hábitos e tarefas do dia para conquistar!`);
      audio.playBlip();
      return;
    }

    // Deduz Peixinhos e concede Vínculo
    state.currencies.peixinhos -= rw.cost;
    state.currencies.vinculo += 25;
    rw.redeemedCount = (rw.redeemedCount || 0) + 1;
    const today = Clock.newDate();
    rw.lastRedeemedAt = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}`;

    state.celebratingReward = rw;

    audio.playMeowCelebrate();
    if (navigator.vibrate) {
      try { navigator.vibrate([60, 40, 80, 40, 120]); } catch (e) {}
    }

    this.setCatSpeech(`Você conquistou: ${rw.title}! ${rw.icon} ✨`);
    this.updateHUD();
    this.persist();
    this.renderTabLoja();
  }

  dismissRewardCelebration() {
    state.celebratingReward = null;
    this.renderTabLoja();
  }

  // ==========================================
  // TEMPORIZADOR DE FOCO (POMODORO DO NOVELO)
  // ==========================================

  openFocusTimer(minutes = 25) {
    const totalSec = minutes * 60;
    if (state.focusTimer && state.focusTimer.intervalId) {
      clearInterval(state.focusTimer.intervalId);
    }
    state.focusTimer = {
      active: true,
      totalSec,
      remSec: totalSec,
      isPaused: false,
      purrSound: true,
      intervalId: null
    };

    audio.playMeowCelebrate();
    audio.startFocusPurrAmbient();
    this.setCatSpeech(`Modo Foco: ${minutes} minutos. Vamos! 🧶`);

    state.focusTimer.intervalId = setInterval(() => {
      if (!state.focusTimer || !state.focusTimer.active || state.focusTimer.isPaused) return;
      if (state.focusTimer.remSec > 0) {
        state.focusTimer.remSec--;
        this.refreshFocusDOM();
      } else {
        this.completeFocusNatural();
      }
    }, 1000);

    this.renderActiveTab();
    this.persist();
  }

  setFocusDuration(minutes) {
    if (!state.focusTimer) return;
    const totalSec = minutes * 60;
    state.focusTimer.totalSec = totalSec;
    state.focusTimer.remSec = totalSec;
    audio.playBlip();
    this.refreshFocusDOM();
    this.renderActiveTab();
  }

  togglePauseFocus() {
    if (!state.focusTimer) return;
    state.focusTimer.isPaused = !state.focusTimer.isPaused;
    audio.playBlip();
    if (state.focusTimer.isPaused) {
      audio.stopFocusPurrAmbient();
      this.setCatSpeech("Foco pausado.");
    } else {
      if (state.focusTimer.purrSound) audio.startFocusPurrAmbient();
      this.setCatSpeech("Foco retomado!");
    }
    this.renderActiveTab();
  }

  toggleFocusPurrSound() {
    if (!state.focusTimer) return;
    state.focusTimer.purrSound = !state.focusTimer.purrSound;
    audio.playBlip();
    if (state.focusTimer.purrSound && !state.focusTimer.isPaused) {
      audio.startFocusPurrAmbient();
    } else {
      audio.stopFocusPurrAmbient();
    }
    this.renderActiveTab();
  }

  completeFocusEarly() {
    if (!state.focusTimer) return;
    this.finishFocusSession(true);
  }

  completeFocusNatural() {
    this.finishFocusSession(false);
  }

  finishFocusSession(isEarly = false) {
    if (state.focusTimer && state.focusTimer.intervalId) {
      clearInterval(state.focusTimer.intervalId);
    }
    audio.stopFocusPurrAmbient();
    state.focusTimer.active = false;
    state.focusTimer = null;

    state.currencies.peixinhos += 15;
    state.currencies.vinculo += 15;

    // Se havia tarefa em execução, marca como feita!
    if (state.activeExecutionId) {
      if (state.activeExecutionType === 'habit') {
        const h = state.habits.find(x => x.id === state.activeExecutionId);
        if (h && !h.completed) {
          h.completed = true;
          h.streak++;
        }
      } else {
        const occ = state.occurrences.find(x => x.id === state.activeExecutionId);
        if (occ && occ.state !== 'FEITO') {
          occ.state = 'FEITO';
        }
      }
      state.activeExecutionId = null;
      state.activeExecutionType = null;
    }

    audio.playMeowCelebrate();
    this.setCatSpeech("Foco concluído! +15🐟 e +15♥");
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  closeFocusTimer() {
    if (state.focusTimer && state.focusTimer.intervalId) {
      clearInterval(state.focusTimer.intervalId);
    }
    audio.stopFocusPurrAmbient();
    if (state.focusTimer) state.focusTimer.active = false;
    state.focusTimer = null;
    audio.playBlip();
    this.renderActiveTab();
    this.persist();
  }

  refreshFocusDOM() {
    const timeEl = document.getElementById('focus-live-timer');
    if (timeEl && state.focusTimer) {
      const s = state.focusTimer.remSec;
      const mins = Math.floor(s / 60);
      const remS = s % 60;
      timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;
    }
  }

  toggleRestMode() {
    state.cat.isRestMode = !state.cat.isRestMode;
    audio.playMeowGreeting();
    alert(`Modo descanso ${state.cat.isRestMode ? 'ativado! Tempo dos novelos e sequências congelados.' : 'desativado.'}`);
    this.renderTabLoja();
    this.persist();
  }

  renderTabConversa() {
    this.contentEl.innerHTML = `
      <div class="pixel-card">
        <h4>💬 Chat com a Gatinha</h4>
        <p style="font-size: 14px; color: ${PALETTE.grayDark}; margin-bottom: 10px;">A gatinha responde em balõezinhos com o tom que você escolher:</p>
        
        <div style="max-height: 170px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding: 8px; background: #fff8f0; border: 2px solid ${PALETTE.ink}; margin-bottom: 10px;">
          ${state.messages.map(m => `
            <div style="font-size: 15px; line-height: 1.4; align-self: ${m.fromUser ? 'flex-end' : 'flex-start'}; background: ${m.fromUser ? PALETTE.orange : '#fff'}; color: ${m.fromUser ? '#fff' : PALETTE.ink}; padding: 8px 12px; border-radius: 4px; border: 2px solid ${PALETTE.ink}; max-width: 88%;">
              ${m.text}
            </div>
          `).join('')}
        </div>

        <div class="flex-row">
          <input type="text" id="chat-user-input" class="pixel-input" placeholder="Converse ou desabafe...">
          <button class="pixel-btn" onclick="window.app.sendMessage()">Miar</button>
        </div>
      </div>

      <div class="pixel-card cream">
        <div class="flex-row space-between">
          <h4>Persona & Planejamento</h4>
          <button class="pixel-btn btn-sm btn-purple" onclick="window.app.startBriefing()">📝 Briefing Mensal</button>
        </div>
        <div class="flex-row" style="margin-top: 8px; gap: 8px; flex-wrap: wrap;">
          <button class="pixel-btn btn-sm" onclick="window.app.setPersona('FESTEIRA')">Festeira</button>
          <button class="pixel-btn btn-sm btn-pink" onclick="window.app.setPersona('PARCEIRA')">Parceira</button>
          <button class="pixel-btn btn-sm btn-purple" onclick="window.app.setPersona('ESCUTA')">Desabafo</button>
          <button class="pixel-btn btn-sm btn-red" onclick="window.app.clearChat()">Apagar Conversas</button>
        </div>
      </div>
    `;
  }

  sendMessage() {
    const input = document.getElementById('chat-user-input');
    const text = input.value.trim();
    if (!text) return;

    state.messages.push({ fromUser: true, text });
    input.value = '';

    audio.playBlip();
    setTimeout(() => {
      const selGoal = getSelectedGoal();
      const pal = getYarnPalette(selGoal.yarnColorId);
      let reply = `Estou aqui com você! Sua meta atual é "${selGoal.title}".`;
      if (text.toLowerCase().includes("atraso") || text.toLowerCase().includes("prazo")) {
        reply = "Sem problemas com o atraso. Vamos para o próximo item?";
      } else if (text.toLowerCase().includes("cansad")) {
        reply = "Vem cá no meu colinho... que tal escolher só uma tarefa bem pequenininha hoje?";
      }
      state.messages.push({ fromUser: false, text: reply });
      audio.playMeowGreeting();
      this.renderActiveTab();
      this.persist();
    }, 400);

    this.renderActiveTab();
    this.persist();
  }

  setPersona(persona) {
    audio.playBlip();
    alert(`Persona alterada para: ${persona}`);
  }

  clearChat() {
    state.messages = [{ fromUser: false, text: "Histórico apagado com segurança do aparelho!" }];
    this.renderActiveTab();
    this.persist();
  }

  isAppCurrentlyUnlockedByPass(pkg) {
    const now = Clock.now();
    return state.activeUnlockSessions.find(s => s.pkg === pkg && s.expiresAt > now) || null;
  }

  renderLockedAppsVaultCard(context = 'hoje') {
    const now = Clock.now();
    const pendingTasks = state.occurrences.filter(o => o.state === 'PENDENTE');
    const pendingHabits = state.habits.filter(h => !h.completed);
    const allTasksDone = pendingTasks.length === 0;
    const inputId = `quick-lock-input-${context}`;

    return `
      <div class="pixel-card" style="margin-top: 10px; border-left: 6px solid ${PALETTE.cozyPurple}; background: #fdfbff;">
        <div class="mobile-stack-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap;">
            <div>
              <h4 style="margin: 0; display: flex; align-items: center; gap: 6px;">
                <span>🔒</span> Redes & Apps Trancados (Recompensa)
              </h4>
              <span style="font-size: 12px; color: ${PALETTE.grayDark};">
                Tranque os apps que você pedir e destrave como recompensa com 🐟 ou cumprindo suas tarefas!
              </span>
            </div>
            <span class="status-badge-pill done" style="background: #f3e5f5; color: #4a148c; border-color: #4a148c;">
              🐟 Saldo: ${state.currencies.peixinhos}
            </span>
          </div>

          <!-- Chips de 1 Toque para Trancar / Adicionar qualquer Rede Social -->
          <div style="margin-top: 4px;">
            <span style="font-size: 11px; font-weight: 700; color: ${PALETTE.cozyPurple}; display: block; margin-bottom: 4px;">
              ⚡ Toque em um app abaixo para trancar imediatamente:
            </span>
            <div class="preset-chips-wrap" style="margin-bottom: 6px;">
              ${SOCIAL_MEDIA_PRESETS.map(p => {
                const existing = state.blockRules.find(
                  r => r.pkg === p.pkg || r.name.toLowerCase() === p.name.toLowerCase()
                );
                const isLocked = existing && existing.enabled && !this.isAppCurrentlyUnlockedByPass(existing.pkg);
                const isUnlockedPass = existing && existing.enabled && this.isAppCurrentlyUnlockedByPass(existing.pkg);
                return `
                  <button type="button"
                    class="preset-chip-btn ${isLocked ? 'active' : ''}"
                    style="${isLocked ? 'background:#5A4E7C; color:#fff; border-color:#181425; font-weight:700;' : (isUnlockedPass ? 'background:#e8f5e9; color:#1b5e20; border-color:#2e7d32;' : '')}"
                    onclick="window.app.quickToggleLockPreset('${p.id}')">
                    <span>${p.icon}</span>
                    <span>${p.name}</span>
                    <span>${isLocked ? '🔒' : (isUnlockedPass ? '🔓' : '＋')}</span>
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Campo para digitar qualquer outro app a pedido da usuária -->
            <div class="flex-row" style="gap: 6px;">
              <input type="text" id="${inputId}" class="pixel-input" placeholder="Outro app para trancar · Roblox, Shopee, Jogo..." onkeydown="if(event.key==='Enter'){event.preventDefault();window.app.quickAddLockedApp('${inputId}');}">
              <button type="button" class="pixel-btn btn-sm btn-purple" style="flex-shrink: 0; white-space: nowrap;" onclick="window.app.quickAddLockedApp('${inputId}')">
                🔒 Trancar App
              </button>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:4px;">
              <button type="button" class="pixel-btn btn-sm btn-red" style="font-size:11px;" onclick="window.app.relockAllAppsNow()">
                🔒 Trancar Todas Agora
              </button>
            </div>
          </div>

          <!-- Lista dos Apps Trancados / Liberados -->
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
            ${state.blockRules.length === 0
              ? `<div style="text-align:center; padding: 10px; font-size: 13px; color: ${PALETTE.grayDark};">Nenhum app trancado ainda. Toque em um app acima para trancar!</div>`
              : state.blockRules.map(r => {
                  const pass = this.isAppCurrentlyUnlockedByPass(r.pkg);
                  const minLeft = pass ? Math.max(1, Math.ceil((pass.expiresAt - now) / 60000)) : 0;
                  const isPaused = !r.enabled || state.cat.isRestMode;
                  const isLockedNow = !isPaused && !pass;

                  return `
                    <div class="mobile-stack-item" style="background: ${isLockedNow ? '#fff8f8' : '#f1f8e9'}; padding: 10px 12px; border: 2px solid ${isLockedNow ? '#E06C75' : '#5CAB5E'};">
                      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                          <span style="font-size: 24px; flex-shrink: 0;">${r.icon || '📱'}</span>
                          <div style="min-width: 0;">
                            <strong style="font-size: 15px; display: block; color: ${PALETTE.ink};">${r.name}</strong>
                            <span style="font-size: 11px; color: ${PALETTE.grayDark};">
                              ${isPaused
                                ? '⏸️ Trava pausada'
                                : (pass
                                  ? `🔓 Recompensa ativa · Restam ${minLeft} min`
                                  : `🔒 Trancado · Destrave com 🐟 ou tarefas`)
                              }
                            </span>
                          </div>
                        </div>
                        <span class="status-badge-pill ${isLockedNow ? 'pending' : 'done'}" style="${isLockedNow ? 'background:#ffebee; color:#c62828; border-color:#c62828;' : 'background:#c8e6c9; color:#1b5e20; border-color:#1b5e20;'}">
                          ${isPaused ? '⏸️ PAUSADO' : (pass ? `🔓 ${minLeft}M LIVRE` : '🔒 TRANCADO')}
                        </span>
                      </div>

                      <div class="card-action-footer" style="flex-wrap: wrap;">
                        ${isLockedNow ? `
                          <button class="pixel-btn btn-sm btn-purple" style="flex: 1;" onclick="window.app.simulateOpenSocialApp('${r.id}')">
                            🔒 Abrir ${r.name}
                          </button>
                          <button class="pixel-btn btn-sm btn-gold" style="flex: 1;" onclick="window.app.redeemAppUnlockPass('${r.id}', 15, 15)" title="Usar 15 Peixinhos para liberar por 15 min">
                            🎁 Liberar 15m (15🐟)
                          </button>
                          ${allTasksDone ? `
                            <button class="pixel-btn btn-sm btn-green" style="width: 100%; margin-top: 4px;" onclick="window.app.redeemAppUnlockPass('${r.id}', 30, 0)">
                              🎉 Destravar 30m Grátis (Tarefas de Hoje Cumpridas!)
                            </button>
                          ` : ''}
                        ` : `
                          <button class="pixel-btn btn-sm btn-green" style="flex: 1;" onclick="window.app.launchUnlockedSocialApp('${r.id}')">
                            🚀 Entrar no ${r.name}
                          </button>
                          <button class="pixel-btn btn-sm btn-red" style="flex: 1;" onclick="window.app.relockAppNow('${r.id}')">
                            🔒 Trancar Agora
                          </button>
                        `}
                        <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteBlockRule('${r.id}')" title="Remover app da lista">🗑️</button>
                      </div>
                    </div>
                  `;
                }).join('')
            }
          </div>
        </div>
      </div>
    `;
  }

  quickToggleLockPreset(presetId) {
    const p = SOCIAL_MEDIA_PRESETS.find(x => x.id === presetId);
    if (!p) return;
    state.selectedPresetId = presetId;

    let rule = state.blockRules.find(
      r => r.pkg === p.pkg || r.name.toLowerCase() === p.name.toLowerCase()
    );

    if (!rule) {
      rule = {
        id: `br-${Clock.now()}-${Math.floor(Math.random() * 1000)}`,
        name: p.name,
        pkg: p.pkg,
        icon: p.icon,
        url: p.url,
        rigor: 3,
        windowStart: '00:00',
        windowEnd: '23:59',
        days: 'Todos os dias',
        enabled: true
      };
      state.blockRules.push(rule);
    } else {
      // Se tinha passe ativo ou estava pausado, tranca imediatamente!
      const hasPass = this.isAppCurrentlyUnlockedByPass(rule.pkg);
      if (hasPass || !rule.enabled) {
        rule.enabled = true;
        rule.rigor = Math.max(1, rule.rigor || 3);
        state.activeUnlockSessions = state.activeUnlockSessions.filter(s => s.pkg !== rule.pkg);
        if (window.AndroidBlocker) {
          try { window.AndroidBlocker.revokePass(rule.pkg); } catch (e) {}
        }
      } else {
        // Já está trancado: abre a tela de bloqueio para demonstrar que está trancado!
        this.simulateOpenSocialApp(rule.id);
        return;
      }
    }

    audio.playMeowGreeting();
    this.setCatSpeech(`${rule.name} trancado! Cumpra suas tarefas ou use 🐟 para destravar.`);
    this.persist();
    this.renderActiveTab();
  }

  quickAddLockedApp(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    const rawName = el.value.trim();
    if (!rawName) {
      alert("Digite o nome do aplicativo ou rede social que deseja trancar!");
      return;
    }

    const meta = resolveSocialAppMeta(rawName);
    if (meta.pkg === 'com.whatsapp' || meta.pkg.includes('dialer') || meta.pkg.includes('settings') || meta.pkg.includes('catline')) {
      audio.playBlip();
      alert("Este aplicativo é protegido pelo Cat Line e nunca pode ser bloqueado!");
      return;
    }

    let existing = state.blockRules.find(
      r => r.name.toLowerCase() === meta.name.toLowerCase() || (r.pkg === meta.pkg && !meta.pkg.startsWith('app.custom.'))
    );

    if (existing) {
      existing.enabled = true;
      existing.rigor = 3;
      existing.windowStart = '00:00';
      existing.windowEnd = '23:59';
      existing.days = 'Todos os dias';
      state.activeUnlockSessions = state.activeUnlockSessions.filter(s => s.pkg !== existing.pkg);
      if (window.AndroidBlocker) {
        try { window.AndroidBlocker.revokePass(existing.pkg); } catch (e) {}
      }
    } else {
      existing = {
        id: `br-${Clock.now()}-${Math.floor(Math.random() * 1000)}`,
        name: meta.name,
        pkg: meta.pkg,
        icon: meta.icon,
        url: meta.url,
        rigor: 3,
        windowStart: '00:00',
        windowEnd: '23:59',
        days: 'Todos os dias',
        enabled: true
      };
      state.blockRules.push(existing);
    }

    el.value = '';
    audio.playMeowGreeting();
    this.setCatSpeech(`${existing.name} foi trancado! Destrave como recompensa.`);
    this.persist();
    this.renderActiveTab();
  }

  redeemAppUnlockPass(ruleId, minutes = 15, fishCost = 15) {
    const r = state.blockRules.find(x => x.id === ruleId);
    if (!r) return;

    if (fishCost > 0 && state.currencies.peixinhos < fishCost) {
      // Abre o modal da barreira mostrando as tarefas pendentes para ganhar peixinhos!
      audio.playBlip();
      this.simulateOpenSocialApp(r.id);
      return;
    }

    if (fishCost > 0) {
      state.currencies.peixinhos -= fishCost;
      state.currencies.vinculo += 10;
    }

    if (state.simulatedModal && state.simulatedModal.timerId) {
      clearInterval(state.simulatedModal.timerId);
    }
    state.simulatedModal = null;

    state.activeUnlockSessions = state.activeUnlockSessions.filter(s => s.pkg !== r.pkg);
    state.activeUnlockSessions.push({
      pkg: r.pkg,
      expiresAt: Clock.now() + minutes * 60 * 1000
    });

    if (window.AndroidBlocker) {
      try { window.AndroidBlocker.grantPass(r.pkg, minutes); } catch (e) {}
    }

    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.setCatSpeech(`🔓 ${r.name} destravado por ${minutes} min como recompensa!`);
    this.updateHUD();
    this.persist();
    this.renderActiveTab();
  }

  relockAppNow(ruleId) {
    const r = state.blockRules.find(x => x.id === ruleId);
    if (!r) return;
    r.enabled = true;
    r.rigor = Math.max(1, r.rigor || 3);
    state.activeUnlockSessions = state.activeUnlockSessions.filter(s => s.pkg !== r.pkg);
    if (window.AndroidBlocker) {
      try { window.AndroidBlocker.revokePass(r.pkg); } catch (e) {}
    }
    audio.playBlip();
    this.setCatSpeech(`🔒 ${r.name} trancado novamente!`);
    this.persist();
    this.renderActiveTab();
  }

  relockAllAppsNow() {
    state.activeUnlockSessions = [];
    state.blockRules.forEach(r => {
      r.enabled = true;
      r.rigor = Math.max(1, r.rigor || 3);
      if (window.AndroidBlocker) {
        try { window.AndroidBlocker.revokePass(r.pkg); } catch (e) {}
      }
    });
    if (window.AndroidBlocker && typeof window.AndroidBlocker.clearAllPasses === 'function') {
      try { window.AndroidBlocker.clearAllPasses(); } catch (e) {}
    }
    audio.playBlip();
    this.setCatSpeech("Todas as redes foram trancadas!");
    this.persist();
    this.renderActiveTab();
  }

  launchUnlockedSocialApp(ruleId) {
    const r = state.blockRules.find(x => x.id === ruleId);
    if (!r) return;
    const pass = this.isAppCurrentlyUnlockedByPass(r.pkg);
    if (r.enabled && !state.cat.isRestMode && !pass) {
      this.simulateOpenSocialApp(r.id);
      return;
    }
    const meta = resolveSocialAppMeta(r.name, r.pkg);
    const targetUrl = r.url || meta.url;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert(`🔓 ${r.name} está destravado! Você pode usar livremente pelo tempo da sua recompensa.`);
    }
  }

  renderGlobalBlockerModalOverlay() {
    const existingOverlay = document.getElementById('global-blocker-modal-root');
    if (existingOverlay && typeof existingOverlay.remove === 'function') existingOverlay.remove();

    const modal = state.simulatedModal;
    if (!modal || !modal.rule) return;

    const r = modal.rule;
    const rigor = r.rigor;
    const pendingTasks = state.occurrences.filter(o => o.state === 'PENDENTE');
    const pendingHabits = state.habits.filter(h => !h.completed);
    const canAfford15 = state.currencies.peixinhos >= 15;
    const canAfford25 = state.currencies.peixinhos >= 25;

    let innerBoxHtml = '';

    if (rigor === 0) {
      innerBoxHtml = `
        <div class="blocker-modal-header">
          <span style="font-weight: 700; font-size: 16px;">${r.icon || '📱'} ${r.name} · Modo Observar</span>
          <button class="pixel-btn btn-sm btn-icon" onclick="window.app.closeSimulatedModal()">✕</button>
        </div>
        <div class="blocker-cat-banner">
          <span class="blocker-cat-avatar">🐱</span>
          <div class="blocker-dialog-text">
            No nível Observar você navega livremente. Para trancar como recompensa, mude o rigor para 3 Condicional.
          </div>
        </div>
        <button class="pixel-btn btn-green" style="width: 100%; margin-top: 6px;" onclick="window.app.closeSimulatedModal()">Fechar</button>
      `;
    } else if (rigor === 2 && modal.secondsLeft > 0) {
      const sec = modal.secondsLeft !== undefined ? modal.secondsLeft : 15;
      const pct = Math.round(((15 - sec) / 15) * 100);
      innerBoxHtml = `
        <div class="blocker-modal-header">
          <span style="font-weight: 700; font-size: 16px;">${r.icon || '📱'} ${r.name} · Pausa Reflexiva</span>
          <button class="pixel-btn btn-sm btn-icon" onclick="window.app.closeSimulatedModal()">✕</button>
        </div>
        <div class="blocker-cat-banner">
          <span class="blocker-cat-avatar">🧶</span>
          <div class="blocker-dialog-text">
            Espere ${sec} segundos... O que você veio buscar no ${r.name} ajuda a puxar o fio das suas metas hoje?
          </div>
        </div>
        <div class="friction-timer-track">
          <div class="friction-timer-fill" style="width: ${pct}%;"></div>
        </div>
        <div style="text-align: center; font-weight: 700; font-size: 14px; color: ${PALETTE.orangeShadow};">
          Aguarde ${sec} segundos...
        </div>
        <button class="pixel-btn btn-green" style="width: 100%; margin-top: 8px;" onclick="window.app.closeSimulatedModal()">Voltar ao Foco 🐾</button>
      `;
    } else {
      innerBoxHtml = `
        <div class="blocker-modal-header">
          <span style="font-weight: 700; font-size: 16px;">🔒 ${r.icon || '📱'} ${r.name} Trancado!</span>
          <button class="pixel-btn btn-sm btn-icon" onclick="window.app.closeSimulatedModal()">✕</button>
        </div>

        <div class="blocker-cat-banner">
          <span class="blocker-cat-avatar">🐱</span>
          <div class="blocker-dialog-text" style="font-size: 13.5px;">
            O <strong>${r.name}</strong> está trancado! Para destravar como recompensa, cumpra suas tarefas abaixo ou troque seus <strong>Peixinhos (Saldo: ${state.currencies.peixinhos}🐟)</strong>:
          </div>
        </div>

        <!-- Opção A: Resgatar Passe de Recompensa com Peixinhos -->
        <div style="background: #fffdf2; border: 2px solid ${PALETTE.orange}; padding: 10px; border-radius: 4px;">
          <strong style="font-size: 13px; color: ${PALETTE.orangeShadow}; display: block; margin-bottom: 6px;">
            🎁 Destravar com Peixinhos (Recompensa):
          </strong>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button class="pixel-btn btn-sm ${canAfford15 ? 'btn-gold' : 'btn-secondary'}"
              onclick="${canAfford15 ? `window.app.redeemAppUnlockPass('${r.id}', 15, 15)` : `alert('Você tem ${state.currencies.peixinhos}🐟. Cumprir 1 tarefa ou hábito abaixo já garante Peixinhos para liberar!')`}">
              🔓 15 min (15🐟)
            </button>
            <button class="pixel-btn btn-sm ${canAfford25 ? 'btn-gold' : 'btn-secondary'}"
              onclick="${canAfford25 ? `window.app.redeemAppUnlockPass('${r.id}', 30, 25)` : `alert('Você tem ${state.currencies.peixinhos}🐟. Cumpra suas tarefas abaixo para acumular 25🐟!')`}">
              🔓 30 min (25🐟)
            </button>
          </div>
        </div>

        <!-- Opção B: Cumprir Tarefas / Hábitos de Hoje para Destravar -->
        <div style="background: #f5f0ff; border: 2px solid ${PALETTE.cozyPurple}; padding: 10px; border-radius: 4px;">
          <strong style="font-size: 13px; color: ${PALETTE.cozyPurple}; display: block; margin-bottom: 6px;">
            ✅ Cumprir Tarefas de Hoje p/ Destravar:
          </strong>
          <div class="pending-tasks-blocker-list" style="max-height: 150px; overflow-y: auto;">
            ${pendingTasks.length === 0 && pendingHabits.length === 0
              ? `
                <div style="color: ${PALETTE.leafGreen}; font-weight: 700; text-align: center; padding: 6px;">
                  🎉 Todas as tarefas e hábitos de hoje foram cumpridos!
                </div>
                <button class="pixel-btn btn-sm btn-green" style="width: 100%; margin-top: 4px;" onclick="window.app.redeemAppUnlockPass('${r.id}', 30, 0)">
                  🔓 Liberar 30 min Grátis Agora!
                </button>
              `
              : `
                ${pendingTasks.map(t => `
                  <div class="pending-task-blocker-row">
                    <span style="font-size: 13px;">📅 <strong>${t.title}</strong> (${t.time})</span>
                    <button class="pixel-btn btn-sm btn-green" onclick="window.app.completeOccurrenceFromBlocker('${t.id}')">
                      ✓ Cumprir (+${t.reward}🐟)
                    </button>
                  </div>
                `).join('')}
                ${pendingHabits.map(h => `
                  <div class="pending-task-blocker-row">
                    <span style="font-size: 13px;">🔄 <strong>${h.title}</strong></span>
                    <button class="pixel-btn btn-sm btn-green" onclick="window.app.completeHabitFromBlocker('${h.id}')">
                      ✓ Cumprir (+8🐟)
                    </button>
                  </div>
                `).join('')}
              `
            }
          </div>
        </div>

        <div class="flex-row space-between" style="margin-top: 4px; gap: 8px;">
          <button class="pixel-btn btn-green" style="flex: 1;" onclick="window.app.closeSimulatedModal()">
            🐾 Voltar ao Foco
          </button>
          <button id="btn-modal-emergency" class="pixel-btn btn-sm btn-danger" style="flex: 1;">
            Segure 10s Emergência
          </button>
        </div>
      `;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'global-blocker-modal-root';
    wrapper.className = 'blocker-modal-backdrop';
    wrapper.onclick = (e) => {
      if (e.target === wrapper) this.closeSimulatedModal();
    };
    wrapper.innerHTML = `<div class="blocker-modal-box">${innerBoxHtml}</div>`;
    if (document.body && typeof document.body.appendChild === 'function') document.body.appendChild(wrapper);

    this.attachHoldEmergencyButton('btn-modal-emergency', r.pkg);
  }

  attachHoldEmergencyButton(btnId, pkg = 'com.instagram.android') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    let holdTimer = null;
    let count = 0;
    const startHold = () => {
      count = 0;
      audio.playPurr();
      holdTimer = setInterval(() => {
        count++;
        btn.textContent = `Segurando... ${count}/10s`;
        if (count >= 10) {
          clearInterval(holdTimer);
          btn.textContent = "Liberado!";
          audio.playMeowCelebrate();
          window.app.grantSimulatedPass(pkg, 30);
        }
      }, 1000);
    };
    const cancelHold = () => {
      if (holdTimer) clearInterval(holdTimer);
      btn.textContent = "Segure 10s Emergência";
    };
    btn.onmousedown = startHold;
    btn.onmouseup = cancelHold;
    btn.ontouchstart = startHold;
    btn.ontouchend = cancelHold;
  }

  completeHabitFromBlocker(habId) {
    const h = state.habits.find(x => x.id === habId);
    if (!h || h.completed) return;
    h.completed = true;
    h.streak += 1;
    h.bestStreak = Math.max(h.bestStreak, h.streak);
    h.totalCheckIns += 1;
    state.currencies.peixinhos += 8;
    state.currencies.vinculo += 5;
    this.updateHUD();
    audio.playMeowCelebrate();
    this.persist();
    this.renderActiveTab();
  }

  renderNativeBlockerCard() {
    const nb = window.AndroidBlocker;
    if (!nb) {
      return `
      <div class="pixel-card" style="border-left: 6px solid ${PALETTE.cozyPurple}; background: #f8f4ff;">
        <h4 style="margin-bottom: 4px;">🔒 Cofre de Bloqueio Ativo no App + APK Android</h4>
        <p style="font-size: 13px;">
          Aqui no aplicativo você pode <strong>trancar qualquer rede social ou app</strong> e só liberar mediante <strong>recompensa (🐟 Peixinhos ou tarefas cumpridas)</strong>. Para travar também fora do Cat Line no celular Android, instale o APK abaixo:
        </p>
        <a href="/CatLine-Instalador.apk" download="CatLine-Instalador.apk" class="pixel-btn btn-sm btn-green" style="display:inline-block; margin-top:6px; text-decoration:none;">📦 Baixar APK Android c/ Bloqueador</a>
      </div>`;
    }
    let diag = {};
    syncNativeBlocker();
    try { diag = JSON.parse(nb.diagnostics() || '{}'); } catch (e) {}
    const enabled = !!diag.serviceEnabled;
    const fmt = (ms) => ms ? Clock.formatTime(ms) : 'nunca';
    const rulesHtml = (diag.rules || []).map(r => {
      const color = r.status === 'TRAVA AGORA' ? PALETTE.leafGreen : PALETTE.grayDark;
      const inst = r.installed ? '' : ' · <em>não instalado</em>';
      return `<li><strong>${r.name}</strong>: <span style="color:${color}">${r.status}</span>${inst}</li>`;
    }).join('');
    const lastBlock = diag.lastBlock ? diag.lastBlock.split('@') : null;
    const diagHtml = `
        <details style="margin-top: 8px; font-size: 12px;">
          <summary style="cursor:pointer; font-weight:700;">🔎 Diagnóstico do Bloqueador no Celular</summary>
          <ul style="padding-left: 16px; margin-top: 4px;">
            <li>Versão: ${diag.version || '?'} · Android SDK ${diag.sdk || '?'} · ${diag.device || ''}</li>
            <li>Serviço ligado nas configurações: <strong>${enabled ? 'sim' : 'não'}</strong></li>
            <li>Serviço conectado pela última vez: ${fmt(diag.connectedAt)}</li>
            <li>Último app detectado: ${diag.lastPkg || 'nenhum'} · ${fmt(diag.lastAt)}</li>
            <li>Último bloqueio: ${lastBlock ? lastBlock[0] + ' · ' + fmt(Number(lastBlock[1])) : 'nenhum'}</li>
            <li>Regras sincronizadas: ${fmt(diag.syncAt)}</li>
          </ul>
          <ul style="padding-left: 16px;">${rulesHtml || '<li>Nenhuma regra</li>'}</ul>
          <button class="pixel-btn btn-sm" style="margin-top:4px;" onclick="window.app.refreshBlockerDiag()">🔄 Atualizar</button>
        </details>`;
    const testBtn = IS_RELEASE ? '' : `<button class="pixel-btn btn-sm" onclick="window.app.testBlockScreen()">🧪 Testar tela de bloqueio</button>`;
    if (enabled) {
      return `
      <div class="pixel-card" style="border-left: 6px solid ${PALETTE.leafGreen};">
        <h4 style="margin-bottom: 4px;">✅ Bloqueio Nativo Android Ativo</h4>
        <p style="font-size: 13px; margin-bottom: 6px;">As redes com status <strong>TRAVA AGORA</strong> serão bloqueadas automaticamente ao tentar abri-las no celular.</p>
        <div class="flex-row" style="gap: 6px; flex-wrap: wrap; margin-bottom: 6px;">
          <button class="pixel-btn btn-sm btn-red" onclick="window.app.relockAllAppsNow()">🔒 Trancar Todas as Redes Agora</button>
          ${testBtn}
        </div>
        ${diagHtml}
      </div>`;
    }
    return `
      <div class="pixel-card" style="border-left: 6px solid #E06C75;">
        <h4 style="margin-bottom: 4px;">⚠️ Ative a Permissão de Bloqueio no Android</h4>
        <p style="font-size: 13px; margin-bottom: 6px;">Para o celular cobrir o Instagram/TikTok fora do Cat Line, ligue o serviço em 2 passos:</p>
        <ol style="font-size: 13px; padding-left: 18px; margin-bottom: 8px;">
          <li>Toque em <strong>Ativar bloqueio</strong>, abra <strong>Apps instalados</strong> ou <strong>Serviços baixados</strong> e escolha <strong>Cat Line</strong>.</li>
          <li>Ligue a chave. Se aparecer <strong>Configuração restrita</strong>, toque em <strong>Info do app</strong>, depois em ⋮ no canto superior e em <strong>Permitir configurações restritas</strong>. Depois repita o passo 1.</li>
        </ol>
        <div class="flex-row" style="gap: 6px; flex-wrap: wrap;">
          <button class="pixel-btn btn-sm btn-green" onclick="window.app.openBlockerSettings()">Ativar bloqueio</button>
          <button class="pixel-btn btn-sm" onclick="window.app.openBlockerAppInfo()">Info do app</button>
        </div>
        ${diagHtml}
      </div>`;
  }

  refreshBlockerDiag() {
    syncNativeBlocker();
    this.renderActiveTab();
  }

  testBlockScreen() {
    if (window.AndroidBlocker) window.AndroidBlocker.testBlockScreen();
  }

  openBlockerSettings() {
    if (window.AndroidBlocker) window.AndroidBlocker.openAccessibilitySettings();
  }

  openBlockerAppInfo() {
    if (window.AndroidBlocker) window.AndroidBlocker.openAppDetails();
  }

  // Banco de Minutos Gamificado (Fase 5)
  renderMinuteBankCard() {
    const isFocoOn = state.flags.FOCO !== false && state.flags.foco !== false;
    const mb = state.minuteBank || { balanceMinutes: 0, totalEarnedMinutes: 0, totalConsumedMinutes: 0, transactions: [] };

    if (!isFocoOn) {
      return `
        <div class="pixel-card cream" style="border: 2px dashed #95a5a6; opacity: 0.9; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 26px;">⏸️</span>
            <div style="flex: 1;">
              <strong style="color: #7f8c8d; font-size: 15px; display: block;">Banco de Minutos · Módulo Pausado</strong>
              <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin: 4px 0 0 0; line-height: 1.4;">
                O interruptor do módulo Foco está desligado. O Banco de Minutos e as travas de redes sociais estão pausados.
              </p>
            </div>
          </div>
        </div>
      `;
    }

    const balance = mb.balanceMinutes || 0;
    const earned = mb.totalEarnedMinutes || 0;
    const consumed = mb.totalConsumedMinutes || 0;

    return `
      <div class="pixel-card cream minute-bank-card" style="border: 2px solid #8e44ad; background: #faf5ff; margin-bottom: 12px;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
          <div>
            <span style="font-size: 11px; font-weight: 700; color: #8e44ad; text-transform: uppercase; letter-spacing: 0.5px; display: block;">
              Banco de Minutos · Redes Sociais
            </span>
            <strong style="font-size: 22px; color: #2c3e50; display: block; margin-top: 2px;">
              ${balance} min <span style="font-size: 14px; font-weight: 600; color: #27ae60;">disponíveis</span>
            </strong>
          </div>
          <button class="pixel-btn btn-sm btn-purple" onclick="window.app.redeemMinuteBankWithFish(15, 15)">
            +15 min por 15🐟
          </button>
        </div>

        <p style="font-size: 12px; color: ${PALETTE.grayDark}; margin: 8px 0; line-height: 1.4;">
          Ganhe +5 minutos toda vez que concluir um compromisso ou hábito na rotina, ou troque peixinhos por tempo livre.
        </p>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #fff; border: 1px solid #e8daef; border-radius: 4px; padding: 6px 10px; margin-top: 6px;">
          <div>
            <span style="font-size: 10px; color: ${PALETTE.grayDark}; display: block;">TOTAL CONQUISTADO</span>
            <strong style="font-size: 13px; color: #27ae60;">+${earned} min</strong>
          </div>
          <div>
            <span style="font-size: 10px; color: ${PALETTE.grayDark}; display: block;">TOTAL UTILIZADO</span>
            <strong style="font-size: 13px; color: #e67e22;">-${consumed} min</strong>
          </div>
        </div>
      </div>
    `;
  }

  redeemMinuteBankWithFish(minutes = 15, cost = 15) {
    if (state.currencies.peixinhos < cost) {
      alert(`Você tem ${state.currencies.peixinhos} peixinhos. São necessários ${cost} peixinhos para resgatar este tempo.`);
      return;
    }
    state.currencies.peixinhos -= cost;
    minuteBankEngine.creditMinutes(state, minutes, `Resgate com ${cost} peixinhos`);
    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }

  renderTabFoco() {
    const selPreset = SOCIAL_MEDIA_PRESETS.find(p => p.id === state.selectedPresetId) || SOCIAL_MEDIA_PRESETS[0];

    this.contentEl.innerHTML = `
      ${this.renderNativeBlockerCard()}

      ${this.renderMinuteBankCard()}

      ${this.renderLockedAppsVaultCard('foco')}

      ${this.renderCorrelationInsightCard()}

      <!-- Card: Proteção de Apps Essenciais -->
      <div class="pixel-card cream" style="border-left: 6px solid ${PALETTE.leafGreen};">
        <h4 style="margin-bottom: 4px;">🛡️ Proteção Garantida</h4>
        <p style="font-size: 13px; color: ${PALETTE.grayDark};">WhatsApp, Telefone e Cat Line nunca são bloqueados, garantindo que você nunca fique isolada.</p>
      </div>

      <!-- Formulário Avançado: Configurar Horário e Nível de Rigor -->
      <div class="pixel-card">
        <h4>⚙️ Configurar Regra Detalhada</h4>
        <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin-bottom: 8px;">Escolha uma rede social ou digite o nome de qualquer aplicativo para personalizar horário e rigor:</p>

        <div class="preset-chips-wrap">
          ${SOCIAL_MEDIA_PRESETS.map(p => `
            <button type="button" class="preset-chip-btn ${state.selectedPresetId === p.id ? 'active' : ''}" onclick="window.app.selectSocialPreset('${p.id}')">
              <span>${p.icon}</span>
              <span>${p.name}</span>
            </button>
          `).join('')}
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="flex-row">
            <input type="text" id="foco-app-name" class="pixel-input" placeholder="Nome do App · TikTok, Netflix, Jogo" value="${selPreset.name}" style="flex: 1;" oninput="window.app.onFocoAppNameInput(this.value)">
            <input type="text" id="foco-pkg-name" class="pixel-input" placeholder="Pacote automático" value="${selPreset.pkg}" style="flex: 1;">
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 13px; font-weight: 700;">Nível de Rigor:</span>
            <select id="foco-rigor" class="pixel-input">
              <option value="0">0 Observar · Apenas mede tempo sem interromper</option>
              <option value="1">1 Aviso · Balão da gatinha lembrando o foco</option>
              <option value="2">2 Fricção · Espera de 15 segundos reflexiva</option>
              <option value="3" selected>3 Recompensa / Condicional · Trancado até cumprir tarefas ou usar 🐟</option>
              <option value="4">4 Firme · Bloqueio sagrado no horário</option>
            </select>
          </div>

          <div class="flex-row">
            <div style="flex: 1;">
              <span style="font-size: 12px; font-weight: 700;">Início:</span>
              <input type="time" id="foco-time-start" class="pixel-input" value="00:00">
            </div>
            <div style="flex: 1;">
              <span style="font-size: 12px; font-weight: 700;">Fim:</span>
              <input type="time" id="foco-time-end" class="pixel-input" value="23:59">
            </div>
            <div style="flex: 1.2;">
              <span style="font-size: 12px; font-weight: 700;">Dias:</span>
              <select id="foco-days" class="pixel-input">
                <option value="Todos os dias" selected>Todos os dias</option>
                <option value="Dias úteis">Dias úteis</option>
                <option value="Fins de semana">Fins de semana</option>
              </select>
            </div>
          </div>

          <button class="pixel-btn btn-green" onclick="window.app.saveBlockRule()">🔒 Salvar e Trancar Aplicativo</button>
        </div>
      </div>

      <!-- Saída Garantida de Emergência (10s) -->
      <div class="pixel-card cream">
        <h4>Saída Garantida de Emergência</h4>
        <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin-bottom: 8px;">Segure o botão abaixo por 10 segundos ininterruptos para liberação temporária de emergência:</p>
        <button id="btn-emergency" class="pixel-btn btn-red" style="width: 100%;">Segurar 10s para Emergência</button>
      </div>
    `;

    this.attachHoldEmergencyButton('btn-emergency');
  }

  onFocoAppNameInput(val) {
    const pkgEl = document.getElementById('foco-pkg-name');
    if (!pkgEl) return;
    const meta = resolveSocialAppMeta(val);
    pkgEl.value = meta.pkg;
  }

  selectSocialPreset(presetId) {
    const p = SOCIAL_MEDIA_PRESETS.find(x => x.id === presetId);
    if (!p) return;
    state.selectedPresetId = presetId;

    // Também garante que o app clicado já fique trancado e ativo na lista!
    let existing = state.blockRules.find(
      r => r.pkg === p.pkg || r.name.toLowerCase() === p.name.toLowerCase()
    );
    if (!existing) {
      state.blockRules.push({
        id: `br-${Clock.now()}`,
        name: p.name,
        pkg: p.pkg,
        icon: p.icon,
        url: p.url,
        rigor: 3,
        windowStart: '00:00',
        windowEnd: '23:59',
        days: 'Todos os dias',
        enabled: true
      });
    } else {
      existing.enabled = true;
    }

    state.activeUnlockSessions = state.activeUnlockSessions.filter(s => s.pkg !== p.pkg);
    if (window.AndroidBlocker) {
      try { window.AndroidBlocker.revokePass(p.pkg); } catch (e) {}
    }

    audio.playMeowGreeting();
    this.persist();
    this.renderActiveTab();
  }

  saveBlockRule() {
    const nameEl = document.getElementById('foco-app-name');
    const pkgEl = document.getElementById('foco-pkg-name');
    const rigorEl = document.getElementById('foco-rigor');
    const startEl = document.getElementById('foco-time-start');
    const endEl = document.getElementById('foco-time-end');
    const daysEl = document.getElementById('foco-days');

    const rawName = nameEl ? nameEl.value.trim() : '';
    if (!rawName) {
      alert("Digite o nome do aplicativo que deseja trancar!");
      return;
    }

    const meta = resolveSocialAppMeta(rawName, pkgEl ? pkgEl.value.trim() : '');
    const name = meta.name;
    const pkg = meta.pkg;
    const icon = meta.icon;
    const url = meta.url;

    // Impede bloqueio de apps protegidos
    if (pkg === 'com.whatsapp' || pkg.includes('dialer') || pkg.includes('settings') || pkg.includes('catline') || pkg.includes('deadline')) {
      audio.playBlip();
      alert("Este aplicativo é protegido pelo Cat Line e nunca pode ser bloqueado!");
      return;
    }

    const rigor = parseInt((rigorEl && rigorEl.value) || '3', 10);
    const windowStart = (startEl && startEl.value) || '00:00';
    const windowEnd = (endEl && endEl.value) || '23:59';
    const days = (daysEl && daysEl.value) || 'Todos os dias';

    const existing = state.blockRules.find(
      r => r.name.toLowerCase() === name.toLowerCase() || (r.pkg === pkg && !pkg.startsWith('app.custom.'))
    );
    if (existing) {
      existing.name = name;
      existing.pkg = pkg;
      existing.icon = icon;
      existing.url = url;
      existing.rigor = rigor;
      existing.windowStart = windowStart;
      existing.windowEnd = windowEnd;
      existing.days = days;
      existing.enabled = true;
    } else {
      state.blockRules.push({
        id: `br-${Clock.now()}`,
        name,
        pkg,
        icon,
        url,
        rigor,
        windowStart,
        windowEnd,
        days,
        enabled: true
      });
    }

    // Revoga passe antigo caso estivesse liberado para que tranque na hora
    state.activeUnlockSessions = state.activeUnlockSessions.filter(s => s.pkg !== pkg);
    if (window.AndroidBlocker) {
      try { window.AndroidBlocker.revokePass(pkg); } catch (e) {}
    }

    audio.playMeowGreeting();
    this.setCatSpeech(`🔒 ${name} trancado com sucesso!`);
    this.persist();
    this.renderActiveTab();
  }

  toggleBlockRule(id) {
    const r = state.blockRules.find(x => x.id === id);
    if (!r) return;
    r.enabled = !r.enabled;
    audio.playBlip();
    this.setCatSpeech(r.enabled ? `Bloqueio do ${r.name} ativado!` : `Bloqueio do ${r.name} pausado!`);
    this.persist();
    this.renderActiveTab();
  }

  startEditBlockRule(id) {
    state.editingBlockRuleId = id;
    audio.playBlip();
    this.renderActiveTab();
  }

  cancelEditBlockRule() {
    state.editingBlockRuleId = null;
    audio.playBlip();
    this.renderActiveTab();
  }

  saveInlineEditBlockRule(id) {
    const r = state.blockRules.find(x => x.id === id);
    if (!r) return;
    const nameEl = document.getElementById(`edit-foco-name-${id}`);
    const rigorEl = document.getElementById(`edit-foco-rigor-${id}`);
    const startEl = document.getElementById(`edit-foco-start-${id}`);
    const endEl = document.getElementById(`edit-foco-end-${id}`);

    if (nameEl && nameEl.value.trim()) {
      const meta = resolveSocialAppMeta(nameEl.value.trim(), r.pkg);
      r.name = meta.name;
      r.pkg = meta.pkg;
      r.icon = meta.icon;
      r.url = meta.url;
    }
    if (rigorEl) r.rigor = parseInt(rigorEl.value, 10);
    if (startEl && startEl.value) r.windowStart = startEl.value;
    if (endEl && endEl.value) r.windowEnd = endEl.value;

    state.editingBlockRuleId = null;
    audio.playMeowGreeting();
    this.persist();
    this.renderActiveTab();
  }

  deleteBlockRule(id) {
    const r = state.blockRules.find(x => x.id === id);
    const name = r ? r.name : 'Regra';
    state.blockRules = state.blockRules.filter(x => x.id !== id);
    if (state.editingBlockRuleId === id) state.editingBlockRuleId = null;
    audio.playBlip();
    this.setCatSpeech(`Regra do ${name} descartada.`);
    this.persist();
    this.renderActiveTab();
  }

  simulateOpenSocialApp(ruleId) {
    const r = state.blockRules.find(x => x.id === ruleId);
    if (!r) return;

    if (!r.enabled) {
      r.enabled = true;
    }

    if (state.cat.isRestMode) {
      audio.playMeowGreeting();
      alert(`Modo descanso está ativo! Nenhuma rede social está bloqueada hoje.`);
      return;
    }

    // Verifica se possui passe de desbloqueio ativo
    const pass = this.isAppCurrentlyUnlockedByPass(r.pkg);
    if (pass) {
      const minLeft = Math.max(1, Math.ceil((pass.expiresAt - Clock.now()) / 60000));
      audio.playMeowGreeting();
      this.launchUnlockedSocialApp(r.id);
      return;
    }

    audio.playMeowGreeting();
    state.simulatedModal = {
      rule: r,
      secondsLeft: 15,
      timerId: null
    };

    if (r.rigor === 2) {
      let s = 15;
      const t = setInterval(() => {
        if (!state.simulatedModal || state.simulatedModal.rule.id !== r.id) {
          clearInterval(t);
          return;
        }
        s--;
        state.simulatedModal.secondsLeft = s;
        if (s <= 0) {
          clearInterval(t);
        }
        this.renderGlobalBlockerModalOverlay();
      }, 1000);
      state.simulatedModal.timerId = t;
    }

    this.renderGlobalBlockerModalOverlay();
  }

  closeSimulatedModal() {
    if (state.simulatedModal && state.simulatedModal.timerId) {
      clearInterval(state.simulatedModal.timerId);
    }
    state.simulatedModal = null;
    const existingOverlay = document.getElementById('global-blocker-modal-root');
    if (existingOverlay && typeof existingOverlay.remove === 'function') existingOverlay.remove();
    audio.playBlip();
  }

  grantSimulatedPass(pkg, minutes = 15) {
    if (state.simulatedModal && state.simulatedModal.timerId) {
      clearInterval(state.simulatedModal.timerId);
    }
    state.activeUnlockSessions = state.activeUnlockSessions.filter(s => s.pkg !== pkg);
    state.activeUnlockSessions.push({
      pkg,
      expiresAt: Clock.now() + minutes * 60 * 1000
    });
    if (window.AndroidBlocker) {
      try { window.AndroidBlocker.grantPass(pkg, minutes); } catch (e) {}
    }
    state.simulatedModal = null;
    audio.playMeowCelebrate();
    this.persist();
    this.renderActiveTab();
  }

  completeOccurrenceFromBlocker(occId) {
    const occ = state.occurrences.find(o => o.id === occId);
    if (!occ || occ.state === 'FEITO') return;

    occ.state = 'FEITO';
    state.currencies.peixinhos += occ.reward;
    state.currencies.vinculo += occ.reward;
    if (typeof minuteBankEngine !== 'undefined') {
      minuteBankEngine.creditMinutes(state, minuteBankEngine.MINUTES_PER_TASK, 'Compromisso concluído', occId);
    }
    this.updateHUD();
    audio.playMeowCelebrate();

    const pendingLeft = state.occurrences.filter(o => o.state === 'PENDENTE').length;
    if (pendingLeft === 0) {
      this.setCatSpeech("Tarefas cumpridas! Você já pode liberar suas redes sociais!");
    } else {
      this.setCatSpeech(`Compromisso "${occ.title}" cumprido! +${occ.reward}🐟`);
    }

    this.persist();
    this.renderActiveTab();
  }

  // BRIEFING MENSAL & PLANEJAMENTO DE ROTINA
  startBriefing() {
    state.briefing.active = true;
    state.briefing.step = 1;
    audio.playMeowCelebrate();
    this.renderActiveTab();
  }

  cancelBriefing() {
    state.briefing.active = false;
    audio.playBlip();
    this.renderActiveTab();
  }

  setBriefingStep(step) {
    this.saveCurrentBriefingStepInputs();
    state.briefing.step = Math.max(1, Math.min(5, step));
    audio.playBlip();
    this.renderActiveTab();
  }

  saveCurrentBriefingStepInputs() {
    // Passo 1
    const wake = document.getElementById('briefing-wake');
    const sleep = document.getElementById('briefing-sleep');
    const period = document.getElementById('briefing-focus-period');
    if (wake && wake.value) state.briefing.wakeTime = wake.value;
    if (sleep && sleep.value) state.briefing.sleepTime = sleep.value;
    if (period && period.value) state.briefing.focusPeriod = period.value;

    // Passo 2: Se a usuária digitou no campo mas não clicou no botão "+ Adicionar"
    const customHabitEl = document.getElementById('briefing-custom-habit');
    if (customHabitEl && customHabitEl.value.trim()) {
      const customName = customHabitEl.value.trim();
      if (!state.briefing.selectedHabits.includes(customName)) {
        state.briefing.selectedHabits.push(customName);
      }
      customHabitEl.value = '';
    }

    // Passo 3
    const goalTitle = document.getElementById('briefing-goal-title');
    const goalDays = document.getElementById('briefing-goal-days');
    const goalReward = document.getElementById('briefing-goal-reward');
    if (goalTitle && goalTitle.value.trim()) state.briefing.goalTitle = goalTitle.value.trim();
    if (goalDays && goalDays.value) state.briefing.goalDays = Math.max(1, parseInt(goalDays.value, 10));
    if (goalReward && goalReward.value.trim()) state.briefing.goalReward = goalReward.value.trim();

    // Passo 4
    const rigor = document.getElementById('briefing-rigor');
    const start = document.getElementById('briefing-time-start');
    const end = document.getElementById('briefing-time-end');
    if (rigor) state.briefing.blockRigor = parseInt(rigor.value, 10);
    if (start && start.value) state.briefing.windowStart = start.value;
    if (end && end.value) state.briefing.windowEnd = end.value;
  }

  toggleBriefingHabit(name) {
    if (state.briefing.selectedHabits.includes(name)) {
      state.briefing.selectedHabits = state.briefing.selectedHabits.filter(h => h !== name);
    } else {
      state.briefing.selectedHabits.push(name);
    }
    audio.playBlip();
    this.renderBriefingWizard();
  }

  addCustomBriefingHabit() {
    const input = document.getElementById('briefing-custom-habit');
    const name = input ? input.value.trim() : '';
    if (!name) return;
    if (!state.briefing.selectedHabits.includes(name)) {
      state.briefing.selectedHabits.push(name);
    }
    input.value = '';
    audio.playMeowGreeting();
    this.renderBriefingWizard();
  }

  setBriefingGoalHorizon(horizon, days) {
    this.saveCurrentBriefingStepInputs();
    state.briefing.goalHorizon = horizon;
    state.briefing.goalDays = days;
    audio.playBlip();
    this.renderBriefingWizard();
  }

  selectBriefingGoalColor(colorId) {
    this.saveCurrentBriefingStepInputs();
    state.briefing.goalColor = colorId;
    audio.playBlip();
    this.renderBriefingWizard();
  }

  toggleBriefingApp(appName) {
    if (state.briefing.selectedApps.includes(appName)) {
      state.briefing.selectedApps = state.briefing.selectedApps.filter(a => a !== appName);
    } else {
      state.briefing.selectedApps.push(appName);
    }
    audio.playBlip();
    this.renderBriefingWizard();
  }

  applyBriefingPlan() {
    this.saveCurrentBriefingStepInputs();
    state.briefing.hasDoneOnce = true;
    state.briefing.lastCompletedDate = state.dayKey;
    state.briefing.active = false;

    // Aplica ou atualiza a meta com cronômetro em dias
    const totalSecs = state.briefing.goalDays * 86400;
    let targetGoal = state.goals.find(g => g.horizon === state.briefing.goalHorizon);
    if (targetGoal) {
      targetGoal.title = state.briefing.goalTitle || targetGoal.title;
      targetGoal.yarnColorId = state.briefing.goalColor;
      targetGoal.totalDays = state.briefing.goalDays;
      targetGoal.totalSeconds = totalSecs;
      targetGoal.remainingSeconds = totalSecs;
      targetGoal.reward = state.briefing.goalReward || targetGoal.reward;
      state.selectedGoalId = targetGoal.id;
    } else {
      const newId = `g-${Clock.now()}`;
      targetGoal = {
        id: newId,
        horizon: state.briefing.goalHorizon,
        title: state.briefing.goalTitle,
        yarnColorId: state.briefing.goalColor,
        totalDays: state.briefing.goalDays,
        totalSeconds: totalSecs,
        remainingSeconds: totalSecs,
        progress: 0.0,
        reward: state.briefing.goalReward,
        rewardCost: 150
      };
      state.goals.unshift(targetGoal);
      state.selectedGoalId = newId;
    }

    // Injeta ou atualiza hábitos do briefing no catálogo de hábitos
    state.briefing.selectedHabits.forEach(habitTitle => {
      const existing = state.habits.find(h => h.title.toLowerCase() === habitTitle.toLowerCase());
      if (existing) {
        existing.completed = false; // Pronto para cumprir hoje
      } else {
        state.habits.push({
          id: `hab-${Clock.now()}-${Math.floor(Math.random() * 1000)}`,
          title: habitTitle,
          streak: 0,
          bestStreak: 0,
          frequency: 'Todos os dias',
          window: '21:00',
          totalCheckIns: 0,
          completed: false
        });
      }
    });

    // Atualiza ou adiciona regras de foco escolhidas no Briefing
    state.briefing.selectedApps.forEach(appName => {
      const meta = resolveSocialAppMeta(appName);
      let rule = state.blockRules.find(r => r.name.toLowerCase() === meta.name.toLowerCase() || r.pkg === meta.pkg);
      if (rule) {
        rule.rigor = Math.max(3, state.briefing.blockRigor || 3);
        rule.windowStart = state.briefing.windowStart || '00:00';
        rule.windowEnd = state.briefing.windowEnd || '23:59';
        rule.days = 'Todos os dias';
        rule.enabled = true;
      } else {
        state.blockRules.push({
          id: `br-${Clock.now()}-${Math.floor(Math.random() * 1000)}`,
          name: meta.name,
          pkg: meta.pkg,
          icon: meta.icon,
          url: meta.url,
          rigor: Math.max(3, state.briefing.blockRigor || 3),
          windowStart: state.briefing.windowStart || '00:00',
          windowEnd: state.briefing.windowEnd || '23:59',
          days: 'Todos os dias',
          enabled: true
        });
      }
    });

    state.activeTab = 'hoje'; // Direciona para Hoje onde aparecem metas, tarefas e hábitos!
    audio.playMeowCelebrate();
    const pal = getYarnPalette(targetGoal.yarnColorId);
    this.setCatSpeech(`Plano aplicado! ${state.briefing.selectedHabits.length} hábitos e sua meta já estão em Hoje.`);
    this.updateHUD();
    this.renderNav();
    this.renderActiveTab();
    this.persist();
  }

  renderBriefingWizard() {
    const step = state.briefing.step || 1;
    const b = state.briefing;
    const goalPalette = getYarnPalette(b.goalColor);
    const rigorObj = RIGOR_LEVELS.find(r => r.level === b.blockRigor) || RIGOR_LEVELS[2];

    const HABIT_PRESETS = [
      { name: 'Beber 2L de Água', icon: '💧' },
      { name: 'Leitura diária', icon: '📖' },
      { name: 'Treino / Movimento', icon: '🏃‍♀️' },
      { name: 'Meditação 10m', icon: '🧘‍♀️' },
      { name: 'Skincare & Auto-cuidado', icon: '✨' },
      { name: 'Dormir antes das 23h', icon: '🌙' },
      { name: 'Organizar Escrivaninha', icon: '🧹' },
      { name: 'Estudar ou Escrever 30m', icon: '📝' }
    ];

    const APP_PRESETS = [
      { name: 'Instagram', icon: '📸' },
      { name: 'TikTok', icon: '🎵' },
      { name: 'Twitter / X', icon: '🩵' },
      { name: 'YouTube', icon: '🔴' }
    ];

    let stepHtml = '';

    if (step === 1) {
      stepHtml = `
        <div class="briefing-cat-speech">
          <span style="font-size: 28px;">🐱</span>
          <div>
            <strong>Etapa 1 de 5 · Seu Ritmo Diário</strong><br>
            <span>Vamos ajustar o relógio do seu dia.</span>
          </div>
        </div>

        <div class="pixel-card">
          <h4>⏰ Horários do seu Dia</h4>
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
            <div class="flex-row">
              <div style="flex: 1;">
                <span style="font-size: 13px; font-weight: 700;">Hora de acordar:</span>
                <input type="time" id="briefing-wake" class="pixel-input" value="${b.wakeTime}">
              </div>
              <div style="flex: 1;">
                <span style="font-size: 13px; font-weight: 700;">Hora de dormir:</span>
                <input type="time" id="briefing-sleep" class="pixel-input" value="${b.sleepTime}">
              </div>
            </div>

            <div>
              <span style="font-size: 13px; font-weight: 700;">Período em que você é mais produtiva:</span>
              <select id="briefing-focus-period" class="pixel-input" style="margin-top: 4px;">
                <option value="Manhã" ${b.focusPeriod === 'Manhã' ? 'selected' : ''}>Manhã · 06h às 12h</option>
                <option value="Tarde" ${b.focusPeriod === 'Tarde' ? 'selected' : ''}>Tarde · 12h às 18h</option>
                <option value="Noite" ${b.focusPeriod === 'Noite' ? 'selected' : ''}>Noite · 18h às 23h</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex-row space-between" style="margin-top: 6px;">
          <button class="pixel-btn btn-secondary" onclick="window.app.cancelBriefing()">Fechar Briefing</button>
          <button class="pixel-btn btn-green" onclick="window.app.setBriefingStep(2)">Avançar para Hábitos →</button>
        </div>
      `;
    } else if (step === 2) {
      stepHtml = `
        <div class="briefing-cat-speech">
          <span style="font-size: 28px;">🔄</span>
          <div>
            <strong>Etapa 2 de 5 · Seus Hábitos do Mês</strong><br>
            <span>Toque para selecionar os hábitos que você quer manter firmes neste mês. Consistência é o novelo que nunca desmancha!</span>
          </div>
        </div>

        <div class="pixel-card">
          <h4>Escolha seus Hábitos</h4>
          <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin-bottom: 8px;">Toque para marcar ou desmarcar:</p>

          <div class="briefing-choices-grid">
            ${(() => {
              const presets = [...HABIT_PRESETS];
              state.habits.forEach(h => {
                if (!presets.some(p => p.name.toLowerCase() === h.title.toLowerCase())) {
                  presets.push({ name: h.title, icon: '⭐' });
                }
              });
              b.selectedHabits.forEach(title => {
                if (!presets.some(p => p.name.toLowerCase() === title.toLowerCase())) {
                  presets.push({ name: title, icon: '✨' });
                }
              });
              return presets.map(h => {
                const isSel = b.selectedHabits.includes(h.name);
                return `
                  <div class="briefing-choice-card ${isSel ? 'selected' : ''}" onclick="window.app.toggleBriefingHabit('${h.name}')">
                    <span>${h.icon}</span>
                    <span style="flex: 1;">${h.name}</span>
                    ${isSel ? '<span style="color: ' + PALETTE.leafGreen + ';">✓</span>' : ''}
                  </div>
                `;
              }).join('');
            })()}
          </div>

          <div class="flex-row" style="margin-top: 10px;">
            <input type="text" id="briefing-custom-habit" class="pixel-input" placeholder="Outro hábito personalizado" onkeydown="if (event.key === 'Enter') { event.preventDefault(); window.app.addCustomBriefingHabit(); }">
            <button class="pixel-btn btn-sm btn-purple" onclick="window.app.addCustomBriefingHabit()">+ Adicionar</button>
          </div>
        </div>

        <div class="flex-row space-between" style="margin-top: 6px;">
          <button class="pixel-btn btn-secondary" onclick="window.app.setBriefingStep(1)">← Voltar</button>
          <button class="pixel-btn btn-green" onclick="window.app.setBriefingStep(3)">Avançar para Grande Meta →</button>
        </div>
      `;
    } else if (step === 3) {
      stepHtml = `
        <div class="briefing-cat-speech">
          <span style="font-size: 28px;">🧶</span>
          <div>
            <strong>Etapa 3 de 5 · Sua Grande Meta do Mês</strong><br>
            <span>Escolha a meta principal com cronômetro regressivo em dias e a cor do novelinho que eu vou carregar na patinha!</span>
          </div>
        </div>

        <div class="pixel-card">
          <h4>🎯 Meta & Cronômetro em Dias</h4>
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
            <input type="text" id="briefing-goal-title" class="pixel-input" value="${b.goalTitle}" placeholder="Título da sua grande meta">

            <div>
              <span style="font-size: 13px; font-weight: 700;">Duração em dias:</span>
              <div class="preset-chips-wrap" style="margin-top: 4px;">
                <button type="button" class="preset-chip-btn ${b.goalHorizon === 'SEMANA' ? 'active' : ''}" onclick="window.app.setBriefingGoalHorizon('SEMANA', 7)">7 Dias · Semana</button>
                <button type="button" class="preset-chip-btn ${b.goalHorizon === 'MES' ? 'active' : ''}" onclick="window.app.setBriefingGoalHorizon('MES', 30)">30 Dias · Mês</button>
                <button type="button" class="preset-chip-btn ${b.goalHorizon === 'TRIMESTRE' ? 'active' : ''}" onclick="window.app.setBriefingGoalHorizon('TRIMESTRE', 90)">90 Dias · Trimestre</button>
                <button type="button" class="preset-chip-btn ${b.goalHorizon === 'VIDA' ? 'active' : ''}" onclick="window.app.setBriefingGoalHorizon('VIDA', 365)">365 Dias · Ano</button>
              </div>
              <div class="flex-row" style="gap: 6px; margin-top: 4px;">
                <span style="font-size: 13px;">Dias personalizados:</span>
                <input type="number" id="briefing-goal-days" class="pixel-input" value="${b.goalDays}" min="1" max="3650" style="width: 80px;">
                <span style="font-size: 13px; font-weight: 700;">dias restantes</span>
              </div>
            </div>

            <div>
              <span style="font-size: 13px; font-weight: 700;">Cor do novelo na pata da gatinha:</span>
              <div class="briefing-choices-grid" style="margin-top: 4px;">
                ${YARN_COLORS.map(c => {
                  const isSel = b.goalColor === c.id;
                  return `
                    <div class="briefing-choice-card ${isSel ? 'selected' : ''}" onclick="window.app.selectBriefingGoalColor('${c.id}')">
                      <canvas class="yarn-color-dot mini-yarn-canvas" width="22" height="22" data-color="${c.id}"></canvas>
                      <span style="flex: 1;">${c.name}</span>
                      ${isSel ? '<span style="color: ' + PALETTE.leafGreen + ';">✓</span>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <div>
              <span style="font-size: 13px; font-weight: 700;">Mimo especial ao cumprir:</span>
              <input type="text" id="briefing-goal-reward" class="pixel-input" value="${b.goalReward}" placeholder="Ex: Jantar delicioso, dia de descanso...">
            </div>
          </div>
        </div>

        <div class="flex-row space-between" style="margin-top: 6px;">
          <button class="pixel-btn btn-secondary" onclick="window.app.setBriefingStep(2)">← Voltar</button>
          <button class="pixel-btn btn-green" onclick="window.app.setBriefingStep(4)">Avançar para Redes & Foco →</button>
        </div>
      `;
    } else if (step === 4) {
      stepHtml = `
        <div class="briefing-cat-speech">
          <span style="font-size: 28px;">🛡️</span>
          <div>
            <strong>Etapa 4 de 5 · Redes Sociais & Foco</strong><br>
            <span>Selecione as redes que mais te distraem e defina como a gatinha deve te ajudar a focar ao seu gosto!</span>
          </div>
        </div>

        <div class="pixel-card">
          <h4>Redes Sociais Monitoradas</h4>
          <p style="font-size: 13px; color: ${PALETTE.grayDark}; margin-bottom: 8px;">Toque para ativar ou desativar o controle:</p>

          <div class="briefing-choices-grid">
            ${APP_PRESETS.map(a => {
              const isSel = b.selectedApps.includes(a.name);
              return `
                <div class="briefing-choice-card ${isSel ? 'selected' : ''}" onclick="window.app.toggleBriefingApp('${a.name}')">
                  <span>${a.icon}</span>
                  <span style="flex: 1;">${a.name}</span>
                  ${isSel ? '<span style="color: ' + PALETTE.leafGreen + ';">✓</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
            <span style="font-size: 13px; font-weight: 700;">Nível de Rigor da Gatinha:</span>
            <select id="briefing-rigor" class="pixel-input">
              <option value="0" ${b.blockRigor === 0 ? 'selected' : ''}>0 Observar · Apenas mede tempo sem interromper</option>
              <option value="1" ${b.blockRigor === 1 ? 'selected' : ''}>1 Aviso · Balão da gatinha lembrando o foco</option>
              <option value="2" ${b.blockRigor === 2 ? 'selected' : ''}>2 Fricção · Espera de 15 segundos reflexiva</option>
              <option value="3" ${b.blockRigor === 3 ? 'selected' : ''}>3 Condicional · Travado até cumprir tarefas de hoje</option>
              <option value="4" ${b.blockRigor === 4 ? 'selected' : ''}>4 Firme · Bloqueio sagrado no horário</option>
            </select>

            <div class="flex-row">
              <div style="flex: 1;">
                <span style="font-size: 12px; font-weight: 700;">Início do foco:</span>
                <input type="time" id="briefing-time-start" class="pixel-input" value="${b.windowStart}">
              </div>
              <div style="flex: 1;">
                <span style="font-size: 12px; font-weight: 700;">Fim do foco:</span>
                <input type="time" id="briefing-time-end" class="pixel-input" value="${b.windowEnd}">
              </div>
            </div>
          </div>
        </div>

        <div class="flex-row space-between" style="margin-top: 6px;">
          <button class="pixel-btn btn-secondary" onclick="window.app.setBriefingStep(3)">← Voltar</button>
          <button class="pixel-btn btn-green" onclick="window.app.setBriefingStep(5)">Revisar Plano Consolidado →</button>
        </div>
      `;
    } else if (step === 5) {
      stepHtml = `
        <div class="briefing-cat-speech">
          <span style="font-size: 28px;">✨</span>
          <div>
            <strong>Etapa 5 de 5 · Plano Cat Line Consolidado</strong><br>
            <span>Seu plano está pronto. Confira e aplique no aplicativo:</span>
          </div>
        </div>

        <div class="pixel-card">
          <h4>📋 Resumo do seu Mês no Cat Line</h4>

          <div class="briefing-summary-box" style="margin-top: 8px;">
            <div class="briefing-summary-item">
              <span class="briefing-summary-label">RITMO DIÁRIO</span>
              <span class="briefing-summary-val">Acordar às ${b.wakeTime} · Dormir às ${b.sleepTime} · Foco: ${b.focusPeriod}</span>
            </div>

            <div class="briefing-summary-item">
              <span class="briefing-summary-label">HÁBITOS FIRMADOS · ${b.selectedHabits.length}</span>
              <span class="briefing-summary-val">${b.selectedHabits.join(', ') || 'Nenhum selecionado'}</span>
            </div>

            <div class="briefing-summary-item">
              <span class="briefing-summary-label">GRANDE META COM NOVELO</span>
              <span class="briefing-summary-val">
                ${b.goalHorizon} · ${b.goalTitle} · ${b.goalDays} dias de prazo<br>
                Novelo ${goalPalette.name} na patinha · Mimo: ${b.goalReward}
              </span>
            </div>

            <div class="briefing-summary-item">
              <span class="briefing-summary-label">FOCO & REDES SOCIAIS</span>
              <span class="briefing-summary-val">
                ${b.selectedApps.join(', ') || 'Nenhuma'} · ${rigorObj.name}<br>
                Janela: ${b.windowStart} às ${b.windowEnd}
              </span>
            </div>
          </div>
        </div>

        <div class="flex-row space-between" style="margin-top: 6px;">
          <button class="pixel-btn btn-secondary" onclick="window.app.setBriefingStep(4)">← Voltar e Ajustar</button>
          <button class="pixel-btn btn-green" style="font-size: 15px; padding: 10px 16px;" onclick="window.app.applyBriefingPlan()">
            🎉 Aplicar Plano no Cat Line
          </button>
        </div>
      `;
    }

    this.contentEl.innerHTML = `
      <div class="briefing-wizard-container">
        <!-- Topo do Wizard com Dots de Progresso -->
        <div class="briefing-step-header">
          <div class="flex-row">
            <span style="font-size: 20px;">📝</span>
            <strong style="font-size: 16px;">Briefing Cat Line · Rotina & Metas</strong>
          </div>
          <div class="briefing-progress-dots">
            ${[1, 2, 3, 4, 5].map(i => `
              <div class="briefing-dot ${i === step ? 'active' : (i < step ? 'done' : '')}"></div>
            `).join('')}
          </div>
        </div>

        ${stepHtml}
      </div>
    `;
  }


  // =========================================================
  // NOVOS MÉTODOS DE UX, DESIGN, SWIPE, BOTTOM SHEET E LEMBRETES
  // =========================================================

  buildUnifiedTimelineHtml() {
    const items = [];
    if (!state.flags || state.flags.COMPROMISSOS !== false) {
      state.occurrences.forEach(o => {
        const normSt = (typeof CommitmentStateMachineModule !== 'undefined' && CommitmentStateMachineModule.normalizeState)
          ? CommitmentStateMachineModule.normalizeState(o.state)
          : (String(o.state || 'pending').toLowerCase() === 'feito' ? 'done' : String(o.state || 'pending').toLowerCase());
        items.push({
          kind: 'occurrence',
          id: o.id,
          title: o.title,
          time: o.time || '12:00',
          done: normSt === 'done' || o.state === 'FEITO',
          reward: o.reward || 10,
          subtitle: `Compromisso ${o.effort || 'M'} · ${o.recurrence || 'Todos os dias'}`,
          raw: o
        });
      });
    }
    state.habits.forEach(h => {
      items.push({
        kind: 'habit',
        id: h.id,
        title: h.title,
        time: h.window || '21:00',
        done: Boolean(h.completed),
        reward: 8,
        subtitle: `🔥 ${h.streak}d seguidos · Hábito ${h.frequency || 'Diário'}`,
        raw: h
      });
    });

    if (items.length === 0) {
      return `
        <div class="empty-state-cat-box">
          <div style="font-size: 36px;">🐱🧶</div>
          <strong>Nada por aqui ainda!</strong>
          <span style="font-size: 13px; color: ${PALETTE.grayDark};">Que tal enrolar o primeiro novelo do dia tocando no botão verde <strong>＋</strong>?</span>
          <button class="pixel-btn btn-sm btn-green" style="margin-top: 6px;" onclick="window.app.openQuickCreateSheet('occurrence')">＋ Criar Primeiro Item</button>
        </div>
      `;
    }

    // Ordena: pendentes primeiro por horário, depois concluídos por horário
    items.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return a.time.localeCompare(b.time);
    });

    return items.map(item => {
      if (item.kind === 'occurrence' && state.editingOccurrenceId === item.id) {
        const o = item.raw;
        const rec = o.recurrence || 'Todos os dias';
        return `
          <div class="inline-edit-box">
            <strong>✏️ Editar Compromisso:</strong>
            <input type="text" id="edit-occ-title-${o.id}" class="pixel-input" value="${o.title}">
            <div class="flex-row">
              <input type="time" id="edit-occ-time-${o.id}" class="pixel-input" value="${o.time}">
              <select id="edit-occ-effort-${o.id}" class="pixel-input">
                <option value="P" ${o.effort === 'P' ? 'selected' : ''}>P (+5🐟)</option>
                <option value="M" ${o.effort === 'M' ? 'selected' : ''}>M (+10🐟)</option>
                <option value="G" ${o.effort === 'G' ? 'selected' : ''}>G (+20🐟)</option>
              </select>
            </div>
            <div class="flex-row">
              <select id="edit-occ-recurrence-${o.id}" class="pixel-input">
                <option value="Todos os dias" ${rec === 'Todos os dias' ? 'selected' : ''}>🔄 Todos os dias</option>
                <option value="Dias úteis" ${rec === 'Dias úteis' ? 'selected' : ''}>💼 Dias úteis</option>
                <option value="Finais de semana" ${rec === 'Finais de semana' ? 'selected' : ''}>🏖️ Finais de semana</option>
                <option value="3x por semana" ${rec === '3x por semana' ? 'selected' : ''}>✨ 3x por semana</option>
                <option value="Apenas hoje" ${rec === 'Apenas hoje' ? 'selected' : ''}>📌 Apenas hoje</option>
              </select>
              <input type="date" id="edit-occ-date-${o.id}" class="pixel-input" value="${o.date || state.dayKey}" style="flex: 1; min-width: 120px;">
            </div>
            <div class="flex-row space-between" style="margin-top: 4px;">
              <button class="pixel-btn btn-sm btn-green" onclick="window.app.saveEditOccurrence('${o.id}')">Salvar</button>
              <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.cancelEditOccurrence()">Cancelar</button>
            </div>
          </div>
        `;
      }

      if (item.kind === 'habit' && state.editingHabitId === item.id) {
        const h = item.raw;
        return `
          <div class="inline-edit-box">
            <strong>✏️ Editar Hábito:</strong>
            <input type="text" id="edit-habit-title-${h.id}" class="pixel-input" value="${h.title}">
            <div class="flex-row">
              <input type="time" id="edit-habit-window-${h.id}" class="pixel-input" value="${h.window}">
              <select id="edit-habit-freq-${h.id}" class="pixel-input">
                <option value="Todos os dias" ${h.frequency === 'Todos os dias' ? 'selected' : ''}>Todos os dias</option>
                <option value="Dias úteis" ${h.frequency === 'Dias úteis' ? 'selected' : ''}>Dias úteis</option>
                <option value="3x por semana" ${h.frequency === '3x por semana' ? 'selected' : ''}>3x por semana</option>
                <option value="Finais de semana" ${h.frequency === 'Finais de semana' ? 'selected' : ''}>Finais de semana</option>
              </select>
            </div>
            <div class="flex-row space-between" style="margin-top: 4px;">
              <button class="pixel-btn btn-sm btn-green" onclick="window.app.saveEditHabit('${h.id}')">Salvar</button>
              <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.cancelEditHabit()">Cancelar</button>
            </div>
          </div>
        `;
      }

      const isActiveExec = state.activeExecutionId === item.id;
      const toggleFn = item.kind === 'habit'
        ? (item.done ? `window.app.uncompleteHabit('${item.id}')` : `window.app.completeHabit('${item.id}')`)
        : (item.done ? `window.app.unmarkDone('${item.id}')` : `window.app.markDone('${item.id}')`);
      const editFn = item.kind === 'habit'
        ? `window.app.startEditHabit('${item.id}')`
        : `window.app.startEditOccurrence('${item.id}')`;
      const delFn = item.kind === 'habit'
        ? `window.app.deleteHabit('${item.id}')`
        : `window.app.deleteOccurrence('${item.id}')`;

      let stateBadge = '';
      let isWithinUndoWindow = false;
      let undoRemMin = 10;
      let linkedStepText = '';

      if (item.kind === 'occurrence') {
        const o = item.raw;
        const normSt = (typeof CommitmentStateMachineModule !== 'undefined' && CommitmentStateMachineModule.normalizeState)
          ? CommitmentStateMachineModule.normalizeState(o.state)
          : (String(o.state || 'pending').toLowerCase() === 'feito' ? 'done' : String(o.state || 'pending').toLowerCase());

        const stateLabels = {
          pending: 'Pendente',
          done: 'Cumprido',
          missed: 'Não cumprido',
          rescheduled: 'Remarcado',
          unmarked: 'Sem marcação'
        };
        const stLabel = stateLabels[normSt] || 'Pendente';
        const maxRuns = o.maxRuns || (o.recurrence === 'Pontual · 2 vezes' ? 2 : (o.recurrence === 'Pontual · 1 vez' ? 1 : 0));
        const runBadge = maxRuns > 0
          ? ` <span class="state-pill" style="background:#fef3c7;color:#92400e;">⚡ ${o.completedRuns || 0}/${maxRuns}</span>`
          : '';
        const conflictBadge = this.hasTimeConflict(o)
          ? ` <span class="state-pill" style="background:#fee2e2;color:#b91c1c;">⚠️ Conflito</span>`
          : '';
        const secondRunBtn = (maxRuns === 2 && (o.completedRuns || 0) === 1 && item.done)
          ? ` <button class="pixel-btn btn-sm btn-gold" onclick="event.stopPropagation(); window.app.reopenSecondRun('${o.id}')">Fazer 2ª vez</button>`
          : '';
        const noteLine = o.notes ? `<div style="font-size:12px;color:${PALETTE.grayDark};margin-top:2px;">📝 ${o.notes}</div>` : '';
        stateBadge = `<span class="state-pill state-pill-${normSt}">${stLabel}</span>${runBadge}${conflictBadge}${secondRunBtn}${noteLine}`;

        if (normSt === 'done') {
          const chk = (state.checkIns || []).filter(c => c.commitmentId === o.id).slice(-1)[0];
          if (chk && chk.actualAt) {
            const chkEpoch = typeof chk.actualAt === 'number' ? chk.actualAt : Date.parse(chk.actualAt);
            const elapsed = Math.round((Clock.now() - chkEpoch) / 60000);
            if (elapsed >= 0 && elapsed <= 10) {
              isWithinUndoWindow = true;
              undoRemMin = Math.max(1, 10 - elapsed);
            }
          }
        }

        if (o.stepId && o.goalId) {
          const g = (state.goals || []).find(x => x.id === o.goalId);
          const s = g && g.steps ? g.steps.find(x => x.id === o.stepId) : null;
          if (s) {
            linkedStepText = `<div style="font-size: 11px; color: ${PALETTE.cozyPurple}; font-weight: 700; margin-top: 3px;">🧶 Meta: ${g.title} · Passo: ${s.title}</div>`;
          }
        }
      }

      let actionFooterHtml = '';
      if (item.kind === 'habit') {
        actionFooterHtml = `
          ${item.done
            ? `<button class="pixel-btn btn-sm btn-secondary" style="flex: 1; min-height: 48px;" onclick="${toggleFn}">↩ Reabrir</button>`
            : `
              <button class="pixel-btn btn-sm btn-green" style="flex: 1.2; min-height: 48px;" onclick="${toggleFn}">✓ Feito</button>
              ${isActiveExec
                ? `<button class="pixel-btn btn-sm btn-purple" style="flex: 1.2; min-height: 48px;" onclick="window.app.stopActiveExecution()">⏸️ Pausar ⚡</button>`
                : `<button class="pixel-btn btn-sm" style="flex: 1.2; min-height: 48px;" onclick="window.app.startActiveExecution('${item.id}', '${item.kind}')">▶️ Fazer Agora</button>`
              }
            `
          }
          <button class="pixel-btn btn-sm btn-icon" style="min-width: 48px; min-height: 48px;" onclick="${editFn}" title="Editar">✏️</button>
          <button class="pixel-btn btn-sm btn-danger btn-icon" style="min-width: 48px; min-height: 48px;" onclick="${delFn}" title="Excluir">🗑️</button>
        `;
      } else {
        const o = item.raw;
        const normSt = (typeof CommitmentStateMachineModule !== 'undefined' && CommitmentStateMachineModule.normalizeState)
          ? CommitmentStateMachineModule.normalizeState(o.state)
          : (String(o.state || 'pending').toLowerCase() === 'feito' ? 'done' : String(o.state || 'pending').toLowerCase());

        if (normSt === 'done') {
          actionFooterHtml = `
            ${isWithinUndoWindow
              ? `<button class="pixel-btn btn-sm btn-secondary" style="flex: 1.4; min-height: 48px;" onclick="window.app.undoCommitmentCheckIn('${o.id}')">↩ Desfazer · ${undoRemMin}m restantes</button>`
              : `<button class="pixel-btn btn-sm btn-secondary" style="flex: 1; min-height: 48px;" onclick="${toggleFn}">↩ Reabrir</button>`
            }
            <button class="pixel-btn btn-sm btn-icon" style="min-width: 48px; min-height: 48px;" onclick="${editFn}" title="Editar">✏️</button>
            <button class="pixel-btn btn-sm btn-danger btn-icon" style="min-width: 48px; min-height: 48px;" onclick="${delFn}" title="Excluir">🗑️</button>
          `;
        } else if (normSt === 'missed') {
          actionFooterHtml = `
            <button class="pixel-btn btn-sm btn-gold" style="flex: 1; min-height: 48px;" onclick="window.app.openRescheduleDialog('${o.id}')">🗓️ Remarcar</button>
            <button class="pixel-btn btn-sm btn-icon" style="min-width: 48px; min-height: 48px;" onclick="${editFn}" title="Editar">✏️</button>
            <button class="pixel-btn btn-sm btn-danger btn-icon" style="min-width: 48px; min-height: 48px;" onclick="${delFn}" title="Excluir">🗑️</button>
          `;
        } else if (normSt === 'rescheduled') {
          actionFooterHtml = `
            <span style="font-size: 12px; color: ${PALETTE.grayDark}; flex: 1; padding: 4px;">Remarcado para outro horário</span>
            <button class="pixel-btn btn-sm btn-danger btn-icon" style="min-width: 48px; min-height: 48px;" onclick="${delFn}" title="Excluir">🗑️</button>
          `;
        } else if (normSt === 'unmarked') {
          actionFooterHtml = `
            <button class="pixel-btn btn-sm btn-purple" style="flex: 1; min-height: 48px;" onclick="window.app.openRetroCheckInDialog('${o.id}')">🕒 Check-in retroativo</button>
            <button class="pixel-btn btn-sm btn-secondary" style="flex: 1; min-height: 48px;" onclick="window.app.markCommitmentMissed('${o.id}')">✕ Não cumpri</button>
            <button class="pixel-btn btn-sm btn-gold" style="flex: 1; min-height: 48px;" onclick="window.app.openRescheduleDialog('${o.id}')">🗓️ Remarcar</button>
          `;
        } else {
          actionFooterHtml = `
            <button class="pixel-btn btn-sm btn-green" style="flex: 1.2; min-height: 48px;" onclick="window.app.checkInLive('${o.id}')">✓ Check-in agora</button>
            <button class="pixel-btn btn-sm btn-purple" style="flex: 1; min-height: 48px;" onclick="window.app.openRetroCheckInDialog('${o.id}')">🕒 Retroativo</button>
            <button class="pixel-btn btn-sm btn-secondary" style="flex: 0.9; min-height: 48px;" onclick="window.app.markCommitmentMissed('${o.id}')">✕ Não cumpri</button>
            <button class="pixel-btn btn-sm btn-gold" style="flex: 0.9; min-height: 48px;" onclick="window.app.openRescheduleDialog('${o.id}')">🗓️ Remarcar</button>
            <button class="pixel-btn btn-sm btn-icon" style="min-width: 48px; min-height: 48px;" onclick="${editFn}" title="Editar">✏️</button>
            <button class="pixel-btn btn-sm btn-danger btn-icon" style="min-width: 48px; min-height: 48px;" onclick="${delFn}" title="Excluir">🗑️</button>
          `;
        }
      }

      return `
        <div class="timeline-swipe-wrapper" data-kind="${item.kind}" data-id="${item.id}" data-done="${item.done}">
          <div class="timeline-swipe-bg-left">✓ Concluir</div>
          <div class="timeline-swipe-bg-right">🗑️ Excluir</div>
          <div class="timeline-card ${item.done ? 'done-card' : ''} ${isActiveExec ? 'active-exec-card' : ''}" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; align-items: flex-start; gap: 10px; width: 100%;">
              <button class="timeline-check-circle ${item.done ? 'checked' : ''}" onclick="${toggleFn}" title="${item.done ? 'Reabrir' : 'Marcar como concluído'}">
                ${item.done ? '✓' : ''}
              </button>
              <div class="timeline-body" style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
                  <div style="display: flex; flex-direction: column; gap: 3px;">
                    <div class="timeline-title">${item.title}</div>
                    ${stateBadge}
                  </div>
                  <span class="timeline-time-badge">⏰ ${item.time}</span>
                </div>
                ${linkedStepText}
                <div class="timeline-meta" style="margin-top: 4px;">
                  <span>${item.subtitle}</span>
                  <span style="color: ${PALETTE.orange}; font-weight: 700;">+${item.reward}🐟</span>
                </div>
              </div>
            </div>
            <div class="card-action-footer">
              ${actionFooterHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  attachSwipeListenersToTimeline() {
    if (typeof document.querySelectorAll !== 'function') return;
    const wrappers = document.querySelectorAll('.timeline-swipe-wrapper');
    wrappers.forEach(wrap => {
      const card = wrap.querySelector('.timeline-card');
      if (!card) return;
      let startX = 0;
      let startY = 0;
      let currentX = 0;
      let isDragging = false;

      wrap.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = 0;
        isDragging = true;
        card.style.transition = 'none';
      }, { passive: true });

      wrap.addEventListener('touchmove', (e) => {
        if (!isDragging || !e.touches || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(currentX) < 12) {
          isDragging = false;
          card.style.transform = '';
          return;
        }
        currentX = Math.max(-120, Math.min(120, dx));
        if (Math.abs(currentX) > 10) {
          card.style.transform = `translateX(${currentX}px)`;
        }
      }, { passive: true });

      const finishSwipe = () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.transition = 'transform 0.18s ease-out';
        const kind = wrap.getAttribute('data-kind');
        const id = wrap.getAttribute('data-id');
        const isDone = wrap.getAttribute('data-done') === 'true';

        if (currentX > 68) {
          card.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (kind === 'habit') {
              if (isDone) this.uncompleteHabit(id); else this.completeHabit(id);
            } else {
              if (isDone) this.unmarkDone(id); else this.markDone(id);
            }
          }, 140);
        } else if (currentX < -68) {
          card.style.transform = 'translateX(-100%)';
          setTimeout(() => {
            if (kind === 'habit') this.deleteHabit(id);
            else this.deleteOccurrence(id);
          }, 140);
        } else {
          card.style.transform = 'translateX(0)';
        }
      };

      wrap.addEventListener('touchend', finishSwipe);
      wrap.addEventListener('touchcancel', finishSwipe);
    });
  }

  // Aba consolidada ROTINA (une Agenda + Hábitos com sub-navegação rápida)
  setRotinaSubTab(sub) {
    state.rotinaSubTab = sub;
    state.activeTab = 'rotina';
    audio.playBlip();
    this.renderActiveTab();
  }

  renderTabRotina() {
    const sub = state.rotinaSubTab || 'agenda';
    if (sub === 'habitos') {
      this.renderTabHabitos();
    } else {
      this.renderTabAgenda();
    }
    const subNavHtml = `
      <div class="subnav-pills-bar" style="margin-bottom: 10px;">
        <button class="subnav-pill-btn ${sub === 'agenda' ? 'active' : ''}" onclick="window.app.setRotinaSubTab('agenda')">
          📅 Compromissos (${state.occurrences.length})
        </button>
        <button class="subnav-pill-btn ${sub === 'habitos' ? 'active' : ''}" onclick="window.app.setRotinaSubTab('habitos')">
          🔄 Hábitos & Sequências (${state.habits.length})
        </button>
      </div>
    `;
    this.contentEl.insertAdjacentHTML('afterbegin', subNavHtml);
  }

  // Aba consolidada MAIS (une O Fio/Insights + Chat + Foco + Lembretes & Backup)
  setMaisSubTab(sub) {
    state.maisSubTab = sub;
    state.activeTab = 'mais';
    audio.playBlip();
    this.renderActiveTab();
  }

  renderTabMais() {
    const sub = state.maisSubTab || 'insights';
    if (sub === 'conversa') {
      this.renderTabConversa();
    } else if (sub === 'foco') {
      this.renderTabFoco();
    } else {
      this.renderTabInsights();
      // Adiciona card de Lembretes Reais e Aparência no topo do O Fio/Mais
      const notifCardHtml = `
        <div class="pixel-card cream" style="border-left: 6px solid ${PALETTE.cozyPurple}; margin-bottom: 10px;">
          <div class="flex-row space-between" style="align-items: center;">
            <div>
              <h4 style="margin-bottom: 2px;">🔔 Lembretes Reais & Acessibilidade</h4>
              <span style="font-size: 12px; color: ${PALETTE.grayDark};">A gatinha avisa no celular quando chegar o horário do compromisso</span>
            </div>
            <button class="pixel-btn btn-sm ${state.notificationsEnabled ? 'btn-green' : 'btn-purple'}" onclick="window.app.requestRealReminders()">
              ${state.notificationsEnabled ? '🔔 Ativo ✓' : 'Ativar Avisos 🔔'}
            </button>
          </div>
          <div class="flex-row" style="margin-top: 8px; gap: 6px; flex-wrap: wrap;">
            <button class="pixel-btn btn-sm ${state.darkMode ? 'btn-gold' : 'btn-secondary'}" onclick="window.app.toggleDarkMode()">
              ${state.darkMode ? '☀️ Tema Claro' : '🌙 Modo Noturno'}
            </button>
            <button class="pixel-btn btn-sm ${state.largeFont ? 'btn-gold' : 'btn-secondary'}" onclick="window.app.toggleLargeFont()">
              ${state.largeFont ? 'A- Fonte Normal' : 'A+ Fonte Ampliada'}
            </button>
            <button class="pixel-btn btn-sm btn-pink" onclick="window.app.sendTestNotification()">
              🐾 Testar Lembrete Agora
            </button>
          </div>
        </div>
      `;
      this.contentEl.insertAdjacentHTML('afterbegin', notifCardHtml);
    }

    const subNavHtml = `
      <div class="subnav-pills-bar" style="margin-bottom: 10px;">
        <button class="subnav-pill-btn ${sub === 'insights' ? 'active' : ''}" onclick="window.app.setMaisSubTab('insights')">
          📈 O Fio & Backup
        </button>
        <button class="subnav-pill-btn ${sub === 'conversa' ? 'active' : ''}" onclick="window.app.setMaisSubTab('conversa')">
          💬 Chat Gatinha
        </button>
        <button class="subnav-pill-btn ${sub === 'foco' ? 'active' : ''}" onclick="window.app.setMaisSubTab('foco')">
          🛡️ Foco & Bloqueio
        </button>
      </div>
    `;
    this.contentEl.insertAdjacentHTML('afterbegin', subNavHtml);
  }

  // Botão Flutuante (+) e Bottom Sheet de Criação em 2 Toques
  openQuickCreateSheet(defaultType = null) {
    if (defaultType) {
      state.quickCreateType = defaultType;
    } else if (state.activeTab === 'metas') {
      state.quickCreateType = 'goal';
    } else if (state.activeTab === 'loja') {
      state.quickCreateType = 'reward';
    } else if (state.activeTab === 'rotina' && state.rotinaSubTab === 'habitos') {
      state.quickCreateType = 'habit';
    } else {
      state.quickCreateType = 'occurrence';
    }
    audio.playBlip();
    const backdrop = document.getElementById('quick-create-backdrop');
    if (backdrop) {
      backdrop.style.display = 'flex';
      this.renderQuickCreateSheetContent();
    }
  }

  closeQuickCreateSheet() {
    const backdrop = document.getElementById('quick-create-backdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  setQuickCreateType(type) {
    state.quickCreateType = type;
    audio.playBlip();
    this.renderQuickCreateSheetContent();
  }

  onQuickCreateGoalChange(goalId) {
    state.quickCreateSelectedGoalId = goalId || null;
    this.renderQuickCreateSheetContent();
  }

  renderQuickCreateSheetContent() {
    const box = document.getElementById('quick-create-box');
    if (!box) return;
    const t = state.quickCreateType || 'occurrence';

    let formHtml = '';
    if (t === 'occurrence' || t === 'once') {
      const selG = (state.goals || []).find(g => g.id === state.quickCreateSelectedGoalId);
      const availableSteps = selG && selG.steps ? selG.steps.filter(s => !s.archived && !s.doneAt) : [];
      const isOnce = t === 'once';

      formHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="qc-occ-title" class="pixel-input" placeholder="${isOnce ? 'Atividade avulsa (ex: ir ao banco, pagar boleto)' : 'O que vamos fazer hoje?'}" autofocus>
          <div class="flex-row">
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">⏰ Horário:</label>
              <input type="time" id="qc-occ-time" class="pixel-input" value="19:00">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">💪 Esforço:</label>
              <select id="qc-occ-effort" class="pixel-input">
                <option value="P">Leve P · 5 peixinhos</option>
                <option value="M" selected>Médio M · 10 peixinhos</option>
                <option value="G">Grande G · 20 peixinhos</option>
              </select>
            </div>
          </div>
          <div class="flex-row">
            <select id="qc-occ-recurrence" class="pixel-input" style="flex: 1;">
              ${isOnce ? `
                <option value="Pontual · 1 vez" selected>⚡ Pontual · Só 1 vez</option>
                <option value="Pontual · 2 vezes">⚡ Pontual · Só 2 vezes</option>
                <option value="Apenas hoje">📌 Apenas hoje</option>
              ` : `
                <option value="Todos os dias" selected>🔄 Todos os dias</option>
                <option value="Dias úteis">💼 Dias úteis</option>
                <option value="Finais de semana">🏖️ Finais de semana</option>
                <option value="3x por semana">✨ 3x por semana</option>
                <option value="Apenas hoje">📌 Apenas hoje</option>
                <option value="Pontual · 1 vez">⚡ Pontual · Só 1 vez</option>
                <option value="Pontual · 2 vezes">⚡ Pontual · Só 2 vezes</option>
              `}
            </select>
          </div>
          <input type="text" id="qc-occ-notes" class="pixel-input" placeholder="📝 Nota rápida (opcional)">
          <div class="flex-row">
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">🎯 Meta opcional:</label>
              <select id="qc-occ-goal" class="pixel-input" onchange="window.app.onQuickCreateGoalChange(this.value)">
                <option value="">Sem meta vinculada</option>
                ${(state.goals || []).map(g => `<option value="${g.id}" ${state.quickCreateSelectedGoalId === g.id ? 'selected' : ''}>${g.title}</option>`).join('')}
              </select>
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">🐾 Passo da meta:</label>
              <select id="qc-occ-step" class="pixel-input">
                <option value="">Sem passo vinculado</option>
                ${availableSteps.map(s => `<option value="${s.id}">${s.title}</option>`).join('')}
              </select>
            </div>
          </div>
          <button class="pixel-btn btn-green" style="width: 100%; min-height: 48px; padding: 12px; font-size: 15px;" onclick="window.app.submitQuickCreate()">
            ✓ Enrolar Compromisso na Rotina
          </button>
        </div>
      `;
    } else if (t === 'habit') {
      formHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="qc-hab-title" class="pixel-input" placeholder="Nome do hábito: Beber água, Ler livro" autofocus>
          <div class="flex-row">
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">⏰ Até as:</label>
              <input type="time" id="qc-hab-window" class="pixel-input" value="21:00">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">🔄 Frequência:</label>
              <select id="qc-hab-freq" class="pixel-input">
                <option value="Todos os dias">Todos os dias</option>
                <option value="Dias úteis">Dias úteis</option>
                <option value="3x por semana">3x por semana</option>
                <option value="Finais de semana">Finais de semana</option>
              </select>
            </div>
          </div>
          <button class="pixel-btn btn-green" style="width: 100%; min-height: 48px; padding: 12px; font-size: 15px;" onclick="window.app.submitQuickCreate()">
            ✓ Criar Hábito · 8 peixinhos por dia
          </button>
        </div>
      `;
    } else if (t === 'goal') {
      formHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="qc-goal-title" class="pixel-input" placeholder="Qual é a sua grande meta?" autofocus>
          <div class="flex-row">
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">⏳ Prazo em dias:</label>
              <input type="number" id="qc-goal-days" class="pixel-input" value="7" min="1" max="365">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">🧶 Cor do Novelo:</label>
              <select id="qc-goal-color" class="pixel-input">
                ${YARN_COLORS.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <input type="text" id="qc-goal-reward" class="pixel-input" placeholder="Mimo ao conquistar: Jantar especial">
          <button class="pixel-btn btn-green" style="width: 100%; min-height: 48px; padding: 12px; font-size: 15px;" onclick="window.app.submitQuickCreate()">
            ✓ Criar Meta & Dar Novelo à Gatinha
          </button>
        </div>
      `;
    } else if (t === 'reward') {
      formHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="qc-rw-title" class="pixel-input" placeholder="Qual mimo da vida real: Café especial, Cinema" autofocus>
          <div class="flex-row">
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">🐟 Custo em Peixinhos:</label>
              <input type="number" id="qc-rw-cost" class="pixel-input" value="35" min="5" step="5">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">🎁 Emoji:</label>
              <input type="text" id="qc-rw-icon" class="pixel-input" value="☕" style="text-align:center;">
            </div>
          </div>
          <button class="pixel-btn btn-gold" style="width: 100%; min-height: 48px; padding: 12px; font-size: 15px;" onclick="window.app.submitQuickCreate()">
            ✓ Salvar Mimo da Vida Real
          </button>
        </div>
      `;
    }

    box.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="flex-row space-between" style="margin-bottom: 10px;">
        <strong style="font-size: 17px;">✨ Criação Rápida · 2 Toques</strong>
        <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.closeQuickCreateSheet()">✕</button>
      </div>
      <div class="subnav-pills-bar" style="margin-bottom: 12px;">
        <button class="subnav-pill-btn ${t === 'occurrence' ? 'active' : ''}" onclick="window.app.setQuickCreateType('occurrence')">📅 Compromisso</button>
        <button class="subnav-pill-btn ${t === 'once' ? 'active' : ''}" onclick="window.app.setQuickCreateType('once')">⚡ Avulsa 1x/2x</button>
        <button class="subnav-pill-btn ${t === 'habit' ? 'active' : ''}" onclick="window.app.setQuickCreateType('habit')">🔄 Hábito</button>
        <button class="subnav-pill-btn ${t === 'goal' ? 'active' : ''}" onclick="window.app.setQuickCreateType('goal')">🎯 Meta</button>
        <button class="subnav-pill-btn ${t === 'reward' ? 'active' : ''}" onclick="window.app.setQuickCreateType('reward')">🎁 Mimo</button>
      </div>
      ${formHtml}
    `;
  }

  submitQuickCreate() {
    const t = state.quickCreateType || 'occurrence';
    if (t === 'occurrence' || t === 'once') {
      const title = (document.getElementById('qc-occ-title')?.value || '').trim();
      if (!title) return alert('Digite o título do compromisso!');
      const time = document.getElementById('qc-occ-time')?.value || '19:00';
      const effort = document.getElementById('qc-occ-effort')?.value || 'M';
      const recurrence = document.getElementById('qc-occ-recurrence')?.value || (t === 'once' ? 'Pontual · 1 vez' : 'Todos os dias');
      const notes = (document.getElementById('qc-occ-notes')?.value || '').trim();
      const goalId = document.getElementById('qc-occ-goal')?.value || null;
      const stepId = document.getElementById('qc-occ-step')?.value || null;
      const reward = effort === 'G' ? 20 : (effort === 'M' ? 10 : 5);
      const estMin = effort === 'G' ? 60 : (effort === 'M' ? 30 : 15);
      const maxRuns = recurrence === 'Pontual · 2 vezes' ? 2 : (recurrence === 'Pontual · 1 vez' ? 1 : 0);
      state.occurrences.push({
        id: `occ-${Clock.now()}`,
        title,
        time,
        effort,
        reward,
        recurrence,
        maxRuns,
        completedRuns: 0,
        notes,
        date: state.dayKey,
        plannedStart: `${state.dayKey}T${time}:00`,
        plannedZone: 'America/Sao_Paulo',
        plannedMinutes: estMin,
        goalId: goalId || null,
        stepId: stepId || null,
        state: 'pending',
        delayMin: 0,
        createdAt: Clock.isoString()
      });
      state.quickCreateSelectedGoalId = null;
      this.setCatSpeech(`Compromisso "${title}" às ${time} adicionado.`);
    } else if (t === 'habit') {
      const title = (document.getElementById('qc-hab-title')?.value || '').trim();
      if (!title) return alert('Digite o nome do hábito!');
      const windowTime = document.getElementById('qc-hab-window')?.value || '21:00';
      const frequency = document.getElementById('qc-hab-freq')?.value || 'Todos os dias';
      state.habits.push({
        id: `hab-${Clock.now()}`,
        title,
        window: windowTime,
        frequency,
        streak: 0,
        bestStreak: 0,
        totalCheckIns: 0,
        completed: false
      });
      this.setCatSpeech(`Hábito "${title}" criado.`);
    } else if (t === 'goal') {
      const title = (document.getElementById('qc-goal-title')?.value || '').trim();
      if (!title) return alert('Digite o título da meta!');
      const days = Math.max(1, parseInt(document.getElementById('qc-goal-days')?.value || '7', 10));
      const colorId = document.getElementById('qc-goal-color')?.value || 'pink';
      const reward = (document.getElementById('qc-goal-reward')?.value || '').trim() || 'Mimo Especial';
      const newId = `g-${Clock.now()}`;
      state.goals.unshift({
        id: newId,
        horizon: days <= 7 ? 'SEMANA' : (days <= 31 ? 'MES' : 'TRIMESTRE'),
        title,
        yarnColorId: colorId,
        totalDays: days,
        totalSeconds: days * 86400,
        remainingSeconds: days * 86400,
        progress: 0,
        reward,
        rewardCost: 100
      });
      state.selectedGoalId = newId;
      this.setCatSpeech(`Meta "${title}" criada.`);
    } else if (t === 'reward') {
      const title = (document.getElementById('qc-rw-title')?.value || '').trim();
      if (!title) return alert('Digite o nome do mimo!');
      const cost = Math.max(5, parseInt(document.getElementById('qc-rw-cost')?.value || '35', 10));
      const icon = (document.getElementById('qc-rw-icon')?.value || '☕').trim();
      state.realLifeRewards.push({
        id: `rw-${Clock.now()}`,
        title,
        cost,
        icon,
        redeemedCount: 0,
        lastRedeemedAt: null
      });
      this.setCatSpeech(`Mimo "${title}" adicionado.`);
    }

    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.closeQuickCreateSheet();
    this.renderActiveTab();
    this.persist();
  }

  // Snackbar de Desfazer Exclusão
  showUndoSnackbar(message) {
    const bar = document.getElementById('undo-snackbar');
    const txt = document.getElementById('undo-snackbar-text');
    if (!bar || !txt) return;
    txt.textContent = message;
    bar.style.display = 'flex';
    if (this.undoTimerId) clearTimeout(this.undoTimerId);
    this.undoTimerId = setTimeout(() => {
      bar.style.display = 'none';
    }, 6000);
  }

  undoLastDelete() {
    if (!state.lastDeletedItem) return;
    const { type, item, index } = state.lastDeletedItem;
    if (type === 'occurrence') {
      state.occurrences.splice(Math.min(index, state.occurrences.length), 0, item);
    } else if (type === 'habit') {
      state.habits.splice(Math.min(index, state.habits.length), 0, item);
    }
    state.lastDeletedItem = null;
    const bar = document.getElementById('undo-snackbar');
    if (bar) bar.style.display = 'none';
    audio.playMeowGreeting();
    this.setCatSpeech(`"${item.title}" restaurado.`);
    this.renderActiveTab();
    this.persist();
  }

  // Microinteração: Chuva de Confetes Pixel Art 8-Bit + Vibração
  spawnPixelConfetti() {
    if (navigator.vibrate) {
      try { navigator.vibrate([30, 40, 60]); } catch (e) {}
    }
    const layer = document.getElementById('pixel-confetti-layer');
    if (!layer) return;
    const colors = ['#F4C852', '#F0949E', '#63AB3F', '#4B80CA', '#DF8F49', '#8A6BBE'];
    for (let i = 0; i < 24; i++) {
      const piece = document.createElement('div');
      piece.className = 'pixel-confetti-piece';
      piece.style.left = `${15 + Math.random() * 70}%`;
      piece.style.top = `${15 + Math.random() * 25}%`;
      piece.style.background = colors[i % colors.length];
      const tx = `${(Math.random() - 0.5) * 180}px`;
      const ty = `${90 + Math.random() * 180}px`;
      if (piece.style && typeof piece.style.setProperty === 'function') {
        piece.style.setProperty('--tx', tx);
        piece.style.setProperty('--ty', ty);
      }
      if (typeof layer.appendChild === 'function') layer.appendChild(piece);
      setTimeout(() => { if (piece && typeof piece.remove === 'function') piece.remove(); }, 1000);
    }
  }

  // Modo Escuro (Cozy Night Mode) & Fonte Ampliada (A+)
  applyAccessibilityClasses() {
    if (document.body && document.body.classList) {
      document.body.classList.toggle('dark-mode', Boolean(state.darkMode));
      document.body.classList.toggle('large-font', Boolean(state.largeFont));
    }
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) themeBtn.textContent = state.darkMode ? '☀️' : '🌙';
    const fontBtn = document.getElementById('btn-font-toggle');
    if (fontBtn) fontBtn.textContent = state.largeFont ? 'A-' : 'A+';
  }

  toggleDarkMode() {
    state.darkMode = !state.darkMode;
    this.applyAccessibilityClasses();
    audio.playBlip();
    this.setCatSpeech(state.darkMode ? 'Modo Noturno ativado. 🌙' : 'Modo Claro ativado. ☀️');
    this.persist();
  }

  toggleLargeFont() {
    state.largeFont = !state.largeFont;
    this.applyAccessibilityClasses();
    audio.playBlip();
    this.setCatSpeech(state.largeFont ? 'Letras ampliadas ativadas. 🔍' : 'Tamanho de letra padrão restaurado.');
    this.persist();
  }

  // Lembretes Reais no Horário dos Compromissos
  async requestRealReminders() {
    if (!('Notification' in window)) {
      alert('Este navegador/aparelho usa lembretes sonoros internos do Cat Line! Mantenha o som ativo.');
      state.notificationsEnabled = true;
      this.renderActiveTab();
      this.persist();
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      state.notificationsEnabled = true;
      audio.playMeowCelebrate();
      this.sendTestNotification();
    } else {
      state.notificationsEnabled = !state.notificationsEnabled;
    }
    this.renderActiveTab();
    this.persist();
  }

  sendTestNotification() {
    audio.playMeowGreeting();
    const msg = 'Lembrete: confira suas metas de hoje! 🐾';
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🐱 Cat Line · Lembrete da Gatinha', {
          body: msg,
          icon: 'icon-192.png'
        });
      } catch (e) {}
    }
    this.setCatSpeech(msg);
  }

  startReminderCheckerLoop() {
    setInterval(() => {
      if (!state.notificationsEnabled || state.cat.isRestMode) return;
      const now = Clock.newDate();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      state.occurrences.forEach(o => {
        if (o.state === 'PENDENTE' && o.time === hhmm) {
          const key = `${state.dayKey}-${o.id}-${hhmm}`;
          if (!state.notifiedTodayKeys.includes(key)) {
            state.notifiedTodayKeys.push(key);
            audio.playMeowCelebrate();
            const text = `⏰ Hora de "${o.title}" (${o.time})! +${o.reward}🐟`;
            this.setCatSpeech(text);
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('🐱 Cat Line · Hora do Compromisso!', { body: text, icon: 'icon-192.png' });
              } catch (e) {}
            }
          }
        }
      });
    }, 20000);
  }

  startAnticsRotation() {
    // Banner superior removido
  }

  syncNativeReminders() {
    if (!window.AndroidBlocker || typeof window.AndroidBlocker.scheduleReminder !== 'function') return;
    if (!state.notificationsEnabled || state.cat.isRestMode) return;

    const nowMs = Clock.now();

    state.occurrences.forEach(o => {
      const st = String(o.state || 'pending').toLowerCase();
      if (st !== 'pendente' && st !== 'pending') {
        try { window.AndroidBlocker.cancelReminder(o.id); } catch (e) {}
        return;
      }
      const parts = (o.time || '19:00').split(':').map(Number);
      if (isNaN(parts[0])) return;
      const d = Clock.newDate();
      d.setHours(parts[0], parts[1] || 0, 0, 0);
      const goal = o.goalId ? (state.goals || []).find(g => g.id === o.goalId) : null;
      this.scheduleNovelo(o.id, o.title, o.time, d.getTime(), (goal && goal.yarnColorId) || 'pink', nowMs, false);    });

    // Prazos das metas (novelo de cada meta com a cor dela)
    (state.goals || []).forEach(g => {
      const id = 'goal-' + g.id;
      if (g.archived || (g.progress >= 1) || !(g.remainingSeconds > 0)) {
        try { window.AndroidBlocker.cancelReminder(id); } catch (e) {}
        return;
      }
      const deadline = nowMs + g.remainingSeconds * 1000;
      const dd = Clock.newDate(deadline);
      const hhmm = String(dd.getHours()).padStart(2, '0') + ':' + String(dd.getMinutes()).padStart(2, '0');
      this.scheduleNovelo(id, g.title, hhmm, deadline, g.yarnColorId || g.yarnColor || 'pink', nowMs, true);
    });
  }

  // Agenda os avisos escalonados do novelo: 1 dia antes (so metas), 1h antes, na hora e ao vencer.
  scheduleNovelo(id, title, hhmm, atMs, color, nowMs, withDayBefore) {
    const nb = window.AndroidBlocker;
    if (!nb) return;
    const H = 3600000;
    const plan = [];
    if (withDayBefore) plan.push(['PRE_DAY', atMs - 24 * H]);
    plan.push(['PRE_HOUR', atMs - H], ['NOW', atMs], ['OVERDUE', atMs + (withDayBefore ? H : 15 * 60000)]);
    plan.forEach(([kind, t]) => {
      if (t <= nowMs) return;
      try {
        if (typeof nb.scheduleDeadline === 'function') nb.scheduleDeadline(id, title, hhmm, t, kind, color);
        else if (kind === 'NOW') nb.scheduleReminder(id, title, hhmm, t);
      } catch (e) {}
    });
  }

  async checkAppUpdate() {
    const APP_VERSION = '3.2.0';
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    try {
      const res = await fetch('https://api.github.com/repos/MarxPao/cat-line/releases/latest', { cache: 'no-store' });
      if (!res.ok) return;
      const rel = await res.json();
      const latest = String(rel.tag_name || '').replace(/^v/i, '').trim();
      if (latest && latest !== APP_VERSION && latest.localeCompare(APP_VERSION, undefined, { numeric: true }) > 0) {
        state.availableUpdate = { version: latest, url: 'https://marxpao.github.io/cat-line/' };
        if (state.activeTab === 'hoje') this.renderActiveTab();
      }
    } catch (e) {}
  }

  checkNativeCompletedTasks() {
    if (!window.AndroidBlocker || typeof window.AndroidBlocker.pollCompletedTasks !== 'function') return;
    try {
      const raw = window.AndroidBlocker.pollCompletedTasks();
      if (!raw || raw === '[]') return;
      const tasks = JSON.parse(raw);
      if (!Array.isArray(tasks) || tasks.length === 0) return;

      let gained = 0;
      tasks.forEach(t => {
        const occ = state.occurrences.find(o => o.id === t.taskId);
        if (occ && occ.state !== 'FEITO') {
          occ.state = 'FEITO';
          const reward = occ.reward || (occ.effort === 'G' ? 20 : (occ.effort === 'M' ? 10 : 5));
          state.currencies.peixinhos += reward;
          state.currencies.vinculo += 15;
          gained += reward;
        }
      });

      if (gained > 0) {
        audio.playMeowCelebrate();
        this.setCatSpeech(`Você cumpriu compromissos pela notificação! +${gained}🐟`);
        this.updateHUD();
        this.persist();
        this.renderActiveTab();
      }
    } catch (e) {
      console.warn("Erro ao reconciliar tarefas nativas:", e);
    }
  }
}

// Inicializa a aplicação
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AppUI();
});
