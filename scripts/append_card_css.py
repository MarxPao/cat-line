with open('web-preview/style.css', 'r', encoding='utf8') as f:
    css = f.read()

mobile_card_css = """
/* =========================================================
   REFINAMENTO DE DIAGRAMAÇÃO MOBILE VERTICAL (ZERO ESMAGAMENTO)
   - Banner "Fazendo Agora com a Gatinha"
   - Compromissos Agendados & Hábitos
   - Mimos da Vida Real ("Me Presentear") & Loja
   ========================================================= */

.mobile-stack-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.mobile-stack-info {
  width: 100%;
  min-width: 0;
}

.mobile-action-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  width: 100%;
  margin-top: 2px;
}

.mobile-action-grid-3 .pixel-btn {
  width: 100%;
  text-align: center;
  justify-content: center;
  padding: 7px 4px !important;
  font-size: 11.5px !important;
  white-space: nowrap;
}

.mobile-stack-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  border-radius: 4px;
}

.card-action-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding-top: 6px;
  border-top: 1px dashed rgba(24, 20, 37, 0.2);
  flex-wrap: nowrap;
}

.card-action-footer .pixel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 6px 8px !important;
  font-size: 12px !important;
}

.card-action-footer .pixel-btn.btn-icon {
  width: 36px;
  min-width: 36px;
  flex: 0 0 36px;
  padding: 4px !important;
}

.status-badge-pill {
  font-family: var(--font-short);
  font-size: 10px;
  font-weight: 700;
  padding: 3px 6px;
  border-radius: 4px;
  border: 1.5px solid var(--c-ink);
  flex-shrink: 0;
  white-space: nowrap;
}

.status-badge-pill.done {
  background: #c8e6c9;
  color: #1b5e20;
}

.status-badge-pill.pending {
  background: #ffe0b2;
  color: #bf360c;
}

body.dark-mode .mobile-stack-item {
  background: #28213c !important;
  border-color: #4a3e68 !important;
}

body.dark-mode .card-action-footer {
  border-top-color: rgba(255, 255, 255, 0.15);
}
"""

if "REFINAMENTO DE DIAGRAMAÇÃO MOBILE VERTICAL" not in css:
    css = css + "\n" + mobile_card_css
    with open('web-preview/style.css', 'w', encoding='utf8') as f:
        f.write(css)
    print("Mobile card CSS added successfully.")
else:
    print("Already added.")
