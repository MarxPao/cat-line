const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'web-preview', 'app.js');
let code = fs.readFileSync(filePath, 'utf8');

// 0. Add persist() method to AppUI
if (!code.includes('persist() {')) {
  code = code.replace('class AppUI {', 'class AppUI {\n  persist() {\n    saveStateToDeviceStorage();\n  }\n');
}

// 1. startGoalTimeCountdown
code = code.replace(
  `  startGoalTimeCountdown() {
    setInterval(() => {
      if (state.cat.isRestMode) return;
      state.goals.forEach(g => {
        if (g.remainingSeconds > 0) {
          g.remainingSeconds = Math.max(0, g.remainingSeconds - 1);
        }
      });
      this.refreshLiveTimersInDOM();
    }, 1000);
  }`,
  `  startGoalTimeCountdown() {
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
  }`
);

// 2. advanceGoalsTime
code = code.replace(
  `    if (state.activeTab === 'hoje' || state.activeTab === 'metas') {
      this.renderActiveTab();
    }
  }`,
  `    if (state.activeTab === 'hoje' || state.activeTab === 'metas') {
      this.renderActiveTab();
    }
    this.persist();
  }`
);

// 3. selectGoalYarn
code = code.replace(
  `    this.setCatSpeech(
      \`Miau! Peguei o novelo \${palette.name} da meta "\${goal.title}" na patinha!\`
    );
    this.renderActiveTab();
  }`,
  `    this.setCatSpeech(
      \`Miau! Peguei o novelo \${palette.name} da meta "\${goal.title}" na patinha!\`
    );
    this.renderActiveTab();
    this.persist();
  }`
);

// 4. markDone
code = code.replace(
  `    audio.playMeowCelebrate();
    this.setCatSpeech(\`Miau, mamãe! No prazo! +\${occ.reward} peixinhos ganhos!\`);
    this.updateHUD();
    this.renderTabHoje();
  }`,
  `    audio.playMeowCelebrate();
    this.setCatSpeech(\`Miau, mamãe! No prazo! +\${occ.reward} peixinhos ganhos!\`);
    this.updateHUD();
    this.renderTabHoje();
    this.persist();
  }`
);

// 5. retroCheckIn
code = code.replace(
  `    audio.playMeowGreeting();
    this.setCatSpeech(\`Check-in retroativo marcado com +\${half}🐟! O importante é continuar!\`);
    this.updateHUD();
    this.renderTabHoje();
  }`,
  `    audio.playMeowGreeting();
    this.setCatSpeech(\`Check-in retroativo marcado com +\${half}🐟! O importante é continuar!\`);
    this.updateHUD();
    this.renderTabHoje();
    this.persist();
  }`
);

// 6. saveEditOccurrence
code = code.replace(
  `    state.editingOccurrenceId = null;
    audio.playMeowGreeting();
    this.setCatSpeech(\`Compromisso "\${occ.title}" atualizado com sucesso!\`);
    this.renderActiveTab();
  }`,
  `    state.editingOccurrenceId = null;
    audio.playMeowGreeting();
    this.setCatSpeech(\`Compromisso "\${occ.title}" atualizado com sucesso!\`);
    this.renderActiveTab();
    this.persist();
  }`
);

// 7. deleteOccurrence
code = code.replace(
  `    if (state.editingOccurrenceId === id) state.editingOccurrenceId = null;
    audio.playBlip();
    this.setCatSpeech(\`"\${title}" foi descartado da sua lista.\`);
    this.renderActiveTab();
  }`,
  `    if (state.editingOccurrenceId === id) state.editingOccurrenceId = null;
    audio.playBlip();
    this.setCatSpeech(\`"\${title}" foi descartado da sua lista.\`);
    this.renderActiveTab();
    this.persist();
  }`
);

// 8. addCommitment
code = code.replace(
  `    audio.playMeowGreeting();
    this.setCatSpeech(\`Novo compromisso "\${title}" enrolado na sua agenda!\`);
    this.renderTabAgenda();
  }`,
  `    audio.playMeowGreeting();
    this.setCatSpeech(\`Novo compromisso "\${title}" enrolado na sua agenda!\`);
    this.renderTabAgenda();
    this.persist();
  }`
);

