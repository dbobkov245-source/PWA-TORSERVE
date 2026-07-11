# Hybrid Discovery Home Design

## Status

Approved by the user on 2026-07-11.

## Goal

Upgrade the Android TV home screen with Prisma-inspired mixed card formats and additional stable discovery sources while preserving PWA-TorServe's TV-first navigation, resilience cascade, low backend cost, and fast startup.

The finished home should feel editorial at the top and dense below it:

- a swipe-based recommendation entry point;
- wide editorial cards for live discovery;
- a ranked Top-10 row;
- personalized rows derived from existing user activity;
- existing compact poster rows for genres, countries, decades, history, and 4K content.

## Non-Goals

- Pixel-for-pixel cloning of Prisma.
- IMDb or MDBList integration in this release.
- A new recommendation service or paid API.
- Moving metadata storage to the backend.
- Changing torrent streaming, Android player intents, or `TVPlayer.java` flags.
- Variable-size virtualization.

## Product Direction

The selected direction is the hybrid layout.

The alternatives considered were:

1. **Evolution:** retain poster rows and add only a swipe banner plus a few new sources. Lowest risk, but limited visual impact.
2. **Hybrid:** use editorial and ranked layouts above the fold, then retain compact poster rows. Best balance of visual impact, information density, and Android TV performance.
3. **Prisma-style:** use wide descriptive cards across most of the home screen. Highest visual impact, but lower density and greater GPU and memory cost.

The hybrid direction was selected because it changes the character of the home screen without replacing working discovery and navigation patterns.

## Architecture

### Content Row Registry

`ContentRowsRegistry` becomes the single source of truth for home rows. Existing `DISCOVERY_CATEGORIES` entries are migrated into the registry instead of being rendered directly by `HomePanel`.

Each row configuration has a stable interface:

```js
{
  id: 'trakt_trending',
  title: 'Сегодня в тренде',
  icon: '🔥',
  layout: 'ranked',
  source: 'trakt',
  tier: 1,
  order: 30,
  cacheTTL: 15 * 60 * 1000,
  fetcher: fetchTraktTrending
}
```

Supported `layout` values:

- `editorial`: wide backdrop cards with title, two-line overview, quality, rating, media type, and year.
- `ranked`: Top-10 cards with a large ordinal number and backdrop art.
- `poster`: existing compact `HomeRow` poster cards.
- `personal`: poster layout backed by local history, favorites, watchlist, or recommendation results.

Registry entries also define `source`, `tier`, `order`, `cacheTTL`, and `fetcher`. Rendering code does not infer layout from row IDs.

### HomePanel Responsibilities

`HomePanel` remains the home orchestrator, but no longer owns individual row presentation rules. It is responsible for:

- loading registry entries by tier;
- maintaining the bounded lazy-load queue;
- isolating row failures;
- soft deduplication across the first three discovery rows;
- restoring vertical position and active row after returning from detail;
- handing each row to the correct renderer;
- coordinating global spatial focus with the sidebar and sub-views.

Presentation moves into focused components:

- `SwipeHero`
- `SwipePicker`
- `EditorialRow`
- `RankedRow`
- existing `HomeRow`

Every component is independently understandable and accepts normalized TMDB-compatible items.

### Metadata Access

All new metadata requests originate from `tmdbClient.js`.

- TMDB discovery continues through the existing resilience cascade.
- Trakt discovery uses a named metadata adapter exported by `tmdbClient.js`.
- The adapter calls a read-only server proxy endpoint that supplies required Trakt headers and keeps credentials outside the client bundle.
- Existing OAuth, scrobble, watched-marker, and watchlist operations remain in `traktApi.js`; only discovery metadata enters the new adapter.
- No new React component or discovery utility calls `fetch` directly.
- Personal recommendations call TMDB `/movie/{id}/recommendations` or `/tv/{id}/recommendations` through the same cascade.

The server endpoint remains a proxy: it does not persist catalog metadata and therefore preserves the zero-cost backend model.

### Image Access

JSON and image traffic remain isolated.

