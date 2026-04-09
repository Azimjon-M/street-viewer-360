import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { scenesAPI, uploadAPI } from '../services/api';
import pinIcon from '../../assets/pin.png';
import '../../components/PanoramaViewer/PanoramaViewer.css';

const LANG_TABS = ['uz', 'ru', 'en'];
const LANG_LABELS = { uz: '🇺🇿 O\'zbek', ru: '🇷🇺 Русский', en: '🇬🇧 English' };
const PIN_ICONS = ['pin', 'circle'];
const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

/* ─── Sahna Tanlash Modali ─────────────────────────────────────────────── */
const ScenePickerModal = ({ onSelect, onClose, currentSceneId, slug }) => {
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

    const filtered = allScenes.filter((s) => {
        if (currentSceneId && s.id === currentSceneId) return false;
        return s.id?.toLowerCase().includes(search.toLowerCase()) ||
            getTitle(s).toLowerCase().includes(search.toLowerCase());
    });

    const getThumb = (scene) => {
        if (scene.image?.thumb) {
            return scene.image.thumb.startsWith('http')
                ? scene.image.thumb
                : `${API_BASE}/${scene.image.thumb.replace(/^\//, '')}`;
        }
        return null;
    };

    return createPortal(
        <div className="scene-picker-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 9999 }}>
            <div className="scene-picker-modal">
                <div className="scene-picker-header">
                    <h3 className="scene-picker-title">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        Sahna Tanlash
                    </h3>
                    <button className="scene-picker-close" onClick={onClose} type="button">
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
                                    type="button"
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

const emptyForm = {
    id: '',
    northOffset: 0,
    lat: '',
    lng: '',
    title: { uz: '', ru: '', en: '' },
    description: { uz: '', ru: '', en: '' },
    image: { full: '', mobile: '', thumb: '' },
    isInitialScene: false,
    initialSceneX: 0,
    pins: [],
};

/* ─── North Offset Modal ─────────────────────────────────────────────── */
const NorthOffsetModal = ({ isOpen, onClose, imageUrl, initialValue, onSave, modalTitle = "North Offset ni belgilash", modalDesc = "Qizil chiziqni surib boshlang'ich nuqtani (0°) belgilang." }) => {
    const [value, setValue] = useState(initialValue);
    const containerRef = useRef(null);
    const isDragging = useRef(false);

    useEffect(() => {
        setTimeout(() => setValue(initialValue), 0);
    }, [initialValue, isOpen]);

    const calculateDegree = (clientX) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let x = clientX - rect.left;
        let percent = x / rect.width;
        let deg = percent * 360;
        deg = (deg % 360 + 360) % 360; // Handle wrapping
        setValue(Math.round(deg));
    };

    const handlePointerDown = (e) => {
        isDragging.current = true;
        calculateDegree(e.clientX);
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDragging.current) return;
        calculateDegree(e.clientX);
    };

    const handlePointerUp = (e) => {
        isDragging.current = false;
        e.target.releasePointerCapture(e.pointerId);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="scene-picker-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 9999 }}>
            <div className="scene-picker-modal" style={{ maxWidth: '800px', width: '90%' }}>
                <div className="scene-picker-header">
                    <h3 className="scene-picker-title">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {modalTitle}
                    </h3>
                    <button className="scene-picker-close" onClick={onClose} type="button">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div className="scene-picker-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                        {modalDesc}
                    </p>

                    {imageUrl ? (
                        <>
                            <div style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--color-accent-primary)' }}>
                                {value}°
                            </div>
                            <div
                                ref={containerRef}
                                style={{
                                    position: 'relative',
                                    width: '100%',
                                    borderRadius: '0.5rem',
                                    overflow: 'hidden',
                                    cursor: 'ew-resize',
                                    userSelect: 'none',
                                    touchAction: 'none',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                            >
                                <img src={imageUrl} alt="panorama preview" style={{ width: '100%', display: 'block', pointerEvents: 'none' }} />
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    bottom: 0,
                                    left: `${(value / 360) * 100}%`,
                                    width: '2px',
                                    backgroundColor: '#ef4444',
                                    transform: 'translateX(-50%)',
                                    zIndex: 10,
                                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: '50%',
                                        transform: 'translate(-50%, 0)',
                                        width: 0,
                                        height: 0,
                                        borderLeft: '6px solid transparent',
                                        borderRight: '6px solid transparent',
                                        borderTop: '8px solid #ef4444'
                                    }} />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: '50%',
                                        transform: 'translate(-50%, 0)',
                                        width: 0,
                                        height: 0,
                                        borderLeft: '6px solid transparent',
                                        borderRight: '6px solid transparent',
                                        borderBottom: '8px solid #ef4444'
                                    }} />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="admin-alert error">Avval rasmni (Full yoki Mobile) yuklang!</div>
                    )}
                </div>

                <div className="scene-picker-header" style={{ justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none', padding: '1rem 1.25rem' }}>
                    <button type="button" className="btn-ghost" onClick={onClose}>Bekor qilish</button>
                    <button type="button" className="btn-primary" onClick={() => onSave(value)} disabled={!imageUrl}>
                        Saqlash
                    </button>
                </div>
            </div>
        </div>
        , document.body
    );
};

