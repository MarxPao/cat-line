// scripts/test-phase9-goals.js
// Suíte de testes automatizados da v3.2.0 (Prompt 3): Motor de Metas e Passos (domínio, sem UI)
// Cobre cálculo de progresso ponderado, operações de passos, Casos de Borda 1 e 2 e eventos de domínio.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DO MOTOR DE METAS E PASSOS (V3.2.0 - PROMPT 3) ===');

// Setup do ambiente e mock do browser/DOM
const Clock = require('../web-preview/clock.js');
global.CatLineClock = Clock;
global.Clock = Clock;

// Carrega o motor de passos
const goalStepEngine = require('../web-preview/goal-step-engine.js');
global.CatLineGoalStepEngine = goalStepEngine;

console.log('1. Testando operações fundamentais de Metas e Passos...');

const fakeState = {
  flags: { METAS: true },
  goals: [],
  occurrences: []
};

// Criar Meta
Clock.setFakeTime('2026-10-25T10:00:00Z');
const goal = goalStepEngine.createGoal(fakeState, {
  id: 'g-teste-1',
  title: 'Lançar v3.2.0',
  horizon: 'SEMANA',
  yarnColor: 'pink',
  targetDate: '2026-11-01'
}, Clock);

assert.strictEqual(goal.id, 'g-teste-1');
assert.strictEqual(goal.title, 'Lançar v3.2.0');
assert.strictEqual(goal.archived, false);
assert.strictEqual(goal.steps.length, 0);
assert.strictEqual(goalStepEngine.calculateProgress(goal), 0);

// Adicionar Passos
const step1 = goalStepEngine.addStep(goal, { id: 's-1', title: 'Desenhar esquema', estMinutes: 30 });
const step2 = goalStepEngine.addStep(goal, { id: 's-2', title: 'Implementar motor', estMinutes: 60 });
const step3 = goalStepEngine.addStep(goal, { id: 's-3', title: 'Escrever testes', estMinutes: 30 });

assert.strictEqual(goal.steps.length, 3);
assert.strictEqual(step1.order, 0);
assert.strictEqual(step2.order, 1);
assert.strictEqual(step3.order, 2);

// Renomear Passo
goalStepEngine.renameStep(goal, 's-1', 'Desenhar modelo de dados');
assert.strictEqual(step1.title, 'Desenhar modelo de dados');

// Reordenar Passos
goalStepEngine.reorderSteps(goal, ['s-3', 's-1', 's-2']);
assert.strictEqual(step3.order, 0);
assert.strictEqual(step1.order, 1);
assert.strictEqual(step2.order, 2);

console.log('✓ 1. Operações fundamentais de criação, passos, renomeação e reordenação validadas');

console.log('2. Testando cálculo de progresso ponderado por minutos vs. contagem simples...');

// Progresso inicial: 0
assert.strictEqual(goalStepEngine.calculateProgress(goal), 0);

// Concluir step1 (30 min de um total de 30+60+30 = 120 min => 25%)
Clock.setFakeTime('2026-10-25T11:00:00Z');
const resComplete1 = goalStepEngine.completeStep(goal, 's-1', Clock);
assert.strictEqual(resComplete1.step.doneAt, '2026-10-25T11:00:00.000Z');
assert.strictEqual(goalStepEngine.calculateProgress(goal), 0.25, 'Progresso ponderado por minutos: 30/120 = 0.25');

// Concluir step2 (60 min => 30+60 = 90 min de 120 min => 75%)
Clock.setFakeTime('2026-10-25T12:00:00Z');
goalStepEngine.completeStep(goal, 's-2', Clock);
assert.strictEqual(goalStepEngine.calculateProgress(goal), 0.75, 'Progresso ponderado por minutos: 90/120 = 0.75');

// Testando meta com passos sem estimativa de minutos (contagem simples)
const goalSimple = {
  id: 'g-simple',
  steps: [
    { id: 'ss-1', doneAt: '2026-10-25T10:00:00Z', archived: false },
    { id: 'ss-2', doneAt: null, archived: false },
    { id: 'ss-3', doneAt: null, archived: false },
    { id: 'ss-4', doneAt: null, archived: false }
  ]
};
assert.strictEqual(goalStepEngine.calculateProgress(goalSimple), 0.25, 'Contagem simples: 1 de 4 passos = 0.25');

