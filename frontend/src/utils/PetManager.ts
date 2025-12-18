import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export class PetManager {
    /**
     * Start dragging the window.
     * This should be called on onMouseDown event.
     */
    static async startDragging() {
        try {
            await getCurrentWindow().startDragging();
        } catch (error) {
            console.error('Failed to start dragging:', error);
        }
    }

    /**
     * Spawns a new pet window.
     */
    static async spawnNewPet() {
        try {
            await invoke('spawn_new_pet');
        } catch (error) {
            console.error('Failed to spawn new pet:', error);
        }
    }

    /**
     * Saves the current positions of all pets.
     * This is usually handled automatically by the backend, but exposed if needed.
     */
    static async saveState() {
        try {
            await invoke('save_app_state');
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }
}
