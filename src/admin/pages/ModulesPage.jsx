import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { modulesAPI, resolveImageUrl } from '../services/api';

const ModulesPage = () => {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const fetchModules = async () => {
        setLoading(true);
        try {
            // all=true to fetch all including inactive
            const res = await modulesAPI.getAll(true);
            setModules(res.data?.data || res.data || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Modullarni yuklashda xato');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchModules();
    }, []);

    const handleDelete = async (slug, e) => {
        e.stopPropagation();
        if (modules.length <= 1) {
            alert('Oxirgi modulni o\'chirib bo\'lmaydi. Kamida bitta modul bo\'lishi kerak.');
            return;
        }
        if (window.confirm("Rostdan ham bu modulni o'chirmoqchimisiz? (Faqat bo'sh modullar o'chiriladi)")) {
            try {
                await modulesAPI.delete(slug);
                setModules(p => p.filter(m => m.slug !== slug));
                window.dispatchEvent(new Event('modulesUpdated'));
            } catch (err) {
                alert(err.response?.data?.message || "O'chirishda xatolik yuz berdi");
            }
        }
    };

    const getModuleName = (mod) => {
        if (!mod.name) return mod.slug;
        if (typeof mod.name === 'string') return mod.name;
        return mod.name.uz || mod.name.ru || mod.name.en || mod.slug;
    };

    if (loading) {
        return (
            <div className="admin-page">
                <div className="admin-loading-center">
                    <div className="admin-spinner" />
                    <p>Yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Modullar</h1>
                    <p className="page-subtitle">Barcha virtual turlar va hududlar boshqaruvi</p>
                </div>
                <button className="btn-primary" onClick={() => navigate('/admin/modules/new')}>
                    + Yangi Modul
                </button>
            </div>

            {error && <div className="admin-alert error">{error}</div>}

            <div className="scenes-grid">
                {modules.map(mod => (
                    <div key={mod.slug} className="scene-card module-card" onClick={() => navigate(`/admin/modules/${mod.slug}/scenes`)}>
                        <div className="scene-card-thumb">
                            {mod.thumbnail ? (
                                <img src={resolveImageUrl(mod.thumbnail)} alt={getModuleName(mod)} />
                            ) : (
                                <div className="scene-card-no-thumb">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                    </svg>
                                </div>
                            )}
                            <div className={`module-status-badge ${mod.isActive ? 'active' : 'inactive'}`}>
                                {mod.isActive ? 'Faol' : 'Nofaol'}
                            </div>
                        </div>
                        <div className="scene-card-info">
                            <h3 className="scene-card-title">{getModuleName(mod)}</h3>
                            <p className="scene-card-subtitle">{mod.slug}</p>
                            <div className="module-card-actions">
                                <button className="btn-sm btn-secondary" onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/modules/${mod.slug}/edit`);
                                }}>Tahrirlash</button>
                                <button className="btn-sm btn-secondary" onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/admin/modules/${mod.slug}/minimap`);
                                }}>Xarita</button>
                                {modules.length > 1 && (
                                    <button className="btn-sm btn-icon-danger" onClick={(e) => handleDelete(mod.slug, e)}>
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {modules.length === 0 && !error && (
                <div className="empty-state">
                    <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    <h3>Modullar yo'q</h3>
                    <p>Hali hech qanday modul qo'shilmagan</p>
                </div>
            )}
        </div>
    );
};

export default ModulesPage;
