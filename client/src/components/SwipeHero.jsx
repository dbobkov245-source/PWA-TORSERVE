import { useSpatialItem } from '../hooks/useSpatialNavigation'

export default function SwipeHero({ onOpen, isActive = true }) {
    const spatialRef = useSpatialItem('main')

    const activate = (event) => {
        if (!isActive) return
        if (event.type === 'click') onOpen()
        if (event.key === 'Enter') {
            event.preventDefault()
            event.stopPropagation()
            onOpen()
        }
    }

    return (
        <div
            ref={spatialRef}
            role="button"
            tabIndex={isActive ? 0 : -1}
            onClick={activate}
            onKeyDown={activate}
            className="focusable ml-8 mb-5 h-20 w-[calc(100%-64px)] max-w-[560px] rounded-2xl border-2 border-transparent bg-gradient-to-r from-[#17142A] via-[#20183A] to-[#111827] px-5 text-white shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition-transform focus:border-[#63F5C7] focus:outline-none focus:scale-[1.02] flex items-center justify-between gap-4"
        >
            <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xl" aria-hidden="true">🍿</span>
                <span className="min-w-0">
                    <span className="block truncate text-sm font-extrabold">Не знаете, что посмотреть?</span>
                    <span className="mt-1 block truncate text-[11px] font-medium text-violet-200/70">Несколько свайпов — и фильм найден</span>
                </span>
            </div>
            <span className="shrink-0 rounded-lg bg-[#63F5C7] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#080A0F] shadow-sm">
                Подобрать →
            </span>
        </div>
    )
}
