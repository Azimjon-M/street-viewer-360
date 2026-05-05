import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import pinIcon from '../../assets/pin.png';
import { resolveImageUrl } from '../../admin/services/api';
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
    const viewersRef = useRef([null, null]);
    const pannellumsRef = useRef([null, null]);
    
    // Safely track active viewer using a ref to avoid stale closures and re-renders
    const activeViewerIdxRef = useRef(0);
    const [activeViewerIdxState, setActiveViewerIdxState] = useState(0);

    const onSceneChangeRef = useRef(onSceneChange);
    const sceneDataRef = useRef(sceneData);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [isBlurred, setIsBlurred] = useState(false);
    const [isInfoVisible, setIsInfoVisible] = useState(window.innerWidth > 768);
    const [pannellumReady, setPannellumReady] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const enhancingStartTimeRef = useRef(0);
    const activeAudioRef = useRef(null); // hozir o'ynayotgan audio element

    // Audio to'xtatish yordamchisi
    const stopActiveAudio = useCallback(() => {
        if (activeAudioRef.current) {
            activeAudioRef.current.pause();
            activeAudioRef.current.currentTime = 0;
            // playing classini va iconni asliga qaytarish
            document.querySelectorAll('.info-audio-btn.playing').forEach(btn => {
                btn.classList.remove('playing');
                const iconSpan = btn.querySelector('.audio-icon');
                if (iconSpan) {
                    iconSpan.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
                }
            });
            activeAudioRef.current = null;
        }
    }, []);

    useImperativeHandle(ref, () => ({
        getCurrentYaw: () => pannellumsRef.current[activeViewerIdxRef.current]?.getYaw() ?? 0,
        getCurrentPitch: () => pannellumsRef.current[activeViewerIdxRef.current]?.getPitch() ?? 0,
        getCurrentHfov: () => pannellumsRef.current[activeViewerIdxRef.current]?.getHfov() ?? 120,
        getCurrentNorthOffset: () => sceneDataRef.current?.northOffset || 0,
        lookAtNorth: (duration = 1500) => {
            const currentPannellum = pannellumsRef.current[activeViewerIdxRef.current];
            if (currentPannellum) {
                const northOffset = sceneDataRef.current?.northOffset || 0;
                currentPannellum.setYaw(northOffset - 180, duration);
            }
        }
    }));

    useEffect(() => {
        onSceneChangeRef.current = onSceneChange;
    }, [onSceneChange]);

    useEffect(() => {
        sceneDataRef.current = sceneData;
    }, [sceneData]);

    useEffect(() => {
        // Til o'zgarganda o'ynayotgan audioni to'xtatish
        stopActiveAudio();
    }, [isLang, stopActiveAudio]);

    useEffect(() => {
        if (window.pannellum) {
            setTimeout(() => setPannellumReady(true), 0);
            return;
        }

        const checkInterval = setInterval(() => {
            if (window.pannellum) {
                setPannellumReady(true);
                clearInterval(checkInterval);
            }
        }, 100);

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

    const handleSceneTransition = useCallback((targetImage) => {
        // Scene o'zgarganda audio to'xtatiladi
        stopActiveAudio();
        // Ochiq info tooltiplarni yopish
        document.querySelectorAll('.info-hotspot.active').forEach(el => el.classList.remove('active'));

        setIsBlurred(true);

        let trueHeading = 0;
        let currentHfov = 100;
        let currentPitch = 0;

        const currentPannellum = pannellumsRef.current[activeViewerIdxRef.current];
        if (currentPannellum) {
            const currentYaw = currentPannellum.getYaw();
            const currentNorthOffset = sceneDataRef.current?.northOffset || 0;
            trueHeading = currentYaw - currentNorthOffset;
            currentHfov = currentPannellum.getHfov();
            currentPitch = currentPannellum.getPitch();
        }

        setTimeout(() => {
            onSceneChangeRef.current(targetImage, trueHeading, currentHfov, currentPitch);
        }, 250);
    }, []);

    const getLocalizedText = (textObj) => {
        if (!textObj) return '';
        if (typeof textObj === 'string') return textObj;
        if (textObj[isLang] !== undefined && textObj[isLang] !== null) return textObj[isLang];
        return textObj.uz || textObj.ru || textObj.en || '';
    };

    const getMultiLangHTML = (textObj, tag = 'span') => {
        if (!textObj) return '';
        if (typeof textObj === 'string') {
            return `<${tag} class="lang-text lang-uz">${textObj}</${tag}><${tag} class="lang-text lang-ru">${textObj}</${tag}><${tag} class="lang-text lang-en">${textObj}</${tag}>`;
        }
        
        const getVal = (lang) => (textObj[lang] !== undefined && textObj[lang] !== null) ? textObj[lang] : (textObj.uz || textObj.ru || textObj.en || '');

        return `
            <${tag} class="lang-text lang-uz">${getVal('uz')}</${tag}>
            <${tag} class="lang-text lang-ru">${getVal('ru')}</${tag}>
            <${tag} class="lang-text lang-en">${getVal('en')}</${tag}>
        `;
    };

    useEffect(() => {
        if (!sceneData || !pannellumReady) return;

        let mounted = true;
        setTimeout(() => { if (mounted) { setIsLoading(true); setLoadError(false); } }, 0);

        const startYaw = initialYaw !== null && initialYaw !== undefined
            ? initialYaw
            : (sceneData.initialCameraX !== undefined ? sceneData.initialCameraX - 180 : 0);

        const startPitch = initialPitch !== null && initialPitch !== undefined
            ? initialPitch
            : (sceneData.initialScene?.y ?? sceneData.initialView?.y ?? 0);

        const startHfov = initialHfov !== null && initialHfov !== undefined
            ? initialHfov
            : 120;

        const rawUrlFull = typeof sceneData.image === 'string' ? sceneData.image : (sceneData.image?.full || '');
        const rawUrlMobile = typeof sceneData.image === 'string' ? sceneData.image : (sceneData.image?.mobile || sceneData.image?.full || '');
        const rawUrlPreview = typeof sceneData.image === 'string' ? sceneData.image : (sceneData.image?.preview || sceneData.image?.mobile || sceneData.image?.full || '');

        const safeFull = resolveImageUrl(rawUrlFull);
        const safeMobile = resolveImageUrl(rawUrlMobile);
        const safePreview = resolveImageUrl(rawUrlPreview);

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
            const isInfoPin = iconType === 'info' || iconType === 'circle';

            return {
                pitch: p || 0,
                yaw: y || 0,
                type: 'custom',
                cssClass: isInfoPin ? 'custom-hotspot info-hotspot' : 'custom-hotspot',
                createTooltipFunc: (hotSpotDiv) => {
                    if (isInfoPin) {
                        // ─── Info pin: circle icon ───
                        const circle = document.createElement('div');
                        circle.className = 'circle-icon-div info-circle';
                        circle.textContent = 'i';
                        hotSpotDiv.appendChild(circle);

                        // Info tooltip (title + desc + audio)
                        const tooltip = document.createElement('div');
                        tooltip.className = 'hotspot-tooltip info-tooltip';

                        const pinTitle = pin.title || {};
                        const pinDesc = pin.description || {};
                        const pinAudio = pin.audio || {};

                        tooltip.innerHTML = `
                            ${getMultiLangHTML(pinTitle, 'h3')}
                            ${(pinDesc.uz || pinDesc.ru || pinDesc.en) ? getMultiLangHTML(pinDesc, 'p') : ''}
                        `;

                        // Audio tugmasi (agar mavjud bo'lsa)
                        const hasAudio = pinAudio.uz || pinAudio.ru || pinAudio.en;
                        if (hasAudio) {
                            const audioBtn = document.createElement('button');
                            audioBtn.className = 'info-audio-btn';

                            const playSvg = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
                            const pauseSvg = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

                            audioBtn.innerHTML = `
                                <span class="audio-icon">${playSvg}</span>
                                <span class="lang-text lang-uz">Eshitish</span>
                                <span class="lang-text lang-ru">Слушать</span>
                                <span class="lang-text lang-en">Listen</span>
                            `;

                            audioBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const iconSpan = audioBtn.querySelector('.audio-icon');

                                // Agar shu audio o'ynayotgan bo'lsa — to'xtatish
                                if (activeAudioRef.current && audioBtn.classList.contains('playing')) {
                                    stopActiveAudio();
                                    if (iconSpan) iconSpan.innerHTML = playSvg;
                                    return;
                                }

                                // Avval boshqa o'ynayotgan audioni to'xtatish
                                stopActiveAudio();

                                const lang = wrapperRef.current?.closest('[data-lang]')?.getAttribute('data-lang') || 'uz';
                                const audioUrl = pinAudio[lang] || pinAudio.uz || pinAudio.ru || pinAudio.en;
                                if (!audioUrl) return;

                                const audioEl = new Audio(resolveImageUrl(audioUrl));
                                activeAudioRef.current = audioEl;
                                audioEl.play().catch(() => {});
                                audioBtn.classList.add('playing');
                                if (iconSpan) iconSpan.innerHTML = pauseSvg;

                                audioEl.addEventListener('ended', () => {
                                    audioBtn.classList.remove('playing');
                                    if (iconSpan) iconSpan.innerHTML = playSvg;
                                    if (activeAudioRef.current === audioEl) {
                                        activeAudioRef.current = null;
                                    }
                                });
                            });

                            tooltip.appendChild(audioBtn);
                        }

                        hotSpotDiv.appendChild(tooltip);

                        // ─── Click-to-toggle: "i" ga bosganda menu ochiladi/yopiladi ───
                        circle.addEventListener('click', (e) => {
                            e.stopPropagation();
                            // Boshqa ochiq info tooltiplarni yopish
                            document.querySelectorAll('.info-hotspot.active').forEach(el => {
                                if (el !== hotSpotDiv) el.classList.remove('active');
                            });
                            hotSpotDiv.classList.toggle('active');
                        });

                        // Tooltip ichiga bosganda yopilmasin
                        tooltip.addEventListener('click', (e) => {
                            e.stopPropagation();
                        });

                    } else {
                        // ─── Navigatsiya pin: pin icon ───
                        const img = document.createElement('img');
                        img.src = pinIcon;
                        img.className = 'pin-icon-img';
                        img.alt = pin.target || 'Navigation Pin';
                        hotSpotDiv.appendChild(img);

                        const tooltip = document.createElement('div');
                        tooltip.className = 'hotspot-tooltip';
                        const targetSceneId = pin.target || pin.toImage;
                        const targetSceneObj = allScenes.find(s => s.id === targetSceneId || s.image === targetSceneId || (s.image && s.image.full === targetSceneId));
                        const titleData = targetSceneObj?.title || targetSceneId || 'Pin';
                        tooltip.innerHTML = `
                            ${getMultiLangHTML(titleData, 'h3')}
                        `;
                        hotSpotDiv.appendChild(tooltip);
                    }
                },
                clickHandlerFunc: () => {
                    if (isInfoPin) return; // Info pinlar navigatsiya qilmaydi
                    const target = pin.toImage || pin.target;
                    if (target) handleSceneTransition(target);
                }
            };
        }) || [];

        let isDestroyed = false;

        try {
            const calcAdaptiveHfov = (baseHfov) => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                const aspect = w / h;
                if (aspect >= 1) return baseHfov;
                const adapted = Math.round(baseHfov * Math.max(0.67, aspect));
                return Math.max(80, Math.min(baseHfov, adapted));
            };

            const adaptedHfov = calcAdaptiveHfov(startHfov);

            const commonOptions = {
                type: 'equirectangular',
                autoLoad: true,
                pitch: startPitch,
                yaw: startYaw,
                hfov: adaptedHfov,
                minHfov: adaptedHfov,
                maxHfov: adaptedHfov,
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
            };

            const scenes = {
                preview: { ...commonOptions, panorama: safePreview }
            };

            const progressionQueue = [];

            if (safeMobile !== safePreview) {
                scenes.mobile = { ...commonOptions, panorama: safeMobile };
                progressionQueue.push({ id: 'mobile', url: safeMobile });
            }
            if (safeFull !== safeMobile && safeFull !== safePreview) {
                scenes.full = { ...commonOptions, panorama: safeFull };
                progressionQueue.push({ id: 'full', url: safeFull });
            }

            // Correctly determine next viewer index using useRef
            const currentIdx = activeViewerIdxRef.current;
            const nextIdx = currentIdx === 0 ? 1 : 0;
            const nextViewerDom = viewersRef.current[nextIdx];

            if (!nextViewerDom) return;

            // Make sure the next container is completely clean before initializing
            nextViewerDom.innerHTML = '';

            // Panoramaga bosganda ochiq info tooltiplarni yopish
            nextViewerDom.addEventListener('click', () => {
                document.querySelectorAll('.info-hotspot.active').forEach(el => {
                    el.classList.remove('active');
                });
            });

            // Initialize pannellum in the next container
            const viewer = window.pannellum.viewer(nextViewerDom, {
                default: {
                    firstScene: 'preview',
                    sceneFadeDuration: 0,
                },
                scenes
            });

            pannellumsRef.current[nextIdx] = viewer;

            // Flag: faqat birinchi yuklashda container swap qilamiz.
            // Progressive quality loadScene() ham 'load' eventini otadi,
            // lekin u faqat rasm sifatini oshirish uchun — swap kerak emas.
            let initialLoadDone = false;
            let waitingForEnhanceLoad = false;

            viewer.on('load', () => {
                if (mounted && !isDestroyed) {
                    setIsLoading(false);
                    setIsInitialLoad(false);

                    // Faqat birinchi marta yuklanganda container almashtirish
                    if (!initialLoadDone) {
                        initialLoadDone = true;
                        
                        // Update refs and state
                        activeViewerIdxRef.current = nextIdx;
                        setActiveViewerIdxState(nextIdx);
                        
                        // Remove blur
                        setIsBlurred(false);

                        // Destroy old viewer AFTER the new one is completely loaded and visible
                        setTimeout(() => {
                            if (mounted && pannellumsRef.current[currentIdx]) {
                                try { pannellumsRef.current[currentIdx].destroy(); } catch (e) { /* ignore */ }
                                pannellumsRef.current[currentIdx] = null;
                                if (viewersRef.current[currentIdx]) viewersRef.current[currentIdx].innerHTML = '';
                            }
                        }, 100); 
                    } else if (waitingForEnhanceLoad) {
                        // Progressive quality scene yuklandi — enhancing indikatorini o'chirish
                        // Kamida 1s ko'rsatilishini ta'minlash
                        waitingForEnhanceLoad = false;
                        const elapsed = Date.now() - enhancingStartTimeRef.current;
                        const remaining = Math.max(0, 1000 - elapsed);
                        setTimeout(() => {
                            if (mounted && !isDestroyed) {
                                setIsEnhancing(false);
                            }
                        }, remaining);
                    }
                }
            });

            viewer.on('error', (error) => {
                console.error('Panorama yuklash xatosi:', error);
                if (mounted && !isDestroyed) {
                    setLoadError(true);
                    setIsLoading(false);
                }
            });

            let currentQueueIndex = 0;
            const processNextQuality = () => {
                if (isDestroyed || !mounted || currentQueueIndex >= progressionQueue.length) {
                    return;
                }

                const nextQuality = progressionQueue[currentQueueIndex];
                const img = new Image();
                
                img.onload = async () => {
                    if (isDestroyed || !mounted) return;
                    
                    const currentScene = viewer.getScene();
                    if (currentScene !== 'preview' && currentScene !== 'mobile') {
                        return;
                    }

                    try {
                        await img.decode();
                    } catch (e) {}

                    if (isDestroyed || !mounted) return;

                    const p = viewer.getPitch();
                    const y = viewer.getYaw();
                    const h = viewer.getHfov();
                    
                    // Enhancing boshlandi — loadScene() chaqirilishi oldidan
                    if (mounted && !isDestroyed) {
                        enhancingStartTimeRef.current = Date.now();
                        setIsEnhancing(true);
                    }
                    waitingForEnhanceLoad = true;

                    try {
                        viewer.loadScene(nextQuality.id, p, y, h);
                    } catch (e) {
                        console.error('Progressive load error:', e);
                        waitingForEnhanceLoad = false;
                        if (mounted && !isDestroyed) setIsEnhancing(false);
                    }

                    currentQueueIndex++;
                    setTimeout(processNextQuality, 1500);
                };
                
                img.onerror = () => {
                    console.warn(`Failed to preload ${nextQuality.id} image`);
                    currentQueueIndex++;
                    processNextQuality();
                };

                setTimeout(() => {
                    if (!isDestroyed && mounted) {
                        img.src = nextQuality.url;
                    }
                }, 500);
            };

            processNextQuality();

        } catch (error) {
            console.error('Pannellum ishga tushirish xatosi:', error);
            if (mounted && !isDestroyed) {
                setLoadError(true);
                setIsLoading(false);
            }
        }

        return () => {
            mounted = false;
            isDestroyed = true;
            // Removed cleanup of viewers here because we want the OLD viewer to persist 
            // until the NEW viewer finishes loading in the NEXT effect cycle.
            // If the whole component unmounts, the DOM is destroyed anyway, so WebGL contexts will GC.
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
            <div className="custom-controls-top-left">
                <button className="control-btn" onClick={toggleInfo} title={isInfoVisible ? "Hide Info" : "Show Info"}>
                    <InfoIcon />
                </button>
            </div>

            <div className="custom-controls-bottom-right">
                <button className="control-btn" onClick={(e) => toggleFullscreen(e)} title="Fullscreen">
                    <FullscreenIcon />
                </button>
            </div>

            {sceneData && !isLoading && isInfoVisible && (
                <div className="scene-info fade-in">
                    <h2>{getLocalizedText(sceneData.title)}</h2>
                    {getLocalizedText(sceneData.description) && <p>{getLocalizedText(sceneData.description)}</p>}
                </div>
            )}

            <div
                ref={el => viewersRef.current[0] = el}
                className="panorama-container"
                style={{
                    opacity: activeViewerIdxState === 0 ? 1 : 0,
                    zIndex: activeViewerIdxState === 0 ? 1 : 0,
                    pointerEvents: activeViewerIdxState === 0 ? 'auto' : 'none',
                    transition: 'opacity 0.25s ease'
                }}
                onContextMenuCapture={(e) => e.stopPropagation()}
                onMouseDownCapture={(e) => { if (e.button === 2) e.stopPropagation(); }}
                onPointerDownCapture={(e) => { if (e.button === 2) e.stopPropagation(); }}
            />
            <div
                ref={el => viewersRef.current[1] = el}
                className="panorama-container"
                style={{
                    opacity: activeViewerIdxState === 1 ? 1 : 0,
                    zIndex: activeViewerIdxState === 1 ? 1 : 0,
                    pointerEvents: activeViewerIdxState === 1 ? 'auto' : 'none',
                    transition: 'opacity 0.25s ease'
                }}
                onContextMenuCapture={(e) => e.stopPropagation()}
                onMouseDownCapture={(e) => { if (e.button === 2) e.stopPropagation(); }}
                onPointerDownCapture={(e) => { if (e.button === 2) e.stopPropagation(); }}
            />

            {/* Progressive quality enhancing indicator */}
            {isEnhancing && !isBlurred && (
                <div className="enhancing-indicator" key="enhancing">
                    <div className="enhancing-spinner"></div>
                    <span>Tiniqlashtirilmoqda</span>
                </div>
            )}

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
        </div>
    );
});

export default PanoramaViewer;
