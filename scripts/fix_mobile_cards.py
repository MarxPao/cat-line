import re

with open('web-preview/app.js', 'r', encoding='utf8') as f:
    code = f.read().replace('\r\n', '\n')

# =========================================================
# 1. CORRIGIR BANNER "FAZENDO AGORA COM A GATINHA" + NOVELO + CABEÇALHO DA TIMELINE NA ABA HOJE
# =========================================================
old_hoje_banner = """        return `
          <div class="pixel-card" style="margin-bottom: 8px; border-left: 6px solid ${activeObj ? PALETTE.leafGreen : PALETTE.orange}; background: ${activeObj ? "#f0fff4" : "#fff"};">
            <div class="flex-row space-between" style="align-items: center;">
              <div style="flex: 1;">
                <span style="font-size: 11px; font-weight: 700; color: ${activeObj ? PALETTE.leafGreen : PALETTE.orange}; letter-spacing: 0.5px;">⚡ FAZENDO AGORA COM A GATINHA:</span>
                <div style="font-size: 16px; font-weight: 700; color: ${PALETTE.ink}; margin-top: 2px;">
                  ${activeObj ? activeObj.title : "Nenhuma tarefa em execução manual"}
                </div>
                <span style="font-size: 13px; color: ${PALETTE.purple}; font-weight: 700;">
                  ${statusLabel}
                </span>
              </div>
              <div class="flex-row" style="gap: 5px; flex-shrink: 0;">
                ${activeObj
                  ? `
                    <button class="pixel-btn btn-sm btn-green" onclick="${activeObj.type === "habit" ? `window.app.completeHabit('${activeObj.id}')` : `window.app.markDone('${activeObj.id}')`}">✓ Feito</button>
                    <button class="pixel-btn btn-sm btn-purple" onclick="window.app.openFocusTimer(25)" title="Iniciar temporizador Pomodoro">🧶 Pomodoro</button>
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.stopActiveExecution()" title="Pausar execução">⏸️ Pausar</button>
                  `
                  : ""
                }
              </div>
            </div>
          </div>
        `;"""

new_hoje_banner = """        return `
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
        `;"""

assert old_hoje_banner in code, "old_hoje_banner not found"
code = code.replace(old_hoje_banner, new_hoje_banner, 1)

# Briefing card in Hoje
old_briefing_card = """      <!-- Card do Briefing Mensal & Planejamento de Rotina -->
      <div class="pixel-card cream" style="border: 3px solid ${PALETTE.cozyPurple}; box-shadow: 3px 3px 0 ${PALETTE.cozyPurple};">
        <div class="flex-row space-between">
          <div class="flex-row" style="flex: 1;">
            <span style="font-size: 24px;">📝</span>
            <div>
              <strong style="font-size: 16px;">Briefing Mensal · Rotina & Metas</strong><br>
              <span style="font-size: 13px; color: ${PALETTE.grayDark};">Último: ${state.briefing.lastCompletedDate} · Planeje ou edite sua rotina</span>
            </div>
          </div>
          <button class="pixel-btn btn-sm btn-purple" onclick="window.app.startBriefing()">
            ${state.briefing.hasDoneOnce ? 'Editar Briefing' : 'Fazer Briefing'}
          </button>
        </div>
      </div>"""

new_briefing_card = """      <!-- Card do Briefing Mensal & Planejamento de Rotina -->
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
      </div>"""

assert old_briefing_card in code, "old_briefing_card not found"
code = code.replace(old_briefing_card, new_briefing_card, 1)

# Novelo track row in Hoje
old_novelo_row = """          <div class="novelo-bar-track-row">
            <canvas class="novelo-winding-canvas" data-goal-id="${selectedGoal.id}"></canvas>
            <div class="flex-row" style="gap: 4px; flex-shrink: 0;">
              <button class="pixel-btn btn-sm" onclick="window.app.advanceGoalsTime(900)" title="Avançar 15 minutos">-15m ⏳</button>
              <button class="pixel-btn btn-sm btn-gold" onclick="window.app.advanceGoalsTime(86400)" title="Avançar 1 dia">-1d ⏳</button>
            </div>
          </div>"""

