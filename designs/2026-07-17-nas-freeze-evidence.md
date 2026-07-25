# NAS playback freeze — evidence record

Дата наблюдений: 2026-07-17, Europe/Moscow. Анализ выполнялся read-only через Android emulator, серверные диагностические API и SSH к Synology NAS. Production не изменялся.

## Контекст инцидента

- NAS: 2 CPU, 1,827 MB RAM, 3,145 MB swap.
- Node: PID 15033, контейнер `9363dea7e7a4f68f4ae4891c73e1fc982b4db956365111ed0cf397454a2ff7ab`, uptime более 10 суток.
- Фильм: `Backrooms (2026) WEB-DL 2160p HDR DV.mkv`, 21,409,854,361 bytes.
- Torrent: `134fb9042b5dfd2bff6a4505e9fa9dfc2e44e463`, progress 1.0, `fromDisk=true`.
- На первом снимке: 15,459 известных peers, 2 connected, 0 active; stream `stallCount=0`, `reopenCount=9`.

## Наблюдения во время просмотра

| Time MSK | Node RSS MB | MemAvailable MB | load1 | Stream MB/s | Node state / API |
|---|---:|---:|---:|---:|---|
| 21:09:59 | 515 | 190 | 0.67 | 2.50 | responsive |
| 21:10:09 | 549 | 159 | — | 4.00 | CPU 74% |
| 21:10:20 | 639 | 97 | — | — | `D`, API sample missing |
| 21:10:36 | 648 | 102 | 5.50 | — | API missing |
| 21:10:56 | 628 | 113 | 7.79 | — | pressure continues |
| 21:11:11 | 559 | 147 | 9.05 | — | GC/swap release visible |
| 21:11:27 | 552 | 170 | 9.64 | 0.75 | I/O component 29.03 |
| 21:11:41 | 669 | 91 | 11.33 | — | second heap/RSS expansion |
| 21:12:35 | 668 | 92 | 26.34 | — | severe queueing |
| 21:13:06 | 628 | 116 | 27.67 | — | slow recovery |

Другие подтверждающие точки:

- 19:56:38: CPU 97%, load1 37.39, stream 0.25 MB/s.
- Около 20:02: load1 снизился до 0.82, stream восстановился до 1.25–3 MB/s.
- Около 20:11: CPU 100%, load1 37.65, stream 0.25 MB/s.
- В длинной выборке iowait достигал 57–89%; `md1`, `md2`/`dm-0` и физические диски неоднократно были загружены на 99–100%.
- Read await доходил примерно до 150 ms, write await — примерно до 600 ms.
- Swap used держался примерно в диапазоне 1.54–1.60 GB; `kswapd0` был активен.
- Node был крупнейшим потребителем памяти: RSS 515–669 MB. Остальные видимые процессы обычно потребляли менее 27 MB RSS.
- Зафиксированы провалы event loop 5–21.7 s во время просмотра.

## Наблюдения при удалении

В 21:43:08 фриз повторился без активного просмотра и без активного torrent engine:

- active streams: 0;
- active torrents: 0;
- frozen torrents: 0;
- load1: 13.41, I/O component: 12.71;
- disk read: 46.81 MB/s;
- Node RSS: 527 MB;
- недавний event-loop lag: average 18.106 s, max 44.613 s.

Следующие `iostat` samples вернулись к 2–23% disk utilization. Это подтверждает короткий I/O shock от операции удаления/последующего сканирования, а не постоянную загрузку CPU.

## Проверенные участки кода

- Hard delete вызывает `removeTorrent(infoHash, true)`, затем асинхронный recursive `rm`, затем обязательный `refreshLocalLibrary(true)`.
- Forced library refresh рекурсивно выполняет `readdir`/`stat` по видеотеке.
- Completed torrent engine автоматически не retire/destroy; он остаётся живым после загрузки.
- Status path считает known peers через `Object.keys(swarm._peers).length`.
- Watchdog оценивает главным образом process RSS с порогами 800 MB и 1,000 MB. Он не учитывает host `MemAvailable`, swap-in/out и iowait. На NAS с 1.8 GB RAM состояние оставалось `ok` даже при фактическом paging storm.
- Synology compose задаёт `TORRENT_CONNECTIONS=55`, `TORRENT_MAX_REQUESTS=32`, `UV_THREADPOOL_SIZE=16`.

