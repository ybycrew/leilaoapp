# Correção de Aplicação de Classificação de Tipos

## Problemas Corrigidos

### 1. Inconsistência de Formato
- **Antes**: Scraping salvava "Caminhao" (sem acento), script salvava "Caminhão" (com acento)
- **Agora**: Função centralizada `normalizeVehicleTypeForDB()` garante formato consistente
- **Formato**: "Carro", "Moto", "Caminhão", "Van" (sempre com primeira letra maiúscula e acento correto)

### 2. Timing de Criação de englishVehicleType
- **Antes**: `englishVehicleType` podia ser criado antes da classificação
- **Agora**: `englishVehicleType` é criado DEPOIS de todas as classificações (linha 496)
- **Garantia**: Tipo já foi corrigido pelo classificador multi-camada

### 3. Validação por Modelo Conhecido
- **Novo**: Validação adicional antes de salvar (linhas 414-436)
- **Casos tratados**:
  - Uno → sempre carro (não caminhão)
  - Palio → sempre carro
  - Honda CB/CG/XRE → sempre moto
  - Honda Civic/Fit/CRV → sempre carro
  - Yamaha XTZ/Fazer → sempre moto
  - Ford Ranger militar → caminhão

### 4. Verificação Pós-Salvamento
- **Novo**: Após salvar, verifica se tipo foi realmente salvo (linhas 675-705)
- **Ação**: Se diferente do esperado, corrige imediatamente
- **Log**: Log detalhado de tipo esperado vs salvo

## O Que Mudou

### Arquivos Modificados

1. **`src/lib/scraping/utils.ts`**
   - Criada função `normalizeVehicleTypeForDB()` centralizada
   - Criada função `validateVehicleTypeByModel()` para validação

2. **`src/lib/scraping/index.ts`**
   - Move `englishVehicleType` para DEPOIS da classificação
   - Adiciona validação por modelo conhecido
   - Adiciona verificação pós-salvamento
   - Adiciona log detalhado do tipo final

3. **`src/scripts/fix-all-vehicle-types.ts`**
   - Usa função centralizada `normalizeVehicleTypeForDB()`
   - Remove função duplicada

## Como Funciona Agora

### Durante o Scraping

1. Scraper detecta tipo inicial
2. **Classificador multi-camada** é chamado
   - Camada 1: FIPE (95% confiança)
   - Camada 2: Palavras-chave no título (70-85%)
   - Camada 3: Características (validação)
   - Camada 4: Fallback (50%)
3. **Validação por modelo conhecido** (novo)
   - Verifica casos especiais (Uno, Palio, Honda, etc.)
   - Corrige antes de salvar
4. **Normalização para formato do banco** (usando função centralizada)
   - "carro" → "Carro"
   - "moto" → "Moto"
   - "caminhao" → "Caminhão" (com acento!)
   - "van" → "Van"
5. **Log do tipo final** antes de salvar
6. **Salva no banco** com tipo corrigido
7. **Verifica pós-salvamento** (novo)
   - Busca veículo do banco
   - Compara tipo salvo vs esperado
   - Corrige imediatamente se diferente

### Durante Correção em Massa

1. Script busca todos os veículos
2. Classifica usando estratégia multi-camada
3. Normaliza usando função centralizada
4. Aplica correção se confiança ≥ 70%
5. Gera relatório detalhado

## O Que Esperar Agora

### Em Novos Scrapings

- ✅ Tipos são corrigidos automaticamente durante scraping
- ✅ Formato consistente: "Carro", "Moto", "Caminhão", "Van"
- ✅ Validação de casos especiais antes de salvar
- ✅ Verificação pós-salvamento garante que foi salvo corretamente
- ✅ Log detalhado mostra tipo esperado vs salvo

### Em Correção em Massa

- ✅ Usa mesma função de normalização do scraping
- ✅ Formato consistente
- ✅ Relatório detalhado de correções

## Troubleshooting

### Se tipos ainda estiverem incorretos após scraping

1. Verificar logs do scraping:
   - Procurar por "Tipo final a ser salvo"
   - Verificar se tipo está correto nos logs
   - Verificar se há avisos de "Tipo salvo diferente do esperado"

2. Executar script de análise:
   ```bash
   npm run analyze-types
   ```

3. Executar correção em massa:
   ```bash
   npm run fix-types
   ```

### Se tipos estiverem em formato diferente

- Verificar se banco tem valores mistos ("Caminhao" e "Caminhão")
- Executar correção em massa para padronizar
- Novos scrapings usarão formato correto automaticamente

## Próximos Passos

1. ✅ Executar análise: `npm run analyze-types`
2. ✅ Executar correção em massa: `npm run fix-types`
3. ✅ Executar scraping manual para verificar
4. ⏳ Monitorar logs do próximo scraping automático
5. ⏳ Verificar banco após scraping

## Logs Importantes

### Durante Scraping

```
[Leiloeiro] Tipo detectado pelo scraper: { ... }
[Leiloeiro] Tipo corrigido (fipe, confiança: 95%): { ... }
[Leiloeiro] Tipo corrigido por validação de modelo: { ... }
[Leiloeiro] Tipo final a ser salvo: { vehicleType: 'carro', englishVehicleType: 'Carro', ... }
[Leiloeiro] Veículo atualizado: { tipo_esperado: 'Carro', tipo_salvo: 'Carro', ... }
```

### Durante Correção em Massa

```
Veículo xxxxxxxx...
  Título: ...
  Tipo: "caminhao" → "Carro" (confiança: 95%)
  Razões: FIPE: carro (marca: Fiat, modelo: Uno)
```

