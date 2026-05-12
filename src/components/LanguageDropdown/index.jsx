import { useState, useEffect, useRef } from 'react';
import './LanguageDropdown.css';

// SVG bayroqchalar
const FlagUz = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
        <rect fill="#1eb53a" width="512" height="512" />
        <rect fill="#0099b5" width="512" height="170.6" y="0" />
        <rect fill="#ce1126" width="512" height="170.6" y="170.6" />
        <rect fill="#fff" width="512" height="150" y="181" />
        {/* Oy va yulduzlar (soddalashtirilgan) */}
        <circle fill="#fff" cx="120" cy="85" r="40" />
        <circle fill="#0099b5" cx="135" cy="85" r="40" />
        <g fill="#fff" transform="translate(180, 50) scale(0.6)">
            <circle cx="20" cy="20" r="10" /><circle cx="55" cy="20" r="10" /><circle cx="90" cy="20" r="10" /><circle cx="125" cy="20" r="10" /><circle cx="160" cy="20" r="10" />
            <circle cx="20" cy="60" r="10" /><circle cx="55" cy="60" r="10" /><circle cx="90" cy="60" r="10" /><circle cx="125" cy="60" r="10" />
            <circle cx="20" cy="100" r="10" /><circle cx="55" cy="100" r="10" /><circle cx="90" cy="100" r="10" />
        </g>
    </svg>
);

const FlagRu = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
        <rect fill="#fff" width="512" height="512" />
        <rect fill="#1d00c6" width="512" height="341" y="171" />
        <rect fill="#d52b1e" width="512" height="171" y="341" />
    </svg>
);

const FlagEn = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
        <rect fill="#012169" width="512" height="512" />
        <path fill="#fff" d="M0 0h512v512H0z" />
        <path fill="#012169" d="M0 0h512v512H0z" />
        <path fill="#fff" d="M0 0l512 512m0-512L0 512" stroke="#fff" strokeWidth="60" />
        <path fill="#C8102E" d="M0 0l512 512m0-512L0 512" stroke="#C8102E" strokeWidth="40" />
        <path fill="#fff" d="M226 0h60v512h-60zM0 226h512v60H0z" />
        <path fill="#C8102E" d="M236 0h40v512h-40zM0 236h512v40H0z" />
    </svg>
);

const languages = [
    { code: 'uz', label: 'Uzb', icon: <FlagUz /> },
    { code: 'ru', label: 'Rus', icon: <FlagRu /> },
    { code: 'en', label: 'Eng', icon: <FlagEn /> },
];

const LanguageDropdown = ({ isLang, setIsLang }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const activeLang = languages.find((lang) => lang.code === isLang) || languages[0];
    const availableLanguages = languages.filter((lang) => lang.code !== isLang);

    const handleToggleLang = (code) => {
        setIsLang(code);
        setIsOpen(false);
    };

    // Tashqi joyga bosilsa yopilishi uchun
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className={`lang-dropdown-container ${isOpen ? 'is-open' : ''}`}>
            {/* Dropdown tugmasi */}
            <button
                className="lang-dropdown-btn"
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <div className="lang-flag-circle">
                    {activeLang.icon}
                </div>
                <span className="lang-label">{activeLang.label}</span>
                <svg
                    className={`lang-chevron ${isOpen ? 'open' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {/* Dropdown menyusi — har doim render, animatsiya CSS orqali */}
            <ul className="lang-dropdown-menu" aria-hidden={!isOpen}>
                {availableLanguages.map((lang) => (
                    <li key={lang.code}>
                        <button
                            className="lang-dropdown-item"
                            onClick={() => handleToggleLang(lang.code)}
                            tabIndex={isOpen ? 0 : -1}
                        >
                            <div className="lang-flag-circle">
                                {lang.icon}
                            </div>
                            <span>{lang.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default LanguageDropdown;
