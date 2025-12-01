# 🖼️ Imagens - YBYBID

Estrutura organizada de imagens para a plataforma YBYBID.

## 📁 Estrutura

```
images/
├── logo/          # Logos da marca
├── banners/       # Banners e imagens hero
└── assets/        # Outros assets visuais
```

## 🎯 Formatos Recomendados

### Para Logos
- **SVG** (preferencial) - Vetorial, escalável
- **PNG** (alternativa) - Se necessário

### Para Banners/Fotos
- **WebP** (preferencial) - Melhor compressão
- **AVIF** (opcional) - Máxima compressão
- **JPG** (fallback) - Compatibilidade

## ⚡ Otimização

Todas as imagens são otimizadas automaticamente pelo Next.js Image Component.

### Boas Práticas
1. ✅ Use SVG para logos e ícones simples
2. ✅ Use WebP para fotos e banners
3. ✅ Sempre defina width e height
4. ✅ Use `priority` apenas para imagens acima da dobra
5. ✅ Sempre inclua alt text descritivo
6. ✅ Use `sizes` para imagens responsivas

## 📚 Documentação

- [Logo README](./logo/README.md)
- [Banners README](./banners/README.md)
- [Assets README](./assets/README.md)

## 🔗 Links Úteis

- [Next.js Image Optimization](https://nextjs.org/docs/app/api-reference/components/image)
- [WebP Converter](https://squoosh.app/)
- [SVG Optimizer](https://jakearchibald.github.io/svgomg/)

