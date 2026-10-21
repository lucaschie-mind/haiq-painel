import { NextResponse } from "next/server";
import { limparCookie } from "@/lib/auth";
export async function POST() { limparCookie(); return NextResponse.json({ ok: true }); }
