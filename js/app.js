// Party Nation Main App
// Entry point with routing and lazy loading

const { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } = React;

// Icon component using Feather Icons
const Icon = ({ name, size = 24, className = '' }) => {
    const iconRef = useRef(null);
    
    useEffect(() => {
        if (iconRef.current && feather) {
            iconRef.current.innerHTML = feather.icons[name]?.toSvg({ 
                width: size, 
                height: size,
                class: className 
            }) || '';
        }
    }, [name, size, className]);
    
    return <span ref={iconRef} className={`inline-flex ${className}`}></span>;
};

// Loading Spinner
const LoadingSpinner = ({ size = 'md', text = '' }) => {
    const sizeClass = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16'
    }[size];
    
    return (
        <div className="flex flex-col items-center justify-center p-8">
            <div className={`${sizeClass} border-2 border-yellow-400 border-t-transparent rounded-full animate-spin`}></div>
            {text && <p className="mt-3 text-white/60 text-sm">{text}</p>}
        </div>
    );
};

// Skeleton Loader
const Skeleton = ({ className = '' }) => (
    <div className={`skeleton rounded ${className}`}></div>
);

// Bottom Navigation
const BottomNav = ({ activeTab, onTabChange, unreadCount = 0 }) => {
    const tabs = [
        { id: 'home', icon: 'home', label: 'Home' },
        { id: 'trending', icon: 'trending-up', label: 'Trending' },
        { id: 'events', icon: 'calendar', label: 'Events' },
        { id: 'profile', icon: 'user', label: 'Profile' }
    ];
    
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-white/5 bottom-nav">
            <div className="max-w-lg mx-auto flex justify-around items-center py-2">
                {tabs.map((tab, i) => (
                    <React.Fragment key={tab.id}>
                        {i === 2 && (
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('openCompose'))}
                                className="w-14 h-14 -mt-8 rounded-full bg-yellow-400 hover:bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-400/30 transition-transform hover:scale-105"
                            >
                                <Icon name="plus" size={28} className="text-black" />
                            </button>
                        )}
                        <button
                            onClick={() => onTabChange(tab.id)}
                            className="flex flex-col items-center gap-1 py-2 px-4 relative"
                        >
                            <Icon 
                                name={tab.icon} 
                                size={24} 
                                className={activeTab === tab.id ? 'text-yellow-400' : 'text-white/60'} 
                            />
                            <span className={`text-[10px] font-medium ${activeTab === tab.id ? 'text-yellow-400' : 'text-white/60'}`}>
                                {tab.label}
                            </span>
                        </button>
                    </React.Fragment>
                ))}
            </div>
        </nav>
    );
};

// Header
const Header = ({ user, location, onSearchClick, onMenuClick }) => (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/30 border-b border-white/5 px-4 py-3">
        <div className="flex justify-between items-center">
            <div>
                <p className="text-[10px] text-yellow-400 font-bold tracking-widest uppercase flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Live • {location?.city || 'Jamaica'}
                </p>
                <h1 className="text-2xl font-black italic tracking-tighter">PARTY NATION</h1>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={onSearchClick}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10"
                >
                    <Icon name="search" size={20} className="text-white/80" />
                </button>
                <button 
                    onClick={onMenuClick}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10"
                >
                    <Icon name="menu" size={20} className="text-white/80" />
                </button>
            </div>
        </div>
    </header>
);