// 9. createHabit
code = code.replace(
  `    state.habits.push(newHabit);
    audio.playMeowCelebrate();
    this.setCatSpeech(\`Novo hábito "\${title}" criado! A consistência enrola o novelo do sucesso!\`);
    this.renderTabHabitos();
  }`,
  `    state.habits.push(newHabit);
    audio.playMeowCelebrate();
    this.setCatSpeech(\`Novo hábito "\${title}" criado! A consistência enrola o novelo do sucesso!\`);
    this.renderTabHabitos();
    this.persist();
  }`
);

// 10. saveEditHabit
code = code.replace(
  `    state.editingHabitId = null;
    audio.playMeowGreeting();
    this.setCatSpeech(\`Hábito "\${habit.title}" atualizado!\`);
    this.renderTabHabitos();
  }`,
  `    state.editingHabitId = null;
    audio.playMeowGreeting();
    this.setCatSpeech(\`Hábito "\${habit.title}" atualizado!\`);
    this.renderTabHabitos();
    this.persist();
  }`
);

// 11. deleteHabit
code = code.replace(
  `    if (state.editingHabitId === id) state.editingHabitId = null;
    audio.playBlip();
    this.setCatSpeech(\`Hábito "\${title}" descartado.\`);
    this.renderTabHabitos();
  }`,
  `    if (state.editingHabitId === id) state.editingHabitId = null;
    audio.playBlip();
    this.setCatSpeech(\`Hábito "\${title}" descartado.\`);
    this.renderTabHabitos();
    this.persist();
  }`
);

// 12. completeHabit
code = code.replace(
  `    audio.playMeowGreeting();
    this.setCatSpeech(\`Hábito "\${h.title}" cumprido! +8🐟 ganhos com muito orgulho!\`);
    this.updateHUD();
    this.renderTabHabitos();
  }`,
  `    audio.playMeowGreeting();
    this.setCatSpeech(\`Hábito "\${h.title}" cumprido! +8🐟 ganhos com muito orgulho!\`);
    this.updateHUD();
    this.renderTabHabitos();
    this.persist();
  }`
);

// 13. useReserveYarn
code = code.replace(
  `      state.cat.reserveYarns--;
      audio.playMeowCelebrate();
      alert("Novelo reserva ativado! Sua sequência de hábitos de ontem foi protegida.");
      this.renderTabHabitos();`,
  `      state.cat.reserveYarns--;
      audio.playMeowCelebrate();
      alert("Novelo reserva ativado! Sua sequência de hábitos de ontem foi protegida.");
      this.renderTabHabitos();
      this.persist();`
);

// 14. createGoalWithColor
code = code.replace(
  `    state.goals.unshift(newGoal);
    state.selectedGoalId = newId;
    audio.playMeowCelebrate();
    this.setCatSpeech(\`Meta "\${title}" criada para \${days} dias com o novelo \${getYarnPalette(newGoal.yarnColorId).name} na minha patinha!\`);
    this.renderTabMetas();
  }`,
  `    state.goals.unshift(newGoal);
    state.selectedGoalId = newId;
    audio.playMeowCelebrate();
    this.setCatSpeech(\`Meta "\${title}" criada para \${days} dias com o novelo \${getYarnPalette(newGoal.yarnColorId).name} na minha patinha!\`);
    this.renderTabMetas();
    this.persist();
  }`
);

// 15. saveEditGoal
code = code.replace(
  `    state.editingGoalId = null;
    audio.playMeowGreeting();
    this.setCatSpeech(\`Meta "\${g.title}" atualizada com sucesso!\`);
    this.renderTabMetas();
  }`,
  `    state.editingGoalId = null;
    audio.playMeowGreeting();
    this.setCatSpeech(\`Meta "\${g.title}" atualizada com sucesso!\`);
    this.renderTabMetas();
    this.persist();
  }`
);

