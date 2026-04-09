import './SceneGallery.css';

const SceneGallery = ({ scenes, currentScene, onSceneSelect, isLang = 'uz' }) => {
    const getLocalizedText = (textObj) => {
        if (!textObj) return '';
        if (typeof textObj === 'string') return textObj;
        return textObj[isLang] || textObj.uz || textObj.ru || textObj.en || '';
    };

    return (
        <div className="scene-gallery-container">
            <div className="scene-gallery-scroll">
                {scenes.map((scene) => {
                    const sceneId = scene.id || (typeof scene.image === 'string' ? scene.image : scene.image?.full);
                    const imageUrl = typeof scene.image === 'string' ? scene.image : (scene.image?.thumb || scene.image?.full);

                    return (
                        <div
                            key={sceneId}
                            className={`gallery-item ${currentScene === scene ? 'active' : ''}`}
                            onClick={() => onSceneSelect(sceneId)}
                        >
                            <div className="gallery-thumbnail-wrapper">
                                <img
                                    src={imageUrl}
                                    alt={getLocalizedText(scene.title)}
                                    className="gallery-thumbnail"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <div className="gallery-overlay"></div>
                            </div>
                            <span className="gallery-label">{getLocalizedText(scene.title)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SceneGallery;
