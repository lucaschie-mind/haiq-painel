// lib/credits.ts
//
// Regras de crédito do HAI-Q.
//
// Princípio: o saldo nunca é um campo que decrementa — é sempre contagem.
// Isso impede estouro de limite quando duas pessoas sobem listas ao mesmo
// tempo, porque o saldo é verdadeiro por construção.
//
//   livre = total_comprado − reservados − consumidos
//
// Um crédito pertence à PESSOA (ao convite), não à sessão. Se alguém começa,
// abandona e refaz, continua sendo um crédito só.

import { prisma } from "@/lib/db";

export interface SaldoCreditos {
  /** Soma de todos os lotes lançados */
  total: number;
  /** Convites criados que ainda não começaram — devolvíveis */
  reservados: number;
  /** Testes iniciados ou concluídos — irreversível */
  consumidos: number;
  /** Disponível para novos convites */
  livre: number;
  /** Detalhamento dos consumidos */
  iniciados: number;
  concluidos: number;
}

/** Calcula o saldo a partir do estado real do banco. */
export async function saldoDoTenant(tenantId: string): Promise<SaldoCreditos> {
  const [lotes, contagens] = await Promise.all([
    prisma.creditLot.aggregate({
      where: { tenantId },
      _sum: { quantidade: true },
    }),
    prisma.invite.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true },
    }),
  ]);

  const por = (s: string) =>
    contagens.find((c: { status: string; _count: { _all: number } }) => c.status === s)?._count._all ?? 0;

  const total       = lotes._sum.quantidade ?? 0;
  const reservados  = por("PENDING");
  const iniciados   = por("STARTED");
  const concluidos  = por("COMPLETED");
  const consumidos  = iniciados + concluidos;

  return {
    total,
    reservados,
    consumidos,
    iniciados,
    concluidos,
    livre: total - reservados - consumidos,
  };
}

// ═══════════════════════════════════════════════════════════════
// Validação de lista de convites (lógica pura — testável isolada)
// ═══════════════════════════════════════════════════════════════

export interface LinhaConvite {
  email: string;
  nome?: string;
}

export interface ResultadoValidacao {
  /** Linhas prontas para virar convite */
  validos: LinhaConvite[];
  /** Linhas rejeitadas, com o motivo */
  rejeitados: Array<{ linha: LinhaConvite; motivo: string }>;
  /** true se a lista cabe no saldo livre */
  cabeNoSaldo: boolean;
  /** Quantos convites a mais do que o saldo permite */
  excedente: number;
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Valida uma lista antes de criar os convites.
 * @param linhas         lista vinda do upload ou digitação
 * @param emailsExistentes e-mails que já têm convite ativo neste tenant
 * @param saldoLivre     créditos disponíveis
 */
export function validarLista(
  linhas: LinhaConvite[],
  emailsExistentes: string[],
  saldoLivre: number
): ResultadoValidacao {
  const jaExiste = new Set(emailsExistentes.map(normalizarEmail));
  const vistos   = new Set<string>();

  const validos: LinhaConvite[] = [];
  const rejeitados: ResultadoValidacao["rejeitados"] = [];

  for (const linha of linhas) {
    const email = normalizarEmail(linha.email ?? "");

    if (!email) {
      rejeitados.push({ linha, motivo: "E-mail vazio" });
      continue;
    }
    if (!RE_EMAIL.test(email)) {
      rejeitados.push({ linha, motivo: "E-mail inválido" });
      continue;
    }
    if (vistos.has(email)) {
      rejeitados.push({ linha, motivo: "Duplicado na própria lista" });
      continue;
    }
    if (jaExiste.has(email)) {
      rejeitados.push({ linha, motivo: "Já convidado anteriormente" });
      continue;
    }

    vistos.add(email);
    validos.push({ email, nome: linha.nome?.trim() || undefined });
  }

  const excedente = Math.max(0, validos.length - saldoLivre);

  return {
    validos,
    rejeitados,
    cabeNoSaldo: excedente === 0,
    excedente,
  };
}

// ═══════════════════════════════════════════════════════════════
// Operações que tocam o banco
// ═══════════════════════════════════════════════════════════════

/**
 * Cria os convites dentro de uma transação, revalidando o saldo.
 * A revalidação dentro da transação é o que impede estouro em concorrência.
 */
export async function criarConvites(
  tenantId: string,
  linhas: LinhaConvite[]
): Promise<{ criados: number; ids: string[] }> {
  return prisma.$transaction(async (tx: typeof prisma) => {
    const lotes = await tx.creditLot.aggregate({
      where: { tenantId },
      _sum: { quantidade: true },
    });
    const ativos = await tx.invite.count({
      where: { tenantId, status: { in: ["PENDING", "STARTED", "COMPLETED"] } },
    });

    const livre = (lotes._sum.quantidade ?? 0) - ativos;

    if (linhas.length > livre) {
      throw new Error(
        `Saldo insuficiente: ${linhas.length} convite(s) solicitado(s), ${livre} crédito(s) livre(s).`
      );
    }

    const ids: string[] = [];
    for (const linha of linhas) {
      const invite = await tx.invite.create({
        data: {
          tenantId,
          email: normalizarEmail(linha.email),
          nome: linha.nome ?? null,
        },
      });
      ids.push(invite.id);
    }

    return { criados: ids.length, ids };
  });
}

/**
 * Cancela um convite e devolve o crédito.
 * Só funciona em convite PENDING — depois de iniciado não há devolução.
 */
export async function cancelarConvite(
  inviteId: string,
  tenantId: string,
  userId: string
): Promise<void> {
  const invite = await prisma.invite.findFirst({
    where: { id: inviteId, tenantId },
  });

  if (!invite) throw new Error("Convite não encontrado neste tenant.");

  if (invite.status !== "PENDING") {
    throw new Error(
      invite.status === "CANCELED"
        ? "Convite já estava cancelado."
        : "Não é possível cancelar: a pessoa já iniciou o teste e o crédito foi consumido."
    );
  }

  await prisma.invite.update({
    where: { id: inviteId },
    data: { status: "CANCELED", canceladoEm: new Date(), canceladoPor: userId },
  });
}

/** Monta o link do convite a partir do id. */
export function linkDoConvite(inviteId: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/i/${inviteId}`;
}
