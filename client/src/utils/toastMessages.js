export function getAddToastMessage(playabilityStatus) {
    if (playabilityStatus === 'risky') {
        return { message: '⚠️ Мало пиров — стриминг под вопросом', type: 'warning' }
    }
    if (playabilityStatus === 'dead') {
        return { message: '🔴 Торрент мёртв (0 пиров) — возможны проблемы', type: 'error' }
    }
    return null
}
