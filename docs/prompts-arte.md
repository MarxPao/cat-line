# Dead Line — Pacote de Prompts de Arte e Pipeline (Seção 23 · Trilha A1–A5)

Este documento entrega o pacote de prompts da **Seção 23 ("O próximo entregável é o pacote de prompts: prompt-mestre, folha de poses da gatinha, catálogo de animações e os cenários")** e especifica o contrato do script de tratamento (Trilha A1 a A5 e WP-14).

---

## A1 · Paleta Global de 16 Cores e Prompt-Mestre

### Paleta Global de 16 Cores (`DEADLINE_16_PALETTE`)
Todos os sprites da gatinha, do novelo, dos móveis, do cenário e dos componentes de UI (`:core-ui` e `:core-game`) são quantizados para esta paleta de 16 cores (mais transparência `#00000000`):

| Índice | Nome | Hex | Uso principal |
|---|---|---|---|
| 0 | Contorno / Preto Pixel | `#181425` | Contorno de 1 px da gatinha, olhos, texto e bordas |
| 1 | Branco Pelo | `#FFFFFF` | Pelagem principal da gatinha e fundo de balão |
| 2 | Creme Sombra Pelo | `#EAE1D3` | Sombra suave da pelagem branca e páginas de livro |
| 3 | Cinza Pelo Escuro | `#6B6967` | Mancha cinza da orelha/cabeça e ponta da cauda |
| 4 | Cinza Pelo Médio | `#9B9793` | Transição da mancha cinza e contornos secundários |
| 5 | Laranja Calico Vivo | `#DF8F49` | Manchas laranjas da gatinha e detalhes quentes |
| 6 | Laranja Calico Sombra | `#B8652B` | Sombra das manchas laranjas e madeira escura |
| 7 | Rosa Orelha / Bochecha | `#F0949E` | Interior das orelhas, bochechas coradas e novelo rosa |
| 8 | Rosa Escuro / Focinho | `#AD5E65` | Focinho da gatinha e sombras do novelo de lã |
| 9 | Dourado Novelo Raro | `#F4C852` | Novelo dourado, moedas (peixinhos dourados) e estrelas |
| 10 | Creme Fundo / Parede | `#F7E8D0` | Paredes do cômodo e fundo de cartões da interface |
| 11 | Madeira Clara / Piso | `#D4A373` | Piso do cômodo, escrivaninha e estantes |
| 12 | Verde Planta / Sucesso | `#63AB3F` | Plantinhas do cenário, indicador "no prazo" e saúde OK |
| 13 | Azul Janela / Noite | `#4B80CA` | Janela, água, computador e elementos frios |
| 14 | Roxo Aconchego / Sombra | `#5A4E7C` | Tapete, cama da gatinha e sombras de ambiente |
| 15 | Vermelho Alerta / Atraso | `#D95763` | Indicador de atraso, alerta e detalhes de brinquedos |

### Prompt-Mestre (Base para anexar junto com `docs/referencias/gatinha_referencia.jpg`)

> **Instrução de uso no Gemini:** Sempre anexe a imagem de referência `docs/referencias/gatinha_referencia.jpg` e inclua o bloco abaixo antes da descrição específica da pose ou do objeto.

```text
Use a imagem anexada como folha de referência obrigatória da personagem.
Estilo visual: pixel art 8-bit autêntico em grade fixa de 64x64 pixels, com contorno preto nítido de 1 pixel (#181425).
Personagem: a mesma gatinha calico fofa (pelagem branca #FFFFFF com sombra creme #EAE1D3, mancha cinza na orelha esquerda #6B6967, mancha laranja na orelha direita e cauda #DF8F49, bochechas rosas #F0949E, focinho rosa escuro #AD5E65 e olhos pretos verticais de 1x3 pixels).
Regras estritas de renderização:
1. Fundo de cor chapada única magenta (#FF00FF) para recorte automático.
2. Zero sombra projetada no chão, zero gradiente suave, zero anti-aliasing, zero brilho difuso.
3. Paleta restrita de no máximo 10 cores chapadas da paleta de referência.
4. Pés da gatinha alinhados na linha base inferior (y = 58 de 64) e personagem centralizada horizontalmente.
5. Sem texto nem balão de fala na imagem (o balão é desenhado pelo motor do jogo).
```

---

## A2 · Folha de Referência em Partes e Catálogo Completo de Animações (MVP)

