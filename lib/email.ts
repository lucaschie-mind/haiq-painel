// lib/email.ts
//
// Envio de e-mail com adaptadores intercambiáveis.
//
// Sem provedor configurado (EMAIL_PROVIDER=disabled), nada quebra:
// o conteúdo vai para o log do servidor e a função devolve enviado=false.
// Quem chama decide o que fazer — tipicamente, mostrar o link na tela
// para o usuário copiar.
//
// ─── Como ativar ────────────────────────────────────────────────
//
// BREVO (mais rápido: verifica um e-mail só, sem mexer em DNS)
//   1. brevo.com → conta gratuita → 300 e-mails/dia
//   2. Senders & IP → Add a sender → confirma pelo link recebido
//   3. SMTP & API → API Keys → cria uma chave v3
//   4. Variáveis: EMAIL_PROVIDER=brevo, EMAIL_API_KEY=xkeysib-...
//
// RESEND (melhor entregabilidade, exige verificar domínio no DNS)
//   1. resend.com → conta gratuita → 3.000 e-mails/mês
//   2. Domains → adiciona o domínio → configura os registros DNS
//   3. API Keys → cria uma chave
//   4. Variáveis: EMAIL_PROVIDER=resend, EMAIL_API_KEY=re_...

export interface Email {
  para: string;
  paraNome?: string;
  assunto: string;
  html: string;
  texto: string;
}

export interface ResultadoEnvio {
  enviado: boolean;
  motivo?: string;
}

function config() {
  return {
    provider: (process.env.EMAIL_PROVIDER || "disabled").toLowerCase(),
    apiKey:   process.env.EMAIL_API_KEY || "",
    from:     process.env.EMAIL_FROM || "noreply@example.com",
    fromNome: process.env.EMAIL_FROM_NAME || "HAI-Q",
  };
}

export function emailAtivo(): boolean {
  const c = config();
  return c.provider !== "disabled" && !!c.apiKey;
}

