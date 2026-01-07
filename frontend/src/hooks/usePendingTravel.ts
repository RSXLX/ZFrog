import { useState, useEffect, useCallback } from 'react';

interface PendingTravelState {
    txHash: string;
    frogId: number;
    tokenId: number;
    targetChainId: number;
    duration: number;
    timestamp: number;
}

const STORAGE_KEY = 'pending_cross_chain_travel';

export function usePendingTravel(currentFrogId?: number) {
    const [pendingState, setPending] = useState<PendingTravelState | null>(null);

    // Initialize from storage
    useEffect(() => {
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // Check if expired (e.g. > 10 minutes)
                if (Date.now() - data.timestamp > 10 * 60 * 1000) {
                    sessionStorage.removeItem(STORAGE_KEY);
                    setPending(null);
                } else {
                    setPending(data);
                }
            }
        } catch (e) {
            console.error('Failed to parse pending travel state', e);
        }
    }, []);

    // Helper to set pending state
    const setPendingTravel = useCallback((data: Omit<PendingTravelState, 'timestamp'>) => {
        const fullData = { ...data, timestamp: Date.now() };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fullData));
        setPending(fullData);
        
        // Dispatch event for other components to react immediately
        window.dispatchEvent(new CustomEvent('travel:pending', { detail: fullData }));
    }, []);

    // Helper to clear pending state
    const clearPendingTravel = useCallback(() => {
        sessionStorage.removeItem(STORAGE_KEY);
        setPending(null);
        window.dispatchEvent(new CustomEvent('travel:cleared'));
    }, []);

    // Check if current frog matches pending frog
    const isPending = pendingState && (currentFrogId === undefined || pendingState.frogId === currentFrogId);

    return {
        pendingTravel: isPending ? pendingState : null,
        setPendingTravel,
        clearPendingTravel
    };
}