Para reduzir o número de quadros gerados e manter consistência anatômica (Seção 20), a gatinha é montada em **4 camadas com pontos de ancoragem** (`head_anchor`, `neck_anchor`, `tail_anchor`, `paw_anchor`):
1. `body` (corpo + cabeça sem olhos e sem cauda)
2. `tail` (cauda animada separadamente em loop de 4 quadros)
3. `eyes` (olhos abertos, piscando, felizes `^ ^`, sonolentos `- -`, olhando de lado)
4. `accessory` (chapéu, laço, óculos, cachecol ancorados em `head_anchor` ou `neck_anchor`)

### Prompts para as 21 Animações do MVP (Seção 20)

#### 1. Estados do dia a dia (11 animações)
1. **`ociosa` (Idle — 2 quadros, 8 fps):**
   `[Prompt-Mestre] Pose: gatinha sentada de frente (pose idêntica à referência), respirando suavemente. Quadro 1: postura normal. Quadro 2: tronco 1 pixel mais baixo e orelhas 1 pixel mais baixas.`
2. **`andar` (Walk — 4 quadros, 10 fps):**
   `[Prompt-Mestre] Pose: gatinha caminhando em visão 3/4 de topo estilo Pokémon. Sequência de 4 quadros alternando as patinhas dianteiras e traseiras.`
3. **`dormir` (Sleep — 2 quadros, 4 fps):**
   `[Prompt-Mestre] Pose: gatinha enroladinha como uma bolinha deitada de lado, olhos fechados, respirando devagar (peito sobe 1 pixel no quadro 2).`
4. **`comer` (Eat — 3 quadros, 8 fps):**
   `[Prompt-Mestre] Pose: gatinha diante de uma tigelinha pixelada com peixinho, abaixando a cabecinha para mastigar nos quadros 2 e 3.`
5. **`higiene` (Grooming / Banho — 3 quadros, 8 fps):**
   `[Prompt-Mestre] Pose: gatinha sentada com uma touquinha de banho ou escovinha de dentes pixelada, limpando o rosto com a patinha.`
6. **`lazer` (Leisure — 3 quadros, 8 fps):**
   `[Prompt-Mestre] Pose: gatinha sentada segurando um pequeno controle de videogame 8-bit nas patinhas, olhando concentrada e feliz.`
7. **`estudar_ler` (Study / Read — 3 quadros, 8 fps):**
   `[Prompt-Mestre] Pose: gatinha sentada atrás de um livro aberto pixelado, usando óculos redondinhos de leitura, virando a página com a patinha.`
8. **`trabalhar` (Work — 3 quadros, 10 fps):**
   `[Prompt-Mestre] Pose: gatinha diante de um mini notebook pixel art, teclando alternadamente com as duas patinhas da frente.`
9. **`treinar` (Workout — 4 quadros, 10 fps):**
   `[Prompt-Mestre] Pose: gatinha com faixinha na testa levantando um pequeno altere pixelado / fazendo polichinelo fofo.`
10. **`cuidar_casa` (Chores — 3 quadros, 8 fps):**
    `[Prompt-Mestre] Pose: gatinha segurando uma pequena vassourinha pixelada, varrendo de um lado para o outro.`
11. **`sair` (Outdoors — 2 quadros, 8 fps):**
    `[Prompt-Mestre] Pose: gatinha de mochilinha nas costas acenando com a patinha pronta para sair.`

#### 2. Emoções e reações (10 animações)
12. **`feliz` (Happy — 2 quadros, 8 fps):**
    `[Prompt-Mestre] Pose: gatinha sentada com olhinhos em arco feliz (^ ^), bochechas bem rosadas e patinhas levemente erguidas.`
13. **`comemorar` (Celebrate — 4 quadros, 12 fps):**
    `[Prompt-Mestre] Pose: gatinha dando um pulinho de alegria com as duas patinhas para o alto e estrelinhas douradas ao redor.`
14. **`sonolenta` (Sleepy — 3 quadros, 6 fps):**
    `[Prompt-Mestre] Pose: gatinha sentada com olhinhos semicerrados, abrindo a boquinha num bocejo fofo.`
15. **`manhosa` (Clingy / Needy — 2 quadros, 6 fps):**
    `[Prompt-Mestre] Pose: gatinha sentada com orelhinhas levemente caídas para os lados e olhar pidão carinhoso, querendo colo.`
16. **`olhar_relogio` (Check Watch / Late — 3 quadros, 8 fps):**
    `[Prompt-Mestre] Pose: gatinha apontando com uma patinha para um pequeno relógio de pulso/despertador pixelado com expressão curiosa de quem lembra o horário.`
17. **`espreguicar` (Stretch — 3 quadros, 8 fps):**
    `[Prompt-Mestre] Pose: gatinha esticando as patinhas da frente no chão e arqueando as costas num espreguiçar de gato.`
