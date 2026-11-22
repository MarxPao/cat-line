/**
 * step-templates.js
 * Passos prontos para quebrar uma meta em partes pequenas, 100% offline.
 *
 * Motor puro: recebe o título da meta e devolve uma sugestão. Nada é aplicado
 * sem toque da usuária, e a usuária escolhe quais passos adicionar.
 * Textos sem parênteses descritivos e em tom acolhedor.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CatLineStepTemplates = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TEMPLATES = {
    ESTUDO: {
      label: 'Estudo',
      keywords: ['estud', 'ler ', 'leitur', 'livro', 'aula', 'curso', 'prova', 'concurso', 'resumo', 'tcc', 'faculdade', 'idioma', 'inglês', 'ingles'],
      steps: [
        { title: 'Separar o material e uma garrafinha de água', estMinutes: 5 },
        { title: 'Ler o objetivo da sessão', estMinutes: 5 },
        { title: 'Estudar com foco total', estMinutes: 25 },
        { title: 'Pausa para esticar o corpo', estMinutes: 5 },
        { title: 'Fazer um resumo curtinho do que aprendi', estMinutes: 15 },
        { title: 'Anotar as dúvidas para a próxima vez', estMinutes: 5 }
      ]
    },
    TREINO: {
      label: 'Movimento',
      keywords: ['trein', 'academia', 'corr', 'caminhad', 'exerc', 'calistenia', 'yoga', 'pilates', 'pedal', 'nata', 'alongar'],
      steps: [
        { title: 'Separar a roupa e a garrafa de água', estMinutes: 5 },
        { title: 'Aquecer o corpo', estMinutes: 5 },
        { title: 'Fazer o bloco principal do treino', estMinutes: 25 },
        { title: 'Alongar com calma', estMinutes: 5 },
        { title: 'Beber água e registrar como me senti', estMinutes: 5 }
      ]
    },
    TRABALHO: {
      label: 'Trabalho',
      keywords: ['trabalh', 'reuni', 'projeto', 'email', 'e-mail', 'relat', 'cliente', 'entrega', 'apresenta', 'proposta', 'planilha'],
      steps: [
        { title: 'Listar o que precisa sair hoje', estMinutes: 10 },
        { title: 'Escolher a tarefa mais importante', estMinutes: 5 },
        { title: 'Trabalhar nela sem distrações', estMinutes: 25 },
        { title: 'Responder o que ficou pendente', estMinutes: 15 },
        { title: 'Anotar o próximo passo para amanhã', estMinutes: 5 }
      ]
    },
    CASA: {
      label: 'Casa',
      keywords: ['organiz', 'limp', 'lavar', 'faxina', 'arrum', 'casa', 'quarto', 'cozinha', 'roupa', 'mudança', 'mudanca', 'banheiro'],
      steps: [
        { title: 'Escolher um cantinho para cuidar', estMinutes: 2 },
        { title: 'Recolher o que está fora do lugar', estMinutes: 10 },
        { title: 'Limpar a superfície principal', estMinutes: 15 },
        { title: 'Levar o lixo e o que não uso mais', estMinutes: 5 },
        { title: 'Admirar o cantinho pronto', estMinutes: 2 }
      ]
    },
    COMENDO_BEBENDO: {
      label: 'Alimentação',
      keywords: ['cozinh', 'almoç', 'almoc', 'jantar', 'lanche', 'receita', 'marmita', 'dieta', 'refeição', 'refeicao', 'beber água', 'beber agua'],
      steps: [
        { title: 'Escolher o que vou comer', estMinutes: 10 },
        { title: 'Separar os ingredientes', estMinutes: 10 },
        { title: 'Preparar com calma', estMinutes: 20 },
        { title: 'Comer sem pressa e sem telas', estMinutes: 20 },
        { title: 'Lavar a louça e guardar as sobras', estMinutes: 10 }
      ]
    },
    DESCANSO_SONO: {
      label: 'Descanso',
      keywords: ['dorm', 'sono', 'descans', 'relax', 'medit', 'respira', 'soneca'],
      steps: [
        { title: 'Deixar o celular longe da cama', estMinutes: 2 },
        { title: 'Baixar a luz e arrumar o ambiente', estMinutes: 10 },
        { title: 'Respirar fundo cinco vezes', estMinutes: 3 },
        { title: 'Descansar sem culpa', estMinutes: 20 }
      ]
    },
    GERAL: {
      label: 'Geral',
      keywords: [],
      steps: [
        { title: 'Separar o que vou precisar', estMinutes: 5 },
        { title: 'Começar pela parte mais fácil', estMinutes: 15 },
        { title: 'Fazer uma pausa curtinha', estMinutes: 5 },
        { title: 'Continuar até terminar uma parte', estMinutes: 20 },
        { title: 'Revisar e comemorar com a gatinha', estMinutes: 10 }
      ]
    }
  };

  const ORDER = ['ESTUDO', 'TREINO', 'TRABALHO', 'CASA', 'COMENDO_BEBENDO', 'DESCANSO_SONO'];

  function normalize(text) {
    return ' ' + String(text == null ? '' : text).toLowerCase().trim() + ' ';
  }

  /** Categoria com mais palavras-chave encontradas; empate vence a primeira da ordem. */
  function detectCategory(title) {
    const t = normalize(title);
    let best = 'GERAL';
    let bestScore = 0;
    ORDER.forEach(cat => {
      const score = TEMPLATES[cat].keywords.reduce((n, k) => n + (t.includes(k) ? 1 : 0), 0);
      if (score > bestScore) { best = cat; bestScore = score; }
    });
    return best;
  }

  /**
   * Sugere passos para a meta. existingTitles evita repetir passos que a usuária já tem.
   * Devolve cópias, então alterar o resultado nunca muda o catálogo.
   */
  function suggestSteps(goalTitle, existingTitles) {
    const category = detectCategory(goalTitle);
    const have = new Set((Array.isArray(existingTitles) ? existingTitles : []).map(s => String(s).trim().toLowerCase()));
    const tpl = TEMPLATES[category];
    const steps = tpl.steps
      .filter(s => !have.has(s.title.toLowerCase()))
      .map(s => ({ title: s.title, estMinutes: s.estMinutes }));
    return { category, label: tpl.label, steps };
  }

  return { TEMPLATES, detectCategory, suggestSteps };
});
