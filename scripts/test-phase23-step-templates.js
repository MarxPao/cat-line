/**
 * scripts/test-phase23-step-templates.js
 * Passos prontos e contrato entre app.js e o motor de metas com passos.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const tpl = require('../web-preview/step-templates.js');
const goalStepEngine = require('../web-preview/goal-step-engine.js');
const engine = goalStepEngine.goalStepEngine || goalStepEngine;

console.log('=== INICIANDO TESTES DE PASSOS PRONTOS E CONTRATO COM O MOTOR DE METAS ===\n');

// 1. Detecção de categoria
assert.strictEqual(tpl.detectCategory('Estudar para a prova de inglês'), 'ESTUDO');
assert.strictEqual(tpl.detectCategory('Treino de calistenia'), 'TREINO');
assert.strictEqual(tpl.detectCategory('Entregar o relatório do cliente'), 'TRABALHO');
assert.strictEqual(tpl.detectCategory('Organizar o quarto'), 'CASA');
assert.strictEqual(tpl.detectCategory('Preparar marmitas da semana'), 'COMENDO_BEBENDO');
assert.strictEqual(tpl.detectCategory('Dormir mais cedo'), 'DESCANSO_SONO');
assert.strictEqual(tpl.detectCategory('Viajar para a praia'), 'GERAL');
assert.strictEqual(tpl.detectCategory(null), 'GERAL');
console.log('✓ 1. Categoria detectada por palavras-chave, com fallback Geral');

// 2. Sugestão devolve cópias e respeita passos existentes
const first = tpl.suggestSteps('Organizar o quarto', []);
assert.ok(first.steps.length >= 4);
first.steps[0].title = 'ALTERADO';
const second = tpl.suggestSteps('Organizar o quarto', ['Levar o lixo e o que não uso mais']);
assert.notStrictEqual(second.steps[0].title, 'ALTERADO', 'catálogo não pode ser mutado');
assert.ok(!second.steps.some(s => s.title === 'Levar o lixo e o que não uso mais'), 'não repete passo existente');
assert.strictEqual(second.steps.length, first.steps.length - 1);
console.log('✓ 2. Sugestões são cópias e não repetem passos já existentes');

// 3. Qualidade dos textos
Object.values(tpl.TEMPLATES).forEach(t => {
  assert.ok(t.steps.length >= 4 && t.steps.length <= 7, 'tamanho razoável: ' + t.label);
  t.steps.forEach(s => {
    assert.ok(s.title.length > 3 && s.title.length <= 60, 'título curto: ' + s.title);
    assert.ok(Number.isInteger(s.estMinutes) && s.estMinutes >= 2 && s.estMinutes <= 30, 'estimativa pequena: ' + s.title);
    assert.ok(!/[()]/.test(s.title), 'sem parênteses descritivos: ' + s.title);
  });
});
console.log('✓ 3. Passos curtos, estimativas pequenas e sem parênteses descritivos');

// 4. Passos sugeridos entram no motor com título e estimativa corretos
const goal = { id: 'g1', steps: [] };
first.steps.forEach(() => {});
const sug = tpl.suggestSteps('Estudar inglês', []);
sug.steps.forEach(s => engine.addStep(goal, { title: s.title, estMinutes: s.estMinutes }));
assert.strictEqual(goal.steps.length, sug.steps.length);
assert.strictEqual(goal.steps[0].title, sug.steps[0].title);
assert.strictEqual(goal.steps[0].estMinutes, sug.steps[0].estMinutes);
console.log('✓ 4. Passos sugeridos entram na meta com título e estimativa');

// 5. Contrato: toda chamada goalStepEngine.<metodo>( no app existe no motor
const appSource = fs.readFileSync(path.join(__dirname, '..', 'web-preview', 'app.js'), 'utf8');
const called = new Set();
for (const m of appSource.matchAll(/goalStepEngine\.([A-Za-z]+)\(/g)) called.add(m[1]);
assert.ok(called.size >= 5, 'deveria achar chamadas ao motor');
called.forEach(name => assert.strictEqual(typeof engine[name], 'function', `app.js chama goalStepEngine.${name}, que não existe no motor`));
console.log('✓ 5. Todas as chamadas do app ao motor de metas existem: ' + [...called].join(', '));

// 6. Contrato de argumentos: formatos que o motor espera
assert.ok(/goalStepEngine\.addStep\(goal, \{/.test(appSource), 'addStep recebe objeto');
assert.ok(/goalStepEngine\.splitStep\(goal, stepId, \{/.test(appSource), 'splitStep recebe objeto de opções');
assert.ok(!/goalStepEngine\.addStep\(goal, title/.test(appSource), 'addStep não pode receber string');

// Reproduz o que os botões fazem: adicionar, dividir e reordenar
const g2 = { id: 'g2', steps: [] };
const a = engine.addStep(g2, { title: 'Passo A', estMinutes: 20 });
engine.addStep(g2, { title: 'Passo B', estMinutes: 10 });
assert.strictEqual(a.title, 'Passo A');
assert.strictEqual(a.estMinutes, 20);
const split = engine.splitStep(g2, a.id, { firstTitle: 'A · Parte 1', secondTitle: 'A · Parte 2', firstEstMinutes: 10, secondEstMinutes: 10 });
assert.strictEqual(split.firstStep.title, 'A · Parte 1');
assert.strictEqual(split.secondStep.estMinutes, 10);
const ids = g2.steps.slice().sort((x, y) => x.order - y.order).map(s => s.id);
ids.splice(0, 0, ids.splice(2, 1)[0]);
engine.reorderSteps(g2, ids);
assert.strictEqual(g2.steps.slice().sort((x, y) => x.order - y.order)[0].title, 'Passo B');
console.log('✓ 6. Adicionar, dividir e reordenar funcionam com os argumentos usados pelo app');

console.log('\n=== TODOS OS TESTES DE PASSOS PRONTOS PASSARAM ===');
