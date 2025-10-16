# 🔐 Configuração da Autenticação Google OAuth

Este guia explica como configurar a autenticação com Google na aplicação **Ybybid**.

---

## 📋 URLs de Redirecionamento Configuradas

### **Desenvolvimento (Local)**
```
http://localhost:3000/auth/callback
```

### **Produção**
```
https://seudominio.com/auth/callback
```

---

## 🚀 Passo a Passo: Configurar Google Cloud Console

### 1. Acessar o Google Cloud Console
- Acesse: https://console.cloud.google.com/
- Faça login com sua conta Google

### 2. Criar ou Selecionar um Projeto
- No topo da página, clique no seletor de projetos
- Clique em **"Novo Projeto"** ou selecione um existente
- Nome sugerido: `Ybybid App`

### 3. Habilitar a API do Google+
- No menu lateral, vá em **APIs e Serviços** → **Biblioteca**
- Pesquise por **"Google+ API"**
- Clique em **"Ativar"**

### 4. Configurar a Tela de Consentimento OAuth
- Vá em **APIs e Serviços** → **Tela de consentimento OAuth**
- Selecione **"Externo"** (ou **"Interno"** se for workspace)
- Clique em **"Criar"**

#### Preencha os dados:
- **Nome do app**: `Ybybid`
- **Email de suporte do usuário**: seu-email@gmail.com
- **Logotipo do app**: (opcional) Faça upload do logo
- **Domínios autorizados**: 
  - `localhost` (desenvolvimento)
  - `seudominio.com` (produção)
- **Informações de contato do desenvolvedor**: seu-email@gmail.com
- Clique em **"Salvar e continuar"**

#### Escopos (Scopes):
- Clique em **"Adicionar ou remover escopos"**
- Selecione:
  - `../auth/userinfo.email`
  - `../auth/userinfo.profile`
- Clique em **"Atualizar"** e depois **"Salvar e continuar"**

### 5. Criar Credenciais OAuth 2.0
- Vá em **APIs e Serviços** → **Credenciais**
- Clique em **"+ Criar credenciais"** → **"ID do cliente OAuth 2.0"**
- Tipo de aplicativo: **"Aplicativo da Web"**

#### Configurar:
- **Nome**: `Ybybid Web Client`
- **Origens JavaScript autorizadas**:
  ```
  http://localhost:3000
  https://seudominio.com
  ```
- **URIs de redirecionamento autorizados**:
  ```
  http://localhost:3000/auth/callback
  https://seudominio.com/auth/callback
  ```
- Clique em **"Criar"**

### 6. Copiar as Credenciais
Após criar, você receberá:
- ✅ **Client ID**: `seu-client-id.apps.googleusercontent.com`
- ✅ **Client Secret**: `seu-client-secret`

**⚠️ IMPORTANTE**: Salve essas credenciais em um local seguro!

---

## 🗄️ Passo a Passo: Configurar no Supabase

### 1. Acessar o Dashboard do Supabase
- Acesse: https://app.supabase.com/
- Selecione seu projeto **Ybybid**

### 2. Configurar Provider do Google
- No menu lateral, vá em **Authentication** → **Providers**
- Procure por **Google** na lista
- Clique para expandir

### 3. Habilitar e Configurar
- Ative o toggle **"Enable Sign in with Google"**
- **Client ID (Google)**: Cole o Client ID copiado do Google Cloud Console
- **Client Secret (Google)**: Cole o Client Secret copiado
- **Redirect URL**: Copie a URL fornecida pelo Supabase (já está correta automaticamente)
  - Exemplo: `https://seu-projeto.supabase.co/auth/v1/callback`
- Clique em **"Save"**

### 4. Copiar a Redirect URL do Supabase
- Logo abaixo do formulário, você verá uma **Callback URL (for OAuth)**
- Exemplo: `https://seu-projeto.supabase.co/auth/v1/callback`
- **Volte ao Google Cloud Console** e adicione essa URL também aos **URIs de redirecionamento autorizados**