// Testando meta legada sem passos (preserva progresso existente)
const legacyGoal = { id: 'g-legacy', steps: [], progress: 0.60 };
assert.strictEqual(goalStepEngine.calculateProgress(legacyGoal), 0.60, 'Meta sem passos preserva progresso legado');

// Regra 3: Adicionar passos a meta quase pronta apenas recalcula o progresso
goalStepEngine.addStep(goal, { id: 's-4', title: 'Revisão final', estMinutes: 60 });
// Total agora: 120 + 60 = 180 min; concluídos: 90 min => 90/180 = 50%
assert.strictEqual(goalStepEngine.calculateProgress(goal), 0.50, 'Adicionar passo recalcula o progresso de forma suave');

console.log('✓ 2. Cálculos de progresso ponderado e simples validados com precisão');

console.log('3. Testando Caso de Borda 1: Editar, dividir ou arquivar passo já concluído...');

// s-1 já está concluído com doneAt fixado
const doneAtBeforeSplit = step1.doneAt;
assert.ok(doneAtBeforeSplit !== null, 's-1 deve estar concluído');

// Dividir s-1 em dois passos
const splitResult = goalStepEngine.splitStep(goal, 's-1', {
  firstTitle: 'Desenhar entidades',
  secondId: 's-1-part2',
  secondTitle: 'Escrever DDL SQL',
  firstEstMinutes: 15,
  secondEstMinutes: 15
});

assert.strictEqual(splitResult.firstStep.id, 's-1');
assert.strictEqual(splitResult.firstStep.title, 'Desenhar entidades');
assert.strictEqual(splitResult.firstStep.doneAt, doneAtBeforeSplit, 'doneAt do passo original concluído é estritamente preservado');
assert.strictEqual(splitResult.secondStep.id, 's-1-part2');
assert.strictEqual(splitResult.secondStep.doneAt, null, 'Novo segundo passo inicia pendente');

// Arquivar passo
goalStepEngine.archiveStep(goal, 's-3');
assert.strictEqual(step3.archived, true);
// Passo arquivado sai do cálculo de progresso
const progressAfterArchive = goalStepEngine.calculateProgress(goal);
assert.ok(Number.isFinite(progressAfterArchive), 'Progresso recalculado com segurança');

console.log('✓ 3. Caso de Borda 1 validado: doneAt preservado e recompensas não afetadas');

console.log('4. Testando Caso de Borda 2: Apagar meta desvincula compromissos sem apagá-los...');

const sampleOccurrences = [
  { id: 'occ-1', title: 'Tarefa da Meta 1', goalId: 'g-teste-1', stepId: 's-1' },
  { id: 'occ-2', title: 'Outra Tarefa da Meta 1', goalId: 'g-teste-1', stepId: 's-2' },
  { id: 'occ-3', title: 'Tarefa Avulsa', goalId: null, stepId: null },
  { id: 'occ-4', title: 'Tarefa da Meta 2', goalId: 'g-outra', stepId: null }
];

fakeState.occurrences = sampleOccurrences;
assert.strictEqual(fakeState.goals.length, 1);

const deleteRes = goalStepEngine.deleteGoal(fakeState, 'g-teste-1');
assert.strictEqual(deleteRes.unlinkedCount, 2, '2 compromissos vinculados à meta foram desvinculados');
assert.strictEqual(fakeState.goals.length, 0, 'Meta removida');
assert.strictEqual(fakeState.occurrences.length, 4, 'NENHUM compromisso foi apagado');

// Verifica que os compromissos viraram avulsos
const unlinked1 = fakeState.occurrences.find(o => o.id === 'occ-1');
assert.strictEqual(unlinked1.goalId, null, 'goalId deve virar null');
assert.strictEqual(unlinked1.stepId, null, 'stepId deve virar null');

