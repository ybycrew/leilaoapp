"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { 
  Car, 
  Search, 
  TrendingDown, 
  Shield, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Star,
  AlertCircle,
  Users,
  Target,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { ProtectedSearchAutocomplete } from "@/components/ProtectedSearchAutocomplete";
import { HomepageAuthHandler } from "@/components/HomepageAuthHandler";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <HomepageAuthHandler />
      
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-8 w-8 text-signal-orange" />
            <h1 className="text-2xl font-bold text-foreground font-heading">YBYBID</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#como-funciona" className="text-sm text-foreground hover:text-signal-orange transition-colors">
              Como Funciona
            </Link>
            <Link href="/#planos" className="text-sm text-foreground hover:text-signal-orange transition-colors">
              Planos
            </Link>
            <Link href="/entrar" className="text-sm text-foreground hover:text-signal-orange transition-colors">
              Entrar
            </Link>
            <Button 
              asChild
              className="bg-signal-orange hover:bg-signal-orange/90 text-white"
            >
              <Link href="/registrar">Começar Grátis</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* 1. HEADLINE (Hook) - Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-petrol/10 via-transparent to-petrol/5" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <Badge 
              variant="outline" 
              className="mb-6 border-signal-orange text-signal-orange bg-signal-orange/10"
            >
              <Sparkles className="w-3 h-3 mr-2" />
              Novos leilões adicionados diariamente
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              <span className="text-foreground block">Encontre o Carro dos Seus</span>
              <span className="text-signal-orange block">Sonhos por Metade do Preço</span>
            </h1>
            
            {/* 2. SUBHEADLINE */}
            <p className="text-xl md:text-2xl text-foreground/90 mb-4 font-medium max-w-2xl mx-auto">
              Todos os leilões do Brasil em um só lugar. Economia de tempo e dinheiro, sem garimpo, sem risco.
            </p>
            
            <p className="text-lg text-foreground/70 mb-10 max-w-xl mx-auto">
              Sistema inteligente compara com a FIPE, pontua cada oferta e te mostra exatamente quais veículos valem a pena. 
              <span className="text-approval-green font-semibold"> Você não procura — você escolhe.</span>
            </p>

            {/* CTAs Primárias */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button 
                asChild
                size="lg"
                className="bg-signal-orange hover:bg-signal-orange/90 text-white text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all"
              >
                <Link href="/buscar">
                  Quero Começar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              
              <Button 
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-foreground text-foreground hover:bg-foreground hover:text-background text-lg px-8 py-6 h-auto"
              >
                <Link href="/#como-funciona">
                  Quero Entender Melhor
                </Link>
              </Button>
            </div>

            <p className="text-sm text-foreground/60">
              🎁 <strong className="text-foreground">Primeiras 5 buscas grátis.</strong> Sem cartão de crédito.
            </p>
          </div>
        </div>
      </section>

      {/* 3. BLOCOS DE VALOR */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Transforme Como Você Compra Veículos
            </h2>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              De horas de pesquisa frustrada para minutos de decisão assertiva
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-border bg-card/50 hover:border-signal-orange transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-petrol/20 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-petrol" />
                </div>
                <CardTitle className="text-foreground">Economia de Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-foreground/80">
                  Horas de pesquisa em dezenas de sites reduzidas a <strong className="text-foreground">menos de 2 minutos</strong>. 
                  Navegue por todos os leiloeiros do Brasil sem sair da plataforma.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 hover:border-signal-orange transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-approval-green/20 flex items-center justify-center mb-4">
                  <TrendingDown className="w-6 h-6 text-approval-green" />
                </div>
                <CardTitle className="text-foreground">Inteligência de Preços</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-foreground/80">
                  Sistema calcula automaticamente o <strong className="text-foreground">Deal Score (0-100)</strong> 
                  comparando com FIPE. Veja quais ofertas são realmente boas antes de dar seu lance.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 hover:border-signal-orange transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-petrol/20 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-petrol" />
                </div>
                <CardTitle className="text-foreground">Transparência Total</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-foreground/80">
                  Veja desconto em relação à FIPE, histórico completo, fotos e informações detalhadas. 
                  <strong className="text-foreground"> Decida com segurança.</strong>
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50 hover:border-signal-orange transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-signal-orange/20 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-signal-orange" />
                </div>
                <CardTitle className="text-foreground">Filtros Poderosos</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-foreground/80">
                  Mais de <strong className="text-foreground">12 critérios de busca</strong>: estado, cidade, 
                  preço, KM, ano, tipo de leilão, financiamento. Encontre exatamente o que procura.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. EXPLICAÇÃO VISUAL - Como Funciona */}
      <section id="como-funciona" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Como Funciona: Simples Como 1, 2, 3
            </h2>
            <p className="text-lg text-foreground/70">
              Em minutos, você já pode estar dando seu primeiro lance com segurança
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Passo 1 */}
              <div className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-signal-orange text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                    1
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-petrol/20 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-petrol" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Busque e Filtre</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    Digite o que procura ou use nossos <strong className="text-foreground">filtros avançados</strong>. 
                    Estado, cidade, tipo, preço, KM, ano — você escolhe.
                  </p>
                </div>
                <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-signal-orange transform translate-x-4" />
              </div>

              {/* Passo 2 */}
              <div className="relative">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-signal-orange text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                    2
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-approval-green/20 flex items-center justify-center mx-auto mb-4">
                    <TrendingDown className="w-6 h-6 text-approval-green" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">Analise os Resultados</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    Veja o <strong className="text-foreground">Deal Score</strong> de cada veículo, 
                    comparação com FIPE, desconto real e todas as informações necessárias.
                  </p>
                </div>
                <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-signal-orange transform translate-x-4" />
              </div>

              {/* Passo 3 */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-signal-orange text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  3
                </div>
                <div className="w-12 h-12 rounded-lg bg-petrol/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-6 h-6 text-petrol" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Dê Seu Lance</h3>
                <p className="text-foreground/70 leading-relaxed">
                  Clique no veículo escolhido e seja direcionado ao <strong className="text-foreground">site do leiloeiro</strong>. 
                  Finalize sua compra com todas as informações necessárias.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Button 
              asChild
              size="lg"
              className="bg-signal-orange hover:bg-signal-orange/90 text-white"
            >
              <Link href="/buscar">
                Começar Minha Busca Agora
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 5. PROVA SOCIAL - Depoimentos */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              O Que Nossos Usuários Dizem
            </h2>
            <p className="text-lg text-foreground/70">
              Histórias reais de quem já transformou sua forma de comprar veículos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="border-border bg-card/50">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-signal-orange text-signal-orange" />
                  ))}
                </div>
                <CardDescription className="text-foreground/80 italic">
                  "Eu passava horas visitando site por site. Agora encontro tudo em menos de 5 minutos. 
                  Comprei um Corolla 2019 por 45% abaixo da FIPE. A plataforma pagou por si só no primeiro uso."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-foreground">Carlos M., São Paulo</p>
                <p className="text-sm text-foreground/60">Revendedor</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-signal-orange text-signal-orange" />
                  ))}
                </div>
                <CardDescription className="text-foreground/80 italic">
                  "O Deal Score mudou tudo. Antes, eu não sabia se estava fazendo um bom negócio. 
                  Agora, vejo na hora quais veículos realmente valem a pena. Economizei mais de R$ 15 mil no primeiro mês."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-foreground">Ana P., Rio de Janeiro</p>
                <p className="text-sm text-foreground/60">Empresária</p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-signal-orange text-signal-orange" />
                  ))}
                </div>
                <CardDescription className="text-foreground/80 italic">
                  "Precisava de uma van para minha empresa. Em uma semana encontrei exatamente o que procurava, 
                  com 38% de desconto na FIPE. A comparação automática com a tabela FIPE foi essencial."
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-foreground">Roberto S., Belo Horizonte</p>
                <p className="text-sm text-foreground/60">Pequeno Empresário</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 7. OFERTA IRRESISTÍVEL - Alex Hormozi Style */}
      <section className="py-20 bg-gradient-to-br from-petrol/20 via-signal-orange/10 to-petrol/20 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-signal-orange bg-card shadow-2xl">
              <CardHeader className="text-center pb-4">
                <Badge className="mb-4 bg-signal-orange text-white w-fit mx-auto">
                  OFERTA ESPECIAL
                </Badge>
                <CardTitle className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Acesso Completo Agora + Bônus Exclusivos
                </CardTitle>
                <CardDescription className="text-lg text-foreground/80">
                  Empilhamos tanto valor que você não consegue dizer não
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Valor Principal */}
                <div className="bg-petrol/10 rounded-lg p-6 border border-petrol/20">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-approval-green flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-lg text-foreground mb-2">
                        Plano Premium - R$ 119/mês
                      </h3>
                      <ul className="space-y-2 text-foreground/80">
                        <li>• Buscas ilimitadas em todos os leiloeiros</li>
                        <li>• Deal Score em tempo real para cada veículo</li>
                        <li>• Comparação automática com tabela FIPE</li>
                        <li>• Filtros avançados (12+ critérios)</li>
                        <li>• Alertas personalizados por email (em breve)</li>
                        <li>• Dashboard completo com histórico</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Bônus 1 */}
                <div className="bg-signal-orange/10 rounded-lg p-6 border border-signal-orange/20">
                  <div className="flex items-start gap-4">
                    <Sparkles className="w-6 h-6 text-signal-orange flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-lg text-foreground mb-2">
                        Bônus #1: Guia Completo de Leilões (Valor: R$ 97)
                      </h3>
                      <p className="text-foreground/80">
                        E-book com estratégias avançadas para leilões, dicas de documentação, 
                        como analisar laudos e muito mais. <strong className="text-foreground">SEU HOJE.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bônus 2 */}
                <div className="bg-approval-green/10 rounded-lg p-6 border border-approval-green/20">
                  <div className="flex items-start gap-4">
                    <Users className="w-6 h-6 text-approval-green flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-lg text-foreground mb-2">
                        Bônus #2: Suporte VIP Prioritário (Valor: R$ 147)
                      </h3>
                      <p className="text-foreground/80">
                        Acesso direto ao nosso time via email prioritário. Respostas em até 2 horas úteis. 
                        <strong className="text-foreground"> SEMPRE.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bônus 3 */}
                <div className="bg-petrol/10 rounded-lg p-6 border border-petrol/20">
                  <div className="flex items-start gap-4">
                    <Target className="w-6 h-6 text-petrol flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-lg text-foreground mb-2">
                        Bônus #3: 7 Dias Grátis Para Testar (Valor: R$ 28)
                      </h3>
                      <p className="text-foreground/80">
                        Experimente tudo sem compromisso. Cancele a qualquer momento nos primeiros 7 dias 
                        e não pague nada. <strong className="text-foreground">GARANTIDO.</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Valor Total */}
                <div className="bg-gradient-to-r from-signal-orange to-petrol rounded-lg p-6 text-white text-center">
                  <p className="text-sm mb-2 opacity-90">Valor Total do Pacote</p>
                  <p className="text-4xl font-bold mb-2">R$ 391</p>
                  <p className="text-lg mb-4">Você paga apenas:</p>
                  <p className="text-5xl font-bold mb-4">R$ 119/mês</p>
                  <p className="text-sm opacity-90">Economia de 70% no primeiro mês</p>
                </div>

                {/* Garantia */}
                <div className="bg-approval-green/10 rounded-lg p-6 border-2 border-approval-green text-center">
                  <Shield className="w-12 h-12 text-approval-green mx-auto mb-3" />
                  <h3 className="font-bold text-xl text-foreground mb-2">
                    Garantia de 7 Dias ou Seu Dinheiro de Volta
                  </h3>
                  <p className="text-foreground/80">
                    Se não ficar satisfeito nos primeiros 7 dias, devolvemos 100% do seu dinheiro. 
                    Sem perguntas, sem complicação.
                  </p>
                </div>

                {/* CTA Principal */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    asChild
                    size="lg"
                    className="flex-1 bg-signal-orange hover:bg-signal-orange/90 text-white text-lg py-6 h-auto"
                  >
                    <Link href="/planos">
                      Quero Meu Acesso Completo Agora
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                  </Button>
                  
                  <Button 
                    asChild
                    variant="outline"
                    size="lg"
                    className="flex-1 border-2 border-foreground text-foreground hover:bg-foreground hover:text-background text-lg py-6 h-auto"
                  >
                    <Link href="/#faq">
                      Ainda Tenho Dúvidas
                    </Link>
                  </Button>
                </div>

                {/* Escassez */}
                <div className="text-center text-sm text-foreground/60">
                  <p>⚡ <strong className="text-foreground">Últimas horas:</strong> Os bônus são limitados às primeiras 100 assinaturas.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 8. SEÇÃO DE OBJEÇÕES */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Quebrando Objeções Comuns
            </h2>
            <p className="text-lg text-foreground/70">
              Respondemos as principais preocupações antes que você tenha que perguntar
            </p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
            <Card className="border-border bg-card/50">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-signal-orange/20 flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-signal-orange" />
                </div>
                <CardTitle className="text-foreground">É Seguro?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-foreground/80">
                  <strong className="text-foreground">100% seguro.</strong> Somos apenas um agregador de informações. 
                  Você compra diretamente no site do leiloeiro oficial. Nós apenas te ajudamos a encontrar 
                  as melhores oportunidades com dados precisos e atualizados.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-petrol/20 flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-petrol" />
                </div>
                <CardTitle className="text-foreground">É Burocrático?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-foreground/80">
                  <strong className="text-foreground">Nada de burocracia.</strong> Criar conta leva 30 segundos. 
                  Comece com 5 buscas grátis, sem cartão. Só assine se realmente encontrar valor. 
                  Cancele a qualquer momento, sem multa ou complicação.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border bg-card/50">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-approval-green/20 flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-approval-green" />
                </div>
                <CardTitle className="text-foreground">Posso Confiar?</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-foreground/80">
                  <strong className="text-foreground">Dados diretos dos leiloeiros.</strong> Nosso sistema apenas 
                  organiza e analisa informações públicas. Não alteramos nada. 
                  Além disso, oferecemos <strong className="text-foreground">garantia de 7 dias</strong> ou seu dinheiro de volta.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 9. SOBRE NÓS - Simon Sinek Style */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Por Que Fazemos Isso
            </h2>
            
            <div className="space-y-6 text-lg text-foreground/80 leading-relaxed">
              <p>
                <strong className="text-foreground text-xl">Nós acreditamos</strong> que comprar um veículo 
                não deveria ser um processo frustrante de navegar por dezenas de sites, comparar preços manualmente 
                e perder oportunidades por falta de informação.
              </p>
              
              <p>
                <strong className="text-foreground">Nosso propósito</strong> é democratizar o acesso aos leilões, 
                tornando esse mercado transparente e acessível para todos. Enquanto todo mundo tenta descobrir 
                onde estão os carros baratos, a <strong className="text-signal-orange">YBYBID</strong> já sabe.
              </p>
              
              <p>
                <strong className="text-foreground">Como fazemos:</strong> Tecnologia de ponta que vasculha o 
                mercado invisível, coleta dados de todos os leiloeiros, compara automaticamente com a FIPE e 
                te entrega só o que vale a pena. Você não procura — você escolhe.
              </p>
              
              <p className="text-xl font-semibold text-signal-orange mt-8">
                O melhor lance começa com informação certa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <section id="faq" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-lg text-foreground/70">
              Tudo que você precisa saber sobre a YBYBID
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion>
              <AccordionItem title="Como funciona o Deal Score?">
                O Deal Score é uma nota de 0 a 100 que calculamos automaticamente para cada veículo, 
                considerando desconto em relação à FIPE, ano, quilometragem, tipo de leilão e disponibilidade 
                de financiamento. Quanto maior a nota, melhor o negócio. Veículos acima de 80 são considerados 
                excelentes negócios.
              </AccordionItem>

              <AccordionItem title="Preciso pagar para começar?">
                Não! Oferecemos 5 buscas completamente grátis para você testar a plataforma. 
                Sem cartão de crédito, sem compromisso. Se gostar e quiser buscar mais, pode assinar 
                um dos nossos planos a partir de R$ 119/mês.
              </AccordionItem>

              <AccordionItem title="Os dados são atualizados em tempo real?">
                Atualizamos nosso banco de dados a cada 6-12 horas, varrendo todos os principais leiloeiros 
                do Brasil. Isso garante que você tenha acesso às ofertas mais recentes sem precisar verificar 
                cada site manualmente.
              </AccordionItem>

              <AccordionItem title="Posso comprar direto pela plataforma?">
                Não. A YBYBID é um agregador de informações. Você visualiza os veículos, compara preços, 
                analisa o Deal Score, e quando encontrar o que procura, clica para ser direcionado ao site 
                oficial do leiloeiro, onde a compra é finalizada.
              </AccordionItem>

              <AccordionItem title="E se eu não ficar satisfeito?">
                Oferecemos garantia de 7 dias ou seu dinheiro de volta. Se não ficar satisfeito por qualquer 
                motivo, basta entrar em contato e devolvemos 100% do valor pago, sem perguntas.
              </AccordionItem>

              <AccordionItem title="Quantos leiloeiros estão integrados?">
                Atualmente integramos os principais leiloeiros do Brasil, cobrindo mais de 80% do mercado. 
                Estamos constantemente adicionando novos parceiros para garantir que você tenha acesso ao 
                máximo de oportunidades possível.
              </AccordionItem>
            </Accordion>
          </div>

          <div className="mt-12 text-center">
            <p className="text-foreground/70 mb-4">Ainda tem dúvidas?</p>
            <Button 
              asChild
              variant="outline"
              className="border-2 border-foreground text-foreground hover:bg-foreground hover:text-background"
            >
              <Link href="/contato">
                Fale Conosco
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-petrol to-petrol/90 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Pronto Para Encontrar Seu Próximo Veículo?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Junte-se a centenas de pessoas que já transformaram como compram veículos
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                asChild
                size="lg"
                className="bg-signal-orange hover:bg-signal-orange/90 text-white text-lg px-8 py-6 h-auto"
              >
                <Link href="/buscar">
                  Começar Minhas 5 Buscas Grátis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              
              <Button 
                asChild
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-petrol text-lg px-8 py-6 h-auto"
              >
                <Link href="/planos">
                  Ver Planos e Preços
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Car className="h-6 w-6 text-signal-orange" />
                <span className="font-bold text-foreground text-lg">YBYBID</span>
              </div>
              <p className="text-sm text-foreground/70">
                O jeito mais inteligente de encontrar veículos em leilão no Brasil.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li><Link href="/#como-funciona" className="hover:text-signal-orange transition-colors">Como Funciona</Link></li>
                <li><Link href="/#planos" className="hover:text-signal-orange transition-colors">Planos</Link></li>
                <li><Link href="/buscar" className="hover:text-signal-orange transition-colors">Buscar Veículos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li><Link href="/#faq" className="hover:text-signal-orange transition-colors">FAQ</Link></li>
                <li><Link href="/contato" className="hover:text-signal-orange transition-colors">Contato</Link></li>
                <li><Link href="/ajuda" className="hover:text-signal-orange transition-colors">Central de Ajuda</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-foreground/70">
                <li><Link href="/termos" className="hover:text-signal-orange transition-colors">Termos de Uso</Link></li>
                <li><Link href="/privacidade" className="hover:text-signal-orange transition-colors">Privacidade</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-foreground/60">
            <p>© 2025 YBYBID. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
