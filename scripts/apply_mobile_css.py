import os

mobile_rules = """/* Adaptabilidade e Diagramacao Mobile Total (Zero Rolagem Horizontal) */
@media (max-width: 540px) {
  html, body {
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }

  .phone-wrapper {
    max-width: 100% !important;
    width: 100% !important;
    margin: 0 !important;
    overflow-x: hidden !important;
  }

  .phone-frame {
    box-shadow: none !important;
    border: none !important;
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }

  .app-screen {
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
  }

  .app-header {
    padding: 8px 10px !important;
    gap: 6px !important;
  }

  .app-name {
    font-size: 20px !important;
  }

  .hud-currencies {
    gap: 4px !important;
    justify-content: space-between !important;
  }

  .hud-pill {
    padding: 3px 6px !important;
    font-size: 11px !important;
    flex: 1 1 auto !important;
    text-align: center !important;
  }

  .app-content-scroll {
    padding: 8px !important;
    gap: 10px !important;
    width: 100% !important;
    max-width: 100vw !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
  }

  .pixel-card {
    padding: 10px !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  .pixel-card h4 {
    font-size: 15px !important;
  }

  .flex-row {
    flex-wrap: wrap !important;
    gap: 6px !important;
  }

  .flex-row > * {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /* Linhas de tarefas e compromissos que quebravam layout */
  .task-item-card {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
  }

  .task-actions-wrap {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 4px !important;
    justify-content: flex-end !important;
    width: 100% !important;
  }

  .pixel-btn.btn-sm {
    padding: 4px 6px !important;
    font-size: 11px !important;
  }

  .pixel-input, select.pixel-input, input.pixel-input {
    max-width: 100% !important;
    box-sizing: border-box !important;
  }

  /* Barra de navegação inferior com encaixe sem corte */
  .bottom-nav {
    min-height: 58px !important;
    padding: 2px 4px !important;
  }

  .nav-item {
    padding: 3px 4px !important;
    min-width: 44px !important;
    font-size: 10px !important;
  }

  .nav-icon {
    font-size: 17px !important;
  }
}
"""

with open('web-preview/style.css', 'r', encoding='utf8') as f:
    content = f.read()

idx = content.rfind('/* Adapta')
if idx != -1:
    content = content[:idx]

final_css = content + mobile_rules

with open('web-preview/style.css', 'w', encoding='utf8') as f:
    f.write(final_css)

print("style.css updated successfully with comprehensive mobile layout rules.")
