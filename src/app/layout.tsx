import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Influencer Rising Star — Employee Advocacy",
  description: "Aplikasi pencatatan employee advocacy sosial media PT Pegadaian. Catat, verifikasi, dan kumpulkan poin dari aktivitas promosi di sosial media.",
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
  },
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