// 16. deleteGoal
code = code.replace(
  `    audio.playBlip();
    this.setCatSpeech(\`Meta "\${title}" descartada.\`);
    this.renderTabMetas();
  }`,
  `    audio.playBlip();
    this.setCatSpeech(\`Meta "\${title}" descartada.\`);
    this.renderTabMetas();
    this.persist();
  }`
);

// 17. setOvercomingTarget
code = code.replace(
  `  setOvercomingTarget(val) {
    state.overcomingTargetMin = Math.max(1, parseInt(val || '10', 10));
    audio.playBlip();
    this.renderTabInsights();
  }`,
  `  setOvercomingTarget(val) {
    state.overcomingTargetMin = Math.max(1, parseInt(val || '10', 10));
    audio.playBlip();
    this.renderTabInsights();
    this.persist();
  }`
);

// 18. importJsonBackup
code = code.replace(
  `        this.updateHUD();
        this.renderActiveTab();
      } catch (err) {`,
  `        this.updateHUD();
        this.renderActiveTab();
        this.persist();
      } catch (err) {`
);

// 19. toggleEquip
code = code.replace(
  `    audio.playBlip();
    this.renderTabLoja();
  }

  buyItem(item, cost, bond = 0) {`,
  `    audio.playBlip();
    this.renderTabLoja();
    this.persist();
  }

  buyItem(item, cost, bond = 0) {`
);

// 20. buyItem
code = code.replace(
  `      audio.playMeowCelebrate();
      alert("Compra realizada com sucesso!");
      this.updateHUD();
      this.renderTabLoja();
    } else {`,
  `      audio.playMeowCelebrate();
      alert("Compra realizada com sucesso!");
      this.updateHUD();
      this.renderTabLoja();
      this.persist();
    } else {`
);

// 21. toggleRestMode
code = code.replace(
  `    audio.playMeowGreeting();
    alert(\`Modo descanso \${state.cat.isRestMode ? 'ativado! Tempo dos novelos e sequências congelados.' : 'desativado.'}\`);
    this.renderTabLoja();
  }`,
  `    audio.playMeowGreeting();
    alert(\`Modo descanso \${state.cat.isRestMode ? 'ativado! Tempo dos novelos e sequências congelados.' : 'desativado.'}\`);
    this.renderTabLoja();
    this.persist();
  }`
);

// 22. sendMessage
code = code.replace(
  `      state.messages.push({ fromUser: false, text: reply });
      audio.playMeowGreeting();
      this.renderTabConversa();
    }, 400);

    this.renderTabConversa();
  }`,
  `      state.messages.push({ fromUser: false, text: reply });
      audio.playMeowGreeting();
      this.renderTabConversa();
      this.persist();
    }, 400);

    this.renderTabConversa();
    this.persist();
  }`
);

// 23. clearChat
code = code.replace(
  `  clearChat() {
    state.messages = [{ fromUser: false, text: "Histórico apagado com segurança do aparelho!" }];
    this.renderTabConversa();
  }`,
  `  clearChat() {
    state.messages = [{ fromUser: false, text: "Histórico apagado com segurança do aparelho!" }];
    this.renderTabConversa();
    this.persist();
  }`
);

// 24. saveBlockRule
code = code.replace(
  `    audio.playMeowGreeting();
    this.setCatSpeech(\`Regra para o \${name} configurada ao seu gosto!\`);
    this.renderTabFoco();
  }`,
  `    audio.playMeowGreeting();
    this.setCatSpeech(\`Regra para o \${name} configurada ao seu gosto!\`);
    this.renderTabFoco();
    this.persist();
  }`
);

// 25. toggleBlockRule
code = code.replace(
  `    audio.playBlip();
    this.setCatSpeech(r.enabled ? \`Bloqueio do \${r.name} ativado!\` : \`Bloqueio do \${r.name} pausado!\`);
    this.renderTabFoco();
  }`,
  `    audio.playBlip();
    this.setCatSpeech(r.enabled ? \`Bloqueio do \${r.name} ativado!\` : \`Bloqueio do \${r.name} pausado!\`);
    this.renderTabFoco();
    this.persist();
  }`
);

