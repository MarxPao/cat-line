const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'web-preview', 'app.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add unmarkDone and uncompleteHabit to AppUI
if (!code.includes('unmarkDone(id) {')) {
  const target = '  markDone(id) {';
  const replacement = [
    '  unmarkDone(id) {',
    '    const occ = state.occurrences.find(o => o.id === id);',
    '    if (!occ || occ.state !== "FEITO") return;',
    '    occ.state = "PENDENTE";',
    '    state.currencies.peixinhos = Math.max(0, state.currencies.peixinhos - occ.reward);',
    '    state.currencies.vinculo = Math.max(0, state.currencies.vinculo - occ.reward);',
    '    audio.playBlip();',
    '    this.setCatSpeech("Compromisso \\"" + occ.title + "\\" reaberto como pendente.");',
    '    this.updateHUD();',
    '    this.renderActiveTab();',
    '    this.persist();',
    '  }',
    '',
    '  uncompleteHabit(id) {',
    '    const h = state.habits.find(x => x.id === id);',
    '    if (!h || !h.completed) return;',
    '    h.completed = false;',
    '    h.streak = Math.max(0, h.streak - 1);',
    '    h.totalCheckIns = Math.max(0, (h.totalCheckIns || 1) - 1);',
    '    state.currencies.peixinhos = Math.max(0, state.currencies.peixinhos - 8);',
    '    state.currencies.vinculo = Math.max(0, state.currencies.vinculo - 8);',
    '    audio.playBlip();',
    '    this.setCatSpeech("Hábito \\"" + h.title + "\\" reaberto como pendente.");',
    '    this.updateHUD();',
    '    this.renderActiveTab();',
    '    this.persist();',
    '  }',
    '',
    '  markDone(id) {'
  ].join('\n');
  code = code.replace(target, replacement);
}

// 2. In markDone and retroCheckIn, ensure this.renderActiveTab() is called
code = code.replace(
  '    this.updateHUD();\n    this.renderTabHoje();\n    this.persist();\n  }\n\n  retroCheckIn(id) {',
  '    this.updateHUD();\n    this.renderActiveTab();\n    this.persist();\n  }\n\n  retroCheckIn(id) {'
);

code = code.replace(
  '    this.updateHUD();\n    this.renderTabHoje();\n    this.persist();\n  }\n\n  // CRUD de Compromissos (Hoje & Agenda)',
  '    this.updateHUD();\n    this.renderActiveTab();\n    this.persist();\n  }\n\n  // CRUD de Compromissos (Hoje & Agenda)'
);

// 3. In completeHabit, use this.renderActiveTab()
code = code.replace(
  '    this.updateHUD();\n    this.renderTabHabitos();\n    this.persist();\n  }\n\n  useReserveYarn() {',
  '    this.updateHUD();\n    this.renderActiveTab();\n    this.persist();\n  }\n\n  useReserveYarn() {'
);

// 4. Update loadStateFromDeviceStorage for occurrences with fallback recurrence
code = code.replace(
  '    if (Array.isArray(data.occurrences)) state.occurrences = data.occurrences;',
  '    if (Array.isArray(data.occurrences)) {\n      state.occurrences = data.occurrences.map(o => ({\n        recurrence: "Todos os dias",\n        date: state.dayKey,\n        ...o\n      }));\n    }'
);

// 5. Update saveEditOccurrence to handle recurrence and date
const oldSaveEdit = `    const titleEl = document.getElementById(\`edit-occ-title-\${id}\`);
    const timeEl = document.getElementById(\`edit-occ-time-\${id}\`);
    const effortEl = document.getElementById(\`edit-occ-effort-\${id}\`);
    if (titleEl && titleEl.value.trim()) occ.title = titleEl.value.trim();
    if (timeEl && timeEl.value) occ.time = timeEl.value;
    if (effortEl) {
      occ.effort = effortEl.value;
      occ.reward = occ.effort === 'G' ? 20 : (occ.effort === 'M' ? 10 : 5);
    }`;

