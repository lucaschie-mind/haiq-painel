import { NextRequest, NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { erro } from "@/lib/api";

const FLAGS = ["mostrarMetodologia", "mostrarAgencia", "mostrarPareceres", "mostrarGaps"] as const;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    exigirAdmin();
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.nome === "string")   data.nome  = body.nome.trim();
    if (typeof body.ativo === "boolean") data.ativo = body.ativo;

    if (body.reportConfig !== undefined) {
      if (body.reportConfig === null) { data.reportConfig = null; }
      else {
        const cfg: Record<string, boolean> = {};
        for (const f of FLAGS) if (typeof body.reportConfig[f] === "boolean") cfg[f] = body.reportConfig[f];
        data.reportConfig = Object.keys(cfg).length ? cfg : null;
      }
    }
    const t = await prisma.tenant.update({ where: { id: params.id }, data });
    return NextResponse.json({ tenant: t });
  } catch (e) { return erro(e); }
}
