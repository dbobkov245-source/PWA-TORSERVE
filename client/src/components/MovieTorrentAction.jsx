import { getMovieTorrentSummary } from '../utils/movieTorrentSearch.js'

function getButtonLabel(session) {
    const status = session?.status || 'idle'
    const count = session?.items?.length || 0

    if (status === 'error') return 'Торренты · ошибка'
    if (status === 'empty') return 'Торренты · 0'
    if (status === 'loading') {
        return count > 0 ? `Торренты · ${count} (поиск...)` : 'Торренты · поиск...'
    }
    return `Торренты · ${count}`
}

function getSummaryLabel(session) {
    const status = session?.status || 'idle'
    const count = session?.items?.length || 0

    if (status === 'error') return 'Ошибка поиска'
    if (status === 'empty') return 'Ничего не найдено'
    if (count > 0 && (status === 'ready' || status === 'loading')) {
        return getMovieTorrentSummary(session?.items || []).label
    }
    return ''
}

const MovieTorrentAction = ({ session, onOpen, buttonRef }) => {
    const buttonLabel = getButtonLabel(session)
    const summaryLabel = getSummaryLabel(session)

    return (
        <button
            ref={buttonRef}
            onClick={onOpen}
            className="focusable w-full h-full min-h-[56px] px-2 py-2 bg-purple-600 focus:bg-yellow-400 focus:text-black focus:ring-4 focus:ring-yellow-400 text-white font-bold rounded-xl transition-all flex flex-col items-center justify-center leading-tight"
        >
            <span>{buttonLabel}</span>
            {summaryLabel && (
                <span className="text-[11px] text-purple-200 mt-1 font-normal opacity-90 leading-tight">
                    {summaryLabel}
                </span>
            )}
        </button>
    )
}

export default MovieTorrentAction
