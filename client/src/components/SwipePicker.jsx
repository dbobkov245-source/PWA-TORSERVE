import { useEffect, useRef, useState } from 'react'

const noop = () => {}

export default function SwipePicker({
    items = [],
    onSkip = noop,
    onFavorite = noop,
    onOpenItem = noop,
    onClose = noop,
}) {
    const [index, setIndex] = useState(0)
    const dialogRef = useRef(null)

    useEffect(() => {
        dialogRef.current?.focus()
    }, [items.length])

    if (items.length === 0) return null

    const item = items[index % items.length]
    const title = item.title || item.name || 'Без названия'
    const poster = item.poster || item.posterUrl || item.backdrop || item.backdropUrl
    const advance = () => setIndex((value) => (value + 1) % items.length)

    const handleKeyDown = async (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            onSkip(item)
            advance()
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault()
            await onFavorite(item)
            advance()
        }
        if (event.key === 'Enter') {
            event.preventDefault()
            onOpenItem(item)
        }
        if (event.key === 'Escape' || event.key === 'Backspace') {
            event.preventDefault()
            onClose()
        }
    }

    const keepFocus = (event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            event.currentTarget.focus()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-8">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Подбор фильма или сериала"
                tabIndex={0}
                onBlur={keepFocus}
                onKeyDown={handleKeyDown}
                className="w-full max-w-4xl rounded-3xl border-4 border-emerald-300 bg-zinc-950 p-8 text-white shadow-2xl outline-none"
            >
                <div className="flex min-h-[24rem] items-center gap-10">
                    <div className="h-80 w-56 shrink-0 overflow-hidden rounded-2xl bg-violet-950">
                        {poster ? (
                            <img src={poster} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <div className="flex h-full items-center justify-center p-6 text-center text-violet-200">
                                Постер недоступен
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
                            Выберите действие
                        </p>
                        <h2 className="mt-4 text-4xl font-bold">{title}</h2>
                        {item.overview && (
                            <p className="mt-5 line-clamp-5 text-lg leading-relaxed text-zinc-300">
                                {item.overview}
                            </p>
                        )}
                    </div>
                </div>
                <div className="mt-6 flex items-center justify-center gap-8 border-t border-zinc-700 pt-6 text-base text-zinc-200">
                    <span>← Пропустить</span>
                    <span>Enter Открыть</span>
                    <span>В избранное →</span>
                    <span>Назад Закрыть</span>
                </div>
            </div>
        </div>
    )
}
