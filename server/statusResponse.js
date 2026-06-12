export function scheduleBackgroundRefresh(refresh, onWarning = () => {}) {
    Promise.resolve()
        .then(() => refresh())
        .catch((err) => {
            onWarning(err)
        })
}

export function serializeStatusItems(items = []) {
    return items.map((item) => ({
        infoHash: item.infoHash,
        name: item.name,
        progress: item.progress,
        isReady: item.isReady,
        downloaded: item.downloaded,
        totalSize: item.totalSize,
        downloadSpeed: item.downloadSpeed,
        numPeers: item.numPeers,
        connectedPeers: item.connectedPeers,
        activePeers: item.activePeers,
        knownPeers: item.knownPeers,
        queuedPeers: item.queuedPeers,
        eta: item.eta,
        backend: item.backend || 'native',
        error: item.error || null,
        files: (item.files || []).map((file) => ({
            name: file.name,
            length: file.length,
            index: file.index
        }))
    }))
}
