import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';

// 360° Viewer
import PanoramaViewer from './components/PanoramaViewer';
import MiniMap from './components/MiniMap';
import LanguageDropdown from './components/LanguageDropdown';
import Compass from './components/Compass';
import { scenesAPI, modulesAPI } from './admin/services/api';
import './App.css';

// Admin Panel
import LoginPage from './admin/pages/LoginPage';
import DashboardLayout from './admin/pages/DashboardLayout';
import ModulesPage from './admin/pages/ModulesPage';
import ModuleFormPage from './admin/pages/ModuleFormPage';
import ScenesPage from './admin/pages/ScenesPage';
import SceneFormPage from './admin/pages/SceneFormPage';
import MiniMapPage from './admin/pages/MiniMapPage';
import ProtectedRoute from './admin/components/ProtectedRoute';

// ── Homepage: modullar ro'yxatidan birinchi modulga redirect ──
function HomePage() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    modulesAPI.getAll()
      .then((res) => {
        const modules = res.data?.data || res.data || [];
        if (modules.length > 0) {
          // Birinchi navbatda 'default' bo'lmagan modulni qidiramiz
          const targetMod = modules.find(m => m.slug !== 'default') || modules[0];
          navigate(`/${targetMod.slug}`, { replace: true });
        } else {
          setChecked(true);
        }
      })
      .catch(() => setChecked(true));
  }, [navigate]);

  if (!checked) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-spinner" />
        <p>Yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="admin-loading-screen">
      <h2>Modullar topilmadi!</h2>
    </div>
  );
}

