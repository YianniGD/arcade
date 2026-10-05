import React, { useEffect } from 'react';

interface ScoreFloatProps {
    score: number;
    onComplete: () => void;
}

const ScoreFloat: React.FC<ScoreFloatProps> = ({ score, onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 800); // match animation duration
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div
            style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#776e65',
                animation: 'float-up 800ms ease-out forwards',
                zIndex: 50,
                pointerEvents: 'none'
            }}
        >
            +{score}
        </div>
    );
};

export default ScoreFloat;
