const fs = require('fs');
const content = fs.readFileSync('web-preview/app.js', 'utf8');

console.log('openFocusTimer:', content.includes('openFocusTimer(minutes'));
console.log('startFocusPurrAmbient:', content.includes('startFocusPurrAmbient()'));
console.log('coroa_ouro drawing:', content.includes("state.cat.equipped.includes('coroa_ouro')"));
console.log('coleira_sino drawing:', content.includes("state.cat.equipped.includes('coleira_sino')"));
console.log('oculos_escuros drawing:', content.includes("state.cat.equipped.includes('oculos_escuros')"));
console.log('Haptic petting distToCat:', content.includes('distToCat < 28'));
console.log('Loja catalog expanded:', content.includes('Coroa Dourada Real') && content.includes('Coleira com Sino'));
console.log('Pomodoro button in banner:', content.includes('window.app.openFocusTimer(25)'));
