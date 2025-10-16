import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { SubscribeButton } from './SubscribeButton';

interface Plano {
  nome: string;
  preco: number;
  intervalo: string;
  descricao: string;
  features: string[];
  cta: string;
  destaque: boolean;
  economia?: string;
  priceId?: string;
  isFree?: boolean;
}

export default async function PlanosPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const params = await searchParams;
  const planos: Plano[] = [
    {
      nome: 'Gratuito',
      preco: 0,
      intervalo: 'Sempre grátis',
      descricao: 'Perfeito para testar a plataforma',
      features: [
        '5 buscas gratuitas',
        'Filtros básicos',
        'Visualização de veículos',
        'Comparação com FIPE',
        'Deal Score visível',
      ],
      cta: 'Começar Grátis',
      destaque: false,
      isFree: true,
    },
    {
      nome: 'Mensal',
      preco: 119,
      intervalo: 'por mês',
      descricao: 'Para quem busca frequentemente',
      features: [
        'Buscas ilimitadas',
        'Todos os filtros avançados',
        'Sistema de favoritos',
        'Histórico de buscas',
        'Alertas por email',
        'Suporte prioritário',
      ],
      cta: 'Assinar Agora',
      destaque: true,
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY,
    },
    {
      nome: 'Anual',
      preco: 990,
      intervalo: 'por ano',
      descricao: 'Melhor custo-benefício',
      features: [
        'Buscas ilimitadas',
        'Todos os filtros avançados',
        'Sistema de favoritos',
        'Histórico de buscas',
        'Alertas por email',
        'Suporte prioritário',
        'Desconto de 30%',
        'Acesso antecipado a novos recursos',
      ],
      cta: 'Assinar Anual',
      destaque: false,
      economia: 'Economize R$ 438/ano',
      // TODO: Adicionar NEXT_PUBLIC_STRIPE_PRICE_ANNUAL quando criar o produto anual
      priceId: undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">Y</span>
            </div>
            <span className="font-bold text-xl">Ybybid</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/entrar">
              <Button variant="ghost">Entrar</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          {params.canceled && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
              <p className="font-medium">Pagamento cancelado</p>
              <p className="text-sm mt-1">Você pode tentar novamente quando quiser. Sem problemas!</p>
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Escolha o Plano Ideal para Você
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Comece grátis e faça upgrade quando precisar de mais buscas.
            Sem taxas escondidas, cancele quando quiser.
          </p>
        </div>
      </section>

      {/* Planos */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {planos.map((plano) => (
              <Card
                key={plano.nome}
                className={`relative ${
                  plano.destaque
                    ? 'border-primary shadow-xl scale-105'
                    : 'border-gray-200'
                }`}
              >
                {plano.destaque && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plano.nome}</CardTitle>
                  <div className="mb-2">
                    <span className="text-4xl font-bold">
                      {plano.preco === 0 ? 'Grátis' : `R$ ${plano.preco}`}
                    </span>
                    {plano.preco > 0 && (
                      <span className="text-muted-foreground text-sm ml-2">
                        {plano.intervalo}
                      </span>
                    )}
                  </div>
                  {plano.economia && (
                    <p className="text-green-600 font-semibold text-sm">
                      {plano.economia}
                    </p>
                  )}
                  <CardDescription className="mt-2">
                    {plano.descricao}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3">
                    {plano.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <SubscribeButton
                    priceId={plano.priceId}
                    cta={plano.cta}
                    variant={plano.destaque ? 'default' : 'outline'}
                    isFree={plano.isFree}
                  />
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mt-20">
            <h2 className="text-3xl font-bold text-center mb-12">
              Perguntas Frequentes
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Posso cancelar a qualquer momento?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sim! Você pode cancelar sua assinatura a qualquer momento. Não há multas
                    ou taxas de cancelamento. Sua assinatura permanecerá ativa até o fim do
                    período já pago.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Como funciona o plano gratuito?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Com o plano gratuito, você pode fazer até 5 buscas para testar a
                    plataforma. Não é necessário cartão de crédito para começar. Após as 5
                    buscas, você pode fazer upgrade para um plano pago.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Qual a diferença entre o plano mensal e anual?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    O plano anual oferece um desconto de 30% em relação ao mensal. Em vez de
                    pagar R$ 119 por mês (R$ 1.428/ano), você paga apenas R$ 990/ano,
                    economizando R$ 438. Além disso, você tem acesso antecipado a novos
                    recursos.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Quais formas de pagamento são aceitas?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Aceitamos cartões de crédito (Visa, Mastercard, Amex) e PIX. O plano
                    anual pode ser parcelado em até 12x sem juros no cartão de crédito.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Os dados são atualizados?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Sim! Nosso sistema faz scraping automático dos principais leiloeiros do
                    Brasil a cada 6-12 horas, garantindo que você sempre tenha acesso aos
                    leilões mais recentes.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-gray-50">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 Ybybid. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