const newSaveEdit = `    const titleEl = document.getElementById(\`edit-occ-title-\${id}\`);
    const timeEl = document.getElementById(\`edit-occ-time-\${id}\`);
    const effortEl = document.getElementById(\`edit-occ-effort-\${id}\`);
    const recurrenceEl = document.getElementById(\`edit-occ-recurrence-\${id}\`);
    const dateEl = document.getElementById(\`edit-occ-date-\${id}\`);
    if (titleEl && titleEl.value.trim()) occ.title = titleEl.value.trim();
    if (timeEl && timeEl.value) occ.time = timeEl.value;
    if (effortEl) {
      occ.effort = effortEl.value;
      occ.reward = occ.effort === 'G' ? 20 : (occ.effort === 'M' ? 10 : 5);
    }
    if (recurrenceEl) occ.recurrence = recurrenceEl.value;
    if (dateEl && dateEl.value) occ.date = dateEl.value;`;

code = code.replace(oldSaveEdit, newSaveEdit);

// 6. Update addCommitment to handle recurrence and date
const oldAddCommitment = `  addCommitment() {
    const title = document.getElementById('new-task-title').value.trim();
    const time = document.getElementById('new-task-time').value;
    const effort = document.getElementById('new-task-effort').value;
    if (!title) return;

    const reward = effort === 'G' ? 20 : (effort === 'M' ? 10 : 5);
    state.occurrences.push({
      id: \`occ-\${Date.now()}\`,
      title,
      time,
      effort,
      reward,
      state: 'PENDENTE',
      delayMin: 0
    });

    audio.playMeowGreeting();
    this.setCatSpeech(\`Novo compromisso "\${title}" enrolado na sua agenda!\`);
    this.renderTabAgenda();
    this.persist();
  }`;

const newAddCommitment = `  addCommitment() {
    const titleEl = document.getElementById('new-task-title');
    const timeEl = document.getElementById('new-task-time');
    const effortEl = document.getElementById('new-task-effort');
    const recurrenceEl = document.getElementById('new-task-recurrence');
    const dateEl = document.getElementById('new-task-date');

    const title = titleEl ? titleEl.value.trim() : '';
    const time = timeEl ? timeEl.value : '19:00';
    const effort = effortEl ? effortEl.value : 'M';
    const recurrence = recurrenceEl ? recurrenceEl.value : 'Todos os dias';
    const date = dateEl && dateEl.value ? dateEl.value : state.dayKey;
    if (!title) return;

    const reward = effort === 'G' ? 20 : (effort === 'M' ? 10 : 5);
    state.occurrences.push({
      id: \`occ-\${Date.now()}\`,
      title,
      time,
      effort,
      reward,
      recurrence,
      date,
      state: 'PENDENTE',
      delayMin: 0
    });

    audio.playMeowGreeting();
    this.setCatSpeech(\`Novo compromisso "\${title}" (\${recurrence}) enrolado na sua agenda!\`);
    this.renderTabAgenda();
    this.persist();
  }`;

code = code.replace(oldAddCommitment, newAddCommitment);

// 7. Update renderTabAgenda
const startAgenda = '  renderTabAgenda() {';
const endAgenda = '  addCommitment() {';
const agendaIdx1 = code.indexOf(startAgenda);
const agendaIdx2 = code.indexOf(endAgenda);

