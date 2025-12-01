import WebTorrent from 'webtorrent-hybrid'
import process from 'process'
import dotenv from 'dotenv'

dotenv.config()

const client = new WebTorrent()

// Handle errors to prevent crash
client.on('error', (err) => {
    console.error('WebTorrent Client Error:', err.message)
})

export const addTorrent = (magnetURI) => {
    return new Promise((resolve, reject) => {
        // Check if already exists
        const existing = client.get(magnetURI)
        if (existing) {
            console.log('Torrent already exists:', existing.infoHash)
            return resolve(existing)
        }

        const downloadPath = process.env.DOWNLOAD_PATH || '/tmp/webtorrent'
        console.log(`Adding torrent to path: ${downloadPath}`)

        try {
            client.add(magnetURI, { path: downloadPath }, (torrent) => {
                console.log('Torrent added:', torrent.infoHash)
                resolve(torrent)
            })
        } catch (err) {
            console.error('Error adding torrent:', err)
            reject(err)
        }
    })
}

export const getClient = () => client