- JSON may use the full metadata cascade. Native DoH is attempted only after worker, Lampa, and server-proxy JSON routes fail.
- Backdrops and posters use image mirrors, image auto-ban, the server image proxy, and finally `wsrv.nl`.
- DoH and IP-direct requests are never used for images.

## Home Composition

Rows appear in this order:

1. `Продолжить просмотр`, when resume data exists.
2. `SwipeHero` with the action `Подобрать фильм`.
3. `Сейчас смотрят`, an editorial TMDB row.
4. `Сегодня в тренде`, a ranked Trakt Top-10 row.
5. `Для вас`, a personalized recommendation row.
6. `Есть в 4K`, when quality data has produced results.
7. `Trakt: смотреть позже`, when connected and non-empty.
8. Existing genre, country, decade, movie, and television poster rows.

Row titles display a compact source label:

- `TMDB`
- `Trakt`
- `Для вас`

Source labels communicate why a row exists; technical proxy-layer names are never shown.

## Components and Interaction

### SwipeHero

`SwipeHero` is a full-width, fixed-height banner above discovery rows. It uses already loaded candidates and does not issue a request for every interaction.

Pressing Enter opens `SwipePicker`.

### SwipePicker

`SwipePicker` is a focus-trapped TV modal that shows one candidate at a time.

Controls:

- Left: skip the candidate.
- Right: add the candidate to favorites and advance.
- Enter: open `MovieDetail` for the current candidate.
- Back or Escape: close the picker and restore focus to `SwipeHero`.

The candidate list is assembled from loaded editorial, ranked, and personalized rows. It excludes watched and already rejected items for the current session. Rejections are session-only; favorites use the existing persistent favorite flow.

### EditorialRow

Editorial cards show:

- TMDB backdrop;
- title;
- overview clamped to two lines;
- rating;
- year;
- movie or series label;
- available quality badges.

Exactly three cards are visible on a 4K TV at normal scale. Card height is fixed, preventing vertical layout shifts when metadata arrives.

### RankedRow

Ranked cards show ranks 1 through 10. The rank is part of presentation, not stored on the normalized media item. Missing items do not cause later cards to be renumbered after the row becomes interactive.

Trakt supplies order and TMDB IDs. Only the first three items are enriched immediately. Remaining details load with concurrency two as focus approaches them.

If Trakt is unavailable or not configured, the component receives TMDB trending data and keeps the ranked layout. The source label changes to `TMDB`.

### Poster Rows

Existing poster density and card behavior remain unchanged for long-tail rows. The last focusable card is `Показать все`.

After a row's horizontal offset exceeds one visible viewport width, a leading `В начало` shortcut is inserted into that row's navigation model. Activating it resets the horizontal position and focuses the first media card. The shortcut remains present until the row returns to its initial position so item indices do not change during navigation.

## TV Navigation

All new interactive surfaces use project navigation primitives and remain fully D-Pad accessible.

- Up and Down move between home rows.
- Left and Right move within a row.
- Enter opens a card or activates a row action.
- Back closes a modal or sub-view before leaving the home screen.
- Returning from `MovieDetail` restores the originating row, card index, and scroll offset.

Focus is represented by a mint border, `scale(1.05)`, and shadow. Mouse hover is not a navigation state. Every local navigation container receives `tabIndex={0}` through `containerProps`, stores item refs by index, and ignores all input when `isActive` is false.

Descriptions are clamped to two lines and every card layout uses fixed dimensions. Focus scaling receives enough overflow space so the border is never clipped.

## Data Flow

### Initial Load

1. Read the last valid normalized home snapshot from localStorage.
2. Render cached rows immediately when available.
3. Load tier-1 registry entries with at most three metadata requests in flight.
4. Build `SwipeHero` candidates from loaded or cached rows.
5. Start tier-2 rows after the first interactive frame.
6. Load tier-3 rows through the existing observer, scroll, and timed fallback queue with concurrency one.
7. Replace cached rows in place without resetting focus.

### Trakt Ranking Enrichment

