const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'web-preview', 'app.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add ChiptuneSynth ambient purr methods
const oldSynthPurr = `  playPurr() {
    this.playSquareSweep(95, 115, 320, 0.2);
  }`;

const newSynthPurr = `  playPurr() {
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
  }`;

code = code.replace(oldSynthPurr, newSynthPurr);

// 2. Add accessories drawing to SceneCanvas.drawCalicoCatWithYarnInPaws
const oldEquippedDrawing = `    // 8. Lacinho rosa equipado
    if (state.cat.equipped.includes('laco_rosa')) {
      vRect(x + 37, by + 12, 6, 5, PALETTE.ink);
      vRect(x + 38, by + 13, 4, 3, PALETTE.yarnPink);
    }`;

const newEquippedDrawing = `    // 8. Acessórios Equipados Visíveis no Sprite
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
    }`;

code = code.replace(oldEquippedDrawing, newEquippedDrawing);

// 3. Update scene-container click: Add Haptic Petting / Carinho na Gatinha!
const oldContainerClick = `        this.sceneInstance.walkToVirtualCoords(clickVx, clickVy, 'Ponto tocado');
        audio.playMeowGreeting();
        const pal = getYarnPalette(getSelectedGoal().yarnColorId);
        this.setCatSpeech(\`Miau, mamãe! Estou indo até aí levando o novelinho \${pal.name} na mão! ♥\`);`;

const newContainerClick = `        // Se tocou / clicou pertinho da gatinha, faz CARINHO HÁPTICO!
        const distToCat = Math.hypot(clickVx - state.cat.x, clickVy - state.cat.y);
        if (distToCat < 28) {
          if (navigator.vibrate) {
            navigator.vibrate([35, 45, 55, 45, 65]);
          }
          audio.playPurr();
          state.currencies.vinculo += 1;
          this.updateHUD();
          const purrQuotes = [
            "Ronrom... que carinho gostoso, mamãe! +1 Vínculo ♥",
            "Prrr... prrr... me sinto tão amada com você! +1 Vínculo ♥",
            "Miau! Patinha macia e carinho quentinho! +1 Vínculo ♥",
            "Ronrom... prrr... vamos vencer o dia juntas! +1 Vínculo ♥"
          ];
          this.setCatSpeech(purrQuotes[Math.floor(Math.random() * purrQuotes.length)]);
          this.persist();
          return;
        }

        this.sceneInstance.walkToVirtualCoords(clickVx, clickVy, 'Ponto tocado');
        audio.playMeowGreeting();
        const pal = getYarnPalette(getSelectedGoal().yarnColorId);
        this.setCatSpeech(\`Miau, mamãe! Estou indo até aí levando o novelinho \${pal.name} na mão! ♥\`);`;

code = code.replace(oldContainerClick, newContainerClick);

// 4. Expand renderTabLoja with complete catalogue and equip options
const oldRenderLoja = `  renderTabLoja() {
    this.contentEl.innerHTML = \`
      <div class="pixel-card">
        <h4>🛍️ Lojinha da Gatinha</h4>
        <p style="font-size: 14px; color: \${PALETTE.grayDark}; margin-bottom: 10px;">Personalize a gatinha e compre itens de cenário:</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="background: \${PALETTE.wallCream}; padding: 10px 12px; border: 2px solid \${PALETTE.ink}; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 16px;">Laço Rosa Pixel</strong><br>
              <span style="font-size: 14px;">Cosmético simples</span>
            </div>
            <button class="pixel-btn btn-sm btn-green" onclick="window.app.toggleEquip('laco_rosa')">
              \${state.cat.equipped.includes('laco_rosa') ? 'Equipado ✓' : 'Equipar'}
            </button>
          </div>

          <div style="background: \${PALETTE.wallCream}; padding: 10px 12px; border: 2px solid \${PALETTE.ink}; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 16px;">Chapéu de Mago 8-Bit</strong><br>
              <span style="font-size: 14px;">75 Peixinhos 🐟</span>
            </div>
            <button class="pixel-btn btn-sm" onclick="window.app.buyItem('chapeu_mago', 75)">
              \${state.cat.owned.includes('chapeu_mago') ? (state.cat.equipped.includes('chapeu_mago') ? 'Equipado ✓' : 'Equipar') : 'Comprar'}
            </button>
          </div>

          <div style="background: \${PALETTE.wallCream}; padding: 10px 12px; border: 2px solid \${PALETTE.ink}; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 16px;">Petisco de Salmão</strong><br>
              <span style="font-size: 14px;">20 🐟 · Rende +15 Vínculo</span>
            </div>
            <button class="pixel-btn btn-sm btn-pink" onclick="window.app.buyItem('petisco', 20, 15)">Comprar</button>
          </div>
        </div>
      </div>

      <div class="pixel-card cream">
        <h4>Modo Descanso</h4>
        <p>Pausa o tempo das metas, sequências e humor sem perda para dias de folga:</p>
        <button class="pixel-btn btn-purple" style="margin-top: 8px;" onclick="window.app.toggleRestMode()">
          \${state.cat.isRestMode ? 'Desativar Modo Descanso' : 'Ativar Modo Descanso'}
        </button>
      </div>
    \`;
  }`;

