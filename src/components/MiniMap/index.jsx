import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { miniMapAPI, modulesAPI } from '../../admin/services/api';
import './MiniMap.css';

const MiniMap = ({ moduleSlug, currentScene, isLang, onSceneSelect }) => {
    const [mapData, setMapData] = useState(null);
    const [modules, setModules] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Dragging state
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const mapContainerRef = useRef(null);
    const wrapperRef = useRef(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Modullarni va joriy minimapni yuklash
    useEffect(() => {
        // Modullarni olish
        modulesAPI.getAll()
            .then(res => {
                setModules(res.data?.data || res.data || []);
            })
            .catch(err => console.error("Modullarni yuklashda xato:", err));

        // Minimapni olish
        if (moduleSlug) {
            miniMapAPI.get(moduleSlug)
                .then((res) => {
                    const data = res.data.data || res.data;
                    if (data && data.image) {
                        setMapData(data);
                    } else {
                        setMapData(null);
                    }
                })
                .catch((err) => {
                    console.error("MiniMap yuklashda xato:", err);
                    setMapData(null);
                });
        }
    }, [moduleSlug]);

    // Active nuqtani markazga keltirish uchun effect
    useEffect(() => {
        if (!mapData || !mapContainerRef.current || !currentScene) return;

        const centerMap = () => {
            if (!mapContainerRef.current) return;
            const activeSceneData = mapData.scenes?.find(s => s.id === currentScene.id);
            if (!activeSceneData) return;

            const container = mapContainerRef.current;
            const scrollWidth = container.scrollWidth;
            const scrollHeight = container.scrollHeight;
            const clientWidth = container.clientWidth;
            const clientHeight = container.clientHeight;

            const pxX = (activeSceneData.xPercent / 100) * scrollWidth;
            const pxY = (activeSceneData.yPercent / 100) * scrollHeight;

            const targetScrollLeft = pxX - (clientWidth / 2);
            const targetScrollTop = pxY - (clientHeight / 2);

            container.scrollTo({
                left: Math.max(0, targetScrollLeft),
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
            });
        };

        centerMap();
        const timerId = setTimeout(centerMap, 310);
        return () => clearTimeout(timerId);
    }, [currentScene, isExpanded, mapData]);

    const startDragging = (e) => {
        setIsDragging(true);
        setStartX(e.pageX - mapContainerRef.current.offsetLeft);
        setStartY(e.pageY - mapContainerRef.current.offsetTop);
        setScrollLeft(mapContainerRef.current.scrollLeft);
        setScrollTop(mapContainerRef.current.scrollTop);
    };

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging) setIsDragging(false);
        };
        if (isDragging) {
            window.addEventListener('mouseup', handleGlobalMouseUp);
            window.addEventListener('mouseleave', handleGlobalMouseUp);
        }
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('mouseleave', handleGlobalMouseUp);
        };
    }, [isDragging]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isExpanded && wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsExpanded(false);
            }
            if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isExpanded, isDropdownOpen]);

    const onDragging = (e) => {
        if (!isDragging) return;
        if (e.buttons !== 1) {
            setIsDragging(false);
            return;
        }
        e.preventDefault();
        const x = e.pageX - mapContainerRef.current.offsetLeft;
        const y = e.pageY - mapContainerRef.current.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        mapContainerRef.current.scrollLeft = scrollLeft - walkX;
        mapContainerRef.current.scrollTop = scrollTop - walkY;
    };

    const getModuleName = (mod) => {
        if (!mod || !mod.name) return mod?.slug || '';
        if (typeof mod.name === 'string') return mod.name;
        return mod.name[isLang] || mod.name.uz || mod.name.ru || mod.name.en || mod.slug;
    };

    const currentModule = modules.find(m => m.slug === moduleSlug);

    // Xarita yo'q bo'lsa ham dropdown ishlayverishi uchun return null ni olib tashladik
    // Lekin mapData tekshiruvlarini Container ichida qilamiz

    return (
        <div
            ref={wrapperRef}
            className={`minimap-wrapper ${isExpanded && mapData ? 'expanded' : ''}`}
            style={{
                '--map-ratio': mapData && mapData.height ? `${mapData.width} / ${mapData.height}` : '16 / 9'
            }}
        >
            {/* Modul tanlash Dropdown */}
            {modules.length > 0 && (
                <div className="minimap-module-dropdown" ref={dropdownRef}>
                    <div 
                        className={`minimap-module-current ${isDropdownOpen ? 'open' : ''}`}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <span>{currentModule ? getModuleName(currentModule) : 'Modul tanlang'}</span>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                    
                    <div className={`minimap-module-list ${isDropdownOpen ? 'open' : ''}`}>
                        {modules.map(mod => (
                            <div 
                                key={mod.slug}
                                className={`minimap-module-item ${mod.slug === moduleSlug ? 'active' : ''}`}
                                onClick={() => {
                                    setIsDropdownOpen(false);
                                    if (mod.slug !== moduleSlug) {
                                        navigate(`/${mod.slug}`);
                                    }
                                }}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                {getModuleName(mod)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ochildi/Yopildi tugmasi */}
            {mapData?.image && (
                <button
                    className="minimap-toggle-btn"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title="Xaritani ochish/yopish"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                </button>
            )}

            {/* Minimap Xaritasi */}
            {mapData?.image && (
                <div
                    className="minimap-container"
                    ref={mapContainerRef}
                    onMouseDown={startDragging}
                    onMouseMove={onDragging}
                    onDragStart={(e) => e.preventDefault()}
                >
                    <div className="minimap-content" style={{
                        width: isExpanded ? '100%' : `${mapData.width / 2}px`,
                        height: isExpanded ? 'auto' : `${mapData.height / 2}px`,
                        aspectRatio: isExpanded ? `${mapData.width || 1} / ${mapData.height || 1}` : 'auto',
                        minWidth: '200px',
                        minHeight: '200px',
                        margin: isExpanded ? 'auto' : '0'
                    }}>
                        <img
                            src={mapData.image}
                            alt="MiniMap"
                            draggable="false"
                            onDragStart={(e) => e.preventDefault()}
                            className="minimap-image"
                        />

                        {mapData.scenes && mapData.scenes.map((scene, idx) => (
                            <div
                                key={scene.id || idx}
                                className={`minimap-pin-marker ${currentScene?.id === scene.id ? 'active' : ''}`}
                                style={{
                                    left: `${scene.xPercent}%`,
                                    top: `${scene.yPercent}%`
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSceneSelect(scene.id);
                                }}
                                title={scene.id}
                            >
                                <div className="minimap-pin-core"></div>
                                {currentScene?.id === scene.id && <div className="minimap-pin-pulse"></div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MiniMap;