18. **`lamber_se` (Lick Paw — 3 quadros, 8 fps):**
    `[Prompt-Mestre] Pose: gatinha sentada erguendo a patinha direita até a boca para se lamber.`
19. **`brincar_novelo` (Play Yarn — 4 quadros, 10 fps):**
    `[Prompt-Mestre] Pose: gatinha dando patadinhas num novelo de lã rosa (#F0949E) no chão.`
20. **`ronronar` (Purr — 2 quadros, 8 fps):**
    `[Prompt-Mestre] Pose: gatinha de olhinhos fechados contente, com um pequeno coração pixelado rosa flutuando ao lado.`
21. **`miar_falando` (Talk Meow — 2 quadros, 10 fps):**
    `[Prompt-Mestre] Pose: gatinha sentada de frente alternando entre boquinha fechada (quadro 1) e boquinha aberta em "o" miando (quadro 2).`

---

## A3 · Especificação do Script de Tratamento (`scripts/process_sprites.py`)

O script em Python + Pillow (entregue e automatizado no WP-14) realiza duas funções:
1. **Modo Placeholder (`--generate-placeholder`):** gera automaticamente o atlas PNG e o arquivo JSON no formato Aseprite (`cat_atlas.png`, `cat_atlas.json`, `yarn_atlas.png`, `room_atlas.png`) usando a gatinha calico em pixel art e todas as 21 tags de animação e âncoras, para que `:core-game` funcione imediatamente sem esperar geração externa.
2. **Modo Tratamento Gemini (`--input-dir raw/ --output-dir processed/`):**
   - Remove o fundo magenta (`#FF00FF` com tolerância de cor configurável).
   - Recorta a caixa delimitadora (bounding box) e alinha a base dos pés em `y = 58` numa grade de `64×64`.
   - Redimensiona usando exclusivamente `Image.Resampling.NEAREST`.
   - Quantiza cada pixel opaco para a cor mais próxima em `DEADLINE_16_PALETTE` (distância euclidiana em RGB).
   - Empacota os quadros em um único atlas PNG e exporta o JSON compatível com Aseprite (`frames`, `meta.frameTags`, `meta.slices` para âncoras de acessórios).

---

## A4 · Cenário do MVP e Estações da Rotina (180×400 px)

### Prompt do Fundo do Cômodo (`room_bg_180x400.png`)
```text
Pixel art 8-bit em visão 3/4 de topo (estilo Pokémon FireRed / Ruby de Game Boy Advance), resolução exata da grade de 180x400 pixels.
Cenário: um quarto-estúdio aconchegante com parede creme (#F7E8D0) no topo com uma janela azul (#4B80CA), piso de tábuas de madeira clara (#D4A373) e um tapete roxo (#5A4E7C) no centro.
Sem personagens e sem móveis soltos (os móveis entram como sprites separados por camada Y-sorting).
Apenas cores chapadas da paleta de 16 cores, contorno de 1 pixel (#181425), sem iluminação suave nem gradientes.
```

### Estações da Rotina (Sprites separados de 16×16 a 64×64 px)
Cada uma das 10 categorias da rotina aponta para uma estação `(x, y)` no cômodo de `180×400`:
- `ESTUDAR_LER`: Estante de livros e poltrona (`x=40, y=140`)
- `TRABALHAR`: Escrivaninha com notebook (`x=135, y=140`)
- `TREINAR`: Tapetinho de treino com halteres (`x=45, y=250`)
- `COMER`: Tigelinha de ração e água (`x=140, y=220`)
- `HIGIENE`: Cantinho de banho / penteadeira (`x=35, y=195`)
- `LAZER`: TV retrô com videogame no tapete (`x=90, y=200`)
- `DORMIR`: Caminha redonda da gatinha (`x=140, y=300`)
- `CUIDAR_CASA`: Centro do cômodo (`x=90, y=260`)
- `SAIR`: Tapete da porta de entrada (`x=90, y=355`)
- `OCIOSO`: Tapete central (`x=90, y=230`)

---

## A5 · Novelo de Lã e Ícones (16×16 e 24×24 px)

### Prompt do Novelo (`yarn_16x16.png`)
```text
Sprite sheet em pixel art 8-bit em grade de 16x16 pixels por quadro, fundo magenta (#FF00FF), contorno preto de 1px (#181425).
Item: um novelo de lã rosa (#F0949E com sombras #AD5E65) e uma variante de novelo dourado (#F4C852).
Estados:
1. Cheio (100% enrolado)
2. Médio (50% enrolado com fio saindo para a direita)
3. Quase no fim (pequeno, quase todo desenrolado)
4. Rolando (4 quadros de rotação de 90 graus)
```
