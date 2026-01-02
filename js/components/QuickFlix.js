// QuickFlix Component - 24hr Stories (Complete)

// Story Bar
const QuickFlixBar = ({ stories, currentUser, onStoryClick, onAddClick, viewedStories }) => {
    const isStoryViewed = (userId) => viewedStories?.[userId];
    
    if (!stories?.length && !currentUser) return null;
    
    return (
        <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {currentUser && (
                    <button onClick={onAddClick} className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 relative">
                            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                {currentUser.photoURL ? (
                                    <img src={currentUser.photoURL} className="w-full h-full rounded-full object-cover opacity-70" />
                                ) : (
                                    <span className="text-lg font-bold text-white/50">{currentUser.displayName?.[0] || '+'}</span>
                                )}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-purple-500 border-2 border-black flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                    <path d="M12 5v14M5 12h14"/>
                                </svg>
                            </div>
                        </div>
                        <span className="text-[10px] text-white/60">Your Flix</span>
                    </button>
                )}
                
                {stories?.map((userStories) => (
                    <button
                        key={userStories.userId}
                        onClick={() => onStoryClick(userStories.userId)}
                        className="flex flex-col items-center gap-1 flex-shrink-0"
                    >
                        <div className={`w-16 h-16 rounded-full p-0.5 ${
                            !isStoryViewed(userStories.userId)
                                ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500'
                                : 'bg-white/20'
                        }`}>
                            <div className="w-full h-full rounded-full bg-black p-0.5">
                                {userStories.userPhoto ? (
                                    <img src={userStories.userPhoto} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                                        {userStories.userName?.[0] || '?'}
                                    </div>
                                )}
                            </div>
                        </div>
                        <span className="text-[10px] text-white/60 max-w-16 truncate">
                            {userStories.userName?.split(' ')[0] || 'User'}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// Story Viewer
const QuickFlixViewer = ({ userId, stories, onClose, currentUserId, onMarkViewed }) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [progress, setProgress] = React.useState(0);
    const [isPaused, setIsPaused] = React.useState(false);
    const audioRef = React.useRef(null);
    const timerRef = React.useRef(null);
    
    const userStories = stories?.find(s => s.userId === userId)?.stories || [];
    const currentStory = userStories[currentIndex];
    
    React.useEffect(() => {
        if (!currentStory || isPaused) return;
        
        const duration = 5000;
        let elapsed = 0;
        
        timerRef.current = setInterval(() => {
            elapsed += 50;
            setProgress((elapsed / duration) * 100);
            
            if (elapsed >= duration) {
                if (currentIndex < userStories.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                    setProgress(0);
                } else {
                    onClose();
                }
            }
        }, 50);
        
        return () => clearInterval(timerRef.current);
    }, [currentIndex, currentStory, isPaused]);
    
    React.useEffect(() => {
        if (userId && onMarkViewed) onMarkViewed(userId);
    }, [userId]);
    
    React.useEffect(() => {
        if (currentStory?.music?.previewUrl) {
            if (audioRef.current) audioRef.current.pause();
            audioRef.current = new Audio(currentStory.music.previewUrl);
            audioRef.current.loop = true;
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(() => {});
        }
        return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
    }, [currentStory]);
    
    if (!currentStory) return null;
    
    const goNext = () => {
        if (currentIndex < userStories.length - 1) { setCurrentIndex(currentIndex + 1); setProgress(0); }
        else onClose();
    };
    
    const goPrev = () => {
        if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); setProgress(0); }
    };
    
    return (
        <div className="fixed inset-0 z-[100] bg-black">
            <div className="absolute top-0 left-0 right-0 p-2 flex gap-1 z-20">
                {userStories.map((_, idx) => (
                    <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div className="h-full bg-white" style={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' }} />
                    </div>
                ))}
            </div>
            
            <div className="absolute top-6 left-0 right-0 px-4 flex items-center justify-between z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                        {currentStory.userPhoto ? <img src={currentStory.userPhoto} className="w-full h-full object-cover" /> : 
                            <div className="w-full h-full flex items-center justify-center font-bold">{currentStory.userName?.[0]}</div>}
                    </div>
                    <div>
                        <p className="font-semibold text-sm">{currentStory.userName}</p>
                        <p className="text-xs text-white/60">{utils.timeAgo(currentStory.createdAt)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {currentUserId === currentStory.userId && (
                        <button onClick={async () => {
                            if (!confirm('Delete?')) return;
                            await PartyNation.quickflix().doc(currentStory.id).delete();
                            userStories.length <= 1 ? onClose() : setCurrentIndex(Math.max(0, currentIndex - 1));
                        }} className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                            <Icon name="trash-2" size={20} />
                        </button>
                    )}
                    <button onClick={onClose}><Icon name="x" size={28} /></button>
                </div>
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center"
                onMouseDown={() => setIsPaused(true)} onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)}>
                <img src={currentStory.imageUrl} className="max-w-full max-h-full object-contain" />
                {currentStory.textOverlays?.map(o => (
                    <div key={o.id} className="absolute" style={{ left: `${o.x}%`, top: `${o.y}%`, transform: 'translate(-50%,-50%)', color: o.color, fontSize: o.size, fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{o.text}</div>
                ))}
                {currentStory.emojiOverlays?.map(o => (
                    <div key={o.id} className="absolute" style={{ left: `${o.x}%`, top: `${o.y}%`, transform: 'translate(-50%,-50%)', fontSize: o.size }}>{o.emoji}</div>
                ))}
            </div>
            
            <div className="absolute inset-0 flex z-10">
                <div className="w-1/3 h-full" onClick={goPrev} />
                <div className="w-1/3 h-full" />
                <div className="w-1/3 h-full" onClick={goNext} />
            </div>
            
            {currentStory.music && (
                <div className="absolute bottom-20 left-4 right-4 bg-black/60 backdrop-blur rounded-2xl p-3 flex items-center gap-3 z-20">
                    {currentStory.music.albumArt && <img src={currentStory.music.albumArt} className="w-12 h-12 rounded-lg animate-spin-slow" />}
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{currentStory.music.name}</p>
                        <p className="text-xs text-white/60 truncate">{currentStory.music.artist}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// Creator Modal
const CreateQuickFlixModal = ({ isOpen, onClose, user }) => {
    const [image, setImage] = React.useState(null);
    const [originalImage, setOriginalImage] = React.useState(null);
    const [textOverlays, setTextOverlays] = React.useState([]);
    const [emojiOverlays, setEmojiOverlays] = React.useState([]);
    const [selectedMusic, setSelectedMusic] = React.useState(null);
    const [showMusicSearch, setShowMusicSearch] = React.useState(false);
    const [musicResults, setMusicResults] = React.useState([]);
    const [searchingMusic, setSearchingMusic] = React.useState(false);
    const [isAddingText, setIsAddingText] = React.useState(false);
    const [newText, setNewText] = React.useState('');
    const [textColor, setTextColor] = React.useState('#FFFFFF');
    const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
    const [selectedFilter, setSelectedFilter] = React.useState('none');
    const [posting, setPosting] = React.useState(false);
    const [dragging, setDragging] = React.useState(null);
    
    const canvasRef = React.useRef(null);
    const fileInputRef = React.useRef(null);
    const cameraInputRef = React.useRef(null);
    
    const colors = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
    const emojis = ['🔥', '❤️', '😂', '🎉', '🥳', '💯', '✨', '🙌', '💪', '🎵', '🎶', '💃', '🕺', '🍾', '🥂', '👑'];
    const filters = [
        { id: 'none', name: 'Normal', css: '' },
        { id: 'clarendon', name: 'Clarendon', css: 'saturate(1.3) contrast(1.1) brightness(1.1)' },
        { id: 'moon', name: 'Moon', css: 'grayscale(1) contrast(1.1) brightness(1.1)' },
        { id: 'lark', name: 'Lark', css: 'saturate(1.2) contrast(0.9) brightness(1.15)' },
        { id: 'juno', name: 'Juno', css: 'saturate(1.4) contrast(1.15) brightness(1.05)' },
    ];
    
    if (!isOpen) return null;
    
    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const compressed = await utils.compressImage(file, 1200, 0.8);
            setOriginalImage(compressed);
            setImage(compressed);
        } catch (err) { console.error(err); }
    };
    
    const applyFilter = (id) => {
        setSelectedFilter(id);
        if (!originalImage) return;
        const f = filters.find(x => x.id === id);
        if (!f || id === 'none') { setImage(originalImage); return; }
        const img = new Image();
        img.onload = () => {
            const c = document.createElement('canvas');
            c.width = img.width; c.height = img.height;
            const ctx = c.getContext('2d');
            ctx.filter = f.css;
            ctx.drawImage(img, 0, 0);
            setImage(c.toDataURL('image/jpeg', 0.9));
        };
        img.src = originalImage;
    };
    
    const handleDragMove = (e) => {
        if (!dragging || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        const x = Math.max(5, Math.min(95, ((cx - rect.left) / rect.width) * 100));
        const y = Math.max(5, Math.min(95, ((cy - rect.top) / rect.height) * 100));
        if (dragging.type === 'text') setTextOverlays(p => p.map(t => t.id === dragging.id ? {...t, x, y} : t));
        else setEmojiOverlays(p => p.map(e => e.id === dragging.id ? {...e, x, y} : e));
    };
    
    const searchMusic = async (q) => {
        if (q.length < 2) { setMusicResults([]); return; }
        setSearchingMusic(true);
        setMusicResults(await utils.searchMusic(q));
        setSearchingMusic(false);
    };
    
    const handlePost = async () => {
        if (!image || !user) return;
        setPosting(true);
        try {
            await PartyNation.quickflix().add({
                imageUrl: image, textOverlays, emojiOverlays,
                music: selectedMusic ? { deezerId: selectedMusic.id, name: selectedMusic.name, artist: selectedMusic.artist, albumArt: selectedMusic.albumArt, previewUrl: selectedMusic.previewUrl, deezerUrl: selectedMusic.deezerUrl } : null,
                userId: user.uid, userName: user.displayName || 'User', userPhoto: user.photoURL || null,
                createdAt: PartyNation.serverTimestamp(), expiresAt: new Date(Date.now() + 86400000), views: 0
            });
            onClose();
        } catch (err) { alert('Failed to post'); }
        setPosting(false);
    };
    
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <button onClick={onClose}><Icon name="x" size={24} /></button>
                <h3 className="text-lg font-bold">⚡ Quick Flix</h3>
                <button onClick={handlePost} disabled={!image || posting} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold disabled:opacity-50">
                    {posting ? '...' : 'Share'}
                </button>
            </div>
            
            <div ref={canvasRef} className="flex-1 relative overflow-hidden bg-gray-900" onMouseMove={handleDragMove} onMouseUp={() => setDragging(null)} onTouchMove={handleDragMove} onTouchEnd={() => setDragging(null)}>
                {!image ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="flex gap-4">
                            <button onClick={() => cameraInputRef.current?.click()} className="w-28 h-28 rounded-3xl bg-purple-500/20 border-2 border-purple-500/30 flex flex-col items-center justify-center gap-2">
                                <Icon name="camera" size={36} className="text-purple-400" /><span className="text-sm">Camera</span>
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="w-28 h-28 rounded-3xl bg-blue-500/20 border-2 border-blue-500/30 flex flex-col items-center justify-center gap-2">
                                <Icon name="image" size={36} className="text-blue-400" /><span className="text-sm">Gallery</span>
                            </button>
                        </div>
                        <p className="mt-6 text-white/40 text-sm">⚡ Disappears in 24 hours</p>
                    </div>
                ) : (
                    <>
                        <img src={image} className="w-full h-full object-contain" />
                        {textOverlays.map(o => (
                            <div key={o.id} className={`absolute cursor-move select-none touch-none ${dragging?.id === o.id ? 'scale-110' : ''}`}
                                style={{ left: `${o.x}%`, top: `${o.y}%`, transform: 'translate(-50%,-50%)', color: o.color, fontSize: o.size, fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                                onMouseDown={() => setDragging({ type: 'text', id: o.id })} onTouchStart={() => setDragging({ type: 'text', id: o.id })}>
                                {o.text}<span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-xs flex items-center justify-center" onClick={e => { e.stopPropagation(); setTextOverlays(p => p.filter(t => t.id !== o.id)); }}>×</span>
                            </div>
                        ))}
                        {emojiOverlays.map(o => (
                            <div key={o.id} className={`absolute cursor-move select-none touch-none ${dragging?.id === o.id ? 'scale-125' : ''}`}
                                style={{ left: `${o.x}%`, top: `${o.y}%`, transform: 'translate(-50%,-50%)', fontSize: o.size }}
                                onMouseDown={() => setDragging({ type: 'emoji', id: o.id })} onTouchStart={() => setDragging({ type: 'emoji', id: o.id })}>
                                {o.emoji}<span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center" onClick={e => { e.stopPropagation(); setEmojiOverlays(p => p.filter(x => x.id !== o.id)); }}>×</span>
                            </div>
                        ))}
                    </>
                )}
                <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
            </div>
            
            {image && (
                <div className="bg-black/80 border-t border-white/10 px-4 py-2">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {filters.map(f => (
                            <button key={f.id} onClick={() => applyFilter(f.id)} className={`flex-shrink-0 ${selectedFilter === f.id ? 'ring-2 ring-purple-500' : ''}`}>
                                <div className="w-14 h-14 rounded-lg overflow-hidden"><img src={originalImage} className="w-full h-full object-cover" style={{ filter: f.css }} /></div>
                                <p className="text-[10px] text-center mt-1">{f.name}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {selectedMusic && (
                <div className="p-3 bg-purple-500/20 border-t border-purple-500/30 flex items-center gap-3">
                    {selectedMusic.albumArt && <img src={selectedMusic.albumArt} className="w-10 h-10 rounded-lg" />}
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{selectedMusic.name}</p><p className="text-xs text-white/60 truncate">{selectedMusic.artist}</p></div>
                    <button onClick={() => setSelectedMusic(null)}><Icon name="x" size={20} /></button>
                </div>
            )}
            
            {showMusicSearch && (
                <div className="absolute inset-0 bg-black/95 z-50 flex flex-col">
                    <div className="p-4 border-b border-white/10 flex items-center gap-3">
                        <button onClick={() => { setShowMusicSearch(false); setMusicResults([]); }}><Icon name="arrow-left" size={24} /></button>
                        <input type="text" placeholder="Search songs..." className="flex-1 px-4 py-2 bg-white/10 rounded-full" autoFocus onChange={e => searchMusic(e.target.value)} />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {searchingMusic && <div className="p-8 text-center"><div className="loader mx-auto"></div></div>}
                        {musicResults.map(t => (
                            <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-white/5 border-b border-white/5" onClick={() => { setSelectedMusic(t); setShowMusicSearch(false); }}>
                                {t.albumArt && <img src={t.albumArt} className="w-12 h-12 rounded-lg" />}
                                <div className="flex-1"><p className="font-semibold truncate">{t.name}</p><p className="text-sm text-white/60 truncate">{t.artist}</p></div>
                                <Icon name="plus" size={20} className="text-purple-400" />
                            </div>
                        ))}
                        {!searchingMusic && !musicResults.length && <div className="p-8 text-center text-white/40"><Icon name="music" size={48} className="mx-auto mb-4 opacity-50" /><p>Search for a song</p></div>}
                    </div>
                </div>
            )}
            
            {isAddingText && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-2xl p-4 w-full max-w-sm">
                        <input type="text" value={newText} onChange={e => setNewText(e.target.value)} placeholder="Type text..." className="w-full px-4 py-3 bg-white/10 rounded-xl text-center text-xl font-bold" style={{ color: textColor }} autoFocus />
                        <div className="flex justify-center gap-2 mt-3">{colors.map(c => <button key={c} onClick={() => setTextColor(c)} className={`w-8 h-8 rounded-full border-2 ${textColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={() => setIsAddingText(false)} className="flex-1 py-2 bg-white/10 rounded-xl">Cancel</button>
                            <button onClick={() => { if (newText.trim()) setTextOverlays([...textOverlays, { id: Date.now(), text: newText, x: 50, y: 50, color: textColor, size: 24 }]); setNewText(''); setIsAddingText(false); }} className="flex-1 py-2 bg-purple-500 rounded-xl font-bold">Add</button>
                        </div>
                    </div>
                </div>
            )}
            
            {showEmojiPicker && (
                <div className="absolute bottom-20 left-4 right-4 bg-gray-900 rounded-2xl p-4 z-50 border border-white/10">
                    <div className="grid grid-cols-8 gap-2">{emojis.map(e => <button key={e} onClick={() => { setEmojiOverlays([...emojiOverlays, { id: Date.now(), emoji: e, x: 30+Math.random()*40, y: 30+Math.random()*40, size: 48 }]); setShowEmojiPicker(false); }} className="text-2xl p-2 hover:bg-white/10 rounded-lg">{e}</button>)}</div>
                </div>
            )}
            
            {image && (
                <div className="p-4 border-t border-white/10 flex justify-center gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 px-4 py-2 bg-white/10 rounded-xl"><Icon name="image" size={24} /><span className="text-xs">Change</span></button>
                    <button onClick={() => setIsAddingText(true)} className="flex flex-col items-center gap-1 px-4 py-2 bg-white/10 rounded-xl"><Icon name="type" size={24} /><span className="text-xs">Text</span></button>
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="flex flex-col items-center gap-1 px-4 py-2 bg-white/10 rounded-xl"><span className="text-2xl">😀</span><span className="text-xs">Emoji</span></button>
                    <button onClick={() => setShowMusicSearch(true)} className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl ${selectedMusic ? 'bg-purple-500/30' : 'bg-purple-500/20'} text-purple-400`}><Icon name="music" size={24} /><span className="text-xs">{selectedMusic ? '✓ Audio' : 'Music'}</span></button>
                </div>
            )}
        </div>
    );
};

window.QuickFlixBar = QuickFlixBar;
window.QuickFlixViewer = QuickFlixViewer;
window.CreateQuickFlixModal = CreateQuickFlixModal;
