# Playback durability: минимальный дизайн

Дата: 2026-07-24  
Статус: design only — реализация и server API не авторизованы.

## Текущее состояние

`client/src/utils/watchHistory.js` синхронно хранит незавершённые просмотры в
`localStorage.watch_history_v1`.

- Ключ записи: `lowercase(infoHash):fileIndex`.
- Запись начинается после 2 минут.
- 95% или `finished=true` удаляет resume entry.
- Максимум 30 записей, newest-first.
- `TVPlayer.play()` возвращает результат после закрытия внешнего плеера, и App
  сразу вызывает `recordPlaybackResult`.

Плюс текущей схемы — синхронный hot path. Минус — WebView storage может быть
очищен при обновлении/сбросе данных, а между устройствами история не переносится.

## Рекомендуемый Phase A: localStorage + Preferences

Не менять server API. Оставить `localStorage` быстрым синхронным источником для
первого render и немедленной записи результата плеера. Добавить durable mirror
в Capacitor Preferences, который переживает APK update.

Новый ключ в обоих хранилищах: `watch_history_v2`.

```json
{
  "schemaVersion": 2,
  "revision": 17,
  "updatedAt": 1784910000000,
  "entries": {
    "abcdef:0": {
      "infoHash": "abcdef",
      "fileIndex": 0,
      "fileName": "movie.mkv",
      "torrentName": "Movie",
      "tmdbId": 603,
      "mediaType": "movie",
      "position": 600000,
      "duration": 7200000,
      "updatedAt": 1784910000000
    }
  },
  "tombstones": {
    "oldhash:0": 1784900000000
  }
}
```

### Write path

1. Нормализовать player result.
2. Синхронно записать новый envelope в `localStorage` — это сохраняет
   обязательный immediate save.
3. Обновить React resume state.
4. Поставить snapshot в одну сериализованную очередь
   `Preferences.set`; более новый revision заменяет ещё не начавшийся snapshot.
5. Ошибка Preferences не отменяет local save и не блокирует UI, но пишется
   одной bounded diagnostic строкой.

Tombstone обязателен для finished/delete: без него более старый Preferences
snapshot может воскресить уже удалённую запись.

### Startup/hydration

1. Синхронно прочитать `localStorage.watch_history_v2`.
2. Если v2 отсутствует, мигрировать валидные записи из
   `localStorage.watch_history_v1` в памяти.
3. Асинхронно прочитать `Preferences.watch_history_v2`.
4. Слить local и Preferences по ключу:
   самая большая `updatedAt` между entry и tombstone побеждает.
5. Нормализовать, применить retention, записать одинаковый следующий revision
   в оба storage и обновить React state.
6. Не удалять `watch_history_v1`, пока v2 не записан успешно хотя бы в
   localStorage. После успешной миграции оставить v1 нетронутым на один release;
   следующий release может удалить его.

Повреждённый JSON, неизвестная schema version или отдельная невалидная запись
не должны ломать весь history: envelope отклоняется либо запись пропускается с
bounded warning.

## Retention

- Незавершённые entries: текущий лимит 30, newest-first.
- Дополнительно удалить entries старше 180 дней.
- Tombstones: 30 дней, затем удалить.
- Finished entry не хранить как активную позицию.
- Удаление торрента создаёт tombstones для всех его file keys.
- `fileName`/`torrentName` ограничить разумной длиной перед persistence, чтобы
  повреждённые внешние metadata не раздували Preferences.

## Phase B: optional server sync

Не делать без отдельного согласования. Он расширяет server API и меняет privacy
boundary.

Минимальная форма:

- `GET /api/watch-history` → envelope + opaque server revision/ETag.
- `PUT /api/watch-history` с `If-Match` → atomic compare-and-swap.
- Клиент при `409/412` читает server envelope, сливает entries/tombstones и
  повторяет один раз.
- `deviceId` нужен только для диагностики происхождения записи; конфликт
  решается не device priority, а revision/updatedAt. Для надёжной синхронизации
  между устройствами предпочтительнее server-assigned revision/time, потому что
  часы Android TV могут расходиться.

### Multi-device trade-off

- Preferences: минимальная сложность, offline-first, нет новых privacy/API
  рисков; не переносит history на другой телевизор и удаляется при uninstall.
- Server sync: перенос и общий Continue Watching; требует API, conflict
  semantics, аутентификацию/изоляцию пользователей и хранит чувствительные
  torrent/file names на сервере.
- Для текущего single-user self-hosted продукта Phase A даёт лучший
  risk/value. Phase B стоит включать только с явным opt-in.

## Проверки перед реализацией

- Migration v1 → v2, включая malformed/partial v1.
- Local newer / Preferences newer / equal timestamps.
- Tombstone не даёт воскресить finished/delete entry.
- 30-entry и 180-day retention; 30-day tombstone GC.
- Несколько быстрых player results сохраняются в revision order.
- Preferences failure оставляет немедленный localStorage result доступным.
- APK update сохраняет resume; clear WebView storage восстанавливает его из
  Preferences.
- Finished playback и torrent delete не возвращаются после restart.
- Если Phase B будет одобрен: два устройства, offline edits, CAS conflict,
  deletion conflict и privacy/authorization tests.