new_novelo_row = """          <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
            <canvas class="novelo-winding-canvas" data-goal-id="${selectedGoal.id}" style="width: 100%; height: 50px;"></canvas>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
              <button class="pixel-btn btn-sm" onclick="window.app.advanceGoalsTime(900)" title="Avançar 15 minutos">⏳ Avançar 15m</button>
              <button class="pixel-btn btn-sm btn-gold" onclick="window.app.advanceGoalsTime(86400)" title="Avançar 1 dia">⏳ Avançar 1 Dia</button>
            </div>
          </div>"""

assert old_novelo_row in code, "old_novelo_row not found"
code = code.replace(old_novelo_row, new_novelo_row, 1)

# Timeline header + Mimos banner in Hoje
old_timeline_hdr = """        <div class="flex-row space-between" style="align-items: center;">
          <div>
            <h4 style="margin-bottom: 2px;">⏳ Linha do Tempo de Hoje (${state.occurrences.filter(o => o.state === 'FEITO').length + state.habits.filter(h => h.completed).length}/${state.occurrences.length + state.habits.length})</h4>
            <span style="font-size: 12px; color: ${PALETTE.grayDark};">Compromissos e Hábitos ordenados por horário</span>
          </div>
          <div class="flex-row" style="gap: 4px;">
            <button class="pixel-btn btn-sm btn-green" onclick="window.app.openQuickCreateSheet('occurrence')">＋ Criar</button>
            <button class="pixel-btn btn-sm btn-purple" onclick="window.app.startBriefing()">📝 Briefing</button>
          </div>
        </div>"""

new_timeline_hdr = """        <div class="mobile-stack-card" style="margin-bottom: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div>
              <h4 style="margin-bottom: 2px;">⏳ Linha do Tempo de Hoje (${state.occurrences.filter(o => o.state === 'FEITO').length + state.habits.filter(h => h.completed).length}/${state.occurrences.length + state.habits.length})</h4>
              <span style="font-size: 12px; color: ${PALETTE.grayDark};">Compromissos e Hábitos ordenados por horário</span>
            </div>
            <button class="pixel-btn btn-sm btn-green" style="flex-shrink: 0;" onclick="window.app.openQuickCreateSheet('occurrence')">＋ Criar</button>
          </div>
        </div>"""

assert old_timeline_hdr in code, "old_timeline_hdr not found"
code = code.replace(old_timeline_hdr, new_timeline_hdr, 1)

old_mimos_hoje_banner = """      <div class="pixel-card" style="margin-top: 12px; background: #fffdf5; border: 2px solid ${PALETTE.orange};">
        <div class="flex-row space-between" style="align-items: center;">
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 20px;">🎁</span>
              <strong style="font-size: 15px; color: ${PALETTE.orange};">Mimos da Vida Real</strong>
            </div>
            <p style="font-size: 13px; color: ${PALETTE.ink}; margin: 3px 0 0 0;">
              Você acumulou <strong>${state.currencies.peixinhos} 🐟</strong>! Que tal se presentear com algo que você ama?
            </p>
          </div>
          <button class="pixel-btn btn-sm btn-gold" onclick="window.app.switchTab('loja')" style="flex-shrink: 0; margin-left: 8px;">
            Ver Mimos 🎁
          </button>
        </div>
      </div>"""

new_mimos_hoje_banner = """      <div class="pixel-card" style="margin-top: 12px; background: #fffdf5; border: 2px solid ${PALETTE.orange};">
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
      </div>"""

assert old_mimos_hoje_banner in code, "old_mimos_hoje_banner not found"
code = code.replace(old_mimos_hoje_banner, new_mimos_hoje_banner, 1)

# =========================================================
# 2. CORRIGIR OS CARDS DA LINHA DO TEMPO (TIMELINE) EM buildUnifiedTimelineHtml()
# =========================================================
old_timeline_card = """      return `
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
      `;"""

