"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EstadoFormDespesa } from "@/actions/despesas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIAS, LIMITE_DESCRICAO, LIMITE_NOTA, PESSOAS } from "@/lib/dominio";
import { cn } from "@/lib/utils";

export interface ValoresDespesa {
  descricao: string;
  valor: string;
  mes: string;
  categoria: string;
  quem: string;
  estado: string;
  nota: string;
}

export function FormDespesa({
  acao,
  iniciais,
  textoBotao,
  permitirOutra = false,
}: {
  acao: (anterior: EstadoFormDespesa, form: FormData) => Promise<EstadoFormDespesa>;
  iniciais: ValoresDespesa;
  textoBotao: string;
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
        <Campo id="mes" rotulo="Mês previsto" erro={erros.mes}>
          <Input
            id="mes"
            name="mes"
            type="month"
            defaultValue={v.mes}
            placeholder="AAAA-MM"
            pattern="\d{4}-\d{2}"
            required
            aria-invalid={Boolean(erros.mes)}
            aria-describedby={erros.mes ? "mes-erro" : undefined}
          />
        </Campo>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Campo id="categoria" rotulo="Categoria" className="sm:col-span-3">
          <Escolha id="categoria" nome="categoria" valor={v.categoria} opcoes={CATEGORIAS} />
        </Campo>
        <Campo id="quem" rotulo="Quem paga">
          <Escolha id="quem" nome="quem" valor={v.quem} opcoes={PESSOAS} />
        </Campo>
        <Campo id="estado" rotulo="Estado">
          <Escolha
            id="estado"
            nome="estado"
            valor={v.estado}
            opcoes={["previsto", "pago"]}
            rotulos={{ previsto: "Previsto", pago: "Pago" }}
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
          aria-invalid={Boolean(erros.nota)}
          aria-describedby={erros.nota ? "nota-erro" : undefined}
        />
      </Campo>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" disabled={aGuardar}>
          {aGuardar ? "A guardar…" : textoBotao}
        </Button>
        {permitirOutra && (
          <Button type="submit" name="seguinte" value="outra" variant="outline" disabled={aGuardar}>
            Guardar e adicionar outra
          </Button>
        )}
        <Button variant="ghost" asChild>
          <Link href="/despesas">Cancelar</Link>
        </Button>
      </div>
    </form>
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
    <Select name={nome} defaultValue={valor}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((o) => (
          <SelectItem key={o} value={o}>
            {rotulos?.[o] ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
