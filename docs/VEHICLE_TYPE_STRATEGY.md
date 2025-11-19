# Estratégia Inteligente de Classificação de Tipos de Veículos

## Visão Geral

Sistema multi-camada para classificar corretamente tipos de veículos (carros, motos, caminhões, vans) usando múltiplas fontes de validação, eliminando erros como carros classificados como caminhões, motos como carros, etc.

## Estratégia Multi-Camada

### Camada 1: FIPE (Fonte Primária - 95% Confiança)
- Busca marca e modelo na base FIPE
- Valida tipo baseado em `vehicle_type_id` da tabela `fipe_brands`
- Prioriza modelo sobre marca quando há ambiguidade
- **Confiança**: 95% se encontrado

### Camada 2: Palavras-chave no Título (80% Confiança)
- Analisa título para palavras-chave específicas
- Detecta padrões como "moto", "caminhão", "van"
- **Confiança**: 70-85% dependendo das palavras encontradas

### Camada 3: Características do Veículo (Validação)
- Valida combustível (motocicletas não usam diesel)
- Valida quilometragem e preço
- Verifica casos especiais conhecidos (Honda Civic = carro, CB = moto)
- **Confiança**: 60-80% (ajusta confiança da camada principal)

### Camada 4: Fallback Inteligente (50% Confiança)
- Assume carro como padrão se nenhuma validação funcionar
- **Confiança**: 50%

## Como Usar

### 1. Analisar Classificação Atual

Para identificar veículos com classificação suspeita:

```bash
npm run analyze-types
```

Este comando:
- Analisa todos os veículos do banco
- Identifica classificações suspeitas (confiança < 70% ou tipo incorreto)
- Gera relatório estatístico
- Lista exemplos de problemas encontrados

### 2. Corrigir Tipos em Massa (Dry-Run)

Para ver o que seria corrigido SEM aplicar mudanças:

```bash
npm run fix-types:dry
```

Este comando:
- Simula correção de todos os veículos
- Mostra o que seria corrigido
- Não aplica mudanças no banco

### 3. Corrigir Tipos em Massa (Real)

Para aplicar correções:

```bash
npm run fix-types
```

Este comando:
- Corrige tipos de veículos com confiança ≥ 70%
- Aplica mudanças no banco
- Gera relatório detalhado

## Integração no Scraping

O classificador já está integrado no processo de scraping:

- Usa classificação multi-camada automaticamente
- Valida e corrige tipos durante o scraping
- Log detalhado de classificações

## Casos Especiais Tratados

### Honda
- **Carros**: Civic, Fit, CRV
- **Motos**: CB, CG, XRE, Twister, Hornet
- **Validação**: Modelo determina tipo quando marca é ambígua

### Yamaha
- **Motos**: XTZ, Fazer, MT, Crosser
- **Validação**: Modelo sempre moto

### Ford Ranger
- **Caminhão**: Ranger militar (detectado no título)
- **SUV**: Ranger comum
- **Validação**: Contexto do título

### Outros Casos
- Palio → sempre carro (Fiat)
- Modelos com "CB" → geralmente moto
- Modelos com "XTZ" → sempre moto
- Diesel → geralmente caminhão (não moto)

## Estrutura de Arquivos

```
src/
├── lib/
│   └── vehicle-type-classifier.ts  # Classificador multi-camada
├── scripts/
│   ├── analyze-vehicle-types.ts    # Script de análise
│   └── fix-all-vehicle-types.ts    # Script de correção em massa
└── lib/scraping/
    └── index.ts                    # Integração no scraping
```

## Fluxo de Classificação

```
1. Scraping detecta tipo inicial
   ↓
2. Classificador multi-camada é chamado
   ↓
3. Camada 1: Busca FIPE (máxima prioridade)
   ├─ Se encontrado → confiança 95%
   └─ Se não encontrado → próxima camada
   ↓
4. Camada 2: Analisa palavras-chave no título
   ├─ Se palavras encontradas → confiança 70-85%
   └─ Se não encontrado → próxima camada
   ↓
5. Camada 3: Valida características
   └─ Ajusta confiança baseado em validações
   ↓
6. Se confiança ≥ 70% → aplica correção
   └─ Se confiança < 70% → mantém tipo original (com log)
```

## Métricas de Qualidade

- **Taxa de correção**: % de veículos corrigidos
- **Taxa de confiança média**: Score médio de confiança
- **Taxa de erro**: % de veículos ainda incorretos
- **Taxa de acerto**: % de veículos corretos

## Próximos Passos

1. ✅ Análise de classificação atual
2. ✅ Correção em massa com dry-run
3. ✅ Correção em massa real
4. ✅ Integração no scraping
5. ⏳ Monitoramento contínuo
6. ⏳ Dashboard de qualidade

## Troubleshooting

### Erro: "FIPE não encontrado"
- Verifique se marca/modelo existe na base FIPE
- Execute `npm run fipe-sync` se necessário

### Erro: "Baixa confiança"
- Revise palavras-chave do título
- Verifique se características estão corretas
- Considere adicionar regras específicas

### Erro: "Classificação incorreta"
- Execute análise: `npm run analyze-types`
- Revise exemplos de problemas
- Execute correção: `npm run fix-types`