---

## 🔧 Configurar Variáveis de Ambiente

No arquivo `.env.local` da aplicação, adicione:

```env
# Supabase (já deve estar configurado)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key

# URL do site (para callbacks)
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Desenvolvimento
# NEXT_PUBLIC_SITE_URL=https://seudominio.com  # Produção
```

---

## ✅ Testar a Integração

### 1. Reiniciar o Servidor
```bash
npm run dev
```

### 2. Acessar a Página de Login
- Acesse: http://localhost:3000/entrar
- Clique no botão **"Entrar com Google"**

### 3. Fluxo de Autenticação
1. Será redirecionado para a tela de login do Google
2. Selecione sua conta Google
3. Autorize o app Ybybid
4. Será redirecionado de volta para: `/auth/callback`
5. E finalmente para: `/` (página inicial)

### 4. Verificar no Supabase
- Vá em **Authentication** → **Users**
- Você deve ver seu usuário listado com o provider **Google**

---

## 🐛 Troubleshooting (Problemas Comuns)

### Erro: "redirect_uri_mismatch"
**Causa**: A URL de redirecionamento não está autorizada no Google Cloud Console

**Solução**:
1. Volte ao Google Cloud Console → **Credenciais** → Edite o OAuth Client
2. Verifique se as URLs estão EXATAMENTE como configuradas:
   - `http://localhost:3000/auth/callback` (dev)
   - `https://seudominio.com/auth/callback` (prod)
   - URL do Supabase: `https://seu-projeto.supabase.co/auth/v1/callback`
3. Aguarde alguns minutos para as alterações propagarem

### Erro: "Access blocked: This app's request is invalid"
**Causa**: A tela de consentimento OAuth não foi configurada ou publicada

**Solução**:
1. Vá em **Tela de consentimento OAuth**
2. Clique em **"Publicar app"** (se estiver em modo teste)
3. Ou adicione seu email como "Usuário de teste" enquanto o app estiver em teste

### Erro: "Invalid client"
**Causa**: Client ID ou Client Secret incorretos no Supabase

**Solução**:
1. Copie novamente as credenciais do Google Cloud Console
2. Cole no Supabase **exatamente como estão** (sem espaços)
3. Clique em **"Save"**

### Usuário não aparece no banco de dados
**Causa**: O perfil do usuário pode estar sendo criado apenas no Supabase Auth

**Solução**:
- Verifique na aba **Authentication** → **Users** no Supabase
- O usuário deve aparecer lá mesmo que não tenha um perfil na tabela `profiles`
- Se necessário, crie um trigger para auto-criar perfis

---

## 📚 Documentação Adicional

- [Supabase Auth - Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google Cloud Console - OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Next.js 15 - Authentication](https://nextjs.org/docs/app/building-your-application/authentication)

---

## ✨ Recursos Implementados

- ✅ Login com email/senha
- ✅ Cadastro com email/senha (com confirmação por email)
- ✅ Login com Google OAuth
- ✅ Logout
- ✅ Rota de callback `/auth/callback`
- ✅ Redirecionamento automático após login
- ✅ Exibição de erros na UI
- ✅ Loading states

---

## 🔜 Próximos Passos (Opcional)

1. **Adicionar mais providers OAuth**:
   - GitHub
   - Facebook
   - Microsoft

2. **Implementar recuperação de senha**:
   - Criar página `/recuperar-senha`
   - Usar `supabase.auth.resetPasswordForEmail()`

3. **Criar perfil de usuário**:
   - Tabela `profiles` já existe
   - Trigger para criar perfil automaticamente
   - Página de perfil do usuário

4. **Middleware de autenticação**:
   - Proteger rotas que exigem login
   - Redirecionar usuários não autenticados

---

**Criado em**: 2025-10-11  
**Última atualização**: 2025-10-11


