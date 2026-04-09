import { useEffect, useRef, useState } from 'react';
import './Compass.css';

const Compass = ({ getYaw }) => {
    const [needleRotation, setNeedleRotation] = useState(0);
    const rafRef = useRef(null);
    const accRotationRef = useRef(0); // To'plangan rotatsiya (360° sakrashni oldini oladi)
    const displayHeadingRef = useRef(0); // Tooltip uchun haqiqiy gradus
    const [displayDeg, setDisplayDeg] = useState(0);

    useEffect(() => {
        const update = () => {
            if (typeof getYaw === 'function') {
                const heading = getYaw() ?? 0;
                const targetNeedle = -heading;

                // Oldingi va yangi orasidagi QISQA yo'l (delta = -180 ... +180)
                let delta = targetNeedle - accRotationRef.current;
                while (delta > 180) delta -= 360;
                while (delta < -180) delta += 360;

                const newRotation = accRotationRef.current + delta;
                accRotationRef.current = newRotation;

                setNeedleRotation(newRotation);
                setDisplayDeg(Math.round(((heading % 360) + 360) % 360));
            }
            rafRef.current = requestAnimationFrame(update);
        };

        rafRef.current = requestAnimationFrame(update);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [getYaw]);

    return (
        <div className="compass-wrapper" title={`${displayDeg}°`}>
            <div className="compass-circle">
                <div
                    className="compass-needle"
                    style={{ transform: `rotate(${needleRotation}deg)` }}
                >
                    {/* Qizil = North (yuqori), kulrang = South (pastki) */}
                    <div className="needle-north" />
                    <div className="needle-south" />
                </div>
                <div className="compass-center-dot" />
            </div>
        </div>
    );
};

export default Compass;
