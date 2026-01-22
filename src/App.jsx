import { useState } from 'react';
import PanoramaViewer from './components/PanoramaViewer';
import { scenesData, getSceneByImage } from './data/scenes';
import './App.css';

function App() {
  const [currentScene, setCurrentScene] = useState(() => {
    return scenesData.find(scene => scene.initialImage) || scenesData[0];
  });
  const [customYaw, setCustomYaw] = useState(null);
  const [customHfov, setCustomHfov] = useState(null);

  const handleSceneChange = (targetImage, trueHeading = null, currentHfov = null) => {
    const targetScene = getSceneByImage(targetImage);
    if (targetScene) {
      // If trueHeading is provided (transition), calculate new yaw
      if (trueHeading !== null) {
        const nextOffset = targetScene.initialView?.x || 0;
        setCustomYaw(trueHeading + nextOffset);
        // Persist HFOV if provided
        if (currentHfov !== null) {
          setCustomHfov(currentHfov);
        }
      } else {
        // Direct jump (e.g. initial load), reset
        setCustomYaw(null);
        setCustomHfov(null);
      }
      setCurrentScene(targetScene);
    }
  };

  return (
    <div className="app">
      <PanoramaViewer
        sceneData={currentScene}
        initialYaw={customYaw}
        initialHfov={customHfov}
        onSceneChange={handleSceneChange}
      />
    </div>
  );
}

export default App;
