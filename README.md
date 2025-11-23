# YbyBid

Plataforma de agregação de leilões de veículos do Brasil.

## 🚀 Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Puppeteer (Web Scraping)
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **Payment**: Stripe
- **Hosting**: Vercel

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase
- Conta Upstash Redis
- Conta Stripe (para pagamentos)

## 🔧 Instalação

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Copie `.env.example` para `.env`
   - Preencha todas as variáveis necessárias

4. Execute o projeto em desenvolvimento:
   ```bash
   npm run dev
   ```

## 📁 Estrutura do Projeto

```
leilaoapp/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # Componentes React
│   ├── lib/             # Bibliotecas e utilities
│   └── types/           # TypeScript types
├── public/              # Arquivos estáticos
└── ...
```

## 🔐 Variáveis de Ambiente

Consulte `.env.example` para lista completa de variáveis necessárias.

## 📄 Licença

Proprietary - Todos os direitos reservados
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Vercel](https://vercel.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Upstash](https://upstash.com/)
- [Stripe](https://stripe.com/)

---

**Desenvolvido com ❤️ para ajudar brasileiros a encontrar os melhores leilões de veículos**
