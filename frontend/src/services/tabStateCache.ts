const STORAGE_PREFIX = 'mixu.tab-state.';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const readTabState = <T>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') {
        return fallback;
    }

    try {
        const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (!raw) {
            return fallback;
        }

        const parsed = JSON.parse(raw) as T;
        if (isPlainObject(fallback) && isPlainObject(parsed)) {
            return {
                ...fallback,
                ...parsed,
            } as T;
        }

        return parsed;
    } catch (error) {
        console.error('Failed to read tab state:', error);
        return fallback;
    }
};

export const writeTabState = (key: string, value: unknown) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    } catch (error) {
        console.error('Failed to write tab state:', error);
    }
};

export const clearTabState = (key: string) => {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`);
    } catch (error) {
        console.error('Failed to clear tab state:', error);
    }
};
