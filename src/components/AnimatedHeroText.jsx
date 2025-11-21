import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

const AnimatedHeroText = ({ text, className = '' }) => {
    const containerRef = useRef(null);

    useGSAP(() => {
        const chars = containerRef.current.querySelectorAll('.hero-char');

        gsap.fromTo(chars,
            {
                opacity: 0,
                y: 100,
                filter: 'blur(10px)',
                rotateX: -45
            },
            {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                rotateX: 0,
                duration: 1,
                stagger: 0.05,
                ease: 'power4.out',
                delay: 0.2
            }
        );
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className={`overflow-hidden py-4 px-2 -my-4 ${className}`} style={{ perspective: '1000px' }}>
            {text.split('').map((char, i) => (
                <span
                    key={i}
                    className="hero-char inline-block origin-bottom"
                    style={{ whiteSpace: 'pre' }}
                >
                    {char}
                </span>
            ))}
        </div>
    );
};

export default AnimatedHeroText;
