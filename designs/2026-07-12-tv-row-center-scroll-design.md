# TV Row Center Scroll Design

## Goal

Центрировать активную карточку горизонтального ряда без лагов при быстрых и удерживаемых нажатиях D-Pad.

## Root Cause

Скролл запускали одновременно DOM `focus()`, `scrollIntoView({ behavior: 'smooth' })`, CSS `scroll-behavior: smooth` и global SpatialNavigation. Smooth-анимации накапливались и конкурировали в Android WebView. Hot-path debug logging добавлял нагрузку.

Первый performance fix убрал лаги, но выявил вторую геометрическую причину: ряд имеет только `32px` бокового padding. Первый постер требует отрицательный `scrollLeft` для центра, последний — значение выше `maxScroll`; браузер зажимает оба края. Без дополнительного scrollable пространства focus физически не может оставаться в центре.

## Design

- `useTVNavigation` — единственный владелец горизонтального D-Pad scroll.
- Focus устанавливается через `node.focus({ preventScroll: true })`.
- В одном `requestAnimationFrame` вычисляется `itemCenter - containerCenter`; контейнер получает мгновенный `scrollLeft`/`scrollTo({ behavior: 'auto' })`.
- Предыдущий незавершённый frame отменяется при следующем индексе.
- Перед центрированием контейнер получает симметричный inline padding: `max(32px, (containerWidth - focusedCardWidth) / 2)`. Padding создаёт scrollable edge-gutters, необходимые для первого и последнего постера.
- Padding пересчитывается только при изменении реальной ширины карточки или контейнера. Poster, editorial и ranked rows используют один алгоритм.
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
- Первый, средний и последний постеры имеют достижимую центральную позицию.
- Focus визуально остаётся на центральной оси; контент ряда движется под ним.
- Touch scrolling и vertical row transitions остаются рабочими.
- Client tests и production build проходят.
