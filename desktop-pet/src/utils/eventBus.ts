/**
 * Event Bus
 * Centralized event management for cross-component communication
 */

export type EventHandler<T = any> = (payload: T) => void;

interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler;
  once: boolean;
}

export class EventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private history: Array<{ event: string; payload: any; timestamp: number }> = [];
  private maxHistorySize: number = 1000;

  /**
   * Subscribe to an event
   */
  on<T>(event: string, handler: EventHandler<T>): () => void {
    return this.subscribe(event, handler, false);
  }

  /**
   * Subscribe to an event once
   */
  once<T>(event: string, handler: EventHandler<T>): () => void {
    return this.subscribe(event, handler, true);
  }

  /**
   * Internal subscribe method
   */
  private subscribe(event: string, handler: EventHandler, once: boolean): () => void {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, []);
    }

    const subscription: EventSubscription = {
      id: this.generateId(),
      event,
      handler,
      once,
    };

    this.subscriptions.get(event)!.push(subscription);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(event, subscription.id);
    };
  }

  /**
   * Unsubscribe from an event
   */
  private unsubscribe(event: string, subscriptionId: string): void {
    const eventSubscriptions = this.subscriptions.get(event);
    if (!eventSubscriptions) {
      return;
    }

    const index = eventSubscriptions.findIndex(sub => sub.id === subscriptionId);
    if (index !== -1) {
      eventSubscriptions.splice(index, 1);
    }

    // Clean up empty arrays
    if (eventSubscriptions.length === 0) {
      this.subscriptions.delete(event);
    }
  }

  /**
   * Emit an event
   */
  emit<T>(event: string, payload?: T): void {
    const eventSubscriptions = this.subscriptions.get(event);
    if (!eventSubscriptions || eventSubscriptions.length === 0) {
      return;
    }

    // Record in history
    this.addToHistory(event, payload);

    // Notify all subscribers
    // Create a copy of the array since handlers might modify subscriptions
    const subscriptionsToNotify = [...eventSubscriptions];

    for (const subscription of subscriptionsToNotify) {
      try {
        subscription.handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error in handler for event '${event}':`, error);
      }

      // Remove once listeners
      if (subscription.once) {
        this.unsubscribe(event, subscription.id);
      }
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: string, payload: any): void {
    this.history.push({
      event,
      payload,
      timestamp: Date.now(),
    });

    // Trim history if too large
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get event history
   */
  getHistory(event?: string, limit: number = 100): Array<{ event: string; payload: any; timestamp: number }> {
    let result = this.history;

    if (event) {
      result = result.filter(h => h.event === event);
    }

    return result.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Get list of active events
   */
  getActiveEvents(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get subscription count for an event
   */
  getSubscriptionCount(event: string): number {
    const eventSubscriptions = this.subscriptions.get(event);
    return eventSubscriptions ? eventSubscriptions.length : 0;
  }

  /**
   * Check if an event has any subscribers
   */
  hasSubscribers(event: string): boolean {
    return this.getSubscriptionCount(event) > 0;
  }

  /**
   * Wait for an event to occur
   */
  waitFor<T>(event: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;

      const unsubscribe = this.once<T>(event, (payload) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(payload);
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event '${event}'`));
        }, timeout);
      }
    });
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Destroy event bus
   */
  destroy(): void {
    this.subscriptions.clear();
    this.clearHistory();
    this.stop();
  }

  /**
   * Start (for consistency with other services)
   */
  start(): void {
    // Event bus is always "running"
    // This method exists for API consistency
  }

  /**
   * Stop (for consistency with other services)
   */
  stop(): void {
    // Event bus is always "running"
    // This method exists for API consistency
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Export types
export { EventHandler, EventSubscription };

// Default export
export default eventBus;
