import { useEffect, useRef, useState } from 'react';
import './PanoramaViewer.css';

const PanoramaViewer = ({ sceneData, onSceneChange }) => {
    const viewerRef = useRef(null);
    const pannellumRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        if (!sceneData || !viewerRef.current) return;

        // Cleanup previous viewer
        if (pannellumRef.current) {
            pannellumRef.current.destroy();
        }

        setIsLoading(true);

        // Configure pannellum viewer
        const config = {
            type: 'equirectangular',
            panorama: sceneData.image,
            autoLoad: true,
            pitch: sceneData.initialView?.pitch || 0,
            yaw: sceneData.initialView?.yaw || 0,
            hfov: sceneData.initialView?.hfov || 100,
            minHfov: 50,
            maxHfov: 120,
            showControls: true,
            showFullscreenCtrl: true,
            showZoomCtrl: true,
            mouseZoom: true,
            draggable: true,
            keyboardZoom: true,
            doubleClickZoom: true,
            compass: true,
            hotSpots: sceneData.hotspots?.map(hotspot => ({
                ...hotspot,
                clickHandlerFunc: () => {
                    const targetSceneId = hotspot.clickHandlerFunc();
                    if (targetSceneId && onSceneChange) {
                        handleSceneTransition(targetSceneId);
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
            }
        };
    }, [sceneData]);

    const handleSceneTransition = (targetSceneId) => {
        setIsTransitioning(true);

        // Smooth transition
        setTimeout(() => {
            onSceneChange(targetSceneId);
            setTimeout(() => {
                setIsTransitioning(false);
            }, 300);
        }, 300);
    };

    return (
        <div className="panorama-viewer">
            {/* Scene Info */}
            {sceneData && !isLoading && (
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
