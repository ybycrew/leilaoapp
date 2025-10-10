# leiloes de veiculos

## Project Description
# Documentação do Projeto - Plataforma de Agregação de Leilões de Veículos

## 📝 Descrição do Projeto

**Nome do Projeto:** LeilãoMax (ou o nome que você preferir)

**Descrição Resumida:**
Uma plataforma web que agrega leilões de veículos de todos os leiloeiros do Brasil em um único lugar, permitindo que usuários filtrem, comparem preços com a tabela FIPE e identifiquem os melhores negócios através de um sistema inteligente de pontuação.

---

## 🎯 Descrição Detalhada

### **O Problema**
Atualmente, pessoas interessadas em comprar veículos em leilões precisam:
- Visitar dezenas de sites diferentes de leiloeiros
- Fazer buscas manuais e repetitivas em cada site
- Comparar preços manualmente com a tabela FIPE
- Não conseguem ter uma visão consolidada do mercado de leilões
- Perdem oportunidades por não acompanhar todos os leiloeiros

### **A Solução**
O LeilãoMax é um agregador inteligente que:
- **Centraliza** todos os leilões de veículos do Brasil em uma única plataforma
- **Automatiza** a coleta de dados através de web scraping de todos os sites de leiloeiros
- **Filtra** veículos com precisão usando mais de 12 critérios diferentes
- **Analisa** automaticamente cada veículo comparando com a tabela FIPE
- **Pontua** cada oferta de 0 a 100 para identificar os melhores negócios
- **Direciona** o usuário diretamente para o site do leiloeiro para finalizar a compra

### **Proposta de Valor**
- ⏱️ **Economia de Tempo**: Horas de pesquisa reduzidas a minutos
- 💰 **Melhores Negócios**: Sistema inteligente identifica oportunidades
- 📊 **Transparência**: Comparação automática com preços de mercado (FIPE)
- 🎯 **Precisão**: Filtros avançados encontram exatamente o que você procura
- 📱 **Acessibilidade**: Plataforma responsiva, funciona em qualquer dispositivo

---

## 👥 Público-Alvo

### **Primário:**
- Pessoas físicas buscando veículos com preços abaixo do mercado
- Revendedores de veículos buscando estoque
- Pequenos empresários precisando de veículos comerciais (vans, caminhões)

### **Secundário:**
- Empresas de locação de veículos
- Mecânicos e funileiros buscando veículos para reforma
- Investidores em veículos de leilão

---

## ⚙️ Funcionalidades Principais

### **1. Sistema de Busca e Filtros**
- Filtros por: Estado, Cidade, Tipo de Veículo, Marca, Modelo, Ano, Preço, Tipo de Leilão, Financiamento, KM, Combustível, Câmbio, Cor, Data do Leilão
- Busca por texto livre
- Salvamento de filtros favoritos
- Ordenação por preço, desconto FIPE, data, score

### **2. Comparativo FIPE e Score Inteligente**
- Integração automática com API da tabela FIPE
- Cálculo de deal score (0-100) baseado em: desconto FIPE, ano, KM, tipo de leilão, financiamento
- Indicadores visuais de "Excelente Negócio", "Bom Negócio", "Preço Justo"

### **3. Visualização de Veículos**
- Cards com fotos em alta qualidade
- Galeria de imagens
- Informações completas do veículo
- Link direto para o site do leiloeiro
- Badge de score visual

### **4. Gestão de Usuário**
- Sistema de favoritos
- Histórico de buscas
- Alertas por email (planos pagos)
- Dashboard pessoal

### **5. Sistema de Monetização**
- **Plano Gratuito**: 5 buscas
- **Plano Mensal**: R$ 119/mês - buscas ilimitadas
- **Plano Anual**: R$ 990/ano (12x sem juros) - buscas ilimitadas + benefícios

---

## 🛠️ Stack Tecnológica

### **Frontend**
- Next.js 14+ (App Router)
- React 18+
- Tailwind CSS
- TypeScript
- Shadcn/ui (componentes)

### **Backend**
- Next.js API Routes
- Node.js
- Puppeteer/Playwright (web scraping)

### **Banco de Dados**
- Supabase (PostgreSQL)
- Supabase Auth (autenticação)
- Supabase Storage (imagens)

### **Serviços Externos**
- Vercel (hospedagem e deploy)
- Upstash Redis (cache)
- Stripe ou Mercado Pago (pagamentos)
- SendGrid/Resend (emails)
- API FIPE (preços de veículos)

