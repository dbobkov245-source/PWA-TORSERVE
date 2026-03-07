import { getMovieTorrentSummary } from '../utils/movieTorrentSearch.js'

function getButtonLabel(session) {
    const status = session?.status || 'idle'
    const count = session?.items?.length || 0

    if (status === 'loading') return 'Торренты · поиск...'
    if (status === 'error') return 'Торренты · ошибка'
    if (status === 'empty') return 'Торренты · 0'
    return `Торренты · ${count}`
}

function getSummaryLabel(session) {
    const status = session?.status || 'idle'

    if (status === 'error') return 'Ошибка поиска'
    if (status === 'empty') return 'Ничего не найдено'
    if (status === 'ready') return getMovieTorrentSummary(session?.items || []).label
    return ''
}

const MovieTorrentAction = ({ session, onOpen, buttonRef }) => {
    const buttonLabel = getButtonLabel(session)
    const summaryLabel = getSummaryLabel(session)

    return (
        <div className="flex flex-col gap-1">
            <button
                ref={buttonRef}
                onClick={onOpen}
                className="focusable px-8 py-3 bg-purple-600 focus:bg-yellow-400 focus:text-black focus:ring-4 focus:ring-yellow-400 text-white font-bold rounded-xl transition-all"
            >
                {buttonLabel}
            </button>

            {summaryLabel && (
                <div className="text-sm text-gray-400 px-1">
                    {summaryLabel}
                </div>
            )}
        </div>
    )
}

export default MovieTorrentAction