new_timeline_card = """      return `
        <div class="timeline-swipe-wrapper" data-kind="${item.kind}" data-id="${item.id}" data-done="${item.done}">
          <div class="timeline-swipe-bg-left">✓ Concluir (+${item.reward}🐟)</div>
          <div class="timeline-swipe-bg-right">🗑️ Excluir</div>
          <div class="timeline-card ${item.done ? 'done-card' : ''} ${isActiveExec ? 'active-exec-card' : ''}" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <div style="display: flex; align-items: flex-start; gap: 10px; width: 100%;">
              <button class="timeline-check-circle ${item.done ? 'checked' : ''}" onclick="${toggleFn}" title="${item.done ? 'Reabrir' : 'Marcar como concluído'}">
                ${item.done ? '✓' : ''}
              </button>
              <div class="timeline-body" style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px;">
                  <div class="timeline-title">${item.title}</div>
                  <span class="timeline-time-badge">⏰ ${item.time}</span>
                </div>
                <div class="timeline-meta">
                  <span>${item.subtitle}</span>
                  <span style="color: ${PALETTE.orange}; font-weight: 700;">+${item.reward}🐟</span>
                </div>
              </div>
            </div>
            <div class="card-action-footer">
              ${item.done
                ? `<button class="pixel-btn btn-sm btn-secondary" style="flex: 1;" onclick="${toggleFn}">↩ Reabrir</button>`
                : `
                  <button class="pixel-btn btn-sm btn-green" style="flex: 1.2;" onclick="${toggleFn}">✓ Feito</button>
                  ${isActiveExec
                    ? `<button class="pixel-btn btn-sm btn-purple" style="flex: 1.2;" onclick="window.app.stopActiveExecution()">⏸️ Pausar ⚡</button>`
                    : `<button class="pixel-btn btn-sm" style="flex: 1.2;" onclick="window.app.startActiveExecution('${item.id}', '${item.kind}')">▶️ Fazer Agora</button>`
                  }
                `
              }
              <button class="pixel-btn btn-sm btn-icon" onclick="${editFn}" title="Editar">✏️</button>
              <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="${delFn}" title="Excluir">🗑️</button>
            </div>
          </div>
        </div>
      `;"""

assert old_timeline_card in code, "old_timeline_card not found"
code = code.replace(old_timeline_card, new_timeline_card, 1)

# =========================================================
# 3. CORRIGIR ABA AGENDA (FORMULÁRIO E BOTÕES DOS COMPROMISSOS AGENDADOS) E HÁBITOS
# =========================================================
old_agenda_item = """            return `
              <div style="background: ${isDone ? '#e6f4ea' : '#fff'}; padding: 10px 12px; border: 2px solid ${PALETTE.ink}; font-size: 15px; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div style="flex: 1;">
                  <strong style="font-size: 16px;">${o.title}</strong><br>
                  <span style="font-size: 13px; color: ${PALETTE.grayDark};">
                    ⏰ ${o.time} · ${o.effort} (+${o.reward}🐟) · <span style="color: ${PALETTE.purple}; font-weight: 700;">${rec}</span>
                    ${o.date ? ' · ' + o.date : ''}
                  </span><br>
                  <span style="font-size: 12px; font-weight: 700; color: ${isDone ? PALETTE.leafGreen : PALETTE.orangeShadow};">
                    ${isDone ? 'FEITO ✓' : 'PENDENTE'}
                  </span>
                </div>
                <div class="task-actions-wrap" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                  ${isDone
                    ? `
                      <span style="font-family: var(--font-short); font-size: 13px; color: ${PALETTE.leafGreen}; margin-right: 4px;">FEITO ✓</span>
                      <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.unmarkDone('${o.id}')" title="Reabrir">Reabrir</button>
                    `
                    : `
                      <button class="pixel-btn btn-sm btn-green" onclick="window.app.markDone('${o.id}')" title="Marcar como Feito">Feito ✓</button>
                      <button class="pixel-btn btn-sm btn-purple" onclick="window.app.retroCheckIn('${o.id}')" title="Check-in Retroativo">Retro</button>
                    `
                  }
                  <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditOccurrence('${o.id}')" title="Editar">✏️</button>
                  <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteOccurrence('${o.id}')" title="Descartar">🗑️</button>
                </div>
              </div>
            `;"""

new_agenda_item = """            return `
              <div class="mobile-stack-item" style="background: ${isDone ? '#e6f4ea' : '#fff'}; padding: 10px 12px; border: 2px solid ${PALETTE.ink}; font-size: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                  <div style="flex: 1; min-width: 0;">
                    <strong style="font-size: 16px; display: block; word-break: break-word;">${o.title}</strong>
                    <span style="font-size: 13px; color: ${PALETTE.grayDark}; display: block; margin-top: 2px;">
                      ⏰ ${o.time} · Esforço ${o.effort} (+${o.reward}🐟) · <span style="color: ${PALETTE.cozyPurple}; font-weight: 700;">${rec}</span>
                    </span>
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
            `;"""

