// MusicPlayer Component - Deezer audio player with visibility-based autoplay

const MusicPlayer = ({ music, autoPlay = true, onUseAudio = null }) => {
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [isVisible, setIsVisible] = React.useState(false);
    const audioRef = React.useRef(null);
    const containerRef = React.useRef(null);
    const hasUserInteracted = React.useRef(false);
    
    // Initialize audio
    const initAudio = () => {
        if (!audioRef.current && music.previewUrl) {
            audioRef.current = new Audio(music.previewUrl);
            audioRef.current.volume = 0.7;
            audioRef.current.loop = true;
            
            audioRef.current.ontimeupdate = () => {
                if (audioRef.current) {
                    setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                }
            };
            
            audioRef.current.onplay = () => setIsPlaying(true);
            audioRef.current.onpause = () => setIsPlaying(false);
        }
        return audioRef.current;
    };
    
    // Intersection Observer - play when 70%+ visible
    React.useEffect(() => {
        if (!containerRef.current || !music.previewUrl) return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const visible = entry.isIntersecting && entry.intersectionRatio >= 0.7;
                    setIsVisible(visible);
                    
                    if (visible && autoPlay) {
                        const audio = initAudio();
                        if (audio && !isPlaying) {
                            // Pause other audio
                            document.querySelectorAll('audio').forEach(a => {
                                if (a !== audio) a.pause();
                            });
                            audio.play().catch(() => {});
                        }
                    } else if (!visible && audioRef.current && !hasUserInteracted.current) {
                        audioRef.current.pause();
                    }
                });
            },
            { threshold: [0, 0.5, 0.7, 1.0] }
        );
        
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [music.previewUrl, autoPlay]);
    
    // Cleanup
    React.useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);
    
    const togglePlay = () => {
        if (!music.previewUrl) {
            window.open(music.deezerUrl, '_blank');
            return;
        }
        
        hasUserInteracted.current = true;
        const audio = initAudio();
        
        if (isPlaying) {
            audio?.pause();
        } else {
            document.querySelectorAll('audio').forEach(a => {
                if (a !== audio) a.pause();
            });
            audio?.play();
        }
    };
    
    const formatDuration = (ms) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    
    return (
        <div ref={containerRef} className="mx-4 mb-2 p-3 bg-gradient-to-r from-purple-500/10 to-purple-900/30 border border-purple-500/30 rounded-2xl">
            <div className="flex items-center gap-3">
                {/* Album Art */}
                {music.albumArt ? (
                    <div className="relative flex-shrink-0">
                        <img 
                            src={music.albumArt} 
                            className={`w-14 h-14 rounded-xl object-cover ${isPlaying ? 'animate-spin-slow' : ''}`}
                            alt={music.album}
                        />
                        {isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                                <div className="flex items-end gap-0.5 h-4">
                                    <div className="w-1 bg-purple-400 rounded-full animate-bounce" style={{height: '100%', animationDelay: '0ms'}}></div>
                                    <div className="w-1 bg-purple-400 rounded-full animate-bounce" style={{height: '60%', animationDelay: '150ms'}}></div>
                                    <div className="w-1 bg-purple-400 rounded-full animate-bounce" style={{height: '80%', animationDelay: '300ms'}}></div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon name="music" size={24} className="text-purple-400" />
                    </div>
                )}
                
                {/* Track Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate flex items-center gap-1">
                        {music.name}
                        {music.explicit && <span className="text-[10px] bg-white/20 px-1 rounded">E</span>}
                    </p>
                    <p className="text-xs text-white/60 truncate">{music.artist}</p>
                    
                    {/* Progress Bar */}
                    {music.previewUrl && (
                        <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-500 transition-all duration-200"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}
                    
                    {/* Loop indicator */}
                    <div className="flex items-center gap-1 mt-1">
                        <svg className="w-3 h-3 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                        </svg>
                        <span className="text-[10px] text-purple-400/70">Loop</span>
                    </div>
                </div>
                
                {/* Play Button */}
                <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-purple-500 hover:bg-purple-400 flex items-center justify-center transition flex-shrink-0"
                >
                    {isPlaying ? (
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                    )}
                </button>
                
                {/* Use Audio Button */}
                {onUseAudio && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onUseAudio(music);
                        }}
                        className="px-3 py-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-semibold flex items-center gap-1"
                    >
                        <Icon name="plus" size={14} />
                        Use
                    </button>
                )}
                
                {/* Deezer Link */}
                <a
                    href={music.deezerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center flex-shrink-0"
                >
                    <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                </a>
            </div>
        </div>
    );
};

// Export
window.MusicPlayer = MusicPlayer;
