import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { modulesAPI } from '../services/api';

const Sidebar = () => {
    const { admin, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [modules, setModules] = useState([]);
    const [expandedModule, setExpandedModule] = useState(null);

    useEffect(() => {
        modulesAPI.getAll()
            .then(res => {
                const data = res.data?.data || res.data || [];
                setModules(data);
            })
            .catch(err => console.error("Sidebar modules yuklashda xato:", err));
    }, []);

    useEffect(() => {
        const match = location.pathname.match(/\/admin\/modules\/([^\/]+)/);
        if (match && match[1] && match[1] !== 'new') {
            setExpandedModule(match[1]);
        }
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    const toggleModule = (slug) => {
        setExpandedModule(prev => prev === slug ? null : slug);
    };

    const getModuleName = (mod) => {
        if (!mod || !mod.name) return mod?.slug || '';
        if (typeof mod.name === 'string') return mod.name;
        return mod.name.uz || mod.name.ru || mod.name.en || mod.slug;
    };

    return (
        <aside className="admin-sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="3" />
                        <line x1="12" y1="2" x2="12" y2="5" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                        <line x1="2" y1="12" x2="5" y2="12" />
                        <line x1="19" y1="12" x2="22" y2="12" />
                    </svg>
                </div>
                <span className="sidebar-logo-text">Street Viewer</span>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <p className="sidebar-nav-label">Boshqaruv</p>
                <NavLink
                    to="/admin/modules"
                    end
                    className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                    <span className="sidebar-nav-icon">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                    </span>
                    <span>Barcha Modullar</span>
                </NavLink>

                {modules.length > 0 && (
                    <p className="sidebar-nav-label" style={{ marginTop: '1rem' }}>Sizning Modullaringiz</p>
                )}

                {modules.map((mod) => {
                    const isExpanded = expandedModule === mod.slug;
                    return (
                        <div key={mod.slug} className={`sidebar-accordion ${isExpanded ? 'expanded' : ''}`}>
                            <div 
                                className={`sidebar-nav-item accordion-header ${isExpanded ? 'active' : ''}`}
                                onClick={() => toggleModule(mod.slug)}
                                style={{ cursor: 'pointer' }}
                            >
                                <span className="sidebar-nav-icon">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                </span>
                                <span style={{ flex: 1 }}>{getModuleName(mod)}</span>
                                <span className="accordion-chevron" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </span>
                            </div>
                            
                            <div className="accordion-content" style={{
                                maxHeight: isExpanded ? '200px' : '0',
                                overflow: 'hidden',
                                transition: 'max-height 0.3s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                marginLeft: '1rem',
                                paddingLeft: '1rem',
                                borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                                <NavLink to={`/admin/modules/${mod.slug}/edit`} className={({isActive}) => `sidebar-sub-item ${isActive ? 'active' : ''}`}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                    Tahrirlash
                                </NavLink>
                                <NavLink to={`/admin/modules/${mod.slug}/minimap`} className={({isActive}) => `sidebar-sub-item ${isActive ? 'active' : ''}`}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
                                    MiniMap
                                </NavLink>
                                <NavLink to={`/admin/modules/${mod.slug}/scenes`} className={({isActive}) => `sidebar-sub-item ${isActive ? 'active' : ''}`}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                    Sahnalar
                                </NavLink>
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {admin?.email?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="sidebar-user-info">
                        <p className="sidebar-user-email">{admin?.email}</p>
                        <p className="sidebar-user-role">Administrator</p>
                    </div>
                </div>
                <button className="sidebar-logout-btn" onClick={handleLogout} title="Chiqish">
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
