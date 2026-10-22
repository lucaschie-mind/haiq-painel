// lib/export.ts
//
// Geração de CSV para as duas exportações do painel.
// CSV com BOM para o Excel abrir acentuação corretamente no Windows.

export type Linha = Record<string, string | number | null | undefined>;

function escapar(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Monta CSV com separador ponto e vírgula (padrão pt-BR no Excel). */
export function montarCSV(colunas: string[], linhas: Linha[]): string {
  const cab = colunas.map(escapar).join(";");
  const corpo = linhas.map(l => colunas.map(c => escapar(l[c])).join(";"));
  return "\uFEFF" + [cab, ...corpo].join("\r\n");
}

export function respostaCSV(nomeArquivo: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function dataHoraArquivo(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

export function formatarData(d: Date | null | undefined): string {
  return d ? new Date(d).toLocaleString("pt-BR") : "";
}

export const ROTULO_STATUS: Record<string, string> = {
  PENDING:   "Não iniciou",
  STARTED:   "Iniciou, não concluiu",
  COMPLETED: "Concluído",
  CANCELED:  "Cancelado",
};

/**
 * Status real do convite.
 *
 * A fonte da verdade sobre conclusão é a sessão: se completedAt existe,
 * a pessoa terminou. O campo status do convite pode ficar em STARTED
 * porque o app de assessment não o atualiza ao concluir.
 */
export function statusEfetivo(
  status: string,
  sessao?: { completedAt?: Date | string | null } | null
): string {
  if (status === "STARTED" && sessao?.completedAt) return "COMPLETED";
  return status;
}
