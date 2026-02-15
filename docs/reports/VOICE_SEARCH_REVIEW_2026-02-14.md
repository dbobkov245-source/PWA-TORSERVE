# Отчет по ревью: VOICE_SEARCH_ANDROID10_SONY_ANALYSIS

**Дата:** 14 февраля 2026  
**Автор:** Antigravity (AI Assistant)  
**Статус:** ✅ Подтверждено (актуализировано 15 февраля 2026)

## Update 2026-02-15

- Пункты про активный `prompt(...)` более не актуальны: этот дефект уже закрыт в коде.
- Новый фокус ревью: поведение `popup:true` на Sony Android 10 и delayed completion до `ACTIVITY_RESULT`.
- Актуальный документ анализа и плана: `/Volumes/SSD Storage/PWA-TorServe/docs/VOICE_SEARCH_ANDROID10_SONY_ANALYSIS.md`.

## 1. Резюме

Изначальный ревью-вывод по проблемам voice UX был корректным, но часть пунктов относилась к состоянию кода до фикса `prompt-fallback`.

Текущее состояние:

- `prompt(...)` больше не является активной причиной сбоя;
- основной дефект сместился в popup-flow (`popup:true`) на Sony Android 10;
- результат распознавания в этом режиме часто приходит в приложение только после закрытия системной speech Activity.

## 2. Подтверждение из логов

По логам (`consolelog.md`, `bugreport.md`) подтверждено:

- старт `android.speech.action.RECOGNIZE_SPEECH` через `ResolverActivity`;
- переход в `GoogleTTSActivity`;
- пустые финальные результаты и `NO_SPEECH_DETECTED`;
- возврат в `com.torserve.pwa` через `wm_on_activity_result_called`;
- ошибка плагина `{"message":"0"}` в popup-flow трактуется как cancel/result-not-ok.

Это объясняет наблюдение пользователя: визуально «слушает», а прикладной результат появляется только после возврата из системного speech UI.

## 3. Актуальный Action Plan Status

1. `Stage prompt removal`: **Completed**
2. `Stage unified hook`: **Completed**
3. `Stage hybrid popup/non-popup`: **Planned**

## 4. Актуальный рабочий план (кратко)

1. Перевести primary-режим на `popup:false`.
2. Добавить fallback на `popup:true` только при timeout/empty/no-match.
3. Зафиксировать timeout `4000ms`.
4. Нормализовать ветки `cancel/no speech/no match`.
5. Добавить этапную телеметрию и прогнать QA-матрицу Sony/TCL.

## 5. Ответ на вопрос "Что думаешь?"

Ревью остается валидным в части архитектурного направления (единый voice-flow и управляемая обработка ошибок). На текущем этапе главный риск уже не `prompt`, а UX-зависимость от системного popup цикла на Sony Android 10.

Рекомендуемая следующая реализация: Hybrid mode как дефолт (`popup:false` primary -> `popup:true` fallback).
