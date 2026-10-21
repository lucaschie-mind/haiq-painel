import { NextRequest, NextResponse } from "next/server";
import { resolverTenant } from "@/lib/auth";
import { saldoDoTenant } from "@/lib/credits";
import { erro } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = resolverTenant(req.nextUrl.searchParams.get("tenantId"));
    return NextResponse.json(await saldoDoTenant(tenantId));
  } catch (e) { return erro(e); }
}
