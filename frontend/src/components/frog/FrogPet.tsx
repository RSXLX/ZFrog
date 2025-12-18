import React, { useState, useEffect } from 'react';
import { PetManager } from '../../utils/PetManager';

interface FrogPetProps {
    frogId?: number;
    name?: string;
    status?: string | 'Idle' | 'Traveling' | 'Returning';
}

type AnimationState = 'idle' | 'walk' | 'sleep' | 'jump';

export const FrogPet: React.FC<FrogPetProps> = ({ status: initialStatus = 'Idle' }) => {
    const [animationState, setAnimationState] = useState<AnimationState>('idle');
    const [direction, setDirection] = useState<'left' | 'right'>('right');

    useEffect(() => {
        // Simple random animation loop
        const interval = setInterval(() => {
            const rand = Math.random();
            if (rand > 0.8) {
                setAnimationState(prev => prev === 'idle' ? 'jump' : 'idle');
            } else if (rand > 0.95) {
                setDirection(prev => prev === 'left' ? 'right' : 'left');
            }
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only drag on left click
        if (e.button === 0) {
            PetManager.startDragging();
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        // Here we could invoke a native context menu if strictly needed, 
        // buy relying on the Tray Icon is often cleaner for Desktop Pets.
        // Or we can implement a custom HTML menu here.
    };

    const getEmoji = () => {
        switch (animationState) {
            case 'jump': return '🐸'; // Could use a different emoji or CSS transform
            case 'sleep': return '😴';
            case 'walk': return '🐸';
            default: return '🐸';
        }
    };

    return (
        <div 
            className="w-[200px] h-[200px] flex flex-col items-center justify-center relative overflow-hidden bg-transparent select-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onContextMenu={handleContextMenu}
            style={{ background: 'transparent' }}
        >
            {/* Speech Bubble / Status */}
            { initialStatus === 'Traveling' && (
             <div className="absolute top-4 bg-white p-2 rounded-lg text-xs shadow-md opacity-90 animate-pulse border border-green-100">
                Traveling...
             </div>
            )}

            {/* Frog Model */}
            <div 
                className={`text-8xl hover:scale-110 transition-transform duration-300 ${direction === 'left' ? '-scale-x-100' : ''} ${animationState === 'jump' ? '-translate-y-4' : ''}`}
            >
                {getEmoji()}
            </div>
        </div>
    );
};
