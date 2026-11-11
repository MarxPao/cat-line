import re

with open('web-preview/app.js', 'r', encoding='utf8') as f:
    code = f.read().replace('\r\n', '\n')

# 1. Add state properties
state_target = """  editingRewardId: null,
  newRewardEmoji: '☕',
  celebratingReward: null
};"""

state_replacement = """  editingRewardId: null,
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
};"""

assert state_target in code, "state_target not found"
code = code.replace(state_target, state_replacement, 1)

# 2. Persist darkMode, largeFont, notificationsEnabled in saveStateToDeviceStorage & loadStateFromDeviceStorage
save_target = """      overcomingTargetMin: state.overcomingTargetMin,
      realLifeRewards: state.realLifeRewards
    };"""

save_replacement = """      overcomingTargetMin: state.overcomingTargetMin,
      realLifeRewards: state.realLifeRewards,
      darkMode: state.darkMode,
      largeFont: state.largeFont,
      notificationsEnabled: state.notificationsEnabled
    };"""

assert save_target in code, "save_target not found"
code = code.replace(save_target, save_replacement, 1)

load_target = """    if (Array.isArray(data.realLifeRewards)) state.realLifeRewards = data.realLifeRewards;"""
load_replacement = """    if (Array.isArray(data.realLifeRewards)) state.realLifeRewards = data.realLifeRewards;
    if (data.darkMode !== undefined) state.darkMode = Boolean(data.darkMode);
    if (data.largeFont !== undefined) state.largeFont = Boolean(data.largeFont);
    if (data.notificationsEnabled !== undefined) state.notificationsEnabled = Boolean(data.notificationsEnabled);"""

assert load_target in code, "load_target not found"
code = code.replace(load_target, load_replacement, 1)

# 3. In constructor of AppUI, initialize theme/font and start reminder checker
ctor_target = """    this.startGoalTimeCountdown();
    this.startWindingYarnCanvasesLoop();
  }"""

ctor_replacement = """    this.startGoalTimeCountdown();
    this.startWindingYarnCanvasesLoop();
    this.applyAccessibilityClasses();
    this.startReminderCheckerLoop();
  }"""

assert ctor_target in code, "ctor_target not found"
code = code.replace(ctor_target, ctor_replacement, 1)

# 4. Replace renderNav() and renderActiveTab() to support 5 ergonomic tabs:
# Hoje, Rotina (Agenda + Hábitos), Metas, Gatinha (Loja + Mimos), Mais (O Fio + Chat + Foco + Backup)
nav_target = """  renderNav() {
    const navItems = [
      { id: 'hoje', icon: '🏠', label: 'Hoje', flag: 'HOJE' },
      { id: 'agenda', icon: '📅', label: 'Agenda', flag: 'AGENDA' },
      { id: 'habitos', icon: '🔄', label: 'Hábitos', flag: 'HABITOS' },
      { id: 'metas', icon: '🎯', label: 'Metas', flag: 'METAS' },
      { id: 'insights', icon: '📈', label: 'O Fio', flag: 'INSIGHTS' },
      { id: 'loja', icon: '🛍️', label: 'Loja', flag: 'LOJA' },
      { id: 'conversa', icon: '💬', label: 'Chat', flag: 'CONVERSA' },
      { id: 'foco', icon: '🛡️', label: 'Foco', flag: 'FOCO' }
    ];

    this.navEl.innerHTML = '';
    navItems.filter(item => state.flags[item.flag]).forEach(item => {
      const btn = document.createElement('div');
      btn.className = `nav-item ${state.activeTab === item.id ? 'active' : ''}`;
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
    switch (state.activeTab) {
      case 'hoje': this.renderTabHoje(); break;
      case 'agenda': this.renderTabAgenda(); break;
      case 'habitos': this.renderTabHabitos(); break;
      case 'metas': this.renderTabMetas(); break;
      case 'insights': this.renderTabInsights(); break;
      case 'loja': this.renderTabLoja(); break;
      case 'conversa': this.renderTabConversa(); break;
      case 'foco': this.renderTabFoco(); break;
    }
  }"""

