// lib/api.ts — resposta padronizada de erro
import { NextResponse } from "next/server";
import { NaoAutorizado } from "@/lib/auth";

export function erro(e: unknown): NextResponse {
  if (e instanceof NaoAutorizado) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const msg = e instanceof Error ? e.message : "Erro inesperado";
  console.error("[api]", msg);
  return NextResponse.json({ error: msg }, { status: 400 });
}