export async function enviarEmail(email: Email): Promise<ResultadoEnvio> {
  const c = config();

  if (!emailAtivo()) {
    console.log(
      `\n[email desativado] Para: ${email.para}\n` +
      `[email desativado] Assunto: ${email.assunto}\n` +
      `[email desativado] ${email.texto}\n`
    );
    return { enviado: false, motivo: "Envio de e-mail não configurado." };
  }

  try {
    if (c.provider === "brevo")  return await viaBrevo(email, c);
    if (c.provider === "resend") return await viaResend(email, c);
    return { enviado: false, motivo: `Provedor desconhecido: ${c.provider}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] falha no envio:", msg);
    return { enviado: false, motivo: msg };
  }
}

type Cfg = ReturnType<typeof config>;

async function viaBrevo(email: Email, c: Cfg): Promise<ResultadoEnvio> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": c.apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender:      { email: c.from, name: c.fromNome },
      to:          [{ email: email.para, name: email.paraNome || email.para }],
      subject:     email.assunto,
      htmlContent: email.html,
      textContent: email.texto,
    }),
  });

  if (!res.ok) {
    const corpo = await res.text();
    return { enviado: false, motivo: `Brevo ${res.status}: ${corpo.slice(0, 200)}` };
  }
  return { enviado: true };
}

async function viaResend(email: Email, c: Cfg): Promise<ResultadoEnvio> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${c.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    `${c.fromNome} <${c.from}>`,
      to:      [email.para],
      subject: email.assunto,
      html:    email.html,
      text:    email.texto,
    }),
  });

  if (!res.ok) {
    const corpo = await res.text();
    return { enviado: false, motivo: `Resend ${res.status}: ${corpo.slice(0, 200)}` };
  }
  return { enviado: true };
}

// ═══════════════════════════════════════════════════════════════
// Modelos de e-mail
// ═══════════════════════════════════════════════════════════════

function layout(titulo: string, corpo: string, botao?: { texto: string; url: string }): string {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f0f4f8;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;">
<table role="presentation" style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border-collapse:collapse;">
<tr><td style="background:#042C53;padding:24px 28px;">
  <div style="font-size:24px;font-weight:700;color:#378ADD;letter-spacing:2px;">HAI-Q</div>
  <div style="font-size:12px;color:#85B7EB;margin-top:2px;">Human–AI Intelligence Quotient</div>
</td></tr>
<tr><td style="padding:26px 28px;">
  <h1 style="font-size:19px;color:#042C53;margin:0 0 14px;font-weight:600;">${titulo}</h1>
  ${corpo}
  ${botao ? `<div style="margin:24px 0 8px;">
    <a href="${botao.url}" style="display:inline-block;background:#185FA5;color:#fff;text-decoration:none;padding:13px 26px;border-radius:8px;font-size:15px;font-weight:600;">${botao.texto}</a>
  </div>
  <p style="font-size:12px;color:#888;line-height:1.6;margin:14px 0 0;">
    Se o botão não funcionar, copie e cole este endereço no navegador:<br>
    <span style="color:#185FA5;word-break:break-all;">${botao.url}</span>
  </p>` : ""}
</td></tr>
<tr><td style="padding:14px 28px 22px;border-top:1px solid #eef2f7;">
  <p style="font-size:11px;color:#aaa;margin:0;">Esta é uma mensagem automática. Não responda a este e-mail.</p>
</td></tr>
</table></body></html>`;
}

export function emailLoginMagico(nome: string, link: string): Omit<Email, "para" | "paraNome"> {
  const corpo = `
    <p style="font-size:15px;color:#333;line-height:1.7;margin:0;">Olá, ${nome}!</p>
    <p style="font-size:15px;color:#333;line-height:1.7;margin:12px 0 0;">
      Use o botão abaixo para entrar no painel. O link vale por 30 minutos e funciona uma única vez.
    </p>`;
  return {
    assunto: "Seu acesso ao painel HAI-Q",
    html: layout("Acesso ao painel", corpo, { texto: "Entrar no painel", url: link }),
    texto: `Olá, ${nome}!\n\nUse este link para entrar no painel HAI-Q:\n${link}\n\nO link vale por 30 minutos e funciona uma única vez.`,
  };
}

export function emailConvite(
  nome: string | null,
  link: string,
  nomeEmpresa: string
): Omit<Email, "para" | "paraNome"> {
  const saudacao = nome ? `Olá, ${nome}!` : "Olá!";
  const corpo = `
    <p style="font-size:15px;color:#333;line-height:1.7;margin:0;">${saudacao}</p>
    <p style="font-size:15px;color:#333;line-height:1.7;margin:12px 0 0;">
      A ${nomeEmpresa} convidou você para participar de um assessment sobre colaboração com
      Inteligência Artificial.
    </p>
    <p style="font-size:15px;color:#333;line-height:1.7;margin:12px 0 0;">
      Você vai receber um desafio real, conversar com uma IA e construir um plano de ação.
      Leva cerca de 30 minutos e <strong>não existe resposta certa</strong> — o que importa é
      como você investiga o problema e constrói sua posição.
    </p>
    <p style="font-size:15px;color:#333;line-height:1.7;margin:12px 0 0;">
      Ao final, você recebe uma devolutiva individual com pontos de desenvolvimento.
    </p>`;
  return {
    assunto: `${nomeEmpresa} convidou você para o assessment HAI-Q`,
    html: layout("Seu convite para o assessment", corpo, { texto: "Começar o assessment", url: link }),
    texto: `${saudacao}\n\nA ${nomeEmpresa} convidou você para um assessment sobre colaboração com IA.\n\nSão cerca de 30 minutos, não existe resposta certa, e você recebe uma devolutiva individual ao final.\n\nAcesse: ${link}`,
  };
}
