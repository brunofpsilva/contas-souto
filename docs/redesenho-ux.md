# Redesenho de UX/UI da Contas Souto

Proposta escrita a 10 nov 2026, no ramo `redesenho-ux`. **Aprovada no mesmo dia, com todas as recomendações da [secção 10](#10-perguntas)**: registo impessoal, paleta B (Areia), o número do Início segue o estado, "Sem divisão", filtro "Por pagar" ao abrir e "Atualizar saldos".

A app tem de responder em 2 segundos a uma pergunta: **chega o dinheiro até à escritura e ao fim da obra, e quanto sobra?** Tudo neste documento serve essa resposta.

## Índice

1. [O que muda, em resumo](#1-o-que-muda-em-resumo)
2. [Diagnóstico confirmado](#2-diagnóstico-confirmado)
3. [Mapa de navegação](#3-mapa-de-navegação)
4. [Wireframes a 375 px](#4-wireframes-a-375-px)
5. [Glossário](#5-glossário)
6. [Guia de texto](#6-guia-de-texto)
7. [Textos: antes e depois](#7-textos-antes-e-depois)
8. [Design tokens](#8-design-tokens)
9. [Plano de implementação](#9-plano-de-implementação)
10. [Perguntas](#10-perguntas)

---

## 1. O que muda, em resumo

| Hoje | Proposta |
|---|---|
| Resumo com 8 blocos | Início com 1 cartão (estado, número, contexto) e os 4 próximos pagamentos |
| "Nova despesa" só em Despesas | "+" no centro da barra de baixo, em todos os separadores |
| Previsão escondida no Resumo, gráfico que nunca aparece | Separador Previsão: gráfico sempre visível, contas feitas, mês a mês |
| Contas mistura saldos, reserva e datas | Definições (ícone no cabeçalho): datas e reserva, contas, tema, sair |
| 3 botões por despesa | Círculo para marcar como paga; toque na linha abre a despesa |
| 3 fontes, tamanhos e raios arbitrários | 1 fonte, 6 tamanhos, 3 raios |
| Tema só do sistema, verde herdado | Sistema / Claro / Escuro, com tokens semânticos e AA verificado por teste |
| 8 parágrafos fixos, "tu" e "vocês" misturados | Zero parágrafos fixos, registo impessoal, um termo por conceito |

Concordo com a direção que propuseste (4 separadores e Definições no cabeçalho). Mudo ou acrescento cinco pontos, com o motivo de cada um:

1. **O "+" vai para a barra de baixo**, como 5.º lugar ao centro. Fica sempre no mesmo sítio, ao alcance do polegar, e não tapa a última linha das listas como um botão flutuante taparia.
2. **Sub-páginas em vez de folhas inferiores.** Tocar numa despesa abre a página de edição que já existe. Uma despesa tem 7 campos: a "ficha" e o formulário mostrariam o mesmo, e a folha obrigava a mais um toque e a uma dependência nova. O mesmo para "Gastos mensais" e "Editar divisões".
3. **"Por categoria" passa para o fim do Orçamento.** Não cabia na tua tabela. É o único sítio onde faz sentido: usa a mesma barra pago / por pagar.
4. **No telemóvel, o cabeçalho mostra o título do ecrã**, e não "Contas Souto". Poupa uma linha de 60 px e é o que põe o Início inteiro acima da dobra.
5. **O número do Início segue o estado.** Quando falta dinheiro antes do último marco, mostrar o saldo do último marco dá um número positivo debaixo de um aviso vermelho. Proponho mostrar o saldo no ponto em que falha. É a [pergunta 3](#10-perguntas).

---

## 2. Diagnóstico confirmado

Confirmei no código todos os pontos da auditoria. Encontrei mais nove coisas:

| # | O que encontrei | Onde |
|---|---|---|
| 1 | O tema claro atual falha AA em três combinações de texto: aviso sobre aviso-suave 3,67:1, aviso sobre fundo 4,05:1 e ok sobre ok-suave 4,13:1 (o mínimo é 4,5:1). | `globals.css` |
| 2 | O contorno dos campos tem 1,58:1 no claro e 1,75:1 no escuro (o mínimo para um controlo é 3:1). | `--input` |
| 3 | Todos os valores negativos da previsão estão a vermelho, incluindo gastos normais. O vermelho deixa de significar "problema". | `extrato-previsto.tsx` (`Celula`, `Movimentos`) |
| 4 | "Por pagar" nas barras usa âmbar `#b07400`, quase igual à cor de aviso `#a66a00`. Uma cor de estado está a servir de série. | `--grafico-2` |
| 5 | Os erros do Wallet ficam gravados em `sincronizacoes.mensagem` e são mostrados tal e qual. Reescrever as frases em `wallet.ts` não chega: os erros antigos continuam na base de dados. | `contas/page.tsx`, `painel-sync.tsx` |
| 6 | Depois de a escritura passar, o Resumo diz "Sem data da escritura", porque `p.escritura` também é `null` quando a data já passou. | `(app)/page.tsx` |
| 7 | Não há páginas de erro nem de "não encontrado": aparecem as do Next, em inglês. | `src/app` |
| 8 | A Instrument Sans, que já é a fonte do texto, tem algarismos tabulares (`tnum`). Verifiquei no ficheiro da fonte. Não é precisa uma fonte mono. | `layout.tsx` |
| 9 | `Card`, `Badge`, `Alert`, `Table` e `Separator` não são importados em lado nenhum. | `components/ui` |

O ponto 5 resolve-se sem migração: a interface escolhe a frase pelo `codigoErro` (que já existe na tabela) e a mensagem técnica fica só no log.

---

## 3. Mapa de navegação

```text
/login                      Login
/                           Início
/despesas                   Despesas          ?ver=por-pagar|pagas|todas   ?divisao=ID|nenhuma
  /despesas/nova            Nova despesa      ?divisao=ID   ?adicionada=1
  /despesas/[id]/editar     Editar despesa
/previsao                   Previsão                                        (novo)
  /previsao/gastos          Gastos mensais                                  (novo)
/orcamento                  Orçamento
  /orcamento/editar         Editar divisões                                 (novo)
/definicoes                 Definições        #datas   #contas              (novo)
/contas                     redireciona para /definicoes
```

**Barra de baixo (telemóvel)**: Início · Despesas · **+** · Previsão · Orçamento. Altura 64 px mais a margem segura; rótulos a 12 px, sem maiúsculas. O "+" é um círculo de 48 px na cor primária, com o rótulo acessível "Adicionar despesa".

**Cabeçalho (telemóvel)**: título do ecrã à esquerda; à direita, o olho (esconder saldos) e a roda dentada (Definições), cada um com 44 px. Nas sub-páginas, uma seta para voltar e o título; a barra de baixo dá lugar aos botões do formulário.

**Desktop (a partir de 768 px)**: "Contas Souto", os 4 separadores, o botão "Adicionar despesa", o olho e a roda dentada, tudo no cabeçalho. O título do ecrã passa para o topo do conteúdo.

| Quero… | Caminho |
|---|---|
| Saber se chega | Abrir a app (Início) |
| Adicionar uma despesa | "+" em qualquer separador |
| Marcar como paga | Círculo da linha, no Início ou em Despesas |
| Editar ou apagar uma despesa | Toque na linha |
| Ver as despesas de uma divisão | Orçamento › toque na divisão, ou a lista "Todas as divisões" em Despesas |
| Ver o saldo mês a mês | Previsão |
| Ajustar os gastos de um mês | Previsão › Gastos mensais › Ajustar |
| Perceber como é calculado | Previsão › Como é calculado |
| Mudar limites ou divisões | Orçamento › Editar |
| Mudar a data da escritura ou do fim da obra | Definições (também pelas ligações "Definir") |
| Escolher contas, atualizar saldos, mudar a reserva | Definições |
| Mudar o tema, sair | Definições |

O "+" leva a divisão consigo: em `/despesas?divisao=ID` abre `/despesas/nova?divisao=ID`, como hoje.

---

## 4. Wireframes a 375 px

Cada moldura tem 39 colunas, mais ou menos 375 px. A linha `dobra · 667 px` marca o que se vê sem scroll num iPhone SE em modo app; nos telemóveis mais altos vê-se mais.

Legenda: `○` por pagar (toque marca como paga), `●` paga, `[ … ]` botão ou campo, `▾` lista ou linha que abre, `›` abre outro ecrã, `(i)` ajuda num toque, `(olho)` esconder saldos, `(def)` Definições, `█` pago, `▒` por pagar, `░` disponível, `▓` opção escolhida.

### 4.1 Início

```text
INÍCIO · estado «Chega»
┌───────────────────────────────────────┐
│ Início                   (olho) (def) │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ ✓ Chega para tudo                 │ │
│ │                                   │ │
│ │ 12 480 €                          │ │
│ │ depois da escritura · 12 dez      │ │
│ ├───────────────────────────────────┤ │
│ │ Saldo hoje              Por pagar │ │
│ │ 45 300 €                 32 820 € │ │
│ └───────────────────────────────────┘ │
│ Atualizado 10 nov, 09:14              │
│                                       │
│ Próximos pagamentos       Ver todas › │
│ ┌───────────────────────────────────┐ │
│ │ ○ Sinal ao empreiteiro    5 000 € │ │
│ │   Atrasada · outubro              │ │
│ ├───────────────────────────────────┤ │
│ │ ○ Cozinha                 8 200 € │ │
│ │   novembro                        │ │
│ ├───────────────────────────────────┤ │
│ │ ○ IMT e selo             12 400 € │ │
│ │   Escritura · 12 dez              │ │
│ ├───────────────────────────────────┤ │
│ │ ○ Sofá                    1 200 € │ │
│ │   dezembro                        │ │
│ └───────────────────────────────────┘ │
╞═══════════ dobra · 667 px ════════════╡
├───────────────────────────────────────┤
│ Início Despesas  +  Previsão Orçamento│
└───────────────────────────────────────┘
```

- **Acima da dobra: tudo.** O cartão responde "chega ou não, e quanto sobra". O "+" adiciona uma despesa.
- O estado tem ícone, texto e cor. O número tem 40 px.
- "Saldo hoje" abre Definições › Contas. "Por pagar" abre Despesas.
- Os próximos pagamentos são os 4 primeiros por pagar: atrasadas primeiro, depois por mês.
- Se a última atualização falhou, a linha "Atualizado…" passa a "A última atualização falhou. Ver".

Os outros estados só mudam o cartão. Há no máximo uma linha extra de contexto.

```text
INÍCIO · «Abaixo da reserva» (só o cartão muda)
┌───────────────────────────────────────┐
│ ┌───────────────────────────────────┐ │
│ │ ! Abaixo da reserva na escritura  │ │
│ │                                   │ │
│ │ 3 100 €                           │ │
│ │ depois da escritura · 12 dez      │ │
│ │ Reserva mínima: 5 000 €           │ │
│ ├───────────────────────────────────┤ │
│ │ Saldo hoje              Por pagar │ │
│ │ 35 900 €                 32 820 € │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

```text
INÍCIO · «Falta dinheiro» antes do último marco
┌───────────────────────────────────────┐
│ ┌───────────────────────────────────┐ │
│ │ ✕ Falta dinheiro na escritura     │ │
│ │                                   │ │
│ │ −3 200 €                          │ │
│ │ depois da escritura · 12 dez      │ │
│ │ Depois da obra (20 mar): 1 500 €  │ │
│ ├───────────────────────────────────┤ │
│ │ Saldo hoje              Por pagar │ │
│ │ 29 600 €                 47 820 € │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

```text
INÍCIO · sem saldos
┌───────────────────────────────────────┐
│ Início                   (olho) (def) │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ ○ Sem saldos                      │ │
│ │                                   │ │
│ │ A previsão precisa dos saldos do  │ │
│ │ Wallet.                           │ │
│ │                                   │ │
│ │ [       Atualizar saldos        ] │ │
│ └───────────────────────────────────┘ │
│                                       │
│ Próximos pagamentos       Ver todas › │
│ ┌───────────────────────────────────┐ │
│ │ ○ Cozinha                 8 200 € │ │
│ │   novembro                        │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ Início Despesas  +  Previsão Orçamento│
└───────────────────────────────────────┘
```

```text
INÍCIO · sem despesas e sem datas
┌───────────────────────────────────────┐
│ Início                   (olho) (def) │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ ○ Nada por pagar                  │ │
│ │                                   │ │
│ │ 52 100 €                          │ │
│ │ no fim de abril de 2027           │ │
│ │                                   │ │
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │
│ │ Sem datas definidas.    Definir › │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ Ainda não há despesas.            │ │
│ │                                   │ │
│ │ [       Adicionar despesa       ] │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ Início Despesas  +  Previsão Orçamento│
└───────────────────────────────────────┘
```

### 4.2 Despesas

```text
DESPESAS
┌───────────────────────────────────────┐
│ Despesas                 (olho) (def) │
├───────────────────────────────────────┤
│ ┌───────────┬───────────┬───────────┐ │
│ │▓Por pagar▓│   Pagas   │   Todas   │ │
│ └───────────┴───────────┴───────────┘ │
│ [ Todas as divisões               ▾ ] │
│ 14 despesas               32 820,00 € │
│                                       │
│ Novembro de 2026          13 200,00 € │
│ ┌───────────────────────────────────┐ │
│ │ ○ Sinal ao empreiteiro 5 000,00 € │ │
│ │   Atrasada · Obras · Geral        │ │
│ ├───────────────────────────────────┤ │
│ │ ○ Cozinha              8 200,00 € │ │
│ │   Cozinha · Cozinha               │ │
│ └───────────────────────────────────┘ │
│ Dezembro de 2026          19 620,00 € │
│ ┌───────────────────────────────────┐ │
│ │ ○ IMT e selo          12 400,00 € │ │
│ │   Escritura · 12 dez · Impostos   │ │
│ ├───────────────────────────────────┤ │
│ │ ○ Sofá                 1 200,00 € │ │
│ │   Mobília · Sala                  │ │
│ └───────────────────────────────────┘ │
╞═══════════ dobra · 667 px ════════════╡
│ ┌───────────────────────────────────┐ │
│ │ ○ Candeeiros             420,00 € │ │
│ │   Decoração · Sala                │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ Início Despesas  +  Previsão Orçamento│
└───────────────────────────────────────┘
```

- **Acima da dobra**: filtros, total e as primeiras 4 despesas.
- Cada linha tem dois alvos: o círculo (44 px) e o resto da linha, que abre a edição.
- A lista "Todas as divisões" substitui a etiqueta com o X de 32 px.
- Os cêntimos só aparecem aqui e no formulário.

```text
DESPESAS · linha paga (filtro «Pagas» ou «Todas»)
┌───────────────────────────────────────┐
│ ┌───────────────────────────────────┐ │
│ │ ● Sinal da casa       10 000,00 € │ │
│ │   Paga · Escritura e impostos     │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

```text
DESPESAS · vazio
┌───────────────────────────────────────┐
│ Despesas                 (olho) (def) │
├───────────────────────────────────────┤
│ ┌───────────┬───────────┬───────────┐ │
│ │▓Por pagar▓│   Pagas   │   Todas   │ │
│ └───────────┴───────────┴───────────┘ │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ Nada por pagar.                   │ │
│ │                                   │ │
│ │ [       Adicionar despesa       ] │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ Início Despesas  +  Previsão Orçamento│
└───────────────────────────────────────┘
```

Marcar como paga mostra um aviso durante 5 segundos, com "Anular":

```text
AVISO depois de marcar como paga (5 s)
┌───────────────────────────────────────┐
│ ┌───────────────────────────────────┐ │
│ │ «Sofá» paga.               Anular │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ Início Despesas  +  Previsão Orçamento│
└───────────────────────────────────────┘
```

### 4.3 Nova despesa e Editar despesa

```text
NOVA DESPESA (Editar é igual, ver notas)
┌───────────────────────────────────────┐
│ ‹ Nova despesa                        │
├───────────────────────────────────────┤
│ Descrição                             │
│ [ Sofá                              ] │
│ Valor                                 │
│ [ 1 200,00                        € ] │
│ Quando                                │
│ ┌───────────┬───────────┬───────────┐ │
│ │▓▓Num mês▓▓│ Escritura │Fim da obra│ │
│ └───────────┴───────────┴───────────┘ │
│ [ dezembro de 2026                ▾ ] │
│ Estado                                │
│ ┌─────────────────┬─────────────────┐ │
│ │▓▓▓▓Por pagar▓▓▓▓│      Paga       │ │
│ └─────────────────┴─────────────────┘ │
╞════ dobra · 667 px · botões fixos ════╡
│ Categoria                             │
│ [ Mobília                         ▾ ] │
│ Divisão                               │
│ [ Sala                            ▾ ] │
│ Nota (opcional)                       │
│ [                                   ] │
├───────────────────────────────────────┤
│ [        Adicionar despesa          ] │
│ [      Adicionar e criar outra      ] │
└───────────────────────────────────────┘
```

- **Acima da dobra**: Descrição, Valor, Quando, Estado e os botões, que ficam fixos em baixo.
- Com "Escritura" ou "Fim da obra" escolhido, o campo do mês dá lugar a uma linha: "12 dez · muda com a data". Sem data definida: "Sem data da escritura. Definir".
- **Editar** é o mesmo ecrã com um só botão fixo, "Guardar". No fim do formulário ficam "Apagar despesa" e a linha "Criada por Ana · Paga por Rui a 10 nov".
- Não há botão "Cancelar": a seta do topo volta atrás.

```text
EDITAR › APAGAR (diálogo)
┌───────────────────────────────────────┐
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ Apagar «Sofá»?                    │ │
│ │                                   │ │
│ │ [ Cancelar ]   [ Apagar despesa ] │ │
│ └───────────────────────────────────┘ │
│                                       │
└───────────────────────────────────────┘
```

### 4.4 Previsão

```text
PREVISÃO
┌───────────────────────────────────────┐
│ Previsão (i)             (olho) (def) │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ Saldo previsto                    │ │
│ │ 45 mil ┤●─╮                       │ │
│ │        │   ╰──╮      ┆            │ │
│ │ 20 mil ┤      ╰──────●───╮    ┆   │ │
│ │  5 mil ┤- - - - - - -┆- -╰────● - │ │
│ │      0 ┼────┬────┬───┴┬────┬──┴─  │ │
│ │        nov  dez  jan  fev  mar    │ │
│ │        ┆ Escritura · Fim da obra  │ │
│ │        - - Reserva mínima         │ │
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │
│ │ Saldo hoje               45 300 € │ │
│ │ Entradas                +19 500 € │ │
│ │ Gastos mensais          −12 500 € │ │
│ │ Despesas                −47 820 € │ │
│ ├───────────────────────────────────┤ │
│ │ Depois da obra · 20 mar   4 480 € │ │
│ └───────────────────────────────────┘ │
╞═══════════ dobra · 667 px ════════════╡
│ Mês a mês                             │
│ ┌───────────────────────────────────┐ │
│ │ Novembro · até 25 nov  40 300 € ▾ │ │
│ ├───────────────────────────────────┤ │
│ │ Dezembro               33 200 € ▴ │ │
│ │   Entradas             +5 800 €   │ │
│ │   Gastos mensais       −2 500 €   │ │
│ │   Despesas            −10 400 €   │ │
│ ├───────────────────────────────────┤ │
│ │ ■ Escritura · 12 dez   20 800 €   │ │
│ │   3 despesas          −12 400 €   │ │
│ ├───────────────────────────────────┤ │
│ │ Janeiro de 2027        22 200 € ▾ │ │
│ ├───────────────────────────────────┤ │
│ │ Fevereiro de 2027      23 600 € ▾ │ │
│ └───────────────────────────────────┘ │
│ Gastos mensais                        │
│ ┌───────────────────────────────────┐ │
│ │ 2 500 € por mês · automático      │ │
│ │ Dezembro: no ano passado, Viagens │ │
│ │ 800 €.                            │ │
│ │                       [ Ajustar ] │ │
│ └───────────────────────────────────┘ │
│ ▸ Como é calculado                    │
├───────────────────────────────────────┤
│ Início Despesas  +  Previsão Orçamento│
└───────────────────────────────────────┘
```

- **Acima da dobra**: o gráfico e as contas feitas.
- O gráfico aparece sempre que há saldos. Marca a escritura, o fim da obra e a reserva mínima.
- O cartão das contas substitui a linha "Total" e a frase "Ficam X… acima da reserva de Y". Soma de verdade: saldo hoje, mais entradas, menos gastos mensais, menos despesas, igual ao saldo depois do último marco.
- "Mês a mês" mostra o saldo de cada mês. Tocar num mês abre as três parcelas. A partir de 768 px é o mesmo componente em grelha de 5 colunas, sempre aberto.
- Um mês abaixo da reserva ou negativo leva uma etiqueta com ícone.
- O `(i)` do título explica o mês uma vez: "Cada mês começa no dia do salário: novembro vai de 26 de outubro a 25 de novembro."

```text
PREVISÃO · «Como é calculado» aberto
┌───────────────────────────────────────┐
│ ▾ Como é calculado                    │
│ ┌───────────────────────────────────┐ │
│ │ Entradas por mês                  │ │
│ │ Salários                  3 900 € │ │
│ │ Fixo: Ana 2 000 € + Rui 1 900 €   │ │
│ │ Outros rendimentos          105 € │ │
│ │ Valor habitual, últimos 12 meses  │ │
│ ├───────────────────────────────────┤ │
│ │ Gastos mensais                    │ │
│ │ Dia a dia                 2 180 € │ │
│ │ Valor habitual, últimos 12 meses  │ │
│ │ Renda                       320 € │ │
│ │ Valor habitual, últimos 12 meses  │ │
│ ├───────────────────────────────────┤ │
│ │ Uma vez por ano                   │ │
│ │ Subsídio de Natal · dez   1 900 € │ │
│ │ Reembolso do IRS · jun      640 € │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

```text
PREVISÃO › GASTOS MENSAIS
┌───────────────────────────────────────┐
│ ‹ Gastos mensais                      │
├───────────────────────────────────────┤
│ Novembro · o que falta                │
│ [ 1 400                           € ] │
│ Dezembro                              │
│ [ 3 300                           € ] │
│ No ano passado: Viagens 800 €         │
│ Janeiro de 2027                       │
│ [ 2 500                           € ] │
│ Fevereiro de 2027                     │
│ [ 2 500                           € ] │
╞════ dobra · 667 px · botões fixos ════╡
│ Março de 2027                         │
│ [ 2 500                           € ] │
├───────────────────────────────────────┤
│ [             Guardar               ] │
│ [         Repor automático          ] │
└───────────────────────────────────────┘
```

```text
PREVISÃO · sem saldos
┌───────────────────────────────────────┐
│ Previsão (i)             (olho) (def) │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ A previsão precisa dos saldos do  │ │
│ │ Wallet.                           │ │
│ │                                   │ │
│ │ [       Atualizar saldos        ] │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ Início Despesas  +  Previsão Orçamento│
└───────────────────────────────────────┘
```

### 4.5 Orçamento

```text
ORÇAMENTO
┌───────────────────────────────────────┐
│ Orçamento (i)            (olho) (def) │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ Gasto                             │ │
│ │ 21 400 € de 30 000 €              │ │
│ │ █████████▒▒▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░ │ │
│ │ █ Pago 9 200 · ▒ Por pagar 12 200 │ │
│ │ Disponível 8 600 €                │ │
│ └───────────────────────────────────┘ │
│ Divisões                   [ Editar ] │
│ ┌───────────────────────────────────┐ │
│ │ Cozinha                         › │ │
│ │ 9 400 € de 10 000 €               │ │
│ │ ████████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░░ │ │
│ │ Disponível 600 €                  │ │
│ ├───────────────────────────────────┤ │
│ │ Sala                            › │ │
│ │ 5 300 € de 5 000 €                │ │
│ │ ██████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒┃▒ │ │
│ │ ! Acima do limite 300 €           │ │
│ └───────────────────────────────────┘ │
╞═══════════ dobra · 667 px ════════════╡
│ ┌───────────────────────────────────┐ │
│ │ Garagem                         › │ │
│ │ 450 € · sem limite                │ │
│ ├───────────────────────────────────┤ │
│ │ Sem divisão                     › │ │
│ │ 6 250 € · fora do orçamento       │ │
│ └───────────────────────────────────┘ │
│ Categorias                            │
│ ┌───────────────────────────────────┐ │
│ │ Obras                    18 000 € │ │
│ │ ██████████████▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ │ │
│ ├───────────────────────────────────┤ │
│ │ Escritura e impostos     12 400 € │ │
│ │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒           │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ Início Despesas  +  Previsão Orçamento│
└───────────────────────────────────────┘
```

- **Acima da dobra**: o total e as duas primeiras divisões.
- As linhas são só de leitura. Tocar numa divisão abre as despesas dela.
- Passar do limite é um aviso (âmbar), não um erro: o orçamento é só comparação.
- O `(i)` do título substitui o parágrafo de introdução: "Conta o que está pago e por pagar. Não entra na previsão."

```text
ORÇAMENTO › EDITAR DIVISÕES
┌───────────────────────────────────────┐
│ ‹ Editar divisões                     │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ Nome                              │ │
│ │ [ Cozinha                       ] │ │
│ │ Limite                            │ │
│ │ [ 10 000              € ]  [lixo] │ │
│ ├───────────────────────────────────┤ │
│ │ Nome                              │ │
│ │ [ Sala                          ] │ │
│ │ Limite                            │ │
│ │ [ 5 000               € ]  [lixo] │ │
│ └───────────────────────────────────┘ │
│ Nova divisão                          │
│ ┌───────────────────────────────────┐ │
│ │ Nome                              │ │
│ │ [ Casa de banho                 ] │ │
│ │ Limite (opcional)                 │ │
│ │ [                     € ]   [ + ] │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ [             Guardar               ] │
└───────────────────────────────────────┘
```

```text
ORÇAMENTO · vazio
┌───────────────────────────────────────┐
│ Orçamento (i)            (olho) (def) │
├───────────────────────────────────────┤
│ ┌───────────────────────────────────┐ │
│ │ Ainda não há divisões.            │ │
│ │                                   │ │
│ │ [       Adicionar divisão       ] │ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ Início Despesas  +  Previsão Orçamento│
└───────────────────────────────────────┘
```

### 4.6 Definições

```text
DEFINIÇÕES
┌───────────────────────────────────────┐
│ ‹ Definições                          │
├───────────────────────────────────────┤
│ Datas e reserva                       │
│ ┌───────────────────────────────────┐ │
│ │ Escritura                         │ │
│ │ [ 12/12/2026                    ] │ │
│ │ 3 despesas · 12 400 €             │ │
│ │ Fim da obra                       │ │
│ │ [ 20/03/2027                    ] │ │
│ │ 1 despesa · 15 000 €              │ │
│ │ Reserva mínima (i)                │ │
│ │ [ 5 000                       € ] │ │
│ │ [            Guardar            ] │ │
│ └───────────────────────────────────┘ │
│ Contas do Wallet                      │
│ ┌───────────────────────────────────┐ │
│ │ Atualizado 10 nov, 09:14    [ ↻ ] │ │
│ ├───────────────────────────────────┤ │
│ │ ☑ Conta ordenado      12 300,00 € │ │
│ │   Conta à ordem                   │ │
│ ├───────────────────────────────────┤ │
│ │ ☑ Poupança            33 000,00 € │ │
│ │   Poupança                        │ │
│ └───────────────────────────────────┘ │
╞═══════════ dobra · 667 px ════════════╡
│ ┌───────────────────────────────────┐ │
│ │ ☐ Cartão                −250,00 € │ │
│ │   Cartão de crédito               │ │
│ ├───────────────────────────────────┤ │
│ │ Saldo hoje            45 300,00 € │ │
│ └───────────────────────────────────┘ │
│ Tema                                  │
│ ┌───────────┬───────────┬───────────┐ │
│ │▓▓Sistema▓▓│   Claro   │  Escuro   │ │
│ └───────────┴───────────┴───────────┘ │
│ Sessão                                │
│ ┌───────────────────────────────────┐ │
│ │ Bruno                    [ Sair ] │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

- **Acima da dobra**: datas, reserva e o início das contas.
- **Uma regra de gravação para a app toda: o que se toca grava logo; o que se escreve tem "Guardar".** Caixas das contas e tema gravam ao tocar. Datas, reserva, nomes e limites têm um botão "Guardar" por cartão. Apagar pede sempre confirmação.
- As duas datas e a reserva gravam com um só botão, em vez de três.
- O `(i)` da reserva: "Avisa quando o saldo previsto fica abaixo deste valor."

### 4.7 Login

```text
LOGIN
┌───────────────────────────────────────┐
│                                       │
│                                       │
│                                       │
│ Contas Souto                          │
│ Despesas da casa e saldo previsto.    │
│                                       │
│ [        Entrar com Google          ] │
│                                       │
│                                       │
│                                       │
└───────────────────────────────────────┘
```

```text
LOGIN · com erro
┌───────────────────────────────────────┐
│                                       │
│ Contas Souto                          │
│ Despesas da casa e saldo previsto.    │
│                                       │
│ ┌───────────────────────────────────┐ │
│ │ ✕ Este email não tem acesso.      │ │
│ └───────────────────────────────────┘ │
│ [        Entrar com Google          ] │
│                                       │
└───────────────────────────────────────┘
```

### 4.8 Outros estados

- **Não encontrado**: "Página não encontrada." e o botão "Ir para o Início".
- **Erro**: "Algo correu mal." e o botão "Tentar de novo".
- **A carregar**: esqueleto dos cartões, sem texto.

---

## 5. Glossário

Um termo por conceito, igual em toda a app. A coluna da direita lista o que deixa de se usar.

| Termo | Definição | Substitui |
|---|---|---|
| **Início** | O ecrã que abre a app. | Resumo |
| **Despesa** | Compra ou pagamento da casa. | Despesas da casa, Saídas no mês |
| **Por pagar** / **Paga** | Os dois estados de uma despesa. Ações: "Marcar como paga", "Marcar por pagar". | Previsto, Pago, Já pago, Voltar a previsto |
| **Atrasada** | Despesa por pagar de um mês que já acabou. | em atraso, das quais atrasadas |
| **Saldo hoje** | Soma das contas escolhidas, na última atualização. | Disponível hoje, Hoje, Saldos |
| **Saldo previsto** | Saldo estimado num mês ou numa data. | Saldo no fim, Ficam X, Total |
| **Entradas** | Salários e outros rendimentos esperados. | Entra, Entradas previstas |
| **Gastos mensais** | Dia a dia mais renda, estimados a partir do Wallet. Em "Como é calculado" divide-se em "Dia a dia" e "Renda". | Gastos e renda, Gastos do dia a dia, gastos, Saídas |
| **Escritura** | A data da escritura. Em frase: "na escritura", "depois da escritura". | Data da escritura, pagas na escritura |
| **Fim da obra** | A data do pagamento final ao empreiteiro. Em frase: "no fim da obra", "depois da obra". | Conclusão da obra, Data da conclusão da obra |
| **Mês** | De salário a salário (dia 26 a dia 25). Explica-se uma vez, no `(i)` da Previsão. | ciclo |
| **Reserva mínima** | Valor abaixo do qual a app avisa. | reserva |
| **Chega para tudo** / **Abaixo da reserva** / **Falta dinheiro** | Os três estados da previsão. "Falta" só se usa aqui. | Chega para tudo · mínimo X |
| **Orçamento** | Os limites por divisão. Só comparação. | Orçamento geral |
| **Limite** | Valor máximo de uma divisão. | Orçamento máximo, orçamento (de uma divisão) |
| **Gasto** | Pago mais por pagar de uma divisão. | (igual) |
| **Disponível** | Limite menos gasto. Só se usa no Orçamento. | faltam X, Falta gastar, Por gastar |
| **Acima do limite** | Gasto menos limite, quando passa. | passou X, Passou do orçamento, acima do orçamento |
| **Sem limite** | Divisão sem limite definido. | sem orçamento |
| **Divisão** | Parte da casa a que a despesa pertence. | (igual) |
| **Sem divisão** | Despesa sem divisão. | Não aplicável |
| **Categoria** | Tipo de despesa, de uma lista fixa. | (igual) |
| **Atualizar saldos** / **Atualizado** | Ir buscar saldos e movimentos ao Wallet. | Sincronizar, Sincronização, Última sincronização |
| **Contas do Wallet** | As contas bancárias cujo saldo conta. | Contas que contam, Contas (separador) |
| **Automático** / **Ajustado** | Gastos mensais calculados pela app ou escritos à mão. | valor teu, a usar o teu |
| **Definições** | Datas, reserva, contas, tema e sessão. | Contas (separador) |

---

## 6. Guia de texto

**Tom.** Calmo, direto, impessoal. Sem "tu" e sem "vocês". A app descreve o que se passa; os botões dizem o que fazer.

| Em vez de | Escreve-se |
|---|---|
| "Adiciona a primeira." | "Ainda não há despesas." e o botão "Adicionar despesa" |
| "Tenta mais tarde." | "O Wallet está indisponível de momento." |
| "Define-a em Contas." | "Sem data da escritura." e a ligação "Definir" |
| "Escolha feita por vocês." | (nada) |

**Comprimentos.**

- Título de ecrã: 1 ou 2 palavras.
- Título de secção: 3 palavras no máximo.
- Ajuda: 1 linha, e só se evitar um erro. O resto vai para um `(i)` ou sai.
- Estado vazio: 1 frase e 1 botão.
- Nenhum parágrafo fixo no ecrã.

**Botões.** Verbo e objeto, no infinitivo: "Adicionar despesa", "Atualizar saldos", "Apagar divisão". Só "Guardar" e "Cancelar" ficam sozinhos. Nunca "OK", "Sim" ou "Sim, apagar". Enquanto trabalha: "A guardar…".

**Erros.** O que aconteceu, e como resolver quando há solução. Sem nomes técnicos (nada de `WALLET_API_TOKEN`, "erro 500" ou "500 por hora"). O detalhe técnico vai para o log do servidor.

**Confirmações.** Só para apagar. O título pergunta com o nome ("Apagar «Sofá»?") e o botão repete a ação ("Apagar despesa").

**Cores.** Vermelho só para "Falta dinheiro" e erros. Âmbar para "Abaixo da reserva" e "Acima do limite". Verde só para "Chega para tudo". Um valor negativo normal (um gasto) fica na cor do texto. Um estado nunca depende só da cor: tem sempre ícone e texto.

**Números.**

- Um formato de moeda: `1 234,56 €`. Os cêntimos só aparecem no valor de cada despesa (lista e formulário). Totais, previsão e orçamento arredondam ao euro: `12 480 €`.
- Um sinal de menos: `−` (U+2212). Parcelas com sinal: `+3 900 €`, `−2 500 €`.
- Sem valor: `—`.
- Alinhados à direita, com `tabular-nums`, na fonte do texto. O número grande do Início usa os algarismos normais, porque não está numa coluna.

**Datas.** Dois formatos:

- Curto, para dias: `12 dez`. Leva o ano quando não é o ano corrente: `15 jan 2027`.
- Longo, para meses: `dezembro de 2026`.

Há duas variantes do curto: com hora, só em "Atualizado 10 nov, 09:14", e só o mês no eixo do gráfico (`dez`, `jan 27`).

**Nomes entre aspas.** Aspas portuguesas: «Sofá».

---

## 7. Textos: antes e depois

Todos os textos visíveis. 🧪 marca os que estão nos testes. "(igual)" quer dizer que não muda; "(sai)" que desaparece.

### 7.1 Geral, cabeçalho e navegação

| Onde | Antes | Depois |
|---|---|---|
| `layout.tsx`, `manifest.ts` (descrição) | Previsão das despesas da casa no Souto contra o dinheiro nas contas do Wallet. | Despesas da casa e saldo previsto. |
| Cabeçalho (telemóvel) | Contas Souto | O título do ecrã |
| Cabeçalho | Nome do utilizador | (sai; passa para Definições › Sessão) |
| Cabeçalho | Sair | (sai; passa para Definições) |
| `saldo-oculto.tsx` | Mostrar saldos / Esconder saldos | (igual) |
| `navegacao.tsx` | Resumo | Início |
| | Despesas | (igual) |
| | (não existe) | Previsão |
| | Orçamento | (igual) |
| | Contas | (sai; Definições, pelo ícone) |
| | (não existe) | Adicionar despesa (rótulo do "+") |
| | (não existe) | Definições (rótulo da roda dentada) |

### 7.2 Início (antes Resumo)

| Onde | Antes | Depois |
|---|---|---|
| Título | Resumo | Início |
| `formato.ts` 🧪 | Chega para tudo · mínimo 1 200 € | Chega para tudo |
| `formato.ts` 🧪 | Falta dinheiro em dezembro de 2026 | (igual) |
| `formato.ts` 🧪 | Abaixo da reserva em dezembro de 2026 | (igual) |
| `formato.ts` 🧪 | Falta dinheiro na conclusão da obra | Falta dinheiro no fim da obra |
| `formato.ts` | Falta dinheiro na escritura / Abaixo da reserva na escritura | (igual) |
| `formato.ts` 🧪 | Nada por pagar | (igual) |
| `formato.ts` | Sem saldos do Wallet | Sem saldos |
| Sincronização | Saldos de 10/11, 01:14 | Atualizado 10 nov, 01:14 |
| | Sem saldos. Sincronizar com Wallet | A previsão precisa dos saldos do Wallet. + botão "Atualizar saldos" |
| | A última sincronização falhou | A última atualização falhou. + ligação "Ver" |
| Números | Disponível hoje · 3 contas | Saldo hoje |
| | Por pagar · 14 despesas | Por pagar |
| | Já pago · 6 despesas | (sai do Início; no Orçamento é "Pago") |
| | Depois da escritura · 12 dez 2026 | depois da escritura · 12 dez |
| | Depois da obra · 20 mar 2027 | depois da obra · 20 mar |
| | Saldo no fim · abril de 2027 | no fim de abril de 2027 |
| | (não existe) | Reserva mínima: 5 000 € |
| | (não existe) | Depois da obra (20 mar): 1 500 € |
| | (não existe) | No fim de abril de 2027: 9 300 € |
| Dica das datas | Sem data da escritura, a previsão vai até à conclusão da obra. Definir a data da escritura | (sai) |
| | Sem data da escritura nem da conclusão da obra, a previsão mostra os próximos meses. Definir as datas | Sem datas definidas. + ligação "Definir" |
| Lista | Despesas por pagar | Próximos pagamentos |
| | Ver todas e adicionar | Ver todas |
| | Nada por pagar. | (igual) |
| | Ainda não há despesas. | (igual) + botão "Adicionar despesa" |
| Por categoria | Por categoria | Categorias (no Orçamento) |
| Por divisão | Por divisão · Editar orçamento · Orçamento geral · "Ainda não há orçamento por divisão. Definir o orçamento" | (saem do Início) |

### 7.3 Previsão (antes blocos do Resumo)

| Onde | Antes | Depois |
|---|---|---|
| `extrato-previsto.tsx`, título | Saldo previsto / Até ao fim de abril de 2027 / Até à escritura · 12 dez 2026 | Previsão (ecrã) e Saldo previsto (gráfico) |
| Frase | Ficam 12 480 € depois da escritura e 9 300 € no fim de abril de 2027, 7 480 € acima da reserva de 5 000 €. | (sai; dá lugar ao cartão das contas) |
| Sem saldos | Sincroniza as contas para ver a previsão. | A previsão precisa dos saldos do Wallet. + botão "Atualizar saldos" |
| Linhas | Hoje | Saldo hoje |
| | Entra / entra | Entradas |
| | Gastos e renda / gastos e renda | Gastos mensais |
| | Despesas da casa / despesas da casa | Despesas |
| | Saldo no fim | Saldo previsto |
| | Mês | (igual) |
| | Total | (sai; o resultado das contas chama-se "Depois da escritura · 12 dez") |
| Notas | último dia do ciclo (25 nov) | até 25 nov |
| | faltam 12 dias do ciclo (até 25 nov) | até 25 nov |
| | inclui Subsídio de Natal 1 900 € | Inclui Subsídio de Natal 1 900 € |
| | gastos e renda com valor teu | Gastos mensais ajustados |
| | 1 200 € em atraso | Atrasadas 1 200 € |
| | abaixo da reserva | Abaixo da reserva (etiqueta com ícone) |
| Marcos | Escritura · 12 dez | (igual) |
| | Conclusão da obra · 20 mar | Fim da obra · 20 mar |
| | 3 despesas por pagar | 3 despesas |
| Limite | 2 despesas para lá de 36 meses (3 400,00 €) ainda não entram nestas contas. | 2 despesas (3 400 €) ficam fora: a previsão vai até 36 meses. |
| `tabela-tendencia.tsx` | Como calculamos e gastos de cada mês · 1 aviso | Como é calculado |
| | Possíveis gastos neste ciclo: no ciclo de dez 25 houve Viagens 800 €. Não estão na previsão; se contares com eles, muda o valor do mês abaixo. | Dezembro: no ano passado, Viagens 800 €. + botão "Ajustar" |
| `form-gastos.tsx` | Gastos e renda por ciclo | Gastos mensais |
| | o que falta | resto do mês |
| | automático 2 500 € | Automático: 2 500 € |
| | · a usar o teu | (sai; o campo preenchido já o mostra) |
| | Guardar gastos | Guardar |
| | Voltar ao automático | Repor automático |
| `grafico-saldo.tsx` | Gráfico do saldo previsto mês a mês; os valores estão na tabela abaixo. | Gráfico do saldo previsto por mês. Os valores estão na lista "Mês a mês". |
| | Reserva | Reserva mínima |
| | Escritura | (igual) |
| | (não existe) | Fim da obra |
| | Saídas no mês | Despesas |
| | das quais atrasadas | Atrasadas |
| | Entradas previstas | Entradas |
| | Gastos do dia a dia | Gastos mensais |
| | Intervalo | (sai) |
| `tendencia.ts`, avisos | Ainda não há movimentos do Wallet: sincroniza para ver a previsão do dia a dia. | Sem movimentos do Wallet. A previsão não inclui entradas nem gastos mensais. |
| | Só há movimentos em 8 dos últimos 12 meses: a previsão é menos fiável. | Só 8 de 12 meses com movimentos. Previsão menos fiável. |
| | 7 % dos movimentos não têm categoria no Wallet. | 7 % dos movimentos sem categoria no Wallet. |
| | Não há salários nos últimos meses: confirma a categoria Salários no Wallet. | Sem salários nos últimos meses. A categoria «Salários» do Wallet pode estar errada. |
| `tendencia.ts`, regras 🧪 | Fixo: Ana 1500,50 € + Rui 1200 €. | Fixo: Ana 1 500,50 € + Rui 1 200 € |
| | 2.º mês mais baixo (um mês normal). | Segundo mês mais baixo dos últimos 12 |
| | Mediana dos ciclos. | Valor habitual dos últimos 12 meses |
| `tendencia.ts`, nomes | Salários · Outros rendimentos · Renda | (iguais) |
| | Gastos do dia a dia | Dia a dia |
| | Bónus · Reembolso do IRS · Subsídio de Natal · Subsídio de férias · Sem categoria | (iguais) |
| (novo) | | Entradas por mês · Uma vez por ano (títulos em "Como é calculado") |
| (novo) | | Cada mês começa no dia do salário: novembro vai de 26 de outubro a 25 de novembro. |

### 7.4 Despesas

| Onde | Antes | Depois |
|---|---|---|
| `despesas/page.tsx` | Despesas | (igual) |
| | 14 despesas · 32 820,00 € | (igual) |
| | Nova despesa (botão) | (sai; é o "+" da barra) |
| | Todas · Por pagar · Pagas | Por pagar · Pagas · Todas |
| | Divisão: Sala ✕ | Lista: Todas as divisões / Sala / … / Sem divisão |
| Vazios | Ainda não há despesas. Adiciona a primeira. | Ainda não há despesas. + botão "Adicionar despesa" |
| | Ainda não há despesas pagas. | (igual) |
| | Nada por pagar. | (igual) |
| | Não há despesas em Sala. | Sem despesas em Sala. |
| | Não há despesas pagas em Sala. | Sem despesas pagas em Sala. |
| | Não há despesas por pagar em Sala. | Nada por pagar em Sala. |
| `lista-despesas.tsx` | mês atual | (sai) |
| | por pagar 13 200,00 € · pago 500,00 € | 13 200,00 € (o total do filtro) |
| | Atrasada · outubro de 2026 | Atrasada · outubro |
| | Na escritura · 12 dez 2026 | Escritura · 12 dez |
| | Na conclusão da obra · 20 mar 2027 | Fim da obra · 20 mar |
| | Pago | Paga |
| | Criada por Ana | (sai da lista; no Editar: "Criada por Ana") |
| | Marcada como paga por Rui a 10/11 | (sai da lista; no Editar: "Paga por Rui a 10 nov") |
| `acoes-despesa.tsx` | Marcar como pago | Marcar como paga (rótulo do círculo) |
| | Voltar a previsto | Marcar por pagar (rótulo do círculo) |
| | Editar | (sai; toque na linha) |
| | Apagar | Apagar despesa (no Editar) |
| | Apagar? · Sim, apagar · Cancelar | Apagar «Sofá»? · Apagar despesa · Cancelar |
| | A apagar… | (igual) |
| (novo) | | «Sofá» paga. · «Sofá» por pagar. · Anular |

### 7.5 Nova despesa e Editar despesa

| Onde | Antes | Depois |
|---|---|---|
| Títulos | Nova despesa · Editar despesa | (iguais) |
| `nova/page.tsx` | Despesa adicionada. Podes adicionar a próxima. | Despesa adicionada. |
| `form-despesa.tsx` | Descrição · Valor · Categoria · Divisão · Nota (opcional) | (iguais) |
| | Estado: Previsto / Pago | Estado: Por pagar / Paga |
| | Quando: Num mês / Na escritura (12 dez 2026) / Na conclusão da obra (20 mar 2027) | Quando: Num mês / Escritura / Fim da obra |
| | Mês previsto (rótulo acessível) | Mês |
| | Se a data da escritura mudar, esta despesa acompanha. | 12 dez · muda com a data |
| | Ainda não há data da escritura. Define-a em Contas. | Sem data da escritura. + ligação "Definir" |
| | Não aplicável (opção) 🧪 | Sem divisão |
| | Ligações (luz, água, gás, net) (opção) | Ligações (só o rótulo; o enum não muda) |
| | Adicionar | Adicionar despesa |
| | Guardar e adicionar outra | Adicionar e criar outra |
| | Guardar alterações | Guardar |
| | A guardar… | (igual) |
| | Cancelar | (sai; seta do topo) |

### 7.6 Orçamento

| Onde | Antes | Depois |
|---|---|---|
| `orcamento/page.tsx` | Orçamento | (igual) |
| | Quanto podem gastar em cada divisão da casa. Conta o que já está pago e o que está por pagar. O orçamento geral é a soma das divisões; serve para comparar e não entra na previsão do saldo. | (sai) `(i)`: Conta o que está pago e por pagar. Não entra na previsão. |
| | Orçamento geral · 5 de 7 divisões com orçamento | Gasto · 21 400 € de 30 000 € |
| | Gasto · pago 9 200,00 € · por pagar 12 200,00 € | Pago 9 200 € · Por pagar 12 200 € (legenda) |
| | Falta gastar | Disponível |
| | Passou do orçamento | Acima do limite |
| | 2 divisões acima do orçamento | 2 divisões acima do limite |
| | Nenhuma divisão acima do orçamento | (sai) |
| `barra-orcamento.tsx` | faltam 600,00 € | Disponível 600 € |
| | passou 300,00 € | Acima do limite 300 € |
| | sem orçamento | sem limite |
| | Pago · Por pagar · Por gastar (legenda) | Pago · Por pagar · Disponível |
| `form-divisoes.tsx` | Divisões | (igual) |
| | Não aplicável 🧪 | Sem divisão |
| | Despesas sem divisão. Não tem orçamento e não conta para o orçamento geral. | fora do orçamento |
| | 3 despesas · pago 4 000,00 € · por pagar 5 400,00 € · 9 400,00 € / 10 000,00 € | 9 400 € de 10 000 € (a linha abre as despesas) |
| | Guardar orçamento | Guardar |
| | Nome | (igual) |
| | Orçamento máximo | Limite |
| | sem orçamento (campo vazio) | Sem limite |
| | opcional (campo vazio) | Limite (opcional), no rótulo |
| | Apagar | Apagar Sala (rótulo do ícone) |
| | Apagar? 3 despesas passam a Não aplicável. · Sim, apagar | Apagar «Sala»? · 3 despesas ficam sem divisão. · Apagar divisão |
| | Nova divisão · Ex.: Casa de banho | (iguais) |
| | Adicionar · A adicionar… | Adicionar divisão · (igual) |
| (novo) | | Editar · Editar divisões · Categorias |
| (novo) | | Ainda não há divisões. + botão "Adicionar divisão" |

### 7.7 Definições (antes Contas)

| Onde | Antes | Depois |
|---|---|---|
| `contas/page.tsx` | Contas | Definições |
| | Saldos do Wallet. As contas de investimento e as arquivadas não aparecem. | (sai) |
| | Última sincronização: 10/11, 01:14 · automática | Atualizado 10 nov, 01:14 |
| | Última sincronização: 10/11, 01:14 · por Ana | Atualizado 10 nov, 01:14 |
| | Ainda não sincronizado com o Wallet. | Ainda sem saldos. |
| `painel-sync.tsx` | Sincronizar com Wallet | Atualizar saldos |
| | A sincronizar… | A atualizar… |
| | A última tentativa falhou (10/11, 01:14): {mensagem técnica} | A última atualização falhou (10 nov, 01:14). {frase da tabela 7.10} |
| | O Wallet ainda estava a preparar dados na última sincronização; os saldos podem mudar. | O Wallet ainda está a preparar dados. Os saldos podem mudar. |
| `form-contas.tsx` | Contas que contam | Contas do Wallet |
| | Escolha feita por vocês. | (sai) |
| | Por defeito: contas com saldo positivo. | Automático: contas com saldo positivo. |
| | Voltar às contas com saldo positivo | Repor seleção automática |
| | Ainda não há contas. Carrega em Sincronizar com Wallet. | Ainda sem contas. + botão "Atualizar saldos" |
| | Disponível hoje | Saldo hoje |
| | Atenção: Conta USD (USD) entra na soma sem conversão para euros. | Conta USD (USD) soma sem conversão para euros. |
| | Reserva mínima | (igual) |
| | Opcional. A app avisa no primeiro mês em que o saldo previsto fica abaixo deste valor. | (sai) `(i)`: Avisa quando o saldo previsto fica abaixo deste valor. |
| | Guardar | (igual) |
| `form-escritura.tsx` | Escritura | (igual) |
| | Conclusão da obra | Fim da obra |
| | A previsão vai de hoje até esta data (ou até à conclusão da obra, se for depois). | (sai) |
| | Dia em que se paga o fim da obra ao empreiteiro. Se for depois da escritura, a previsão vai até aqui. | (sai) |
| | 3 despesas pagas na escritura (12 400,00 €); mudam de mês com a data. | 3 despesas · 12 400 € |
| | Nenhuma despesa marcada como paga na escritura. | (sai) |
| | Data da escritura · Data da conclusão da obra (rótulos) | Escritura · Fim da obra |
| | Guardar escritura · Guardar conclusão da obra | Guardar (um só) |
| (novo) | | Datas e reserva · Tema · Sistema / Claro / Escuro · Sessão · Sair |

### 7.8 Login

| Onde | Antes | Depois |
|---|---|---|
| `login/page.tsx` | Casa no Souto | (sai) |
| | Contas Souto | (igual) |
| | Previsão das despesas da casa contra o dinheiro nas contas do Wallet. | Despesas da casa e saldo previsto. |
| | Este email não tem acesso à Contas Souto. Entra com um dos emails autorizados. | Este email não tem acesso. |
| | Não foi possível começar o login com o Google. Tenta de novo. | Não foi possível entrar com o Google. |
| | O Google não confirmou o login. Tenta de novo. | Não foi possível entrar com o Google. |
| | Houve um problema a guardar o login. Tenta de novo. | Não foi possível entrar. |
| | O login não está bem configurado no servidor. | Não foi possível entrar. |
| | Não foi possível entrar. Tenta de novo. | Não foi possível entrar. |
| `botao-google.tsx` | Entrar com Google · A abrir o Google… | (iguais) |

### 7.9 Mensagens das ações e da validação

| Onde | Antes | Depois |
|---|---|---|
| `actions/contas.ts` | Saldos atualizados (3 contas). 412 movimentos lidos para a previsão. | Saldos atualizados. |
| | Movimentos não atualizados: {erro} | Movimentos por atualizar. |
| | O Wallet ainda está a preparar dados; os saldos podem mudar em breve. | O Wallet ainda está a preparar dados. Os saldos podem mudar. |
| | Guardado. | (igual) |
| | 3 despesas da escritura passaram para janeiro de 2027. | 3 despesas passaram para janeiro de 2027. |
| | 3 despesas deixaram de estar na escritura e ficaram com o mês que tinham. | 3 despesas ficaram com o mês que tinham. |
| | Voltaste à regra por defeito: contam as contas com saldo positivo. | Seleção automática: contas com saldo positivo. |
| | Voltou tudo ao automático. | Tudo em automático. |
| | Guardado: 2 ciclos com valor teu. | Guardado. 2 meses ajustados. |
| | Guardado: tudo automático. | Guardado. Tudo em automático. |
| `actions/despesas.ts` | Esta divisão já não existe (pode ter sido apagada). Escolhe outra. | Esta divisão já não existe. É preciso escolher outra. |
| | Despesa inválida. | Esta despesa já não existe. |
| | Esta despesa já não existe (pode ter sido apagada). | Esta despesa já não existe. |
| | Esta despesa já tinha sido apagada. | Esta despesa já não existe. |
| | Pedido inválido. | Algo correu mal. |
| `actions/orcamento.ts` | Já existe a divisão "Sala". | Já existe a divisão «Sala». |
| | Divisão "Sala" adicionada. | Divisão «Sala» adicionada. |
| | Dois nomes chocam entre si. Muda um de cada vez e guarda entre as mudanças. | Não é possível trocar dois nomes ao mesmo tempo. Um de cada vez. |
| | Orçamento guardado. | Guardado. |
| | Esta divisão já tinha sido apagada. | Esta divisão já não existe. |
| | Divisão "Sala" apagada. 3 despesas passaram a Não aplicável. | Divisão «Sala» apagada. 3 despesas ficaram sem divisão. |
| `validacao.ts` | A descrição é obrigatória. | (igual) |
| | A descrição tem no máximo 120 caracteres. | (igual) |
| | O valor tem de ser um número, por exemplo 1 234,56. | (igual) |
| | O valor tem de ser igual ou maior que zero. | O valor não pode ser negativo. |
| | O valor é demasiado grande. | (igual) |
| 🧪 | Define primeiro a data da escritura (em Contas). | Sem data da escritura. Define-se em Definições. |
| 🧪 | Define primeiro a data da conclusão da obra (em Contas). | Sem data do fim da obra. Define-se em Definições. |
| | Escolhe o mês (AAAA-MM). | O mês é obrigatório (AAAA-MM). |
| | A nota tem no máximo 200 caracteres. | (igual) |
| | O nome da divisão é obrigatório. | O nome é obrigatório. |
| | O nome tem no máximo 40 caracteres. | (igual) |
| 🧪 | "Não aplicável" já existe sempre; escolhe outro nome. | «Sem divisão» é um nome reservado. |
| 🧪 | O orçamento tem de ser um número igual ou maior que zero. | O limite tem de ser um número igual ou maior que zero. |
| | O orçamento é demasiado grande. | O limite é demasiado grande. |
| | Há duas divisões com o nome "Sala". | Há duas divisões com o nome «Sala». |
| | A reserva tem de ser um número igual ou maior que zero. | A reserva mínima tem de ser um número igual ou maior que zero. |
| | A reserva é demasiado grande. | A reserva mínima é demasiado grande. |
| | Mês inválido. | (igual) |
| | O valor de 2026-12 tem de ser um número igual ou maior que zero. | O valor de dezembro de 2026 tem de ser um número igual ou maior que zero. |
| | O valor de 2026-12 é demasiado grande. | O valor de dezembro de 2026 é demasiado grande. |
| `escritura.ts` | Escolhe uma data válida (AAAA-MM-DD). | Data inválida. |

### 7.10 Erros do Wallet e da atualização

A frase técnica continua a existir em `wallet.ts` e `sync.ts`, para o log e para a resposta do cron. A interface deixa de a mostrar: escolhe a frase da direita pelo código do erro. Assim os erros antigos, já gravados, também ficam com a frase nova.

| Código | Antes (o que hoje se vê) | Depois (o que se passa a ver) |
|---|---|---|
| `sem_token` | Falta configurar o WALLET_API_TOKEN no servidor. | Não foi possível ligar ao Wallet. |
| `token_invalido` | O Wallet recusou o token. Confirma o WALLET_API_TOKEN (pode ter expirado ou sido apagado). | O Wallet recusou o acesso. É preciso um token novo. |
| `proibido` | O token do Wallet não tem permissão para ler as contas. | O Wallet recusou o acesso. É preciso um token novo. |
| `premium` 🧪 | A API do Wallet precisa do plano Premium ativo. | O Wallet pede o plano Premium ativo. |
| `consentimento` | Falta autorizar o acesso pela API nas definições do Wallet. (e a variante com Premium) | É preciso autorizar o acesso nas definições do Wallet. |
| `sincronizacao_inicial` | O Wallet ainda está a preparar os dados da API (primeira sincronização). Tenta daqui a 5 minutos. | O Wallet ainda está a preparar os dados. Disponível dentro de 5 min. |
| `limite_pedidos` | Atingimos o limite de pedidos ao Wallet (500 por hora). Tenta daqui a 12 minutos. | Limite de pedidos ao Wallet atingido. Disponível dentro de 12 min. |
| `erro_servidor` | O Wallet está com problemas (erro 500). Tenta mais tarde. | O Wallet está indisponível de momento. |
| `erro_http` | O Wallet respondeu com erro 418. | Não foi possível ligar ao Wallet. |
| `sem_ligacao` | O Wallet demorou demasiado a responder. Tenta de novo. / Não foi possível ligar ao Wallet. | Não foi possível ligar ao Wallet. |
| `formato` | A resposta do Wallet não tem o formato esperado (…). / Há demasiados movimentos para ler de uma vez. | Não foi possível ler os dados do Wallet. |
| `a_decorrer` | Já está uma sincronização a decorrer. Espera uns segundos. | Já há uma atualização a decorrer. |
| `demasiado_cedo` | Os saldos foram atualizados há instantes. Tenta daqui a meio minuto. | Saldos atualizados há instantes. |
| `desconhecido` | Não foi possível ligar ao Wallet. / Erro desconhecido. | Não foi possível ligar ao Wallet. |

Sem os minutos (erro antigo, lido da base de dados): "Disponível dentro de alguns minutos."

O teste do `premium` procura "Premium" na mensagem técnica, que não muda.

### 7.11 Formatos

| Onde | Antes | Depois |
|---|---|---|
| `euros()` 🧪 | -500,00 € | −500,00 € |
| `euros()` 🧪 | 1 234,56 € · 5 000 € · — | (iguais) |
| `dataCurta()` 🧪 | 1 dez 2026 (sempre com ano) | 1 dez no ano corrente; 1 dez 2027 nos outros |
| `dataHora()` | 10/11, 01:14 | 10 nov, 01:14 |
| `mesPorExtenso()` 🧪 | março de 2027 | (igual) |
| `mesCurto()` 🧪 | dez 26 | (igual, mas só no eixo do gráfico) |

---

## 8. Design tokens

### 8.1 Nomes

Onze tokens que pediste, mais sete que fazem falta para os estados e os controlos. Cada um tem valor no claro e no escuro.

| Token | Uso | Nome que o shadcn vê |
|---|---|---|
| `fundo` | Fundo da página | `background` |
| `superficie` | Cartões, diálogos, campos | `card`, `popover` |
| `superficie-suave` | Segmentos, pista das barras, linhas em destaque | `muted`, `secondary` |
| `texto` | Texto principal | `foreground` |
| `texto-suave` | Texto secundário, rótulos | `muted-foreground` |
| `borda` | Separadores e contornos de cartões | `border` |
| `borda-forte` | Contorno de campos e caixas (3:1) | `input` |
| `primaria` | Botão principal, ligações, foco, linha do gráfico | `primary`, `ring` |
| `sobre-primaria` | Texto sobre a primária | `primary-foreground` |
| `primaria-suave` | Separador ativo, opção escolhida | `accent` |
| `positivo` / `positivo-suave` | "Chega para tudo" | |
| `aviso` / `aviso-suave` | "Abaixo da reserva", "Acima do limite" | |
| `negativo` / `negativo-suave` | "Falta dinheiro", erros | `destructive` |
| `grafico-pago` | Parte paga das barras | |
| `grafico-por-pagar` | Parte por pagar das barras | |

O código da app usa os nomes em português (`bg-fundo`, `text-texto-suave`, `text-positivo`). Os componentes em `components/ui` continuam com os nomes do shadcn, que apontam para os mesmos valores. Saem os tokens `chart-*` e `sidebar-*`.

**Pago e por pagar passam a ser dois tons da mesma cor**, e não verde e âmbar. O âmbar fica reservado para avisos. Dois tons distinguem-se pela luminosidade, o que funciona para qualquer tipo de daltonismo. Validei os pares com o validador de paletas: tom único, degraus visíveis e contraste com a superfície, em claro e em escuro.

### 8.2 Proposta A, "Sálvia": evolui o verde atual

| Token | Claro | Escuro |
|---|---|---|
| `fundo` | `#f3f5f2` | `#101513` |
| `superficie` | `#ffffff` | `#19201d` |
| `superficie-suave` | `#e7ebe6` | `#242d29` |
| `texto` | `#17201c` | `#e7ede9` |
| `texto-suave` | `#55625a` | `#a2b0a8` |
| `borda` | `#d6ddd5` | `#2e3934` |
| `borda-forte` | `#7b8980` | `#6c7b73` |
| `primaria` | `#1c6657` | `#63c7ad` |
| `sobre-primaria` | `#ffffff` | `#0b1f1a` |
| `primaria-suave` | `#d8e9e3` | `#1c3a32` |
| `positivo` | `#1f7245` | `#62c78f` |
| `positivo-suave` | `#dcefe2` | `#173326` |
| `aviso` | `#855600` | `#e5ad4a` |
| `aviso-suave` | `#f8eacb` | `#382b12` |
| `negativo` | `#b0342a` | `#f08a7e` |
| `negativo-suave` | `#f9e0dd` | `#40201c` |
| `grafico-pago` | `#134e42` | `#6fd0b6` |
| `grafico-por-pagar` | `#429180` | `#3d8a78` |

### 8.3 Proposta B, "Areia": neutra quente com azul-petróleo

Os tokens de estado (`positivo`, `aviso`, `negativo` e os suaves) são iguais aos da proposta A.

| Token | Claro | Escuro |
|---|---|---|
| `fundo` | `#f6f4f0` | `#141310` |
| `superficie` | `#ffffff` | `#1e1c19` |
| `superficie-suave` | `#ebe7e0` | `#2a2723` |
| `texto` | `#1f1c18` | `#f0ece6` |
| `texto-suave` | `#625b52` | `#aca499` |
| `borda` | `#ddd8cf` | `#36322d` |
| `borda-forte` | `#8a8276` | `#787064` |
| `primaria` | `#1d5873` | `#7cc4e0` |
| `sobre-primaria` | `#ffffff` | `#0b2530` |
| `primaria-suave` | `#d9e8ef` | `#1b3643` |
| `grafico-pago` | `#16475f` | `#86cbe6` |
| `grafico-por-pagar` | `#488ba8` | `#40829d` |

### 8.4 Contraste (WCAG 2.2)

Mínimos: 4,5:1 para texto e 3:1 para contornos de controlos e partes de gráficos. Todas as combinações passam nas duas propostas e nos dois temas.

| Combinação | Mín. | A claro | A escuro | B claro | B escuro |
|---|---|---|---|---|---|
| `texto` sobre `fundo` | 4,5 | 15,20 | 15,53 | 15,45 | 15,79 |
| `texto` sobre `superficie` | 4,5 | 16,67 | 13,98 | 16,97 | 14,45 |
| `texto` sobre `superficie-suave` | 4,5 | 13,83 | 11,93 | 13,77 | 12,63 |
| `texto-suave` sobre `fundo` | 4,5 | 5,84 | 8,18 | 6,09 | 7,54 |
| `texto-suave` sobre `superficie` | 4,5 | 6,40 | 7,36 | 6,69 | 6,90 |
| `texto-suave` sobre `superficie-suave` | 4,5 | 5,31 | 6,28 | 5,43 | 6,03 |
| `primaria` sobre `fundo` | 4,5 | 6,20 | 9,05 | 7,09 | 9,58 |
| `primaria` sobre `superficie` | 4,5 | 6,80 | 8,14 | 7,79 | 8,77 |
| `primaria` sobre `primaria-suave` | 4,5 | 5,40 | 6,06 | 6,21 | 6,54 |
| `sobre-primaria` sobre `primaria` | 4,5 | 6,80 | 8,41 | 7,79 | 8,19 |
| `positivo` sobre `superficie` | 4,5 | 5,91 | 7,97 | 5,91 | 8,16 |
| `positivo` sobre `positivo-suave` | 4,5 | 4,92 | 6,56 | 4,92 | 6,56 |
| `aviso` sobre `superficie` | 4,5 | 6,31 | 8,22 | 6,31 | 8,43 |
| `aviso` sobre `aviso-suave` | 4,5 | 5,29 | 6,84 | 5,29 | 6,84 |
| `negativo` sobre `superficie` | 4,5 | 6,23 | 6,83 | 6,23 | 7,00 |
| `negativo` sobre `negativo-suave` | 4,5 | 4,96 | 6,00 | 4,96 | 6,00 |
| `positivo` / `aviso` / `negativo` sobre `fundo` (o mais baixo) | 4,5 | 5,39 | 7,59 | 5,38 | 7,64 |
| `borda-forte` sobre `superficie` | 3 | 3,66 | 3,73 | 3,79 | 3,48 |
| `borda-forte` sobre `fundo` | 3 | 3,34 | 4,14 | 3,45 | 3,80 |
| `grafico-pago` sobre `superficie` | 3 | 9,56 | 8,99 | 10,00 | 9,47 |
| `grafico-pago` sobre a pista | 3 | 7,93 | 7,67 | 8,11 | 8,28 |
| `grafico-por-pagar` sobre `superficie` | 3 | 3,75 | 4,03 | 3,79 | 3,96 |
| `grafico-por-pagar` sobre a pista | 3 | 3,11 | 3,44 | 3,08 | 3,47 |

Estes rácios passam a ser um teste (`test/tema.test.ts`), que lê os valores de `globals.css`. Se alguém mudar uma cor e partir o AA, o teste falha.

### 8.5 Qual escolher

| | A, Sálvia | B, Areia |
|---|---|---|
| Continuidade | Mantém a identidade e o ícone verde. | Muda a identidade. O ícone passa a azul-petróleo. |
| Leitura do estado | A cor da marca e a cor de "Chega para tudo" são ambas verdes. No escuro quase coincidem (`#63c7ad` e `#62c78f`). O estado verde destaca-se menos dos botões. | Verde, âmbar e vermelho só aparecem nos estados. O "Chega para tudo" é o único verde no ecrã. |
| Sensação | Fresca, mais "natureza". | Mais quente e neutra, mais "papel". |

**Recomendo a B.** Numa app cuja resposta principal é uma cor de estado, convém que a cor da marca não seja uma delas. Se a identidade verde for importante, a A também passa em tudo.

O ícone da app instalada só muda no telemóvel depois de a reinstalar.

### 8.6 Tipografia

**Uma família: Instrument Sans**, a que já é usada no texto. Saem a Bricolage Grotesque e a IBM Plex Mono. Tem pesos de 400 a 700 num só ficheiro e algarismos tabulares.

| Tamanho | Linha | Peso | Uso |
|---|---|---|---|
| 12 px | 16 | 500 | Rótulos da barra de baixo, etiquetas, metadados |
| 14 px | 20 | 400 / 500 | Texto secundário, ajudas, parcelas |
| 16 px | 24 | 400 / 500 | Corpo, campos, linhas de lista; títulos de secção a 600 |
| 18 px | 24 | 600 | Título do ecrã no cabeçalho |
| 24 px | 32 | 600 | Título do ecrã no desktop, valores de destaque |
| 40 px | 44 | 600 | O número do Início |

Três pesos: 400, 500 e 600. Os campos ficam a 16 px para o iPhone não fazer zoom. Saem os tamanhos arbitrários (`text-[0.6875rem]`, `text-[0.8125rem]`) e as maiúsculas forçadas.

### 8.7 Espaçamento, raios, sombras e toque

| | Valores |
|---|---|
| Espaçamento | Múltiplos de 4: 4, 8, 12, 16, 24, 32. Margem lateral 16 (24 no desktop). Interior dos cartões 16. Entre cartões 16. Entre secções 24. |
| Raios | Três: 6 px (caixas, amostras da legenda), 10 px (botões, campos, segmentos, alertas), 16 px (cartões, diálogos). Mais o círculo para pílulas, barras e o círculo de "paga". |
| Sombras | Cartões sem sombra, só contorno. Duas sombras: a do segmento escolhido (`0 1px 2px` a 8 %) e a dos elementos que flutuam, como diálogos, ajudas e avisos (`0 8px 24px` a 12 % no claro e 50 % no escuro, com contorno). |
| Toque | Alvos de 44 px no mínimo: botões e campos a 44, linhas de lista a 56, barra de baixo a 64, cabeçalho a 56. Sai o uso dos tamanhos `sm` e `xs` dos botões. |
| Ícones | lucide, 20 px, traço 1,75. Estados: círculo com visto, triângulo de aviso, círculo com X. |
| Movimento | Transições de 150 ms em cor e opacidade. Nenhuma com "reduzir movimento" ligado. |

### 8.8 Escolha de tema

- Cookie `tema` com `claro` ou `escuro`; sem cookie é "Sistema". Dura um ano, como o `saldo-oculto`.
- O servidor lê o cookie e escreve `data-tema` no `<html>`. Em "Sistema" decide o CSS, com `prefers-color-scheme`. Nos dois casos a página já chega com as cores certas: não pisca e não precisa de script.
- `themeColor` passa a `generateViewport`: com tema escolhido devolve uma cor; em "Sistema" devolve as duas, com `media`.
- O manifest e o ícone leem as cores de `src/lib/tema.ts`. O manifest só aceita uma cor, por isso fica com as do tema claro. Um teste garante que `tema.ts` e `globals.css` têm os mesmos valores.

---

## 9. Plano de implementação

Cada passo deixa a app a funcionar e acaba com `npm run typecheck`, `npm run lint`, `npm test`, um commit em PT-PT sem atribuição e 2 ou 3 linhas para ti. Nenhum passo precisa de migrações. Não corro `next build`.

Os testes mudam no passo em que o texto muda, para passarem sempre.

| # | Passo | O que entra | Testes |
|---|---|---|---|
| 1 | **Tokens e tema** | Tokens novos em `globals.css` com os nomes em português e as pontes para o shadcn. Nomes antigos (`ok`, `mau-suave`, `grafico-1`…) ficam como pontes temporárias até ao passo 8. Fonte única; `font-mono` e `font-heading` saem das classes. Cookie `tema`, `data-tema`, `generateViewport`, `src/lib/tema.ts`, manifest e ícone. Saem `chart-*` e `sidebar-*`. | Novo `tema.test.ts`: contraste AA e valores iguais em `tema.ts` e no CSS. |
| 2 | **Componentes base, formatos e rótulos** | `euros()` com `−`; datas curta, longa e com hora; rótulos do glossário num só módulo (estados, marcos, categorias, "Sem divisão"). Componentes: `Valor`, `Estado`, `Etiqueta` (Badge), `Aviso` (Alert), `Cartao` (Card), `Segmentos`, `Barra` e `Legenda` (uma só), `Ajuda` (o `(i)`), diálogo de confirmação, aviso com "Anular". Botões e campos a 44 px. Páginas de erro, de "não encontrado" e esqueletos. | `formato` (sinal de menos), `escritura` (data curta), `orcamento` e `validacao` ("Sem divisão"). |
| 3 | **Navegação e Definições** | Barra de baixo com o "+", cabeçalho com título, olho e roda dentada. `/definicoes` com os quatro cartões e a regra de gravação. `/contas` redireciona. Frases dos erros do Wallet pelo código. `/previsao` nasce com os blocos atuais, movidos do Resumo sem redesenho, para o separador já funcionar. | `validacao` ("fim da obra", "Definições"). Novo teste das frases por código de erro. |
| 4 | **Início** | Cartão do estado, "Saldo hoje" e "Por pagar", próximos pagamentos, estados vazios e sem saldos. Sai o resto do Resumo. | `formato` (estados). Novo teste do resumo do Início. |
| 5 | **Despesas** | Linha com círculo, filtros, lista de divisões, Nova e Editar com botões fixos, apagar com diálogo, "Anular". | Sem texto testado. |
| 6 | **Previsão** | Gráfico sempre visível com os marcos, cartão das contas, "Mês a mês" num só componente (lista no telemóvel, grelha no desktop), `/previsao/gastos`, "Como é calculado". Sai a tabela duplicada e a banda que nunca aparece. | `tendencia` ("Fixo: …"). |
| 7 | **Orçamento** | Ecrã de leitura, `/orcamento/editar`, "Categorias". Sai o `Numero` duplicado. | `orcamento` (mensagem do limite). |
| 8 | **Textos restantes, testes e README** | Varrimento final contra o glossário ("ciclo", "tu", "vocês", "sincroniz", "orçamento máximo", "Não aplicável"). Saem as pontes temporárias do passo 1 e os componentes sem uso. README atualizado, sem a banda otimista/pessimista. Verificação a 375 e 1280 px, em claro e escuro. | Todos. |

**O que fica igual**: os cálculos (`previsao.ts`, `tendencia.ts`, `tendencia-regras.ts`, `ciclo.ts`, `escritura.ts`, `orcamento.ts`), os endereços `?ver=`, `?divisao=` e `?adicionada`, o cookie `saldo-oculto` e a classe `privado`, `revalidatePath("/", "layout")` depois de cada ação, o fuso de Lisboa, o matcher do `src/proxy.ts`, os limites de validação e o enum das categorias. Em `tendencia.ts` e `escritura.ts` só mudam frases e rótulos.

**Dependências**: nenhuma nova. Diálogo, ajuda e caixas vêm do pacote `radix-ui`, que já está instalado. O aviso com "Anular" é um componente pequeno, feito à mão.

**Verificação visual**: `next dev` noutra porta, com uma base de dados local (PGlite, como da outra vez), nunca a de produção. Se o login do Google não funcionar em local, aviso e peço-te para veres no telemóvel.

---

## 10. Perguntas

Cada uma tem a minha recomendação. Se responderes só "ok", sigo com as recomendações.

### Preciso da tua decisão

1. **Registo.** Impessoal, sem "tu" nem "vocês", com os botões no infinitivo (como na secção 7)? Ou "tu" em toda a app? Recomendo impessoal.
2. **Paleta.** A (Sálvia) ou B (Areia)? Recomendo a B. Há uma pré-visualização das duas no ficheiro indicado na conversa.
3. **O número do Início quando falta dinheiro antes do último marco.** Exemplo: falta na escritura, mas o saldo recupera até ao fim da obra.
   - (a) O número segue o estado: mostra `−3 200 €` depois da escritura, e por baixo "Depois da obra (20 mar): 1 500 €". Recomendo.
   - (b) Sempre o último marco: mostra `1 500 €` debaixo de "Falta dinheiro na escritura".
4. **"Sem divisão" em vez de "Não aplicável".** Muda o rótulo, a regra do nome reservado e dois testes. Recomendo.
5. **Filtro de Despesas ao abrir.** "Por pagar" (recomendo) ou "Todas", como hoje? Com "Por pagar", `/despesas` sem parâmetros passa a mostrar só as por pagar e `?ver=todas` mostra todas. As ligações do Orçamento levam `ver=todas`.
6. **"Atualizar saldos" em vez de "Sincronizar com Wallet".** Recomendo.

### Assumo isto; diz se discordas

7. **Despesas depois do último marco.** O Início continua a mostrar o saldo depois do último marco, como decidiste em outubro, com a linha "No fim de abril de 2027: 9 300 €" por baixo.
8. **O "+" na barra de baixo**, e não um botão flutuante.
9. **Tocar numa despesa abre a página de edição**, e não uma folha inferior.
10. **"Por categoria" passa para o fim do Orçamento**, com o título "Categorias". A alternativa é sair da app.
11. **Fonte única: Instrument Sans.**
12. **Passar do limite é aviso (âmbar)**, não erro (vermelho).
13. **"Ligações (luz, água, gás, net)" mostra-se como "Ligações".**
14. **A banda otimista/pessimista sai do README e do gráfico.** O cálculo fica como está.
15. **O "mínimo" sai do estado do Início.** Fica visível no gráfico da Previsão.
