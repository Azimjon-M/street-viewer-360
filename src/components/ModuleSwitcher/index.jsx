import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { modulesAPI, scenesAPI, resolveImageUrl } from '../../admin/services/api';
import './ModuleSwitcher.css';

const BuildingIcon = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 9h.01" />
        <path d="M9 13h.01" />
        <path d="M9 17h.01" />
        <path d="M15 9h.01" />
        <path d="M15 13h.01" />
        <path d="M15 17h.01" />
    </svg>
);

const ChevronIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const CheckIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

// Tarjimalar — uz/ru/en
const TRANSLATIONS = {
    label: { uz: 'Binolar', ru: 'Здания', en: 'Buildings' },
};
const t = (key, lang) => TRANSLATIONS[key]?.[lang] || TRANSLATIONS[key]?.uz || key;

const ModuleSwitcher = ({
    currentModuleSlug,
    isLang = 'uz',
    isOpen: controlledIsOpen,
    onOpenChange,
}) => {
    const [modules, setModules] = useState([]);
    const [moduleThumbs, setModuleThumbs] = useState({}); // { slug: thumbUrl }
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Controlled vs uncontrolled
    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
    const setIsOpen = (next) => {
        const value = typeof next === 'function' ? next(isOpen) : next;
        if (!isControlled) setInternalIsOpen(value);
        if (onOpenChange) onOpenChange(value);
    };

    // ─── Drag-to-scroll holatlari ───────────────────────────────
    const isDraggingRef = useRef(false);
    const draggedRef = useRef(false); // klik vs drag farqlash uchun
    const dragStartXRef = useRef(0);
    const dragStartYRef = useRef(0);
    const dragStartScrollLeftRef = useRef(0);
    const dragStartScrollTopRef = useRef(0);

    const handlePointerDown = (e) => {
        if (!menuRef.current) return;
        isDraggingRef.current = true;
        draggedRef.current = false;
        dragStartXRef.current = e.clientX;
        dragStartYRef.current = e.clientY;
        dragStartScrollLeftRef.current = menuRef.current.scrollLeft;
        dragStartScrollTopRef.current = menuRef.current.scrollTop;
    };

    const handlePointerMove = (e) => {
        if (!isDraggingRef.current || !menuRef.current) return;
        const dx = e.clientX - dragStartXRef.current;
        const dy = e.clientY - dragStartYRef.current;
        // 5px porog'idan oshganda drag deb hisoblaymiz (klik aralashmasligi uchun)
        if (!draggedRef.current && Math.hypot(dx, dy) > 5) {
            draggedRef.current = true;
            menuRef.current.style.cursor = 'grabbing';
        }
        if (draggedRef.current) {
            menuRef.current.scrollLeft = dragStartScrollLeftRef.current - dx;
            menuRef.current.scrollTop = dragStartScrollTopRef.current - dy;
            e.preventDefault();
        }
    };

    const handlePointerUp = () => {
        isDraggingRef.current = false;
        if (menuRef.current) menuRef.current.style.cursor = '';
        // draggedRef ni keyingi tickda tozalaymiz — click event bilan to'qnashmasligi uchun
        setTimeout(() => { draggedRef.current = false; }, 0);
    };

    // Modullarni yuklash
    useEffect(() => {
        modulesAPI.getAll()
            .then((res) => {
                const data = res.data?.data || res.data || [];
                setModules(Array.isArray(data) ? data : []);
            })
            .catch(() => setModules([]));
    }, []);

    // Har bir modulning default sahnasidan thumb olish (parallel)
    useEffect(() => {
        if (modules.length === 0) return;

        // Avval module.thumbnail bor modullar uchun darhol map'ga qo'shamiz,
        // qolganlari uchun default sahnani olishga harakat qilamiz.
        const initial = {};
        const needFetch = [];
        modules.forEach((mod) => {
            if (mod.thumbnail) {
                initial[mod.slug] = mod.thumbnail;
            } else {
                needFetch.push(mod.slug);
            }
        });
        if (Object.keys(initial).length > 0) {
            setModuleThumbs((prev) => ({ ...prev, ...initial }));
        }
        if (needFetch.length === 0) return;

        let cancelled = false;
        Promise.all(
            needFetch.map((slug) =>
                scenesAPI.getAll(slug)
                    .then((res) => ({ slug, list: res.data?.data || res.data || [] }))
                    .catch(() => ({ slug, list: [] }))
            )
        ).then((results) => {
            if (cancelled) return;
            const map = {};
            results.forEach(({ slug, list }) => {
                const def = list.find((s) => s.initialScene && typeof s.initialScene === 'object') || list[0];
                if (def?.image?.thumb) map[slug] = def.image.thumb;
            });
            if (Object.keys(map).length > 0) {
                setModuleThumbs((prev) => ({ ...prev, ...map }));
            }
        });
        return () => { cancelled = true; };
    }, [modules]);

    // Tashqi joyga bosilsa yopilishi
    useEffect(() => {
        if (!isOpen) return;
        const handle = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [isOpen]);

    // Drag — pointer move/up listenerlari window'da (menu tashqarisida ham ishlasin)
    useEffect(() => {
        if (!isOpen) return;
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [isOpen]);

    const getName = (mod) => {
        if (!mod?.name) return mod?.slug || '';
        if (typeof mod.name === 'string') return mod.name;
        return mod.name[isLang] || mod.name.uz || mod.name.ru || mod.name.en || mod.slug;
    };

    const getThumb = (mod) => {
        const url = moduleThumbs[mod.slug];
        return url ? resolveImageUrl(url) : null;
    };

    // Faqat 1 ta modul bo'lsa switcher kerak emas
    if (modules.length <= 1) return null;

    const currentModule = modules.find((m) => m.slug === currentModuleSlug);

    return (
        <div ref={wrapperRef} className={`module-switcher ${isOpen ? 'is-open' : ''}`}>
            <button
                type="button"
                className="module-switcher-btn"
                onClick={() => setIsOpen((p) => !p)}
                title={currentModule ? getName(currentModule) : t('label', isLang)}
            >
                <span className="module-switcher-icon">
                    <BuildingIcon size={18} />
                </span>
                <span className="module-switcher-label">{t('label', isLang)}</span>
                <span className="module-switcher-chevron">
                    <ChevronIcon size={14} />
                </span>
            </button>

            <div
                className="module-switcher-menu"
                role="listbox"
                ref={menuRef}
                onPointerDown={handlePointerDown}
            >
                {modules.map((mod) => {
                    const thumb = getThumb(mod);
                    const isActive = mod.slug === currentModuleSlug;
                    return (
                        <button
                            key={mod.slug}
                            type="button"
                            className={`module-item ${isActive ? 'active' : ''}`}
                            onClick={(e) => {
                                // Drag bo'lgan bo'lsa click'ni bloklaymiz
                                if (draggedRef.current) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return;
                                }
                                setIsOpen(false);
                                if (!isActive) navigate(`/${mod.slug}`);
                            }}
                            onDragStart={(e) => e.preventDefault()}
                            role="option"
                            aria-selected={isActive}
                        >
                            <div className="module-thumb">
                                {thumb ? (
                                    <img
                                        src={thumb}
                                        alt={getName(mod)}
                                        loading="lazy"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : (
                                    <BuildingIcon size={24} />
                                )}
                            </div>
                            <div className="module-info">
                                <span className="module-name">{getName(mod)}</span>
                            </div>
                            {isActive && (
                                <span className="module-active-mark">
                                    <CheckIcon size={16} />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ModuleSwitcher;
