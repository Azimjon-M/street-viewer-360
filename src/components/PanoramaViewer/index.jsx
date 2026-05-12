import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import pinIcon from '../../assets/pin.png';
import { resolveImageUrl } from '../../admin/services/api';
import './PanoramaViewer.css';

// ─── Network Information API yordamchisi ──────────────────────────────────────
// Permissiv — faqat aniq sekin tarmoqlarda cheklaymiz. Boshqa barcha holatlarda
// full ga ruxsat va preview-time fallback (yuklanish vaqti chegaradan oshsa)
// keyin avtomatik qisqartiradi.
const getNetworkProfile = () => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return { tier: 'unknown', maxQuality: 'full', reason: 'Connection API yo\'q' };
    if (conn.saveData) return { tier: 'data-saver', maxQuality: 'preview', reason: 'Data Saver yoqilgan' };

    const et = conn.effectiveType;       // 'slow-2g' | '2g' | '3g' | '4g' | undefined
    const downlink = conn.downlink || 0; // Mbps

    // Aniq sekin tarmoqlar
    if (et === 'slow-2g' || et === '2g') return { tier: 'very-slow', maxQuality: 'preview', reason: et };
    if (et === '3g')                     return { tier: 'slow',      maxQuality: 'mobile',  reason: et };

    // Qolgan holatlar — '4g', undefined, yoki yaxshi downlink — full ga ruxsat
    return { tier: 'fast', maxQuality: 'full', reason: `${et || '?'}/${downlink}Mbps` };
};

const QUALITY_RANK = { preview: 0, mobile: 1, full: 2 };
const QUALITY_LABEL = { preview: 'Past', mobile: "O'rta", full: 'Yuqori' };

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