assert old_agenda_item in code, "old_agenda_item not found"
code = code.replace(old_agenda_item, new_agenda_item, 1)

# Hábitos item in renderTabHabitos
old_habitos_item = """            return `
              <div style="background: ${h.completed ? '#e6f4ea' : PALETTE.wallCream}; padding: 10px 12px; border: 2px solid ${PALETTE.ink}; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div style="flex: 1;">
                  <strong style="font-size: 16px;">${h.title}</strong><br>
                  <span style="font-size: 14px; color: ${PALETTE.grayDark};">🔥 Sequência: <strong>${h.streak} dias</strong> · Recorde: ${h.bestStreak || h.streak}d · Janela até ${h.window} · ${h.frequency || 'Diário'}</span>
                </div>
                <div class="task-actions-wrap" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                  ${h.completed
                    ? `<span style="font-family: var(--font-short); font-size: 13px; color: ${PALETTE.leafGreen}; margin-right: 4px;">CUMPRIDO ✓</span>`
                    : `<button class="pixel-btn btn-sm btn-green" onclick="window.app.completeHabit('${h.id}')">Cumprir</button>`
                  }
                  <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditHabit('${h.id}')" title="Editar">✏️</button>
                  <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteHabit('${h.id}')" title="Descartar">🗑️</button>
                </div>
              </div>
            `;"""

new_habitos_item = """            return `
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
            `;"""

assert old_habitos_item in code, "old_habitos_item not found"
code = code.replace(old_habitos_item, new_habitos_item, 1)

# =========================================================
# 4. CORRIGIR ABA LOJA / GATINHA ("MIMOS DA VIDA REAL / ME PRESENTEAR" + "LOJINHA DA GATINHA")
# =========================================================
old_reward_card = """            return `
              <div style="background: ${canAfford ? '#ffffff' : '#fafafa'}; padding: 10px 12px; border: 2px solid ${canAfford ? PALETTE.ink : PALETTE.borderGray}; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;">
                  <span style="font-size: 26px; flex-shrink: 0; background: ${PALETTE.wallCream}; padding: 4px; border: 1px solid ${PALETTE.ink}; border-radius: 4px;">${rw.icon}</span>
                  <div style="min-width: 0;">
                    <strong style="font-size: 14px; color: ${PALETTE.ink}; word-break: break-word;">${rw.title}</strong><br>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 3px;">
                      <span class="pixel-badge" style="background: #fff3e0; color: ${PALETTE.orange}; font-weight: 700; font-size: 11px; padding: 2px 5px; border: 1px solid ${PALETTE.orange};">
                        ${rw.cost} 🐟
                      </span>
                      ${rw.redeemedCount > 0 ? `
                        <span class="pixel-badge" style="background: #e8f5e9; color: #2e7d32; font-weight: 700; font-size: 11px; padding: 2px 5px; border: 1px solid #2e7d32;">
                          ✨ ${rw.redeemedCount}x desfrutado
                        </span>
                      ` : ''}
                      ${rw.lastRedeemedAt ? `
                        <span style="font-size: 11px; color: ${PALETTE.grayDark};">Último: ${rw.lastRedeemedAt}</span>
                      ` : ''}
                    </div>
                  </div>
                </div>
                <div class="task-actions-wrap" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
                  ${canAfford ? `
                    <button class="pixel-btn btn-sm btn-green" onclick="window.app.redeemRealReward('${rw.id}')" title="Resgatar agora">
                      🎁 Me Presentear
                    </button>
                  ` : `
                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.redeemRealReward('${rw.id}')" title="Faltam ${rw.cost - state.currencies.peixinhos}🐟">
                      Faltam ${rw.cost - state.currencies.peixinhos}🐟
                    </button>
                  `}
                  <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditRealReward('${rw.id}')" title="Editar mimo">✏️</button>
                  <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteRealReward('${rw.id}')" title="Excluir mimo">🗑️</button>
                </div>
              </div>
            `;"""

new_reward_card = """            return `
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
            `;"""

assert old_reward_card in code, "old_reward_card not found"
code = code.replace(old_reward_card, new_reward_card, 1)

