import { NextRequest, NextResponse } from "next/server";
import { gerarLinkMagico } from "@/lib/auth";
import { enviarEmail, emailLoginMagico, emailAtivo } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });
  const r = await gerarLinkMagico(email);
  if (!r) return NextResponse.json({ ok: true, emailAtivo: emailAtivo() });
  const modelo = emailLoginMagico(r.nome, r.link);
  await enviarEmail({ para: String(email).trim().toLowerCase(), paraNome: r.nome, ...modelo });
  if (!emailAtivo()) console.log(`\n[login] Link para ${email}:\n${r.link}\n`);
  return NextResponse.json({ ok: true, emailAtivo: emailAtivo() });
}
