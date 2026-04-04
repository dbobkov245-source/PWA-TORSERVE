/**
 * @param {'playable'|'unchecked'|'risky'|'stalled'|'dead'|string|undefined} playabilityStatus
 * @returns {{ message: string, type: 'warning'|'error' } | null}
 */
export function getAddToastMessage(playabilityStatus) {
    if (playabilityStatus === 'risky') {
        return { message: '⚠️ Мало пиров — стриминг под вопросом', type: 'warning' }
    }
    if (playabilityStatus === 'stalled') {
        return { message: '🟠 Пиры есть, но данные не идут — релиз, вероятно, зависнет', type: 'error' }
    }
    if (playabilityStatus === 'dead') {
        return { message: '🔴 Торрент мёртв (0 пиров) — возможны проблемы', type: 'error' }
    }
    return null
}
