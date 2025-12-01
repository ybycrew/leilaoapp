# 🖼️ Banners - YBYBID

Esta pasta contém os banners e imagens hero da plataforma.

## 📋 Especificações

### Formatos Recomendados
- **WebP** (preferencial) - ~30% menor que JPG, qualidade 80-85%
- **AVIF** (opcional) - Máxima compressão, suporte limitado
- **JPG** (fallback) - Para compatibilidade, qualidade 85-90%

### Tamanhos Recomendados
- **Desktop**: 1920x1080px (16:9) - < 200KB
- **Tablet**: 1200x675px - < 150KB
- **Mobile**: 768x432px - < 100KB

### Versões Necessárias
- `hero-banner.webp` - Banner principal desktop
- `hero-banner-mobile.webp` - Banner mobile (opcional)
- `hero-banner-tablet.webp` - Banner tablet (opcional)

### Otimização
- Use ferramentas como: Squoosh, ImageOptim, ou Sharp
- Lazy loading para imagens abaixo da dobra
- Sempre inclua alt text descritivo

## 🎨 Uso

```tsx
import Image from 'next/image';

// Banner hero
<Image
  src="/images/banners/hero-banner.webp"
  alt="YBYBID - Todos os leilões do Brasil em um só lugar"
  width={1920}
  height={1080}
  priority
  sizes="100vw"
/>
```

## ✅ Checklist
- [ ] Imagem otimizada em WebP
- [ ] Tamanho < 200KB (desktop)
- [ ] Versões responsivas criadas
- [ ] Alt text descritivo
- [ ] Testado em diferentes dispositivos

