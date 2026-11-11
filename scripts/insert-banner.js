const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'web-preview', 'app.js');
let code = fs.readFileSync(filePath, 'utf8');

const target = '      <!-- Cena Canvas da Gatinha Caminhando e Brincando com o Novelo na Mão -->';

const banner = [
  '      <!-- Banner Dinâmico: Espelho da Rotina da Cliente -->',
  '      ${(() => {',
  '        let activeObj = null;',
  '        if (state.activeExecutionId) {',
  '          if (state.activeExecutionType === "habit") {',
  '            const h = state.habits.find(x => x.id === state.activeExecutionId);',
  '            if (h) activeObj = { id: h.id, type: "habit", title: h.title, cat: detectTaskCategory(h) };',
  '          } else {',
  '            const o = state.occurrences.find(x => x.id === state.activeExecutionId);',
  '            if (o) activeObj = { id: o.id, type: "occurrence", title: o.title, cat: detectTaskCategory(o) };',
  '          }',
  '        }',
  '        const catLabels = {',
  '          ESTUDO: "📖 Estudando e lendo com você na estante",',
  '          TREINO: "🏃‍♀️ Treinando calistenia no tapete com faixinha",',
  '          TRABALHO: "💻 Trabalhando no notebook na escrivaninha",',
  '          CASA: "🧹 Cuidando da casa e varrendo com vassourinha",',
  '          COMENDO_BEBENDO: "💧 Hidratando e nutrindo na tigelinha",',
  '          DESCANSO_SONO: "💤 Descansando e dormindo na caminha"',
  '        };',
  '        const statusLabel = activeObj ? (catLabels[activeObj.cat] || "🐾 Focando juntinho com você") : "🧶 Modo Livre · Brincando com o Novelo";',
  '',
  '        return `',
  '          <div class="pixel-card" style="margin-bottom: 8px; border-left: 6px solid ${activeObj ? PALETTE.leafGreen : PALETTE.orange}; background: ${activeObj ? "#f0fff4" : "#fff"};">',
  '            <div class="flex-row space-between" style="align-items: center;">',
  '              <div style="flex: 1;">',
  '                <span style="font-size: 11px; font-weight: 700; color: ${activeObj ? PALETTE.leafGreen : PALETTE.orange}; letter-spacing: 0.5px;">⚡ FAZENDO AGORA COM A GATINHA:</span>',
  '                <div style="font-size: 16px; font-weight: 700; color: ${PALETTE.ink}; margin-top: 2px;">',
  '                  ${activeObj ? activeObj.title : "Nenhuma tarefa em execução manual"}',
  '                </div>',
  '                <span style="font-size: 13px; color: ${PALETTE.purple}; font-weight: 700;">',
  '                  ${statusLabel}',
  '                </span>',
  '              </div>',
  '              <div class="flex-row" style="gap: 5px; flex-shrink: 0;">',
  '                ${activeObj',
  '                  ? `',
  '                    <button class="pixel-btn btn-sm btn-green" onclick="${activeObj.type === "habit" ? `window.app.completeHabit(\'${activeObj.id}\')` : `window.app.markDone(\'${activeObj.id}\')`}">✓ Feito</button>',
  '                    <button class="pixel-btn btn-sm btn-secondary" onclick="window.app.stopActiveExecution()" title="Pausar execução">⏸️ Pausar</button>',
  '                  `',
  '                  : ""',
  '                }',
  '              </div>',
  '            </div>',
  '          </div>',
  '        `;',
  '      })()}',
  ''
].join('\n');

if (!code.includes('FAZENDO AGORA COM A GATINHA')) {
  code = code.replace(target, banner + '\n' + target);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Banner added successfully!');
} else {
  console.log('Banner already exists.');
}