const newRenderLoja = `  renderTabLoja() {
    const shopItems = [
      { id: 'laco_rosa', name: 'Laço Rosa Pixel', desc: 'Clássico charmoso na orelhinha', cost: 0, icon: '🎀', isConsumable: false },
      { id: 'coroa_ouro', name: 'Coroa Dourada Real', desc: 'Coroa de princesa com rubi central', cost: 120, icon: '👑', isConsumable: false },
      { id: 'chapeu_mago', name: 'Chapéu de Mago 8-Bit', desc: 'Místico pontudo com estrela mágica', cost: 75, icon: '🧙‍♂️', isConsumable: false },
      { id: 'coleira_sino', name: 'Coleira com Sino de Ouro', desc: 'Toca sininho a cada passinho', cost: 50, icon: '🔔', isConsumable: false },
      { id: 'oculos_escuros', name: 'Óculos Escuros Pixel', desc: 'Estilosa e focada nas metas', cost: 60, icon: '🕶️', isConsumable: false },
      { id: 'petisco', name: 'Petisco de Salmão Fresco', desc: 'Aumenta +15 Vínculo com a gatinha', cost: 20, bond: 15, icon: '🐟', isConsumable: true },
      { id: 'novelo_reserva', name: 'Novelo Reserva Extra', desc: 'Protege sequências em dias perdidos', cost: 80, icon: '🧶', isConsumable: true }
    ];

    this.contentEl.innerHTML = \`
      <div class="pixel-card">
        <div class="flex-row space-between" style="align-items: center;">
          <h4>🛍️ Lojinha da Gatinha</h4>
          <span style="font-size: 13px; font-weight: 700; color: \${PALETTE.orange};">Saldo: \${state.currencies.peixinhos}🐟 · \${state.currencies.vinculo}♥</span>
        </div>
        <p style="font-size: 13px; color: \${PALETTE.grayDark}; margin-bottom: 10px;">Personalize a gatinha. Os itens equipados aparecem no sprite em tempo real:</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          \${shopItems.map(item => {
            const isOwned = state.cat.owned.includes(item.id) || item.cost === 0;
            const isEquipped = state.cat.equipped.includes(item.id);

            let actionBtn = '';
            if (item.isConsumable) {
              if (item.id === 'novelo_reserva') {
                actionBtn = \`<button class="pixel-btn btn-sm btn-gold" onclick="window.app.buyItem('novelo_reserva', \${item.cost})">Comprar (\${item.cost}🐟)</button>\`;
              } else {
                actionBtn = \`<button class="pixel-btn btn-sm btn-pink" onclick="window.app.buyItem('\${item.id}', \${item.cost}, \${item.bond || 0})">Comprar (\${item.cost}🐟)</button>\`;
              }
            } else {
              if (isOwned) {
                actionBtn = \`<button class="pixel-btn btn-sm \${isEquipped ? 'btn-green' : 'btn-secondary'}" onclick="window.app.toggleEquip('\${item.id}')">
                  \${isEquipped ? 'Equipado ✓' : 'Equipar'}
                </button>\`;
              } else {
                actionBtn = \`<button class="pixel-btn btn-sm" onclick="window.app.buyItem('\${item.id}', \${item.cost})">
                  Comprar (\${item.cost}🐟)
                </button>\`;
              }
            }

            return \`
              <div style="background: \${isEquipped ? '#f0fff4' : PALETTE.wallCream}; padding: 10px 12px; border: 2px solid \${PALETTE.ink}; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                  <span style="font-size: 24px;">\${item.icon}</span>
                  <div>
                    <strong style="font-size: 15px;">\${item.name}</strong><br>
                    <span style="font-size: 13px; color: \${PALETTE.grayDark};">\${item.desc}</span>
                  </div>
                </div>
                <div style="flex-shrink: 0;">
                  \${actionBtn}
                </div>
              </div>
            \`;
          }).join('')}
        </div>
      </div>

      <div class="pixel-card cream">
        <h4>Modo Descanso</h4>
        <p>Pausa o tempo das metas, sequências e humor sem perda para dias de folga:</p>
        <button class="pixel-btn btn-purple" style="margin-top: 8px;" onclick="window.app.toggleRestMode()">
          \${state.cat.isRestMode ? 'Desativar Modo Descanso' : 'Ativar Modo Descanso'}
        </button>
      </div>
    \`;
  }`;

