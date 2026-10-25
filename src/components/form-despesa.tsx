"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { EstadoFormDespesa } from "@/actions/despesas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIAS, LIMITE_DESCRICAO, LIMITE_NOTA, SEM_DIVISAO } from "@/lib/dominio";
import { dataCurta, dataDoMarco, MARCOS, type DatasMarcos, type Marco } from "@/lib/escritura";
import { cn } from "@/lib/utils";

export interface ValoresDespesa {
  descricao: string;
  valor: string;
  mes: string;
  /** "mes", "escritura" ou "obra" */
  quando: string;
  categoria: string;
  /** Id da divisão, ou "nenhuma" (Não aplicável) */
  divisao: string;
  estado: string;
  nota: string;
}

/** Cada opção de um grupo de botões de escolha (rádios com aspeto de separadores). */
const OPCAO =
  "flex min-h-9 cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50";
const OPCAO_ATIVA = "bg-card text-foreground shadow-sm";
const OPCAO_INATIVA = "text-muted-foreground hover:text-foreground";

export function FormDespesa({
  acao,
  iniciais,
  textoBotao,
  datas,
  divisoes,
  permitirOutra = false,
}: {
  acao: (anterior: EstadoFormDespesa, form: FormData) => Promise<EstadoFormDespesa>;
  iniciais: ValoresDespesa;
  textoBotao: string;
  datas: DatasMarcos;
  divisoes: { id: number; nome: string }[];
  permitirOutra?: boolean;
}) {
  const [estado, submeter, aGuardar] = useActionState(acao, null);
  const v = { ...iniciais, ...estado?.valores };
  const erros = estado?.erros ?? {};
  // Depois de uma submissão com erros, volta a montar os campos com o que foi escrito.
  const chave = estado ? JSON.stringify(estado.valores) : "inicial";

  return (
    <form action={submeter} className="grid max-w-xl gap-5" noValidate key={chave}>
      {estado?.mensagem && (
        <p role="alert" className="border-destructive/30 bg-mau-suave text-destructive rounded-lg border px-3 py-2 text-sm">
          {estado.mensagem}
        </p>
      )}

      <Campo id="descricao" rotulo="Descrição" erro={erros.descricao}>
        <Input
          id="descricao"
          name="descricao"
          defaultValue={v.descricao}
          maxLength={LIMITE_DESCRICAO}
          required
          autoFocus={!iniciais.descricao}
          autoCapitalize="sentences"
          enterKeyHint="next"
          aria-invalid={Boolean(erros.descricao)}
          aria-describedby={erros.descricao ? "descricao-erro" : undefined}
        />
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="valor" rotulo="Valor" erro={erros.valor}>
          <div className="relative">
            <Input
              id="valor"
              name="valor"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="next"
              defaultValue={v.valor}
              placeholder="0,00"
              required
              className="pr-8 font-mono"
              aria-invalid={Boolean(erros.valor)}
              aria-describedby={erros.valor ? "valor-erro" : undefined}
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
          </div>
        </Campo>
        <Segmentos
          nome="estado"
          rotulo="Estado"
          valor={v.estado}
          opcoes={[
            { valor: "previsto", texto: "Previsto" },
            { valor: "pago", texto: "Pago" },
          ]}
        />
      </div>

      <Quando inicial={v.quando} mes={v.mes} erro={erros.mes} datas={datas} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="categoria" rotulo="Categoria">
          <Escolha id="categoria" nome="categoria" valor={v.categoria} opcoes={CATEGORIAS} />
        </Campo>
        <Campo id="divisao" rotulo="Divisão" erro={erros.divisaoId}>
          <Escolha
            id="divisao"
            nome="divisao"
            // Uma divisão apagada entretanto volta a Não aplicável.
            valor={divisoes.some((d) => String(d.id) === v.divisao) ? v.divisao : "nenhuma"}
            opcoes={[...divisoes.map((d) => String(d.id)), "nenhuma"]}
            rotulos={{ ...Object.fromEntries(divisoes.map((d) => [String(d.id), d.nome])), nenhuma: SEM_DIVISAO }}
          />
        </Campo>
      </div>

      <Campo id="nota" rotulo="Nota (opcional)" erro={erros.nota}>
        <Textarea
          id="nota"
          name="nota"
          defaultValue={v.nota}
          maxLength={LIMITE_NOTA}
          rows={2}
          autoCapitalize="sentences"
          aria-invalid={Boolean(erros.nota)}
          aria-describedby={erros.nota ? "nota-erro" : undefined}
        />
      </Campo>

      {/* No telemóvel, botões a toda a largura e um por linha; a partir de sm, lado a lado. */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
        <Button type="submit" className="max-sm:h-11 max-sm:text-base" disabled={aGuardar}>
          {aGuardar ? "A guardar…" : textoBotao}
        </Button>
        {permitirOutra && (
          <Button type="submit" name="seguinte" value="outra" variant="outline" className="max-sm:h-11" disabled={aGuardar}>
            Guardar e adicionar outra
          </Button>
        )}
        <Button variant="ghost" className="max-sm:h-11" asChild>
          <Link href="/despesas">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

/**
 * Mês próprio, "na escritura" ou "na conclusão da obra" (fica com o mês da data do marco
 * e acompanha-a).
 */
function Quando({
  inicial,
  mes,
  erro,
  datas,
}: {
  inicial: string;
  mes: string;
  erro?: string;
  datas: DatasMarcos;
}) {
  const [quando, setQuando] = useState(inicial === "escritura" || inicial === "obra" ? inicial : "mes");
  const marcos: Marco[] = ["escritura", "obra"];
  const opcoes = [
    { valor: "mes", texto: "Num mês" },
    ...marcos.map((tipo) => {
      const data = dataDoMarco(tipo, datas);
      return { valor: tipo, texto: `Na ${MARCOS[tipo].nome}${data ? ` (${dataCurta(data)})` : ""}` };
    }),
  ];
  const marco = quando === "mes" ? null : (quando as Marco);
  const dataMarco = marco ? dataDoMarco(marco, datas) : null;
  return (
    <fieldset className="grid min-w-0 gap-1.5" aria-describedby={erro ? "mes-erro" : undefined}>
      <legend className="mb-1.5 text-sm leading-none font-medium select-none">Quando</legend>
      {/* No telemóvel as opções ficam umas por baixo das outras (os textos com data são compridos). */}
      <div className="bg-secondary grid gap-1 rounded-lg p-1 sm:flex sm:w-fit sm:flex-wrap">
        {opcoes.map((o) => (
          <label key={o.valor} className={cn(OPCAO, quando === o.valor ? OPCAO_ATIVA : OPCAO_INATIVA)}>
            <input
              type="radio"
              name="quando"
              value={o.valor}
              checked={quando === o.valor}
              onChange={() => setQuando(o.valor)}
              className="sr-only"
            />
            {o.texto}
          </label>
        ))}
      </div>
      {quando === "mes" ? (
        <Input
          id="mes"
          name="mes"
          type="month"
          defaultValue={mes}
          placeholder="AAAA-MM"
          pattern="\d{4}-\d{2}"
          required
          aria-label="Mês previsto"
          aria-invalid={Boolean(erro)}
          className="sm:max-w-xs"
        />
      ) : (
        <>
          <input type="hidden" name="mes" value={mes} />
          <p className="text-muted-foreground text-xs">
            {dataMarco ? (
              `Se a data da ${MARCOS[marco!].nome} mudar, esta despesa acompanha.`
            ) : (
              <>
                Ainda não há data da {MARCOS[marco!].nome}.{" "}
                <Link href="/contas" className="text-primary underline underline-offset-2">
                  Define-a em Contas
                </Link>
                .
              </>
            )}
          </p>
        </>
      )}
      {erro && (
        <p id="mes-erro" className="text-destructive text-sm">
          {erro}
        </p>
      )}
    </fieldset>
  );
}

/** Poucas opções (Estado): botões lado a lado, escolhe-se com um toque. */
function Segmentos({
  nome,
  rotulo,
  valor,
  opcoes,
}: {
  nome: string;
  rotulo: string;
  valor: string;
  opcoes: { valor: string; texto: string }[];
}) {
  return (
    <fieldset className="grid min-w-0 gap-1.5">
      <legend className="mb-1.5 text-sm leading-none font-medium select-none">{rotulo}</legend>
      <div className="bg-secondary grid auto-cols-fr grid-flow-col gap-1 rounded-lg p-1">
        {opcoes.map((o) => (
          <label key={o.valor} className={cn(OPCAO, "has-checked:bg-card has-checked:text-foreground has-checked:shadow-sm", OPCAO_INATIVA)}>
            <input type="radio" name={nome} value={o.valor} defaultChecked={valor === o.valor} className="sr-only" />
            {o.texto}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Campo({
  id,
  rotulo,
  erro,
  className,
  children,
}: {
  id: string;
  rotulo: string;
  erro?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {erro && (
        <p id={`${id}-erro`} className="text-destructive text-sm">
          {erro}
        </p>
      )}
    </div>
  );
}

/** Lista de escolha do sistema (roda no iPhone, lista no Android). */
function Escolha({
  id,
  nome,
  valor,
  opcoes,
  rotulos,
}: {
  id: string;
  nome: string;
  valor: string;
  opcoes: readonly string[];
  rotulos?: Record<string, string>;
}) {
  return (
    <NativeSelect id={id} name={nome} defaultValue={valor}>
      {opcoes.map((o) => (
        <option key={o} value={o}>
          {rotulos?.[o] ?? o}
        </option>
      ))}
    </NativeSelect>
  );
}
