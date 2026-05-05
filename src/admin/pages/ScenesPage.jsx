import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { scenesAPI, resolveImageUrl } from '../services/api';

const ScenesPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [scenes, setScenes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deletingId, setDeletingId] = useState(null);
    const [search, setSearch] = useState('');

    const fetchScenes = async () => {
        setLoading(true);
        try {
            const res = await scenesAPI.getAll(slug);
            setScenes(res.data.data || res.data || []);
            setError('');
        } catch {
            setError('Sahnalarni yuklashda xato yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScenes();
    }, [slug]);

    const handleDelete = async (sceneId) => {
        if (!window.confirm(`"${sceneId}" sahnaini o'chirishni tasdiqlaysizmi?`)) return;
        setDeletingId(sceneId);
        setError('');
        try {
            await scenesAPI.delete(slug, sceneId);
            setScenes((prev) => prev.filter((s) => s.id !== sceneId));
        } catch (err) {
            setError(err.response?.data?.message || 'O\'chirishda xato');
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = scenes.filter((s) =>
        s.id?.toLowerCase().includes(search.toLowerCase()) ||
        s.title?.uz?.toLowerCase().includes(search.toLowerCase()) ||
        s.title?.en?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="admin-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sahnalar ({slug})</h1>
                    <p className="page-subtitle">{scenes.length} ta panoramik sahna</p>
                </div>
                <Link to={`/admin/modules/${slug}/scenes/new`} className="btn-primary" id="create-scene-btn">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Yangi Sahna
                </Link>
            </div>

            {/* Search */}
            <div className="search-bar-wrap">
                <div className="search-bar">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="ID yoki nom bilan qidirish..."
                        className="search-input"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Error */}
            {error && <div className="admin-alert error">{error}</div>}

            {/* Loading */}
            {loading ? (
                <div className="admin-grid-loading">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="scene-card skeleton" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="admin-empty">
                    <svg width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <p>Sahnalar topilmadi</p>
                    <Link to={`/admin/modules/${slug}/scenes/new`} className="btn-primary">Birinchi sahnani yarating</Link>
                </div>
            ) : (
                <div className="scenes-grid">
                    {filtered.map((scene) => (
                        <div key={scene.id} className="scene-card">
                            {/* Thumbnail */}
                            <div className="scene-card-thumb">
                                {scene.image?.thumb ? (
                                    <img
                                        src={resolveImageUrl(scene.image.thumb)}
                                        alt={scene.title?.uz || scene.id}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.classList.add('scene-card-no-img-fallback');
                                        }}
                                    />
                                ) : (
                                    <div className="scene-card-no-img">
                                        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                            <rect x="3" y="3" width="18" height="18" rx="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <polyline points="21 15 16 10 5 21" />
                                        </svg>
                                    </div>
                                )}
                                <div className="scene-card-badge">{scene.pins?.length || 0} pin</div>
                            </div>

                            {/* Info */}
                            <div className="scene-card-body">
                                <h3 className="scene-card-title">{scene.title?.uz || scene.title?.en || '—'}</h3>
                                <p className="scene-card-id">
                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                                        <line x1="7" y1="7" x2="7.01" y2="7" />
                                    </svg>
                                    {scene.id}
                                </p>
                                {(scene.lat && scene.lng) && (
                                    <p className="scene-card-coords">
                                        📍 {scene.lat?.toFixed(4)}, {scene.lng?.toFixed(4)}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="scene-card-actions">
                                <button
                                    className="btn-icon-sm"
                                    onClick={() => navigate(`/admin/modules/${slug}/scenes/${scene.id}`)}
                                    title="Tahrirlash"
                                >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Tahrirlash
                                </button>
                                <button
                                    className="btn-icon-sm danger"
                                    onClick={() => handleDelete(scene.id)}
                                    disabled={deletingId === scene.id}
                                    title="O'chirish"
                                >
                                    {deletingId === scene.id ? (
                                        <div className="admin-spinner-sm" />
                                    ) : (
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                            <path d="M10 11v6M14 11v6" />
                                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                        </svg>
                                    )}
                                    O'chirish
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ScenesPage;
