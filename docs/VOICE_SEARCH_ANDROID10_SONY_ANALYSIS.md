# Voice Search: Sony Android 10 vs TCL Android 12

Дата: 15 февраля 2026  
Статус: Этап 1 Hybrid Voice Search реализован в коде; требуется финальная проверка на реальных TV-устройствах

## 1) Контекст и цель

В проекте зафиксирована разница UX голосового поиска на Android TV:

- TCL 65C7K (Android 12): распознавание и возврат результата происходят в ожидаемом темпе.
- Sony KD-65XH9505 (Android 10): при системной строке голоса микрофон слушает, но результат в приложении часто появляется только после закрытия системного экрана.

Цель документа:

- зафиксировать актуальное состояние после уже сделанного фикса `prompt(...)`;
- объяснить текущую причину странного поведения на Sony;
- закрепить целевой план Hybrid voice-flow (`popup:false` -> fallback `popup:true` через 4000ms).

## 2) Симптомы (фактическое поведение)

### TCL 65C7K (Android 12)

- Нажатие на кнопку микрофона в приложении.
- Срабатывает системное распознавание.
- Транскрипт возвращается в приложение и запускается поиск.
- Сценарий завершается без дополнительных действий пользователя.

### Sony KD-65XH9505 (Android 10)

- Нажатие на кнопку микрофона в приложении.
- Появляется верхняя системная строка поиска с иконкой микрофона.
- Иконка микрофона мигает, явного результата в UI приложения сразу нет.
- Если дождаться или нажать `Back`, приложение получает результат и открывает найденный фильм.

## 3) Ожидаемое поведение

- На Sony и TCL голосовой поиск должен завершаться одинаково предсказуемо.
- Успешная фраза должна давать результат без обязательного ручного `Back`.
- Ошибки `cancel/no speech/no match` должны закрываться управляемо, без агрессивного UX.

## 4) Техническая карта текущей реализации

### Точки входа голосового поиска

- Глобальный микрофон: `client/src/App.jsx`
- Микрофон в панели поиска: `client/src/components/SearchPanel.jsx`

### Единая точка voice-логики

- Хук: `client/src/hooks/useVoiceSearch.jsx`
- Оба входа используют `startListening()` из этого хука.

### Текущая конфигурация распознавания

- Плагин: `@capacitor-community/speech-recognition` (`^6.0.1`)
- В `startListening()` реализован двухэтапный flow:
  - `primary`: `popup: false`, `partialResults: false`, timeout `4000ms`
  - `fallback`: `popup: true`, `partialResults: false`, `prompt: 'Что хотите посмотреть?'`

### Нативная механика, критичная для UX

- При `popup:false` результат первичной попытки возвращается напрямую из `SpeechRecognizer` (без обязательного выхода в системный popup UI).
- При fallback `popup:true` Android-плагин идет через `startActivityForResult(...)`, и результат зависит от Activity result callback.
- Перед fallback вызывается `SpeechRecognition.stop()` для снижения риска `RecognitionService busy`.

### Целевой интерфейс (документируемый контракт, planned)

```ts
startListening(options?): Promise<string | null>
```

Планируемые опции:

- `mode: 'hybrid' | 'nonPopup' | 'popup'`
- `fallbackTimeoutMs?: number`
- `language?: string`
- `prompt?: string`

Планируемые дефолты:

- `mode='hybrid'`
- `fallbackTimeoutMs=4000`
- `language='ru-RU'`

## 5) Выводы по корневой причине (актуализировано)

### Вывод A (закрытый дефект)

Старый дефект с `prompt(...)` в текущем коде уже закрыт: голосовая логика централизована в `useVoiceSearch`, fallback в системный `prompt` удален.

### Вывод B (текущий primary-дефект)

Текущая проблема на Sony связана не с `prompt(...)`, а с `popup:true`:

