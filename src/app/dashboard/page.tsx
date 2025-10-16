import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Bell, TrendingUp, Car, Search } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Verificar se o usuário está autenticado
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/entrar');
  }

  // Buscar estatísticas do usuário
  const { data: favorites } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id);

  const { data: alerts } = await supabase
    .from('search_alerts')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const favoritesCount = favorites?.length || 0;
  const alertsCount = alerts?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Bem-vindo, {user.user_metadata?.full_name || user.email?.split('@')[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            Gerencie seus leilões favoritos e alertas em um só lugar
          </p>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Favoritos
              </CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{favoritesCount}</div>
              <p className="text-xs text-muted-foreground">
                Veículos salvos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Alertas Ativos
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alertsCount}</div>
              <p className="text-xs text-muted-foreground">
                Notificações configuradas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Buscas Restantes
              </CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">
                Grátis este mês
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ações Rápidas */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Buscar Veículos
              </CardTitle>
              <CardDescription>
                Encontre as melhores oportunidades em leilões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/buscar">
                  <Search className="mr-2 h-4 w-4" />
                  Iniciar Busca
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Pesquise por marca, modelo ou localização
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Melhores Ofertas
              </CardTitle>
              <CardDescription>
                Veículos com maior desconto FIPE hoje
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/buscar?orderBy=deal_score">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Ver Ofertas
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                Classificados por deal score
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Seção de Favoritos */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Meus Favoritos
            </CardTitle>
            <CardDescription>
              {favoritesCount > 0 
                ? `Você tem ${favoritesCount} veículo(s) salvo(s)`
                : 'Você ainda não tem favoritos'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {favoritesCount === 0 ? (
              <div className="text-center py-8">
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Comece salvando veículos que você gosta
                </p>
                <Button asChild>
                  <Link href="/buscar">
                    Buscar Veículos
                  </Link>
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/favoritos">
                  Ver Todos os Favoritos
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* CTA Upgrade */}
        <Card className="mt-6 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
          <CardHeader>
            <CardTitle>🚀 Upgrade para Premium</CardTitle>
            <CardDescription>
              Desbloqueie buscas ilimitadas e recursos exclusivos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                ✅ Buscas ilimitadas
              </li>
              <li className="flex items-center gap-2">
                ✅ Alertas automáticos por email
              </li>
              <li className="flex items-center gap-2">
                ✅ Análise detalhada FIPE
              </li>
              <li className="flex items-center gap-2">
                ✅ Suporte prioritário
              </li>
            </ul>
            <Button asChild className="w-full">
              <Link href="/planos">
                Ver Planos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


