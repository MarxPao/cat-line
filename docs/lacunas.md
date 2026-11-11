# Dead Line — Lacunas e Defaults Adotados

Quando faltar confirmação explícita da cliente durante a implementação de um WP, o agente deve usar os defaults desta tabela e registrar qualquer desvio ou detalhamento técnico em `docs/decisoes.md`.

| Lacuna | Default adotado até confirmação | Onde impacta |
|---|---|---|
| Modelo do celular e versão do Android | `minSdk = 26` (Android 8.0), `targetSdk = 35`; testar tudo no aparelho físico na Fase 0 | `build-logic`, `platform-bloqueio`, `platform-lembretes`, `platform-uso` |
| Nome da gatinha e tratamento | Campo configurável no perfil; nome padrão inicial `"Gatinha"` (ou `"Mimi"` na sugestão de onboarding); trata a usuária por `"mamãe"` (seção 15) | `core-domain`, `ai-llm`, `feature-conversa`, `feature-hoje` |
| Categorias da rotina | As 10 categorias da seção 20: `ESTUDAR_LER`, `TRABALHAR`, `TREINAR`, `COMER`, `HIGIENE`, `LAZER`, `DORMIR`, `CUIDAR_CASA`, `SAIR`, `OCIOSO` | `core-domain`, `core-game` (`RoutineDirector`), `feature-agenda` |
| Cenário do MVP | Um cômodo único integrado (estúdio aconchegante) com uma estação para cada uma das 10 categorias da rotina | `core-game`, `feature-hoje`, Trilha de Arte A4 |
| Provedor de LLM | Os 3 adaptadores (`Anthropic`, `Gemini`, `OpenAICompatible`) são construídos; o primeiro teste (S0.5) usa o provedor em que a cliente já tiver chave | `ai-llm`, `feature-conversa` |
| Apps bloqueados e rigor inicial | Lista de apps bloqueados inicialmente vazia e rigor padrão nível `1` (`AVISO`), com WhatsApp (`com.whatsapp`), discador, emergência, configurações, launchers e o próprio Dead Line na lista de exceções protegidas | `core-domain` (`BlockPolicy`), `platform-bloqueio`, `feature-foco` |
| Valores da economia | Valores iniciais exatos da seção 19 do briefing em arquivo JSON versionado (`economia.json` v1), recalibrados após duas semanas de uso real | `core-domain` (`EconomyEngine`), `core-data` |
| Nome do app e applicationId | `"Dead Line"` em `res/values/strings.xml` e `com.deadline.app` como `namespace` / `applicationId` padrão, isolados para fácil alteração | `app`, `build-logic` |
| Contatos de ajuda (SafetyLayer) | CVV (`188`, 24h) e SAMU (`192`) carregados de arquivo de configuração JSON revisado no Gate G3 | `core-domain`, `ai-llm`, `feature-conversa` |
