import { isRestrictedTrackerCandidate } from './trackerAccess.js'

export function getSearchResultActionKey(item) {
    if (item?.magnet) return item.magnet
    if (item?.provider && item?.id) return `${item.provider}:${item.id}`
    return item?.id || item?.title || ''
}

export async function resolveSearchResultMagnet(item, fetchJson) {
    if (item?.magnet?.startsWith('magnet:')) {
        return item.magnet
    }

    if (!item?.provider || !item?.id) {
        throw new Error('Search result is missing magnet resolution metadata')
    }

    const params = new URLSearchParams({
        provider: item.provider,
        id: item.id
    })

    const result = await fetchJson(`/api/v2/magnet?${params.toString()}`)
    const magnet = result?.magnet

    if (!magnet || !magnet.startsWith('magnet:')) {
        throw new Error(result?.error || 'Magnet not found')
    }

    return magnet
}

export async function verifySearchResultBeforeAdd(item, magnet, probeJson) {
    const status = item?.playabilityStatus || 'unknown'
    const peers = item?.preflight?.peers || 0

    if (status === 'playable' || (status === 'risky' && peers > 0)) {
        return {
            status,
            peers,
            source: 'cached'
        }
    }

    const probe = await probeJson(magnet, item)
    const probeStatus = probe?.status || 'unknown'
    const probePeers = probe?.peers || 0

    if (probeStatus === 'dead') {
        throw new Error('Торрент сейчас недоступен: у магнита нет активных пиров')
    }
    if (probeStatus === 'stalled') {
        throw new Error('Торрент отвечает, но не отдаёт данные: пиры есть, полезная раздача не начинается')
    }
    if (isRestrictedTrackerCandidate(item) && probeStatus !== 'playable') {
        throw new Error('Индекс показывает сиды закрытого трекера, но магнит пришёл без announce-адресов. Этот релиз в PWA-TorServe, вероятно, не скачивается')
    }

    return {
        status: probeStatus,
        peers: probePeers,
        source: 'probe'
    }
}
