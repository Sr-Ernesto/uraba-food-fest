import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uraba Food Fest 2026 🍔",
  description: "Vota por la mejor hamburguesa de Urabá",
  openGraph: {
    title: "Uraba Food Fest 2026 🍔",
    description: "Vota por la mejor hamburguesa de Urabá",
    type: "website",
    url: "https://urabafoodfest.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-black text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