nav_replacement = """  renderNav() {
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
  }"""

assert nav_target in code, "nav_target not found"
code = code.replace(nav_target, nav_replacement, 1)

# 5. Replace the Compromissos + Hábitos checklists in renderTabHoje() with the unified Vertical Timeline + Swipe Gestures!
hoje_checklists_start = "      <!-- Checklist de Compromissos de Hoje -->"
hoje_checklists_end = "      <div class=\"pixel-card\" style=\"margin-top: 12px; background: #fffdf5; border: 2px solid ${PALETTE.orange};\">"

assert hoje_checklists_start in code, "hoje_checklists_start not found"
assert hoje_checklists_end in code, "hoje_checklists_end not found"

idx_start = code.index(hoje_checklists_start)
idx_end = code.index(hoje_checklists_end)

timeline_hoje_html = """      <!-- Linha do Tempo Vertical Unificada do Dia (Compromissos + Hábitos) com Gestos Swipe -->
      <div class="pixel-card">
        <div class="flex-row space-between" style="align-items: center;">
          <div>
            <h4 style="margin-bottom: 2px;">⏳ Linha do Tempo de Hoje (${state.occurrences.filter(o => o.state === 'FEITO').length + state.habits.filter(h => h.completed).length}/${state.occurrences.length + state.habits.length})</h4>
            <span style="font-size: 12px; color: ${PALETTE.grayDark};">Compromissos e Hábitos ordenados por horário</span>
          </div>
          <div class="flex-row" style="gap: 4px;">
            <button class="pixel-btn btn-sm btn-green" onclick="window.app.openQuickCreateSheet('occurrence')">＋ Criar</button>
            <button class="pixel-btn btn-sm btn-purple" onclick="window.app.startBriefing()">📝 Briefing</button>
          </div>
        </div>

        <div class="swipe-hint-pill" style="margin: 8px 0;">
          👉 Deslize o card p/ <strong>Direita</strong> para Concluir · Deslize p/ <strong>Esquerda</strong> para Excluir (ou toque nos botões)
        </div>

        <div class="timeline-section-wrap" id="hoje-timeline-list">
          ${this.buildUnifiedTimelineHtml()}
        </div>
      </div>

"""

code = code[:idx_start] + timeline_hoje_html + code[idx_end:]

# 6. Attach swipe gesture listeners at the end of renderTabHoje()
end_hoje_target = """        this.sceneInstance.walkToVirtualCoords(clickVx, clickVy, 'Ponto tocado');
        audio.playMeowGreeting();
        const pal = getYarnPalette(getSelectedGoal().yarnColorId);
        this.setCatSpeech(`Miau, mamãe! Estou indo até aí levando o novelinho ${pal.name} na mão! ♥`);
      };
    }
  }"""

end_hoje_replacement = """        this.sceneInstance.walkToVirtualCoords(clickVx, clickVy, 'Ponto tocado');
        audio.playMeowGreeting();
        const pal = getYarnPalette(getSelectedGoal().yarnColorId);
        this.setCatSpeech(`Miau, mamãe! Estou indo até aí levando o novelinho ${pal.name} na mão! ♥`);
      };
    }
    this.attachSwipeListenersToTimeline();
  }"""

assert end_hoje_target in code, "end_hoje_target not found"
code = code.replace(end_hoje_target, end_hoje_replacement, 1)

# 7. Enhance markDone, completeHabit, deleteOccurrence, deleteHabit,deleteGoal, deleteRealReward with Confetti & Undo Snackbar!
markdone_target = """    audio.playMeowCelebrate();
    this.setCatSpeech(`Miau, mamãe! No prazo! +${occ.reward} peixinhos ganhos!`);"""