code = code.replace(oldRenderLoja, newRenderLoja);

// 5. Update buyItem to support novelo_reserva
const oldBuyItem = `  buyItem(item, cost, bond = 0) {
    if (state.cat.owned.includes(item)) {
      this.toggleEquip(item);
      return;
    }
    if (state.currencies.peixinhos >= cost) {
      state.currencies.peixinhos -= cost;
      if (bond > 0) state.currencies.vinculo += bond;
      if (!bond) state.cat.owned.push(item);
      audio.playMeowCelebrate();
      alert("Compra realizada com sucesso!");
      this.updateHUD();
      this.renderTabLoja();
      this.persist();
    } else {
      alert("Peixinhos insuficientes!");
    }
  }`;

const newBuyItem = `  buyItem(item, cost, bond = 0) {
    if (item === 'novelo_reserva') {
      if (state.currencies.peixinhos >= cost) {
        state.currencies.peixinhos -= cost;
        state.cat.reserveYarns = (state.cat.reserveYarns || 0) + 1;
        audio.playMeowCelebrate();
        this.setCatSpeech("Novelo reserva adquirido! Suas sequências de hábitos estão protegidas contra dias perdidos.");
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
      this.setCatSpeech("Miau, mamãe! Novo acessório comprado e equipado com amor!");
      this.updateHUD();
      this.renderTabLoja();
      this.persist();
    } else {
      alert("Peixinhos insuficientes!");
    }
  }`;

code = code.replace(oldBuyItem, newBuyItem);

// 6. Add Focus Timer (Pomodoro do Novelo) methods to AppUI
const oldToggleRestMode = `  toggleRestMode() {`;

const focusTimerMethods = `  // ==========================================
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
    this.setCatSpeech(\`Miau, mamãe! Modo Foco iniciado por \${minutes} minutos! Puxando o fio juntinhas com ronrom! 🧶\`);

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
      this.setCatSpeech("Foco pausado. Pode respirar um pouquinho, mamãe!");
    } else {
      if (state.focusTimer.purrSound) audio.startFocusPurrAmbient();
      this.setCatSpeech("Foco retomado! Vamos até o fim!");
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
    this.setCatSpeech("Parabéns, mamãe! Foco concluído com louvor! +15🐟 e +15♥ ganhos com a gatinha!");
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
      timeEl.textContent = \`\${String(mins).padStart(2, '0')}:\${String(remS).padStart(2, '0')}\`;
    }
  }

  toggleRestMode() {`;

code = code.replace(oldToggleRestMode, focusTimerMethods);

// 7. Update renderTabHoje to display the Focus Overlay when state.focusTimer.active is true
// And add the button "🧶 Foco Pomodoro" in the "FAZENDO AGORA" banner!
const bannerBtnTarget = `<button class="pixel-btn btn-sm btn-secondary" onclick="window.app.stopActiveExecution()" title="Pausar execução">⏸️ Pausar</button>`;
const bannerBtnReplacement = `<button class="pixel-btn btn-sm btn-purple" onclick="window.app.openFocusTimer(25)" title="Iniciar temporizador Pomodoro">🧶 Pomodoro</button>
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.stopActiveExecution()" title="Pausar execução">⏸️ Pausar</button>`;

