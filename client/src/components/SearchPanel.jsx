/**
 * SearchPanel Component - RuTracker/Jacred search UI
 */

const SearchPanel = ({
    searchQuery,
    onSearchQueryChange,
    onSearch,
    onClose,
    onAddTorrent,
    searchResults,
    searchLoading
}) => {
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') onSearch()
    }

    return (
        <div className="mb-6 p-4 bg-gray-900 rounded-xl border border-purple-600/50 animate-fade-in">
            {/* Search Input */}
            <div className="flex gap-2 mb-4">
                <input
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Поиск на RuTracker..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none"
                    autoFocus
                />
                <button
                    onClick={onSearch}
                    disabled={searchLoading}
                    className="bg-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
                >
                    {searchLoading ? '...' : '🔍'}
                </button>
                <button
                    onClick={onClose}
                    className="bg-gray-800 px-4 rounded-lg"
                >
                    ✕
                </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2">
                    {searchResults.map((r, i) => (
                        <div
                            key={r.id || i}
                            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{r.title}</div>
                                <div className="text-xs text-gray-400 flex gap-3 mt-1">
                                    <span>📀 {r.size}</span>
                                    <span className="text-green-400">⬆ {r.seeders}</span>
                                    {r.tracker && <span className="text-purple-400">{r.tracker}</span>}
                                </div>
                            </div>
                            <button
                                onClick={() => onAddTorrent(r.magnet || r.id, r.title)}
                                disabled={searchLoading}
                                className="ml-3 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm font-bold disabled:opacity-50"
                            >
                                + Add
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Loading State */}
            {searchLoading && (
                <div className="text-center text-gray-400 py-4">
                    <span className="animate-pulse">Поиск...</span>
                </div>
            )}
        </div>
    )
}

export default SearchPanel
