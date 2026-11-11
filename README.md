# 🐾 Cat Line (v3.2.0)
> *App gamificado de agenda, hábitos, metas e foco em pixel art 8-bit retro, protagonizado por uma gatinha calico e um novelo de lã.*

[![Versão](https://img.shields.io/badge/versão-3.2.0-orange.svg)]()
[![Android](https://img.shields.io/badge/android-5.0%20%2B%20(API%2021--33)-brightgreen.svg)]()
[![Testes](https://img.shields.io/badge/testes-20%2F20%20suítes%20aprovadas-success.svg)]()
[![Privacidade](https://img.shields.io/badge/privacidade-100%25%20offline-blue.svg)]()
[![Assinatura](https://img.shields.io/badge/apksigner-v1%20%2B%20v2%20%20%2B%20v3-purple.svg)]()

---

## 📖 Visão Geral

**Cat Line** é um aplicativo Android nativo e web/PWA offline-first focado no combate à procrastinação e no cultivo de pontualidade com carinho e acolhimento, sem julgamento punitivo. A rotina da usuária é espelhada no quarto pixel art da gatinha calico, e o progresso em metas desenrola ou recolhe o fio do novelo de lã.

---

## 🌟 Principais Recursos & Novidades da v3.2.0

1. **Metas com Passos Editáveis:** Passos reordenáveis com estimativa de tempo (`estMinutes`), divisão de passos (✂️) e botão "Agendar este passo" em 2 toques.
2. **Máquina de Estados de Compromissos:** 5 estados (`pending`, `done`, `missed`, `rescheduled`, `unmarked`) com suporte a fusos IANA, check-in ao vivo (+2🐟 + 1🐟 bônus), retroativo (0.5x), "Não cumpri" sem desconto e janela de desfazer de 10 min.
3. **Fechamento do Dia (04:00):** Resolução acolhedora na virada do dia lógico às 04:00 sem punir compromissos esquecidos, com opção em lote e +1 Coração (♥).
4. **Log Semanal e Carta da Gatinha:** Snapshot semanal imutável, taxas de cumprimento e pontualidade, mediana de atraso ("O Fio") e carta da gatinha gerada por templates declarativos (100% offline, sem LLM).
5. **Livro-Razão e Tetos Anti-Farm:** Eventos de recompensa com chave única idempotente, teto diário de 15 Peixinhos e 30 minutos de redes sociais, e resposta carinhosa ao atingir limites.
6. **Interruptores de Módulos (AD-11):** Controle independente para Metas com Passos, Compromissos e Log Semanal, com ocultação limpa de interface sem perda de dados.
7. **Backup Schema v2:** Exportação e importação idempotente em JSON, com migração automática e transparente de backups legados da v3.1.0.

---

## 🚀 Como Executar e Testar

### 1. Bateria de Testes Automatizados (`npm test`)
Executa todas as 8 suítes determinísticas (60 testes no total):
```bash
npm test
```

### 2. Simulador Web Local
Inicia o servidor de desenvolvimento e pré-visualização offline-first:
```bash
npm start
# Acesse em: http://localhost:5500
```

### 3. Compilação e Empacotamento do APK Oficial
Gera o APK Android nativo assinado e alinhado:
```bash
node scripts/build-single-file-html.js
node scripts/build-apk.js
```

Os arquivos de instalação gerados são:
- `CatLine.apk` (APK assinado v3.1.0)
- `CatLine-v3.1.0.apk` (APK versionado)
- `CatLine-Instalador.apk` (Instalador amigável)

---

## 🔒 Segurança e Privacidade

- **100% Offline-First:** Sem necessidade de cadastro, nuvem ou banco de dados externo.
- **Relatório Beta Anônimo:** Coleta apenas contadores agregados e métricas operacionais locais, sem nenhum texto livre pessoal da usuária.
- **Assinatura Oficial:** Certificado RSA 2048 com esquemas v1, v2 e v3 verificados via `apksigner`.
- **Proteção do Manifesto:** `android:allowBackup="false"` habilitado para proteger os dados contra extrações via cabo.
- **Salvaguardas de Comunicação:** WhatsApp, discador do telefone, ligações de emergência e configurações do aparelho jamais são bloqueados.

---

## 📜 Licença
Projeto confidencial e de uso privado desenvolvido sob demanda.