/* ─── Pin Placement (360 Preview) Modal ─────────────────────────────── */
const PinPlacementModal = ({ isOpen, onClose, imageUrl, initialX, initialY, onSave, existingPins = [] }) => {
    const viewerRef = useRef(null);
    const pannellumRef = useRef(null);
    const [currentCoords, setCurrentCoords] = useState(null);

    useEffect(() => {
        if (!isOpen || !imageUrl || !viewerRef.current) return;

        let yaw = 0;
        let pitch = 0;

        if (initialX !== undefined && initialY !== undefined && initialX !== '' && initialY !== '') {
            yaw = (parseFloat(initialX) / 100) * 360 - 180;
            pitch = 90 - (parseFloat(initialY) / 100) * 180;
            setTimeout(() => setCurrentCoords({ yaw, pitch }), 0);
        } else {
            setTimeout(() => setCurrentCoords({ yaw: 0, pitch: 0 }), 0);
        }

        const initViewer = () => {
            if (pannellumRef.current) return;
            try {
                const existingHotspots = existingPins.map((p, idx) => {
                    const pyY = parseFloat(p.yPercent) || 50;
                    const pyX = parseFloat(p.xPercent) || 50;
                    return {
                        pitch: 90 - (pyY / 100) * 180,
                        yaw: (pyX / 100) * 360 - 180,
                        type: 'custom',
                        cssClass: 'custom-hotspot',
                        createTooltipFunc: (hotSpotDiv) => {
                            const iconType = p.icon || 'pin';
                            if (iconType === 'circle') {
                                const circle = document.createElement('div');
                                circle.className = 'circle-icon-div';
                                hotSpotDiv.appendChild(circle);
                            } else {
                                const img = document.createElement('img');
                                img.src = pinIcon;
                                img.className = 'pin-icon-img';
                                hotSpotDiv.appendChild(img);
                            }

                            const tooltip = document.createElement('div');
                            tooltip.className = 'hotspot-tooltip';
                            tooltip.innerHTML = `<h3>Oldingi pin (${p.target || "bo'sh"})</h3>`;
                            hotSpotDiv.appendChild(tooltip);
                        },
                        id: `existing-pin-${idx}`
                    };
                });

                const viewer = window.pannellum.viewer(viewerRef.current, {
                    type: 'equirectangular',
                    panorama: imageUrl,
                    autoLoad: true,
                    pitch: pitch,
                    yaw: yaw,
                    hfov: 100,
                    showControls: false,
                    showFullscreenCtrl: false,
                    mouseZoom: false,
                    keyboardZoom: false,
                    doubleClickZoom: false,
                    showContextMenu: false,
                    hotSpots: [
                        ...existingHotspots,
                        {
                            pitch: pitch,
                            yaw: yaw,
                            type: 'custom',
                            cssClass: 'custom-target-crosshair',
                            id: 'current-pin',
                            createTooltipFunc: (hotSpotDiv) => {
                                hotSpotDiv.innerHTML = `
                                    <div class="target-crosshair-icon">
                                        <div class="crosshair-vline"></div>
                                        <div class="crosshair-hline"></div>
                                    </div>
                                `;
                            }
                        }
                    ]
                });
                pannellumRef.current = viewer;

                let isDragging = false;
                let startPos = { x: 0, y: 0 };

                const container = viewerRef.current;
                container.addEventListener('mousedown', (e) => {
                    isDragging = false;
                    startPos = { x: e.clientX, y: e.clientY };
                });

                container.addEventListener('mousemove', (e) => {
                    if (Math.hypot(e.clientX - startPos.x, e.clientY - startPos.y) > 5) {
                        isDragging = true;
                    }
                });

                container.addEventListener('mouseup', (e) => {
                    if (!isDragging) {
                        try {
                            const [p, y] = viewer.mouseEventToCoords(e);
                            setCurrentCoords({ pitch: p, yaw: y });

                            viewer.removeHotSpot('current-pin');
                            viewer.addHotSpot({
                                pitch: p,
                                yaw: y,
                                type: 'custom',
                                cssClass: 'custom-target-crosshair',
                                id: 'current-pin',
                                createTooltipFunc: (hotSpotDiv) => {
                                    hotSpotDiv.innerHTML = `
                                        <div class="target-crosshair-icon">
                                            <div class="crosshair-vline"></div>
                                            <div class="crosshair-hline"></div>
                                        </div>
                                    `;
                                }
                            });
                        } catch { /* empty */ }
                    }
                });
            } catch (err) {
                console.error("Pannellum init error:", err);
            }
        };

        const checkPannellum = setInterval(() => {
            if (window.pannellum) {
                clearInterval(checkPannellum);
                initViewer();
            }
        }, 100);

        return () => {
            clearInterval(checkPannellum);
            if (pannellumRef.current) {
                try {
                    pannellumRef.current.destroy();
                } catch { /* empty */ }
                pannellumRef.current = null;
            }
        };
    }, [isOpen, imageUrl, initialX, initialY, existingPins]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!currentCoords) return onClose();
        let xPercent = ((currentCoords.yaw + 180) / 360) * 100;
        let yPercent = ((90 - currentCoords.pitch) / 180) * 100;

        xPercent = Math.max(0, Math.min(100, xPercent));
        yPercent = Math.max(0, Math.min(100, yPercent));

        onSave(xPercent.toFixed(1), yPercent.toFixed(1));
    };

    return createPortal(
        <div className="scene-picker-overlay" style={{ zIndex: 9999 }}>
            <div className="scene-picker-modal" style={{ width: '90%', maxWidth: '800px' }}>
                <div className="scene-picker-header">
                    <h3 className="scene-picker-title">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        360° Xaritada Pinni joylashtirish
                    </h3>
                    <button className="scene-picker-close" onClick={onClose} type="button">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
                <div className="scene-picker-body" style={{ padding: 0 }}>
                    <div style={{ padding: '15px' }}>
                        <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                            Kursor bilan rasmning o'ziga bosing. Belgilangan joyga pin qo'yiladi.
                        </p>
                    </div>
                    {imageUrl ? (
                        <div ref={viewerRef} style={{ width: '100%', height: '400px', backgroundColor: '#000', cursor: 'crosshair', pointerEvents: 'auto' }}></div>
                    ) : (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444' }}>Asosiy Panorama rasmi yuklanmagan!</div>
                    )}
                </div>
                <div className="scene-picker-header" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" className="btn-ghost" onClick={onClose}>Bekor qilish</button>
                    <button type="button" className="btn-primary" onClick={handleSave} disabled={!currentCoords}>Belgilangan joyni Saqlash</button>
                </div>
            </div>
        </div>
        , document.body
    );
};