if (agendaIdx1 !== -1 && agendaIdx2 !== -1) {
  const newAgendaMethod = `  renderTabAgenda() {
    this.contentEl.innerHTML = \`
      <div class="pixel-card">
        <h4>📅 Agenda · Novo Compromisso</h4>
        <p style="font-size: 14px; color: \${PALETTE.grayDark}; margin-bottom: 10px;">Defina título, horário, esforço e frequência recorrente:</p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="flex-row">
            <span style="font-size: 20px;">🧶</span>
            <input type="text" id="new-task-title" class="pixel-input" placeholder="Título do compromisso (ex: Treino, Reunião, Estudo)">
          </div>
          <div class="flex-row">
            <span style="font-size: 20px;">⏰</span>
            <input type="time" id="new-task-time" class="pixel-input" value="19:00">
            <select id="new-task-effort" class="pixel-input" style="width: 150px;">
              <option value="P">Esforço P (+5🐟)</option>
              <option value="M" selected>Esforço M (+10🐟)</option>
              <option value="G">Esforço G (+20🐟)</option>
            </select>
          </div>
          <div class="flex-row">
            <span style="font-size: 20px;">🔄</span>
            <select id="new-task-recurrence" class="pixel-input">
              <option value="Todos os dias" selected>🔄 Recorrente · Todos os dias</option>
              <option value="Dias úteis">💼 Recorrente · Dias úteis (Seg-Sex)</option>
              <option value="Finais de semana">🏖️ Recorrente · Finais de semana (Sáb-Dom)</option>
              <option value="3x por semana">✨ Recorrente · 3x por semana</option>
              <option value="Semanal">📆 Recorrente · Semanal (1x/sem)</option>
              <option value="Apenas hoje">📌 Pontual · Apenas hoje</option>
              <option value="Data específica">📅 Pontual · Data específica</option>
            </select>
            <input type="date" id="new-task-date" class="pixel-input" value="\${state.dayKey}" style="width: 155px;" title="Data do compromisso">
          </div>
          <button class="pixel-btn btn-green" onclick="window.app.addCommitment()">Enrolar na Agenda</button>
        </div>
      </div>

      <div class="pixel-card cream">
        <div class="flex-row space-between">
          <h4>Compromissos Agendados (\${state.occurrences.filter(o => o.state === 'FEITO').length}/\${state.occurrences.length})</h4>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
          \${state.occurrences.map(o => {
            const isEditing = state.editingOccurrenceId === o.id;
            const rec = o.recurrence || 'Todos os dias';
            const isDone = o.state === 'FEITO';
            if (isEditing) {
              return \`
                <div class="inline-edit-box">
                  <strong>✏️ Editar Compromisso:</strong>
                  <input type="text" id="edit-occ-title-\${o.id}" class="pixel-input" value="\${o.title}">
                  <div class="flex-row">
                    <input type="time" id="edit-occ-time-\${o.id}" class="pixel-input" value="\${o.time}">
                    <select id="edit-occ-effort-\${o.id}" class="pixel-input">
                      <option value="P" \${o.effort === 'P' ? 'selected' : ''}>P (+5🐟)</option>
                      <option value="M" \${o.effort === 'M' ? 'selected' : ''}>M (+10🐟)</option>
                      <option value="G" \${o.effort === 'G' ? 'selected' : ''}>G (+20🐟)</option>
                    </select>
                  </div>
                  <div class="flex-row">
                    <select id="edit-occ-recurrence-\${o.id}" class="pixel-input">
                      <option value="Todos os dias" \${rec === 'Todos os dias' ? 'selected' : ''}>🔄 Todos os dias</option>
                      <option value="Dias úteis" \${rec === 'Dias úteis' ? 'selected' : ''}>💼 Dias úteis (Seg-Sex)</option>
                      <option value="Finais de semana" \${rec === 'Finais de semana' ? 'selected' : ''}>🏖️ Finais de semana</option>
                      <option value="3x por semana" \${rec === '3x por semana' ? 'selected' : ''}>✨ 3x por semana</option>
                      <option value="Semanal" \${rec === 'Semanal' ? 'selected' : ''}>📆 Semanal</option>
                      <option value="Apenas hoje" \${rec === 'Apenas hoje' ? 'selected' : ''}>📌 Apenas hoje</option>
                      <option value="Data específica" \${rec === 'Data específica' ? 'selected' : ''}>📅 Data específica</option>
                    </select>
                    <input type="date" id="edit-occ-date-\${o.id}" class="pixel-input" value="\${o.date || state.dayKey}" style="width: 145px;">
                  </div>
                  <div class="flex-row space-between" style="margin-top: 4px;">
                    <button class="pixel-btn btn-sm btn-green" onclick="window.app.saveEditOccurrence('\${o.id}')">Salvar</button>
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.cancelEditOccurrence()">Cancelar</button>
                  </div>
                </div>
              \`;
            }
            return \`
              <div style="background: \${isDone ? '#e6f4ea' : '#fff'}; padding: 10px 12px; border: 2px solid \${PALETTE.ink}; font-size: 15px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div style="flex: 1;">
                  <strong style="font-size: 16px;">\${o.title}</strong><br>
                  <span style="font-size: 13px; color: \${PALETTE.grayDark};">
                    ⏰ \${o.time} · \${o.effort} (+\${o.reward}🐟) · <span style="color: \${PALETTE.purple}; font-weight: 700;">\${rec}</span>
                    \${o.date ? ' · ' + o.date : ''}
                  </span><br>
                  <span style="font-size: 12px; font-weight: 700; color: \${isDone ? PALETTE.leafGreen : PALETTE.orangeShadow};">
                    \${isDone ? 'FEITO ✓' : 'PENDENTE'}
                  </span>
                </div>
                <div style="display: flex; gap: 5px; flex-shrink: 0; align-items: center;">
                  \${isDone
                    ? \`
                      <span style="font-family: var(--font-short); font-size: 13px; color: \${PALETTE.leafGreen}; margin-right: 4px;">FEITO ✓</span>
                      <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.unmarkDone('\${o.id}')" title="Reabrir">Reabrir</button>
                    \`
                    : \`
                      <button class="pixel-btn btn-sm btn-green" onclick="window.app.markDone('\${o.id}')" title="Marcar como Feito">Feito ✓</button>
                      <button class="pixel-btn btn-sm btn-purple" onclick="window.app.retroCheckIn('\${o.id}')" title="Check-in Retroativo">Retro</button>
                    \`
                  }
                  <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditOccurrence('\${o.id}')" title="Editar">✏️</button>
                  <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteOccurrence('\${o.id}')" title="Descartar">🗑️</button>
                </div>
              </div>
            \`;
          }).join('')}
        </div>
      </div>
    \`;
  }

  `;
  code = code.slice(0, agendaIdx1) + newAgendaMethod + code.slice(agendaIdx2);
}

