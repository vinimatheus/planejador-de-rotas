"use client";

import { useState } from "react";
import { formatCep, parseCepList } from "@router-map/shared";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  progress: { done: number; total: number } | null;
  /** Devolve os CEPs que não puderam ser adicionados. */
  onSubmit: (ceps: string[]) => Promise<string[]>;
};

/** Aceita um ou vários CEPs: digitados, colados de planilha, separados por vírgula, espaço ou linha. */
export function MultiCepInput({ id, progress, onSubmit }: Props) {
  const [value, setValue] = useState("");
  /** Quantos CEPs voltaram para o campo na última tentativa (some ao editar). */
  const [returned, setReturned] = useState(0);
  const { valid, invalid } = parseCepList(value);
  const busy = progress !== null;

  async function submit() {
    if (!valid.length || busy) return;
    const rejected = await onSubmit(valid);
    // Mantém no campo só o que não entrou, para a pessoa corrigir.
    setValue([...invalid, ...rejected.map(formatCep)].join("\n"));
    setReturned(rejected.length);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2">
        <textarea
          id={id}
          rows={Math.min(5, Math.max(1, value.split("\n").length))}
          inputMode="numeric"
          placeholder="CEP da entrega — ou cole vários"
          value={value}
          disabled={busy}
          onChange={(e) => {
            setValue(e.target.value);
            setReturned(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          className={cn(
            "min-h-10 w-full min-w-0 resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-base tracking-wider outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm",
          )}
        />
        <Button size="lg" className="h-10 px-3.5" disabled={!valid.length || busy} onClick={submit}>
          {busy ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
          <span className="sr-only sm:not-sr-only">
            {valid.length > 1 ? `Adicionar ${valid.length}` : "Adicionar"}
          </span>
        </Button>
      </div>
      <p className={cn("min-h-4 text-xs text-muted-foreground", returned > 0 && "text-destructive")} aria-live="polite">
        {busy
          ? `Buscando ${progress.done + 1} de ${progress.total}…`
          : returned
            ? `${returned === 1 ? "Este CEP não foi encontrado" : `Estes ${returned} CEPs não foram encontrados`}. Corrija ou apague.`
            : value.trim()
            ? [
                valid.length && `${valid.length} CEP${valid.length > 1 ? "s" : ""} reconhecido${valid.length > 1 ? "s" : ""}`,
                invalid.length && `${invalid.length} inválido${invalid.length > 1 ? "s" : ""}: ${invalid.slice(0, 3).join(", ")}`,
              ]
                .filter(Boolean)
                .join(" · ")
            : "Separe por vírgula, espaço ou uma por linha. Enter adiciona, Shift+Enter quebra linha."}
      </p>
    </div>
  );
}