// Main App Component
const App = () => {
    const [user, setUser] = useState(null);
    const [authChecking, setAuthChecking] = useState(true);
    const [activeTab, setActiveTab] = useState('home');
    const [route, setRoute] = useState(null);
    const [location, setLocation] = useState({ city: 'Jamaica', country: 'Jamaica' });
    const [showCompose, setShowCompose] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [composeInitialMusic, setComposeInitialMusic] = useState(null);
    
    // Deep link target
    const [deepLinkTarget, setDeepLinkTarget] = useState(null);
    
    // Initialize
    useEffect(() => {
        const splash = document.getElementById('splash-screen');
        const loadStatus = document.getElementById('load-status');
        
        if (loadStatus) loadStatus.textContent = 'Connecting...';
        
        PartyNation.authReady.then((authUser) => {
            setUser(authUser);
            setAuthChecking(false);
            
            if (splash) {
                splash.style.transition = 'opacity 0.3s';
                splash.style.opacity = '0';
                setTimeout(() => splash.remove(), 300);
            }
        });
        
        // Get location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
                        );
                        const data = await response.json();
                        setLocation({
                            city: data.address?.city || data.address?.town || 'Jamaica',
                            country: data.address?.country || 'Jamaica',
                            coords: { lat: pos.coords.latitude, lon: pos.coords.longitude }
                        });
                    } catch {
                        // Keep default
                    }
                },
                () => {} // Keep default on error
            );
        }
        
        // Auth changes
        const handleAuth = (e) => setUser(e.detail.user);
        window.addEventListener('authStateChanged', handleAuth);
        
        // Compose events
        const handleCompose = (e) => {
            if (e.detail?.music) setComposeInitialMusic(e.detail.music);
            setShowCompose(true);
        };
        window.addEventListener('openCompose', handleCompose);
        
        return () => {
            window.removeEventListener('authStateChanged', handleAuth);
            window.removeEventListener('openCompose', handleCompose);
        };
    }, []);
    
    // Routing
    useEffect(() => {
        const handleRoute = (newRoute) => {
            setRoute(newRoute);
            
            switch (newRoute.type) {
                case 'profile':
                    if (newRoute.username) {
                        PartyNation.findUserByUsername(newRoute.username).then(userData => {
                            if (userData) {
                                setDeepLinkTarget({ type: 'profile', data: userData });
                                setActiveTab('profile');
                            }
                        });
                    } else if (newRoute.userId) {
                        setDeepLinkTarget({ type: 'profile', userId: newRoute.userId });
                        setActiveTab('profile');
                    }
                    break;
                case 'post':
                    setDeepLinkTarget({ type: 'post', postId: newRoute.postId });
                    setActiveTab('home');
                    break;
                case 'story':
                    setDeepLinkTarget({ type: 'story', storyId: newRoute.storyId });
                    setActiveTab('home');
                    break;
                case 'event':
                    setDeepLinkTarget({ type: 'event', eventId: newRoute.eventId });
                    setActiveTab('events');
                    break;
                case 'tab':
                    setActiveTab(newRoute.tab);
                    setDeepLinkTarget(null);
                    break;
            }
        };
        
        const unsubscribe = router.subscribe(handleRoute);
        handleRoute(router.parseRoute());
        return unsubscribe;
    }, []);
    
    const handleTabChange = useCallback((tab) => {
        setActiveTab(tab);
        setDeepLinkTarget(null);
        router.navigate(`/${tab === 'home' ? '' : tab}`, true);
    }, []);
    
    if (authChecking) return null;
    
    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Background */}
            <div className="fixed top-[-10%] left-[-10%] w-[300px] h-[300px] bg-purple-900/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="fixed bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            <Header 
                user={user}
                location={location}
                onSearchClick={() => setShowSearch(true)}
                onMenuClick={() => setShowMenu(true)}
            />
            
            <main className="relative">
                {activeTab === 'home' && (
                    <HomeFeed 
                        user={user} 
                        location={location}
                        deepLinkTarget={deepLinkTarget?.type === 'post' ? deepLinkTarget : null}
                    />
                )}
                
                {activeTab === 'trending' && <TrendingFeed user={user} />}
                {activeTab === 'events' && <EventsTab user={user} deepLinkTarget={deepLinkTarget?.type === 'event' ? deepLinkTarget : null} />}
                {activeTab === 'profile' && <ProfileTab user={user} deepLinkTarget={deepLinkTarget?.type === 'profile' ? deepLinkTarget : null} />}
            </main>
            
            <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
            
            {showCompose && (
                <ComposeModal
                    user={user}
                    location={location}
                    initialMusic={composeInitialMusic}
                    onClose={() => {
                        setShowCompose(false);
                        setComposeInitialMusic(null);
                    }}
                />
            )}
            
            {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
            {showMenu && <MenuModal user={user} onClose={() => setShowMenu(false)} />}
        </div>
    );
};

// Expose components globally
window.Icon = Icon;
window.LoadingSpinner = LoadingSpinner;
window.Skeleton = Skeleton;

// Render App
ReactDOM.createRoot(document.getElementById('app-root')).render(<App />);
