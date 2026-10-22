// app/api/export/convites/route.ts
//
// Exporta a lista de convites em Excel (.xlsx), com os links clicáveis.
//
// Objetivo prático: o RH abre o arquivo, distribui os links do teste para
// quem ainda não fez, e acessa a devolutiva de quem já concluiu.

import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { resolverTenant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { linkDoConvite } from "@/lib/credits";
import { dataHoraArquivo, ROTULO_STATUS, statusEfetivo } from "@/lib/export";
import { erro } from "@/lib/api";

const ASSESSMENT = process.env.ASSESSMENT_URL || "";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = resolverTenant(req.nextUrl.searchParams.get("tenantId"));

    const [convites, tenant] = await Promise.all([
      prisma.invite.findMany({
        where: { tenantId, status: { not: "CANCELED" as any } },
        orderBy: [{ status: "asc" }, { criadoEm: "desc" }],
        include: { session: { select: { completedAt: true } } },
      }),
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { nome: true } }),
    ]);

    const base = ASSESSMENT.replace(/\/$/, "");

    const wb = new ExcelJS.Workbook();
    wb.creator = "HAI-Q";
    wb.created = new Date();

    const ws = wb.addWorksheet("Convites", {
      views: [{ state: "frozen", ySplit: 1 }], // cabeçalho fixo ao rolar
    });

    ws.columns = [
      { header: "Nome",          key: "nome",   width: 32 },
      { header: "E-mail",        key: "email",  width: 36 },
      { header: "Status",        key: "status", width: 22 },
      { header: "Link do teste", key: "link",   width: 60 },
      { header: "Devolutiva",    key: "devo",   width: 60 },
    ];

    const cab = ws.getRow(1);
    cab.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cab.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF042C53" } };
    cab.alignment = { vertical: "middle" };
    cab.height = 22;

    const estiloLink = { color: { argb: "FF185FA5" }, underline: true } as const;

    for (const c of convites) {
      const status = statusEfetivo(c.status, c.session);
      const linkTeste = linkDoConvite(c.id, base);

      // A devolutiva só existe depois que a pessoa conclui o teste
      const linkDevo =
        status === "COMPLETED" && c.sessionId
          ? `${base}/devolutiva/${c.sessionId}`
          : "";

      const linha = ws.addRow({
        nome:   c.nome ?? "",
        email:  c.email,
        status: ROTULO_STATUS[status] ?? status,
        link:   linkTeste,
        devo:   linkDevo,
      });

      // Links clicáveis mostrando a URL completa — dá para clicar ou copiar
      const celTeste = linha.getCell("link");
      celTeste.value = { text: linkTeste, hyperlink: linkTeste };
      celTeste.font = estiloLink;

      if (linkDevo) {
        const celDevo = linha.getCell("devo");
        celDevo.value = { text: linkDevo, hyperlink: linkDevo };
        celDevo.font = estiloLink;
      }

      linha.alignment = { vertical: "middle" };
    }

    ws.autoFilter = { from: "A1", to: `E${convites.length + 1}` };

    const buffer = await wb.xlsx.writeBuffer();
    const nomeCliente = (tenant?.nome ?? "cliente")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="convites_${nomeCliente}_${dataHoraArquivo()}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) { return erro(e); }
}
