import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function SucessoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
          <CardDescription>
            Sua assinatura foi ativada com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-muted-foreground">
            <p className="mb-2">
              Obrigado por assinar o Ybybid! Sua conta premium foi ativada e você já pode
              aproveitar todos os benefícios.
            </p>
            <p>
              Um email de confirmação foi enviado para você com os detalhes da sua assinatura.
            </p>
          </div>
          
          <div className="space-y-2">
            <Link href="/dashboard" className="block">
              <Button className="w-full" size="lg">
                Ir para o Dashboard
              </Button>
            </Link>
            <Link href="/buscar" className="block">
              <Button variant="outline" className="w-full">
                Começar a Buscar Veículos
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t text-sm text-muted-foreground text-center">
            <p>
              Você pode gerenciar sua assinatura a qualquer momento em{' '}
              <Link href="/dashboard/perfil" className="text-primary hover:underline">
                Configurações
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