1. Fetch the ordered Trakt discovery list through the metadata adapter.
2. Normalize the returned TMDB IDs and preserve original rank.
3. Resolve details for ranks 1-3 through the TMDB cascade with concurrency two.
4. Render the row as soon as those items are ready.
5. Resolve ranks 4-10 when focus moves within two cards of the next unresolved rank.
6. Cache normalized results for 15 minutes.

### Personalized Recommendations

1. Select the most recent usable movie or series from local history.
2. Request TMDB recommendations for that media type and ID.
3. Exclude watched items, favorites already present in earlier rows, and duplicate IDs.
4. Cache results for six hours.
5. Hide the row when no usable history or recommendation results exist.

## Caching

Cache lifetimes:

- live and trending TMDB rows: 10 minutes;
- Trakt discovery: 15 minutes;
- genre, country, and decade rows: 1 hour;
- personalized recommendations: 6 hours.

Cached normalized rows may be rendered stale during refresh. Failed refreshes keep the last valid cached row for up to 24 hours rather than replacing it with an error state.

## Failure Handling

Rows fail independently.

- First failure: one silent retry after one second, unless the provider circuit is already open.
- Repeated failure: open the provider circuit and hide the row for this session.
- Trakt discovery failure: use TMDB trending in the ranked layout.
- Empty Hero candidate set: hide `SwipeHero`.
- Image failure: advance through the existing image fallback chain without changing metadata-provider state.
- Cached data remains visible when refresh fails.

Technical errors are logged with row ID and provider. Users do not see raw exception text on the home screen.

## Performance Constraints

- Tier-1 metadata concurrency: maximum three.
- Trakt detail enrichment concurrency: maximum two.
- Tier-3 row concurrency: maximum one.
- Maximum row length on home: 20 items; ranked row: 10 items.
- All card sizes are fixed.
- No variable-size list or grid is introduced.
- Home rows never exceed 20 items. Any new result surface exceeding that limit must use `FixedSizeList` or `FixedSizeGrid` with overscan of at least three rows.
- Focus state is index-based and does not depend on DOM focus surviving virtualization.
- Backdrop requests never compete through JSON DoH logic.

Target behavior:

- cached home visible within 1 second;
- cold home interactive within 3 seconds under normal network conditions;
- no blank zones during fast vertical or horizontal navigation;
- focus always visible;
- no unbounded growth during a 30-minute navigation session.

## Testing

### Unit and Component Tests

- Registry preserves row order, layout, source, tier, and fetcher.
- Each layout selects the correct renderer.
- New discovery metadata paths do not use direct `fetch` outside `tmdbClient.js`.
- Trakt ranking preserves rank while details resolve lazily.
- Trakt failure switches the ranked row to TMDB.
- Row failures do not remove successful neighboring rows.
- Trakt enrichment never exceeds concurrency two.
- Tier-3 loading never exceeds concurrency one.
- `SwipePicker` handles skip, favorite, open, and Back.
- Returning from detail restores row index, card index, and scroll offsets.
- Image URLs never enter DoH or IP-direct code paths.

### Emulator Verification

- 1080p and 4K layouts.
- Fast repeated D-Pad input.
- Trakt disconnected and Trakt unreachable.
- Primary TMDB proxy unavailable.
- Slow and failing image mirrors.
- Return from an external player.
- Thirty minutes of navigation while observing memory behavior.

### Completion Gate

- Targeted tests pass.
- Existing client and server test suites pass.
- Production SPA build succeeds.
- Android APK build succeeds.
- D-Pad navigation is verified in the running emulator.
- No new metadata call bypasses `tmdbClient.js`.

## Implementation Boundaries

The implementation should be split into reviewable stages:

1. Registry schema and renderer selection.
2. Editorial and ranked components with TV navigation.
3. Trakt discovery proxy and resilient metadata adapter.
4. Personalized recommendation row.
5. Swipe Hero and picker.
6. Home integration, cache restore, focus restoration, and performance tuning.
7. Integrated tests, SPA build, emulator verification, and APK build.

No stage changes torrent-engine behavior or native player intent flags.