// ── Main 360° Viewer (module-scoped) ────────────────────────────────
function ViewerApp() {
  const { moduleSlug } = useParams();
  const [scenes, setScenes] = useState([]);
  const [currentScene, setCurrentScene] = useState(null);
  const [customYaw, setCustomYaw] = useState(null);
  const [customPitch, setCustomPitch] = useState(null);
  const [customHfov, setCustomHfov] = useState(null);
  const [isLang, setIsLang] = useState(() => {
    return localStorage.getItem('selectedLanguage') || 'uz';
  });

  useEffect(() => {
    localStorage.setItem('selectedLanguage', isLang);
  }, [isLang]);
  const [loading, setLoading] = useState(true);
  const viewerRef = useRef(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    setLoading(true);
    setScenes([]);
    setCurrentScene(null);
    setCustomYaw(null);
    setCustomPitch(null);
    setCustomHfov(null);

    scenesAPI.getAll(moduleSlug)
      .then((res) => {
        const data = res.data?.data || res.data || [];
        setScenes(data);
        if (data.length > 0) {
          const storageKey = `viewerState_${moduleSlug}`;
          const savedStateStr = sessionStorage.getItem(storageKey);
          let savedState = null;
          try {
            savedState = savedStateStr ? JSON.parse(savedStateStr) : null;
          } catch(e) {}

          if (isInitialMount.current && savedState && data.some(s => s.id === savedState.sceneId)) {
            setCurrentScene(data.find(s => s.id === savedState.sceneId));
            setCustomYaw(savedState.yaw);
            setCustomPitch(savedState.pitch);
            setCustomHfov(savedState.hfov);
          } else {
            const defaultScene = data.find(s => s.initialScene && typeof s.initialScene === 'object') || data[0];
            setCurrentScene(defaultScene);
            setCustomYaw(null);
            setCustomPitch(null);
            setCustomHfov(null);
          }
        }
      })
      .catch(err => {
        console.error('API dan sahnlarni yuklashda xato:', err);
      })
      .finally(() => {
        setLoading(false);
        isInitialMount.current = false;
      });
  }, [moduleSlug]);

  // Viewerni joriy holatini sessionStorage ga muntazam saqlab borish
  useEffect(() => {
    const saveState = () => {
      if (viewerRef.current && currentScene) {
        const yaw = viewerRef.current.getCurrentYaw();
        const pitch = viewerRef.current.getCurrentPitch();
        const hfov = viewerRef.current.getCurrentHfov();
        
        sessionStorage.setItem(`viewerState_${moduleSlug}`, JSON.stringify({
          sceneId: currentScene.id,
          yaw,
          pitch,
          hfov
        }));
      }
    };

    window.addEventListener('beforeunload', saveState);
    const interval = setInterval(saveState, 500);

    return () => {
      saveState();
      window.removeEventListener('beforeunload', saveState);
      clearInterval(interval);
    };
  }, [currentScene, moduleSlug]);

  const handleSceneChange = (targetValue, trueHeading = null, currentHfov = null, currentPitch = null) => {
    let targetScene = scenes.find(scene => scene.id === targetValue);
    if (!targetScene) {
      targetScene = scenes.find(scene => {
        const imgUrl = typeof scene.image === 'string' ? scene.image : scene.image?.full;
        return imgUrl === targetValue || scene.image === targetValue;
      });
    }

    if (targetScene) {
      if (trueHeading !== null) {
        const nextNorthOffset = targetScene.northOffset || 0;
        let finalYaw = trueHeading + nextNorthOffset;

        while (finalYaw > 180) finalYaw -= 360;
        while (finalYaw < -180) finalYaw += 360;

        setCustomYaw(finalYaw);
        if (currentPitch !== null) setCustomPitch(currentPitch);
        if (currentHfov !== null) setCustomHfov(currentHfov);
      } else {
        setCustomYaw(null);
        setCustomPitch(null);
        setCustomHfov(null);
      }
      setCurrentScene(targetScene);
    } else {
      console.error(`Sahnaga o'tishda xato: "${targetValue}" ID li sahna topilmadi!`);
      alert(`Xatolik: "${targetValue}" ID li sahna mavjud emas yoki o'chirib yuborilgan. Iltimos Admin paneldan minimap sozlamalarini (Default Scene yoki pinlarni) tekshiring.`);
    }
  };

  if (!loading && scenes.length === 0) {
    return (
      <div className="admin-loading-screen">
        <h2>Sahnlar topilmadi!</h2>
      </div>
    );
  }

  return (
    <div className="app">
      <LanguageDropdown isLang={isLang} setIsLang={setIsLang} />

      <Compass 
        getYaw={() => {
          const raw = viewerRef.current?.getCurrentYaw() ?? 0;
          const northOffset = viewerRef.current?.getCurrentNorthOffset() ?? 0;
          return raw - northOffset + 180;
        }} 
        onReset={() => viewerRef.current?.lookAtNorth()}
      />

      <PanoramaViewer
        ref={viewerRef}
        sceneData={currentScene}
        allScenes={scenes}
        initialYaw={customYaw}
        initialPitch={customPitch}
        initialHfov={customHfov}
        onSceneChange={handleSceneChange}
        isLang={isLang}
      />
      <MiniMap
        moduleSlug={moduleSlug}
        currentScene={currentScene}
        isLang={isLang}
        onSceneSelect={(targetValue) => {
          const rawYaw = viewerRef.current?.getCurrentYaw() ?? 0;
          const northOffset = viewerRef.current?.getCurrentNorthOffset() ?? 0;
          const trueHeading = rawYaw - northOffset;
          handleSceneChange(targetValue, trueHeading, null, null);
        }}
      />
    </div>
  );
}

// ── Root App with Routing ──────────────────────────
function App() {
  return (
    <Routes>
      {/* Bosh sahifa → birinchi modulga redirect */}
      <Route path="/" element={<HomePage />} />

      {/* 360° Viewer — module-scoped */}
      <Route path="/:moduleSlug" element={<ViewerApp />} />

      {/* Admin Login */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* Admin Dashboard — himoyalangan */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/modules" replace />} />

        {/* Modullar */}
        <Route path="modules" element={<ModulesPage />} />
        <Route path="modules/new" element={<ModuleFormPage />} />
        <Route path="modules/:slug/edit" element={<ModuleFormPage />} />

        {/* Module-scoped: Sahnalar */}
        <Route path="modules/:slug/scenes" element={<ScenesPage />} />
        <Route path="modules/:slug/scenes/new" element={<SceneFormPage />} />
        <Route path="modules/:slug/scenes/:sceneId" element={<SceneFormPage />} />

        {/* Module-scoped: MiniMap */}
        <Route path="modules/:slug/minimap" element={<MiniMapPage />} />
      </Route>

      {/* 404 → Bosh sahifaga */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
