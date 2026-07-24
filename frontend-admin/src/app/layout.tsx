import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cloud POS - Panel Administrador",
  description: "Sistema Cloud POS de administración de inventarios y cajas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-800">{children}</body>
    </html>
  );
}
