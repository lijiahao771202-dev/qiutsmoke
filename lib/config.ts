export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const getApiUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const base = API_BASE_URL.replace(/\/$/, '');
    const endpoint = path.replace(/^\//, '');
    return base ? `${base}/${endpoint}` : path;
};
