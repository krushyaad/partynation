// Party Nation Utility Functions

// Time formatting
const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Format numbers (1000 -> 1K)
const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

// Debounce function
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// Throttle function
const throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

// Image compression
const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > height && width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                } else if (height > maxWidth) {
                    width = (width * maxWidth) / height;
                    height = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Extract URLs from text
const extractUrls = (text) => {
    if (!text) return [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
};

// Extract mentions from text
const extractMentions = (text) => {
    if (!text) return [];
    const mentionRegex = /@(\w+)/g;
    const matches = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
        matches.push(match[1]);
    }
    return matches;
};

// Extract hashtags from text
const extractHashtags = (text) => {
    if (!text) return [];
    const hashtagRegex = /#(\w+)/g;
    const matches = [];
    let match;
    while ((match = hashtagRegex.exec(text)) !== null) {
        matches.push(match[1]);
    }
    return matches;
};

// Simple cache with TTL
class SimpleCache {
    constructor(ttl = 5 * 60 * 1000) {
        this.cache = new Map();
        this.ttl = ttl;
    }
    
    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }
    
    has(key) {
        return this.get(key) !== null;
    }
    
    delete(key) {
        this.cache.delete(key);
    }
    
    clear() {
        this.cache.clear();
    }
}

// User cache for quick lookups
const userCache = new SimpleCache(10 * 60 * 1000); // 10 min cache

// Music search cache
const musicCache = new SimpleCache(5 * 60 * 1000); // 5 min cache

// LocalStorage helpers with fallback
const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch {
            return false;
        }
    }
};

// Deezer music search with CORS proxy fallback
const searchMusic = async (query, limit = 15) => {
    if (!query || query.length < 2) return [];
    
    const cacheKey = `music_${query.toLowerCase()}`;
    const cached = musicCache.get(cacheKey);
    if (cached) return cached;
    
    const deezerUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    
    for (const proxyFn of MUSIC_CONFIG.corsProxies) {
        try {
            const response = await fetch(proxyFn(deezerUrl));
            if (!response.ok) continue;
            
            const data = await response.json();
            if (data.data) {
                const results = data.data.map(track => ({
                    id: track.id.toString(),
                    name: track.title || track.title_short,
                    artist: track.artist?.name || 'Unknown',
                    album: track.album?.title || 'Unknown',
                    albumArt: track.album?.cover_medium || null,
                    previewUrl: track.preview,
                    deezerUrl: track.link,
                    duration: track.duration * 1000,
                    explicit: track.explicit_lyrics
                }));
                
                musicCache.set(cacheKey, results);
                return results;
            }
        } catch (err) {
            console.log('Music proxy failed, trying next...');
        }
    }
    
    return [];
};

// Load trending music
const loadTrendingMusic = async () => {
    const cacheKey = 'music_trending';
    const cached = musicCache.get(cacheKey);
    if (cached) return cached;
    
    const deezerUrl = 'https://api.deezer.com/chart/0/tracks?limit=20';
    
    for (const proxyFn of MUSIC_CONFIG.corsProxies) {
        try {
            const response = await fetch(proxyFn(deezerUrl));
            if (!response.ok) continue;
            
            const data = await response.json();
            if (data.data) {
                const results = data.data.map(track => ({
                    id: track.id.toString(),
                    name: track.title,
                    artist: track.artist?.name,
                    albumArt: track.album?.cover_medium,
                    previewUrl: track.preview,
                    deezerUrl: track.link
                }));
                
                musicCache.set(cacheKey, results);
                return results;
            }
        } catch (err) {
            continue;
        }
    }
    
    return [];
};

// Export utilities
window.utils = {
    timeAgo,
    formatNumber,
    debounce,
    throttle,
    compressImage,
    extractUrls,
    extractMentions,
    extractHashtags,
    storage,
    userCache,
    musicCache,
    searchMusic,
    loadTrendingMusic,
    SimpleCache
};
