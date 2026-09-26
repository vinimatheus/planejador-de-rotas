"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function maskCep(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

type Props = {
  id: string;
  placeholder?: string;
  actionLabel: string;
  actionIcon: React.ReactNode;
  loading?: boolean;
  onSubmit: (cep: string) => Promise<boolean>;
};

export function CepInput({ id, placeholder = "00000-000", actionLabel, actionIcon, loading, onSubmit }: Props) {
  const [value, setValue] = useState("");
  const complete = value.replace(/\D/g, "").length === 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete || loading) return;
    if (await onSubmit(value)) setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="postal-code"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(maskCep(e.target.value))}
        className="h-10 font-mono tracking-wider"
      />
      <Button type="submit" size="lg" className="h-10 px-3.5" disabled={!complete || loading}>
        {loading ? <Loader2Icon className="animate-spin" /> : actionIcon}
        <span className="sr-only sm:not-sr-only">{actionLabel}</span>
      </Button>
    </form>
  );
}
