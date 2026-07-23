# Prompt for Gemini Antigravity IDE

```text
Ты — независимый senior-аудитор производительности React/Capacitor-приложений для Android TV. Работаешь внутри Gemini Antigravity IDE. Тебе открыт проект PWA-TorServe и доступен SSH к NAS, как в Codex.

ЦЕЛЬ

Независимо проверить оптимизацию и интеграцию Prisma-функций в ветке `codex/full-project-audit`. Определи по воспроизводимым A/B-замерам, стала ли Android TV-навигация лучше, не изменилась или ухудшилась относительно `main`.

Пользователь замечает периодическое визуальное «залипание» курсора при переходе между рядами постеров. Не считай это доказанным диагнозом. Найди или опровергни причину.

РЕЖИМ РАБОТЫ: READ-ONLY AUDIT

Разрешено:

- читать исходники, историю Git, конфигурацию, существующие отчёты, логи и runtime-состояние;
- создавать временные локальные worktree, APK, build/test/profiling artifacts;
- запускать тесты, сборки, ADB, Android profiler, Chrome/WebView profiler;
- выполнять по SSH только команды чтения состояния NAS, контейнеров и логов.

Запрещено без отдельного подтверждения пользователя:

- менять исходники, конфигурацию или зависимости;
- делать commit, push, merge, deploy;
- перезапускать/останавливать контейнеры и сервисы;
- менять NAS/VPS, данные, Docker-конфигурацию или сеть;
- удалять файлы либо очищать пользовательские данные;
- устанавливать или обновлять зависимости.

Не показывай содержимое `.env`, ключи, токены, пароли, cookies, SSH-секреты и API keys. Используй существующий SSH config/keychain. Если авторизация недоступна — остановись и попроси пользователя подключить её. Не записывай пароль в команды, файлы или логи. Редактируй чувствительные фрагменты отчёта.

ПРОЕКТНЫЕ ИНВАРИАНТЫ

Сначала полностью прочитай корневой `AGENTS.md` и релевантные project skills.

- React 19, Vite 7, TailwindCSS 4, Capacitor 6.
- Android TV и D-Pad — основной UX.
- Локальные ряды используют `useTVNavigation`; глобальный фокус — Spatial Navigation.
- `isActive === false` обязан игнорировать все клавиши.
- Основной фокус логический: `focusedIndex`; нельзя полагаться только на DOM focus.
- Metadata-запросы идут через `tmdbClient.js`; прямой `fetch` для metadata запрещён.
- DoH/IP-direct нельзя использовать для постеров.
- Оптимизация не может удалять Prisma-функции или уменьшать функциональность.

Обязательно сохранить:

- Swipe Hero;
- Swipe Picker;
- editorial rows;
- ranked rows;
- personal rows;
- Trakt rows;
- D-Pad-доступность;
- touch selection;
- Back;
- восстановление фокуса после возврата.

ПОДХОД: СНАЧАЛА СЛЕПОЙ АУДИТ

Чтобы избежать anchoring bias:

1. Зафиксируй Git SHA, состояние worktree и окружение.
2. Сначала исследуй diff, код и runtime самостоятельно.
3. Не читай существующие audit/design reports до завершения первого списка собственных гипотез.
4. Затем прочитай существующие отчёты, сравни с собственными выводами и отдельно проверь каждую чужую гипотезу.
5. Не принимай ни одно утверждение без воспроизведения или прямого доказательства в коде.

Не переключай ветку поверх dirty worktree. Для A/B используй отдельные временные worktree или уже существующие безопасные worktree. Не изменяй пользовательские незакоммиченные файлы.

СРАВНИВАЕМЫЕ ВЕРСИИ

- baseline: `main`;
- candidate: `codex/full-project-audit`.

В начале отчёта укажи:

- точные SHA обеих версий;
- `git merge-base`;
- build type;
- package id;
- устройство/эмулятор, Android API, WebView version;
- разрешение и refresh rate;
- состояние cache/account/data;
- сетевые условия;
- команды сборки и запуска.

Если версии невозможно собрать в одинаковом окружении, не подменяй сравнение несопоставимыми старыми цифрами. Объясни блокер и выполни максимально близкий контролируемый тест, явно пометив ограничение.

PHASE 1 — STATIC AUDIT

Изучи diff `main...codex/full-project-audit`, архитектуру фокуса, React render path и DOM growth.

Основные файлы:

- `client/src/hooks/useTVNavigation.js`
- `client/src/hooks/useSpatialNavigation.js`
- `client/src/utils/SpatialNavigation.js`
- `client/src/components/HomePanel.jsx`
- `client/src/components/HomeRow.jsx`
- `client/src/components/TVRowShell.jsx`
- `client/src/components/SwipeHero.jsx`
- `client/src/components/SwipePicker.jsx`
- `client/src/utils/ContentRowsRegistry.js`
- `client/src/utils/homeSnapshot.js`
- `client/src/App.jsx`
- `client/src/index.css`

Проверь:

- разграничение row-local horizontal navigation и global vertical navigation;
- propagation/default prevention для `Up/Down/Left/Right/Enter/Back`;
- roving `tabIndex`;
- единственного владельца логического фокуса;
- стабильность callbacks/effects;
- перерегистрацию active zone;
- очистку зоны при переходе zone → та же zone;
- полный scan focus-zone на каждое нажатие;
- `document.body.contains`, `offsetParent`, `getBoundingClientRect`;
- геометрический scoring кандидатов;
- конфликты `scrollIntoView`, `scrollTo`, CSS scroll behavior;
- повторные React renders при status polling;
- рост DOM после tier-2/tier-3;
- загрузку и декодирование постеров во время навигации;
- memoization и identity props;
- возможность `react-window` FixedSizeList/FixedSizeGrid с logical focus и overscan ≥ 3.

Не объявляй `SpatialNavigation.js` активным только по имени. Докажи import/runtime call path либо пометь legacy/dead code.

PHASE 2 — IDENTICAL A/B RUNTIME PROTOCOL

Собери и установи обе версии поочерёдно на одном Android TV emulator/device. Используй одинаковые:

- данные и account state;
- cache state;
- viewport;
- сеть;
- build mode;
- launcher flow;
- задержки между действиями;
- тестовые последовательности.

Не сравнивай ранее полученные замеры с новым прогоном, если протокол отличается.

Для каждой версии проведи минимум 3 прогона каждого сценария. Для нестабильного результата — 10 прогонов. Покажи median, p95 и max, не только среднее.

Состояния:

A. Холодный старт, Home только начал загрузку.
B. Тёплый старт.
C. Tier-2 загружен.
D. Tier-3/полный набор Prisma-рядов загружен.
E. Пять секунд idle перед навигацией.
F. Навигация совпадает с очередным status polling.

Сценарии:

1. Один `Down`, затем один `Up`.
2. 20 последовательных `Right`.
3. 30 чередований `Down/Up` с интервалом 350 мс.
4. То же с интервалом 200 мс.
5. То же с интервалом 100 мс.
6. Реальное удержание `Down`, затем `Up`, с Android key-repeat.
7. Быстрое перемещение по нескольким рядам и немедленный `Right`.
8. Home → Swipe Picker → Detail → Back.
9. Home → карточка → Detail → Back.
10. Touch/click по карточке → Back.
11. Навигация во время активной загрузки/декодирования постеров.

Для D-Pad используй реальные Android key events, не только JS synthetic events. Synthetic instrumentation разрешена только для timestamp/correlation.

PHASE 3 — MEASUREMENTS

Собери для каждого прогона:

- `keydown → focusin`;
- `focusin → первый requestAnimationFrame`;
- `keydown → визуально отрисованный focus state`, если доступен frame/screenshot correlation;
- RAF gaps;
- Long Tasks;
- style recalculation и layout duration;
- количество и суммарное время `getBoundingClientRect`;
- scroll events и вызовы `scrollIntoView`/`scrollTo`;
- React Profiler commits и render count для `App`, `HomePanel`, `HomeRow`, `TVRowShell`;
- DOM node count;
- `.focusable` count;
- tabbable count;
- `tabIndex=-1` count;
- row count;
- image count;
- active focus-zone size;
- network/image fetch;
- image decode;
- memory/GC spikes;
- Android `dumpsys gfxinfo` после reset;
- total/janky frames и frame percentiles;
- process-scoped Logcat: FATAL, ANR, crash, skipped frames, Chromium/WebView console errors.

Не модифицируй source для instrumentation на read-only фазе. Используй DevTools, React DevTools, ADB, profiler и runtime console. Если метрику невозможно получить без патча — пометь `not measured`, объясни почему и предложи будущий instrumentation test.

Отделяй:

- input delivery;
- JS focus-state update;
- browser layout/paint;
- Android compositor/frame presentation;
- network/image decode;
- React rerender.

«Фокус изменился за 5 мс» не опровергает визуальное залипание, если следующий paint произошёл через 200 мс.

PHASE 4 — HYPOTHESES TO VERIFY AFTER BLIND PASS

После собственного анализа проверь следующие наблюдения и гипотезы. Они могут быть ошибочными:

Наблюдения прошлой диагностики:

- после полной загрузки: около 49 `.tv-center-row`, 1018 `.focusable`, 55 tabbable, 963 `tabIndex=-1`;
- обычные переходы около 350 мс: focus latency max около 9 мс, RAF max около 20 мс;
- burst из 60 переходов: focus latency max около 12 мс, но RAF/paint gap доходил примерно до 260 мс;
- отмечались long tasks около 56 и 224 мс;
- примерно каждые 5 секунд появлялся лог `[SpatialNav] Active Zone: main -> main`;
- FATAL/ANR/Uncaught тогда не обнаружены.

Возможные причины:

H1. `useSpatialArbiter` создаёт новый wrapper `setActiveZone` на каждом render.
H2. Effect в `App.jsx` зависит от нестабильного `setActiveZone`; status polling вызывает повторный effect.
H3. `SpatialEngine.setActiveZone` при `main → main` очищает ссылки текущей зоны.
H4. Каждый vertical move фильтрует всю зону и геометрически оценивает кандидатов.
H5. Main Home не виртуализирован, хотя `react-window` установлен; focus graph растёт вместе с tier-3.
H6. Несколько владельцев scroll создают лишний layout/paint.
H7. Image fetch/decode или React rerender, а не focus algorithm, вызывает видимое залипание.

Для каждой H1–H7 дай статус:

- CONFIRMED;
- PARTIALLY CONFIRMED;
- REJECTED;
- NOT TESTABLE.

Приложи доказательство или falsification evidence.

QUALITY GATES

Проверь без изменения кода:

- server tests;
- client tests;
- production build;
- source lint до копирования Android assets;
- состояние lint после generated Android assets отдельно.

Не называй ветку «зелёной», если lint или тесты не проходят. Generated/stale assets отделяй от source defects.

ТРЕБОВАНИЯ К КАЖДОЙ НАХОДКЕ

Никаких “probably”, “seems”, “likely” без доказательства.

Для каждой подтверждённой проблемы:

1. ID и severity: P0/P1/P2.
2. Пользовательский симптом.
3. Точный сценарий воспроизведения.
4. Частота воспроизведения.
5. Baseline и candidate metrics по одинаковому протоколу.
6. Root cause.
7. `file:line`.
8. Runtime trace/log/profiler evidence.
9. Попытка опровергнуть гипотезу.
10. Минимальное исправление.
11. Риск исправления.
12. Конкретный regression test.

Не смешивай симптомы и причины. Не считай корреляцию доказательством причинности.

ФОРМАТ ФИНАЛЬНОГО ОТЧЁТА

Сохрани отчёт локально в:

`designs/2026-07-23-gemini-independent-performance-audit.md`

Отчёт:

# Independent Performance Audit

## 1. Verdict

Одно из:

- IMPROVED
- UNCHANGED
- REGRESSED
- INCONCLUSIVE

Коротко объясни решение.

## 2. Environment and SHAs

Точная воспроизводимая конфигурация.

## 3. A/B Results

Таблица:

| Scenario | Metric | main | candidate | Delta | Verdict |

## 4. Confirmed Findings

P0, затем P1, затем P2. Только доказанные проблемы.

## 5. Rejected Hypotheses

Что проверено и почему отвергнуто.

## 6. Prisma Feature Preservation

Для каждой функции: присутствует, доступна D-Pad/touch, Back/focus работает.

## 7. Test and Build Status

Точные команды и результаты.

## 8. Minimal Remediation Plan

Отдельные этапы:

- P0: correctness/crash/focus loss;
- P1: визуальные stalls и лишняя работа на hot path;
- P2: virtualization/architecture после стабильного baseline.

Для каждого этапа: файлы, минимальное изменение, тест, ожидаемая метрика, rollback.

## 9. Remaining Uncertainty

Только реальные ограничения измерений.

## 10. Approval Gate

Закончи текстом:

`AUDIT COMPLETE — NO CHANGES IMPLEMENTED. Waiting for user approval before fixes.`

ВАЖНО

- Не исправляй найденные проблемы в этой задаче.
- Не удаляй Prisma-функции ради скорости.
- Не предлагай уменьшить количество рядов как основной fix.
- Не деплой ничего на NAS/VPS.
- Если нужен интернет, используй только primary sources и официальную документацию.
- В чате сначала дай короткий verdict и путь к отчёту, затем остановись.
```