# Form de novo mimo na Loja
old_new_reward_form = """          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; gap: 8px; align-items: center;">
              <input type="text" id="new-reward-title" placeholder="Ex: Café na cafeteria, Dia de spa, Pedir pizza..." style="flex: 1; padding: 7px 9px; border: 2px solid ${PALETTE.ink}; font-family: var(--font-body); font-size: 14px;">
              <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                <input type="number" id="new-reward-cost" value="40" min="5" step="5" style="width: 65px; padding: 7px 6px; border: 2px solid ${PALETTE.ink}; font-family: var(--font-body); font-size: 14px;" title="Custo em Peixinhos">
                <span style="font-size: 14px; font-weight: bold;">🐟</span>
              </div>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                <span style="font-size: 12px; color: ${PALETTE.grayDark};">Ícone:</span>
                ${popularEmojis.slice(0, 10).map(em => `
                  <button type="button" class="pixel-btn btn-sm ${state.newRewardEmoji === em ? 'btn-gold' : 'btn-secondary'}" style="padding: 2px 5px; font-size: 13px;" onclick="window.app.setNewRewardEmoji('${em}')">${em}</button>
                `).join('')}
              </div>
              <button class="pixel-btn btn-sm btn-gold" onclick="window.app.createRealReward()">
                ➕ Adicionar Mimo
              </button>
            </div>
          </div>"""

new_new_reward_form = """          <div style="display: flex; flex-direction: column; gap: 8px;">
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
          </div>"""

assert old_new_reward_form in code, "old_new_reward_form not found"
code = code.replace(old_new_reward_form, new_new_reward_form, 1)

# Lojinha da Gatinha items
old_shop_item = """            return `
              <div style="background: ${isEquipped ? '#f0fff4' : PALETTE.wallCream}; padding: 10px 12px; border: 2px solid ${PALETTE.ink}; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                  <span style="font-size: 24px;">${item.icon}</span>
                  <div>
                    <strong style="font-size: 15px;">${item.name}</strong><br>
                    <span style="font-size: 13px; color: ${PALETTE.grayDark};">${item.desc}</span>
                  </div>
                </div>
                <div style="flex-shrink: 0;">
                  ${actionBtn}
                </div>
              </div>
            `;"""

new_shop_item = """            return `
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
            `;"""

assert old_shop_item in code, "old_shop_item not found"
code = code.replace(old_shop_item, new_shop_item, 1)

# =========================================================
# 5. CORRIGIR CARDS DE METAS (renderTabMetas) PARA NÃO ESPREMER BOTÕES NO MOBILE
# =========================================================
old_goal_card_hdr = """                <div class="flex-row space-between">
                  <div class="flex-row" style="flex: 1;">
                    <canvas class="yarn-color-dot mini-yarn-canvas" width="22" height="22" data-color="${g.yarnColorId}"></canvas>
                    <div>
                      <strong style="font-size: 16px;">${g.horizon} · ${g.title} · ${currentDays} dias</strong><br>
                      <span style="font-size: 14px; color: ${pal.shadow}; font-weight: 700;">Novelo ${pal.name} · ⏳ <span id="goal-timer-${g.id}">${formatRemainingTime(g.remainingSeconds)}</span></span>
                    </div>
                  </div>
                  <div class="flex-row">
                    <button class="pixel-btn btn-sm ${isSel ? 'btn-gold' : ''}" onclick="window.app.selectGoalYarn('${g.id}')">
                      ${isSel ? '🐾 Na Mão ✓' : 'Na Mão 🐾'}
                    </button>
                    <button class="pixel-btn btn-sm btn-icon" onclick="window.app.startEditGoal('${g.id}')" title="Editar">✏️</button>
                    <button class="pixel-btn btn-sm btn-danger btn-icon" onclick="window.app.deleteGoal('${g.id}')" title="Descartar">🗑️</button>
                  </div>
                </div>"""

new_goal_card_hdr = """                <div style="display: flex; flex-direction: column; gap: 8px;">
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
                </div>"""

assert old_goal_card_hdr in code, "old_goal_card_hdr not found"
code = code.replace(old_goal_card_hdr, new_goal_card_hdr, 1)

with open('web-preview/app.js', 'w', encoding='utf8') as f:
    f.write(code)

print("All mobile card layouts in Hoje, Agenda, Habitos, Metas, and Loja refactored cleanly!")
