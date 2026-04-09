import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { miniMapAPI, scenesAPI, uploadAPI } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

/* ─── Sahna Tanlash Modali ─────────────────────────────────────────────── */
const ScenePickerModal = ({ onSelect, onClose, slug }) => {
    const [allScenes, setAllScenes] = useState([]);
    const [loadingScenes, setLoadingScenes] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        scenesAPI.getAll(slug)
            .then((res) => {
                const data = res.data.data || res.data;
                setAllScenes(Array.isArray(data) ? data : []);
            })
            .catch(() => setAllScenes([]))
            .finally(() => setLoadingScenes(false));
    }, [slug]);

    const getTitle = (scene) => {
        if (!scene.title) return '';
        if (typeof scene.title === 'string') return scene.title;
        return scene.title.uz || scene.title.ru || scene.title.en || '';
    };

    const filtered = allScenes.filter((s) =>
        s.id?.toLowerCase().includes(search.toLowerCase()) ||
        getTitle(s).toLowerCase().includes(search.toLowerCase())
    );

    const getThumb = (scene) => {
        if (scene.image?.thumb) {
            return scene.image.thumb.startsWith('http')
                ? scene.image.thumb
                : `${API_BASE}/${scene.image.thumb.replace(/^\//, '')}`;
        }
        return null;
    };

    return createPortal(
        <div className="scene-picker-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="scene-picker-modal">
                <div className="scene-picker-header">
                    <h3 className="scene-picker-title">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        Sahna Tanlash
                    </h3>
                    <button className="scene-picker-close" onClick={onClose}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="scene-picker-search">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        placeholder="ID yoki nom bilan qidirish..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="scene-picker-body">
                    {loadingScenes ? (
                        <div className="scene-picker-loading">
                            <div className="admin-spinner" />
                            <p>Sahnalar yuklanmoqda...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="scene-picker-empty">
                            <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="8" y1="15" x2="16" y2="15" />
                                <line x1="9" y1="9" x2="9.01" y2="9" />
                                <line x1="15" y1="9" x2="15.01" y2="9" />
                            </svg>
                            <p>Hech qanday sahna topilmadi</p>
                        </div>
                    ) : (
                        <div className="scene-picker-grid">
                            {filtered.map((scene) => (
                                <button
                                    key={scene.id}
                                    className="scene-picker-card"
                                    onClick={() => onSelect(scene)}
                                >
                                    <div className="scene-picker-thumb">
                                        {getThumb(scene) ? (
                                            <img
                                                src={getThumb(scene)}
                                                alt={scene.title || scene.id}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            className="scene-picker-no-thumb"
                                            style={{ display: getThumb(scene) ? 'none' : 'flex' }}
                                        >
                                            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="scene-picker-info">
                                        <span className="scene-picker-id">{scene.id}</span>
                                        {getTitle(scene) && (
                                            <span className="scene-picker-name">{getTitle(scene)}</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
        , document.body);
};

/* ─── Asosiy MiniMapPage ───────────────────────────────────────────────── */
const MiniMapPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [miniMap, setMiniMap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [scenes, setScenes] = useState([]);

    // Modal holati: null yoki tanlash kerak bo'lgan pin indeksi
    const [pickerForIdx, setPickerForIdx] = useState(null);

    const mapImgRef = useRef();

    // MiniMap ma'lumotlarini yuklash
    useEffect(() => {
        miniMapAPI.get(slug)
            .then((res) => {
                const data = res.data.data || res.data;
                setMiniMap(data);
                setScenes(data?.scenes || []);
            })
            .catch(() => {
                setMiniMap({ image: '', width: 1920, height: 1080, scenes: [] });
            })
            .finally(() => setLoading(false));
    }, []);

    const showSuccess = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(''), 3000);
    };

    // MiniMap rasmi yuklash
    const handleImageUpload = async () => {
        const file = mapImgRef.current?.files[0];
        if (!file) { setError('Rasm tanlang'); return; }

        const fd = new FormData();
        fd.append('mapImage', file);
        setUploading(true);
        setError('');
        try {
            const res = await uploadAPI.miniMapImage(slug, fd);
            const imageUrl = res.data.data?.image;
            setMiniMap((p) => ({ ...p, image: imageUrl }));
            showSuccess('MiniMap rasmi yuklandi!');
        } catch (err) {
            setError(err.response?.data?.message || 'Yuklashda xato');
        } finally {
            setUploading(false);
        }
    };

    // MiniMap asosiy ma'lumotlarini saqlash
    const handleSaveBase = async () => {
        if (!miniMap?.image) { setError('Rasm URL majburiy'); return; }
        setSaving(true);
        setError('');
        try {
            await miniMapAPI.setImage(slug, {
                image: miniMap.image,
                width: parseInt(miniMap.width) || 1920,
                height: parseInt(miniMap.height) || 1080,
            });
            showSuccess('MiniMap asosiy ma\'lumotlari saqlandi!');
        } catch (err) {
            setError(err.response?.data?.message || 'Saqlashda xato');
        } finally {
            setSaving(false);
        }
    };

    // Scene pozitsiyalarini saqlash
    const handleSaveScenes = async () => {
        setSaving(true);
        setError('');
        try {
            const payload = scenes.map(({ id, xPercent, yPercent, icon }) => ({
                id,
                xPercent: parseFloat(xPercent),
                yPercent: parseFloat(yPercent),
                lat: parseFloat(yPercent),
                lng: parseFloat(xPercent),
                icon: icon || 'circle',
            }));
            await miniMapAPI.updateScenes(slug, payload);
            showSuccess('Sahna pozitsiyalari saqlandi!');
        } catch (err) {
            setError(err.response?.data?.message || 'Saqlashda xato');
        } finally {
            setSaving(false);
        }
    };

    const updateScene = (idx, field, value) => {
        setScenes((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });
    };

    const addScene = () => {
        setScenes((p) => [...p, { id: '', xPercent: 50, yPercent: 50, icon: 'pin' }]);
    };

    const removeScene = (idx) => {
        setScenes((p) => p.filter((_, i) => i !== idx));
    };

    // Modaldan sahna tanlanganda
    const handleSceneSelected = (scene) => {
        updateScene(pickerForIdx, 'id', scene.id);
        setPickerForIdx(null);
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-loading-center">
                    <div className="admin-spinner" />
                    <p>Yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page" style={{ userSelect: 'none' }}>

            {/* Sahna tanlash modali */}
            {pickerForIdx !== null && (
                <ScenePickerModal
                    slug={slug}
                    onSelect={handleSceneSelected}
                    onClose={() => setPickerForIdx(null)}
                />
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">Mini-Xarita ({slug})</h1>
                    <p className="page-subtitle">Interaktiv xarita konfiguratsiyasi</p>
                </div>
            </div>

            {error && <div className="admin-alert error">{error}</div>}
            {success && <div className="admin-alert success">{success}</div>}

            {/* === XARITA RASMI === */}
            <div className="form-card">
                <h2 className="form-section-title">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                    Xarita Fon Rasmi
                </h2>

                {miniMap?.image && (
                    <div className="minimap-preview" style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ position: 'relative', display: 'block', lineHeight: 0, fontSize: 0 }}>
                            <img
                                src={miniMap.image}
                                alt="MiniMap"
                                style={{ display: 'block', maxWidth: '100%', maxHeight: '560px', width: 'auto', height: 'auto' }}
                            />
                            {scenes.map((scene, idx) => (
                                <div
                                    key={idx}
                                    className="minimap-dot"
                                    style={{
                                        left: `${scene.xPercent}%`,
                                        top: `${scene.yPercent}%`,
                                    }}
                                    title={scene.id}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="upload-area">
                    <div className="upload-fields">
                        <div className="upload-field">
                            <label className="form-label">Xarita Rasmi (PNG/JPG)</label>
                            <label className="file-upload-btn">
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                Fayl tanlash
                                <input type="file" accept="image/*" ref={mapImgRef} style={{ display: 'none' }} />
                            </label>
                        </div>
                    </div>
                    <button type="button" className="btn-secondary" onClick={handleImageUpload} disabled={uploading}>
                        {uploading ? <><div className="admin-spinner-sm" /> Yuklanmoqda...</> : 'Rasmni Yuklash'}
                    </button>
                </div>

                <div className="form-grid-3">
                    <div className="form-field">
                        <label className="form-label">Image URL</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder={`${API_BASE}/uploads/minimap/...`}
                            value={miniMap?.image || ''}
                            disabled
                            style={{ opacity: 0.7, cursor: 'not-allowed' }}
                        />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Kenglik (px)</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="1920"
                            value={miniMap?.width !== undefined ? miniMap.width : 1920}
                            onChange={(e) => setMiniMap((p) => ({ ...p, width: e.target.value }))}
                        />
                    </div>
                    <div className="form-field">
                        <label className="form-label">Balandlik (px)</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="1080"
                            value={miniMap?.height !== undefined ? miniMap.height : 1080}
                            onChange={(e) => setMiniMap((p) => ({ ...p, height: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="form-actions" style={{ marginTop: '1rem' }}>
                    <button className="btn-primary" onClick={handleSaveBase} disabled={saving}>
                        {saving ? <><div className="admin-spinner-sm" /> Saqlanmoqda...</> : 'Asosiyni Saqlash'}
                    </button>
                </div>
            </div>

            {/* === SAHNA POZITSIYALARI === */}
            <div className="form-card">
                <div className="form-section-header">
                    <h2 className="form-section-title">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        Xaritadagi Sahnalar ({scenes.length})
                    </h2>
                    <button type="button" className="btn-secondary" onClick={addScene}>
                        + Sahna Qo&apos;shish
                    </button>
                </div>

                <p className="form-hint" style={{ marginBottom: '1rem' }}>
                    Har bir sahnaning xaritadagi joylashuvini % ko&apos;rsatib belgilang (0–100%)
                </p>

                {scenes.length === 0 ? (
                    <div className="pins-empty">
                        <p>Sahnalar qo&apos;shilmagan. Xaritaga sahna markerlarini qo&apos;shing.</p>
                    </div>
                ) : (
                    <div className="pins-list">
                        {scenes.map((scene, idx) => (
                            <div key={idx} className="pin-item">
                                <div className="pin-item-num">#{idx + 1}</div>
                                <div className="pin-item-fields">

                                    {/* ── Sahna ID tanlash ── */}
                                    <div className="form-field">
                                        <label className="form-label">Sahna ID</label>
                                        <button
                                            type="button"
                                            className="scene-id-picker-btn"
                                            onClick={() => setPickerForIdx(idx)}
                                        >
                                            {scene.id ? (
                                                <>
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                                        <circle cx="12" cy="10" r="3" />
                                                    </svg>
                                                    <span className="scene-id-value">{scene.id}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <circle cx="11" cy="11" r="8" />
                                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                    </svg>
                                                    <span className="scene-id-placeholder">Sahna tanlang...</span>
                                                </>
                                            )}
                                            <svg className="scene-id-chevron" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">X (%)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="0" max="100" step="0.1"
                                            value={scene.xPercent}
                                            onChange={(e) => updateScene(idx, 'xPercent', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Y (%)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min="0" max="100" step="0.1"
                                            value={scene.yPercent}
                                            onChange={(e) => updateScene(idx, 'yPercent', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Icon</label>
                                        <select
                                            className="form-input form-select"
                                            value={scene.icon || 'pin'}
                                            onChange={(e) => updateScene(idx, 'icon', e.target.value)}
                                        >
                                            <option value="circle">circle</option>
                                            <option value="pin">pin</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-icon-danger"
                                    onClick={() => removeScene(idx)}
                                >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                    <button className="btn-primary" onClick={handleSaveScenes} disabled={saving}>
                        {saving ? <><div className="admin-spinner-sm" /> Saqlanmoqda...</> : 'Pozitsiyalarni Saqlash'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MiniMapPage;
