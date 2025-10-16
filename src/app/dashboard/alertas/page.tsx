import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

export default async function AlertasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/entrar');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Bell className="h-8 w-8 text-primary" />
          Alertas de Busca
        </h1>
        <p className="text-muted-foreground">
          Receba notificações quando novos veículos corresponderem aos seus critérios
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nenhum alerta configurado</CardTitle>
          <CardDescription>
            Crie alertas para ser notificado sobre novas oportunidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bell className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Configure alertas baseados em marca, modelo, preço e localização
            </p>
            <Button disabled>
              Criar Alerta (Em breve)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


