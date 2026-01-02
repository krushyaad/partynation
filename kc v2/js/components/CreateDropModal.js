// CreateDropModal - Post creation with image, video, music, location, event linking

const CreateDropModal = ({ isOpen, onClose, user, location, initialMusic = null }) => {
    const [text, setText] = React.useState('');
    const [image, setImage] = React.useState(null);
    const [originalImage, setOriginalImage] = React.useState(null);
    const [uploading, setUploading] = React.useState(false);
    const [selectedMusic, setSelectedMusic] = React.useState(initialMusic);
    const [showMusicSearch, setShowMusicSearch] = React.useState(false);
    const [musicResults, setMusicResults] = React.useState([]);
    const [searchingMusic, setSearchingMusic] = React.useState(false);
    const [musicQuery, setMusicQuery] = React.useState('');
    const [trendingMusic, setTrendingMusic] = React.useState([]);
    const [selectedFilter, setSelectedFilter] = React.useState('none');
    const [selectedEvent, setSelectedEvent] = React.useState(null);
    const [userEvents, setUserEvents] = React.useState([]);
    
    const fileInputRef = React.useRef(null);
    const cameraInputRef = React.useRef(null);
    const searchTimeoutRef = React.useRef(null);
    
    const filters = [
        { id: 'none', name: 'Normal', css: '' },
        { id: 'clarendon', name: 'Clarendon', css: 'saturate(1.3) contrast(1.1) brightness(1.1)' },
        { id: 'gingham', name: 'Gingham', css: 'sepia(0.1) contrast(0.9) brightness(1.1)' },
        { id: 'moon', name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)' },
        { id: 'lark', name: 'Lark', css: 'saturate(1.2) contrast(0.9) brightness(1.15)' },
        { id: 'reyes', name: 'Reyes', css: 'sepia(0.2) contrast(0.85) brightness(1.1) saturate(0.75)' },
        { id: 'juno', name: 'Juno', css: 'saturate(1.4) contrast(1.15) brightness(1.05) sepia(0.1)' },
        { id: 'slumber', name: 'Slumber', css: 'saturate(0.7) brightness(1.05) sepia(0.2)' },
    ];
    
    // Load trending music and user events
    React.useEffect(() => {
        if (showMusicSearch && trendingMusic.length === 0) {
            utils.loadTrendingMusic().then(setTrendingMusic);
        }
    }, [showMusicSearch]);
    
    React.useEffect(() => {
        if (user && isOpen) {
            loadUserEvents();
        }
    }, [user, isOpen]);
    
    React.useEffect(() => {
        if (initialMusic) {
            setSelectedMusic(initialMusic);
        }
    }, [initialMusic]);
    
    const loadUserEvents = async () => {
        try {
            const snapshot = await PartyNation.events()
                .where('createdBy', '==', user.uid)
                .where('date', '>=', new Date())
                .orderBy('date', 'asc')
                .limit(10)
                .get();
            
            setUserEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error('Error loading events:', err);
        }
    };
    
    if (!isOpen) return null;
    
    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            const compressed = await utils.compressImage(file, 1200, 0.85);
            setOriginalImage(compressed);
            setImage(compressed);
            setSelectedFilter('none');
        } catch (err) {
            console.error('Error processing image:', err);
            alert('Failed to process image');
        }
    };
    
    const applyFilter = (filterId) => {
        setSelectedFilter(filterId);
        if (!originalImage) return;
        
        const filter = filters.find(f => f.id === filterId);
        if (!filter || filterId === 'none') {
            setImage(originalImage);
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.filter = filter.css;
            ctx.drawImage(img, 0, 0);
            setImage(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.src = originalImage;
    };
    
    const handleMusicSearch = async (query) => {
        setMusicQuery(query);
        
        clearTimeout(searchTimeoutRef.current);
        
        if (query.length < 2) {
            setMusicResults([]);
            return;
        }
        
        searchTimeoutRef.current = setTimeout(async () => {
            setSearchingMusic(true);
            const results = await utils.searchMusic(query);
            setMusicResults(results);
            setSearchingMusic(false);
        }, 300);
    };
    
    const handlePost = async () => {
        if (!text.trim() && !image) {
            alert('Please add some text or an image');
            return;
        }
        
        if (!user) {
            alert('Please sign in to post');
            return;
        }
        
        setUploading(true);
        
        try {
            const dropData = {
                text: text.trim(),
                imageUrl: image || null,
                userId: user.uid,
                userName: user.displayName || 'Party Guest',
                userPhoto: user.photoURL || null,
                userTag: user.userTag || null,
                verified: user.verified || false,
                location: location ? {
                    city: location.city,
                    country: location.country
                } : null,
                createdAt: PartyNation.serverTimestamp(),
                reactionCount: 0,
                commentCount: 0,
                shareCount: 0
            };
            
            // Add music if selected
            if (selectedMusic) {
                dropData.music = {
                    id: selectedMusic.id,
                    name: selectedMusic.name,
                    artist: selectedMusic.artist,
                    album: selectedMusic.album,
                    albumArt: selectedMusic.albumArt,
                    previewUrl: selectedMusic.previewUrl,
                    deezerUrl: selectedMusic.deezerUrl
                };
            }
            
            // Link to event if selected
            if (selectedEvent) {
                dropData.linkedEvent = {
                    id: selectedEvent.id,
                    name: selectedEvent.name
                };
            }
            
            await PartyNation.drops().add(dropData);
            
            // Update user post count
            const userCollection = user.isGuest ? 'guests' : 'users';
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection(userCollection).doc(user.uid).update({
                    postCount: PartyNation.increment(1),
                    lastPostAt: PartyNation.serverTimestamp()
                });
            
            // Reset and close
            setText('');
            setImage(null);
            setOriginalImage(null);
            setSelectedMusic(null);
            setSelectedEvent(null);
            onClose();
            
        } catch (err) {
            console.error('Error posting:', err);
            alert('Failed to post. Please try again.');
        }
        
        setUploading(false);
    };
    
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <button onClick={onClose} className="text-white/60 hover:text-white">
                    <Icon name="x" size={24} />
                </button>
                <h3 className="text-lg font-bold">Create Drop</h3>
                <button
                    onClick={handlePost}
                    disabled={uploading || (!text.trim() && !image)}
                    className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-full text-sm disabled:opacity-50"
                >
                    {uploading ? 'Posting...' : 'Drop It'}
                </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* User Info */}
                <div className="p-4 flex items-center gap-3">
                    {user?.photoURL ? (
                        <img src={user.photoURL} className="w-12 h-12 rounded-full" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-lg font-bold">
                            {user?.displayName?.[0] || '?'}
                        </div>
                    )}
                    <div>
                        <p className="font-semibold">{user?.displayName || 'Guest'}</p>
                        {location && (
                            <p className="text-sm text-white/60 flex items-center gap-1">
                                <Icon name="map-pin" size={12} />
                                {location.city}
                            </p>
                        )}
                    </div>
                </div>
                
                {/* Text Input */}
                <div className="px-4">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="What's the vibe? 🎉"
                        className="w-full bg-transparent text-lg placeholder-white/30 resize-none focus:outline-none min-h-[100px]"
                        maxLength={500}
                    />
                    <p className="text-right text-xs text-white/30">{text.length}/500</p>
                </div>
                
                {/* Image Preview */}
                {image && (
                    <div className="px-4 mt-4">
                        <div className="relative rounded-2xl overflow-hidden">
                            <img src={image} className="w-full max-h-[400px] object-contain bg-black/50" />
                            <button
                                onClick={() => { setImage(null); setOriginalImage(null); }}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center"
                            >
                                <Icon name="x" size={18} />
                            </button>
                        </div>
                        
                        {/* Filters */}
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {filters.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => applyFilter(f.id)}
                                    className={`flex-shrink-0 ${selectedFilter === f.id ? 'ring-2 ring-yellow-400' : ''}`}
                                >
                                    <div className="w-16 h-16 rounded-lg overflow-hidden">
                                        <img 
                                            src={originalImage} 
                                            className="w-full h-full object-cover" 
                                            style={{ filter: f.css }}
                                        />
                                    </div>
                                    <p className={`text-[10px] text-center mt-1 ${selectedFilter === f.id ? 'text-yellow-400' : 'text-white/60'}`}>
                                        {f.name}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Selected Music */}
                {selectedMusic && (
                    <div className="mx-4 mt-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-2xl flex items-center gap-3">
                        {selectedMusic.albumArt && (
                            <img src={selectedMusic.albumArt} className="w-12 h-12 rounded-lg" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{selectedMusic.name}</p>
                            <p className="text-xs text-white/60 truncate">{selectedMusic.artist}</p>
                        </div>
                        <button onClick={() => setSelectedMusic(null)} className="text-white/40 hover:text-red-400">
                            <Icon name="x" size={20} />
                        </button>
                    </div>
                )}
                
                {/* Selected Event */}
                {selectedEvent && (
                    <div className="mx-4 mt-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl flex items-center gap-3">
                        <Icon name="calendar" size={24} className="text-yellow-400" />
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{selectedEvent.name}</p>
                            <p className="text-xs text-white/60">Linked to event</p>
                        </div>
                        <button onClick={() => setSelectedEvent(null)} className="text-white/40 hover:text-red-400">
                            <Icon name="x" size={20} />
                        </button>
                    </div>
                )}
            </div>
            
            {/* Bottom Toolbar */}
            <div className="p-4 border-t border-white/10 flex justify-around">
                <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-white/60 hover:text-white"
                >
                    <Icon name="camera" size={24} />
                    <span className="text-xs">Camera</span>
                </button>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 text-white/60 hover:text-white"
                >
                    <Icon name="image" size={24} />
                    <span className="text-xs">Gallery</span>
                </button>
                <button
                    onClick={() => setShowMusicSearch(true)}
                    className={`flex flex-col items-center gap-1 ${selectedMusic ? 'text-purple-400' : 'text-white/60 hover:text-white'}`}
                >
                    <Icon name="music" size={24} />
                    <span className="text-xs">{selectedMusic ? '✓ Music' : 'Music'}</span>
                </button>
                {userEvents.length > 0 && (
                    <button
                        onClick={() => {
                            // Simple event selection
                            const eventNames = userEvents.map((e, i) => `${i + 1}. ${e.name}`).join('\n');
                            const choice = prompt(`Link to event:\n${eventNames}\n\nEnter number:`);
                            if (choice && userEvents[parseInt(choice) - 1]) {
                                setSelectedEvent(userEvents[parseInt(choice) - 1]);
                            }
                        }}
                        className={`flex flex-col items-center gap-1 ${selectedEvent ? 'text-yellow-400' : 'text-white/60 hover:text-white'}`}
                    >
                        <Icon name="calendar" size={24} />
                        <span className="text-xs">{selectedEvent ? '✓ Event' : 'Event'}</span>
                    </button>
                )}
            </div>
            
            {/* Hidden Inputs */}
            <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
            
            {/* Music Search Modal */}
            {showMusicSearch && (
                <div className="absolute inset-0 bg-black z-50 flex flex-col">
                    <div className="p-4 border-b border-white/10 flex items-center gap-3">
                        <button onClick={() => { setShowMusicSearch(false); setMusicResults([]); setMusicQuery(''); }}>
                            <Icon name="arrow-left" size={24} />
                        </button>
                        <input
                            type="text"
                            value={musicQuery}
                            onChange={(e) => handleMusicSearch(e.target.value)}
                            placeholder="Search songs..."
                            className="flex-1 px-4 py-2 bg-white/10 rounded-full text-white placeholder-white/40"
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto">
                        {searchingMusic && (
                            <div className="p-8 text-center">
                                <div className="loader mx-auto"></div>
                            </div>
                        )}
                        
                        {/* Search Results */}
                        {musicResults.length > 0 && (
                            <div>
                                <p className="px-4 py-2 text-sm text-white/40">Results</p>
                                {musicResults.map(track => (
                                    <div
                                        key={track.id}
                                        className="flex items-center gap-3 p-4 hover:bg-white/5 border-b border-white/5"
                                        onClick={() => {
                                            setSelectedMusic(track);
                                            setShowMusicSearch(false);
                                            setMusicResults([]);
                                            setMusicQuery('');
                                        }}
                                    >
                                        {track.albumArt && <img src={track.albumArt} className="w-12 h-12 rounded-lg" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{track.name}</p>
                                            <p className="text-sm text-white/60 truncate">{track.artist}</p>
                                        </div>
                                        <Icon name="plus" size={20} className="text-purple-400" />
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Trending */}
                        {!musicQuery && trendingMusic.length > 0 && (
                            <div>
                                <p className="px-4 py-2 text-sm text-white/40 flex items-center gap-2">
                                    <Icon name="trending-up" size={14} />
                                    Trending Now
                                </p>
                                {trendingMusic.map(track => (
                                    <div
                                        key={track.id}
                                        className="flex items-center gap-3 p-4 hover:bg-white/5 border-b border-white/5"
                                        onClick={() => {
                                            setSelectedMusic(track);
                                            setShowMusicSearch(false);
                                        }}
                                    >
                                        {track.albumArt && <img src={track.albumArt} className="w-12 h-12 rounded-lg" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{track.name}</p>
                                            <p className="text-sm text-white/60 truncate">{track.artist}</p>
                                        </div>
                                        <Icon name="plus" size={20} className="text-purple-400" />
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Empty State */}
                        {!searchingMusic && !musicQuery && trendingMusic.length === 0 && (
                            <div className="p-8 text-center text-white/40">
                                <Icon name="music" size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Search for a song to add</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

window.CreateDropModal = CreateDropModal;
