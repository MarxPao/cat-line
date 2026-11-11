import re

P = "web-preview/app.js"
s = open(P, encoding="utf-8", newline="").read()
crlf = "\r\n" in s
s = s.replace("\r\n", "\n")
log = []


def sub(old, new, count_expected=1):
    global s
    n = s.count(old)
    if n < 1:
        log.append(f"NAO ENCONTRADO: {old[:70]}")
        return
    s = s.replace(old, new)
    log.append(f"ok ({n}x): {old[:70]}")


def drop_call(fragment):
    """Remove uma chamada setCatSpeech inteira (linha unica) que contenha o fragmento."""
    global s
    pat = re.compile(r"^[ \t]*this\.setCatSpeech\([^\n]*" + re.escape(fragment) + r"[^\n]*\);\n", re.M)
    s, n = pat.subn("", s)
    log.append(f"{'removido' if n else 'NAO ENCONTRADO'} ({n}x): {fragment[:60]}")


# 1) Falas ambientais/repetitivas que sobrescrevem o balao sem necessidade
drop_call("Caminhando até:")
drop_call("O tempo correu!")
drop_call("levando o novelinho")
drop_call("reaberto como pendente")
drop_call("atualizado com sucesso")
drop_call("atualizado!")
drop_call("atualizada!")
drop_call("configurada ao seu gosto")
drop_call("Regra do ${r.name} atualizada")
drop_call("Rede ${p.name} selecionada")
drop_call("Passe de ${minutes} min concedido")

# selectGoalYarn (multilinha)
sub(
    "    this.setCatSpeech(\n      `Miau! Peguei o novelo ${palette.name} da meta \"${goal.title}\" na patinha!`\n    );\n",
    "",
)

# 2) Falas padrao
sub("'Miau, mamãe! Estou brincando com o novelo da sua meta enquanto o tempo corre!'", "'Oi! Vamos cuidar do seu dia?'")
sub(
    '"Miau, mamãe! Estou aqui com você. Clique em uma meta para trocar a cor do novelinho na minha mão!"',
    '"Oi! Estou aqui com você. Toque em uma meta para trocar a cor do novelo."',
)

# 3) Carinho
sub('"Ronrom... que carinho gostoso, mamãe! +1 Vínculo ♥"', '"Ronrom... +1 Vínculo ♥"')
sub('"Prrr... prrr... me sinto tão amada com você! +1 Vínculo ♥"', '"Prrr... +1 Vínculo ♥"')
sub('"Miau! Patinha macia e carinho quentinho! +1 Vínculo ♥"', '"Que gostoso! +1 Vínculo ♥"')
sub('"Ronrom... prrr... vamos vencer o dia juntas! +1 Vínculo ♥"', '"Vamos vencer o dia juntas! +1 Vínculo ♥"')

# 4) Execucao "fazendo agora"
sub(
    "`Miau, mamãe! Puxei o fio! Sentei na estante com meus óculos e livrinho para estudar \"${title}\" com você! 📖`",
    "`Vamos estudar \"${title}\" juntas! 📖`",
)
sub(
    "`Miau, mamãe! Coloquei minha faixa esportiva! Vamos treinar \"${title}\" juntas com muita energia! 🏃‍♀️`",
    "`Vamos treinar \"${title}\" juntas! 🏃‍♀️`",
)
sub(
    "`Miau, mamãe! Abri meu notebook na escrivaninha! Foco total em \"${title}\" juntas! 💻`",
    "`Foco total em \"${title}\"! 💻`",
)
sub(
    "`Miau, mamãe! Peguei minha vassourinha! Vamos organizar \"${title}\" e deixar tudo brilhando! 🧹`",
    "`Vamos organizar \"${title}\" juntas! 🧹`",
)
sub("`Miau! Me hidratando e nutrindo com você em \"${title}\"! 💧`", "`Hora de \"${title}\"! 💧`")
sub("`Miau... hora de descansar o corpinho em \"${title}\"... 💤`", "`Hora de descansar: \"${title}\" 💤`")
sub(
    "`Miau, mamãe! Estou fazendo \"${title}\" juntinho de você agora! ♥`",
    "`Fazendo \"${title}\" com você! ♥`",
)
sub('"Miau! Tarefa pausada. Estou aqui brincando com meu novelinho na sala!"', '"Tarefa pausada."')