// 8. Update renderTabHoje: add Hábitos de Hoje card and recurrence on occurrences
const startOccHoje = '      <!-- Checklist de Compromissos de Hoje -->';
const endOccHoje = '    // Inicia Canvas Interativo (Clique faz a gatinha caminhar até o ponto clicado e miar!)';
const hojeIdx1 = code.indexOf(startOccHoje);
const hojeIdx2 = code.indexOf(endOccHoje);

if (hojeIdx1 !== -1 && hojeIdx2 !== -1) {
  const newHojeLists = `      <!-- Checklist de Compromissos de Hoje -->
      <div class="pixel-card">
        <div class="flex-row space-between">
          <h4>Compromissos de Hoje (\${state.occurrences.filter(o => o.state === 'FEITO').length}/\${state.occurrences.length})</h4>
          <span style="font-size: 12px; color: \${PALETTE.purple}; font-weight: 700;">Recorrentes & Pontuais</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
          \${state.occurrences.map(o => {
            const isEditing = state.editingOccurrenceId === o.id;
            const rec = o.recurrence || 'Todos os dias';
            const isDone = o.state === 'FEITO';
            if (isEditing) {
              return \`
                <div class="inline-edit-box">
                  <strong>✏️ Editar Compromisso:</strong>
                  <input type="text" id="edit-occ-title-\${o.id}" class="pixel-input" value="\${o.title}">
                  <div class="flex-row">
                    <input type="time" id="edit-occ-time-\${o.id}" class="pixel-input" value="\${o.time}">
                    <select id="edit-occ-effort-\${o.id}" class="pixel-input">
                      <option value="P" \${o.effort === 'P' ? 'selected' : ''}>P (+5🐟)</option>
                      <option value="M" \${o.effort === 'M' ? 'selected' : ''}>M (+10🐟)</option>
                      <option value="G" \${o.effort === 'G' ? 'selected' : ''}>G (+20🐟)</option>
                    </select>
                  </div>
                  <div class="flex-row">
                    <select id="edit-occ-recurrence-\${o.id}" class="pixel-input">
                      <option value="Todos os dias" \${rec === 'Todos os dias' ? 'selected' : ''}>🔄 Todos os dias</option>
                      <option value="Dias úteis" \${rec === 'Dias úteis' ? 'selected' : ''}>💼 Dias úteis (Seg-Sex)</option>
                      <option value="Finais de semana" \${rec === 'Finais de semana' ? 'selected' : ''}>🏖️ Finais de semana</option>
                      <option value="3x por semana" \${rec === '3x por semana' ? 'selected' : ''}>✨ 3x por semana</option>
                      <option value="Semanal" \${rec === 'Semanal' ? 'selected' : ''}>📆 Semanal</option>
                      <option value="Apenas hoje" \${rec === 'Apenas hoje' ? 'selected' : ''}>📌 Apenas hoje</option>
                      <option value="Data específica" \${rec === 'Data específica' ? 'selected' : ''}>📅 Data específica</option>
                    </select>
                    <input type="date" id="edit-occ-date-\${o.id}" class="pixel-input" value="\${o.date || state.dayKey}" style="width: 145px;">
                  </div>
                  <div class="flex-row space-between" style="margin-top: 4px;">
                    <button class="pixel-btn btn-sm btn-green" onclick="window.app.saveEditOccurrence('\${o.id}')">Salvar</button>
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.cancelEditOccurrence()">Cancelar</button>
                  </div>
                </div>
              \`;
            }
            return \`
              <div style="background: \${isDone ? '#e6f4ea' : PALETTE.wallCream}; padding: 10px 12px; border: 2px solid \${PALETTE.ink}; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div style="flex: 1;">
                  <strong style="font-size: 16px;">\${o.title}</strong><br>
                  <span style="font-size: 13px; color: \${PALETTE.grayDark};">
                    ⏰ Prazo: \${o.time} · \${o.effort} (+\${o.reward}🐟) · <span style="color: \${PALETTE.purple}; font-weight: 700;">\${rec}</span>
                  </span>
                </div>
                <div style="display: flex; gap: 5px; flex-shrink: 0; align-items: center;">
                  \${isDone
                    ? \`
                      <span style="font-family: var(--font-short); font-size: 13px; color: \${PALETTE.leafGreen}; margin-right: 4px;">FEITO ✓</span>
                      <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.unmarkDone('\${o.id}')" title="Reabrir">Reabrir</button>
                    \`
                    : \`
                      <button class="pixel-btn btn-sm btn-green" onclick="window.app.markDone('\${o.id}')" title="Marcar como Feito">Feito ✓</button>
                      <button class="pixel-btn btn-sm btn-purple" onclick="window.app.retroCheckIn('\${o.id}')" title="Check-in Retroativo">Retro</button>
                    \`
                  }
                  <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditOccurrence('\${o.id}')" title="Editar">✏️</button>
                  <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteOccurrence('\${o.id}')" title="Descartar">🗑️</button>
                </div>
              </div>
            \`;
          }).join('')}
        </div>
      </div>

      <!-- Checklist de Hábitos de Hoje (Briefing & Rotina) -->
      <div class="pixel-card">
        <div class="flex-row space-between">
          <h4>🔄 Hábitos de Hoje (\${state.habits.filter(h => h.completed).length}/\${state.habits.length})</h4>
          <button class="pixel-btn btn-sm btn-purple" onclick="window.app.startBriefing()">📝 Briefing</button>
        </div>
        <p style="font-size: 13px; color: \${PALETTE.grayDark}; margin-bottom: 8px;">Seus hábitos planejados no Briefing para manter o novelo firme:</p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          \${state.habits.map(h => {
            const isEditing = state.editingHabitId === h.id;
            if (isEditing) {
              return \`
                <div class="inline-edit-box">
                  <strong>✏️ Editar Hábito:</strong>
                  <input type="text" id="edit-habit-title-\${h.id}" class="pixel-input" value="\${h.title}">
                  <div class="flex-row">
                    <input type="time" id="edit-habit-window-\${h.id}" class="pixel-input" value="\${h.window}">
                    <select id="edit-habit-freq-\${h.id}" class="pixel-input">
                      <option value="Todos os dias" \${h.frequency === 'Todos os dias' ? 'selected' : ''}>Todos os dias</option>
                      <option value="Dias úteis" \${h.frequency === 'Dias úteis' ? 'selected' : ''}>Dias úteis</option>
                      <option value="3x por semana" \${h.frequency === '3x por semana' ? 'selected' : ''}>3x por semana</option>
                      <option value="Finais de semana" \${h.frequency === 'Finais de semana' ? 'selected' : ''}>Finais de semana</option>
                    </select>
                  </div>
                  <div class="flex-row space-between" style="margin-top: 4px;">
                    <button class="pixel-btn btn-sm btn-green" onclick="window.app.saveEditHabit('\${h.id}')">Salvar</button>
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.cancelEditHabit()">Cancelar</button>
                  </div>
                </div>
              \`;
            }
            return \`
              <div style="background: \${h.completed ? '#e6f4ea' : PALETTE.wallCream}; padding: 10px 12px; border: 2px solid \${PALETTE.ink}; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div style="flex: 1;">
                  <strong style="font-size: 16px;">\${h.title}</strong><br>
                  <span style="font-size: 13px; color: \${PALETTE.grayDark};">🔥 <strong>\${h.streak} dias</strong> de sequência · Até \${h.window} · \${h.frequency} · +8🐟</span>
                </div>
                <div style="display: flex; gap: 5px; align-items: center; flex-shrink: 0;">
                  \${h.completed
                    ? \`
                      <span style="font-family: var(--font-short); font-size: 13px; color: \${PALETTE.leafGreen}; margin-right: 4px;">CUMPRIDO ✓</span>
                      <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.uncompleteHabit('\${h.id}')" title="Reabrir">Reabrir</button>
                    \`
                    : \`<button class="pixel-btn btn-sm btn-green" onclick="window.app.completeHabit('\${h.id}')">Cumprir ✓</button>\`
                  }
                  <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditHabit('\${h.id}')" title="Editar">✏️</button>
                  <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteHabit('\${h.id}')" title="Descartar">🗑️</button>
                </div>
              </div>
            \`;
          }).join('')}
        </div>
      </div>
    \`;
`;
  code = code.slice(0, hojeIdx1) + newHojeLists + code.slice(hojeIdx2);
}

