# 📐 Logo - YBYBID

Esta pasta contém os arquivos de logo da marca YBYBID.

## 📋 Especificações

### Formatos Recomendados
- **SVG** (preferencial) - Vetorial, escalável, pequeno tamanho
- **PNG** (alternativa) - Se necessário, use PNG-24 com transparência

### Tamanhos Recomendados
- **Desktop**: 200x60px (ou proporção similar)
- **Mobile**: 150x45px
- **Favicon**: 32x32px, 64x64px, 192x192px

### Versões Necessárias
- `ybybid-logo.svg` - Logo principal (Azul Petróleo #003E53)
- `ybybid-logo-white.svg` - Logo para fundos escuros (branco)
- `ybybid-icon.svg` - Ícone compacto para favicon/app

### Cores do Brandbook
- **Cor Principal**: Azul Petróleo (#003E53)
- **Cor Accent**: Laranja Sinal (#F45D01) - opcional para detalhes

## 🎨 Uso

```tsx
import Image from 'next/image';

// Logo principal
<Image
  src="/images/logo/ybybid-logo.svg"
  alt="YBYBID Logo"
  width={200}
  height={60}
  priority
/>
```

## ✅ Checklist
- [ ] Logo SVG otimizado com SVGO
- [ ] Versão branca para fundos escuros
- [ ] Favicon em múltiplos tamanhos
- [ ] Testado em diferentes resoluções