## Сверка production с checkout

SHA-256 совпал для `index.js`, `watchdog.js`, `localLibrary.js` и `streamMonitor.js`.

`torrent.js` отличается:

- NAS: `6039d89af17026209ccc73c37ffed6dba2d985b6790468db090baada802bc139`;
- checkout: `8465e6d63433f40675450de07f1ab473934e6b78bdeb3b540c3d921e28068946`.

Текстовый diff показал одно функциональное расхождение: production-файл не содержит минутный `startStallRecovery()` interval и его shutdown hook. Для полностью загруженного torrent локальная версия всё равно пропускает этот interval через `isTorrentCompleted`, поэтому это расхождение не объясняет текущий инцидент.

Последние связанные backend-изменения в git датированы 2026-04-04, 2026-05-10, 2026-05-24 и 2026-06-12. Изменения 2026-07-17 относятся к frontend TV performance. Признаков свежей backend-регрессии в совпадающих production-файлах не найдено.

## Выводы по уровню уверенности

### Доказано

1. Фризы совпадают не с нехваткой torrent pieces, а с системным storage starvation: RAM pressure, swap activity, высокий iowait и насыщение дисков.
2. В момент фриза Node блокируется в uninterruptible I/O (`D`), API перестаёт отвечать, event loop задерживается на секунды, а скорость stream падает.
3. Удаление является отдельным воспроизводящим триггером того же класса: recursive delete и forced full-library scan создают I/O shock даже при нуле активных streams/torrents.
4. Текущий health/watchdog не видит реальное истощение NAS и поэтому не способен заранее ограничить нагрузку.

### Высокая вероятность

1. Long-lived torrent engine удерживает достаточно V8/external/native state, чтобы на 2 GB NAS пересечь порог активного paging. Наиболее подозрительны peer map, wires, request buffers и связанное состояние engine.
2. Большой популярный 4K torrent с 15,459 known peers и uptime процесса более 10 суток выступил workload trigger. Это объясняет «раньше не было» без необходимости свежего deploy.
3. Расширение heap/RSS запускает GC и page-in/page-out; затем конкуренция stream read, swap и Btrfs metadata I/O душит один и тот же storage path.

### Пока не доказано

1. Какой именно класс объектов удерживает основную память: `_peers`, wires, buffers, DHT или другой cache.
2. Освобождается ли память после `engine.destroy()` и forced GC до приемлемого plateau.
3. Какая доля delete freeze приходится на Btrfs unlink, а какая — на `refreshLocalLibrary(true)`.

## План debug

1. **Чистый baseline после controlled container restart.** Зафиксировать RSS, heapUsed, external, arrayBuffers, MemAvailable, swap-in/out, major faults, event-loop p50/p95/p99/max при нуле engines.
2. **A/B одного файла и одного плеера.** A: воспроизведение полностью локального файла без torrent engine. B: тот же файл через один completed engine. По 30 минут, одинаковая позиция/сеть. Это отделит disk/player path от engine retention.
3. **Двухсекундный ring buffer.** Добавить GC duration/kind, event-loop histogram, process resource usage, engines, wires, known/queued/active peers, active byte ranges, stream throughput и operation markers.
4. **Heap snapshots только без просмотра.** Снять fresh/no-engine, after peer growth, after completion, after destroy+GC. Сравнить retained size по constructor и retaining paths.
5. **Изоляция delete path.** Раздельно измерить duration recursive `rm` и forced library scan. Отдельный прогон delete без scan и scan без delete.
6. **Только после доказательства — TDD fix по одной гипотезе.** Кандидаты: retire completed engine; bounded peer accounting; memory-aware connection cap; отложенный/инкрементальный library refresh; watchdog по host pressure.

## Критерии успеха

- 30 минут playback без API gaps и server stalls.
- Event-loop p99 менее 200 ms, max менее 1 s.
- RSS выходит на plateau; drift менее 50 MB за 30 минут.
- MemAvailable остаётся выше 300 MB, swap-in близок к нулю.
- Delete не запускает тяжёлый scan во время активного stream и не делает API недоступным.

