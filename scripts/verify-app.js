const fs = require('fs');
const content = fs.readFileSync('web-preview/app.js', 'utf8');

console.log('detectTaskCategory:', content.includes('function detectTaskCategory'));
console.log('startActiveExecution:', content.includes('startActiveExecution(id, type'));
console.log('stopActiveExecution:', content.includes('stopActiveExecution()'));
console.log('getActiveActivity in SceneCanvas:', content.includes('getActiveActivity()'));
console.log('Fazer Agora banner in Hoje:', content.includes('FAZENDO AGORA COM A GATINHA'));
console.log('ESTUDO animation:', content.includes("catCategory === 'ESTUDO'"));
console.log('TREINO animation:', content.includes("catCategory === 'TREINO'"));
console.log('TRABALHO animation:', content.includes("catCategory === 'TRABALHO'"));
console.log('CASA animation:', content.includes("catCategory === 'CASA'"));
