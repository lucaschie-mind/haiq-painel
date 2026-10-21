import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HAI-Q · Painel",
  description: "Painel de gestão do assessment HAI-Q",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, background: "#f0f4f8",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: "#2A2A2A" }}>
        {children}
      </body>
    </html>
  );
}