- распознавание идет в системной Activity;
- результат возвращается в приложение только после `ACTIVITY_RESULT`;
- из-за этого пользователь видит задержанный эффект и часто воспринимает `Back` как «кнопку завершения поиска».

### Вывод C (влияние speech engine)

По логам повторяются `NO_SPEECH_DETECTED` и пустые финальные результаты. Это усиливает задержку и может переводить сценарий в повторные циклы системного экрана.

### Вывод D (архитектурный статус)

Раздвоение логики между `App.jsx` и `SearchPanel.jsx` закрыто (оба используют один хук), внутри хука внедрен hybrid-flow, что снижает зависимость UX от системного popup-цикла на Sony Android 10.

## 6) Подтверждающие факты из кода (актуальные)

- `client/src/hooks/useVoiceSearch.jsx`: реализован primary `popup:false` с timeout `4000ms`.
- `client/src/hooks/useVoiceSearch.jsx`: при timeout/error первичной попытки выполняется `SpeechRecognition.stop()` и запускается fallback `popup:true`.
- `client/src/hooks/useVoiceSearch.jsx`: cancel-сценарии (`0`, `cancelled`, `canceled`) обрабатываются как silent cancel (`null`).
- `client/src/hooks/useVoiceSearch.jsx`: `isListening` гарантированно сбрасывается через `finally`.
- `client/src/App.jsx`: `handleVoiceSearch` ожидает `await startListening()` и продолжает поиск после завершения Promise.
- `client/src/components/SearchPanel.jsx`: `startVoiceSearch` также работает через `await startListening()`.

Следствие: в нормальном кейсе приложение пытается завершить распознавание без обязательного закрытия системного popup-окна.

## 7) Подтверждение из логов (прогон 14.02.2026)

Источник: `consolelog.md`, `bugreport.md`.

### Таймлайн (обновленный)

1. Приложение вызывает плагин:

- `SpeechRecognition.start(...)` с `language: ru-RU`, `popup:true`.

2. Система запускает speech intent:

- создается `ResolverActivity` для `android.speech.action.RECOGNIZE_SPEECH`;
- затем стартует `com.google.android.tts/...GoogleTTSActivity`.

3. Внутри speech activity фиксируются пустые результаты:

- `#onResults empty final recognition results`
- `NO_SPEECH_DETECTED`

4. Возврат в приложение происходит после закрытия speech activity:

- в логе есть `wm_on_activity_result_called: ... com.torserve.pwa.MainActivity, ACTIVITY_RESULT`.

5. После возврата плагин отправляет ошибку `{"message":"0"}`:

- это трактуется как `cancel/result-not-ok` для popup-flow.

### Что это подтверждает

- На Sony системные `ResolverActivity` и `GoogleTTSActivity` запускаются штатно.
- Ключевая UX-проблема в том, что приложение получает развязку сценария только при Activity result.
- Отсюда эффект «ничего не происходит, пока не закрыть/не дождаться».

## 8) Дополнительные наблюдения

- Централизация voice-логики уже выполнена (`useVoiceSearch`).
- Документация до этого апдейта оставалась в состоянии «до фикса prompt». Этот документ обновляет источник истины.

## 9) Статус Плана (Hybrid Plan v2)

### Этап 1: Non-popup primary (`popup:false`) + timeout 4000ms — Выполнено

- Первичный запуск распознавания выполнять без popup (`popup:false`).
- Ждать финальный результат до `4000ms`.
- Если нет финального текста за timeout, завершать primary-попытку контролируемо и переходить на fallback.

Критерий готовности:

- Реализовано в `client/src/hooks/useVoiceSearch.jsx`.

### Этап 2: Fallback popup (`popup:true`) только для timeout/empty/no-match — Выполнено

- `popup:true` не использовать как первичный режим.
- Включать popup только если primary завершился как timeout/empty/no-match.

Критерий готовности:

- Реализовано в `client/src/hooks/useVoiceSearch.jsx`.

