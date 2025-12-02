import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Política de Privacidade - YbyBid",
  description: "Política de Privacidade do YbyBid em conformidade com a LGPD (Lei Geral de Proteção de Dados)",
};

export default function PrivacidadePage() {
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
              <Shield className="w-6 h-6 text-petrol" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Política de Privacidade
              </h1>
              <p className="text-muted-foreground mt-1">
                Última atualização: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              A presente Política de Privacidade descreve como a <strong className="text-foreground">YbyBid</strong> 
              ("nós", "nosso" ou "empresa") coleta, usa, armazena e protege suas informações pessoais quando você utiliza 
              nossa plataforma de agregação de leilões de veículos.
            </p>
            <p>
              Esta política está em conformidade com a <strong className="text-foreground">Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>, 
              o Marco Civil da Internet (Lei nº 12.965/2014) e o Código de Defesa do Consumidor (Lei nº 8.078/1990).
            </p>
            <p>
              Ao utilizar nossos serviços, você concorda com a coleta e uso de informações de acordo com esta política. 
              Se você não concordar com esta política, por favor, não utilize nossos serviços.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>2. Dados que Coletamos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <div>
              <h3 className="font-semibold text-foreground mb-2">2.1. Dados Pessoais Fornecidos por Você</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong className="text-foreground">Dados de identificação:</strong> Nome completo, CPF (quando necessário), data de nascimento</li>
                <li><strong className="text-foreground">Dados de contato:</strong> Endereço de e-mail, número de telefone</li>
                <li><strong className="text-foreground">Dados de autenticação:</strong> Senha (criptografada), informações de conta</li>
                <li><strong className="text-foreground">Dados de pagamento:</strong> Informações de cartão de crédito (processadas por provedores terceirizados como Stripe)</li>
                <li><strong className="text-foreground">Dados de perfil:</strong> Preferências de busca, veículos favoritos, histórico de pesquisas</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">2.2. Dados Coletados Automaticamente</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong className="text-foreground">Dados de navegação:</strong> Endereço IP, tipo de navegador, páginas visitadas, tempo de permanência</li>
                <li><strong className="text-foreground">Dados de dispositivo:</strong> Tipo de dispositivo, sistema operacional, identificadores únicos</li>
                <li><strong className="text-foreground">Dados de localização:</strong> Dados de geolocalização (quando autorizado)</li>
                <li><strong className="text-foreground">Cookies e tecnologias similares:</strong> Para melhorar sua experiência e análise de uso</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">2.3. Dados de Terceiros</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Dados de autenticação social (Google OAuth) - quando você opta por fazer login com Google</li>
                <li>Dados de serviços de pagamento (Stripe) - para processamento de transações</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>3. Como Utilizamos Seus Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-foreground">Prestação de serviços:</strong> Fornecer acesso à plataforma, realizar buscas, salvar favoritos, enviar notificações</li>
              <li><strong className="text-foreground">Melhoria da experiência:</strong> Personalizar conteúdo, melhorar funcionalidades, desenvolver novos recursos</li>
              <li><strong className="text-foreground">Comunicação:</strong> Enviar informações sobre sua conta, notificações de leilões, alertas personalizados</li>
              <li><strong className="text-foreground">Processamento de pagamentos:</strong> Processar assinaturas e pagamentos de forma segura</li>
              <li><strong className="text-foreground">Segurança:</strong> Prevenir fraudes, proteger contra atividades ilegais, garantir segurança da plataforma</li>
              <li><strong className="text-foreground">Cumprimento legal:</strong> Atender obrigações legais, responder a solicitações judiciais</li>
              <li><strong className="text-foreground">Análise e pesquisa:</strong> Realizar análises estatísticas (dados anonimizados), melhorar nossos serviços</li>
            </ul>
            <p className="mt-4">
              <strong className="text-foreground">Base legal para o tratamento (conforme LGPD):</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Execução de contrato ou procedimentos preliminares</li>
              <li>Cumprimento de obrigação legal ou regulatória</li>
              <li>Legítimo interesse (para segurança e melhoria dos serviços)</li>
              <li>Consentimento do titular (quando aplicável)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>4. Compartilhamento de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>Não vendemos seus dados pessoais. Podemos compartilhar seus dados apenas nas seguintes situações:</p>
            <div>
              <h3 className="font-semibold text-foreground mb-2">4.1. Prestadores de Serviços</h3>
              <p>Compartilhamos dados com prestadores de serviços que nos auxiliam na operação:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong className="text-foreground">Supabase:</strong> Hospedagem e gestão do banco de dados</li>
                <li><strong className="text-foreground">Stripe:</strong> Processamento de pagamentos</li>
                <li><strong className="text-foreground">Vercel:</strong> Hospedagem da plataforma</li>
                <li><strong className="text-foreground">Upstash:</strong> Serviços de cache</li>
                <li><strong className="text-foreground">Serviços de e-mail:</strong> Para envio de notificações</li>
              </ul>
              <p className="mt-2">
                Todos os prestadores de serviços são obrigados a manter a confidencialidade e segurança dos dados, 
                em conformidade com esta política e a LGPD.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">4.2. Requisitos Legais</h3>
              <p>
                Podemos divulgar dados quando exigido por lei, ordem judicial, processo legal, ou para:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Cumprir obrigações legais</li>
                <li>Proteger direitos, propriedade ou segurança nossa, de nossos usuários ou terceiros</li>
                <li>Prevenir ou investigar atividades fraudulentas ou ilegais</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">4.3. Transferências de Negócio</h3>
              <p>
                Em caso de fusão, aquisição ou venda de ativos, seus dados podem ser transferidos, 
                mas continuarão sujeitos a esta política de privacidade.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>5. Segurança dos Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra 
              acesso não autorizado, alteração, divulgação ou destruição, incluindo:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Criptografia de dados em trânsito (HTTPS/TLS) e em repouso</li>
              <li>Controles de acesso baseados em função e autenticação de dois fatores</li>
              <li>Monitoramento e auditoria regular de sistemas</li>
              <li>Backups regulares e planos de recuperação de desastres</li>
              <li>Treinamento regular de funcionários sobre segurança de dados</li>
              <li>Conformidade com padrões internacionais de segurança (ISO 27001, quando aplicável)</li>
            </ul>
            <p className="mt-4">
              <strong className="text-foreground">Importante:</strong> Nenhum método de transmissão pela Internet 
              ou método de armazenamento eletrônico é 100% seguro. Embora nos esforcemos para usar meios comercialmente 
              aceitáveis para proteger seus dados, não podemos garantir segurança absoluta.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>6. Retenção de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir as finalidades descritas nesta 
              política, exceto quando um período de retenção mais longo for exigido ou permitido por lei.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-foreground">Dados de conta:</strong> Até que você solicite exclusão ou após 2 anos de inatividade</li>
              <li><strong className="text-foreground">Dados de transações:</strong> Conforme exigido por lei (geralmente 5 anos para fins fiscais)</li>
              <li><strong className="text-foreground">Dados de navegação:</strong> Até 24 meses, após os quais são anonimizados</li>
              <li><strong className="text-foreground">Dados de marketing:</strong> Até você retirar seu consentimento</li>
            </ul>
            <p>
              Após o período de retenção, os dados serão excluídos ou anonimizados de forma segura e irreversível.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>7. Seus Direitos (LGPD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Conforme a Lei Geral de Proteção de Dados, você possui os seguintes direitos sobre seus dados pessoais:
            </p>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-foreground mb-1">7.1. Confirmação e Acesso</h3>
                <p>Direito de saber se tratamos seus dados e obter acesso a eles.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">7.2. Correção</h3>
                <p>Direito de solicitar correção de dados incompletos, inexatos ou desatualizados.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">7.3. Anonimização, Bloqueio ou Eliminação</h3>
                <p>Direito de solicitar anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">7.4. Portabilidade</h3>
                <p>Direito de solicitar a portabilidade de seus dados para outro prestador de serviços.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">7.5. Eliminação</h3>
                <p>Direito de solicitar a eliminação dos dados pessoais tratados com seu consentimento.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">7.6. Informação sobre Compartilhamento</h3>
                <p>Direito de obter informações sobre entidades públicas e privadas com as quais compartilhamos dados.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">7.7. Revogação do Consentimento</h3>
                <p>Direito de revogar seu consentimento a qualquer momento.</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">7.8. Oposição</h3>
                <p>Direito de se opor ao tratamento de dados quando baseado em legítimo interesse.</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-semibold text-foreground mb-2">Como exercer seus direitos:</p>
              <p>
                Para exercer qualquer um desses direitos, entre em contato conosco através do e-mail:{" "}
                <a href="mailto:privacidade@ybybid.com.br" className="text-signal-orange hover:underline">
                  privacidade@ybybid.com.br
                </a>
              </p>
              <p className="mt-2">
                Responderemos sua solicitação no prazo máximo de <strong>15 dias corridos</strong>, conforme estabelecido pela LGPD.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8. Cookies e Tecnologias Similares</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso da plataforma 
              e personalizar conteúdo. Os tipos de cookies que utilizamos incluem:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-foreground">Cookies essenciais:</strong> Necessários para o funcionamento da plataforma</li>
              <li><strong className="text-foreground">Cookies de funcionalidade:</strong> Permitem funcionalidades como preferências de usuário</li>
              <li><strong className="text-foreground">Cookies analíticos:</strong> Nos ajudam a entender como você usa a plataforma (dados anonimizados)</li>
              <li><strong className="text-foreground">Cookies de marketing:</strong> Utilizados apenas com seu consentimento explícito</li>
            </ul>
            <p>
              Você pode gerenciar suas preferências de cookies através das configurações do seu navegador. 
              Note que desabilitar certos cookies pode afetar a funcionalidade da plataforma.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>9. Menores de Idade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Nossos serviços são destinados a pessoas maiores de 18 anos. Não coletamos intencionalmente dados 
              pessoais de menores de idade sem o consentimento dos pais ou responsáveis legais.
            </p>
            <p>
              Se tomarmos conhecimento de que coletamos dados pessoais de um menor sem o consentimento apropriado, 
              tomaremos medidas para excluir essas informações imediatamente.
            </p>
            <p>
              Se você é pai ou responsável e acredita que seu filho nos forneceu informações pessoais, 
              entre em contato conosco imediatamente.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>10. Alterações nesta Política</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças em nossas 
              práticas ou por outros motivos operacionais, legais ou regulatórios.
            </p>
            <p>
              Notificaremos você sobre alterações significativas por e-mail (para o endereço associado à sua conta) 
              ou através de um aviso destacado em nossa plataforma.
            </p>
            <p>
              Recomendamos que você revise esta política periodicamente. A data da "Última atualização" no topo desta 
              página indica quando a política foi revisada pela última vez.
            </p>
            <p>
              <strong className="text-foreground">Alterações materiais:</strong> Se fizermos alterações materiais que 
              afetem seus direitos, solicitaremos seu consentimento novamente quando exigido por lei.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>11. Encarregado de Dados (DPO)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Conforme a LGPD, designamos um Encarregado de Dados (Data Protection Officer - DPO) responsável por 
              receber comunicações dos titulares e da Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="font-semibold text-foreground mb-2">Contato do Encarregado de Dados:</p>
              <p>
                <strong>E-mail:</strong>{" "}
                <a href="mailto:dpo@ybybid.com.br" className="text-signal-orange hover:underline">
                  dpo@ybybid.com.br
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>12. Autoridade Nacional de Proteção de Dados (ANPD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Você tem o direito de apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) caso 
              acredite que o tratamento de seus dados pessoais viola a LGPD.
            </p>
            <p>
              <strong>Site da ANPD:</strong>{" "}
              <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-signal-orange hover:underline">
                www.gov.br/anpd
              </a>
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>13. Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Se você tiver dúvidas, preocupações ou solicitações relacionadas a esta Política de Privacidade ou ao 
              tratamento de seus dados pessoais, entre em contato conosco:
            </p>
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <p>
                <strong className="text-foreground">YbyBid</strong>
              </p>
              <p>
                <strong>E-mail de Privacidade:</strong>{" "}
                <a href="mailto:privacidade@ybybid.com.br" className="text-signal-orange hover:underline">
                  privacidade@ybybid.com.br
                </a>
              </p>
              <p>
                <strong>E-mail do DPO:</strong>{" "}
                <a href="mailto:dpo@ybybid.com.br" className="text-signal-orange hover:underline">
                  dpo@ybybid.com.br
                </a>
              </p>
              <p>
                <strong>E-mail Geral:</strong>{" "}
                <a href="mailto:contato@ybybid.com.br" className="text-signal-orange hover:underline">
                  contato@ybybid.com.br
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para Home
            </Button>
          </Link>
          <Link href="/termos">
            <Button>
              Ver Termos de Serviço
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

