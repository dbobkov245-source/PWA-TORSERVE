import { useState, useEffect } from 'react'

function App() {
  const [torrents, setTorrents] = useState([])
  const [magnet, setMagnet] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setTorrents(data.torrents)
    } catch (err) {
      console.error('Error fetching status:', err)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [])

  const addTorrent = async (e) => {
    e.preventDefault()
    if (!magnet) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ magnet })
      })
      if (!res.ok) throw new Error(await res.text())
      setMagnet('')
      fetchStatus()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getIntentLink = (infoHash, fileIndex, fileName) => {
    const host = window.location.hostname
    const port = window.location.port
    // Intent for Vimu
    // intent://<HOST>:<PORT>/stream/<HASH>/<INDEX>#Intent;scheme=http;type=video/*;title=<TITLE>;end;
    const intent = `intent://${host}:${port}/stream/${infoHash}/${fileIndex}#Intent;scheme=http;type=video/*;title=${encodeURIComponent(fileName)};end;`
    return intent
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-500">PWA-TorServe</h1>

      <form onSubmit={addTorrent} className="mb-8 max-w-2xl mx-auto flex gap-2">
        <input
          type="text"
          value={magnet}
          onChange={(e) => setMagnet(e.target.value)}
          placeholder="Paste Magnet URI..."
          className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-bold disabled:opacity-50 transition-colors"
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </form>

      {error && <div className="text-red-500 text-center mb-4 bg-red-900/20 p-2 rounded">{error}</div>}

      <div className="grid gap-4 max-w-4xl mx-auto">
        {torrents.map((t) => (
          <div key={t.infoHash} className="bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-semibold truncate flex-1 mr-4 text-gray-100">{t.name || 'Fetching Metadata...'}</h2>
              <div className="text-right">
                <div className="text-sm text-gray-400">
                  {(t.progress * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">
                  {(t.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s • {t.numPeers} peers
                </div>
              </div>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${t.progress * 100}%` }}></div>
            </div>

            <div className="space-y-2">
              {t.files.map((f) => (
                <div key={f.index} className="flex justify-between items-center bg-gray-700/50 p-3 rounded hover:bg-gray-700 transition-colors">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="truncate text-sm font-medium">{f.name}</div>
                    <div className="text-xs text-gray-400">{(f.length / 1024 / 1024).toFixed(0)} MB</div>
                  </div>
                  <a
                    href={getIntentLink(t.infoHash, f.index, f.name)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-bold shadow-sm transition-colors whitespace-nowrap"
                  >
                    Play
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
        {torrents.length === 0 && (
          <div className="text-center text-gray-500 mt-10 p-8 bg-gray-800/50 rounded-lg border border-gray-700 border-dashed">
            No active torrents. Add a magnet link to start.
          </div>
        )}
      </div>
    </div>
  )
}

export default App
