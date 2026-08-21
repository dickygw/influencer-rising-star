import type { Metadata } from "next";
import "./globals.css";

export const runtime = 'edge';

export const metadata: Metadata = {
  title: "Influencer Rising Star — Employee Advocacy",
  description: "Aplikasi pencatatan employee advocacy sosial media PT Pegadaian. Catat, verifikasi, dan kumpulkan poin dari aktivitas promosi di sosial media.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
