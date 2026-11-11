with open('web-preview/app.js', 'r', encoding='utf8') as f:
    code = f.read().replace('\r\n', '\n')

target = """  exportJsonBackup() {
    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      dayKey: state.dayKey,
      currencies: state.currencies,
      occurrences: state.occurrences,
      habits: state.habits,
      goals: state.goals,
      overcomingTargetMin: state.overcomingTargetMin,
      analyticsData: state.analyticsData
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
    alert("Backup JSON exportado com sucesso! Seus dados estão seguros com você.");
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
        const data = JSON.parse(e.target.result);
        if (data.currencies) state.currencies = data.currencies;
        if (data.occurrences) state.occurrences = data.occurrences;
        if (data.habits) state.habits = data.habits;
        if (data.goals) state.goals = data.goals;
        if (data.overcomingTargetMin) state.overcomingTargetMin = data.overcomingTargetMin;
        audio.playMeowCelebrate();
        alert("Backup importado e restaurado com sucesso!");
        this.updateHUD();
        this.renderActiveTab();
        this.persist();
      } catch (err) {
        alert("Erro ao ler arquivo de backup JSON.");
      }
    };
    reader.readAsText(file);
  }"""

replacement = """  exportJsonBackup() {
    const backupData = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
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
      occurrences: state.occurrences,
      habits: state.habits,
      goals: state.goals,
      briefing: state.briefing,
      blockRules: state.blockRules,
      messages: state.messages,
      realLifeRewards: state.realLifeRewards,
      darkMode: state.darkMode,
      largeFont: state.largeFont,
      notificationsEnabled: state.notificationsEnabled,
      overcomingTargetMin: state.overcomingTargetMin,
      analyticsData: state.analyticsData
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
        const data = JSON.parse(e.target.result);
        if (data.currencies) state.currencies = { ...state.currencies, ...data.currencies };
        if (data.selectedGoalId) state.selectedGoalId = data.selectedGoalId;
        if (data.cat) state.cat = { ...state.cat, ...data.cat };
        if (Array.isArray(data.occurrences)) state.occurrences = data.occurrences;
        if (Array.isArray(data.habits)) state.habits = data.habits;
        if (Array.isArray(data.goals)) state.goals = data.goals;
        if (data.briefing) state.briefing = { ...state.briefing, ...data.briefing, active: false };
        if (Array.isArray(data.blockRules)) state.blockRules = data.blockRules;
        if (Array.isArray(data.messages)) state.messages = data.messages;
        if (Array.isArray(data.realLifeRewards)) state.realLifeRewards = data.realLifeRewards;
        if (data.darkMode !== undefined) state.darkMode = Boolean(data.darkMode);
        if (data.largeFont !== undefined) state.largeFont = Boolean(data.largeFont);
        if (data.notificationsEnabled !== undefined) state.notificationsEnabled = Boolean(data.notificationsEnabled);
        if (data.overcomingTargetMin !== undefined) state.overcomingTargetMin = data.overcomingTargetMin;
        this.applyAccessibilityClasses();
        audio.playMeowCelebrate();
        this.spawnPixelConfetti();
        alert("Backup completo importado e restaurado com sucesso!");
        this.updateHUD();
        this.renderActiveTab();
        this.persist();
      } catch (err) {
        alert("Erro ao ler arquivo de backup JSON.");
      }
    };
    reader.readAsText(file);
  }"""

assert target in code, "backup target not found"
code = code.replace(target, replacement, 1)

with open('web-preview/app.js', 'w', encoding='utf8') as f:
    f.write(code)

print("Backup JSON updated to v2.0.0 full state.")
