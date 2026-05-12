import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { modulesAPI, uploadAPI, resolveImageUrl } from '../services/api';

const LANG_TABS = ['uz', 'ru', 'en'];
const LANG_LABELS = { uz: "O'zbekcha", ru: "Русский", en: "English" };

const ModuleFormPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isEdit = Boolean(slug);

    const [form, setForm] = useState({
        slug: '',
        name: { uz: '', ru: '', en: '' },
        description: { uz: '', ru: '', en: '' },
        thumbnail: '',
        order: 1,
        isActive: true
    });
    
    const [originalSlug, setOriginalSlug] = useState('');
    const [langTab, setLangTab] = useState('uz');
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [error, setError] = useState('');

    const showErrorTrace = (msg, id) => {
        setError(msg);
        if (id) {
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('validation-error-outline');
                setTimeout(() => el.classList.remove('validation-error-outline'), 3500);
            }
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (isEdit) {
            modulesAPI.getOne(slug)
                .then(res => {
                    const data = res.data?.data || res.data;
                    setForm({
                        slug: data.slug || '',
                        name: data.name || { uz: '', ru: '', en: '' },
                        description: data.description || { uz: '', ru: '', en: '' },
                        thumbnail: data.thumbnail || '',
                        order: data.order || 1,
                        isActive: data.isActive ?? true
                    });
                    setOriginalSlug(data.slug || '');
                })
                .catch(err => {
                    setError(err.response?.data?.message || 'Modulni yuklashda xato');
                })
                .finally(() => setLoading(false));
        }
    }, [slug, isEdit]);

    const handleChange = (field, value) => {
        setForm(p => ({ ...p, [field]: value }));
    };

    const handleNestedChange = (parent, lang, value) => {
        setForm(p => ({
            ...p,
            [parent]: {
                ...p[parent],
                [lang]: value
            }
        }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadingImage(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('thumbnail', file);
            
            // Backend middleware expects a module slug in URL, 
            // if form.slug is not entered yet we can use 'default' or a temporary string.
            const uploadSlug = form.slug || 'default';
            const res = await uploadAPI.moduleThumbnail(uploadSlug, formData);
            
            if (res.data?.success) {
                handleChange('thumbnail', res.data.data.thumbnail);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Rasm yuklashda xatolik yuz berdi");
        } finally {
            setUploadingImage(false);
            e.target.value = null; // reset input
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.slug) {
            showErrorTrace("Modul slugi kiritilishi shart", "module-slug-input");
            return;
        }
        if (!form.name.uz) {
            setLangTab('uz');
            setTimeout(() => showErrorTrace("O'zbek tilida modul nomi kiritilishi shart", "module-name-uz-input"), 100);
            return;
        }

        setSaving(true);
        setError('');

        try {
            if (isEdit) {
                const res = await modulesAPI.update(slug, form);
                const responseData = res.data;
                window.dispatchEvent(new Event('modulesUpdated'));
                
                // Agar slug o'zgartirilgan bo'lsa, yangi slug ga yo'naltirish
                if (responseData.slugChanged && responseData.newSlug) {
                    navigate(`/admin/modules/${responseData.newSlug}/edit`, { replace: true });
                } else {
                    navigate('/admin/modules');
                }
            } else {
                await modulesAPI.create(form);
                window.dispatchEvent(new Event('modulesUpdated'));
                navigate('/admin/modules');
            }
        } catch (err) {
            showErrorTrace(err.response?.data?.message || err.message || 'Saqlashda xato');
        } finally {
            setSaving(false);
        }
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

    const slugChanged = isEdit && form.slug !== originalSlug;

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isEdit ? 'Modulni Tahrirlash' : 'Yangi Modul Qo\'shish'}</h1>
                </div>
            </div>

            {error && <div className="admin-alert error">{error}</div>}
            
            {slugChanged && (
                <div className="admin-alert" style={{ 
                    background: 'rgba(251, 191, 36, 0.1)', 
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    color: '#fbbf24',
                    borderRadius: '12px',
                    padding: '0.85rem 1.1rem',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Slug o'zgartirilmoqda: <strong>"{originalSlug}"</strong> → <strong>"{form.slug}"</strong>. 
                    Bog'langan barcha sahnalar va xaritalar avtomatik yangilanadi.
                </div>
            )}

            <form onSubmit={handleSubmit} className="admin-form">
                
                <div className="form-card">
                    <h2 className="form-section-title">Asosiy ma'lumotlar</h2>

                    {/* Modul faolligi (1-bo'lib ko'rinishi uchun yuqoriga olindi) */}
                    <div className="form-field" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginBottom: '20px', 
                        padding: '16px', 
                        background: form.isActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(0, 0, 0, 0.03)', 
                        borderRadius: '10px', 
                        border: form.isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease'
                    }}>
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={form.isActive}
                            onChange={(e) => handleChange('isActive', e.target.checked)}
                            style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                        />
                        <label htmlFor="isActive" className="form-label" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '1.1rem', fontWeight: '600', color: form.isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                            Modul faol (ko'rinishda bo'ladi)
                        </label>
                    </div>

                    <div className="form-grid-2">
                        <div className="form-field">
                            <label className="form-label">
                                Modul Slug (URL uchun) <span className="required">*</span>
                            </label>
                            <input
                                id="module-slug-input"
                                type="text"
                                className="form-input"
                                value={form.slug}
                                onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                placeholder="masalan: fizmat"
                            />
                            <p className="form-hint">
                                Faqat kichik lotin harflari, raqamlar va chiziqchalar.
                                {isEdit && (
                                    <span style={{ color: 'var(--color-accent, #6366f1)' }}>
                                        {' '}O'zgartirish mumkin — bog'lanishlar avtomatik yangilanadi.
                                    </span>
                                )}
                            </p>
                        </div>
                        
                        <div className="form-field">
                            <label className="form-label">Tartib raqami (Order)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={form.order}
                                onChange={(e) => handleChange('order', parseInt(e.target.value))}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-card">
                    <h2 className="form-section-title">Matnlar (Ko'p tilli)</h2>
                    <div className="lang-tabs">
                        {LANG_TABS.map((lang) => (
                            <button
                                key={lang}
                                type="button"
                                className={`lang-tab ${langTab === lang ? 'active' : ''}`}
                                onClick={() => setLangTab(lang)}
                            >
                                {LANG_LABELS[lang]}
                            </button>
                        ))}
                    </div>
                    <div className="form-grid-1">
                        <div className="form-field">
                            <label className="form-label">Modul Nomi ({langTab.toUpperCase()}) <span className="required">*</span></label>
                            <input
                                id={`module-name-${langTab}-input`}
                                type="text"
                                className="form-input"
                                placeholder={`Modul nomi (${langTab})`}
                                value={form.name[langTab]}
                                onChange={(e) => handleNestedChange('name', langTab, e.target.value)}
                                required={langTab === 'uz'}
                            />
                        </div>
                        <div className="form-field">
                            <label className="form-label">Tavsif ({langTab.toUpperCase()})</label>
                            <textarea
                                className="form-textarea"
                                rows={3}
                                placeholder={`Qisqacha tavsif (${langTab})`}
                                value={form.description[langTab]}
                                onChange={(e) => handleNestedChange('description', langTab, e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-card">
                    <h2 className="form-section-title">Modul Rasmi (Thumbnail)</h2>
                    <div className="form-field">
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                            <div style={{ flex: '1 1 300px' }}>
                                <div className="upload-area" style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: 0, background: 'transparent', border: 'none' }}>
                                    <div className="upload-fields">
                                        <div className="upload-field">
                                            <label className="file-upload-btn" style={{ opacity: uploadingImage ? 0.6 : 1, cursor: uploadingImage ? 'not-allowed' : 'pointer' }}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                                    <polyline points="17 8 12 3 7 8" />
                                                    <line x1="12" y1="3" x2="12" y2="15" />
                                                </svg>
                                                Qurilmadan tanlash va yuklash
                                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploadingImage} />
                                            </label>
                                        </div>
                                    </div>
                                    {uploadingImage && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                            <div className="admin-spinner-sm" /> Rasm yuklanmoqda...
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {form.thumbnail && (
                                <div style={{
                                    width: '200px',
                                    height: '150px',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: '2px solid rgba(255, 255, 255, 0.1)',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                                    flexShrink: 0,
                                    position: 'relative'
                                }}>
                                    <div style={{ position: 'absolute', top: '5px', left: '5px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', zIndex: 1 }}>
                                        Oldindan ko'rish
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm("Modul rasmini o'chirmoqchimisiz? Bo'shatilgach, ushbu modul switcheri default sahna rasmidan foydalanadi. Saqlangandan so'ng faqat o'zgarish kuchga kiradi.")) {
                                                handleChange('thumbnail', '');
                                            }
                                        }}
                                        title="Rasmni o'chirish"
                                        style={{
                                            position: 'absolute',
                                            top: '5px',
                                            right: '5px',
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            border: 'none',
                                            background: 'rgba(220, 38, 38, 0.9)',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 2,
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                                            transition: 'background 0.15s, transform 0.15s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.transform = 'scale(1.08)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220, 38, 38, 0.9)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                    <img
                                        src={resolveImageUrl(form.thumbnail)}
                                        alt="Thumbnail preview"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/200x150?text=Xato'; }}
                                    />
                                </div>
                            )}
                            {!form.thumbnail && isEdit && (
                                <div style={{
                                    flex: '1 1 300px',
                                    fontSize: '0.85rem',
                                    color: 'var(--color-text-muted, #9ca3af)',
                                    background: 'rgba(99, 102, 241, 0.06)',
                                    border: '1px dashed rgba(99, 102, 241, 0.3)',
                                    borderRadius: '10px',
                                    padding: '12px 14px',
                                    lineHeight: 1.5,
                                }}>
                                    💡 Modul rasmi belgilangan emas. Modul ro'yxatida (Binolar) ushbu modulning <strong>default sahnasidan</strong> avtomatik thumb olinadi.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-ghost" onClick={() => navigate('/admin/modules')}>
                        Bekor qilish
                    </button>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? (
                            <><div className="admin-spinner-sm" /> Saqlanmoqda...</>
                        ) : (
                            isEdit ? 'Yangilash' : 'Modulni Yaratish'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ModuleFormPage;