// 26. saveInlineEditBlockRule
code = code.replace(
  `    state.editingBlockRuleId = null;
    audio.playMeowGreeting();
    this.setCatSpeech(\`Regra do \${r.name} atualizada!\`);
    this.renderTabFoco();
  }`,
  `    state.editingBlockRuleId = null;
    audio.playMeowGreeting();
    this.setCatSpeech(\`Regra do \${r.name} atualizada!\`);
    this.renderTabFoco();
    this.persist();
  }`
);

// 27. deleteBlockRule
code = code.replace(
  `    if (state.editingBlockRuleId === id) state.editingBlockRuleId = null;
    audio.playBlip();
    this.setCatSpeech(\`Regra do \${name} descartada.\`);
    this.renderTabFoco();
  }`,
  `    if (state.editingBlockRuleId === id) state.editingBlockRuleId = null;
    audio.playBlip();
    this.setCatSpeech(\`Regra do \${name} descartada.\`);
    this.renderTabFoco();
    this.persist();
  }`
);

// 28. completeOccurrenceFromBlocker
code = code.replace(
  `    this.renderTabFoco();
  }

  // BRIEFING MENSAL & PLANEJAMENTO DE ROTINA`,
  `    this.renderTabFoco();
    this.persist();
  }

  // BRIEFING MENSAL & PLANEJAMENTO DE ROTINA`
);

// 29. applyBriefingPlan
code = code.replace(
  `    audio.playMeowCelebrate();
    const pal = getYarnPalette(targetGoal.yarnColorId);
    this.setCatSpeech(\`Miau, mamãe! Plano Cat Line do mês aplicado! Já estou com o novelo \${pal.name} na patinha!\`);
    this.updateHUD();
    this.renderActiveTab();
  }`,
  `    audio.playMeowCelebrate();
    const pal = getYarnPalette(targetGoal.yarnColorId);
    this.setCatSpeech(\`Miau, mamãe! Plano Cat Line do mês aplicado! Já estou com o novelo \${pal.name} na patinha!\`);
    this.updateHUD();
    this.renderActiveTab();
    this.persist();
  }`
);

// 30. Update Backup & Privacy card in renderTabInsights()
code = code.replace(
  `      <!-- Backup JSON e Privacidade -->
      <div class="pixel-card">
        <h4>💾 Backup & Controle de Dados</h4>
        <p style="font-size: 13px; color: \${PALETTE.grayDark}; margin-bottom: 8px;">Tudo fica guardado localmente no seu aparelho. Exporte ou restaure quando quiser:</p>
        <div class="flex-row" style="flex-wrap: wrap;">
          <button class="pixel-btn btn-sm btn-pink" onclick="window.app.exportJsonBackup()">Exportar Backup JSON</button>
          <button class="pixel-btn btn-sm btn-purple" onclick="window.app.triggerImportBackup()">Importar Backup</button>
          <input type="file" id="json-backup-input" style="display: none;" accept=".json" onchange="window.app.importJsonBackup(event)">
        </div>
      </div>`,
  `      <!-- Memória do Celular & Privacidade -->
      <div class="pixel-card">
        <h4>💾 Memória do Celular & Privacidade</h4>
        <p style="font-size: 13px; color: \${PALETTE.grayDark}; margin-bottom: 8px;">
          <strong>100% Offline e Seguro:</strong> Todos os seus dados (rotina, hábitos, metas, novelos e bloqueios) ficam salvos diretamente na memória do seu celular. Não depende de Supabase nem internet para lembrar do seu progresso!
        </p>
        <div class="flex-row" style="flex-wrap: wrap; gap: 8px;">
          <button class="pixel-btn btn-sm btn-pink" onclick="window.app.exportJsonBackup()">Exportar Backup</button>
          <button class="pixel-btn btn-sm btn-purple" onclick="window.app.triggerImportBackup()">Importar Backup</button>
          <button class="pixel-btn btn-sm btn-red" onclick="window.clearDeviceStorageAndReset()">Limpar Memória</button>
          <input type="file" id="json-backup-input" style="display: none;" accept=".json" onchange="window.app.importJsonBackup(event)">
        </div>
      </div>`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('web-preview/app.js patched successfully!');
