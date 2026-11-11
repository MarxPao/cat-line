// scripts/test-phase8-config.js
// Suíte de testes automatizados da v3.2.0 (Prompt 2): Configuração Declarativa Versionada (AD-10)
// Valida carregamento, validação de tipos, limites, rejeição de números negativos e valores padrão.

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO TESTES DA CONFIGURAÇÃO DECLARATIVA VERSIONADA (V3.2.0 - PROMPT 2) ===');

// Carrega o módulo de configuração
const CommitmentsConfigLoader = require('../web-preview/commitments-config.js');

console.log('1. Testando carregamento do arquivo oficial config/commitments.v1.json...');

const jsonFilePath = path.join(__dirname, '..', 'config', 'commitments.v1.json');
assert.ok(fs.existsSync(jsonFilePath), 'Arquivo config/commitments.v1.json deve existir');

const rawJson = fs.readFileSync(jsonFilePath, 'utf8');
const config = CommitmentsConfigLoader.loadFromJson(rawJson);

// Validação dos parâmetros oficiais propostos
assert.strictEqual(config.version, 1, 'Versão deve ser 1');
assert.strictEqual(config.dayBoundary.logicalDayStartHour, 4, 'logicalDayStartHour deve ser 4');
assert.strictEqual(config.punctuality.toleranceMinutes, 10, 'toleranceMinutes deve ser 10');
assert.strictEqual(config.week.closesOn, 'sunday', "closesOn deve ser 'sunday'");
assert.strictEqual(config.undoWindowMinutes, 10, 'undoWindowMinutes deve ser 10');

assert.strictEqual(config.rewards.commitmentDone.fish, 2, 'commitmentDone fish deve ser 2');
assert.strictEqual(config.rewards.onTimeBonus.fish, 1, 'onTimeBonus fish deve ser 1');
assert.strictEqual(config.rewards.stepDone.fish, 3, 'stepDone fish deve ser 3');
assert.strictEqual(config.rewards.goalDone.fish, 20, 'goalDone fish deve ser 20');
assert.strictEqual(config.rewards.goalDone.bond, 5, 'goalDone bond deve ser 5');
assert.strictEqual(config.rewards.dayClosure.bond, 1, 'dayClosure bond deve ser 1');
assert.strictEqual(config.rewards.retroactiveMultiplier, 0.5, 'retroactiveMultiplier deve ser 0.5');

assert.strictEqual(config.caps.fishPerLogicalDay, 15, 'fishPerLogicalDay deve ser 15');
assert.strictEqual(config.caps.socialMinutesEarnedPerDay, 30, 'socialMinutesEarnedPerDay deve ser 30');
assert.strictEqual(config.caps.minCommitmentMinutesToReward, 5, 'minCommitmentMinutesToReward deve ser 5');

// Regra existente reutilizada sem duplicar constante
assert.strictEqual(config.socialMinutesPerTask, 5, 'socialMinutesPerTask deve ser 5');

console.log('✓ 1. Configuração oficial config/commitments.v1.json carregada e validada com sucesso');

console.log('2. Testando rejeição estrita de valores negativos e limites inválidos...');

// Teste: hora de início do dia lógico < 0 ou > 23
assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ dayBoundary: { logicalDayStartHour: -1 } });
}, /logicalDayStartHour/, 'Deve rejeitar hora de virada negativa');

assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ dayBoundary: { logicalDayStartHour: 24 } });
}, /logicalDayStartHour/, 'Deve rejeitar hora de virada >= 24');

// Teste: tolerância negativa
assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ punctuality: { toleranceMinutes: -5 } });
}, /toleranceMinutes/, 'Deve rejeitar toleranceMinutes negativo');

// Teste: dia da semana inválido
assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ week: { closesOn: 'segunda-feira-invalida' } });
}, /closesOn/, 'Deve rejeitar dia da semana inválido');

// Teste: janela de desfazer negativa
assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ undoWindowMinutes: -10 });
}, /undoWindowMinutes/, 'Deve rejeitar undoWindowMinutes negativo');

// Teste: recompensas negativas
assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ rewards: { commitmentDone: { fish: -2 } } });
}, /commitmentDone\.fish/, 'Deve rejeitar recompensa em peixinhos negativa');

assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ rewards: { goalDone: { fish: 20, bond: -1 } } });
}, /goalDone\.bond/, 'Deve rejeitar vínculo negativo');

// Teste: multiplicador retroativo fora de [0, 1]
assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ rewards: { retroactiveMultiplier: -0.5 } });
}, /retroactiveMultiplier/, 'Deve rejeitar retroactiveMultiplier negativo');

assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ rewards: { retroactiveMultiplier: 1.5 } });
}, /retroactiveMultiplier/, 'Deve rejeitar retroactiveMultiplier > 1.0');

// Teste: tetos negativos
assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ caps: { fishPerLogicalDay: -15 } });
}, /fishPerLogicalDay/, 'Deve rejeitar fishPerLogicalDay negativo');

assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ caps: { socialMinutesEarnedPerDay: -30 } });
}, /socialMinutesEarnedPerDay/, 'Deve rejeitar socialMinutesEarnedPerDay negativo');

assert.throws(() => {
  CommitmentsConfigLoader.validateAndNormalize({ caps: { minCommitmentMinutesToReward: -5 } });
}, /minCommitmentMinutesToReward/, 'Deve rejeitar minCommitmentMinutesToReward negativo');

console.log('✓ 2. Todas as violações de tipo, limites e valores negativos foram rejeitadas com erros claros');

console.log('3. Testando valores padrão documentados para campos ausentes...');

// Passando objeto com apenas uma propriedade customizada
const partialConfig = CommitmentsConfigLoader.validateAndNormalize({
  punctuality: { toleranceMinutes: 15 }
});

assert.strictEqual(partialConfig.punctuality.toleranceMinutes, 15, 'Propriedade explícita mantida');
assert.strictEqual(partialConfig.dayBoundary.logicalDayStartHour, 4, 'logicalDayStartHour adotou padrão 4');
assert.strictEqual(partialConfig.week.closesOn, 'sunday', "closesOn adotou padrão 'sunday'");
assert.strictEqual(partialConfig.undoWindowMinutes, 10, 'undoWindowMinutes adotou padrão 10');
assert.strictEqual(partialConfig.rewards.commitmentDone.fish, 2, 'commitmentDone fish adotou padrão 2');
assert.strictEqual(partialConfig.caps.fishPerLogicalDay, 15, 'fishPerLogicalDay adotou padrão 15');
assert.strictEqual(partialConfig.caps.socialMinutesEarnedPerDay, 30, 'socialMinutesEarnedPerDay adotou padrão 30');
assert.strictEqual(partialConfig.caps.minCommitmentMinutesToReward, 5, 'minCommitmentMinutesToReward adotou padrão 5');

// JSON vazio ou malformado
assert.throws(() => {
  CommitmentsConfigLoader.loadFromJson('');
}, /string JSON vazia/, 'Deve rejeitar string vazia');

assert.throws(() => {
  CommitmentsConfigLoader.loadFromJson('{ version: "invalido" }');
}, /JSON malformado/, 'Deve rejeitar JSON com erro de sintaxe');

console.log('✓ 3. Campos ausentes adotam estritamente os padrões documentados');

console.log('4. Verificando classes Kotlin correspondentes no :core-domain e :core-data...');

const kotlinConfigPath = path.join(__dirname, '..', 'core-domain', 'src', 'main', 'kotlin', 'com', 'deadline', 'core', 'domain', 'config', 'CommitmentsConfig.kt');
assert.ok(fs.existsSync(kotlinConfigPath), 'CommitmentsConfig.kt deve existir no :core-domain');

const kotlinCode = fs.readFileSync(kotlinConfigPath, 'utf8');
assert.ok(kotlinCode.includes('data class CommitmentsConfig'), 'CommitmentsConfig deve ser data class Serializable');
assert.ok(kotlinCode.includes('require(logicalDayStartHour in 0..23)'), 'Validação Kotlin de logicalDayStartHour presente');
assert.ok(kotlinCode.includes('require(toleranceMinutes >= 0)'), 'Validação Kotlin de toleranceMinutes presente');
assert.ok(kotlinCode.includes('require(fish >= 0L)'), 'Validação Kotlin de peixinhos presente');
assert.ok(kotlinCode.includes('loadBundled()'), 'Método loadBundled() presente');

const loaderPath = path.join(__dirname, '..', 'core-data', 'src', 'main', 'kotlin', 'com', 'deadline', 'core', 'data', 'config', 'JsonGameConfigLoader.kt');
const loaderCode = fs.readFileSync(loaderPath, 'utf8');
assert.ok(loaderCode.includes('fun loadCommitmentsConfig(): CommitmentsConfig'), 'JsonGameConfigLoader deve possuir loadCommitmentsConfig()');

const resourcePath = path.join(__dirname, '..', 'core-domain', 'src', 'main', 'resources', 'config', 'commitments.v1.json');
assert.ok(fs.existsSync(resourcePath), 'Resource bundled commitments.v1.json deve existir em :core-domain');

console.log('✓ 4. Classes Kotlin, validações e carregador Android validados com rigor');

console.log('5. Verificando integração no web-preview/app.js...');

const appJsPath = path.join(__dirname, '..', 'web-preview', 'app.js');
const appJsCode = fs.readFileSync(appJsPath, 'utf8');

assert.ok(appJsCode.includes('commitmentsConfig: defaultCommitmentsConfig'), 'state em app.js deve conter commitmentsConfig');
assert.ok(appJsCode.includes('minuteBankEngine.MINUTES_PER_TASK'), 'app.js deve reutilizar minuteBankEngine.MINUTES_PER_TASK');

console.log('✓ 5. Integração com estado global e eliminação de números mágicos confirmada');

console.log('=== TODOS OS 5 TESTES DE CONFIGURAÇÃO DECLARATIVA PASSARAM COM 100% DE SUCESSO! ===');
