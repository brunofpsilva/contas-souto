"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { EstadoFormDespesa } from "@/actions/despesas";
import { SegmentosEscolha } from "@/components/segmentos";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIAS, LIMITE_DESCRICAO, LIMITE_NOTA, SEM_DIVISAO } from "@/lib/dominio";
import { dataCurta, dataDoMarco, MARCOS, type DatasMarcos, type Marco } from "@/lib/escritura";
import { ROTULO_ESTADO, rotuloCategoria } from "@/lib/rotulos";
import { cn } from "@/lib/utils";

export interface ValoresDespesa {
  descricao: string;
  valor: string;
  mes: string;
  /** "mes", "escritura" ou "obra" */
  quando: string;
  categoria: string;
  /** Id da divisão, ou "nenhuma" (Sem divisão) */
  divisao: string;
  estado: string;
  nota: string;
}

const OPCOES_ESTADO = [
  { valor: "previsto", texto: ROTULO_ESTADO.previsto },
  { valor: "pago", texto: ROTULO_ESTADO.pago },
];

const OPCOES_QUANDO = [
  { valor: "mes", texto: "Num mês" },
  { valor: "escritura", texto: MARCOS.escritura.titulo },
  { valor: "obra", texto: MARCOS.obra.titulo },
];

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
    // No telemóvel, o fundo do formulário deixa espaço para os botões fixos em baixo.
    <form action={submeter} className={cn("grid max-w-xl gap-5", permitirOutra && "max-md:pb-14")} noValidate key={chave}>
      {estado?.mensagem && (
        <Alert variant="negativo" role="alert">
          {estado.mensagem}
        </Alert>
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
            className="pr-8 tabular-nums"
            aria-invalid={Boolean(erros.valor)}
            aria-describedby={erros.valor ? "valor-erro" : undefined}
          />
          <span className="text-texto-suave pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">€</span>
        </div>
      </Campo>

      <Quando inicial={v.quando} mes={v.mes} erro={erros.mes} datas={datas} />

      <SegmentosEscolha nome="estado" rotulo="Estado" opcoes={OPCOES_ESTADO} valor={v.estado === "pago" ? "pago" : "previsto"} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="categoria" rotulo="Categoria">
          <NativeSelect id="categoria" name="categoria" defaultValue={v.categoria}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {rotuloCategoria(c)}
              </option>
            ))}
          </NativeSelect>
        </Campo>
        <Campo id="divisao" rotulo="Divisão" erro={erros.divisaoId}>
          {/* Uma divisão apagada entretanto volta a Sem divisão. */}
          <NativeSelect id="divisao" name="divisao" defaultValue={divisoes.some((d) => String(d.id) === v.divisao) ? v.divisao : "nenhuma"}>
            {divisoes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
            <option value="nenhuma">{SEM_DIVISAO}</option>
          </NativeSelect>
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

      {/* Telemóvel: botões fixos em baixo, no lugar da barra de navegação. A partir de md, no fim do formulário. */}
      <div className="bg-fundo/95 supports-backdrop-filter:bg-fundo/85 fixed inset-x-0 bottom-0 z-20 grid gap-2 border-t pt-3 pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] backdrop-blur md:static md:z-auto md:flex md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button type="submit" disabled={aGuardar}>
          {aGuardar ? "A guardar…" : textoBotao}
        </Button>
        {permitirOutra && (
          <Button type="submit" name="seguinte" value="outra" variant="outline" disabled={aGuardar}>
            Adicionar e criar outra
          </Button>
        )}
      </div>
    </form>
  );
}

/**
 * Num mês à escolha, na escritura ou no fim da obra. Nos dois últimos, a despesa fica com o
 * mês da data do marco e acompanha-a quando muda.
 */
function Quando({ inicial, mes, erro, datas }: { inicial: string; mes: string; erro?: string; datas: DatasMarcos }) {
  const [quando, setQuando] = useState(inicial === "escritura" || inicial === "obra" ? inicial : "mes");
  const marco = quando === "mes" ? null : (quando as Marco);
  const dataMarco = marco ? dataDoMarco(marco, datas) : null;
  return (
    <div className="grid gap-2">
      <SegmentosEscolha nome="quando" rotulo="Quando" opcoes={OPCOES_QUANDO} valor={quando} aoMudar={setQuando} />
      {marco ? (
        <>
          <input type="hidden" name="mes" value={mes} />
          <p className="text-texto-suave flex flex-wrap items-center gap-x-1 px-1 text-sm">
            {dataMarco ? (
              `${dataCurta(dataMarco)} · muda com a data`
            ) : (
              <>
                Sem data {MARCOS[marco].de}.
                <Link
                  href="/definicoes#datas"
                  className="text-primaria focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-sm px-1 font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3"
                >
                  Definir
                </Link>
              </>
            )}
          </p>
        </>
      ) : (
        <Input
          id="mes"
          name="mes"
          type="month"
          defaultValue={mes}
          placeholder="AAAA-MM"
          pattern="\d{4}-\d{2}"
          required
          aria-label="Mês"
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? "mes-erro" : undefined}
          className="sm:max-w-xs"
        />
      )}
      {erro && (
        <p id="mes-erro" className="text-negativo text-sm">
          {erro}
        </p>
      )}
    </div>
  );
}

function Campo({ id, rotulo, erro, children }: { id: string; rotulo: string; erro?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {erro && (
        <p id={`${id}-erro`} className="text-negativo text-sm">
          {erro}
        </p>
      )}
    </div>
  );
}