const PanoramaViewer = forwardRef(({ sceneData, allScenes = [], crossModuleScenes = {}, initialYaw, initialPitch, initialHfov, onSceneChange, isLang = 'uz' }, ref) => {
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
    const [isImmersive, setIsImmersive] = useState(false);
    // Joriy yuklab bo'lingan sifat — UI'da "tadbiqdagi" (effective) sifat yonida ✓ ko'rsatish uchun
    const [loadedQuality, setLoadedQuality] = useState('preview');
    const [pannellumReady, setPannellumReady] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const enhancingStartTimeRef = useRef(0);
    const activeAudioRef = useRef(null); // hozir o'ynayotgan audio element
    const isInteractingRef = useRef(false); // user surayotganmi (drag/touch)

    // ─── Quality preference (manual override) ───────────────────────────────
    // 'auto' = tarmoq tezligiga qarab; 'low' = faqat preview; 'high' = doim full
    const [qualityPref, setQualityPref] = useState(() => {
        return localStorage.getItem('panoramaQualityPref') || 'auto';
    });
    const [qualityMenuOpen, setQualityMenuOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('panoramaQualityPref', qualityPref);
    }, [qualityPref]);

    // Quality control uchun ref'lar — joriy effect ichidan ulardan foydalanamiz
    const qualityPrefRef = useRef(qualityPref);
    useEffect(() => { qualityPrefRef.current = qualityPref; }, [qualityPref]);
    const upgradeRequestRef = useRef(null);   // joriy sahna effect tomonidan o'rnatiladi
    const networkChangeRef = useRef(null);    // joriy sahna effect tomonidan o'rnatiladi

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
                // X o'qi (yaw) — shimolga
                currentPannellum.setYaw(northOffset - 180, duration);
                // Y o'qi (pitch) — gorizontal markazga (0°)
                currentPannellum.setPitch(0, duration);
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

    // ─── Connection 'change' tinglash — auto rejimda sifat oshirilsa qabul qilamiz ───
    useEffect(() => {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return;
        const handleChange = () => {
            const newProfile = getNetworkProfile();
            console.info(`[NetworkAware] Tarmoq o'zgardi: ${newProfile.tier} (${newProfile.reason})`);
            // Joriy sahna effect tomonidan registratsiya qilingan callback'ni chaqiramiz
            if (networkChangeRef.current) networkChangeRef.current(newProfile);
        };
        conn.addEventListener('change', handleChange);
        return () => conn.removeEventListener('change', handleChange);
    }, []);

    // ─── Quality preference o'zgarganda joriy sahnaga ta'sir qilish ───
    useEffect(() => {
        // Joriy sahna effect upgrade callback'ni o'rnatadi
        if (upgradeRequestRef.current) upgradeRequestRef.current();
    }, [qualityPref]);

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

    const handleSceneTransition = useCallback((targetImage, targetModule = null) => {
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
            onSceneChangeRef.current(targetImage, trueHeading, currentHfov, currentPitch, targetModule);
        }, 250);
    }, [stopActiveAudio]);

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
        // Yangi sahna boshlanishida — loaded quality'ni preview'ga reset qilamiz
        setLoadedQuality('preview');

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
                            const wasActive = hotSpotDiv.classList.contains('active');

                            // Boshqa ochiq info tooltiplarni yopish + ulardagi audio to'xtaydi
                            const otherActive = document.querySelectorAll('.info-hotspot.active');
                            let closedOther = false;
                            otherActive.forEach((el) => {
                                if (el !== hotSpotDiv) {
                                    el.classList.remove('active');
                                    closedOther = true;
                                }
                            });
                            if (closedOther) stopActiveAudio();

                            // Joriy pin'ni toggle
                            hotSpotDiv.classList.toggle('active');

                            // Yopildi (oldin ochiq edi) → audio'ni to'xtatish
                            if (wasActive) stopActiveAudio();
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

                        // Multi-lang object'da hech bo'lmaganda 1 ta til to'ldirilganmi
                        const hasContent = (obj) => obj && typeof obj === 'object' && (obj.uz || obj.ru || obj.en);

                        // Cross-module: pin.targetModule joriy sahna modulidan farq qilsa,
                        // allScenes (faqat joriy modul) ichidan qidirmaymiz — id to'qnashuvi
                        // yuz berishi mumkin (boshqa moduldagi mos id li sahna noto'g'ri title bersa).
                        const currentModuleSlug = sceneDataRef.current?.moduleSlug;
                        const isCrossModule = pin.targetModule && currentModuleSlug && pin.targetModule !== currentModuleSlug;

                        let titleData;
                        if (hasContent(pin.title)) {
                            // 1) Pin'ning o'z title'i (eng yuqori prioritet)
                            titleData = pin.title;
                        } else if (isCrossModule) {
                            // 2) Cross-module — App.jsx tomonidan oldindan yuklab qo'yilgan
                            //    cross-module sahnalardan title'ni olamiz
                            const cached = crossModuleScenes[`${pin.targetModule}/${targetSceneId}`];
                            titleData = hasContent(cached?.title)
                                ? cached.title
                                : (targetSceneId || 'Pin');
                        } else {
                            // 3) Joriy modul ichida target sahnani topib, uning title'ini ishlatamiz
                            const targetSceneObj = allScenes.find(s => s.id === targetSceneId);
                            titleData = hasContent(targetSceneObj?.title)
                                ? targetSceneObj.title
                                : (targetSceneId || 'Pin');
                        }

                        tooltip.innerHTML = `
                            ${getMultiLangHTML(titleData, 'h3')}
                        `;
                        hotSpotDiv.appendChild(tooltip);
                    }
                },
                clickHandlerFunc: () => {
                    if (isInfoPin) return; // Info pinlar navigatsiya qilmaydi
                    const target = pin.toImage || pin.target;
                    const tMod = pin.targetModule || null;
                    if (target) handleSceneTransition(target, tMod);
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

            // ─── Tarmoq profili + manual quality preference ──────────────
            const computeMaxRank = () => {
                const pref = qualityPrefRef.current;
                if (pref === 'low')    return QUALITY_RANK.preview;
                if (pref === 'medium') return QUALITY_RANK.mobile;
                if (pref === 'high')   return QUALITY_RANK.full;
                // 'auto' — tarmoqdan
                const profile = getNetworkProfile();
                console.info(`[NetworkAware] Tarmoq: ${profile.tier} (${profile.reason}) → max sifat: ${profile.maxQuality}`);
                return QUALITY_RANK[profile.maxQuality] ?? QUALITY_RANK.full;
            };

            // Scenes object — barcha mavjud sifatlar oldindan ro'yxatga olinadi
            // (Pannellum scenes ro'yxati keyin o'zgarmaydi, lekin loadScene faqat queuda
            //  bo'lganlar uchun chaqiriladi.)
            const scenes = { preview: { ...commonOptions, panorama: safePreview } };
            if (safeMobile !== safePreview) {
                scenes.mobile = { ...commonOptions, panorama: safeMobile };
            }
            if (safeFull !== safeMobile && safeFull !== safePreview) {
                scenes.full = { ...commonOptions, panorama: safeFull };
            }

            // Available qualities (preview chiqarib tashlangan — u doim boshlang'ich)
            const availableUpgrades = [];
            if (scenes.mobile) availableUpgrades.push({ id: 'mobile', url: safeMobile, rank: QUALITY_RANK.mobile });
            if (scenes.full)   availableUpgrades.push({ id: 'full',   url: safeFull,   rank: QUALITY_RANK.full });

            // Joriy ruxsatga ko'ra queue
            let initialMaxRank = computeMaxRank();
            const progressionQueue = availableUpgrades.filter(q => q.rank <= initialMaxRank);

            // Preview yuklanish vaqtini o'lchaymiz — ikkinchi himoya qatlami
            const previewLoadStart = Date.now();

            // Correctly determine next viewer index using useRef
            const currentIdx = activeViewerIdxRef.current;
            const nextIdx = currentIdx === 0 ? 1 : 0;
            const nextViewerDom = viewersRef.current[nextIdx];

            if (!nextViewerDom) return;

            // Make sure the next container is completely clean before initializing
            nextViewerDom.innerHTML = '';

            // Panoramaga bosganda ochiq info tooltiplarni yopish + audio to'xtatish
            nextViewerDom.addEventListener('click', () => {
                const active = document.querySelectorAll('.info-hotspot.active');
                if (active.length > 0) {
                    active.forEach((el) => el.classList.remove('active'));
                    stopActiveAudio();
                }
            });

            // ─── User interaction tracking (sifat almashishini sakrashdan saqlash) ───
            // User panoramani surayotgan vaqtda loadScene() chaqirilsa Pannellum re-init
            // qilib yaw/pitch ni qaytadan o'rnatadi → bu sakrashga olib keladi.
            // Shuning uchun user qo'lini qo'yib yuborgandan kichik bo'shliq keyin yuklaymiz.
            const onInteractStart = () => { isInteractingRef.current = true; };
            const onInteractEnd = () => {
                // 300ms grace — Pannellum momentum (inertia) tugashini kutamiz
                setTimeout(() => { isInteractingRef.current = false; }, 300);
            };
            nextViewerDom.addEventListener('mousedown', onInteractStart);
            nextViewerDom.addEventListener('touchstart', onInteractStart, { passive: true });
            nextViewerDom.addEventListener('mouseup', onInteractEnd);
            nextViewerDom.addEventListener('mouseleave', onInteractEnd);
            nextViewerDom.addEventListener('touchend', onInteractEnd);
            nextViewerDom.addEventListener('touchcancel', onInteractEnd);

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

                        // ─── Preview yuklanish vaqti orqali tarmoq korreksiyasi ───
                        // Faqat Network API sekin/noma'lum deganda qo'llanadi.
                        // API "fast" desa, uni hurmat qilamiz — preview vaqti birinchi
                        // so'rovda DNS/SSL handshake bilan sekin bo'lishi mumkin (false negative).
                        const previewElapsed = Date.now() - previewLoadStart;
                        const previewProfile = getNetworkProfile();
                        const networkSaysFast = previewProfile.tier === 'fast';

                        if (!networkSaysFast) {
                            if (previewElapsed > 6000 && progressionQueue.length > 0) {
                                console.info(`[NetworkAware] Preview ${previewElapsed}ms — sekin tarmoq, sifat oshirilmaydi.`);
                                progressionQueue.length = 0;
                            } else if (previewElapsed > 4000 && progressionQueue.length > 1) {
                                console.info(`[NetworkAware] Preview ${previewElapsed}ms — o'rtacha tarmoq, full o'tkazib yuborildi.`);
                                progressionQueue.splice(1);
                            }
                        }

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

                        // Preview ko'rinib bo'lgach, sifat oshirish navbatini boshlaymiz
                        // (avval parallel emas — preview tarmoqni egallamasligi uchun)
                        processNextQuality();
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

                        // Joriy yuklangan sifatni state'ga aks ettirish (✓ uchun)
                        const loadedKey = currentLoadedRank === QUALITY_RANK.full ? 'full'
                                        : currentLoadedRank === QUALITY_RANK.mobile ? 'mobile'
                                        : 'preview';
                        if (mounted) setLoadedQuality(loadedKey);
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
            let currentLoadedRank = QUALITY_RANK.preview; // Joriy yuklab bo'lingan eng yuqori sifat
            let processing = false;

            const processNextQuality = () => {
                if (processing) return;
                if (isDestroyed || !mounted || currentQueueIndex >= progressionQueue.length) {
                    return;
                }
                processing = true;

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

                    // ─── User idle bo'lguncha kutish ───────────────────────
                    // Surayotgan vaqtda loadScene chaqirsak — yaw/pitch sakraydi.
                    // Polling qilamiz: har 200ms tekshirib, isInteracting=false bo'lguncha kutamiz.
                    while (isInteractingRef.current && !isDestroyed && mounted) {
                        await new Promise(r => setTimeout(r, 200));
                    }
                    if (isDestroyed || !mounted) return;

                    // Idle bo'lgach — yaw/pitch ni shu paytdagi haqiqiy holatdan olamiz
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
                        currentLoadedRank = nextQuality.rank;
                    } catch (e) {
                        console.error('Progressive load error:', e);
                        waitingForEnhanceLoad = false;
                        if (mounted && !isDestroyed) setIsEnhancing(false);
                    }

                    currentQueueIndex++;
                    processing = false;
                    setTimeout(processNextQuality, 1500);
                };
                
                img.onerror = () => {
                    console.warn(`Failed to preload ${nextQuality.id} image`);
                    currentQueueIndex++;
                    processing = false;
                    processNextQuality();
                };

                setTimeout(() => {
                    if (!isDestroyed && mounted) {
                        img.src = nextQuality.url;
                    }
                }, 500);
            };

            // processNextQuality endi viewer.on('load') ichidan chaqiriladi —
            // preview ko'rinib bo'lgach. Tarmoqni preview va mobile parallel egallamasligi uchun.

            // ─── Joriy sahna sifatini oshirish/qayta hisoblash callback'i ───
            // Quality pref o'zgarganda yoki connection upgrade bo'lganda chaqiriladi.
            const recomputeAndProcess = () => {
                if (isDestroyed || !mounted) return;
                const newMaxRank = computeMaxRank();

                // Yuklab bo'lingan rank dan yuqori va yangi maxRank dan past yoki teng
                // bo'lgan, hali queue'da bo'lmagan sifatlarni qo'shamiz.
                let added = false;
                for (const q of availableUpgrades) {
                    if (q.rank > currentLoadedRank && q.rank <= newMaxRank) {
                        const alreadyQueued = progressionQueue.some((x, i) => i >= currentQueueIndex && x.id === q.id);
                        if (!alreadyQueued) {
                            progressionQueue.push(q);
                            added = true;
                        }
                    }
                }
                if (added) processNextQuality();
            };
            upgradeRequestRef.current = recomputeAndProcess;
            networkChangeRef.current = recomputeAndProcess;

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
            // Quality control callback'larini tozalash (sahna o'zgarganda eski effect yo'q bo'ladi)
            upgradeRequestRef.current = null;
            networkChangeRef.current = null;
            // Audio'ni to'xtatish — scene/modul o'zgarganda yoki komponent unmount bo'lganda
            stopActiveAudio();
            // Removed cleanup of viewers here because we want the OLD viewer to persist
            // until the NEW viewer finishes loading in the NEXT effect cycle.
            // If the whole component unmounts, the DOM is destroyed anyway, so WebGL contexts will GC.
        };
        // crossModuleScenes deps'dan olib tashlandi: u async yuklanganida
        // butun viewer effect'ni qayta ishga tushirib, progressive sifat yuklanishini
        // uzib qo'yardi. Tooltip closure'i viewer init paytidagi qiymatni saqlaydi —
        // bu cross-module pin tooltiplari uchun arzimas trade-off, lekin sifat yuklanishi
        // endi uzilmaydi.
    }, [sceneData, initialYaw, initialPitch, initialHfov, pannellumReady, handleSceneTransition, allScenes]); 

    const toggleInfo = () => {
        setIsInfoVisible(prev => !prev);
    };

    const toggleFullscreen = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!wrapperRef.current) return;

        // Native fullscreen API mavjudligi va mobil holat tekshiruvi
        const supportsFs = !!(
            document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled
        );
        const isMobile = window.matchMedia('(max-width: 768px)').matches;

        // Mobil yoki native FS qo'llab-quvvatlanmagan holatda — fake immersive rejimi
        if (isMobile || !supportsFs) {
            setIsImmersive((prev) => !prev);
            return;
        }

        // Desktop — native fullscreen
        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch((err) => {
                console.error(`Fullscreen xatosi: ${err.message}`);
                // Fallback: native muvaffaqiyatsiz bo'lsa fake immersive
                setIsImmersive(true);
            });
        } else {
            document.exitFullscreen();
        }
    };

    // Immersive rejim — tashqi UI elementlarini yashirish uchun body class
    useEffect(() => {
        if (isImmersive) {
            document.body.classList.add('viewer-immersive');
        } else {
            document.body.classList.remove('viewer-immersive');
        }
        return () => document.body.classList.remove('viewer-immersive');
    }, [isImmersive]);

    return (
        <div className={`panorama-viewer ${isBlurred ? 'is-blurred' : ''}`} ref={wrapperRef} data-lang={isLang}>
            <div className="custom-controls-top-left">
                <button className="control-btn" onClick={toggleInfo} title={isInfoVisible ? "Hide Info" : "Show Info"}>
                    <InfoIcon />
                </button>

                {/* Scene info — info tugmasi va quality tugma o'rtasida (mobilda quality'ni o'zi bilan pastga suradi).
                    Always rendered: class toggle orqali silliq animatsiya. */}
                {sceneData && !isLoading && (
                    <div className={`scene-info ${isInfoVisible ? 'is-open' : ''}`}>
                        <h2>{getLocalizedText(sceneData.title)}</h2>
                        {getLocalizedText(sceneData.description) && <p>{getLocalizedText(sceneData.description)}</p>}
                    </div>
                )}

                {/* Quality control */}
                <div className={`quality-control ${qualityMenuOpen ? 'is-open' : ''}`}>
                    <button
                        className="control-btn"
                        onClick={() => setQualityMenuOpen((p) => !p)}
                        title={`Sifat: ${
                            qualityPref === 'auto'   ? 'Avtomatik' :
                            qualityPref === 'low'    ? QUALITY_LABEL.preview :
                            qualityPref === 'medium' ? QUALITY_LABEL.mobile :
                            qualityPref === 'high'   ? QUALITY_LABEL.full :
                            'Avtomatik'
                        }`}
                    >
                        {/* Galareya — stacked rasimlar (sifat versiyalari) */}
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            {/* Old (front) photo with mountain & sun */}
                            <rect x="3" y="3" width="14" height="14" rx="2" />
                            <circle cx="8" cy="8" r="1.6" />
                            <path d="m3 14 4-4 5 5" />
                            {/* Back photo hint */}
                            <path d="M21 7v12a2 2 0 0 1-2 2H7" />
                        </svg>
                    </button>

                    {qualityMenuOpen && (
                        <div
                            className="quality-control-backdrop"
                            onClick={() => setQualityMenuOpen(false)}
                        />
                    )}

                    <div className="quality-control-menu">
                        {[
                            { key: 'auto',   label: '⚡ Avtomatik',   desc: 'Tarmoqqa qarab' },
                            { key: 'low',    label: '📉 Past sifat',  desc: 'Trafik tejash (preview)' },
                            { key: 'medium', label: '⚖️ O\'rta sifat', desc: 'Muvozanatli (mobile)' },
                            { key: 'high',   label: '✨ Yuqori sifat', desc: 'Eng tiniq (full)' },
                        ].map((opt) => {
                            const isSelected = qualityPref === opt.key;
                            // Effektiv (yuklab bo'lingan) sifat: preview→low, mobile→medium, full→high
                            const effectiveKey = loadedQuality === 'full' ? 'high'
                                              : loadedQuality === 'mobile' ? 'medium'
                                              : 'low';
                            const isEffective = opt.key === effectiveKey;
                            return (
                                <button
                                    key={opt.key}
                                    type="button"
                                    className={`quality-control-item ${isSelected ? 'active' : ''}`}
                                    onClick={() => { setQualityPref(opt.key); setQualityMenuOpen(false); }}
                                >
                                    <div className="quality-control-item-content">
                                        <div className="quality-control-item-label">{opt.label}</div>
                                        <div className="quality-control-item-desc">{opt.desc}</div>
                                    </div>
                                    {isEffective && (
                                        <svg
                                            className="quality-control-item-check"
                                            width="18" height="18" viewBox="0 0 24 24"
                                            fill="none" stroke="currentColor" strokeWidth="3"
                                            strokeLinecap="round" strokeLinejoin="round"
                                            aria-hidden="true"
                                            title="Hozirda tadbiqdagi sifat"
                                        >
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="custom-controls-bottom-right">
                <button className="control-btn" onClick={(e) => toggleFullscreen(e)} title="Fullscreen">
                    <FullscreenIcon />
                </button>
            </div>

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
