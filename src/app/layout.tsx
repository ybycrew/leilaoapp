import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LeilãoMax - Encontre os Melhores Leilões de Veículos",
  description: "Plataforma que agrega leilões de veículos de todo o Brasil. Compare preços com a tabela FIPE e encontre as melhores oportunidades.",
  keywords: "leilão, veículos, carros, motos, FIPE, preços, Brasil",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
