import { redirect } from "next/navigation";

// Atalho: /r/{sessionId} leva à devolutiva do RH no app de assessment.
// Mantém os links do painel curtos e independentes da URL do assessment.
export default function Devolutiva({ params }: { params: { sessionId: string } }) {
  const base = (process.env.ASSESSMENT_URL || "").replace(/\/$/, "");
  redirect(`${base}/admin/devolutiva/${params.sessionId}`);
}
