import { NextRequest, NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { erro } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    exigirAdmin();
    const tenantId = req.nextUrl.searchParams.get("tenantId");
    const users = await prisma.user.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { criadoEm: "desc" },
      include: { tenant: { select: { nome: true, slug: true } } },
    });
    return NextResponse.json({
      usuarios: users.map((u: any) => ({
        id: u.id, email: u.email, nome: u.nome, role: u.role, ativo: u.ativo,
        tenantId: u.tenantId, tenantNome: u.tenant?.nome ?? null,
        criadoEm: u.criadoEm, ultimoLogin: u.ultimoLogin,
      })),
    });
  } catch (e) { return erro(e); }
}

export async function POST(req: NextRequest) {
  try {
    exigirAdmin();
    const { email, nome, role, tenantId } = await req.json();
    if (!email || !nome) return NextResponse.json({ error: "Informe e-mail e nome." }, { status: 400 });
    if (role === "TENANT" && !tenantId) {
      return NextResponse.json({ error: "Usuário de cliente precisa de um tenant." }, { status: 400 });
    }
    const limpo = String(email).trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email: limpo } })) {
      return NextResponse.json({ error: "Já existe um usuário com este e-mail." }, { status: 400 });
    }
    const u = await prisma.user.create({
      data: {
        email: limpo, nome: String(nome).trim(),
        role: role === "ADMIN" ? "ADMIN" : "TENANT",
        tenantId: role === "ADMIN" ? null : tenantId,
      },
    });
    return NextResponse.json({ usuario: { id: u.id, email: u.email, nome: u.nome, role: u.role } });
  } catch (e) { return erro(e); }
}
