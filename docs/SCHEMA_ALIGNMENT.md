# Alinhamento de Schema - Guia de Execução

Este guia descreve como alinhar o código do projeto com o schema real do banco Supabase usando o Supabase CLI.

## Pré-requisitos

1. ✅ Supabase CLI instalado (já feito - versão 2.58.5)
2. Acesso ao projeto Supabase (URL e Project ID)
3. Token de acesso pessoal do Supabase (opcional, para método direto)

## Passo 1: Obter Project ID do Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** > **General**
4. Copie o **Reference ID** (é o Project ID)

**Exemplo**: `abcdefghijklmnop`

## Passo 2: Gerar Tipos TypeScript

Existem duas formas de gerar os tipos:

### Método A: Usando Project ID diretamente (mais rápido)

```bash
# 1. Defina a variável de ambiente com seu Project ID
export SUPABASE_PROJECT_ID="seu-project-id-aqui"

# 2. Execute o comando para gerar tipos
npm run generate-types

# Ou diretamente:
npx supabase gen types typescript --project-id "seu-project-id-aqui" --schema public > src/types/database.types.ts
```

### Método B: Linkando projeto (recomendado para desenvolvimento contínuo)

```bash
# 1. Login no Supabase CLI
npx supabase login

# 2. Link o projeto (vai pedir Project ID e Database Password)
npx supabase link --project-ref seu-project-id

# 3. Gere tipos usando o link
npm run generate-types:linked

# Ou diretamente:
npx supabase gen types typescript --linked --schema public > src/types/database.types.ts
```

## Passo 3: Verificar Tipos Gerados

Após executar o comando, verifique se o arquivo foi criado:

```bash
# Verificar se arquivo foi criado
ls -la src/types/database.types.ts

# Visualizar estrutura (primeiras linhas)
head -50 src/types/database.types.ts
```

O arquivo deve conter uma interface `Database` com todas as tabelas e tipos.

## Passo 4: Integrar Tipos no Código

Após gerar os tipos, vamos atualizar o código para usá-los. Veja os próximos passos no plano.

## Estrutura Esperada do Arquivo database.types.ts

O arquivo gerado terá uma estrutura similar a:

```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      vehicles: {
        Row: {
          id: string
          // ... todas as colunas reais
        }
        Insert: {
          // ...
        }
        Update: {
          // ...
        }
      }
      // ... outras tabelas
    }
    Views: {
      vehicles_with_auctioneer: {
        Row: {
          // ...
        }
      }
    }
  }
}
```

## Comandos Úteis

```bash
# Ver versão do CLI
npx supabase --version

# Ver ajuda do comando de tipos
npx supabase gen types --help

# Ver status do link (se linkado)
npx supabase status

# Deslinkar projeto
npx supabase unlink
```

## Próximos Passos

Após gerar os tipos:
1. ✅ Verificar se arquivo foi criado corretamente
2. Criar helpers para trabalhar com os tipos
3. Atualizar código de scraping para usar tipos gerados
4. Atualizar APIs para usar tipos gerados
5. Documentar schema real encontrado

## Troubleshooting

### Erro: "Project not found"
- Verifique se o Project ID está correto
- Verifique se você tem acesso ao projeto

### Erro: "Authentication required"
- Execute `npx supabase login` primeiro
- Ou use método direto com Project ID

### Erro: "Schema not found"
- Verifique se o schema `public` existe
- Tente sem especificar schema: `--schema public` (padrão)

## Notas Importantes

- Os tipos gerados refletem o schema **real** do banco, não o schema.sql
- Regenerar tipos sempre que houver mudanças no schema do banco
- Commitar `src/types/database.types.ts` no git para manter sincronizado
- Considerar automatizar geração de tipos no CI/CD

