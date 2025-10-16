import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import Link from 'next/link';

export default async function FavoritosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/entrar');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Heart className="h-8 w-8 text-primary" />
          Meus Favoritos
        </h1>
        <p className="text-muted-foreground">
          Gerencie os veículos que você salvou
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nenhum favorito ainda</CardTitle>
          <CardDescription>
            Você ainda não salvou nenhum veículo. Comece a buscar!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Salve veículos que você gosta e acompanhe as atualizações
            </p>
            <Button asChild>
              <Link href="/buscar">
                Buscar Veículos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


