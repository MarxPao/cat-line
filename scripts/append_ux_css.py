import os

new_ux_css = """
/* =========================================================
   PACOTE DE MELHORIAS UX & DESIGN:
   - 5 Abas Ergonômicas sem rolagem
   - Linha do Tempo Vertical (Timeline) com Gestos Swipe
   - Botão Flutuante (+) e Bottom Sheet em 2 Toques
   - Snackbar de Desfazer Exclusão
   - Confetes Pixel Art 8-Bit
   - Modo Escuro (Cozy Night) & Fonte Ampliada (A+)
   - Sub-navegação Pílula (Rotina e Mais)
   ========================================================= */

/* 1. Barra de Navegação de 5 Abas Ergonômica */
.bottom-nav {
  min-height: 64px;
  padding-bottom: env(safe-area-inset-bottom, 4px);
  background: var(--c-fur-white);
  border-top: 3px solid var(--c-ink);
  display: grid !important;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  gap: 4px;
  padding-left: 6px;
  padding-right: 6px;
  overflow: hidden !important;
  z-index: 40;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  padding: 6px 2px !important;
  min-height: 48px;
  min-width: 0 !important;
  border-radius: 6px;
  color: var(--c-gray-dark);
  font-family: var(--font-pixel);
  font-size: 12px !important;
  font-weight: 700;
  transition: all 0.12s ease;
  text-align: center;
  border: 2px solid transparent;
}

.nav-item.active {
  color: var(--c-orange-shadow);
  background: #f7e8d0;
  border: 2px solid var(--c-ink);
  box-shadow: 0 2px 0 var(--c-ink);
  transform: translateY(-2px);
}

.nav-icon {
  font-size: 19px !important;
  line-height: 1;
}

/* 2. Sub-navegação em Pílulas (Rotina: Agenda/Hábitos | Mais: O Fio/Chat/Foco/Backup) */
.subnav-pills-bar {
  display: flex;
  gap: 6px;
  background: #efe0c6;
  padding: 5px;
  border: 2px solid var(--c-ink);
  border-radius: 6px;
  flex-wrap: wrap;
}

.subnav-pill-btn {
  flex: 1 1 auto;
  min-height: 38px;
  padding: 6px 10px;
  font-family: var(--font-pixel);
  font-size: 14px;
  font-weight: 700;
  color: var(--c-ink);
  background: transparent;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.1s;
}

.subnav-pill-btn.active {
  background: var(--c-fur-white);
  border-color: var(--c-ink);
  box-shadow: 2px 2px 0 var(--c-ink);
  color: var(--c-orange-shadow);
}

/* 3. Linha do Tempo Vertical (Timeline do Dia) & Cards com Swipe */
.timeline-section-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-left: 4px;
}

.timeline-swipe-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  touch-action: pan-y;
  user-select: none;
}

.timeline-swipe-bg-left,
.timeline-swipe-bg-right {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  display: flex;
  align-items: center;
  padding: 0 14px;
  font-family: var(--font-short);
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  pointer-events: none;
  z-index: 1;
}

.timeline-swipe-bg-left {
  left: 0;
  background: var(--c-leaf-green);
  justify-content: flex-start;
}

.timeline-swipe-bg-right {
  right: 0;
  background: var(--c-alert-red);
  justify-content: flex-end;
}

.timeline-card {
  position: relative;
  z-index: 2;
  background: var(--c-fur-white);
  border: 2px solid var(--c-ink);
  box-shadow: 2px 2px 0 var(--c-ink);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: transform 0.18s ease-out, background 0.15s;
}

.timeline-card.done-card {
  background: #e6f4ea;
  border-color: #2e7d32;
}

.timeline-card.active-exec-card {
  background: #f0fff4;
  border-left: 6px solid var(--c-leaf-green);
}

.timeline-time-badge {
  min-width: 54px;
  padding: 4px 6px;
  background: var(--c-wall-cream);
  border: 2px solid var(--c-ink);
  font-family: var(--font-short);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  color: var(--c-ink);
  border-radius: 4px;
  flex-shrink: 0;
}

.timeline-check-circle {
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: 6px;
  border: 2px solid var(--c-ink);
  background: var(--c-fur-white);
  box-shadow: 0 2px 0 var(--c-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  color: var(--c-leaf-green);
  font-weight: 700;
  flex-shrink: 0;
}

.timeline-check-circle.checked {
  background: var(--c-leaf-green);
  color: #fff;
}

.timeline-body {
  flex: 1;
  min-width: 0;
}

.timeline-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--c-ink);
  line-height: 1.25;
  word-break: break-word;
}

.timeline-card.done-card .timeline-title {
  text-decoration: line-through;
  opacity: 0.75;
}

.timeline-meta {
  font-size: 12px;
  color: var(--c-gray-dark);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 3px;
  align-items: center;
}

.timeline-quick-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}

.swipe-hint-pill {
  font-size: 11px;
  color: var(--c-gray-dark);
  background: #f5ebd6;
  border: 1px dashed var(--c-gray-dark);
  padding: 3px 8px;
  border-radius: 4px;
  text-align: center;
}

/* 4. Botão Flutuante (+) FAB e Bottom Sheet em 2 Toques */
.fab-add-btn {
  position: absolute;
  right: 16px;
  bottom: 78px;
  width: 54px;
  height: 54px;
  border-radius: 12px;
  background: var(--c-leaf-green);
  color: #fff;
  border: 3px solid var(--c-ink);
  box-shadow: 0 4px 0 #3b6e22, 0 4px 10px rgba(0,0,0,0.35);
  font-family: var(--font-short);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 45;
  transition: transform 0.08s;
}

.fab-add-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #3b6e22;
}

.bottom-sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(24, 20, 37, 0.72);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 90;
  animation: fadeIn 0.15s ease-out;
}

.bottom-sheet-box {
  background: var(--c-wall-cream);
  color: var(--c-ink);
  border-top: 4px solid var(--c-ink);
  border-radius: 14px 14px 0 0;
  padding: 14px 16px calc(18px + env(safe-area-inset-bottom, 0px)) 16px;
  max-height: 86vh;
  overflow-y: auto;
  box-shadow: 0 -6px 24px rgba(0,0,0,0.4);
  animation: slideUpSheet 0.2s ease-out;
}

@keyframes slideUpSheet {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-handle {
  width: 42px;
  height: 5px;
  background: var(--c-gray-mid);
  border-radius: 3px;
  margin: 0 auto 10px auto;
}

/* 5. Snackbar de Desfazer Exclusão */
.undo-snackbar {
  position: absolute;
  left: 14px;
  right: 78px;
  bottom: 78px;
  background: var(--c-ink);
  color: var(--c-fur-white);
  border: 2px solid var(--c-gold);
  box-shadow: 0 4px 12px rgba(0,0,0,0.45);
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  z-index: 80;
  font-size: 13px;
  animation: slideUpSheet 0.18s ease-out;
}

/* 6. Confetes Pixel Art 8-Bit */
.pixel-confetti-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 95;
}

.pixel-confetti-piece {
  position: absolute;
  width: 8px;
  height: 8px;
  border: 1px solid #181425;
  animation: confettiFall 0.95s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes confettiFall {
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(var(--tx, 20px), var(--ty, 120px)) rotate(360deg) scale(0.6);
    opacity: 0;
  }
}

/* 7. Estado Vazio com Ilustração da Gatinha */
.empty-state-cat-box {
  text-align: center;
  padding: 18px 12px;
  background: #fffdf7;
  border: 2px dashed var(--c-gray-mid);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

/* 8. Modo Escuro (Cozy Night Mode) */
body.dark-mode .app-screen {
  background: #1e192d;
  color: #f5ebd6;
}

body.dark-mode .app-header {
  background: #181425;
  border-bottom-color: #3d3356;
}

body.dark-mode .app-name {
  color: #F4C852;
  text-shadow: 1px 1px 0 #000;
}

body.dark-mode .app-daykey {
  color: #c6b8d8;
}

body.dark-mode .hud-pill {
  background: #28213c;
  color: #f5ebd6;
  border-color: #4a3e68;
}

body.dark-mode .pixel-card,
body.dark-mode .goal-yarn-selector,
body.dark-mode .timeline-card,
body.dark-mode .stat-pill-card,
body.dark-mode .speech-bubble-box,
body.dark-mode .bottom-sheet-box {
  background: #28213c !important;
  color: #f5ebd6 !important;
  border-color: #4a3e68 !important;
}

body.dark-mode .pixel-card.cream {
  background: #231d35 !important;
}

body.dark-mode .pixel-card h4,
body.dark-mode .pixel-card p,
body.dark-mode .timeline-title,
body.dark-mode .goal-yarn-selector-title,
body.dark-mode strong {
  color: #f5ebd6 !important;
}

body.dark-mode .timeline-card.done-card {
  background: #1f3528 !important;
  border-color: #63AB3F !important;
}

body.dark-mode .timeline-time-badge,
body.dark-mode .yarn-chip,
body.dark-mode .pixel-input {
  background: #181425 !important;
  color: #f5ebd6 !important;
  border-color: #5A4E7C !important;
}

body.dark-mode .bottom-nav {
  background: #181425;
  border-top-color: #3d3356;
}

body.dark-mode .nav-item {
  color: #b5a6cc;
}

body.dark-mode .nav-item.active {
  background: #2f2647;
  color: #F4C852;
  border-color: #F4C852;
}

body.dark-mode .subnav-pills-bar {
  background: #181425;
  border-color: #4a3e68;
}

body.dark-mode .subnav-pill-btn {
  color: #c6b8d8;
}

body.dark-mode .subnav-pill-btn.active {
  background: #2f2647;
  color: #F4C852;
  border-color: #F4C852;
}

/* 9. Modo Fonte Ampliada (Acessibilidade A+) */
body.large-font .timeline-title,
body.large-font .pixel-card p,
body.large-font .speech-bubble-box {
  font-size: 18px !important;
}

body.large-font .pixel-card h4 {
  font-size: 19px !important;
}

body.large-font .timeline-meta,
body.large-font .pixel-btn.btn-sm {
  font-size: 13.5px !important;
}

/* Espaço extra no final da rolagem para o botão flutuante (+) não cobrir nada */
.app-content-scroll {
  padding-bottom: 84px !important;
}
"""

with open('web-preview/style.css', 'r', encoding='utf8') as f:
    css = f.read()

if "PACOTE DE MELHORIAS UX & DESIGN" not in css:
    css = css + "\n" + new_ux_css
    with open('web-preview/style.css', 'w', encoding='utf8') as f:
        f.write(css)
    print("UX & Design CSS appended successfully.")
else:
    print("Already appended.")
