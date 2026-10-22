import { NextRequest, NextResponse } from "next/server";
import { gerarLinkMagico } from "@/lib/auth";
import { enviarEmail, emailLoginMagico, emailAtivo } from "@/lib/email";

/**
 * Monta a URL pública a partir dos cabeçalhos da requisição.
 *
 * Mais confiável que process.env.PAINEL_URL porque o Next.js substitui
 * referências a process.env durante o build — uma variável adicionada
 * depois não é vista pelo código compilado.
 *
 * Atrás de proxy (Railway, Vercel, Cloudflare), o host real vem em
 * x-forwarded-host e o protocolo em x-forwarded-proto.
 */
function origemDaRequisicao(req: NextRequest): string | undefined {
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    undefined;
  if (!host) return undefined;

  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Informe o e-mail." }, { status: 400 });

  const r = await gerarLinkMagico(email, origemDaRequisicao(req));

  // Resposta idêntica exista ou não o usuário — não revela quais e-mails
  // estão cadastrados no sistema.
  if (!r) return NextResponse.json({ ok: true, emailAtivo: emailAtivo() });

  const modelo = emailLoginMagico(r.nome, r.link);
  await enviarEmail({ para: String(email).trim().toLowerCase(), paraNome: r.nome, ...modelo });

  if (!emailAtivo()) console.log(`\n[login] Link para ${email}:\n${r.link}\n`);

  return NextResponse.json({ ok: true, emailAtivo: emailAtivo() });
}
