import type { Metadata } from "next";
import { Inter, Space_Grotesk, Anton } from "next/font/google";
import "./globals.css";

// Tipografia YBYBID
const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ["latin"],
  variable: '--font-space-grotesk',
  display: 'swap',
});

// Anton para headlines (substitui Bebas Neue - estilo similar)
const anton = Anton({ 
  weight: '400',
  subsets: ["latin"],
  variable: '--font-bebas',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "YBYBID - O jeito mais inteligente de encontrar veículos em leilão",
  description: "Todos os leilões do Brasil. Um só lugar. Encontre carros abaixo do preço. Sem garimpo, sem risco.",
  keywords: "leilão, veículos, carros, motos, FIPE, preços, Brasil, leilões automotivos, barganhas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${anton.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