// 9. Update saveCurrentBriefingStepInputs
code = code.replace(
  '    // Passo 3\n    const goalTitle = document.getElementById(\'briefing-goal-title\');',
  '    // Passo 2: Se a usuária digitou no campo mas não clicou no botão "+ Adicionar"\n    const customHabitEl = document.getElementById(\'briefing-custom-habit\');\n    if (customHabitEl && customHabitEl.value.trim()) {\n      const customName = customHabitEl.value.trim();\n      if (!state.briefing.selectedHabits.includes(customName)) {\n        state.briefing.selectedHabits.push(customName);\n      }\n      customHabitEl.value = \'\';\n    }\n\n    // Passo 3\n    const goalTitle = document.getElementById(\'briefing-goal-title\');'
);

// 10. Update Step 2 in renderBriefingWizard
const oldStep2Choices = `          <div class="briefing-choices-grid">
            \${HABIT_PRESETS.map(h => {
              const isSel = b.selectedHabits.includes(h.name);
              return \`
                <div class="briefing-choice-card \${isSel ? 'selected' : ''}" onclick="window.app.toggleBriefingHabit('\${h.name}')">
                  <span>\${h.icon}</span>
                  <span style="flex: 1;">\${h.name}</span>
                  \${isSel ? '<span style="color: ' + PALETTE.leafGreen + ';">✓</span>' : ''}
                </div>
              \`;
            }).join('')}
          </div>

          <div class="flex-row" style="margin-top: 10px;">
            <input type="text" id="briefing-custom-habit" class="pixel-input" placeholder="Outro hábito personalizado">
            <button class="pixel-btn btn-sm btn-purple" onclick="window.app.addCustomBriefingHabit()">+ Adicionar</button>
          </div>`;

