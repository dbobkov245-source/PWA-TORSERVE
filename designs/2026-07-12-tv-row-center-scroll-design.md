# TV Row Center Scroll Design

## Goal

Центрировать активную карточку горизонтального ряда без лагов при быстрых и удерживаемых нажатиях D-Pad.

## Root Cause

Скролл запускали одновременно DOM `focus()`, `scrollIntoView({ behavior: 'smooth' })`, CSS `scroll-behavior: smooth` и global SpatialNavigation. Smooth-анимации накапливались и конкурировали в Android WebView. Hot-path debug logging добавлял нагрузку.

Первый performance fix убрал лаги. Попытка добавить динамический inline padding вызвала runaway layout: новый `clientWidth` включался в следующий расчёт, padding рос при каждом focus change, ряды разъезжались. Эта попытка откатывается; container geometry больше не изменяется во время навигации.

## Design

- `useTVNavigation` — единственный владелец горизонтального D-Pad scroll.
- Focus устанавливается через `node.focus({ preventScroll: true })`.
- В одном `requestAnimationFrame` вычисляется `itemCenter - containerCenter`; контейнер получает мгновенный `scrollLeft`/`scrollTo({ behavior: 'auto' })`.
- Предыдущий незавершённый frame отменяется при следующем индексе.
- Центрирование не изменяет `padding`, `width` или другую геометрию контейнера.
- Полный fixed-center carousel для первого/последнего постера откладывается до отдельной реализации со стабильными flex-spacers.
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
- Ряды не расширяются и не создают пустые области при повторных focus changes.
- Touch scrolling и vertical row transitions остаются рабочими.
- Client tests и production build проходят.
