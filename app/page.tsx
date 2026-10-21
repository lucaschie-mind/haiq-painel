import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/auth";

export default function Home() {
  const s = sessaoAtual();
  if (!s) redirect("/login");
  redirect(s.role === "ADMIN" ? "/admin" : "/painel");
}