code = code.replace(bannerBtnTarget, bannerBtnReplacement);

// 8. Inject Focus Modal Overlay at the end of renderTabHoje
const hojeEndTarget = `    // Inicia Canvas Interativo (Clique faz a gatinha caminhar até o ponto clicado e miar!)`;
const focusModalHtml = `
    // Renderiza Modal de Foco Pomodoro se estiver ativo
    if (state.focusTimer && state.focusTimer.active) {
      const s = state.focusTimer.remSec;
      const mins = Math.floor(s / 60);
      const remS = s % 60;
      const timeStr = \`\${String(mins).padStart(2, '0')}:\${String(remS).padStart(2, '0')}\`;
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

      const focusOverlayHtml = \`
        <div class="simulated-overlay-backdrop" style="display: flex; align-items: center; justify-content: center;">
          <div class="pixel-card" style="max-width: 360px; width: 92%; margin: auto; text-align: center; border: 4px solid \${PALETTE.cozyPurple}; box-shadow: 6px 6px 0 \${PALETTE.cozyPurple}; background: #fffbf0;">
            <div class="flex-row space-between" style="align-items: center; border-bottom: 2px dashed \${PALETTE.ink}; padding-bottom: 6px; margin-bottom: 8px;">
              <span style="font-size: 16px; font-weight: 700; color: \${PALETTE.cozyPurple};">🧶 Foco · Puxar o Fio</span>
              <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.closeFocusTimer()">✕</button>
            </div>

            <div style="font-family: var(--font-short); font-size: 44px; color: \${PALETTE.cozyPurple}; font-weight: 700; margin: 8px 0; letter-spacing: 2px;" id="focus-live-timer">
              \${timeStr}
            </div>

            <div style="margin: 8px 0;">
              <canvas class="novelo-winding-canvas" data-goal-id="\${selG.id}"></canvas>
            </div>

            <p style="font-size: 14px; color: \${PALETTE.ink}; margin: 6px 0;">
              Tarefa: <strong>\${activeTitle}</strong>
            </p>
            <span style="font-size: 12px; color: \${PALETTE.grayDark};">A gatinha está concentrada no quarto puxando o fio com você!</span>

            <div class="flex-row" style="justify-content: center; gap: 6px; margin-top: 12px; flex-wrap: wrap;">
              <button class="pixel-btn btn-sm \${state.focusTimer.purrSound ? 'btn-purple' : 'btn-secondary'}" onclick="window.app.toggleFocusPurrSound()">
                \${state.focusTimer.purrSound ? '🔊 Ronrom: Ligado' : '🔈 Ronrom: Mudo'}
              </button>
              <button class="pixel-btn btn-sm \${state.focusTimer.isPaused ? 'btn-green' : 'btn-secondary'}" onclick="window.app.togglePauseFocus()">
                \${state.focusTimer.isPaused ? '▶️ Continuar' : '⏸️ Pausar'}
              </button>
              <button class="pixel-btn btn-sm btn-green" onclick="window.app.completeFocusEarly()">✓ Concluir (+15🐟)</button>
            </div>

            <div class="flex-row" style="justify-content: center; gap: 6px; margin-top: 10px;">
              <button class="preset-chip-btn \${state.focusTimer.totalSec === 900 ? 'active' : ''}" onclick="window.app.setFocusDuration(15)">15 Min</button>
              <button class="preset-chip-btn \${state.focusTimer.totalSec === 1500 ? 'active' : ''}" onclick="window.app.setFocusDuration(25)">25 Min (Pomodoro)</button>
              <button class="preset-chip-btn \${state.focusTimer.totalSec === 2700 ? 'active' : ''}" onclick="window.app.setFocusDuration(45)">45 Min</button>
            </div>
          </div>
        </div>
      \`;

      const overlayContainer = document.createElement('div');
      overlayContainer.innerHTML = focusOverlayHtml;
      this.contentEl.appendChild(overlayContainer.firstElementChild);
    }
`;

code = code.replace(hojeEndTarget, focusModalHtml + '\n' + hojeEndTarget);

fs.writeFileSync(filePath, code, 'utf8');
console.log('web-preview/app.js patched successfully for cozy cosmetics, haptic petting and focus timer!');
