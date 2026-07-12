# Fixed-Center TV Carousel Design

## Goal

Сделать горизонтальные ряды главного экрана как в Prisma: после входа в ряд активная карточка остаётся на центральной оси экрана, а контент движется под ней при нажатиях D-Pad Left/Right.

## Observed Prisma Behavior

- При последовательных нажатиях Right активная карточка сохраняет одну экранную X-позицию.
- Ряд смещается на ширину следующей карточки и gap.
- Первый и последний элементы могут занять центральную позицию благодаря пустому пространству по краям ряда.
- Вертикальный переход меняет ряд без второго горизонтального scroll-owner.

## Root Cause

Текущий `useTVNavigation` правильно вычисляет смещение центра карточки относительно центра контейнера, но браузер зажимает `scrollLeft` диапазоном `0..scrollWidth-clientWidth`. У первого и последнего элементов отсутствует физически доступное scrollable-пространство для центральной позиции.

Предыдущая попытка добавлять `paddingInline` во время focus change была неверной: padding менял измеряемый `clientWidth`, следующий расчёт использовал уже изменённую геометрию, поэтому ширина росла при каждом переходе.

## Chosen Design

### Stable edge spacers

`HomeRow` получает два декоративных flex-элемента: перед первым focusable-элементом и после последнего. Они не регистрируются в навигации, не имеют `tabIndex` и скрыты от accessibility tree.

Ширина spacer постоянна для текущего layout:

```text
max(existing-side-inset, container-width / 2 - focused-card-width / 2 - row-gap)
```

Размер задаётся CSS-переменной layout:

- poster и poster_below: `130px`
- backdrop_below: `240px`
- другие поддерживаемые HomeRow layout получают явную ширину своей карточки

Расчёт использует ширину scroll viewport, но не меняет padding или width самого контейнера. При resize CSS пересчитывает spacer без focus-события и без накопления состояния.

### Scroll ownership

- `useTVNavigation` остаётся единственным владельцем горизонтальной D-Pad прокрутки.
- Focus: `node.focus({ preventScroll: true })`.
- Один `requestAnimationFrame` вычисляет разницу между центрами карточки и контейнера.
- Предыдущий frame отменяется при новом focus index.
- Прокрутка использует `behavior: 'auto'`; CSS smooth отключён для TV D-Pad.
- Global `SpatialNavigation` отвечает за переход между рядами и не запускает горизонтальный scroll.

### Existing row actions

`В начало` и `Показать все` остаются focusable элементами ряда. Они используют ту же ширину карточки и также могут занимать центральную позицию. Spacer не влияет на media index, сохранение focus или обработку Enter.

## Components

- `client/src/components/HomeRow.jsx`: spacer-разметка, layout CSS variable.
- `client/src/index.css`: стабильная формула edge spacer.
- `client/src/hooks/useTVNavigation.js`: существующий единичный center-scroll без изменения геометрии.
- Tests: `HomeRow.test.jsx` и `useTVNavigation.test.jsx`.

## Testing

1. RED: первый и последний элементы имеют доступное крайнее пространство, spacer не focusable.
2. GREEN: добавить стабильные spacers и layout width variable.
3. Regression: focus change не меняет `paddingInline` контейнера.
4. Regression: одно изменение индекса вызывает один `scrollTo`.
5. Regression: rapid Right отменяет предыдущий frame.
6. Полный test suite, Vite production build, Capacitor sync, Gradle debug APK.
7. Ручная проверка на Android TV/emulator: первый, средний и последний элементы остаются на одной центральной оси; Up/Down сохраняют выбранный столбец; тормоза не возвращаются.

## Acceptance Criteria

- Первый, средний и последний focusable элементы каждого HomeRow центрируются.
- После каждого Left/Right экранная X-позиция активной карточки одинакова с допуском 1 px.
- Ряд не расширяется повторно при focus changes.
- Нет накопленной smooth-анимации и заметных тормозов при удержании D-Pad.
- Карточки не уходят за границы экрана.
- Touch-scroll остаётся рабочим.
- `В начало`, `Показать все`, Enter и вертикальная навигация работают как раньше.
- Все тесты и Android debug build проходят.

## Out of Scope

- Переписывание рядов на transform-carousel.
- Виртуализация существующих коротких HomeRow.
- Изменение глобального алгоритма выбора вертикального соседа.
- Любые изменения сетевого слоя, metadata cascade или native player bridge.
