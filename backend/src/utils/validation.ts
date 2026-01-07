// backend/src/utils/validation.ts
// Input validation utilities

/**
 * Safely parse integer from query/body params
 * Returns defaultValue if parsing fails or result is NaN
 */
export function safeParseInt(value: any, defaultValue: number = 0): number {
    if (value === undefined || value === null) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parse positive integer
 * Returns null if value is not a valid positive integer
 */
export function parsePositiveInt(value: any): number | null {
    if (value === undefined || value === null) return null;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) return null;
    return parsed;
}

/**
 * Validate ethereum address format
 */
export function isValidAddress(address: any): boolean {
    if (typeof address !== 'string') return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Sanitize address to lowercase
 */
export function sanitizeAddress(address: string): string {
    return address.toLowerCase().trim();
}

/**
 * Validate chain ID is supported
 */
export function isValidChainId(chainId: number, supportedChains: number[]): boolean {
    return supportedChains.includes(chainId);
}

/**
 * Validate travel duration within bounds
 */
export function isValidDuration(duration: number, min: number = 60, max: number = 86400): boolean {
    return duration >= min && duration <= max;
}

/**
 * Validate required fields in body
 */
export function validateRequiredFields<T extends object>(
    body: T,
    requiredFields: (keyof T)[]
): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    for (const field of requiredFields) {
        if (body[field] === undefined || body[field] === null) {
            missing.push(String(field));
        }
    }
    return { valid: missing.length === 0, missing };
}
