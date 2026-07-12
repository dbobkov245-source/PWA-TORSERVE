# TV Row Center Scroll Design

## Goal

Центрировать активную карточку горизонтального ряда без лагов при быстрых и удерживаемых нажатиях D-Pad.

## Root Cause

Скролл запускают одновременно DOM `focus()`, `scrollIntoView({ behavior: 'smooth' })`, CSS `scroll-behavior: smooth` и global SpatialNavigation. Smooth-анимации накапливаются и конкурируют в Android WebView. Hot-path debug logging добавляет нагрузку.

## Design

- `useTVNavigation` — единственный владелец горизонтального D-Pad scroll.
- Focus устанавливается через `node.focus({ preventScroll: true })`.
- В одном `requestAnimationFrame` вычисляется `itemCenter - containerCenter`; контейнер получает мгновенный `scrollLeft`/`scrollTo({ behavior: 'auto' })`.
- Предыдущий незавершённый frame отменяется при следующем индексе.
- Global SpatialNavigation переводит focus между рядами, но не запускает второй horizontal scroll.
- TV-контейнеры не используют smooth для D-Pad; touch snap остаётся.
- Debug logs убираются из navigation hot path.

## Scope

- `client/src/hooks/useTVNavigation.js`
- `client/src/hooks/useTVNavigation.test.jsx`
- `client/src/hooks/useSpatialNavigation.js`
- `client/src/index.css`

## Acceptance

- Одно изменение `focusedIndex` создаёт один центрирующий scroll.
- Rapid Left/Right не создаёт очередь smooth-анимаций.
- Карточка получает focus с `preventScroll: true`.
- Активная карточка центрируется, кроме физически недоступных краёв первого/последнего элемента.
- Touch scrolling и vertical row transitions остаются рабочими.
- Client tests и production build проходят.
