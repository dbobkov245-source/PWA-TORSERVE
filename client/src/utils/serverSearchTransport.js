function createAbortError() {
    if (typeof DOMException === 'function') {
        return new DOMException('The operation was aborted.', 'AbortError')
    }

    const error = new Error('The operation was aborted.')
    error.name = 'AbortError'
    return error
}

function parseNativeJson(data) {
    if (typeof data === 'string') {
        try {
            return JSON.parse(data)
        } catch {
            throw new Error('Native HTTP returned non-JSON payload')
        }
    }

    return data || {}
}

export async function fetchServerSearchJson(requestUrl, options = {}) {
    const {
        signal,
        isNativePlatform = false,
        allowNativeFallback = true,
        nativeRequest = null
    } = options

    try {
        const response = signal
            ? await fetch(requestUrl, { signal })
            : await fetch(requestUrl)

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        return await response.json()
    } catch (fetchError) {
        if (fetchError?.name === 'AbortError' || signal?.aborted) {
            throw fetchError
        }

        if (!isNativePlatform || !allowNativeFallback || !nativeRequest) {
            throw fetchError
        }

        const nativeResponse = await nativeRequest()

        if (signal?.aborted) {
            throw createAbortError()
        }

        if (nativeResponse.status < 200 || nativeResponse.status >= 300) {
            throw new Error(`Native HTTP ${nativeResponse.status}`)
        }

        return parseNativeJson(nativeResponse.data)
    }
}