### Этап 3: Нормализация ошибок без агрессивного UX — Частично выполнено

- Нормализовать ветки: `cancel`, `no speech`, `no match`, `service error`.
- `cancel/no speech/no match` возвращать как управляемый `null`-результат без побочных экранов.
- Ошибки сервиса показывать как in-app уведомление (toast/banner), без блокирующих диалогов.

Критерий готовности:

- Реализована cancel/error обработка; требуется финальный прогон на устройствах по `no speech/no match` сценариям.

### Этап 4: Единая телеметрия voice-flow — Выполнено (console-level)

- Добавлены структурированные этапы:
  - `primary_start`
  - `primary_timeout`
  - `fallback_start`
  - `resolved`
  - `cancelled`
  - `error`
- Логи должны позволять быстро понять, на каком шаге сценарий «залип».

Критерий готовности:

- Реализовано через логи `[Voice:primary]` и `[Voice:fallback]`.

### Этап 5: QA-матрица Sony/TCL — Открыто

- Sony Android 10 и TCL Android 12 прогоняются одной матрицей кейсов.
- Обязательные проверки:
  - успешная фраза на Sony без обязательного `Back` в большинстве запусков;
  - `silence/no-match` не открывает IME и не зависает;
  - `cancel` по `Back` возвращает в исходный UI без побочных экранов;
  - оба входа (глобальный mic и SearchPanel mic) идентичны по логике.

Критерий готовности:

- Требуется подтверждение на реальных устройствах (Sony Android 10, TCL Android 12).

## 9.1) Что сделано в этом релизе (15.02.2026)

- Убран временный hotfix-режим с принудительным `popup:true`.
- Внедрен hybrid voice flow в `client/src/hooks/useVoiceSearch.jsx`.
- Добавлен guard для `SpeechRecognition.stop()`: на части Android-сборок плагин `stop()` может не завершать Promise, что вызывало зависание кнопки поиска; теперь stop ограничен коротким таймаутом и не блокирует fallback.
- Восстановлены и расширены тесты `client/src/hooks/useVoiceSearch.test.js` (8 тестов).
- Локальная валидация:
  - `npx vitest run src/hooks/useVoiceSearch.test.js` -> passed
  - `npx vitest run` -> passed
  - `npm run build` -> passed
  - `./gradlew assembleDebug` -> passed

## 10) План верификации после фиксов

### Smoke

- Нажать микрофон в `App` (глобальный).
- Произнести фильм на русском.
- Проверить, что результат появляется без ручного `Back` в нормальном потоке.

### SearchPanel

- Открыть `SearchPanel`, нажать локальный микрофон.
- Проверить такой же flow и тот же результат по поведению.

### Negative

- Silence: нажать микрофон и молчать.
- Убедиться, что нет зависания и нет IME-ветки.

### Cancel

- Запустить голос и отменить `Back`.
- Убедиться, что UI возвращается корректно и не открывает лишние экраны.

### Regression

- Проверить обычный текстовый поиск и D-Pad навигацию.
- Проверить отсутствие регрессий на TCL Android 12.

## 11) Явные допущения и выбранные значения

- Код в рамках этой задачи не меняется: фиксируется только документация.
- Выбран целевой подход: `Hybrid`.
- Зафиксирован timeout fallback: `4.0s` (`4000ms`).
- Нативный Android bridge на этом этапе не меняется.

## 12) Резюме

- Дефект с IME через `prompt(...)` закрыт в текущем коде.
- Hybrid Этап 1 реализован: primary `popup:false` с timeout `4000ms` + fallback `popup:true`.
- Оставшийся риск: device-specific поведение на Sony/TCL должно быть подтверждено ручным QA.
- Зафиксированный default:
  - `mode='hybrid'`
  - `fallbackTimeoutMs=4000`
  - primary `popup:false`, fallback `popup:true`.
