import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Termos de Serviço - YbyBid",
  description: "Termos de Serviço e Condições de Uso do YbyBid",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo/logo.svg"
              alt="YBYBID Logo"
              width={150}
              height={45}
              className="h-10 w-auto"
              priority
            />
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-petrol/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-petrol" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Termos de Serviço
              </h1>
              <p className="text-muted-foreground mt-1">
                Última atualização: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Aceitação dos Termos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Estes Termos de Serviço ("Termos") regem o uso da plataforma <strong className="text-foreground">YbyBid</strong> 
              ("Plataforma", "Serviço", "nós", "nosso" ou "empresa"), operada por nossa empresa, e estabelecem os direitos e 
              obrigações entre você ("Usuário", "você" ou "seu") e a YbyBid.
            </p>
            <p>
              Ao acessar ou utilizar a Plataforma, você concorda em ficar vinculado a estes Termos. Se você não concordar com 
              qualquer parte destes Termos, não deve utilizar nossos serviços.
            </p>
            <p>
              Estes Termos estão em conformidade com a legislação brasileira, incluindo o Código de Defesa do Consumidor 
              (Lei nº 8.078/1990), o Marco Civil da Internet (Lei nº 12.965/2014) e a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Descrição do Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A YbyBid é uma plataforma de agregação que centraliza informações sobre leilões de veículos de diversos leiloeiros 
              do Brasil. Nossa Plataforma permite que você:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Pesquisar e filtrar veículos disponíveis em leilões</li>
              <li>Comparar preços com a tabela FIPE</li>
              <li>Visualizar informações sobre veículos leiloados</li>
              <li>Salvar veículos favoritos</li>
              <li>Receber alertas sobre novos leilões (conforme plano contratado)</li>
              <li>Acessar informações sobre deal score (pontuação de negócio)</li>
            </ul>
            <p className="mt-4">
              <strong className="text-foreground">Importante:</strong> A YbyBid é uma plataforma informativa e agregadora. 
              Não somos responsáveis pela realização dos leilões, pela venda de veículos ou pela garantia da qualidade, 
              autenticidade ou legalidade dos veículos anunciados. Todas as transações de compra são realizadas diretamente 
              com os leiloeiros responsáveis pelos leilões.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. Cadastro e Conta de Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <div>
              <h3 className="font-semibold text-foreground mb-2">3.1. Requisitos para Cadastro</h3>
              <p>Para utilizar nossos serviços, você deve:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Ser maior de 18 anos ou ter autorização de responsável legal</li>
                <li>Fornecer informações verdadeiras, precisas e completas</li>
                <li>Manter e atualizar suas informações quando necessário</li>
                <li>Manter a segurança de sua conta e senha</li>
                <li>Ser responsável por todas as atividades que ocorram em sua conta</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">3.2. Responsabilidades do Usuário</h3>
              <p>Você é responsável por:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Manter a confidencialidade de suas credenciais de acesso</li>
                <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta</li>
                <li>Garantir que todas as informações fornecidas sejam verdadeiras e atualizadas</li>
                <li>Utilizar a Plataforma apenas para fins legais e de acordo com estes Termos</li>
                <li>Não compartilhar sua conta com terceiros</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">3.3. Encerramento de Conta</h3>
              <p>
                Reservamo-nos o direito de suspender ou encerrar sua conta, a qualquer momento, sem aviso prévio, 
                se violar estes Termos ou se tivermos motivos para acreditar que você está usando a Plataforma de 
                forma fraudulenta ou ilegal.
              </p>
              <p>
                Você pode solicitar o encerramento de sua conta a qualquer momento através das configurações da conta 
                ou entrando em contato conosco.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. Planos e Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <div>
              <h3 className="font-semibold text-foreground mb-2">4.1. Planos Disponíveis</h3>
              <p>Oferecemos os seguintes planos:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong className="text-foreground">Plano Gratuito:</strong> Permite 5 buscas gratuitas. 
                  Ideal para testar a plataforma.
                </li>
                <li>
                  <strong className="text-foreground">Plano Mensal:</strong> R$ 119,00/mês - Buscas ilimitadas 
                  e acesso a todos os recursos.
                </li>
                <li>
                  <strong className="text-foreground">Plano Anual:</strong> R$ 990,00/ano - Buscas ilimitadas, 
                  acesso a todos os recursos e desconto de 30% sobre o plano mensal.
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">4.2. Processamento de Pagamentos</h3>
              <p>
                Os pagamentos são processados de forma segura através do Stripe, nosso provedor de pagamentos. 
                Não armazenamos informações completas de cartão de crédito em nossos servidores.
              </p>
              <p>
                Ao realizar um pagamento, você declara ter autoridade para usar o método de pagamento informado 
                e que os dados fornecidos são verdadeiros e precisos.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">4.3. Renovação Automática</h3>
              <p>
                Planos pagos são renovados automaticamente no final de cada período de cobrança, a menos que você 
                cancele antes da data de renovação. Você será cobrado automaticamente no método de pagamento 
                registrado em sua conta.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">4.4. Cancelamento e Reembolso</h3>
              <p>
                Você pode cancelar sua assinatura a qualquer momento através das configurações da conta. 
                O cancelamento entrará em vigor no final do período de cobrança atual.
              </p>
              <p>
                <strong className="text-foreground">Direito de Arrependimento (CDC):</strong> Conforme o Código de 
                Defesa do Consumidor, você tem direito de se arrepender da compra em até 7 (sete) dias corridos, 
                contados da data da contratação, mediante solicitação por e-mail ou através da plataforma. 
                Neste caso, reembolsaremos o valor pago proporcionalmente.
              </p>
              <p>
                Após o período de arrependimento, não oferecemos reembolsos parciais por períodos não utilizados, 
                exceto quando exigido por lei ou em casos excepcionais a nosso critério.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">4.5. Alterações de Preço</h3>
              <p>
                Reservamo-nos o direito de modificar nossos preços a qualquer momento. Alterações de preço não 
                afetarão assinaturas já pagas durante o período de vigência, mas se aplicarão a renovações futuras. 
                Notificaremos você com antecedência sobre alterações significativas de preço.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Uso Aceitável</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>Você concorda em utilizar a Plataforma apenas para fins legais e de acordo com estes Termos. É proibido:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Usar a Plataforma de forma que viole qualquer lei, regulamento ou direito de terceiros</li>
              <li>Realizar engenharia reversa, descompilar ou desmontar a Plataforma</li>
              <li>Interferir ou interromper o funcionamento da Plataforma ou servidores</li>
              <li>Usar bots, scripts automatizados ou outras formas de acesso não autorizado</li>
              <li>Tentar acessar áreas restritas da Plataforma ou contas de outros usuários</li>
              <li>Copiar, reproduzir, distribuir ou comercializar conteúdo da Plataforma sem autorização</li>
              <li>Usar a Plataforma para transmitir vírus, malware ou código malicioso</li>
              <li>Coletar informações de outros usuários de forma não autorizada</li>
              <li>Usar a Plataforma para atividades fraudulentas ou enganosas</li>
              <li>Violar direitos de propriedade intelectual, incluindo marcas e direitos autorais</li>
            </ul>
            <p className="mt-4">
              A violação de qualquer uma dessas regras pode resultar na suspensão ou encerramento imediato de sua conta, 
              sem direito a reembolso, e poderemos tomar medidas legais apropriadas.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Propriedade Intelectual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A Plataforma, incluindo seu design, funcionalidades, software, textos, gráficos, imagens, logotipos, 
              ícones e outros materiais, são de propriedade da YbyBid ou de seus licenciadores e estão protegidos por 
              leis de propriedade intelectual brasileiras e internacionais.
            </p>
            <p>
              Você recebe uma licença limitada, não exclusiva, não transferível e revogável para acessar e usar a 
              Plataforma apenas para seus fins pessoais e não comerciais, de acordo com estes Termos.
            </p>
            <p>
              Você não pode copiar, modificar, distribuir, vender, alugar, licenciar ou criar obras derivadas da 
              Plataforma sem nossa autorização prévia por escrito.
            </p>
            <p>
              <strong className="text-foreground">Marca YbyBid:</strong> O nome "YbyBid", nosso logotipo e outras 
              marcas comerciais são de nossa propriedade exclusiva. Você não pode usar nossas marcas sem autorização prévia.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Dados e Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <div>
              <h3 className="font-semibold text-foreground mb-2">7.1. Informações sobre Veículos</h3>
              <p>
                As informações sobre veículos apresentadas na Plataforma são coletadas de sites de leiloeiros através 
                de técnicas automatizadas (web scraping) ou fornecidas por terceiros. Embora nos esforcemos para manter 
                as informações atualizadas e precisas, não podemos garantir a exatidão, completude ou atualidade de 
                todas as informações.
              </p>
              <p>
                As informações são atualizadas periodicamente, mas podem não refletir alterações recentes nos sites 
                dos leiloeiros. Recomendamos sempre verificar informações diretamente com o leiloeiro antes de tomar 
                qualquer decisão de compra.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">7.2. Dados do Usuário</h3>
              <p>
                O tratamento de seus dados pessoais é regido por nossa Política de Privacidade, que faz parte integrante 
                destes Termos. Ao utilizar a Plataforma, você concorda com o tratamento de seus dados conforme descrito 
                na Política de Privacidade.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8. Limitação de Responsabilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <div>
              <h3 className="font-semibold text-foreground mb-2">8.1. Natureza do Serviço</h3>
              <p>
                A YbyBid é uma plataforma de informação e agregação. Não somos parte de nenhuma transação de compra e 
                venda de veículos. Todas as transações são realizadas diretamente entre você e os leiloeiros responsáveis 
                pelos leilões.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">8.2. Limitações</h3>
              <p>Não nos responsabilizamos por:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Qualidade, condição, legalidade ou autenticidade dos veículos anunciados</li>
                <li>Precisão, completude ou atualidade das informações sobre veículos</li>
                <li>Disponibilidade ou continuidade dos serviços dos leiloeiros</li>
                <li>Danos diretos, indiretos, incidentais ou consequenciais decorrentes do uso da Plataforma</li>
                <li>Perda de dados, lucros ou oportunidades de negócios</li>
                <li>Interrupções, erros ou falhas técnicas na Plataforma</li>
                <li>Ações ou omissões de leiloeiros terceiros</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">8.3. Responsabilidade Máxima</h3>
              <p>
                Nossa responsabilidade total, em qualquer caso, está limitada ao valor pago por você nos últimos 12 
                meses pelos nossos serviços, conforme permitido pela legislação brasileira aplicável.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">8.4. Exceções Legais</h3>
              <p>
                As limitações acima não se aplicam a danos causados por dolo ou culpa grave de nossa parte, nem quando 
                a lei proibir expressamente a limitação de responsabilidade.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>9. Isenção de Garantias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A Plataforma é fornecida "como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou 
              implícitas. Não garantimos que:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>A Plataforma será ininterrupta, segura ou livre de erros</li>
              <li>Os resultados obtidos serão precisos ou confiáveis</li>
              <li>Os defeitos serão corrigidos</li>
              <li>A Plataforma ou servidor estão livres de vírus ou outros componentes prejudiciais</li>
            </ul>
            <p>
              Você reconhece que o uso da Plataforma é por sua conta e risco. Conforme permitido pela legislação aplicável, 
              renunciamos a todas as garantias, expressas ou implícitas, incluindo garantias de comercialização, adequação 
              a uma finalidade específica e não violação.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>10. Indenização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Você concorda em indenizar, defender e isentar a YbyBid, suas afiliadas, diretores, funcionários e agentes 
              de quaisquer reivindicações, responsabilidades, danos, perdas, custos e despesas (incluindo honorários advocatícios 
              razoáveis) decorrentes de:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Seu uso ou mau uso da Plataforma</li>
              <li>Sua violação destes Termos</li>
              <li>Sua violação de direitos de terceiros</li>
              <li>Qualquer conteúdo ou informação que você forneça através da Plataforma</li>
            </ul>
            <p>
              Reservamo-nos o direito de assumir a defesa exclusiva e o controle de qualquer questão sujeita a indenização 
              por você, caso contrário, você nos auxiliará na defesa de tais questões.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>11. Modificações do Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer aspecto da Plataforma a qualquer momento, 
              com ou sem aviso prévio, incluindo:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Funcionalidades e recursos</li>
              <li>Horários de disponibilidade</li>
              <li>Equipamentos necessários para acesso</li>
            </ul>
            <p>
              Faremos esforços razoáveis para notificar você sobre mudanças significativas que possam afetar seu uso da 
              Plataforma, quando possível.
            </p>
            <p>
              Não seremos responsáveis perante você ou terceiros por qualquer modificação, suspensão ou descontinuação 
              da Plataforma ou de qualquer parte dela.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>12. Alterações dos Termos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Podemos modificar estes Termos periodicamente para refletir mudanças em nossos serviços, práticas comerciais 
              ou por outros motivos operacionais, legais ou regulatórios.
            </p>
            <p>
              Notificaremos você sobre alterações materiais por e-mail (para o endereço associado à sua conta) ou através 
              de um aviso destacado em nossa Plataforma. Alterações materiais entrarão em vigor após 30 (trinta) dias da 
              notificação, a menos que você cancele sua conta antes dessa data.
            </p>
            <p>
              Se você não concordar com as alterações, deve interromper o uso da Plataforma e cancelar sua conta. 
              O uso continuado da Plataforma após a entrada em vigor das alterações constitui aceitação dos Termos revisados.
            </p>
            <p>
              A data da "Última atualização" no topo desta página indica quando os Termos foram revisados pela última vez.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>13. Rescisão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <div>
              <h3 className="font-semibold text-foreground mb-2">13.1. Rescisão por Você</h3>
              <p>
                Você pode encerrar sua conta e deixar de usar a Plataforma a qualquer momento, através das configurações 
                da conta ou entrando em contato conosco.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">13.2. Rescisão por Nós</h3>
              <p>
                Podemos suspender ou encerrar sua conta e acesso à Plataforma imediatamente, sem aviso prévio, se você:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Violar estes Termos ou nossa Política de Privacidade</li>
                <li>Usar a Plataforma de forma fraudulenta ou ilegal</li>
                <li>Não efetuar pagamentos devidos</li>
                <li>Apresentar risco de segurança para outros usuários ou para a Plataforma</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">13.3. Efeitos da Rescisão</h3>
              <p>
                Após a rescisão, seu direito de usar a Plataforma cessará imediatamente. Podemos deletar sua conta e 
                todos os dados associados, conforme nossa Política de Privacidade.
              </p>
              <p>
                As disposições destes Termos que por sua natureza devem sobreviver à rescisão permanecerão em vigor após 
                a rescisão, incluindo disposições sobre propriedade intelectual, limitação de responsabilidade, indenização 
                e lei aplicável.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>14. Lei Aplicável e Foro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Estes Termos são regidos e interpretados de acordo com as leis da República Federativa do Brasil, 
              independentemente de conflitos de disposições legais.
            </p>
            <p>
              Para a solução de controvérsias decorrentes destes Termos, fica eleito o foro da comarca de sua residência, 
              salvo disposição legal imperativa em contrário ou casos onde o Código de Defesa do Consumidor determine o 
              foro do domicílio do consumidor.
            </p>
            <p>
              Antes de recorrer à via judicial, as partes se comprometem a tentar resolver eventuais disputas através de 
              negociação direta ou mediação.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>15. Disposições Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <div>
              <h3 className="font-semibold text-foreground mb-2">15.1. Integridade do Contrato</h3>
              <p>
                Estes Termos, juntamente com nossa Política de Privacidade, constituem o acordo completo entre você e a 
                YbyBid sobre o uso da Plataforma e substituem todos os acordos anteriores.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">15.2. Divisibilidade</h3>
              <p>
                Se qualquer disposição destes Termos for considerada inválida ou inexequível, as demais disposições 
                permanecerão em pleno vigor e efeito.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">15.3. Renúncia</h3>
              <p>
                Nossa falha em exercer ou aplicar qualquer direito ou disposição destes Termos não constitui renúncia 
                a tal direito ou disposição.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">15.4. Cessão</h3>
              <p>
                Você não pode ceder ou transferir estes Termos ou seus direitos e obrigações aqui previstos sem nosso 
                consentimento prévio por escrito. Podemos ceder estes Termos a qualquer momento sem notificação.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">15.5. Notificações</h3>
              <p>
                Podemos enviar notificações para você através do e-mail associado à sua conta ou através de avisos na 
                Plataforma. Você concorda que essas formas de notificação constituem notificação válida e eficaz.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>16. Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Se você tiver dúvidas, preocupações ou reclamações sobre estes Termos de Serviço, entre em contato conosco:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <p>
                <strong className="text-foreground">YbyBid</strong>
              </p>
              <p>
                <strong>E-mail:</strong>{" "}
                <a href="mailto:contato@ybybid.com.br" className="text-signal-orange hover:underline">
                  contato@ybybid.com.br
                </a>
              </p>
              <p>
                <strong>Suporte:</strong>{" "}
                <a href="mailto:suporte@ybybid.com.br" className="text-signal-orange hover:underline">
                  suporte@ybybid.com.br
                </a>
              </p>
            </div>
            <p className="mt-4">
              Para questões relacionadas à privacidade e proteção de dados, consulte nossa Política de Privacidade ou 
              entre em contato com nosso Encarregado de Dados (DPO) em{" "}
              <a href="mailto:dpo@ybybid.com.br" className="text-signal-orange hover:underline">
                dpo@ybybid.com.br
              </a>.
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Home
            </Button>
          </Link>
          <Link href="/privacidade">
            <Button>
              Ver Política de Privacidade
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