const newStep2Choices = `          <div class="briefing-choices-grid">
            \${(() => {
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
                return \`
                  <div class="briefing-choice-card \${isSel ? 'selected' : ''}" onclick="window.app.toggleBriefingHabit('\${h.name}')">
                    <span>\${h.icon}</span>
                    <span style="flex: 1;">\${h.name}</span>
                    \${isSel ? '<span style="color: ' + PALETTE.leafGreen + ';">✓</span>' : ''}
                  </div>
                \`;
              }).join('');
            })()}
          </div>

          <div class="flex-row" style="margin-top: 10px;">
            <input type="text" id="briefing-custom-habit" class="pixel-input" placeholder="Outro hábito personalizado" onkeydown="if (event.key === 'Enter') { event.preventDefault(); window.app.addCustomBriefingHabit(); }">
            <button class="pixel-btn btn-sm btn-purple" onclick="window.app.addCustomBriefingHabit()">+ Adicionar</button>
          </div>`;

code = code.replace(oldStep2Choices, newStep2Choices);

// 11. Update applyBriefingPlan
const oldApply = `    // Injeta hábitos do briefing no catálogo de hábitos
    state.briefing.selectedHabits.forEach(habitTitle => {
      const exists = state.habits.some(h => h.title.toLowerCase() === habitTitle.toLowerCase());
      if (!exists) {
        state.habits.push({
          id: \`hab-\${Date.now()}-\${Math.floor(Math.random() * 1000)}\`,
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

    // Atualiza regras de foco
    state.briefing.selectedApps.forEach(appName => {
      const rule = state.blockRules.find(r => r.name.toLowerCase() === appName.toLowerCase());
      if (rule) {
        rule.rigor = state.briefing.blockRigor;
        rule.windowStart = state.briefing.windowStart;
        rule.windowEnd = state.briefing.windowEnd;
        rule.enabled = true;
      }
    });

    audio.playMeowCelebrate();
    const pal = getYarnPalette(targetGoal.yarnColorId);
    this.setCatSpeech(\`Miau, mamãe! Plano Cat Line do mês aplicado! Já estou com o novelo \${pal.name} na patinha!\`);
    this.updateHUD();
    this.renderActiveTab();
    this.persist();`;