# 5) Check-ins e criacoes
sub("`Miau, mamãe! No prazo! +${occ.reward} peixinhos ganhos!`", "`No prazo! +${occ.reward}🐟`")
sub("`Check-in retroativo marcado com +${half}🐟! O importante é continuar!`", "`Check-in retroativo: +${half}🐟`")
sub(
    "`Novo compromisso \"${title}\" (${recurrence}) enrolado na sua agenda!`",
    "`Compromisso \"${title}\" adicionado.`",
)
sub(
    "`Novo hábito \"${title}\" criado! A consistência enrola o novelo do sucesso!`",
    "`Hábito \"${title}\" criado.`",
)
sub("`Hábito \"${h.title}\" cumprido! +8🐟 ganhos com muito orgulho!`", "`Hábito \"${h.title}\" cumprido! +8🐟`")
sub(
    "`Meta \"${title}\" criada para ${days} dias com o novelo ${getYarnPalette(newGoal.yarnColorId).name} na minha patinha!`",
    "`Meta \"${title}\" criada para ${days} dias.`",
)
sub('"Novelo reserva adquirido! Suas sequências de hábitos estão protegidas contra dias perdidos."', '"Novelo reserva adquirido! Suas sequências estão protegidas."')
sub('"Miau, mamãe! Novo acessório comprado e equipado com amor!"', '"Acessório comprado e equipado!"')
sub('`Novo mimo "${title}" adicionado à sua lista de recompensas! 🎁`', '`Mimo "${title}" adicionado. 🎁`')
sub(
    "`Miau, mamãe! VOCÊ CONQUISTOU: ${rw.title}! ${rw.icon} ✨ Vá aproveitar sem peso na consciência!`",
    "`Você conquistou: ${rw.title}! ${rw.icon} ✨`",
)

# 6) Foco
sub(
    "`Miau, mamãe! Modo Foco iniciado por ${minutes} minutos! Puxando o fio juntinhas com ronrom! 🧶`",
    "`Modo Foco: ${minutes} minutos. Vamos! 🧶`",
)
sub('"Foco pausada. Pode respirar um pouquinho, mamãe!"', '"Foco pausado."')
sub('"Foco pausado. Pode respirar um pouquinho, mamãe!"', '"Foco pausado."')
sub('"Foco retomado! Vamos até o fim!"', '"Foco retomado!"')
sub('"Parabéns, mamãe! Foco concluído com louvor! +15🐟 e +15♥ ganhos com a gatinha!"', '"Foco concluído! +15🐟 e +15♥"')

# 7) Bloqueio / plano / duplicatas da agenda rapida
sub('"Parabéns, mamãe! Todas as tarefas foram cumpridas! Redes sociais liberadas!"', '"Tarefas cumpridas! Redes sociais liberadas."')
sub(
    "`Miau, mamãe! Plano aplicado com sucesso! Seus ${state.briefing.selectedHabits.length} hábitos e sua meta já estão visíveis aqui na sua rotina de Hoje!`",
    "`Plano aplicado! ${state.briefing.selectedHabits.length} hábitos e sua meta já estão em Hoje.`",
)
sub('`Miau! Compromisso "${title}" às ${time} adicionado na sua linha do tempo!`', '`Compromisso "${title}" às ${time} adicionado.`')
sub('`Miau! Novo hábito "${title}" criado com sucesso!`', '`Hábito "${title}" criado.`')
sub('`Miau! Meta "${title}" criada e já peguei o novelinho na patinha!`', '`Meta "${title}" criada.`')
sub('`Miau! Mimo "${title}" adicionado às suas recompensas!`', '`Mimo "${title}" adicionado.`')
sub('`Ufa! Restaurei "${item.title}" de volta para você, mamãe!`', '`"${item.title}" restaurado.`')
sub("'Modo Noturno aconchegante ativado para descansar seus olhinhos! 🌙'", "'Modo Noturno ativado. 🌙'")
sub("'Modo Claro ensolarado ativado! ☀️'", "'Modo Claro ativado. ☀️'")
sub("'Letras ampliadas ativadas para leitura super confortável! 🔍'", "'Letras ampliadas ativadas. 🔍'")
sub("'Tamanho de letra padrão restaurado!'", "'Tamanho de letra padrão restaurado.'")
sub("'Miau, mamãe! Passando para lembrar você de puxar o fio das suas metas hoje! 🧶🐾'", "'Lembrete: confira suas metas de hoje! 🐾'")
sub(
    '`⏰ Hora de "${o.title}" (${o.time})! Vamos fazer juntinhas para ganhar +${o.reward}🐟?`',
    '`⏰ Hora de "${o.title}" (${o.time})! +${o.reward}🐟`',
)

# 8) Rotulo de status
sub('"🐾 Focando juntinho com você"', '"🐾 Focando com você"')
sub('"🧶 Modo Livre · Brincando com o Novelo"', '"🧶 Modo Livre"')
sub("Estudando e lendo com você na estante", "Estudando")
sub("Treinando calistenia no tapete com faixinha", "Treinando")
sub("Trabalhando no notebook na escrivaninha", "Trabalhando")
sub("Cuidando da casa e varrendo com vassourinha", "Cuidando da casa")
sub("Hidratando e nutrindo na tigelinha", "Comendo e bebendo")
sub("Descansando e dormindo na caminha", "Descansando")

if crlf:
    s = s.replace("\n", "\r\n")
open(P, "w", encoding="utf-8", newline="").write(s)
with open("scratch-speech-log.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(log))
print("\n".join(l for l in log if l.startswith("NAO")) or "todas as substituicoes aplicadas")
