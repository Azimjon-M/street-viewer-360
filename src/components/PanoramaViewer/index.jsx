import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import pinIcon from '../../assets/pin.png';
import './PanoramaViewer.css';

const InfoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

const FullscreenIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
    </svg>
);

const PanoramaViewer = forwardRef(({ sceneData, allScenes = [], initialYaw, initialPitch, initialHfov, onSceneChange, isLang = 'uz' }, ref) => {
    const wrapperRef = useRef(null);
    const viewerRef = useRef(null);
    const pannellumRef = useRef(null);
    const onSceneChangeRef = useRef(onSceneChange);
    const sceneDataRef = useRef(sceneData);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [isBlurred, setIsBlurred] = useState(false);
    const [isInfoVisible, setIsInfoVisible] = useState(window.innerWidth > 768);
    const [pannellumReady, setPannellumReady] = useState(false);
    const activeSceneIdRef = useRef(null);

    // App.jsx minimap yaw o'qishi uchun live metodlarni tashqariga chiqaramiz
    useImperativeHandle(ref, () => ({
        getCurrentYaw: () => pannellumRef.current?.getYaw() ?? 0,
        getCurrentPitch: () => pannellumRef.current?.getPitch() ?? 0,
        getCurrentHfov: () => pannellumRef.current?.getHfov() ?? 100,
        getCurrentNorthOffset: () => sceneDataRef.current?.northOffset || 0,
    }));

    // Ref orqali callback'larni yangilab turish (stale closure muammosini hal qiladi)
    useEffect(() => {
        onSceneChangeRef.current = onSceneChange;
    }, [onSceneChange]);

    useEffect(() => {
        sceneDataRef.current = sceneData;
    }, [sceneData]);

    // Pannellum CDN dan yuklanishini kutish
    useEffect(() => {
        if (window.pannellum) {
            setTimeout(() => setPannellumReady(true), 0);
            return;
        }

        // Har 100ms da tekshir
        const checkInterval = setInterval(() => {
            if (window.pannellum) {
                setPannellumReady(true);
                clearInterval(checkInterval);
            }
        }, 100);

        // 10 soniyadan keyin to'xtat
        const timeout = setTimeout(() => {
            clearInterval(checkInterval);
            if (!window.pannellum) {
                console.error('Pannellum 10 soniyada yuklanmadi!');
                setIsLoading(false);
            }
        }, 10000);

        return () => {
            clearInterval(checkInterval);
            clearTimeout(timeout);
        };
    }, []);

    // Scene o'tish funksiyasi
    const handleSceneTransition = useCallback((targetImage) => {
        // Blur darhol boshlanadi (CSS 0.8s animatsiyasi bilan silliq)
        setIsBlurred(true);

        let trueHeading = 0;
        let currentHfov = 100;
        let currentPitch = 0;

        if (pannellumRef.current) {
            const currentYaw = pannellumRef.current.getYaw();
            const currentNorthOffset = sceneDataRef.current?.northOffset || 0;
            trueHeading = currentYaw - currentNorthOffset;
            currentHfov = pannellumRef.current.getHfov();
            currentPitch = pannellumRef.current.getPitch();
        }

        // 250ms kutamiz — blur animatsiyasi ko'rinsin, keyin scene o'tadi
        setTimeout(() => {
            onSceneChangeRef.current(targetImage, trueHeading, currentHfov, currentPitch);
        }, 250);
    }, []); // Bo'sh dependency - ref'lar orqali ishlaydi

    const getLocalizedText = (textObj) => {
        if (!textObj) return '';
        if (typeof textObj === 'string') return textObj;
        return textObj[isLang] || textObj.uz || textObj.ru || textObj.en || '';
    };

    const getMultiLangHTML = (textObj, tag = 'span') => {
        if (!textObj) return '';
        if (typeof textObj === 'string') {
            return `<${tag} class="lang-text lang-uz">${textObj}</${tag}><${tag} class="lang-text lang-ru">${textObj}</${tag}><${tag} class="lang-text lang-en">${textObj}</${tag}>`;
        }
        return `
            <${tag} class="lang-text lang-uz">${textObj.uz || ''}</${tag}>
            <${tag} class="lang-text lang-ru">${textObj.ru || textObj.uz || ''}</${tag}>
            <${tag} class="lang-text lang-en">${textObj.en || textObj.uz || ''}</${tag}>
        `;
    };

    useEffect(() => {
        if (!sceneData || !viewerRef.current || !pannellumReady) return;

        let mounted = true;
        setTimeout(() => { if (mounted) { setIsLoading(true); setLoadError(false); } }, 0);

        const startYaw = initialYaw !== null && initialYaw !== undefined
            ? initialYaw
            : (sceneData.initialScene?.x !== undefined ? sceneData.initialScene.x - 180 : (sceneData.initialView?.x ?? 0));

        const startPitch = initialPitch !== null && initialPitch !== undefined
            ? initialPitch
            : (sceneData.initialScene?.y ?? sceneData.initialView?.y ?? 0);

        const startHfov = initialHfov !== null && initialHfov !== undefined
            ? initialHfov
            : 100;

        const rawUrl = typeof sceneData.image === 'string' ? sceneData.image : (sceneData.image?.full || '');
        const apiBase = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
        // Bazada saqlangan qanday IP bo'lishidan qat'iy nazar joriy apiBase ga almashtirish:
        const safePanoramaUrl = rawUrl.replace(/http:\/\/[a-zA-Z0-9.-]+:5000/g, apiBase);

        const hotSpots = sceneData.pins?.map(pin => {
            let p = pin.y;
            if (p === undefined && pin.yPercent !== undefined) {
                p = 90 - (parseFloat(pin.yPercent) / 100) * 180;
            }
            let y = pin.x;
            if (y === undefined && pin.xPercent !== undefined) {
                y = (parseFloat(pin.xPercent) / 100) * 360 - 180;
            }
            const iconType = pin.icon || 'pin';
            return {
                pitch: p || 0,
                yaw: y || 0,
                type: 'custom',
                cssClass: 'custom-hotspot',
                createTooltipFunc: (hotSpotDiv) => {
                    if (iconType === 'circle') {
                        const circle = document.createElement('div');
                        circle.className = 'circle-icon-div';
                        hotSpotDiv.appendChild(circle);
                    } else {
                        const img = document.createElement('img');
                        img.src = pinIcon;
                        img.className = 'pin-icon-img';
                        img.alt = pin.title || pin.target || 'Navigation Pin';
                        hotSpotDiv.appendChild(img);
                    }
                    const tooltip = document.createElement('div');
                    tooltip.className = 'hotspot-tooltip';
                    const targetSceneId = pin.target || pin.toImage;
                    const targetSceneObj = allScenes.find(s => s.id === targetSceneId || s.image === targetSceneId || (s.image && s.image.full === targetSceneId));
                    const titleData = pin.title || targetSceneObj?.title || targetSceneId || 'Pin';
                    tooltip.innerHTML = `
                        ${getMultiLangHTML(titleData, 'h3')}
                        ${pin.desc ? getMultiLangHTML(pin.desc, 'p') : ''}
                    `;
                    hotSpotDiv.appendChild(tooltip);
                },
                clickHandlerFunc: () => {
                    const target = pin.toImage || pin.target;
                    if (target) handleSceneTransition(target);
                }
            };
        }) || [];

        // Eski viewerni yo'q qilamiz (blur orqali foydalanuvchi ko'rmaydi)
        if (pannellumRef.current) {
            try { pannellumRef.current.destroy(); } catch (e) { /* ignore */ }
            pannellumRef.current = null;
        }

        try {
            const viewer = window.pannellum.viewer(viewerRef.current, {
                type: 'equirectangular',
                panorama: safePanoramaUrl,
                autoLoad: true,
                pitch: startPitch,
                yaw: startYaw,
                hfov: startHfov,
                minHfov: 100,
                maxHfov: 100,
                showControls: false,
                showFullscreenCtrl: false,
                showZoomCtrl: false,
                mouseZoom: false,
                draggable: true,
                keyboardZoom: false,
                doubleClickZoom: false,
                compass: false,
                showContextMenu: false,
                hotSpots,
            });

            pannellumRef.current = viewer;

            viewer.on('load', () => {
                if (mounted) {
                    setIsLoading(false);
                    setIsInitialLoad(false);
                    setIsBlurred(false);
                }
            });

            viewer.on('error', (error) => {
                console.error('Panorama yuklash xatosi:', error);
                if (mounted) {
                    setLoadError(true);
                    setIsLoading(false);
                }
            });
        } catch (error) {
            console.error('Pannellum ishga tushirish xatosi:', error);
            if (mounted) {
                setLoadError(true);
                setIsLoading(false);
            }
        }

        return () => {
            mounted = false;
        };
    }, [sceneData, initialYaw, initialPitch, initialHfov, pannellumReady, handleSceneTransition, allScenes]);



    const toggleInfo = () => {
        setIsInfoVisible(prev => !prev);
    };

    const toggleFullscreen = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!wrapperRef.current) return;

        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(err => {
                console.error(`Fullscreen xatosi: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div className={`panorama-viewer ${isBlurred ? 'is-blurred' : ''}`} ref={wrapperRef} data-lang={isLang}>
            {/* Custom Controls - Top Left */}
            <div className="custom-controls-top-left">
                <button className="control-btn" onClick={toggleInfo} title={isInfoVisible ? "Hide Info" : "Show Info"}>
                    <InfoIcon />
                </button>
            </div>

            {/* Custom Controls - Bottom Right */}
            <div className="custom-controls-bottom-right">
                <button className="control-btn" onClick={(e) => toggleFullscreen(e)} title="Fullscreen">
                    <FullscreenIcon />
                </button>
            </div>

            {/* Scene Info */}
            {sceneData && !isLoading && isInfoVisible && (
                <div className="scene-info fade-in">
                    <h2>{getLocalizedText(sceneData.title)}</h2>
                    {getLocalizedText(sceneData.description) && <p>{getLocalizedText(sceneData.description)}</p>}
                </div>
            )}

            {/* Panorama Container */}
            <div
                ref={viewerRef}
                className="panorama-container"
                style={{ opacity: (isInitialLoad && isLoading) ? 0 : 1, transition: 'opacity 0.5s ease' }}
                onContextMenuCapture={(e) => e.stopPropagation()}
                onMouseDownCapture={(e) => { if (e.button === 2) e.stopPropagation(); }}
                onPointerDownCapture={(e) => { if (e.button === 2) e.stopPropagation(); }}
            />

            {/* Loading State */}
            {((isInitialLoad && isLoading) || loadError) && (
                <div className="panorama-loading">
                    <div className="loading-box">
                        {loadError ? (
                            <div className="loading-text error-text">
                                Rasmni serverdan yuklab bo'lmadi! Tarmoqqa ulanishni tekshiring.
                            </div>
                        ) : (
                            <>
                                <div className="loading-spinner"></div>
                                <div className="loading-text">
                                    Kutib turing ...
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Faked Transition Blur Background Removed */}
        </div>
    );
}); // forwardRef tugadi


export default PanoramaViewer;