const newApply = `    // Injeta ou atualiza hábitos do briefing no catálogo de hábitos
    state.briefing.selectedHabits.forEach(habitTitle => {
      const existing = state.habits.find(h => h.title.toLowerCase() === habitTitle.toLowerCase());
      if (existing) {
        existing.completed = false; // Pronto para cumprir hoje
      } else {
        state.habits.push({
          id: \`hab-\${Date.now()}-\${Math.floor(Math.random() * 1000)}\`,
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

    // Atualiza regras de foco
    state.briefing.selectedApps.forEach(appName => {
      const rule = state.blockRules.find(r => r.name.toLowerCase() === appName.toLowerCase());
      if (rule) {
        rule.rigor = state.briefing.blockRigor;
        rule.windowStart = state.briefing.windowStart;
        rule.windowEnd = state.briefing.windowEnd;
        rule.enabled = true;
      }
    });

    state.activeTab = 'hoje'; // Direciona para Hoje onde aparecem metas, tarefas e hábitos!
    audio.playMeowCelebrate();
    const pal = getYarnPalette(targetGoal.yarnColorId);
    this.setCatSpeech(\`Miau, mamãe! Plano aplicado com sucesso! Seus \${state.briefing.selectedHabits.length} hábitos e sua meta já estão visíveis aqui na sua rotina de Hoje!\`);
    this.updateHUD();
    this.renderNav();
    this.renderActiveTab();
    this.persist();`;

code = code.replace(oldApply, newApply);

fs.writeFileSync(filePath, code, 'utf8');
console.log('web-preview/app.js patched successfully for agenda, habits and briefing!');