markdone_replacement = """    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.setCatSpeech(`Miau, mamãe! No prazo! +${occ.reward} peixinhos ganhos!`);"""

assert markdone_target in code, "markdone_target not found"
code = code.replace(markdone_target, markdone_replacement, 1)

completehabit_target = """    audio.playMeowGreeting();
    this.setCatSpeech(`Hábito "${h.title}" cumprido! +8🐟 ganhos com muito orgulho!`);"""

completehabit_replacement = """    audio.playMeowCelebrate();
    this.spawnPixelConfetti();
    this.setCatSpeech(`Hábito "${h.title}" cumprido! +8🐟 ganhos com muito orgulho!`);"""

assert completehabit_target in code, "completehabit_target not found"
code = code.replace(completehabit_target, completehabit_replacement, 1)

# Update deleteOccurrence to support Undo Snackbar and re-render active tab properly
del_occ_target = """  deleteOccurrence(id) {
    const occ = state.occurrences.find(o => o.id === id);
    const title = occ ? occ.title : 'Compromisso';
    state.occurrences = state.occurrences.filter(o => o.id !== id);
    if (state.editingOccurrenceId === id) state.editingOccurrenceId = null;
    audio.playBlip();
    this.setCatSpeech(`"${title}" foi descartado da sua lista.`);
    this.renderActiveTab();
    this.persist();
  }"""

del_occ_replacement = """  deleteOccurrence(id) {
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
  }"""

assert del_occ_target in code, "del_occ_target not found"
code = code.replace(del_occ_target, del_occ_replacement, 1)

del_hab_target = """  deleteHabit(id) {
    const habit = state.habits.find(h => h.id === id);
    const title = habit ? habit.title : 'Hábito';
    state.habits = state.habits.filter(h => h.id !== id);
    if (state.editingHabitId === id) state.editingHabitId = null;
    audio.playBlip();
    this.setCatSpeech(`Hábito "${title}" descartado.`);
    this.renderTabHabitos();
    this.persist();
  }"""

del_hab_replacement = """  deleteHabit(id) {
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
  }"""

assert del_hab_target in code, "del_hab_target not found"
code = code.replace(del_hab_target, del_hab_replacement, 1)

# Also ensure startEditHabit, cancelEditHabit, saveEditHabit, addCommitment, createHabit call renderActiveTab() so they work both in Rotina and Hoje!
code = code.replace("this.renderTabHabitos();", "this.renderActiveTab();")
code = code.replace("this.renderTabAgenda();", "this.renderActiveTab();")
code = code.replace("this.renderTabInsights();", "this.renderActiveTab();")
code = code.replace("this.renderTabConversa();", "this.renderActiveTab();")
code = code.replace("this.renderTabFoco();", "this.renderActiveTab();")

