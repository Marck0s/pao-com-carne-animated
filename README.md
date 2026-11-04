# Pão com Carne — site (Next.js 14 · React 18 · TypeScript · Tailwind CSS)

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # verificação de tipos
npm run build && npm start
```

## Estrutura

```
public/images/…            fotos reais (JPEG otimizado)
public/frames/chimibacon/  sequência de 75 quadros WebP para o hero
src/app/                   layout (fontes, metadata), página e globals.css (tokens de animação)
src/lib/config.ts          LINKS OFICIAIS: iFood, WhatsApp, mapa, endereço, navegação
src/lib/images.ts          catálogo de fotos + texto alternativo
src/data/menu.ts           cardápio (preços/descrições) e nomes dos destaques
src/data/reviews.ts        avaliações reais (adicione novas aqui)
src/data/history.ts        linha do tempo da história
src/hooks/                 useInView (entrada uma única vez), useActiveSection (menu)
src/components/ui/         Button, Photo, Reveal, WordReveal, Gotas (fundo metaballs)
src/components/layout/     Header, Footer, WhatsAppFloat
src/components/sections/   Hero, History, Featured, Gallery, Menu, Reviews, Order, Location
src/components/hero/       carregamento e renderização dos quadros do hero conforme a rolagem
```

## Para editar
- **Links de pedido/WhatsApp/mapa:** só em `src/lib/config.ts`.
- **Cardápio:** rota dedicada `/cardapio`; configure `NEXT_PUBLIC_MENU_URL` para apontar os links a outro endereço quando o domínio estiver publicado.
- **Preços e itens:** `src/data/menu.ts` (os destaques usam o preço/descrição do cardápio).
- **Novas avaliações:** acrescente objetos em `src/data/reviews.ts` (somente textos reais). Com 3 ou mais, o carrossel horizontal por rolagem ativa sozinho.
- **Trocar a animação do hero:** substitua os quadros em `public/frames/chimibacon/960/` e `public/frames/chimibacon/1600/`, mantendo os nomes `frame_001.webp` a `frame_075.webp`.

## Movimento e acessibilidade
- Entradas por `IntersectionObserver` (uma vez), palavra por palavra com transições CSS, máscara nas fotos.
- Fundo de gotas em Canvas: um laço por canvas, pausa fora da tela, estático com `prefers-reduced-motion`.
- A animação do hero acompanha a rolagem; com "reduzir movimento", mostra o primeiro quadro sem animar.
- Carrossel de avaliações: `sticky` + `translate3d`; em telas < 760 px vira fita com gesto horizontal.

## Publicação do cardápio
- O cardápio é uma página independente dentro da aplicação, em `/cardapio`, com conteúdo centralizado em `src/data/menu.ts`.
- `NEXT_PUBLIC_MENU_URL` permite apontar os links para um domínio/subdomínio quando estiver configurado. DNS e associação do domínio dependem do provedor de hospedagem.

## A conferir antes de publicar
- Associação foto ↔ lanche foi feita pela aparência (ver `src/data/menu.ts`, campo `photo`).
- Preços e itens vieram dos cardápios enviados; confirme com a loja.
- Os links (iFood, WhatsApp, mapa) devem ser testados no celular.