const SceneFormPage = () => {
    const { slug, sceneId } = useParams();
    const isEdit = Boolean(sceneId);
    const navigate = useNavigate();

    const [form, setForm] = useState(emptyForm);
    const [langTab, setLangTab] = useState('uz');
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const imageRef = useRef();
    const [fileNames, setFileNames] = useState({ image: '' });
    const [showOffsetModal, setShowOffsetModal] = useState(false);
    const [showInitialXModal, setShowInitialXModal] = useState(false);
    const [activePinIndex, setActivePinIndex] = useState(null);
    const [scenePickerTargetIdx, setScenePickerTargetIdx] = useState(null);

    // Xarita rasmi URL'ini olish uchun yordamchi funksiya
    const getPreviewUrl = () => {
        const url = form.image.mobile || form.image.full;
        if (!url) return null;
        return url.startsWith('http') ? url : `${API_BASE}/${url.replace(/^\//, '')}`;
    };

    // Edit bo'lsa mavjud ma'lumotlarni yuklash
    useEffect(() => {
        if (!isEdit) return;
        scenesAPI.getOne(slug, sceneId)
            .then((res) => {
                const data = res.data.data || res.data;
                setForm({
                    id: data.id || '',
                    northOffset: data.northOffset ?? 0,
                    lat: data.lat ?? '',
                    lng: data.lng ?? '',
                    title: { uz: data.title?.uz || '', ru: data.title?.ru || '', en: data.title?.en || '' },
                    description: { uz: data.description?.uz || '', ru: data.description?.ru || '', en: data.description?.en || '' },
                    image: { full: data.image?.full || '', mobile: data.image?.mobile || '', thumb: data.image?.thumb || '' },
                    isInitialScene: typeof data.initialScene === 'object' ? true : !!data.initialScene,
                    initialSceneX: typeof data.initialScene === 'object' && data.initialScene?.x !== undefined ? data.initialScene.x : 0,
                    pins: data.pins || [],
                });
            })
            .catch(() => setError('Sahna ma\'lumotlarini yuklashda xato'))
            .finally(() => setLoading(false));
    }, [sceneId, isEdit]);

    const setField = (field, value) => setForm((p) => ({ ...p, [field]: value }));

    const setNested = (parent, key, value) =>
        setForm((p) => ({ ...p, [parent]: { ...p[parent], [key]: value } }));

    // Rasm yuklash — faqat 1 ta rasm, qolganlarini (full, mobile, thumb) DOIM server tomonidan avtomatik yaratiladi
    const handleImageUpload = async () => {
        const imageFile = imageRef.current?.files[0];

        if (!imageFile) {
            setError('Sahnaning asosiy rasmini (image) tanlang');
            return;
        }

        const fd = new FormData();
        fd.append('image', imageFile);

        setUploading(true);
        setError('');
        try {
            const res = await uploadAPI.sceneImages(slug, fd);
            const urls = res.data.data;
            setForm((p) => ({
                ...p,
                image: {
                    full: urls.full || p.image.full,
                    mobile: urls.mobile || p.image.mobile,
                    thumb: urls.thumb || p.image.thumb, // server avtomatik qaytaradi
                },
            }));
            if (imageRef.current) imageRef.current.value = '';
            setFileNames({ image: '' });
            setSuccess('✅ Rasm muvaffaqiyatli yuklandi! Barcha o\'lchamlar (Full, Mobile, Thumb) avtorentada yaratildi! 🎉 Endi sahnani saqlashingiz mumkin.');
            setTimeout(() => setSuccess(''), 6000);
        } catch (err) {
            setError(err.response?.data?.message || 'Yuklashda xato');
        } finally {
            setUploading(false);
        }
    };

    // Fayl tanlanganda nom saqlash
    const handleFileChange = (type, e) => {
        const file = e.target.files[0];
        setFileNames((p) => ({ ...p, [type]: file ? file.name : '' }));
    };

    // Pin qo'shish
    const addPin = () => {
        setForm((p) => ({
            ...p,
            pins: [...p.pins, { xPercent: 50, yPercent: 50, target: '', icon: 'pin' }],
        }));
    };

    const updatePin = (idx, field, value) => {
        setForm((p) => {
            const pins = [...p.pins];
            pins[idx] = { ...pins[idx], [field]: value };
            return { ...p, pins };
        });
    };

    const removePin = (idx) => {
        setForm((p) => ({ ...p, pins: p.pins.filter((_, i) => i !== idx) }));
    };

    // Saqlash
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.id.trim()) { setError('Sahna ID si majburiy'); return; }
        if (!form.image.full) { setError('To\'liq panorama rasm URL majburiy'); return; }

        setSaving(true);
        setError('');
        const payload = {
            ...form,
            lat: form.lat !== '' && form.lat !== null ? parseFloat(form.lat) : null,
            lng: form.lng !== '' && form.lng !== null ? parseFloat(form.lng) : null,
            northOffset: parseFloat(form.northOffset) || 0,
            initialScene: form.isInitialScene ? { x: parseFloat(form.initialSceneX) || 0 } : false,
            // pin.id yuborilmaydi — server generatsiya qiladi
            pins: form.pins.map((pin) => ({
                xPercent: parseFloat(pin.xPercent),
                yPercent: parseFloat(pin.yPercent),
                target: pin.target,
                icon: pin.icon,
            })),
        };

        try {
            if (isEdit) {
                await scenesAPI.update(slug, sceneId, payload);
                setSuccess('Sahna muvaffaqiyatli yangilandi!');
                setTimeout(() => setSuccess(''), 3000);
            } else {
                await scenesAPI.create(slug, payload);
                navigate(`/admin/modules/${slug}/scenes`);
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.join(', ') || 'Saqlashda xato';
            setError(msg);
        } finally {
            setSaving(false);
        }
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
        <div className="admin-page">
            <NorthOffsetModal
                isOpen={showOffsetModal}
                onClose={() => setShowOffsetModal(false)}
                imageUrl={getPreviewUrl()}
                initialValue={form.northOffset}
                onSave={(val) => {
                    setField('northOffset', val);
                    setShowOffsetModal(false);
                }}
            />

            <NorthOffsetModal
                isOpen={showInitialXModal}
                onClose={() => setShowInitialXModal(false)}
                imageUrl={getPreviewUrl()}
                initialValue={form.initialSceneX}
                modalTitle="Boshlang'ich Qarash Nuqtasi (X)"
                modalDesc="Kadr ilk ochilganda kamera qaysi tomonga (X-o'qi) qarab turishini belgilang."
                onSave={(val) => {
                    setField('initialSceneX', val);
                    setShowInitialXModal(false);
                }}
            />

            <PinPlacementModal
                isOpen={activePinIndex !== null}
                onClose={() => setActivePinIndex(null)}
                imageUrl={getPreviewUrl()}
                initialX={activePinIndex !== null ? form.pins[activePinIndex].xPercent : 50}
                initialY={activePinIndex !== null ? form.pins[activePinIndex].yPercent : 50}
                existingPins={activePinIndex !== null ? form.pins.filter((_, idx) => idx !== activePinIndex) : []}
                onSave={(x, y) => {
                    updatePin(activePinIndex, 'xPercent', x);
                    updatePin(activePinIndex, 'yPercent', y);
                    setActivePinIndex(null);
                }}
            />

            {scenePickerTargetIdx !== null && (
                <ScenePickerModal
                    slug={slug}
                    onSelect={(scene) => {
                        updatePin(scenePickerTargetIdx, 'target', scene.id);
                        setScenePickerTargetIdx(null);
                    }}
                    onClose={() => setScenePickerTargetIdx(null)}
                    currentSceneId={form.id}
                />
            )}

            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isEdit ? 'Sahnani Tahrirlash' : 'Yangi Sahna'}</h1>
                    <p className="page-subtitle">{isEdit ? `ID: ${sceneId}` : '360° panoramik sahna yaratish'}</p>
                </div>
                <button className="btn-ghost" onClick={() => navigate(`/admin/modules/${slug}/scenes`)}>
                    ← Orqaga
                </button>
            </div>

            {error && <div className="admin-alert error">{error}</div>}
            {success && <div className="admin-alert success">{success}</div>}

            <form onSubmit={handleSubmit} className="scene-form">
                {/* === ASOSIY MA'LUMOTLAR === */}
                <div className="form-card">
                    <h2 className="form-section-title">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        Asosiy Ma'lumotlar
                    </h2>
                    <div className="form-grid-2">
                        <div className="form-field">
                            <label className="form-label">
                                Sahna ID <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="bosh-kirish"
                                value={form.id}
                                onChange={(e) => setField('id', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                disabled={isEdit}
                            />
                            <p className="form-hint">Kichik harf, tire bilan (o'zgartirib bo'lmaydi)</p>
                        </div>
                        <div className="form-field">
                            <label className="form-label">North Offset (0–360°)</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="number"
                                    className="form-input"
                                    min="0"
                                    max="360"
                                    value={form.northOffset}
                                    onChange={(e) => setField('northOffset', e.target.value)}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setShowOffsetModal(true)}
                                >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M2 12A10 10 0 0 0 15 21.54A10 10 0 0 1 15 2.46A10 10 0 0 0 2 12Z" />
                                    </svg>
                                    Xaritada
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="form-grid-1" style={{ marginTop: '1rem' }}>
                        <div className="form-field">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={form.isInitialScene}
                                    onChange={(e) => setField('isInitialScene', e.target.checked)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                Bu loyihaning boshlang'ich sahnasi (Default Scene)
                            </label>
                        </div>
                        {form.isInitialScene && (
                            <div className="form-field" style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', borderLeft: '3px solid var(--color-accent-primary)' }}>
                                <label className="form-label">Boshlang'ich Qarash Nuqtasi (X o'qi / 0-360°)</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="number"
                                        className="form-input"
                                        min="0"
                                        max="360"
                                        value={form.initialSceneX}
                                        onChange={(e) => setField('initialSceneX', e.target.value)}
                                        style={{ flex: 1, maxWidth: '200px' }}
                                    />
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => setShowInitialXModal(true)}
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M2 12A10 10 0 0 0 15 21.54A10 10 0 0 1 15 2.46A10 10 0 0 0 2 12Z" />
                                        </svg>
                                        Xaritada
                                    </button>
                                </div>
                                <p className="form-hint">Sahna yuklanganda kamera qaysi tomonga qarab turishini belgilang.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* === RASMLAR === */}
                <div className="form-card">
                    <h2 className="form-section-title">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        Rasmlar
                    </h2>
                    <div className="upload-area">
                        <div className="upload-fields">
                            {[
                                { ref: imageRef, label: 'Asosiy Rasm', labelSub: 'Ixtiyoriy o\'lcham', hint: 'To\'liq 360° panorama, server o\'zi uni full, mobile, thumb qilib pachoqlaydi', type: 'image' }
                            ].map(({ ref, label, labelSub, hint, type }) => (
                                <div key={type} className="upload-field">
                                    <label className="form-label">
                                        {label} <span className="upload-field-sub">{labelSub}</span>
                                        <span className="required"> *</span>
                                    </label>
                                    <label className={`file-upload-btn ${fileNames[type] ? 'file-selected' : ''}`}>
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                        {fileNames[type] || 'Fayl tanlash'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={ref}
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleFileChange(type, e)}
                                        />
                                    </label>
                                    <p className="form-hint">{hint}</p>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleImageUpload}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <><div className="admin-spinner-sm" /> Yuklanmoqda...</>
                            ) : (
                                <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg> Serverga Yuklash</>
                            )}
                        </button>
                    </div>

                    {/* URL Preview */}
                    <div className="form-grid-2 image-urls">
                        {['full', 'mobile', 'thumb'].map((key) => (
                            <div key={key} className="form-field">
                                <label className="form-label">
                                    {key.charAt(0).toUpperCase() + key.slice(1)} URL
                                    <span className="required"> *</span>
                                </label>
                                {form.image[key] ? (
                                    <div className="image-url-preview">
                                        <img
                                            src={form.image[key]}
                                            alt={key}
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                        <p className="image-url-text">{form.image[key].split('/').pop()}</p>
                                    </div>
                                ) : null}
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={`${API_BASE}/uploads/${key}/...`}
                                    value={form.image[key]}
                                    onChange={(e) => setNested('image', key, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* === SARLAVHALAR === */}
                <div className="form-card">
                    <h2 className="form-section-title">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        Sarlavhalar & Tavsif
                    </h2>
                    <div className="lang-tabs">
                        {LANG_TABS.map((lang) => (
                            <button
                                key={lang}
                                type="button"
                                className={`lang-tab ${langTab === lang ? 'active' : ''}`}
                                onClick={() => setLangTab(lang)}
                            >
                                {LANG_LABELS[lang]}
                            </button>
                        ))}
                    </div>
                    <div className="form-grid-1">
                        <div className="form-field">
                            <label className="form-label">Sarlavha ({langTab.toUpperCase()})</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={`Sarlavha (${langTab})`}
                                value={form.title[langTab]}
                                onChange={(e) => setNested('title', langTab, e.target.value)}
                            />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Tavsif ({langTab.toUpperCase()})</label>
                            <textarea
                                className="form-textarea"
                                rows={3}
                                placeholder={`Qisqacha tavsif (${langTab})`}
                                value={form.description[langTab]}
                                onChange={(e) => setNested('description', langTab, e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* === PINLAR === */}
                <div className="form-card">
                    <div className="form-section-header">
                        <h2 className="form-section-title">
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            Navigatsiya Pinlari ({form.pins.length})
                        </h2>
                        <button type="button" className="btn-secondary" onClick={addPin}>
                            + Pin Qo'shish
                        </button>
                    </div>

                    {form.pins.length === 0 ? (
                        <div className="pins-empty">
                            <p>Hali pin qo'shilmagan. Boshqa sahna bilan bog'lanish uchun pin qo'shing.</p>
                        </div>
                    ) : (
                        <div className="pins-list">
                            {form.pins.map((pin, idx) => (
                                <div key={idx} className="pin-item">
                                    <div className="pin-item-num">#{idx + 1}</div>
                                    <div className="pin-item-fields">
                                        <div className="form-field">
                                            <label className="form-label">Target Sahna ID</label>
                                            <button
                                                type="button"
                                                className="scene-id-picker-btn"
                                                onClick={() => setScenePickerTargetIdx(idx)}
                                            >
                                                {pin.target ? (
                                                    <>
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                                            <circle cx="12" cy="10" r="3" />
                                                        </svg>
                                                        <span className="scene-id-value">{pin.target}</span>
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
                                            <label className="form-label">X (%) & Y (%)</label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min="0" max="100" step="0.1"
                                                    value={pin.xPercent}
                                                    onChange={(e) => updatePin(idx, 'xPercent', e.target.value)}
                                                    placeholder="X"
                                                    style={{ minWidth: '80px' }}
                                                />
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min="0" max="100" step="0.1"
                                                    value={pin.yPercent}
                                                    onChange={(e) => updatePin(idx, 'yPercent', e.target.value)}
                                                    placeholder="Y"
                                                    style={{ minWidth: '80px' }}
                                                />
                                                <button
                                                    type="button"
                                                    className="btn-secondary"
                                                    onClick={() => setActivePinIndex(idx)}
                                                    title="360 Xaritada belgilash"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                                                >
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                                        <circle cx="12" cy="10" r="3" />
                                                    </svg>
                                                    <span className="hide-mobile">360°</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">Icon</label>
                                            <select
                                                className="form-input form-select"
                                                value={pin.icon}
                                                onChange={(e) => updatePin(idx, 'icon', e.target.value)}
                                            >
                                                {PIN_ICONS.map((ic) => (
                                                    <option key={ic} value={ic}>{ic}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-icon-danger"
                                        onClick={() => removePin(idx)}
                                        title="Pinni o'chirish"
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
                </div>

                {/* Submit */}
                <div className="form-actions">
                    <button type="button" className="btn-ghost" onClick={() => navigate(`/admin/modules/${slug}/scenes`)}>
                        Bekor qilish
                    </button>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? (
                            <><div className="admin-spinner-sm" /> Saqlanmoqda...</>
                        ) : (
                            <><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                                <polyline points="17 21 17 13 7 13 7 21" />
                                <polyline points="7 3 7 8 15 8" />
                            </svg> {isEdit ? 'Yangilash' : 'Sahnani Yaratish'}</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SceneFormPage;
