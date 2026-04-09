import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { modulesAPI } from '../services/api';

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
    
    const [langTab, setLangTab] = useState('uz');
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            if (isEdit) {
                // Yangilashda slug yuborilmaydi (yoki controller uni ignore qiladi)
                await modulesAPI.update(slug, form);
            } else {
                if (!form.slug) {
                    throw new Error("Modul slugi kiritilishi shart");
                }
                await modulesAPI.create(form);
            }
            navigate('/admin/modules');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Saqlashda xato');
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

    return (
        <div className="admin-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isEdit ? 'Modulni Tahrirlash' : 'Yangi Modul Qo\'shish'}</h1>
                </div>
            </div>

            {error && <div className="admin-alert error">{error}</div>}

            <form onSubmit={handleSubmit} className="admin-form">
                
                <div className="form-card">
                    <h2 className="form-section-title">Asosiy ma'lumotlar</h2>
                    <div className="form-grid-2">
                        <div className="form-field">
                            <label className="form-label">
                                Modul Slug (URL uchun) <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={form.slug}
                                onChange={(e) => handleChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                placeholder="masalan: fizmat"
                                disabled={isEdit}
                            />
                            <p className="form-hint">Faqat kichik lotin harflari, raqamlar va chiziqchalar.</p>
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
                    <h2 className="form-section-title">Holat & Rasm</h2>
                    <div className="form-grid-2">
                        <div className="form-field">
                            <label className="form-label">Thumbnail URL</label>
                            <input
                                type="text"
                                className="form-input"
                                value={form.thumbnail}
                                onChange={(e) => handleChange('thumbnail', e.target.value)}
                                placeholder="http://..."
                            />
                        </div>
                        <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '25px' }}>
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={form.isActive}
                                onChange={(e) => handleChange('isActive', e.target.checked)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <label htmlFor="isActive" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                                Modul faol (ko'rinishda bo'ladi)
                            </label>
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
