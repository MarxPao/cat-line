const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'web-preview', 'app.js');
let code = fs.readFileSync(filePath, 'utf8');

const startMarker = '// Renderizador da Cena Canvas 8-Bit';
const endMarker = '// UI Controller Principal';

const idx1 = code.indexOf(startMarker);
const idx2 = code.indexOf(endMarker);

if (idx1 === -1 || idx2 === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const enhancedSceneCanvas = `// Renderizador da Cena Canvas 8-Bit (Grade virtual de 180 px x 120 px -> 360x240 em escala 2x)
class SceneCanvas {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.vWidth = 180;
    this.vHeight = 120;
    this.frameTick = 0;
    this.tailTick = 0;
    this.scale = 2;
    this.destroyed = false;

    this.initResize();
    this.startLoop();
  }

  initResize() {
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: 396, height: 240 };
    const w = Math.max(360, Math.floor(rect.width || 396));
    const h = 240;
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.scale = Math.max(1, Math.min(Math.floor(w / this.vWidth), Math.floor(h / this.vHeight)));
  }

  startLoop() {
    const loop = () => {
      if (this.destroyed || !document.body.contains(this.canvas)) return;
      this.frameTick++;
      this.updateCatPhysics();
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // Descobre a atividade que a cliente está executando agora
  getActiveActivity() {
    if (state.activeExecutionId) {
      if (state.activeExecutionType === 'habit') {
        const h = state.habits.find(x => x.id === state.activeExecutionId);
        if (h) {
          const cat = detectTaskCategory(h);
          return {
            id: h.id,
            type: 'habit',
            title: h.title,
            category: cat,
            description: 'Executando hábito com a gatinha'
          };
        }
      } else {
        const occ = state.occurrences.find(x => x.id === state.activeExecutionId);
        if (occ) {
          const cat = detectTaskCategory(occ);
          return {
            id: occ.id,
            type: 'occurrence',
            title: occ.title,
            category: cat,
            description: 'Executando compromisso com a gatinha'
          };
        }
      }
    }

    // Se não há tarefa manual ativa, verifica se há compromisso agendado próximo do horário atual
    const now = new Date();
    const curTotalMin = now.getHours() * 60 + now.getMinutes();

    const matchingOcc = state.occurrences.find(o => {
      if (o.state === 'FEITO') return false;
      const parts = o.time.split(':').map(Number);
      if (isNaN(parts[0])) return false;
      const occMin = parts[0] * 60 + (parts[1] || 0);
      return Math.abs(curTotalMin - occMin) <= 45;
    });

    if (matchingOcc) {
      return {
        id: matchingOcc.id,
        type: 'occurrence',
        title: matchingOcc.title,
        category: detectTaskCategory(matchingOcc),
        description: 'No horário do compromisso',
        isAutoScheduled: true
      };
    }

    // Verifica se é horário de descanso / sono da usuária (briefing)
    if (state.briefing && state.briefing.sleepTime && state.briefing.wakeTime) {
      const sleepParts = state.briefing.sleepTime.split(':').map(Number);
      const wakeParts = state.briefing.wakeTime.split(':').map(Number);
      const sleepMin = sleepParts[0] * 60 + (sleepParts[1] || 0);
      const wakeMin = wakeParts[0] * 60 + (wakeParts[1] || 0);
      if (curTotalMin >= sleepMin || curTotalMin < wakeMin) {
        return {
          id: 'sleep',
          type: 'routine',
          title: 'Hora do Sono & Descanso',
          category: 'DESCANSO_SONO',
          description: 'Gatinha dormindo na caminha',
          isAutoScheduled: true
        };
      }
    }

    return null;
  }

  updateCatPhysics() {
    const cat = state.cat;
    const activity = this.getActiveActivity();

    // Se houver atividade em execução, define o posto correto no quarto!
    if (activity) {
      let targetPost = { x: 90, y: 88, name: 'Tapete de Treino' };
      if (activity.category === 'ESTUDO') {
        targetPost = { x: 46, y: 76, name: 'Estante de Estudos' };
      } else if (activity.category === 'TRABALHO') {
        targetPost = { x: 132, y: 72, name: 'Escrivaninha de Trabalho' };
      } else if (activity.category === 'CASA') {
        targetPost = { x: 70, y: 92, name: 'Organização da Casa' };
      } else if (activity.category === 'COMENDO_BEBENDO') {
        targetPost = { x: 126, y: 88, name: 'Tigelinha' };
      } else if (activity.category === 'DESCANSO_SONO') {
        targetPost = { x: 122, y: 104, name: 'Caminha Rosa' };
      }

      cat.targetX = targetPost.x;
      cat.targetY = targetPost.y;
      cat.stationName = targetPost.name;
    }

    // Animação da cauda
    if (this.frameTick % 10 === 0) {
      this.tailTick = (this.tailTick + 1) % 4;
    }

    // Animação da patinha
    if (this.frameTick % 7 === 0) {
      cat.playPawFrame = (cat.playPawFrame + 1) % 4;
    }

    // Movimento de caminhada pelo ambiente até o posto da tarefa
    const dx = cat.targetX - cat.x;
    const dy = cat.targetY - cat.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1.2) {
      cat.isWalking = true;
      cat.facingRight = dx >= 0;
      const speed = 0.55;
      cat.x += (dx / dist) * speed;
      cat.y += (dy / dist) * speed;

      if (this.frameTick % 6 === 0) {
        cat.walkFrame = (cat.walkFrame + 1) % 4;
      }
    } else {
      cat.isWalking = false;
      cat.walkFrame = 0;
      cat.waitTicks++;

      // Quando não há tarefa ativa, passeia livremente após alguns segundos
      if (!activity && cat.waitTicks > 210) {
        cat.waitTicks = 0;
        this.pickNextWaypoint();
      }
    }
  }

  pickNextWaypoint() {
    const cat = state.cat;
    const candidates = ROOM_WAYPOINTS.filter(w => Math.hypot(w.x - cat.x, w.y - cat.y) > 25);
    const next = candidates[Math.floor(Math.random() * candidates.length)] || ROOM_WAYPOINTS[0];
    cat.targetX = next.x;
    cat.targetY = next.y;
    cat.stationName = next.name;
    cat.waitTicks = 0;
  }

  walkToVirtualCoords(vx, vy, customLabel = 'Ponto escolhido') {
    state.activeExecutionId = null;
    state.activeExecutionType = null;
    state.cat.targetX = Math.max(32, Math.min(148, vx));
    state.cat.targetY = Math.max(72, Math.min(108, vy));
    state.cat.stationName = customLabel;
    state.cat.waitTicks = 0;
  }

  draw() {
    this.initResize();
    const ctx = this.ctx;
    const s = this.scale;
    const originX = Math.max(0, (this.canvas.width - this.vWidth * s) / 2);

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.imageSmoothingEnabled = false;

    function vRect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(
        Math.floor(originX + x * s),
        Math.floor(y * s),
        Math.ceil(w * s),
        Math.ceil(h * s)
      );
    }

    // 1. Fundo da Sala (Parede Creme e Piso de Madeira)
    vRect(0, 0, 180, 44, PALETTE.wallCream);
    vRect(0, 44, 180, 2, PALETTE.ink);
    vRect(0, 46, 180, this.vHeight - 46, PALETTE.woodFloor);

    // Janela 8-bit com céu e nuvem
    vRect(74, 8, 32, 26, PALETTE.ink);
    vRect(76, 10, 28, 22, PALETTE.windowBlue);
    vRect(89, 10, 2, 22, PALETTE.ink);
    vRect(76, 20, 28, 2, PALETTE.ink);

    // Tapete Roxo Central (com marcação de treino)
    vRect(46, 66, 88, 42, PALETTE.cozyPurple);
    vRect(48, 68, 84, 38, '#6A5D90');

    // Estante de Estudo (Esquerda)
    vRect(12, 16, 28, 28, PALETTE.orangeShadow);
    vRect(14, 20, 24, 6, PALETTE.leafGreen);
    vRect(14, 30, 24, 6, PALETTE.alertRed);

    // Escrivaninha de Trabalho (Direita)
    vRect(136, 24, 32, 20, PALETTE.orangeShadow);
    vRect(144, 18, 14, 10, PALETTE.windowBlue);

    // Tigelinha de Ração
    vRect(148, 76, 14, 8, PALETTE.alertRed);
    vRect(150, 78, 10, 4, PALETTE.furCreamShadow);

    // Caminha da Gatinha
    vRect(136, 94, 34, 18, PALETTE.yarnPink);
    vRect(139, 97, 28, 12, PALETTE.furCreamShadow);

    // Meta selecionada e cor do novelo ativo
    const selectedGoal = getSelectedGoal();
    const yarnPalette = getYarnPalette(selectedGoal.yarnColorId);
    const woundFraction = getWoundFractionByTime(selectedGoal);

    // 2. Fuso / Novelo da Meta se Enrolando à medida que o tempo esgota
    const spoolCenterX = 24;
    const spoolCenterY = 96;
    this.drawWindingGoalSpool(vRect, spoolCenterX, spoolCenterY, yarnPalette, woundFraction);

    // 3. Atividade atual em execução
    const activity = this.getActiveActivity();

    // 4. Gatinha Calico executando a atividade espelho ou caminhando livre
    const catTopLeftX = Math.round(state.cat.x - 32);
    const catTopLeftY = Math.round(state.cat.y - 54);

    const pawYarnPos = this.drawCalicoCatWithYarnInPaws(
      vRect,
      catTopLeftX,
      catTopLeftY,
      yarnPalette,
      activity
    );

    // 5. Fio de Lã conectando o novelo na mão da gatinha ao novelo do tempo
    this.drawConnectingYarnThread(
      vRect,
      pawYarnPos.x,
      pawYarnPos.y,
      spoolCenterX,
      spoolCenterY,
      yarnPalette
    );
  }

  // Desenha o Novelo do Tempo que vai se enrolando conforme o tempo da meta esgota
  drawWindingGoalSpool(vRect, cx, cy, yarnPalette, woundFraction) {
    vRect(cx - 14, cy + 8, 28, 6, PALETTE.ink);
    vRect(cx - 13, cy + 9, 26, 4, PALETTE.furCreamShadow);

    const radius = Math.round(4 + woundFraction * 8);
    const d = radius * 2;
    const left = cx - radius;
    const top = cy - radius + 2;

    vRect(left - 1, top - 1, d + 2, d + 2, PALETTE.ink);
    vRect(left, top, d, d, yarnPalette.main);

    const spinOffset = Math.floor(this.frameTick / 10) % 3;
    for (let r = 2; r < radius; r += 3) {
      vRect(cx - r + spinOffset - 1, cy - r + 2, r * 2, 1, yarnPalette.shadow);
      vRect(cx - r, cy + r - spinOffset + 1, r * 2, 1, yarnPalette.highlight);
    }
  }

  // Desenha o fio ligando o novelo na patinha da gatinha ao novelo do tempo
  drawConnectingYarnThread(vRect, x1, y1, x2, y2, yarnPalette) {
    const steps = 18;
    const wavePhase = this.frameTick * 0.15;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(x1 + (x2 - x1) * t);
      const sag = Math.sin(t * Math.PI) * 6 + Math.sin(wavePhase + t * 6) * 1.5;
      const py = Math.round(y1 + (y2 - y1) * t + sag);
      vRect(px, py, 2, 2, i % 4 === 0 ? yarnPalette.shadow : yarnPalette.main);
    }
  }

  // Desenha a Gatinha Calico com ANIMAÇÃO DEDICADA DA ATIVIDADE EM EXECUÇÃO
  drawCalicoCatWithYarnInPaws(vRect, x, y, yarnPalette, activity) {
    const isWalking = state.cat.isWalking;
    const walkFrame = state.cat.walkFrame;
    const facingRight = state.cat.facingRight;
    const catCategory = activity ? activity.category : 'LIVRE_NOVELO';

    // Movimento vertical do corpo
    let strideBob = 0;
    if (isWalking) {
      strideBob = (walkFrame % 2 === 1 ? -2 : 0);
    } else if (catCategory === 'TREINO') {
      // Pulinho rítmico do treino de calistenia/exercício!
      strideBob = (this.frameTick % 20 < 10) ? -4 : 0;
    } else {
      strideBob = ((this.frameTick % 24 < 12) ? 1 : 0);
    }
    const by = y + strideBob;

    // Sombra no chão
    vRect(x + 16, y + 55, 32, 4, 'rgba(24, 20, 37, 0.35)');

    // 1. Cauda tricolor animada
    const tailOff = (this.tailTick === 1) ? 2 : (this.tailTick === 3 ? -2 : 0);
    const tailX = facingRight ? (x + 10) : (x + 44);
    vRect(tailX, by + 38 + tailOff, 8, 10, PALETTE.ink);
    vRect(tailX + 1, by + 39 + tailOff, 6, 4, PALETTE.grayDark);
    vRect(tailX + 1, by + 43 + tailOff, 6, 4, PALETTE.orange);

    // 2. Orelhas Calico
    vRect(x + 18, by + 10, 9, 8, PALETTE.ink);
    vRect(x + 19, by + 11, 7, 6, PALETTE.grayDark);
    vRect(x + 21, by + 13, 4, 4, PALETTE.yarnPink);

    vRect(x + 37, by + 10, 9, 8, PALETTE.ink);
    vRect(x + 38, by + 11, 7, 6, PALETTE.orange);
    vRect(x + 39, by + 13, 4, 4, PALETTE.yarnPink);

    // 3. Cabeça Calico
    vRect(x + 16, by + 17, 32, 18, PALETTE.ink);
    vRect(x + 17, by + 18, 30, 16, PALETTE.furWhite);
    vRect(x + 17, by + 18, 10, 8, PALETTE.grayDark);
    vRect(x + 37, by + 18, 10, 8, PALETTE.orange);

    const faceShift = facingRight ? 2 : -2;

    // Bochechas e focinho
    vRect(x + 20 + faceShift, by + 28, 4, 2, PALETTE.yarnPink);
    vRect(x + 40 + faceShift, by + 28, 4, 2, PALETTE.yarnPink);
    vRect(x + 31 + faceShift, by + 27, 2, 2, PALETTE.yarnPinkDark);

    // Boquinha
    vRect(x + 29 + faceShift, by + 29, 2, 2, PALETTE.ink);
    vRect(x + 33 + faceShift, by + 29, 2, 2, PALETTE.ink);

    // Olhos
    const isSleeping = (catCategory === 'DESCANSO_SONO');
    const isBlinking = (this.frameTick % 120 > 113);
    if (isSleeping || isBlinking || state.cat.mood === 'SONOLENTA') {
      vRect(x + 23 + faceShift, by + 26, 4, 1, PALETTE.ink);
      vRect(x + 37 + faceShift, by + 26, 4, 1, PALETTE.ink);
    } else {
      vRect(x + 24 + faceShift, by + 24, 2, 4, PALETTE.ink);
      vRect(x + 38 + faceShift, by + 24, 2, 4, PALETTE.ink);
    }

    // 4. Tronco
    vRect(x + 18, by + 35, 28, 16, PALETTE.ink);
    vRect(x + 19, by + 36, 26, 14, PALETTE.furWhite);
    vRect(x + 20, by + 38, 7, 6, PALETTE.orange);

    // 5. Patinhas Traseiras
    const legLiftA = isWalking ? (walkFrame === 0 ? -3 : (walkFrame === 2 ? 1 : 0)) : 0;
    const legLiftB = isWalking ? (walkFrame === 2 ? -3 : (walkFrame === 0 ? 1 : 0)) : 0;
    const legShiftA = isWalking ? (walkFrame === 0 ? 2 : (walkFrame === 2 ? -2 : 0)) : 0;
    const legShiftB = isWalking ? (walkFrame === 2 ? 2 : (walkFrame === 0 ? -2 : 0)) : 0;

    vRect(x + 19 + legShiftA, by + 49 + legLiftA, 6, 8, PALETTE.ink);
    vRect(x + 20 + legShiftA, by + 49 + legLiftA, 4, 7, PALETTE.furWhite);

    vRect(x + 39 + legShiftB, by + 49 + legLiftB, 6, 8, PALETTE.ink);
    vRect(x + 40 + legShiftB, by + 49 + legLiftB, 4, 7, PALETTE.furWhite);

    vRect(x + 26 - legShiftB, by + 50 + legLiftB, 6, 8, PALETTE.ink);
    vRect(x + 27 - legShiftB, by + 50 + legLiftB, 4, 7, PALETTE.furWhite);

    // 6. Patinha Dianteira e Novelo
    const pawPlayWave = (state.cat.playPawFrame % 2 === 0) ? -2 : 2;
    const handX = facingRight ? (x + 42) : (x + 14);
    const handY = by + 42 + pawPlayWave;

    vRect(handX, handY, 8, 6, PALETTE.ink);
    vRect(handX + 1, handY + 1, 6, 4, PALETTE.furWhite);
    vRect(handX + (facingRight ? 5 : 1), handY + 1, 2, 4, PALETTE.orange);

    // Novelo da meta selecionada
    const yarnBounce = (state.cat.playPawFrame === 1) ? -3 : (state.cat.playPawFrame === 3 ? 2 : 0);
    const yarnX = facingRight ? (handX + 5) : (handX - 9);
    const yarnY = handY + 1 + yarnBounce;

    vRect(yarnX, yarnY, 12, 12, PALETTE.ink);
    vRect(yarnX + 1, yarnY + 1, 10, 10, yarnPalette.main);
    const stripeShift = state.cat.playPawFrame % 3;
    vRect(yarnX + 2 + stripeShift, yarnY + 3, 5, 2, yarnPalette.shadow);
    vRect(yarnX + 3, yarnY + 6 + (stripeShift % 2), 6, 2, yarnPalette.shadow);
    vRect(yarnX + 2, yarnY + 2, 3, 2, yarnPalette.highlight);

    // ==========================================
    // ANIMAÇÕES VIVAS ESPECÍFICAS DA TAREFA:
    // ==========================================

    if (catCategory === 'ESTUDO') {
      // 👓 Óculos 8-bit de leitura na gatinha
      vRect(x + 21 + faceShift, by + 22, 6, 6, PALETTE.ink);
      vRect(x + 22 + faceShift, by + 23, 4, 4, '#cce7ff');
      vRect(x + 35 + faceShift, by + 22, 6, 6, PALETTE.ink);
      vRect(x + 36 + faceShift, by + 23, 4, 4, '#cce7ff');
      vRect(x + 27 + faceShift, by + 24, 8, 2, PALETTE.ink);

      // 📖 Livro Aberto com páginas folheando
      const bookX = facingRight ? (x + 36) : (x + 12);
      const bookY = by + 46;
      vRect(bookX, bookY, 18, 12, PALETTE.ink);
      vRect(bookX + 1, bookY + 1, 7, 10, '#fffbf0');
      vRect(bookX + 9, bookY + 1, 7, 10, '#fffbf0');
      vRect(bookX + 8, bookY + 1, 1, 10, PALETTE.grayDark);
      // Linhas de texto pixel art
      vRect(bookX + 2, bookY + 3, 5, 1, PALETTE.grayDark);
      vRect(bookX + 2, bookY + 5, 5, 1, PALETTE.grayDark);
      vRect(bookX + 10, bookY + 3, 5, 1, PALETTE.grayDark);
      vRect(bookX + 10, bookY + 5, 5, 1, PALETTE.grayDark);

      // Página virando animada
      if (this.frameTick % 40 < 12) {
        vRect(bookX + 8, bookY - 2, 4, 8, '#f5ecd8');
      }
    } else if (catCategory === 'TREINO') {
      // 🏃‍♀️ Faixa esportiva vermelha de treino na cabeça
      vRect(x + 16, by + 16, 32, 4, PALETTE.alertRed);
      vRect(tailX - 2, by + 14, 5, 6, PALETTE.alertRed); // nó da faixa

      // Gotinhas de esforço e energia saindo da cabecinha
      const sweatTick = (this.frameTick % 16);
      vRect(x + 12, by + 12 - sweatTick, 3, 3, PALETTE.windowBlue);
      vRect(x + 48, by + 12 - ((sweatTick + 8) % 16), 3, 3, PALETTE.windowBlue);

      // Patinha erguida no salto
      if (strideBob < 0) {
        vRect(handX, handY - 6, 6, 6, PALETTE.furWhite);
      }
    } else if (catCategory === 'TRABALHO') {
      // 💻 Notebook 8-bit aberto na escrivaninha
      const laptopX = facingRight ? (x + 40) : (x + 10);
      const laptopY = by + 42;
      vRect(laptopX, laptopY - 6, 16, 12, PALETTE.ink);
      vRect(laptopX + 1, laptopY - 5, 14, 10, PALETTE.windowBlue);
      // Linhas de código piscando
      vRect(laptopX + 3, laptopY - 3, 7, 1, PALETTE.leafGreen);
      vRect(laptopX + 3, laptopY - 1, 5, 1, PALETTE.orange);
      vRect(laptopX + 3, laptopY + 1, 9, 1, PALETTE.leafGreen);
      // Tecladinho
      vRect(laptopX - 2, laptopY + 6, 18, 4, PALETTE.ink);
      vRect(laptopX - 1, laptopY + 7, 16, 2, PALETTE.grayDark);

      // Patinhas digitando alternadamente
      const typeAlt = (this.frameTick % 8 < 4);
      vRect(laptopX + 2, laptopY + 5 + (typeAlt ? -1 : 1), 4, 3, PALETTE.furWhite);
      vRect(laptopX + 8, laptopY + 5 + (typeAlt ? 1 : -1), 4, 3, PALETTE.furWhite);

      // ☕ Xícara de café com fumacinha
      vRect(laptopX + 20, laptopY + 4, 6, 7, PALETTE.yarnPink);
      vRect(laptopX + 21, laptopY + 1 - (this.frameTick % 8), 2, 2, 'rgba(255,255,255,0.7)');
    } else if (catCategory === 'CASA') {
      // 🧹 Vassourinha de palha varrendo o chão
      const broomAngle = Math.sin(this.frameTick * 0.2) * 4;
      const broomX = (facingRight ? (x + 44) : (x + 14)) + broomAngle;
      const broomY = by + 34;
      // Cabo
      vRect(broomX, broomY - 6, 3, 18, PALETTE.orangeShadow);
      // Cerdas de palha
      vRect(broomX - 4, broomY + 12, 11, 7, '#E0BA62');
      vRect(broomX - 5, broomY + 18, 13, 2, PALETTE.ink);

      // ✨ Brilhinhos de limpeza subindo
      const sparkleA = (this.frameTick % 18);
      vRect(x + 8 + sparkleA * 2, by + 50 - sparkleA, 3, 3, PALETTE.goldHighlight);
    } else if (catCategory === 'COMENDO_BEBENDO') {
      // 💧 Tigelinha com água/ração e coraçõezinhos rosas
      const heartTick = (this.frameTick % 20);
      vRect(x + 42, by + 18 - heartTick, 4, 4, PALETTE.yarnPink);
    } else if (catCategory === 'DESCANSO_SONO') {
      // 💤 "Z z z" subindo em direção ao teto
      const zPhase = (this.frameTick % 40);
      vRect(x + 38 + (zPhase / 3), by + 10 - zPhase, 5, 5, PALETTE.cozyPurple);
      vRect(x + 44 + (zPhase / 3), by + 4 - zPhase, 4, 4, PALETTE.cozyPurple);
    }

    // 8. Lacinho rosa equipado
    if (state.cat.equipped.includes('laco_rosa')) {
      vRect(x + 37, by + 12, 6, 5, PALETTE.ink);
      vRect(x + 38, by + 13, 4, 3, PALETTE.yarnPink);
    }

    return { x: yarnX + 6, y: yarnY + 6 };
  }
}

`;

code = code.slice(0, idx1) + enhancedSceneCanvas + code.slice(idx2);
fs.writeFileSync(filePath, code, 'utf8');
console.log('web-preview/app.js cleanly patched with single enhanced SceneCanvas!');