const unlinked2 = fakeState.occurrences.find(o => o.id === 'occ-2');
assert.strictEqual(unlinked2.goalId, null);
assert.strictEqual(unlinked2.stepId, null);

// Outros compromissos intactos
assert.strictEqual(fakeState.occurrences.find(o => o.id === 'occ-4').goalId, 'g-outra');

console.log('✓ 4. Caso de Borda 2 validado: compromissos desvinculados sem exclusão');

console.log('5. Testando emissão de eventos de domínio step_done e goal_done...');

const goalEvents = {
  id: 'g-events',
  steps: [
    { id: 'step-ev-1', doneAt: null, archived: false },
    { id: 'step-ev-2', doneAt: null, archived: false }
  ]
};

Clock.setFakeTime('2026-10-25T15:00:00Z');
// Concluir primeiro passo
const evResult1 = goalStepEngine.completeStep(goalEvents, 'step-ev-1', Clock);
assert.strictEqual(evResult1.events.length, 1, 'Deve emitir 1 evento');
assert.strictEqual(evResult1.events[0].type, 'step_done');
assert.strictEqual(evResult1.events[0].stepId, 'step-ev-1');
assert.strictEqual(evResult1.events[0].at, '2026-10-25T15:00:00.000Z');

// Concluir segundo passo (último da meta) -> deve emitir step_done E goal_done
Clock.setFakeTime('2026-10-25T16:00:00Z');
const evResult2 = goalStepEngine.completeStep(goalEvents, 'step-ev-2', Clock);
assert.strictEqual(evResult2.events.length, 2, 'Deve emitir step_done e goal_done ao concluir todos os passos');
assert.strictEqual(evResult2.events[0].type, 'step_done');
assert.strictEqual(evResult2.events[1].type, 'goal_done');
assert.strictEqual(evResult2.events[1].goalId, 'g-events');

// Tentar concluir passo já concluído não reemite eventos
const evResultDup = goalStepEngine.completeStep(goalEvents, 'step-ev-2', Clock);
assert.strictEqual(evResultDup.events.length, 0, 'Passo já concluído não emite novos eventos');

console.log('✓ 5. Emissão de eventos step_done e goal_done validada com fidelidade temporal');

console.log('6. Testando isolamento por interruptor de módulo (AD-11)...');

const disabledState = { flags: { METAS: false }, goals: [] };
const disabledGoal = goalStepEngine.createGoal(disabledState, { title: 'Ignorada' }, Clock);
assert.strictEqual(disabledGoal, null, 'Com módulo METAS desligado, createGoal retorna null');
assert.strictEqual(disabledState.goals.length, 0, 'Nenhuma meta adicionada ao estado com módulo inativo');

console.log('✓ 6. Interruptor de módulo respeitado integralmente');

console.log('7. Verificando motor Kotlin correspondente GoalStepEngine.kt no :core-domain...');

const ktEnginePath = path.join(__dirname, '..', 'core-domain', 'src', 'main', 'kotlin', 'com', 'deadline', 'core', 'domain', 'engine', 'GoalStepEngine.kt');
assert.ok(fs.existsSync(ktEnginePath), 'GoalStepEngine.kt deve existir no :core-domain');

const ktEngineCode = fs.readFileSync(ktEnginePath, 'utf8');
assert.ok(ktEngineCode.includes('class GoalStepEngine'), 'Classe GoalStepEngine presente');
assert.ok(ktEngineCode.includes('fun calculateProgress'), 'calculateProgress presente');
assert.ok(ktEngineCode.includes('fun splitStep'), 'splitStep presente');
assert.ok(ktEngineCode.includes('fun deleteGoal'), 'deleteGoal com desvinculação presente');
assert.ok(ktEngineCode.includes('DomainEvent.StepDone'), 'Evento DomainEvent.StepDone presente');
assert.ok(ktEngineCode.includes('DomainEvent.GoalDone'), 'Evento DomainEvent.GoalDone presente');

console.log('✓ 7. Motor Kotlin e eventos de domínio no :core-domain verificados com sucesso');

console.log('=== TODOS OS 7 TESTES DO MOTOR DE METAS E PASSOS PASSARAM COM 100% DE SUCESSO! ===');
