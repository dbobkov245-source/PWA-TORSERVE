import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SearchPanel from './SearchPanel.jsx'

// A jac.red row for "Dune: Part Two" as /api/v2/search now returns it.
const duneUhd = {
    id: 'dune-uhd',
    title: 'Дюна: Часть вторая / Dune: Part Two / 2024 / 4K, HEVC, HDR, Dolby Vision / WEB-DL (2160p)',
    size: '30.82 GB',
    sizeBytes: 33092723015,
    seeders: 2564,
    health: 'excellent',
    tracker: 'rutor',
    magnet: 'magnet:?xt=urn:btih:5ef1461522b909f825ce478dd7eccfdcfddd52d6',
    tags: ['2160p', 'hevc', 'hdr', 'dv'],
    release: {
        quality: 2160,
        hdr: true,
        voices: ['Дубляж', 'Сербин', 'Яроцкий'],
        video: { codec: 'hevc', width: 3840, height: 1606 },
        audioChannels: 6,
        audioLanguages: ['rus', 'eng'],
        subtitleLanguages: ['rus', 'eng']
    }
}

describe('SearchPanel result row', () => {
    it('shows the release badges under the torrent title', () => {
        render(
            <SearchPanel
                searchQuery="Dune: Part Two"
                onSearchQueryChange={vi.fn()}
                onSearch={vi.fn()}
                onForceRefresh={vi.fn()}
                onClose={vi.fn()}
                onAddTorrent={vi.fn()}
                searchResults={[duneUhd]}
                searchLoading={false}
            />
        )

        // Filter chips above the list also say "HDR"; look inside the row.
        const row = within(screen.getByText(duneUhd.title).closest('button'))
        for (const label of ['4K', 'HDR', 'DV', '5.1', 'Дубляж, Сербин +1', 'Суб']) {
            expect(row.getByText(label)).toBeTruthy()
        }
        expect(row.getByText('Дубляж, Сербин +1').getAttribute('title')).toBe('Дубляж, Сербин, Яроцкий')
    })
})
