with open('web-preview/app.js', 'r', encoding='utf8') as f:
    js = f.read()

# 1. Ajuste no formulário de novo compromisso na Agenda
# De: <select id="new-task-effort" class="pixel-input" style="width: 150px;">
# Para: <select id="new-task-effort" class="pixel-input" style="flex: 1; min-width: 120px;">
js = js.replace(
    '<select id="new-task-effort" class="pixel-input" style="width: 150px;">',
    '<select id="new-task-effort" class="pixel-input" style="flex: 1; min-width: 110px;">'
)
# De: <input type="date" id="new-task-date" class="pixel-input" value="${state.dayKey}" style="width: 155px;"
# Para: <input type="date" id="new-task-date" class="pixel-input" value="${state.dayKey}" style="flex: 1; min-width: 120px;"
js = js.replace(
    '<input type="date" id="new-task-date" class="pixel-input" value="${state.dayKey}" style="width: 155px;"',
    '<input type="date" id="new-task-date" class="pixel-input" value="${state.dayKey}" style="flex: 1; min-width: 120px;"'
)

# 2. Ajuste nos inputs de data de ocorrência em edição
js = js.replace(
    'style="width: 145px;"',
    'style="flex: 1; min-width: 120px;"'
)

# 3. Adicionar classes responsivas 'task-item-card' e 'task-actions-wrap' nos cards de tarefas de Hoje e Agenda
# De: <div style="display: flex; gap: 5px; flex-shrink: 0; align-items: center;">
# Para: <div class="task-actions-wrap" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
js = js.replace(
    '<div style="display: flex; gap: 5px; flex-shrink: 0; align-items: center;">',
    '<div class="task-actions-wrap" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">'
)

# De: <div style="display: flex; gap: 5px; align-items: center; flex-shrink: 0;">
# Para: <div class="task-actions-wrap" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
js = js.replace(
    '<div style="display: flex; gap: 5px; align-items: center; flex-shrink: 0;">',
    '<div class="task-actions-wrap" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">'
)

# De: <div style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">
# Para: <div class="task-actions-wrap" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">
js = js.replace(
    '<div style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">',
    '<div class="task-actions-wrap" style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center;">'
)

# Container do card com flex-wrap em telas menores
# De: border: 2px solid ${PALETTE.ink}; display: flex; justify-content: space-between; align-items: center; gap: 8px;
# Para: border: 2px solid ${PALETTE.ink}; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;
js = js.replace(
    'display: flex; justify-content: space-between; align-items: center; gap: 8px;',
    'display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;'
)

with open('web-preview/app.js', 'w', encoding='utf8') as f:
    f.write(js)

print("web-preview/app.js updated successfully with responsive task action wrapping.")