# 8. Add all new UX & Feature methods to AppUI before startAnticsRotation()
ux_methods = """
  // =========================================================
  // NOVOS MÉTODOS DE UX, DESIGN, SWIPE, BOTTOM SHEET E LEMBRETES
  // =========================================================

  buildUnifiedTimelineHtml() {
    const items = [];
    state.occurrences.forEach(o => {
      items.push({
        kind: 'occurrence',
        id: o.id,
        title: o.title,
        time: o.time || '12:00',
        done: o.state === 'FEITO',
        reward: o.reward || 10,
        subtitle: `Compromisso ${o.effort || 'M'} · ${o.recurrence || 'Todos os dias'}`,
        raw: o
      });
    });
    state.habits.forEach(h => {
      items.push({
        kind: 'habit',
        id: h.id,
        title: h.title,
        time: h.window || '21:00',
        done: Boolean(h.completed),
        reward: 8,
        subtitle: `🔥 ${h.streak}d seguidos · Hábito (${h.frequency || 'Diário'})`,
        raw: h
      });
    });

    if (items.length === 0) {
      return `
        <div class="empty-state-cat-box">
          <div style="font-size: 36px;">🐱🧶</div>
          <strong>Nada por aqui ainda, mamãe!</strong>
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

      return `
        <div class="timeline-swipe-wrapper" data-kind="${item.kind}" data-id="${item.id}" data-done="${item.done}">
          <div class="timeline-swipe-bg-left">✓ Concluir (+${item.reward}🐟)</div>
          <div class="timeline-swipe-bg-right">🗑️ Excluir</div>
          <div class="timeline-card ${item.done ? 'done-card' : ''} ${isActiveExec ? 'active-exec-card' : ''}">
            <div class="timeline-time-badge">⏰ ${item.time}</div>
            <button class="timeline-check-circle ${item.done ? 'checked' : ''}" onclick="${toggleFn}" title="${item.done ? 'Reabrir' : 'Marcar como concluído'}">
              ${item.done ? '✓' : ''}
            </button>
            <div class="timeline-body">
              <div class="timeline-title">${item.title}</div>
              <div class="timeline-meta">
                <span>${item.subtitle}</span>
                <span style="color: ${PALETTE.orange}; font-weight: 700;">+${item.reward}🐟</span>
              </div>
            </div>
            <div class="timeline-quick-actions">
              ${!item.done ? (
                isActiveExec
                  ? `<button class="pixel-btn btn-sm btn-purple" onclick="window.app.stopActiveExecution()" title="Pausar execução com a gatinha">⚡</button>`
                  : `<button class="pixel-btn btn-sm" onclick="window.app.startActiveExecution('${item.id}', '${item.kind}')" title="Fazer agora juntinho com a gatinha">▶️</button>`
              ) : ''}
              <button class="pixel-btn btn-sm btn-icon" onclick="${editFn}" title="Editar">✏️</button>
              <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="${delFn}" title="Excluir">🗑️</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  attachSwipeListenersToTimeline() {
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

  renderQuickCreateSheetContent() {
    const box = document.getElementById('quick-create-box');
    if (!box) return;
    const t = state.quickCreateType || 'occurrence';

    let formHtml = '';
    if (t === 'occurrence') {
      formHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="qc-occ-title" class="pixel-input" placeholder="O que vamos fazer? (ex: Estudar, Treino, Médico)" autofocus>
          <div class="flex-row">
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">⏰ Horário:</label>
              <input type="time" id="qc-occ-time" class="pixel-input" value="19:00">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">💪 Esforço:</label>
              <select id="qc-occ-effort" class="pixel-input">
                <option value="P">Leve P (+5🐟)</option>
                <option value="M" selected>Médio M (+10🐟)</option>
                <option value="G">Grande G (+20🐟)</option>
              </select>
            </div>
          </div>
          <div class="flex-row">
            <select id="qc-occ-recurrence" class="pixel-input" style="flex: 1;">
              <option value="Todos os dias" selected>🔄 Todos os dias</option>
              <option value="Dias úteis">💼 Dias úteis (Seg-Sex)</option>
              <option value="Finais de semana">🏖️ Finais de semana</option>
              <option value="3x por semana">✨ 3x por semana</option>
              <option value="Apenas hoje">📌 Apenas hoje</option>
            </select>
          </div>
          <button class="pixel-btn btn-green" style="width: 100%; padding: 12px; font-size: 15px;" onclick="window.app.submitQuickCreate()">
            ✓ Enrolar Compromisso na Rotina
          </button>
        </div>
      `;
    } else if (t === 'habit') {
      formHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="qc-hab-title" class="pixel-input" placeholder="Nome do hábito (ex: Beber 2L de Água, Ler 10 pág)" autofocus>
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
          <button class="pixel-btn btn-green" style="width: 100%; padding: 12px; font-size: 15px;" onclick="window.app.submitQuickCreate()">
            ✓ Criar Hábito (+8🐟/dia)
          </button>
        </div>
      `;
    } else if (t === 'goal') {
      formHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="qc-goal-title" class="pixel-input" placeholder="Qual é a sua grande meta?" autofocus>
          <div class="flex-row">
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">⏳ Prazo (dias):</label>
              <input type="number" id="qc-goal-days" class="pixel-input" value="7" min="1" max="365">
            </div>
            <div style="flex: 1;">
              <label style="font-size: 12px; font-weight: 700;">🧶 Cor do Novelo:</label>
              <select id="qc-goal-color" class="pixel-input">
                ${YARN_COLORS.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
          </div>
          <input type="text" id="qc-goal-reward" class="pixel-input" placeholder="Mimo ao conquistar (ex: Jantar especial)">
          <button class="pixel-btn btn-green" style="width: 100%; padding: 12px; font-size: 15px;" onclick="window.app.submitQuickCreate()">
            ✓ Criar Meta & Dar Novelo à Gatinha
          </button>
        </div>
      `;
    } else if (t === 'reward') {
      formHtml = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <input type="text" id="qc-rw-title" class="pixel-input" placeholder="Qual mimo da vida real? (ex: Café especial, Cinema)" autofocus>
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
          <button class="pixel-btn btn-gold" style="width: 100%; padding: 12px; font-size: 15px;" onclick="window.app.submitQuickCreate()">
            ✓ Salvar Mimo da Vida Real
          </button>
        </div>
      `;
    }

    box.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="flex-row space-between" style="margin-bottom: 10px;">
        <strong style="font-size: 17px;">✨ Criação Rápida (2 Toques)</strong>
        <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.closeQuickCreateSheet()">✕</button>
      </div>
      <div class="subnav-pills-bar" style="margin-bottom: 12px;">
        <button class="subnav-pill-btn ${t === 'occurrence' ? 'active' : ''}" onclick="window.app.setQuickCreateType('occurrence')">📅 Compromisso</button>
        <button class="subnav-pill-btn ${t === 'habit' ? 'active' : ''}" onclick="window.app.setQuickCreateType('habit')">🔄 Hábito</button>
        <button class="subnav-pill-btn ${t === 'goal' ? 'active' : ''}" onclick="window.app.setQuickCreateType('goal')">🎯 Meta</button>
        <button class="subnav-pill-btn ${t === 'reward' ? 'active' : ''}" onclick="window.app.setQuickCreateType('reward')">🎁 Mimo</button>
      </div>
      ${formHtml}
    `;
  }

  submitQuickCreate() {
    const t = state.quickCreateType || 'occurrence';
    if (t === 'occurrence') {
      const title = (document.getElementById('qc-occ-title')?.value || '').trim();
      if (!title) return alert('Digite o título do compromisso!');
      const time = document.getElementById('qc-occ-time')?.value || '19:00';
      const effort = document.getElementById('qc-occ-effort')?.value || 'M';
      const recurrence = document.getElementById('qc-occ-recurrence')?.value || 'Todos os dias';
      const reward = effort === 'G' ? 20 : (effort === 'M' ? 10 : 5);
      state.occurrences.push({
        id: `occ-${Date.now()}`,
        title,
        time,
        effort,
        reward,
        recurrence,
        date: state.dayKey,
        state: 'PENDENTE',
        delayMin: 0
      });
      this.setCatSpeech(`Miau! Compromisso "${title}" às ${time} adicionado na sua linha do tempo!`);
    } else if (t === 'habit') {
      const title = (document.getElementById('qc-hab-title')?.value || '').trim();
      if (!title) return alert('Digite o nome do hábito!');
      const windowTime = document.getElementById('qc-hab-window')?.value || '21:00';
      const frequency = document.getElementById('qc-hab-freq')?.value || 'Todos os dias';
      state.habits.push({
        id: `hab-${Date.now()}`,
        title,
        window: windowTime,
        frequency,
        streak: 0,
        bestStreak: 0,
        totalCheckIns: 0,
        completed: false
      });
      this.setCatSpeech(`Miau! Novo hábito "${title}" criado com sucesso!`);
    } else if (t === 'goal') {
      const title = (document.getElementById('qc-goal-title')?.value || '').trim();
      if (!title) return alert('Digite o título da meta!');
      const days = Math.max(1, parseInt(document.getElementById('qc-goal-days')?.value || '7', 10));
      const colorId = document.getElementById('qc-goal-color')?.value || 'pink';
      const reward = (document.getElementById('qc-goal-reward')?.value || '').trim() || 'Mimo Especial';
      const newId = `g-${Date.now()}`;
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
      this.setCatSpeech(`Miau! Meta "${title}" criada e já peguei o novelinho na patinha!`);
    } else if (t === 'reward') {
      const title = (document.getElementById('qc-rw-title')?.value || '').trim();
      if (!title) return alert('Digite o nome do mimo!');
      const cost = Math.max(5, parseInt(document.getElementById('qc-rw-cost')?.value || '35', 10));
      const icon = (document.getElementById('qc-rw-icon')?.value || '☕').trim();
      state.realLifeRewards.push({
        id: `rw-${Date.now()}`,
        title,
        cost,
        icon,
        redeemedCount: 0,
        lastRedeemedAt: null
      });
      this.setCatSpeech(`Miau! Mimo "${title}" adicionado às suas recompensas!`);
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
    this.setCatSpeech(`Ufa! Restaurei "${item.title}" de volta para você, mamãe!`);
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
      piece.style.setProperty('--tx', tx);
      piece.style.setProperty('--ty', ty);
      layer.appendChild(piece);
      setTimeout(() => piece.remove(), 1000);
    }
  }

  // Modo Escuro (Cozy Night Mode) & Fonte Ampliada (A+)
  applyAccessibilityClasses() {
    document.body.classList.toggle('dark-mode', Boolean(state.darkMode));
    document.body.classList.toggle('large-font', Boolean(state.largeFont));
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) themeBtn.textContent = state.darkMode ? '☀️' : '🌙';
    const fontBtn = document.getElementById('btn-font-toggle');
    if (fontBtn) fontBtn.textContent = state.largeFont ? 'A-' : 'A+';
  }

  toggleDarkMode() {
    state.darkMode = !state.darkMode;
    this.applyAccessibilityClasses();
    audio.playBlip();
    this.setCatSpeech(state.darkMode ? 'Modo Noturno aconchegante ativado para descansar seus olhinhos! 🌙' : 'Modo Claro ensolarado ativado! ☀️');
    this.persist();
  }

  toggleLargeFont() {
    state.largeFont = !state.largeFont;
    this.applyAccessibilityClasses();
    audio.playBlip();
    this.setCatSpeech(state.largeFont ? 'Letras ampliadas ativadas para leitura super confortável! 🔍' : 'Tamanho de letra padrão restaurado!');
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
    const msg = 'Miau, mamãe! Passando para lembrar você de puxar o fio das suas metas hoje! 🧶🐾';
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
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      state.occurrences.forEach(o => {
        if (o.state === 'PENDENTE' && o.time === hhmm) {
          const key = `${state.dayKey}-${o.id}-${hhmm}`;
          if (!state.notifiedTodayKeys.includes(key)) {
            state.notifiedTodayKeys.push(key);
            audio.playMeowCelebrate();
            const text = `⏰ Hora de "${o.title}" (${o.time})! Vamos fazer juntinhas para ganhar +${o.reward}🐟?`;
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
"""

anchor = "  startAnticsRotation() {"
assert anchor in code, "startAnticsRotation anchor not found"
code = code.replace(anchor, ux_methods + "\n" + anchor, 1)

with open('web-preview/app.js', 'w', encoding='utf8') as f:
    f.write(code)

print("Successfully patched web-preview/app.js with all UX, Design, and Feature improvements!")
