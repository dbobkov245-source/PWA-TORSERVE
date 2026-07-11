export default function SwipeHero({ onOpen, isActive = true }) {
    const activate = (event) => {
        if (!isActive) return
        if (event.type === 'click' || event.key === 'Enter') onOpen()
    }

    return (
        <div
            role="button"
            tabIndex={isActive ? 0 : -1}
            onClick={activate}
            onKeyDown={activate}
            className="focusable mx-8 h-36 rounded-2xl border-2 border-transparent bg-gradient-to-r from-violet-950 to-violet-600 p-8 text-white shadow-xl transition-transform focus:border-emerald-300 focus:outline-none focus:scale-[1.02]"
        >
            <h2 className="text-2xl font-bold">Не знаете, что посмотреть?</h2>
            <p className="mt-1 text-violet-100">Подберём фильм или сериал по одному</p>
            <span className="mt-3 inline-block font-semibold text-emerald-300">Свайпнуть</span>
        </div>
    )
}
