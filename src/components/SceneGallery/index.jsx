import React from 'react';
import './SceneGallery.css';

const SceneGallery = ({ scenes, currentScene, onSceneSelect }) => {
    return (
        <div className="scene-gallery-container">
            <div className="scene-gallery-scroll">
                {scenes.map((scene, index) => (
                    <div
                        key={index}
                        className={`gallery-item ${currentScene === scene ? 'active' : ''}`}
                        onClick={() => onSceneSelect(scene.image)}
                    >
                        <div className="gallery-thumbnail-wrapper">
                            <img
                                src={scene.image}
                                alt={scene.title}
                                className="gallery-thumbnail"
                            />
                            <div className="gallery-overlay"></div>
                        </div>
                        <span className="gallery-label">{scene.title}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SceneGallery;
