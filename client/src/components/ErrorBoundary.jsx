/**
 * ErrorBoundary Component - Global error handler for TV interface
 * SEC-01: Prevents white screen of death on navigation/render crashes
 *
 * Features:
 * - Catches React render errors
 * - Shows TV-friendly error UI with restart button
 * - Logs errors for debugging
 * - D-pad friendly (focusable buttons)
 */
import { Component } from 'react'
import { reportClientEvent } from '../utils/clientTrace'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        }
    }

    static getDerivedStateFromError(error) {
        // Update state so next render shows fallback UI
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        // Log error for debugging
        console.error('[ErrorBoundary] Caught error:', error)
        console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack)

        this.setState({ errorInfo })

        // The TV console is unreachable, so the console lines above are lost the
        // moment the screen is photographed. Ship it to the server timeline.
        reportClientEvent({
            kind: 'react-render',
            message: error?.message ? `${error.name}: ${error.message}` : String(error),
            stack: error?.stack ? String(error.stack).slice(0, 2000) : null,
            componentStack: String(errorInfo?.componentStack || '').slice(0, 2000)
        })
    }

    handleReload = () => {
        window.location.reload()
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        })
    }

    render() {
        if (this.state.hasError) {
            // TV-friendly error UI
            return (
                <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
                    <div className="max-w-lg w-full text-center">
                        {/* Error Icon */}
                        <div className="text-8xl mb-6">⚠️</div>

                        {/* Title */}
                        <h1 className="text-3xl font-bold text-white mb-4">
                            Что-то пошло не так
                        </h1>

                        {/* Description */}
                        <p className="text-gray-400 text-lg mb-8">
                            Произошла ошибка при отображении интерфейса.
                            <br />
                            Попробуйте перезагрузить приложение.
                        </p>

                        {/* Error details (collapsed by default) */}
                        {this.state.error && (
                            <details className="mb-8 text-left bg-gray-800 rounded-lg p-4">
                                <summary className="text-gray-500 cursor-pointer focus:outline-none focus:text-white">
                                    Подробности ошибки
                                </summary>
                                <pre className="mt-3 text-xs text-red-400 overflow-auto max-h-32">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack && (
                                        <span className="text-gray-500">
                                            {this.state.errorInfo.componentStack}
                                        </span>
                                    )}
                                </pre>
                            </details>
                        )}

                        {/* Action Buttons - TV Friendly */}
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={this.handleReload}
                                autoFocus
                                className="w-full bg-purple-600 text-white py-4 px-8 rounded-xl text-xl font-bold
                                           hover:bg-purple-500 transition-colors
                                           focus:ring-4 focus:ring-purple-400 focus:outline-none focus:scale-105"
                            >
                                🔄 Перезагрузить
                            </button>

                            <button
                                onClick={this.handleReset}
                                className="w-full bg-gray-700 text-gray-300 py-3 px-6 rounded-xl text-lg
                                           hover:bg-gray-600 transition-colors
                                           focus:ring-4 focus:ring-gray-400 focus:outline-none focus:scale-105"
                            >
                                ↩️ Попробовать снова
                            </button>
                        </div>

                        {/* Hint for TV users */}
                        <p className="text-gray-600 text-sm mt-8">
                            Используйте пульт для навигации
                        </p>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
