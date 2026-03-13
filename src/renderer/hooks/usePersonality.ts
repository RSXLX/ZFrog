import { useMemo } from 'react';

// --- Type Definitions ---
export type CareEventType = 
    | 'feed' 
    | 'play_game' 
    | 'social_visit'
    | 'send_gift'
    | 'neglect';

export interface CareEvent {
  type: CareEventType;
  timestamp: number; // Unix timestamp
  value?: string | number | boolean; // e.g., 'healthy_food', 'unhealthy_food', game_score, won_game
}

export interface PersonalityTraits {
    /** How outgoing and friendly the pet is. Increased by social interactions. */
    friendliness: number; // 0-100
    /** How much the pet enjoys physical or fast-paced games. */
    activeness: number; // 0-100
    /** How proficient the pet is at puzzle-solving and learning. */
    intelligence: number; // 0-100
    /** How disciplined the pet is with food. */
    discipline: number; // 0-100
}

export type DominantPersonality = 
    | 'The Social Butterfly'
    | 'The Energetic Athlete'
    | 'The Quiet Genius'
    | 'The Gourmet Foodie'
    | 'The Lazy Bones'
    | 'Well-Balanced Pal';

export interface PersonalityProfile {
    traits: PersonalityTraits;
    dominant: DominantPersonality;
}

const INITIAL_TRAITS: PersonalityTraits = {
    friendliness: 50,
    activeness: 50,
    intelligence: 50,
    discipline: 50,
};

// --- The Custom Hook ---
export const usePersonality = (careHistory: CareEvent[]): PersonalityProfile => {

  const personalityProfile = useMemo<PersonalityProfile>(() => {
    console.log("Recalculating personality based on care history...");

    const traits = careHistory.reduce((currentTraits, event) => {
        const newTraits = { ...currentTraits };

        switch (event.type) {
            case 'feed':
                if (event.value === 'healthy_food') {
                    newTraits.discipline = Math.min(100, newTraits.discipline + 2);
                } else if (event.value === 'unhealthy_food') {
                    newTraits.discipline = Math.max(0, newTraits.discipline - 3);
                }
                break;
            
            case 'play_game':
                if (event.value === 'catch_items_high_score') {
                    newTraits.activeness = Math.min(100, newTraits.activeness + 4);
                } else if (event.value === 'memory_cards_win') {
                    newTraits.intelligence = Math.min(100, newTraits.intelligence + 4);
                } else {
                    // Generic play boosts
                    newTraits.activeness = Math.min(100, newTraits.activeness + 1);
                    newTraits.intelligence = Math.min(100, newTraits.intelligence + 1);
                }
                break;
            
            case 'social_visit':
            case 'send_gift':
                newTraits.friendliness = Math.min(100, newTraits.friendliness + 5);
                break;
            
            case 'neglect': // e.g., not interacting for a long time
                newTraits.friendliness = Math.max(0, newTraits.friendliness - 2);
                newTraits.activeness = Math.max(0, newTraits.activeness - 2);
                break;
        }
        return newTraits;

    }, INITIAL_TRAITS);

    // Determine dominant personality
    let dominant: DominantPersonality = 'Well-Balanced Pal';
    const traitEntries = Object.entries(traits) as [keyof PersonalityTraits, number][];
    const [highestTrait, highestValue] = traitEntries.reduce((max, entry) => entry[1] > max[1] ? entry : max, ['', -1]);
    const [lowestTrait, lowestValue] = traitEntries.reduce((min, entry) => entry[1] < min[1] ? entry : min, ['', 101]);

    if (highestValue > 75) {
        if (highestTrait === 'friendliness') dominant = 'The Social Butterfly';
        else if (highestTrait === 'activeness') dominant = 'The Energetic Athlete';
        else if (highestTrait === 'intelligence') dominant = 'The Quiet Genius';
    }
    
    if (lowestValue < 25) {
        if (lowestTrait === 'discipline') dominant = 'The Gourmet Foodie';
        else if (lowestTrait === 'activeness') dominant = 'The Lazy Bones';
    }

    return {
        traits,
        dominant,
    };

  }, [careHistory]);

  return personalityProfile;
};

export default usePersonality;