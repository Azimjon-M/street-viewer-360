import { useEffect, useRef, useState } from 'react';
import pinIcon from '../../assets/pin.png';
import './PanoramaViewer.css';

// Simple Icon Components
const ZoomInIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="11" y1="8" x2="11" y2="14"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>
);

const ZoomOutIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>
);

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

const PanoramaViewer = ({ sceneData, initialYaw, initialHfov, onSceneChange }) => {
    const wrapperRef = useRef(null);
    const viewerRef = useRef(null);
    const pannellumRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isInfoVisible, setIsInfoVisible] = useState(true);

    useEffect(() => {
        if (!sceneData || !viewerRef.current) return;

        // Cleanup previous viewer
        if (pannellumRef.current) {
            pannellumRef.current.destroy();
        }

        setIsLoading(true);

        // Configure pannellum viewer
        const startYaw = initialYaw !== null && initialYaw !== undefined
            ? initialYaw
            : (sceneData.initialView?.x || 0);

        const config = {
            type: 'equirectangular',
            panorama: sceneData.image,
            autoLoad: true,
            pitch: sceneData.initialView?.y || 0, // Support y if present, default 0
            yaw: startYaw,   // Use calculated start yaw
            hfov: initialHfov || 100, // Use persisted hfov or default
            minHfov: 50,
            maxHfov: 120,
            showControls: false, // Disable default controls
            showFullscreenCtrl: false,
            showZoomCtrl: false,
            mouseZoom: true,
            draggable: true,
            keyboardZoom: true,
            doubleClickZoom: true,
            compass: false,
            hotSpots: sceneData.pins?.map(pin => ({
                pitch: pin.y,
                yaw: pin.x + (sceneData.initialView?.x || 0), // Apply scene rotation offset
                type: 'custom',
                cssClass: 'custom-hotspot',
                createTooltipFunc: (hotSpotDiv) => {
                    // Inject Pin Icon
                    const img = document.createElement('img');
                    img.src = pinIcon;
                    img.className = 'pin-icon-img';
                    img.alt = pin.title || 'Navigation Pin';
                    hotSpotDiv.appendChild(img);

                    // Inject Tooltip
                    const tooltip = document.createElement('div');
                    tooltip.className = 'hotspot-tooltip';
                    tooltip.innerHTML = `
                        <h3>${pin.title}</h3>
                        ${pin.desc ? `<p>${pin.desc}</p>` : ''}
                    `;
                    hotSpotDiv.appendChild(tooltip);
                },
                clickHandlerFunc: () => {
                    if (onSceneChange && pin.toImage) {
                        handleSceneTransition(pin.toImage);
                    }
                }
            })) || []
        };

        // Initialize viewer
        try {
            // Check if pannellum is loaded
            if (!window.pannellum) {
                console.error('Pannellum library not loaded');
                setIsLoading(false);
                return;
            }

            const viewer = window.pannellum.viewer(viewerRef.current, config);
            pannellumRef.current = viewer;

            // Event listeners
            viewer.on('load', () => {
                setIsLoading(false);
            });

            viewer.on('error', (error) => {
                console.error('Panorama load error:', error);
                setIsLoading(false);
            });
        } catch (error) {
            console.error('Pannellum initialization error:', error);
            setIsLoading(false);
        }

        // Cleanup on unmount or scene change
        return () => {
            if (pannellumRef.current) {
                pannellumRef.current.destroy();
                pannellumRef.current = null;
            }
        };
    }, [sceneData, initialYaw, initialHfov]);

    const handleSceneTransition = (targetImage) => {
        setIsTransitioning(true);

        // Calculate current True Heading and HFOV before switching
        let trueHeading = 0;
        let currentHfov = 100;

        if (pannellumRef.current) {
            const currentYaw = pannellumRef.current.getYaw();
            const currentOffset = sceneData.initialView?.x || 0;
            trueHeading = currentYaw - currentOffset;

            currentHfov = pannellumRef.current.getHfov();
        }

        // Smooth transition
        setTimeout(() => {
            onSceneChange(targetImage, trueHeading, currentHfov); // Pass trueHeading and HFOV to parent
            setTimeout(() => {
                setIsTransitioning(false);
            }, 300);
        }, 300);
    };

    // Custom Control Handlers
    const handleZoomIn = () => {
        if (pannellumRef.current) {
            const currentHfov = pannellumRef.current.getHfov();
            pannellumRef.current.setHfov(currentHfov - 10);
        }
    };

    const handleZoomOut = () => {
        if (pannellumRef.current) {
            const currentHfov = pannellumRef.current.getHfov();
            pannellumRef.current.setHfov(currentHfov + 10);
        }
    };

    const toggleInfo = () => {
        setIsInfoVisible(!isInfoVisible);
    };

    const toggleFullscreen = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!wrapperRef.current) return;

        if (!document.fullscreenElement) {
            wrapperRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div className="panorama-viewer" ref={wrapperRef}>
            {/* Custom Controls - Top Left */}
            <div className="custom-controls-top-left">
                <button className="control-btn" onClick={handleZoomIn} title="Zoom In">
                    <ZoomInIcon />
                </button>
                <button className="control-btn" onClick={handleZoomOut} title="Zoom Out">
                    <ZoomOutIcon />
                </button>
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
                    <h2>{sceneData.title}</h2>
                    {sceneData.description && <p>{sceneData.description}</p>}
                </div>
            )}

            {/* Panorama Container */}
            <div
                ref={viewerRef}
                className="panorama-container"
                style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s ease' }}
            />

            {/* Loading State */}
            {isLoading && (
                <div className="panorama-loading">
                    <div className="loading-spinner"></div>
                    <div className="loading-text">Panorama yuklanmoqda...</div>
                </div>
            )}

            {/* Transition Overlay */}
            <div className={`scene-transition ${isTransitioning ? 'active' : ''}`} />
        </div>
    );
};

export default PanoramaViewer;
