# PWA-TorServe v2.8.1 — Патч: Починка провайдеров

## Диагноз

Jacred работает потому что использует голый `https.request` (без smartFetch).
RuTracker, Rutor, TorLook — все используют `smartFetch`, который через DoH резолвит IP
и подключается **напрямую по IP** с SNI. Это ломает TLS-хэндшейк у трекеров за Cloudflare
и shared hosting.

## Корневая причина

`smartFetch` в режиме `doh: 'full'` (единственный режим в v2.8.0):
1. Резолвит `rutracker.org` → `104.21.x.x` (Cloudflare IP)
2. Подключается к `104.21.x.x:443`
3. Отправляет SNI: `rutracker.org`

Cloudflare на shared IP часто **не маршрутизирует** по SNI к правильному origin —
возвращает заглушку, 403, reset или redirect на главную.

## Решение: `doh: 'dns-only'`

Добавлен новый режим в smartFetch: `doh: 'dns-only'`

| Режим | DoH резолв | Подключение | Для чего |
|-------|-----------|-------------|----------|
| `'full'` (default) | Да | По IP + SNI | TMDB, API, CDN |
| `'dns-only'` | Да (кэш) | По hostname | Трекеры |
| `false` | Нет | По hostname | Тест/fallback |

В режиме `dns-only` DoH резолвит DNS (обходя блокировку провайдера),
но подключение идёт обычным способом по hostname — TLS работает нормально.

## Изменённые файлы

### 1. `server/utils/doh.js`
- Добавлен параметр `doh` в options (`'full'` | `'dns-only'` | `false`)
- `getSmartConfig()` возвращает `resolvedIP: null` в режиме `dns-only`
- Добавлена обработка редиректов 301/302/307/308 (до 5 хопов)
- Host header ставится всегда
- Добавлен port в requestOptions при IP-подключении
- `rejectUnauthorized: false` по умолчанию

### 2. `server/providers/RuTrackerProvider.js`
- Все вызовы `smartFetch` с `doh: 'dns-only'`
- Проверка тела ответа после логина (не только cookies)
- Проверка HTTP статус-кодов
- Детекция редиректа на страницу логина

### 3. `server/providers/RutorProvider.js`
- Все вызовы `smartFetch` с `doh: 'dns-only'`
- Проверка HTTP статус-кодов
- Детекция Cloudflare-блокировки
- Логирование snippet при пустых результатах

### 4. `server/providers/TorLookProvider.js`
- Все вызовы `smartFetch` с `doh: 'dns-only'`
- Проверка HTTP статус-кодов
- Детекция redirect на главную страницу

## Как применить

```bash
# Из корня проекта:
cp patches/doh.js server/utils/doh.js
cp patches/RuTrackerProvider.js server/providers/RuTrackerProvider.js
cp patches/RutorProvider.js server/providers/RutorProvider.js
cp patches/TorLookProvider.js server/providers/TorLookProvider.js

# Пересборка Docker:
docker-compose down && docker-compose up -d --build
```

## Если dns-only не помогает

Значит блокировка на уровне DPI (не DNS). В этом случае:

1. Установить `https-proxy-agent`:
   ```
   npm install https-proxy-agent
   ```

2. В `.env` добавить:
   ```
   HTTPS_PROXY=socks5://your-proxy:1080
   ```

3. В `doh.js` в `smartFetch`, добавить:
   ```js
   import { HttpsProxyAgent } from 'https-proxy-agent'
   
   const proxyUrl = process.env.HTTPS_PROXY
   if (proxyUrl && !options.agent) {
       requestOptions.agent = new HttpsProxyAgent(proxyUrl)
   }
   ```

## Тестирование

После применения патча:
1. Открыть `/api/providers/diagnostics` — все провайдеры должны иметь `lastStatus: 'ok'`
2. Поискать что-нибудь — в `/api/v2/search?query=test` должны быть результаты от всех провайдеров
3. В логах Docker (`docker logs <container>`) проверить:
   - `[SmartFetch] GET rutracker.org -> rutracker.org (doh: dns-only, redirect: 0)`
   - `[RuTrackerProvider] Login successful`
   - `[RutorProvider] ✅ Search successful`