### **DevOps**
- Vercel Cron Jobs (scraping automatizado)
- GitHub (versionamento)
- VibeCodeDocs (documentação)

---

## 🔄 Fluxo de Funcionamento

### **Fluxo do Sistema (Backend)**
1. Cron job executa a cada 6-12 horas
2. Sistema acessa cada site de leiloeiro
3. Extrai dados dos veículos (scraping)
4. Consulta preço FIPE para cada veículo
5. Calcula deal score automaticamente
6. Otimiza e armazena imagens
7. Salva/atualiza dados no banco Supabase

### **Fluxo do Usuário**
1. Usuário acessa a plataforma
2. Faz login ou cria conta (Supabase Auth)
3. Aplica filtros de busca
4. Sistema verifica limite de buscas do plano
5. Retorna resultados com fotos, score e comparativo FIPE
6. Usuário pode favoritar veículos
7. Clica no veículo de interesse
8. É direcionado para o site do leiloeiro original

---

## 📈 Modelo de Negócio

### **Receita**
- Assinaturas mensais: R$ 119/mês
- Assinaturas anuais: R$ 990/ano (desconto de 30%)
- Freemium: 5 buscas gratuitas (conversão para pago)

### **Custos Estimados (Mensal)**
- Hospedagem Vercel: ~$20 (Pro Plan)
- Supabase: ~$25 (Pro Plan)
- Redis (Upstash): ~$10
- Gateway Pagamento: 3-5% por transação
- APIs e emails: ~$15

### **Escalabilidade**
- Iniciar com 10-20 leiloeiros principais
- Expandir gradualmente para cobrir todos os leiloeiros do Brasil
- Possibilidade de afiliação com leiloeiros (futuro)

---

## 🎨 Design e UX

### **Princípios de Design**
- **Simplicidade**: Interface limpa e intuitiva
- **Performance**: Carregamento rápido, cache inteligente
- **Mobile First**: Maioria dos usuários em dispositivos móveis
- **Acessibilidade**: Contraste adequado, navegação por teclado

### **Páginas Principais**
1. Home/Busca (landing + filtros)
2. Resultados (grid de veículos)
3. Detalhes do Veículo (modal ou página)
4. Planos e Preços
5. Dashboard do Usuário
6. Favoritos
7. Histórico

---

## 🚀 Roadmap de Desenvolvimento

### **MVP (Mínimo Produto Viável) - 10 semanas**
- Sistema de autenticação
- Busca com 5 filtros principais
- Scraping de 5 leiloeiros
- Comparativo FIPE básico
- Sistema de planos e pagamento
- Deploy básico

### **Versão 1.0 - 16 semanas**
- Todos os filtros implementados
- 20+ leiloeiros cobertos
- Sistema de favoritos e histórico
- Deal score otimizado
- Dashboard completo
- SEO otimizado

### **Futuro (Versão 2.0+)**
- Alertas por email personalizados
- App mobile nativo
- Sistema de afiliação com leiloeiros
- Análise de tendências de preços
- Comparação entre leilões
- API pública (parceiros)

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Sites de leiloeiros mudarem estrutura | Alto | Média | Sistema de scraping modular, fácil atualização |
| Questões legais de scraping | Alto | Baixa | Verificar termos de uso, considerar parcerias |
| Baixa conversão free→pago | Médio | Média | Teste A/B de preços, features exclusivas |
| Problemas de performance | Médio | Baixa | Cache agressivo, otimização de imagens |
| Concorrência | Médio | Média | Foco em UX superior e features únicas |

---

## 📊 Métricas de Sucesso

### **Métricas Principais (KPIs)**
- Usuários registrados
- Taxa de conversão free→pago (meta: 5-10%)
- Retention rate mensal (meta: >60%)
- Número de buscas por usuário
- NPS (Net Promoter Score)

### **Métricas Técnicas**
- Tempo de resposta de busca (<2s)
- Uptime (>99.5%)
- Cobertura de leiloeiros
- Atualização de dados (frequência)

---

Esta é a descrição completa do projeto. Você pode copiar e colar isso no VibeCodeDocs como ponto de partida! Quer que eu ajuste alguma parte ou adicione mais detalhes em alguma seção específica?

## Product Requirements Document
Not available

## Technology Stack
Not available

## Project Structure
Not available

## Database Schema Design
Not available

## User Flow
Not available

## Styling Guidelines
Not available
