import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Car, TrendingDown, Shield, Zap } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">LeilãoMax</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#como-funciona" className="text-sm hover:text-primary">Como Funciona</Link>
            <Link href="/planos" className="text-sm hover:text-primary">Planos</Link>
            <Link href="/login" className="text-sm hover:text-primary">Entrar</Link>
            <Button asChild>
              <Link href="/registro">Começar Grátis</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Encontre os Melhores <span className="text-primary">Leilões de Veículos</span> do Brasil
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Todos os leilões em um só lugar. Compare preços com a tabela FIPE e identifique as melhores oportunidades automaticamente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input 
                  placeholder="Ex: Fiat Uno, Corolla, Honda Civic..." 
                  className="pl-10 h-12"
                />
              </div>
              <Button size="lg" className="h-12">
                Buscar Veículos
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              🎁 Primeiras 5 buscas grátis. Sem cartão de crédito.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="como-funciona" className="py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Por que usar o LeilãoMax?</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Zap className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Economia de Tempo</CardTitle>
                <CardDescription>
                  Pesquise em todos os leiloeiros do Brasil em segundos. Chega de visitar dezenas de sites diferentes.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <TrendingDown className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Melhores Negócios</CardTitle>
                <CardDescription>
                  Sistema inteligente compara com a FIPE e pontua cada veículo de 0 a 100. Identifique oportunidades facilmente.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Transparência Total</CardTitle>
                <CardDescription>
                  Veja desconto em relação à FIPE, histórico do veículo e todas as informações antes de dar seu lance.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Car className="h-6 w-6 text-primary" />
                <span className="font-bold">LeilãoMax</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Encontre os melhores leilões de veículos do Brasil em um só lugar.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/como-funciona">Como Funciona</Link></li>
                <li><Link href="/planos">Planos</Link></li>
                <li><Link href="/leiloeiros">Leiloeiros</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/ajuda">Central de Ajuda</Link></li>
                <li><Link href="/contato">Contato</Link></li>
                <li><Link href="/faq">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/termos">Termos de Uso</Link></li>
                <li><Link href="/privacidade">Privacidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 LeilãoMax. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
