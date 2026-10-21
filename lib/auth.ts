// lib/auth.ts
//
// Autenticação por link mágico, sem senha.
//
// Fluxo:
//   1. Usuário informa o e-mail
//   2. Geramos um token aleatório, guardamos só o HASH no banco
//   3. O token em claro vai no link, por e-mail (ou para o log, se e-mail off)
//   4. Ao abrir o link, validamos o hash, marcamos como usado e criamos o cookie
//
// O token é de uso único e expira em 30 minutos.

import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const COOKIE   = "haiq_sessao";
const VALIDADE_TOKEN_MIN = 30;
const VALIDADE_SESSAO_DIAS = 14;

export interface Sessao {
  userId: string;
  email: string;
  nome: string;
  role: "ADMIN" | "TENANT";
  tenantId: string | null;
  exp: number;
}

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET ausente ou curto demais. Defina nas variáveis de ambiente.");
  }
  return s;
}

function hash(valor: string): string {
  return crypto.createHash("sha256").update(valor).digest("hex");
}

// ─── Cookie assinado ────────────────────────────────────────────

function assinar(payload: string): string {
  const mac = crypto.createHmac("sha256", segredo()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function verificar(assinado: string): string | null {
  const i = assinado.lastIndexOf(".");
  if (i < 0) return null;
  const payload = assinado.slice(0, i);
  const mac     = assinado.slice(i + 1);
  const esperado = crypto.createHmac("sha256", segredo()).update(payload).digest("base64url");
  // Comparação em tempo constante evita timing attack
  const a = Buffer.from(mac);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return payload;
}

// ─── Emissão do link mágico ─────────────────────────────────────

/**
 * Gera o token e devolve o link completo.
 * Retorna null se o e-mail não pertencer a nenhum usuário ativo —
 * o chamador deve responder igual nos dois casos, para não revelar
 * quais e-mails existem no sistema.
 */
export async function gerarLinkMagico(email: string): Promise<{ link: string; nome: string } | null> {
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase(), ativo: true },
  });
  if (!user) return null;

  const token = crypto.randomBytes(32).toString("base64url");

  await prisma.magicLinkToken.create({
    data: {
      tokenHash: hash(token),
      userId: user.id,
      expiraEm: new Date(Date.now() + VALIDADE_TOKEN_MIN * 60_000),
    },
  });

  const base = (process.env.PAINEL_URL || "http://localhost:3000").replace(/\/$/, "");
  return { link: `${base}/login/verificar?t=${token}`, nome: user.nome };
}

/** Consome o token e devolve a sessão, ou null se inválido/expirado/usado. */
export async function consumirToken(token: string): Promise<Sessao | null> {
  const registro = await prisma.magicLinkToken.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: { include: { tenant: true } } },
  });

  if (!registro) return null;
  if (registro.usadoEm) return null;
  if (registro.expiraEm < new Date()) return null;
  if (!registro.user.ativo) return null;

  await prisma.$transaction([
    prisma.magicLinkToken.update({
      where: { id: registro.id },
      data: { usadoEm: new Date() },
    }),
    prisma.user.update({
      where: { id: registro.userId },
      data: { ultimoLogin: new Date() },
    }),
  ]);

  return {
    userId:   registro.user.id,
    email:    registro.user.email,
    nome:     registro.user.nome,
    role:     registro.user.role as "ADMIN" | "TENANT",
    tenantId: registro.user.tenantId,
    exp:      Date.now() + VALIDADE_SESSAO_DIAS * 86_400_000,
  };
}

// ─── Cookie de sessão ───────────────────────────────────────────

export function criarCookie(sessao: Sessao): void {
  const payload = Buffer.from(JSON.stringify(sessao)).toString("base64url");
  cookies().set(COOKIE, assinar(payload), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   VALIDADE_SESSAO_DIAS * 86_400,
  });
}

export function limparCookie(): void {
  cookies().delete(COOKIE);
}

/** Lê a sessão do cookie. Retorna null se ausente, adulterado ou expirado. */
export function sessaoAtual(): Sessao | null {
  const bruto = cookies().get(COOKIE)?.value;
  if (!bruto) return null;

  const payload = verificar(bruto);
  if (!payload) return null;

  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Sessao;
    if (!s.exp || s.exp < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

// ─── Guardas de autorização ─────────────────────────────────────

export class NaoAutorizado extends Error {
  constructor(msg = "Não autorizado") { super(msg); }
}

/** Exige sessão válida. */
export function exigirSessao(): Sessao {
  const s = sessaoAtual();
  if (!s) throw new NaoAutorizado("Faça login para continuar.");
  return s;
}

/** Exige papel de admin (Mindsight). */
export function exigirAdmin(): Sessao {
  const s = exigirSessao();
  if (s.role !== "ADMIN") throw new NaoAutorizado("Acesso restrito a administradores.");
  return s;
}

/**
 * Resolve qual tenant a requisição pode acessar.
 * ADMIN pode passar qualquer tenantId. TENANT só acessa o próprio —
 * tentar outro resulta em erro, mesmo que o id seja válido.
 *
 * Esta função é a barreira de isolamento entre clientes. Toda rota que
 * lê ou escreve dados de tenant precisa passar por aqui.
 */
export function resolverTenant(tenantIdSolicitado?: string | null): { sessao: Sessao; tenantId: string } {
  const sessao = exigirSessao();

  if (sessao.role === "ADMIN") {
    if (!tenantIdSolicitado) throw new NaoAutorizado("Informe o tenant.");
    return { sessao, tenantId: tenantIdSolicitado };
  }

  if (!sessao.tenantId) throw new NaoAutorizado("Usuário sem tenant associado.");

  if (tenantIdSolicitado && tenantIdSolicitado !== sessao.tenantId) {
    throw new NaoAutorizado("Você não tem acesso a este tenant.");
  }

  return { sessao, tenantId: sessao.tenantId };
}
