import { useState } from 'react';
import PanoramaViewer from './components/PanoramaViewer';
import { scenesData, getSceneById } from './data/scenes';
import './App.css';

function App() {
  const [currentSceneId, setCurrentSceneId] = useState('scene1');
  const currentScene = getSceneById(currentSceneId);

  const handleSceneChange = (newSceneId) => {
    const targetScene = getSceneById(newSceneId);
    if (targetScene) {
      setCurrentSceneId(newSceneId);
    }
  };

  return (
    <div className="app">
      <PanoramaViewer
        sceneData={currentScene}
        onSceneChange={handleSceneChange}
      />
    </div>
  );
}

export default App;
