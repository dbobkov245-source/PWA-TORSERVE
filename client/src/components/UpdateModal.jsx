/**
 * UpdateModal — Модальное окно обновления приложения
 * TV-совместимый компонент с D-pad навигацией (Spatial Engine)
 */
import { useState, useCallback } from 'react';
import { useSpatialItem } from '../hooks/useSpatialNavigation';
import { downloadAndInstall } from '../utils/appUpdater';

export default function UpdateModal({ updateInfo, onDismiss }) {
    const [status, setStatus] = useState('idle'); // idle | downloading | error
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState('');

    // Spatial refs — same area as other modals
    const updateBtnRef = useSpatialItem('modal');
    const laterBtnRef = useSpatialItem('modal');

    const handleUpdate = useCallback(async () => {
        setStatus('downloading');
        setProgress(0);
        try {
            await downloadAndInstall(updateInfo.url, (pct) => setProgress(pct));
        } catch (e) {
            setStatus('error');
            setErrorMsg(e.message || 'Ошибка загрузки');
        }
    }, [updateInfo.url]);

    return (
        <div className="details-overlay" style={{ zIndex: 9999 }}>
            <div
                style={{
                    background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                    borderRadius: '24px',
                    padding: '3rem',
                    maxWidth: '500px',
                    width: '90%',
                    textAlign: 'center',
                    border: '1px solid #334155',
                    animation: 'fadeIn 0.3s ease-out'
                }}
            >
                {/* Header */}
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
                <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    color: '#f1f5f9',
                    marginBottom: '0.5rem'
                }}>
                    Доступно обновление
                </h2>
                <p style={{
                    fontSize: '1.1rem',
                    color: '#94a3b8',
                    marginBottom: '0.25rem'
                }}>
                    {updateInfo.currentVersion} → <span style={{ color: '#22c55e', fontWeight: 600 }}>{updateInfo.version}</span>
                </p>

                {/* Release Notes */}
                {updateInfo.notes && (
                    <p style={{
                        fontSize: '0.95rem',
                        color: '#64748b',
                        marginTop: '1rem',
                        padding: '0.75rem 1rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        lineHeight: 1.5
                    }}>
                        {updateInfo.notes}
                    </p>
                )}

                {/* Progress Bar (when downloading) */}
                {status === 'downloading' && (
                    <div style={{ marginTop: '2rem' }}>
                        <div style={{
                            height: '10px',
                            background: '#334155',
                            borderRadius: '5px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${progress}%`,
                                background: 'linear-gradient(90deg, #3b82f6 0%, #22c55e 100%)',
                                borderRadius: '5px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                        <p style={{
                            color: '#94a3b8',
                            marginTop: '0.75rem',
                            fontSize: '1rem'
                        }}>
                            Загрузка... {progress}%
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {status === 'error' && (
                    <p style={{
                        color: '#ef4444',
                        marginTop: '1.5rem',
                        fontSize: '0.95rem'
                    }}>
                        ❌ {errorMsg}
                    </p>
                )}

                {/* Buttons */}
                {status !== 'downloading' && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        marginTop: '2rem'
                    }}>
                        <button
                            ref={updateBtnRef}
                            tabIndex="0"
                            className="focusable"
                            onClick={handleUpdate}
                            style={{
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                color: 'white',
                                fontSize: '1.25rem',
                                fontWeight: 700,
                                padding: '1rem 2rem',
                                borderRadius: '14px',
                                border: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {status === 'error' ? 'Попробовать снова' : 'Обновить'}
                        </button>

                        {!updateInfo.forceUpdate && (
                            <button
                                ref={laterBtnRef}
                                tabIndex="0"
                                className="focusable"
                                onClick={onDismiss}
                                style={{
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    fontSize: '1rem',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid #475569',
                                    cursor: 'pointer'
                                }}
                            >
                                Позже
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
