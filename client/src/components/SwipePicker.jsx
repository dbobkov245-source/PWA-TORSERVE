import { useEffect, useRef, useState } from 'react'
import { getBackdropUrl, getPosterUrl } from '../utils/discover'
import { getNextImageUrl, reportBrokenImage } from '../utils/tmdbClient'

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
    const item = items.length > 0 ? items[index % items.length] : null
    const imageUrl = getPosterUrl(item) || getBackdropUrl(item, 'w780')
    const [imageState, setImageState] = useState({ origin: imageUrl, src: imageUrl })
    const imageSrc = imageState.origin === imageUrl ? imageState.src : imageUrl

    useEffect(() => {
        dialogRef.current?.focus()
    }, [items.length])

    if (items.length === 0) return null

    const title = item.title || item.name || 'Без названия'
    const advance = () => setIndex((value) => (value + 1) % items.length)

    const handleKeyDown = async (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace'].includes(event.key)) return
        event.preventDefault()
        event.stopPropagation()
        if (event.key === 'ArrowLeft') {
            onSkip(item)
        }
        if (event.key === 'ArrowRight') {
            await onFavorite(item)
            advance()
        }
        if (event.key === 'Enter') {
            onOpenItem(item)
        }
        if (event.key === 'Escape' || event.key === 'Backspace') {
            onClose()
        }
    }

    const handleImageError = () => {
        if (!imageSrc) return
        reportBrokenImage(imageSrc)
        setImageState({ origin: imageUrl, src: getNextImageUrl(imageSrc) })
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
                        {imageSrc ? (
                            <img src={imageSrc} alt="" className="h-full w-full object-cover" onError={handleImageError} />
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
