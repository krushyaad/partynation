// Party Nation Router - Deep Linking Support
// Handles URLs like:
// - partynation.app/@username (profile)
// - partynation.app/post/postId (single post)
// - partynation.app/story/storyId (quick flix)
// - partynation.app/event/eventId (event details)

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.listeners = [];
        
        // Listen for URL changes
        window.addEventListener('popstate', () => this.handleRoute());
        window.addEventListener('hashchange', () => this.handleRoute());
    }
    
    // Parse current URL into route object
    parseRoute() {
        const hash = window.location.hash.slice(1) || '/';
        const path = hash.startsWith('/') ? hash : '/' + hash;
        const [basePath, queryString] = path.split('?');
        const params = new URLSearchParams(queryString || '');
        
        // Profile: /@username
        if (basePath.startsWith('/@')) {
            return {
                type: 'profile',
                username: basePath.slice(2),
                params: Object.fromEntries(params)
            };
        }
        
        // User ID profile: /user/userId
        if (basePath.startsWith('/user/')) {
            return {
                type: 'profile',
                userId: basePath.slice(6),
                params: Object.fromEntries(params)
            };
        }
        
        // Single Post: /post/postId
        if (basePath.startsWith('/post/')) {
            return {
                type: 'post',
                postId: basePath.slice(6),
                params: Object.fromEntries(params)
            };
        }
        
        // Quick Flix Story: /story/storyId
        if (basePath.startsWith('/story/')) {
            return {
                type: 'story',
                storyId: basePath.slice(7),
                params: Object.fromEntries(params)
            };
        }
        
        // Event: /event/eventId
        if (basePath.startsWith('/event/')) {
            return {
                type: 'event',
                eventId: basePath.slice(7),
                params: Object.fromEntries(params)
            };
        }
        
        // Tab routes
        if (basePath === '/trending') return { type: 'tab', tab: 'trending' };
        if (basePath === '/events') return { type: 'tab', tab: 'events' };
        if (basePath === '/profile') return { type: 'tab', tab: 'profile' };
        
        // Default to home
        return { type: 'tab', tab: 'home' };
    }
    
    // Navigate to a new route
    navigate(path, replace = false) {
        const newHash = path.startsWith('#') ? path : '#' + path;
        
        if (replace) {
            window.history.replaceState(null, '', newHash);
        } else {
            window.history.pushState(null, '', newHash);
        }
        
        this.handleRoute();
    }
    
    // Handle route change
    handleRoute() {
        const route = this.parseRoute();
        this.currentRoute = route;
        
        // Notify all listeners
        this.listeners.forEach(callback => callback(route));
        
        return route;
    }
    
    // Subscribe to route changes
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }
    
    // Generate shareable URLs
    static generateUrl(type, id, username = null) {
        const base = window.location.origin + window.location.pathname;
        
        switch (type) {
            case 'profile':
                return username ? `${base}#/@${username}` : `${base}#/user/${id}`;
            case 'post':
                return `${base}#/post/${id}`;
            case 'story':
                return `${base}#/story/${id}`;
            case 'event':
                return `${base}#/event/${id}`;
            default:
                return base;
        }
    }
    
    // Copy shareable link to clipboard
    static async shareLink(type, id, username = null, title = 'Party Nation') {
        const url = Router.generateUrl(type, id, username);
        
        // Try native share first (mobile)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    url: url
                });
                return { success: true, method: 'native' };
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.log('Native share failed, falling back to clipboard');
                }
            }
        }
        
        // Fallback to clipboard
        try {
            await navigator.clipboard.writeText(url);
            return { success: true, method: 'clipboard', url };
        } catch (err) {
            // Final fallback
            const input = document.createElement('input');
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            return { success: true, method: 'fallback', url };
        }
    }
    
    // Go back
    back() {
        window.history.back();
    }
}

// Create global router instance
window.router = new Router();
