import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { miniMapAPI, modulesAPI, resolveImageUrl } from '../../admin/services/api';
import './MiniMap.css';

const MiniMap = ({ moduleSlug, currentScene, isLang, onSceneSelect }) => {
    const [mapData, setMapData] = useState(null);
    const [modules, setModules] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFloorDropdownOpen, setIsFloorDropdownOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeFloor, setActiveFloor] = useState(null);
    
    // Dragging state
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startY, setStartY] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    const mapContainerRef = useRef(null);
    const wrapperRef = useRef(null);
    const dropdownRef = useRef(null);
    const floorDropdownRef = useRef(null);
    const navigate = useNavigate();

    // ─── Qavatlar va eski format uchun yordamchi ───────────────
    // Faqat rasmi bor (haqiqiy) qavatlarni ajratib olamiz
    const validFloors = mapData?.floors?.filter(f => f.image) || [];
    const hasFloors = mapData?.floors && validFloors.length > 0;

    // Joriy qavatning ma'lumotlarini olish
    const currentFloorData = (() => {
        if (!hasFloors) {
            // Eski format — to'g'ridan-to'g'ri mapData ishlatiladi
            return mapData ? {
                image: mapData.image,
                width: mapData.width,
                height: mapData.height,
                scenes: mapData.scenes || [],
            } : null;
        }
        // Yangi format — aktiv qavatni topish
        const floor = validFloors.find(f => f.floor === activeFloor);
        return floor || validFloors[0] || null;
    })();

    // ─── Sahna qaysi qavatda ekanligini aniqlash ──────────────
    const findFloorForScene = (sceneId) => {
        if (!hasFloors || !sceneId) return null;
        for (const floor of mapData.floors) {
            if (floor.defaultScene === sceneId || floor.scenes?.some(s => s.id === sceneId)) {
                return floor.floor;
            }
        }
        return null;
    };

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
                    if (data) {
                        setMapData(data);
                        // Default qavat
                        if (data.floors && data.floors.length > 0) {
                            setActiveFloor(data.defaultFloor || data.floors[0].floor);
                        }
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

    // Sahna o'zgarganda avtomatik qavat aniqlash
    useEffect(() => {
        if (!hasFloors || !currentScene?.id || !mapData?.floors) return;

        setActiveFloor(prev => {
            // 1-qoida: Sahnaning qaysi qavatning "Asosiy (Default) sahnasi" ekanligini tekshirish
            // Agar sahna ma'lum bir qavatning asosiy sahnasi bo'lsa, O'SHA qavatga o'tish shart!
            const homeFloorObj = mapData.floors.find(f => f.defaultScene === currentScene.id);
            if (homeFloorObj && homeFloorObj.floor !== prev) {
                return homeFloorObj.floor;
            }

            // 2-qoida: Agar tanlangan qavatda shu sahna bo'lsa qavatni o'zgartirmaymiz
            const currentFloorObj = mapData.floors.find(f => f.floor === prev);
            const existsInCurrent = currentFloorObj?.defaultScene === currentScene.id || 
                                    currentFloorObj?.scenes?.some(s => s.id === currentScene.id);
            
            if (existsInCurrent) {
                return prev;
            }

            // 3-qoida: Aks holda sahnani o'z ichiga olgan birinchi qavatni topamiz
            const floorNum = findFloorForScene(currentScene.id);
            return floorNum !== null ? floorNum : prev;
        });
    }, [currentScene?.id, hasFloors, mapData]);

    // Active nuqtani markazga keltirish funksiyasi (qayta ishlatish uchun)
    const centerMap = () => {
        if (!mapContainerRef.current || !currentFloorData || !currentScene) return;
        const scenes = currentFloorData.scenes || [];
        const activeSceneData = scenes.find(s => s.id === currentScene.id);
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

        // O'ng va past chegaradan oshib ketmasligi uchun clamp
        const maxScrollLeft = scrollWidth - clientWidth;
        const maxScrollTop = scrollHeight - clientHeight;

        container.scrollTo({
            left: Math.max(0, Math.min(targetScrollLeft, maxScrollLeft)),
            top: Math.max(0, Math.min(targetScrollTop, maxScrollTop)),
            behavior: 'smooth'
        });
    };

    // Sahna yoki holat o'zgarganda markazlashtirish
    useEffect(() => {
        if (!currentFloorData || !mapContainerRef.current || !currentScene) return;

        centerMap();
        const timerId = setTimeout(centerMap, 310);
        return () => clearTimeout(timerId);
    }, [currentScene, isExpanded, currentFloorData]);

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
            if (isFloorDropdownOpen && floorDropdownRef.current && !floorDropdownRef.current.contains(e.target)) {
                setIsFloorDropdownOpen(false);
            }

            // Minimap tashqarisiga bosilganda aktiv pinni qayta markazlashtirish
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                // Kichik kechikish — boshqa state o'zgarishlar (expand yopilishi va h.k.) amalga oshgandan keyin
                setTimeout(centerMap, 50);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isExpanded, isDropdownOpen, isFloorDropdownOpen, currentScene, currentFloorData]);

    const onDragging = (e) => {
        if (!isDragging) return;
        if (e.buttons !== 1) {
            setIsDragging(false);
            return;
        }
        e.preventDefault();
        const container = mapContainerRef.current;
        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;

        // Chegaradan tashqariga chiqmasligi uchun clamp
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        const maxScrollTop = container.scrollHeight - container.clientHeight;

        container.scrollLeft = Math.max(0, Math.min(scrollLeft - walkX, maxScrollLeft));
        container.scrollTop = Math.max(0, Math.min(scrollTop - walkY, maxScrollTop));
    };

    const getModuleName = (mod) => {
        if (!mod || !mod.name) return mod?.slug || '';
        if (typeof mod.name === 'string') return mod.name;
        return mod.name[isLang] || mod.name.uz || mod.name.ru || mod.name.en || mod.slug;
    };

    const getFloorLabel = (floor) => {
        if (!floor.label) return `${floor.floor}-qavat`;
        if (typeof floor.label === 'string') return floor.label;
        return floor.label[isLang] || floor.label.uz || floor.label.ru || floor.label.en || `${floor.floor}-qavat`;
    };

    // Qavat tugmasi bosilganda
    const handleFloorChange = (floorNum) => {
        setActiveFloor(floorNum);
        
        if (hasFloors) {
            const floor = mapData.floors.find(f => f.floor === floorNum);
            if (floor) {
                if (floor.defaultScene) {
                    onSceneSelect(floor.defaultScene);
                } else if (floor.scenes && floor.scenes.length > 0) {
                    // Xarita ustidagi pinlarni tekshiramiz. Pinlardagi 'id' xususiyati kerakli sahnani ko'rsatadi.
                    const validPin = floor.scenes.find(pin => pin.id && pin.id.trim() !== '');
                    if (validPin) {
                        onSceneSelect(validPin.id);
                    } else {
                        alert(`Diqqat: ${floorNum}-qavat xaritasida bitta ham sahna pin (id) topilmadi! Iltimos, admin paneldan (MiniMap bo'limidan) shu qavatga pin qo'shing yoki "Default Sahna" belgilang.`);
                        console.warn(`${floorNum}-qavatda hech qanday sahna pin (id) topilmadi!`);
                    }
                } else {
                    alert(`Diqqat: ${floorNum}-qavatda hech qanday sahna (pin) yo'q va "Default Sahna" ham belgilanmagan. Admin panelga kirib buni to'g'irlang!`);
                    console.warn(`${floorNum}-qavatda hech qanday sahna (pin) yo'q yoki default scene belgilanmagan.`);
                }
            }
        }
    };

    const currentModule = modules.find(m => m.slug === moduleSlug);

    // Xarita rasmi bor-yo'qligini tekshirish
    const hasMapImage = currentFloorData?.image;

    return (
        <div
            ref={wrapperRef}
            className={`minimap-wrapper ${isExpanded && hasMapImage ? 'expanded' : ''}`}
            style={{
                '--map-ratio': currentFloorData?.height
                    ? `${currentFloorData.width} / ${currentFloorData.height}`
                    : '16 / 9'
            }}
        >
            {/* Modul tanlash Dropdown */}
            {modules.length > 1 && (
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

            {/* Ochildi/Yopildi tugmasi va Qavat tanlash */}
            {hasMapImage && (
                <div className="minimap-actions-row" style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="minimap-toggle-btn"
                        onClick={() => setIsExpanded(!isExpanded)}
                        title="Xaritani ochish/yopish"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </button>

                    {/* ─── Qavat tanlash Dropdowni ─── */}
                    {hasFloors && validFloors.length > 1 && (
                        <div className="minimap-floor-dropdown" ref={floorDropdownRef}>
                            <div 
                                className={`minimap-floor-current ${isFloorDropdownOpen ? 'open' : ''}`}
                                onClick={() => setIsFloorDropdownOpen(!isFloorDropdownOpen)}
                                title="Qavatni o'zgartirish"
                            >
                                <span>{activeFloor}</span>
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>
                            
                            <div className={`minimap-floor-list ${isFloorDropdownOpen ? 'open' : ''}`}>
                                {[...validFloors]
                                    .sort((a, b) => b.floor - a.floor)
                                    .map(floor => (
                                        <div 
                                            key={floor.floor}
                                            className={`minimap-floor-item ${activeFloor === floor.floor ? 'active' : ''}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsFloorDropdownOpen(false);
                                                handleFloorChange(floor.floor);
                                            }}
                                        >
                                            {getFloorLabel(floor)}
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Minimap Xaritasi */}
            {hasMapImage && (
                <div className="minimap-content-wrapper" style={{ position: 'relative' }}>
                    <div
                        className="minimap-container"
                        ref={mapContainerRef}
                        onMouseDown={startDragging}
                        onMouseMove={onDragging}
                        onDragStart={(e) => e.preventDefault()}
                    >
                        <div className="minimap-content" style={{
                            width: isExpanded ? '100%' : `${(currentFloorData.width || 500) / 2}px`,
                            height: isExpanded ? 'auto' : `${(currentFloorData.height || 500) / 2}px`,
                            aspectRatio: isExpanded ? `${currentFloorData.width || 1} / ${currentFloorData.height || 1}` : 'auto',
                            minWidth: '200px',
                            minHeight: '200px',
                            margin: isExpanded ? 'auto' : '0'
                        }}>
                            <img
                                src={resolveImageUrl(currentFloorData.image)}
                                alt="MiniMap"
                                draggable="false"
                                onDragStart={(e) => e.preventDefault()}
                                className="minimap-image"
                            />

                            {currentFloorData.scenes && currentFloorData.scenes.map((scene, idx) => (
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
                </div>
            )}
        </div>
    );
};

export default MiniMap;
