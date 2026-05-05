import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { miniMapAPI, scenesAPI, uploadAPI, resolveImageUrl } from '../services/api';

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
            return resolveImageUrl(scene.image.thumb);
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
    const [searchParams, setSearchParams] = useSearchParams();
    const [miniMap, setMiniMap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const showErrorTrace = (msg, id) => {
        setError(msg);
        if (id) {
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('validation-error-outline');
                setTimeout(() => el.classList.remove('validation-error-outline'), 3500);
            }
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Qavatlar rejimi
    const [floors, setFloors] = useState([]);
    const [defaultFloor, setDefaultFloor] = useState(1);
    
    const initialTab = searchParams.get('tab');
    const [activeFloorTab, _setActiveFloorTab] = useState(initialTab !== null ? parseInt(initialTab, 10) : null);

    const setActiveFloorTab = (idx) => {
        _setActiveFloorTab(idx);
        setSearchParams(prev => {
            if (idx !== null) {
                prev.set('tab', idx);
            } else {
                prev.delete('tab');
            }
            return prev;
        }, { replace: true });
    };

    // Eski format (1 qavatli)
    const [scenes, setScenes] = useState([]);

    // Modal holati
    const [pickerForIdx, setPickerForIdx] = useState(null);
    const [pickerContext, setPickerContext] = useState(null); // 'legacy' yoki floorIndex

    const mapImgRef = useRef();
    
    // ─── PIN DRAGGING LOGIC ───
    const [draggingPin, setDraggingPin] = useState(null); // { context, idx, container }

    const handlePinDragStart = (e, context, idx) => {
        e.preventDefault();
        e.stopPropagation();
        // Eng yaqin rasm konteynerini topamiz
        const container = e.currentTarget.closest('.minimap-drag-container');
        if (container) {
            setDraggingPin({ context, idx, container });
        }
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!draggingPin) return;
            const { context, idx, container } = draggingPin;
            
            const rect = container.getBoundingClientRect();
            let x = ((e.clientX - rect.left) / rect.width) * 100;
            let y = ((e.clientY - rect.top) / rect.height) * 100;

            // Chegaralash (0-100%)
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            // 1 xona aniqlikda yaxlitlash
            x = Math.round(x * 10) / 10;
            y = Math.round(y * 10) / 10;

            if (context === 'legacy') {
                setScenes(prev => {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], xPercent: x, yPercent: y };
                    return updated;
                });
            } else {
                setFloors(prev => {
                    const updated = [...prev];
                    const floor = { ...updated[context] };
                    const fScenes = [...(floor.scenes || [])];
                    fScenes[idx] = { ...fScenes[idx], xPercent: x, yPercent: y };
                    floor.scenes = fScenes;
                    updated[context] = floor;
                    return updated;
                });
            }
        };

        const handleMouseUp = () => {
            if (draggingPin) setDraggingPin(null);
        };

        if (draggingPin) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingPin]);

    // ── Qavatlar rejimi bormi-yo'qmi ──
    const hasFloors = floors.length > 0;
    const activeFloor = hasFloors ? floors.find((_, i) => i === activeFloorTab) || floors[0] : null;

    // MiniMap ma'lumotlarini yuklash
    useEffect(() => {
        miniMapAPI.get(slug)
            .then((res) => {
                const data = res.data.data || res.data;
                setMiniMap(data);
                if (data?.floors && data.floors.length > 0) {
                    setFloors(data.floors);
                    setDefaultFloor(data.defaultFloor || data.floors[0].floor);
                    
                    const currentTab = searchParams.get('tab');
                    if (currentTab === null) {
                        setActiveFloorTab(0);
                    } else {
                        const tabIdx = parseInt(currentTab, 10);
                        if (tabIdx >= data.floors.length) {
                            setActiveFloorTab(data.floors.length - 1);
                        }
                    }
                    setScenes([]);
                } else {
                    setScenes(data?.scenes || []);
                    setFloors([]);
                }
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

    // ── MiniMap rasmi yuklash (Avtomatik) ──
    const handleImageUpload = async (e) => {
        const file = e?.target?.files?.[0] || mapImgRef.current?.files[0];
        if (!file) return;

        const fd = new FormData();
        fd.append('mapImage', file);
        setUploading(true);
        setError('');
        try {
            const res = await uploadAPI.miniMapImage(slug, fd);
            const { image: imageUrl, width, height } = res.data.data || {};
            if (hasFloors && activeFloorTab !== null) {
                // Qavat rejimida — aktiv qavatga rasm + o'lchamlarni yuklash
                setFloors(prev => {
                    const updated = [...prev];
                    updated[activeFloorTab] = {
                        ...updated[activeFloorTab],
                        image: imageUrl,
                        width: width || updated[activeFloorTab].width,
                        height: height || updated[activeFloorTab].height,
                    };
                    return updated;
                });
            } else {
                setMiniMap((p) => ({ ...p, image: imageUrl, width: width || p.width, height: height || p.height }));
            }
            showSuccess(`Rasm yuklandi! (${width}×${height})`);
        } catch (err) {
            setError(err.response?.data?.message || 'Yuklashda xato');
        } finally {
            setUploading(false);
            if (e?.target) e.target.value = null;
            else if (mapImgRef.current) mapImgRef.current.value = null;
        }
    };

    // ── Eski format: saqlash ──
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

    // ── Eski format: scene pozitsiyalarini saqlash ──
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

    // ══════════════════════════════════════════════════════════
    //  QAVATLAR BOSHQARUVI
    // ══════════════════════════════════════════════════════════

    const addFloor = () => {
        const maxFloor = floors.length > 0 ? Math.max(...floors.map(f => f.floor)) : 0;
        const newFloor = {
            floor: maxFloor + 1,
            label: { uz: `${maxFloor + 1}-qavat`, ru: `${maxFloor + 1} этаж`, en: `Floor ${maxFloor + 1}` },
            image: '',
            width: 1920,
            height: 1080,
            defaultScene: '',
            scenes: [],
        };
        setFloors(prev => [...prev, newFloor]);
        setActiveFloorTab(floors.length); // yangi qavat tabini ochish
    };

    const removeFloor = (idx) => {
        if (!window.confirm(`${floors[idx].floor}-qavatni o'chirishni tasdiqlaysizmi?`)) return;
        setFloors(prev => prev.filter((_, i) => i !== idx));
        if (activeFloorTab >= floors.length - 1) {
            setActiveFloorTab(Math.max(0, floors.length - 2));
        }
    };

    const updateFloorField = (idx, field, value) => {
        setFloors(prev => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });
    };

    const updateFloorLabel = (idx, lang, value) => {
        setFloors(prev => {
            const updated = [...prev];
            updated[idx] = {
                ...updated[idx],
                label: { ...updated[idx].label, [lang]: value }
            };
            return updated;
        });
    };

    // Qavat ichidagi scene pozitsiyalarini yangilash
    const updateFloorScene = (floorIdx, sceneIdx, field, value) => {
        setFloors(prev => {
            const updated = [...prev];
            const scenes = [...updated[floorIdx].scenes];
            scenes[sceneIdx] = { ...scenes[sceneIdx], [field]: value };
            updated[floorIdx] = { ...updated[floorIdx], scenes };
            return updated;
        });
    };

    const addFloorScene = (floorIdx) => {
        setFloors(prev => {
            const updated = [...prev];
            updated[floorIdx] = {
                ...updated[floorIdx],
                scenes: [...updated[floorIdx].scenes, { id: '', xPercent: 50, yPercent: 50, icon: 'circle' }]
            };
            return updated;
        });
    };

    const removeFloorScene = (floorIdx, sceneIdx) => {
        setFloors(prev => {
            const updated = [...prev];
            updated[floorIdx] = {
                ...updated[floorIdx],
                scenes: updated[floorIdx].scenes.filter((_, i) => i !== sceneIdx)
            };
            return updated;
        });
    };

    // Qavatlarni saqlash
    const handleSaveFloors = async () => {
        // Validatsiya
        for (let i = 0; i < floors.length; i++) {
            const floor = floors[i];
            
            if (!floor.image) {
                if (activeFloorTab !== i) setActiveFloorTab(i); // Boshqa tabda xato bo'lsa uni ochib o'tish
                setTimeout(() => showErrorTrace(`${floor.floor}-qavat uchun rasm yuklanmagan!`, `floor-image-${i}`), 100);
                return;
            }
            if (!floor.defaultScene) {
                if (activeFloorTab !== i) setActiveFloorTab(i); // Boshqa tabda xato bo'lsa uni ochib o'tish
                setTimeout(() => showErrorTrace(`${floor.floor}-qavat uchun "Default Sahna" belgilanmagan! Sahnani tanlang.`, `floor-default-scene-${i}`), 100);
                return;
            }
        }

        setSaving(true);
        setError('');
        try {
            await miniMapAPI.updateFloors(slug, floors, defaultFloor);
            showSuccess('Qavatlar muvaffaqiyatli saqlandi!');
        } catch (err) {
            showErrorTrace(err.response?.data?.message || 'Saqlashda xato');
        } finally {
            setSaving(false);
        }
    };

    // ── Eski formatdan qavatlar rejimiga o'tish ──
    const convertToFloors = () => {
        const newFloor = {
            floor: 1,
            label: { uz: '1-qavat', ru: '1 этаж', en: 'Floor 1' },
            image: miniMap?.image || '',
            width: parseInt(miniMap?.width) || 1920,
            height: parseInt(miniMap?.height) || 1080,
            defaultScene: scenes[0]?.id || '',
            scenes: [...scenes],
        };
        setFloors([newFloor]);
        setActiveFloorTab(0);
        setDefaultFloor(1);
    };

    // ── Modaldan sahna tanlanganda ──
    const handleSceneSelected = (scene) => {
        if (pickerContext === 'legacy') {
            // Eski format
            const idx = pickerForIdx;
            const updated = [...scenes];
            updated[idx] = { ...updated[idx], id: scene.id };
            setScenes(updated);
        } else if (typeof pickerContext === 'number') {
            // Qavat rejimi
            updateFloorScene(pickerContext, pickerForIdx, 'id', scene.id);
        } else if (pickerContext === 'defaultScene') {
            // Qavat default sahnasi
            updateFloorField(pickerForIdx, 'defaultScene', scene.id);
        }
        setPickerForIdx(null);
        setPickerContext(null);
    };

    // ── Eski format: scene qo'shish/o'chirish ──
    const updateScene = (idx, field, value) => {
        setScenes((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], [field]: value };
            return updated;
        });
    };
    const addScene = () => setScenes((p) => [...p, { id: '', xPercent: 50, yPercent: 50, icon: 'pin' }]);
    const removeScene = (idx) => setScenes((p) => p.filter((_, i) => i !== idx));

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

    /* ═══════════════════════════════════════════════════════════════
       SCENE LIST COMPONENT (qaytariluvchi)
       ═══════════════════════════════════════════════════════════════ */
    const renderSceneList = (scenesList, contextValue, {
        onAdd, onRemove, onUpdate, floorImage
    }) => (
        <>
            {floorImage && (
                <div className="minimap-preview" style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="minimap-drag-container" style={{ position: 'relative', display: 'block', lineHeight: 0, fontSize: 0, cursor: draggingPin ? 'grabbing' : 'default' }}>
                        <img
                            src={resolveImageUrl(floorImage)}
                            alt="Plan"
                            style={{ display: 'block', maxWidth: '100%', maxHeight: '520px', width: 'auto', height: 'auto', pointerEvents: 'none' }}
                        />
                        {scenesList.map((scene, idx) => (
                            <div
                                key={idx}
                                className={`minimap-dot ${draggingPin?.context === contextValue && draggingPin?.idx === idx ? 'dragging' : ''}`}
                                style={{
                                    left: `${scene.xPercent}%`,
                                    top: `${scene.yPercent}%`,
                                    cursor: 'grab',
                                    zIndex: draggingPin?.idx === idx ? 10 : 2
                                }}
                                title={scene.id}
                                onMouseDown={(e) => handlePinDragStart(e, contextValue, idx)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="form-section-header">
                <h3 className="form-section-title" style={{ fontSize: '0.95rem' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                    Sahnalar ({scenesList.length})
                </h3>
                <button type="button" className="btn-secondary" onClick={onAdd}>
                    + Sahna Qo&apos;shish
                </button>
            </div>

            {scenesList.length === 0 ? (
                <div className="pins-empty">
                    <p>Sahnalar qo&apos;shilmagan.</p>
                </div>
            ) : (
                <div className="pins-list">
                    {scenesList.map((scene, idx) => (
                        <div key={idx} className="pin-item">
                            <div className="pin-item-num">#{idx + 1}</div>
                            <div className="pin-item-fields">
                                <div className="form-field">
                                    <label className="form-label">Sahna ID</label>
                                    <button
                                        type="button"
                                        className="scene-id-picker-btn"
                                        onClick={() => {
                                            setPickerForIdx(idx);
                                            setPickerContext(contextValue);
                                        }}
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
                                    <input type="number" className="form-input" min="0" max="100" step="0.1"
                                        value={scene.xPercent} onChange={(e) => onUpdate(idx, 'xPercent', e.target.value)} />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Y (%)</label>
                                    <input type="number" className="form-input" min="0" max="100" step="0.1"
                                        value={scene.yPercent} onChange={(e) => onUpdate(idx, 'yPercent', e.target.value)} />
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Icon</label>
                                    <select className="form-input form-select" value={scene.icon || 'circle'}
                                        onChange={(e) => onUpdate(idx, 'icon', e.target.value)}>
                                        <option value="circle">circle</option>
                                        <option value="pin">pin</option>
                                    </select>
                                </div>
                            </div>
                            <button type="button" className="btn-icon-danger" onClick={() => onRemove(idx)}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    return (
        <div className="admin-page" style={{ userSelect: 'none' }}>

            {/* Sahna tanlash modali */}
            {pickerForIdx !== null && (
                <ScenePickerModal
                    slug={slug}
                    onSelect={handleSceneSelected}
                    onClose={() => { setPickerForIdx(null); setPickerContext(null); }}
                />
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">Mini-Xarita ({slug})</h1>
                    <p className="page-subtitle">Interaktiv xarita konfiguratsiyasi</p>
                </div>
                {!hasFloors && (
                    <button className="btn-primary" onClick={convertToFloors}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                        Qavatlar Rejimiga O'tish
                    </button>
                )}
            </div>

            {error && <div className="admin-alert error">{error}</div>}
            {success && <div className="admin-alert success">{success}</div>}

            {/* ═══════════════════════════════════════════════════════
                QAVATLAR REJIMI
                ═══════════════════════════════════════════════════════ */}
            {hasFloors ? (
                <>
                    {/* Qavat Tablari */}
                    <div className="form-card">
                        <div className="form-section-header">
                            <h2 className="form-section-title">
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                                Qavatlar ({floors.length})
                            </h2>
                            <button type="button" className="btn-primary" onClick={addFloor}>
                                + Yangi Qavat
                            </button>
                        </div>

                        {/* Default qavat */}
                        <div className="form-field" style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Boshlang'ich Qavat (Default)</label>
                            <select className="form-input form-select" style={{ maxWidth: '200px' }}
                                value={defaultFloor} onChange={(e) => setDefaultFloor(parseInt(e.target.value))}>
                                {floors.map(f => (
                                    <option key={f.floor} value={f.floor}>{f.floor}-qavat</option>
                                ))}
                            </select>
                        </div>

                        {/* Tab tugmalari */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                            {floors.map((floor, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`btn-secondary ${activeFloorTab === idx ? '' : ''}`}
                                    style={{
                                        background: activeFloorTab === idx ? 'var(--color-accent-gradient)' : undefined,
                                        color: activeFloorTab === idx ? '#fff' : undefined,
                                        borderColor: activeFloorTab === idx ? 'transparent' : undefined,
                                    }}
                                    onClick={() => setActiveFloorTab(idx)}
                                >
                                    🏢 {floor.floor}-qavat
                                </button>
                            ))}
                        </div>

                        {/* Aktiv qavat tafsilotlari */}
                        {activeFloor && (
                            <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem', background: 'rgba(255,255,255,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                                        🏢 {activeFloor.floor}-Qavat Sozlamalari
                                    </h3>
                                    <button
                                        type="button"
                                        className="btn-icon-danger"
                                        onClick={() => removeFloor(activeFloorTab)}
                                        title="Qavatni o'chirish"
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                            <path d="M10 11v6M14 11v6" />
                                            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Qavat raqami va nomlari */}
                                <div className="form-grid-2" style={{ marginBottom: '1rem' }}>
                                    <div className="form-field">
                                        <label className="form-label">Qavat Raqami</label>
                                        <input type="number" className="form-input" min="0"
                                            value={activeFloor.floor}
                                            onChange={(e) => updateFloorField(activeFloorTab, 'floor', parseInt(e.target.value) || 0)} />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Default Sahna (qavat bosilganda) <span className="required">*</span></label>
                                        <button
                                            type="button"
                                            id={`floor-default-scene-${activeFloorTab}`}
                                            className="scene-id-picker-btn"
                                            onClick={() => { setPickerForIdx(activeFloorTab); setPickerContext('defaultScene'); }}
                                        >
                                            {activeFloor.defaultScene ? (
                                                <>
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                                        <circle cx="12" cy="10" r="3" />
                                                    </svg>
                                                    <span className="scene-id-value">{activeFloor.defaultScene}</span>
                                                </>
                                            ) : (
                                                <span className="scene-id-placeholder">Default sahna tanlang...</span>
                                            )}
                                            <svg className="scene-id-chevron" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="form-grid-3" style={{ marginBottom: '1rem' }}>
                                    <div className="form-field">
                                        <label className="form-label">Nom (uz)</label>
                                        <input type="text" className="form-input" value={activeFloor.label?.uz || ''}
                                            onChange={(e) => updateFloorLabel(activeFloorTab, 'uz', e.target.value)} />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Nom (ru)</label>
                                        <input type="text" className="form-input" value={activeFloor.label?.ru || ''}
                                            onChange={(e) => updateFloorLabel(activeFloorTab, 'ru', e.target.value)} />
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Nom (en)</label>
                                        <input type="text" className="form-input" value={activeFloor.label?.en || ''}
                                            onChange={(e) => updateFloorLabel(activeFloorTab, 'en', e.target.value)} />
                                    </div>
                                </div>

                                {/* Qavat rasmi */}
                                <div style={{ marginBottom: '1rem' }} id={`floor-image-${activeFloorTab}`}>
                                    <label className="form-label">Qavat Plan Rasmi <span className="required">*</span></label>


                                    <div className="upload-area" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div className="upload-fields">
                                            <div className="upload-field">
                                                <label className="file-upload-btn" style={{ opacity: uploading ? 0.6 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                                        <polyline points="17 8 12 3 7 8" />
                                                        <line x1="12" y1="3" x2="12" y2="15" />
                                                    </svg>
                                                    Qurilmadan tanlash va yuklash
                                                    <input type="file" accept="image/*" ref={mapImgRef} style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploading} />
                                                </label>
                                            </div>
                                        </div>
                                        {uploading && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                                <div className="admin-spinner-sm" /> Rasm yuklanmoqda...
                                            </div>
                                        )}
                                    </div>
                                    <div className="form-grid-2" style={{ marginTop: '0.5rem' }}>
                                        <div className="form-field">
                                            <label className="form-label">Kenglik (px) <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>— avtomatik</span></label>
                                            <input type="number" className="form-input" value={activeFloor.width || 1920}
                                                disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">Balandlik (px) <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>— avtomatik</span></label>
                                            <input type="number" className="form-input" value={activeFloor.height || 1080}
                                                disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Qavat sahnalari */}
                                {renderSceneList(activeFloor.scenes || [], activeFloorTab, {
                                    onAdd: () => addFloorScene(activeFloorTab),
                                    onRemove: (sceneIdx) => removeFloorScene(activeFloorTab, sceneIdx),
                                    onUpdate: (sceneIdx, field, value) => updateFloorScene(activeFloorTab, sceneIdx, field, value),
                                    floorImage: activeFloor.image,
                                })}
                            </div>
                        )}

                        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                            <button className="btn-primary" onClick={handleSaveFloors} disabled={saving}>
                                {saving ? <><div className="admin-spinner-sm" /> Saqlanmoqda...</> : '💾 Barcha Qavatlarni Saqlash'}
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                /* ═══════════════════════════════════════════════════════
                   ESKI FORMAT (1 QAVATLI)
                   ═══════════════════════════════════════════════════════ */
                <>
                    {/* Xarita Rasmi */}
                    <div className="form-card">
                        <h2 className="form-section-title">
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            Xarita Fon Rasmi
                        </h2>



                        <div className="upload-area" style={{ display: 'flex', alignItems: 'flex-end', gap: '15px' }}>
                            <div className="upload-fields">
                                <div className="upload-field">
                                    <label className="form-label">Xarita Rasmi (PNG/JPG)</label>
                                    <label className="file-upload-btn" style={{ opacity: uploading ? 0.6 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}>
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                        Qurilmadan tanlash va yuklash
                                        <input type="file" accept="image/*" ref={mapImgRef} style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                </div>
                            </div>
                            {uploading && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 'bold', paddingBottom: '10px' }}>
                                    <div className="admin-spinner-sm" /> Rasm yuklanmoqda...
                                </div>
                            )}
                        </div>

                        <div className="form-grid-2" style={{ maxWidth: '400px' }}>
                            <div className="form-field">
                                <label className="form-label">Kenglik (px) <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>— avtomatik</span></label>
                                <input type="number" className="form-input"
                                    value={miniMap?.width !== undefined ? miniMap.width : 1920}
                                    disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                            </div>
                            <div className="form-field">
                                <label className="form-label">Balandlik (px) <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>— avtomatik</span></label>
                                <input type="number" className="form-input"
                                    value={miniMap?.height !== undefined ? miniMap.height : 1080}
                                    disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
                            </div>
                        </div>

                        <div className="form-actions" style={{ marginTop: '1rem' }}>
                            <button className="btn-primary" onClick={handleSaveBase} disabled={saving}>
                                {saving ? <><div className="admin-spinner-sm" /> Saqlanmoqda...</> : 'Asosiyni Saqlash'}
                            </button>
                        </div>
                    </div>

                    {/* Sahna Pozitsiyalari */}
                    <div className="form-card">
                        {renderSceneList(scenes, 'legacy', {
                            onAdd: addScene,
                            onRemove: removeScene,
                            onUpdate: (idx, field, value) => updateScene(idx, field, value),
                            floorImage: miniMap?.image,
                        })}

                        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                            <button className="btn-primary" onClick={handleSaveScenes} disabled={saving}>
                                {saving ? <><div className="admin-spinner-sm" /> Saqlanmoqda...</> : 'Pozitsiyalarni Saqlash'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default MiniMapPage;