## Реализация диагностического этапа

В ветке `codex/tv-home-performance` локально добавлена только наблюдаемость; production не изменялся:

- `7be530b` — Linux pressure reader: `MemAvailable`, swap used, swap-in/out, major faults, CPU iowait;
- `d2b1ce2` — process/V8 fields, process faults, event-loop p99/max и стоимость sampler в общей timeline;
- `8731377` — отдельные start/finish markers для recursive file removal и forced library scan;
- `d3e5396` — bounded collector диагностических endpoints с независимой фиксацией timeout/error.

Удаление и library scan не оптимизировались: сначала собираются раздельные duration и pressure markers. Флаги `TVPlayer`, torrent lifecycle и production infrastructure не менялись.

## Production-parity gate перед возможным deploy

Локальные SHA-256 после диагностических изменений:

```text
06c0369704d6288920654e3c024dfc78376e689d758d13773950f6ee0c982bd3  server/index.js
60bc8518e87e1c422776b588bf862c98db7abef19564be8fdb73daf8d9e24f7f  server/watchdog.js
2e08b63a90bee83bfadf1380f0c327955a9c3f782f5278de77e8cecd07e3f970  server/localLibrary.js
7011c378680164507f23a9bfa4787978589ebe690384e76bbe1a43c343dc266a  server/streamMonitor.js
8465e6d63433f40675450de07f1ab473934e6b78bdeb3b540c3d921e28068946  server/torrent.js
```

Read-only SSH-сверка NAS через временный ADB relay подтвердила все ожидаемые pre-debug hashes:

```text
1dc228c0730d12b095e89799a2193a0bf81e884ac348e7eed7fc69518b70e044  server/index.js
60bc8518e87e1c422776b588bf862c98db7abef19564be8fdb73daf8d9e24f7f  server/watchdog.js
6a035276cc0c20ea299491acc4e3ab66a7305ecaafcfbe9c3589e01a0e811f2c  server/localLibrary.js
a62a56e9c6842ed7041f327dc732ecf6563d845f95747849437092a4298abbbb  server/streamMonitor.js
6039d89af17026209ccc73c37ffed6dba2d985b6790468db090baada802bc139  server/torrent.js
```

Если будет одобрен instrumented deploy, его scope ограничен `index.js`, `localLibrary.js`, `streamMonitor.js` и двумя новыми файлами `server/diagnostics/`. Checkout-версия `torrent.js` в scope не входит.

## Read-only контрольная выборка после реализации

Файл `designs/2026-07-17-nas-freeze-readonly-current.json` содержит 60.5 секунды production sampling: 27 точек, 0 endpoint errors, два полных `/api/status` snapshots.

- active engines: 0; active streams: 0;
- load1: 0.39–0.58;
- RAM used: 1545–1554 из 1828 MB, то есть запас лишь 274–283 MB даже в idle;
- Node RSS: 354–364 MB за минуту;
- recent event-loop lags: 0; API отвечал без пропусков.

Сохранённый хвост timeline предыдущего фриза показывает другую фазу того же процесса:

- RAM used достигал 1730/1828 MB;
- CPU достиг 100%, load1 затем вырос до 12;
- stream throughput снизился с 1 MB/s до 0 на двух samples;
- физическое чтение оставалось 33–61 MB/s;
- фактические интервалы между samples растянулись с ~2 секунд до 12.5 и 24.6 секунд.

То есть видео не ждало недостающих torrent pieces: полностью локальный read конкурировал с paging/storage I/O, а сам Node/event loop переставал планироваться на десятки секунд.

## Локальная проверка

- backend: 124/124 tests passed;
- collector smoke: 5 samples, status snapshot и timeline, 0 errors;
- Vite production build: passed;
- Capacitor Android sync: passed;
- Gradle `assembleDebug`: passed, APK собран;
- client Vitest: 4 unrelated existing failures — три устаревших exact accessible-name expectations в `MovieTorrentAction.test.jsx` и один старый default IP `.70` при фактическом `.8.203`.

Следующий эксперимент — controlled A/B после instrumented deploy и одного controlled restart. Он не запускался, поскольку это изменение running NAS и требует отдельного одобрения.
