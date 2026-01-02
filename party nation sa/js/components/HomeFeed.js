// HomeFeed Component - Main feed with posts and Quick Flix stories

const HomeFeed = ({ user, location, deepLinkTarget }) => {
    const [drops, setDrops] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(true);
    const [lastDoc, setLastDoc] = React.useState(null);
    const [highlightedId, setHighlightedId] = React.useState(null);
    
    // Quick Flix state
    const [quickFlixStories, setQuickFlixStories] = React.useState([]);
    const [viewedStories, setViewedStories] = React.useState(() => utils.storage.get('viewedStories', {}));
    const [showQuickFlixViewer, setShowQuickFlixViewer] = React.useState(null);
    const [showCreateQuickFlix, setShowCreateQuickFlix] = React.useState(false);
    
    // Compose with music reuse
    const [reuseMusicForCompose, setReuseMusicForCompose] = React.useState(null);
    const [showCompose, setShowCompose] = React.useState(false);
    
    const POSTS_PER_PAGE = APP_CONFIG.postsPerPage || 15;
    
    // Load initial posts
    React.useEffect(() => {
        loadPosts();
        loadQuickFlix();
        
        // Subscribe to real-time updates for new posts
        const unsubscribe = PartyNation.drops()
            .orderBy('createdAt', 'desc')
            .limit(1)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const newDrop = { id: change.doc.id, ...change.doc.data() };
                        setDrops(prev => {
                            if (prev.some(d => d.id === newDrop.id)) return prev;
                            return [newDrop, ...prev];
                        });
                    }
                });
            });
        
        return () => unsubscribe();
    }, []);
    
    // Handle deep link to specific post
    React.useEffect(() => {
        if (deepLinkTarget?.postId) {
            loadSpecificPost(deepLinkTarget.postId);
        }
    }, [deepLinkTarget]);
    
    const loadPosts = async (loadMore = false) => {
        if (loadMore) setLoadingMore(true);
        else setLoading(true);
        
        try {
            let query = PartyNation.drops()
                .orderBy('createdAt', 'desc')
                .limit(POSTS_PER_PAGE);
            
            if (loadMore && lastDoc) {
                query = query.startAfter(lastDoc);
            }
            
            const snapshot = await query.get();
            const newDrops = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            if (loadMore) {
                setDrops(prev => [...prev, ...newDrops]);
            } else {
                setDrops(newDrops);
            }
            
            setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
            setHasMore(snapshot.docs.length === POSTS_PER_PAGE);
        } catch (err) {
            console.error('Error loading posts:', err);
        }
        
        setLoading(false);
        setLoadingMore(false);
    };
    
    const loadSpecificPost = async (postId) => {
        try {
            const doc = await PartyNation.drops().doc(postId).get();
            if (doc.exists) {
                const post = { id: doc.id, ...doc.data() };
                setDrops(prev => {
                    if (prev.some(d => d.id === postId)) return prev;
                    return [post, ...prev];
                });
                setHighlightedId(postId);
                setTimeout(() => {
                    const element = document.getElementById(`drop-${postId}`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        } catch (err) {
            console.error('Error loading specific post:', err);
        }
    };
    
    const loadQuickFlix = async () => {
        try {
            const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const snapshot = await PartyNation.quickflix()
                .where('createdAt', '>', cutoff)
                .orderBy('createdAt', 'desc')
                .get();
            
            const storiesByUser = {};
            snapshot.docs.forEach(doc => {
                const data = { id: doc.id, ...doc.data() };
                if (!storiesByUser[data.userId]) {
                    storiesByUser[data.userId] = {
                        userId: data.userId,
                        userName: data.userName,
                        userPhoto: data.userPhoto,
                        stories: []
                    };
                }
                storiesByUser[data.userId].stories.push(data);
            });
            
            const sortedStories = Object.values(storiesByUser).sort((a, b) => {
                const aTime = a.stories[0]?.createdAt?.toDate?.() || 0;
                const bTime = b.stories[0]?.createdAt?.toDate?.() || 0;
                return bTime - aTime;
            });
            
            setQuickFlixStories(sortedStories);
        } catch (err) {
            console.error('Error loading Quick Flix:', err);
        }
    };
    
    const handleMarkViewed = (userId) => {
        const updated = { ...viewedStories, [userId]: Date.now() };
        setViewedStories(updated);
        utils.storage.set('viewedStories', updated);
    };
    
    const handleUserClick = (userId) => {
        router.navigate(`/user/${userId}`);
    };
    
    const handleUseAudio = (music) => {
        setReuseMusicForCompose(music);
        setShowCompose(true);
    };
    
    // Infinite scroll
    const handleScroll = React.useCallback(() => {
        if (loadingMore || !hasMore) return;
        
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        
        if (scrollTop + windowHeight >= docHeight - 500) {
            loadPosts(true);
        }
    }, [loadingMore, hasMore, lastDoc]);
    
    React.useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);
    
    // Sort drops - boosted posts get priority
    const sortedDrops = React.useMemo(() => {
        const boosted = drops.filter(d => d.isBoosted && d.boostExpires?.toDate?.() > new Date() && !d.boostPaused);
        const regular = drops.filter(d => !boosted.includes(d));
        
        const result = [...regular];
        boosted.forEach((post, i) => {
            const insertIndex = Math.min((i + 1) * 3, result.length);
            result.splice(insertIndex, 0, post);
        });
        
        return result;
    }, [drops]);
    
    return (
        <div className="min-h-screen">
            {/* Quick Flix Bar */}
            <QuickFlixBar
                stories={quickFlixStories}
                currentUser={user}
                viewedStories={viewedStories}
                onStoryClick={(userId) => setShowQuickFlixViewer(userId)}
                onAddClick={() => {
                    if (!user) {
                        alert('Please sign in to create Quick Flix');
                        return;
                    }
                    setShowCreateQuickFlix(true);
                }}
            />
            
            {/* Feed Header */}
            <div className="mt-4 px-4">
                <h2 className="text-sm font-bold text-white/50 uppercase tracking-widest mb-4 ml-2">
                    The Drop
                </h2>
            </div>
            
            {/* Posts */}
            {loading ? (
                <div className="px-4 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-11 h-11 rounded-full bg-white/10"></div>
                                <div className="flex-1">
                                    <div className="h-4 w-24 bg-white/10 rounded mb-1"></div>
                                    <div className="h-3 w-16 bg-white/5 rounded"></div>
                                </div>
                            </div>
                            <div className="h-64 bg-white/5 rounded-xl"></div>
                        </div>
                    ))}
                </div>
            ) : drops.length === 0 ? (
                <div className="px-4">
                    <div className="glass-panel rounded-3xl p-8 text-center">
                        <Icon name="music" size={48} className="mx-auto text-white/20 mb-4" />
                        <p className="text-white/60">No drops yet. Be the first!</p>
                        {user && (
                            <button 
                                onClick={() => setShowCompose(true)}
                                className="mt-4 px-6 py-2 bg-yellow-400 text-black font-bold rounded-full text-sm"
                            >
                                Start the Party
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div>
                    {sortedDrops.map(drop => (
                        <div key={drop.id} id={`drop-${drop.id}`}>
                            <DropCard
                                drop={drop}
                                currentUser={user}
                                isHighlighted={highlightedId === drop.id}
                                onUserClick={handleUserClick}
                                onUseAudio={handleUseAudio}
                            />
                        </div>
                    ))}
                    
                    {loadingMore && (
                        <div className="py-8 flex justify-center">
                            <LoadingSpinner size="sm" />
                        </div>
                    )}
                    
                    {!hasMore && drops.length > 0 && (
                        <div className="py-8 text-center text-white/30 text-sm">
                            You've seen all the drops 🎉
                        </div>
                    )}
                </div>
            )}
            
            {/* Quick Flix Viewer */}
            {showQuickFlixViewer && (
                <QuickFlixViewer
                    userId={showQuickFlixViewer}
                    stories={quickFlixStories}
                    currentUserId={user?.uid}
                    onClose={() => setShowQuickFlixViewer(null)}
                    onMarkViewed={handleMarkViewed}
                />
            )}
            
            {/* Create Quick Flix Modal */}
            {showCreateQuickFlix && (
                <CreateQuickFlixModal
                    isOpen={showCreateQuickFlix}
                    onClose={() => {
                        setShowCreateQuickFlix(false);
                        loadQuickFlix();
                    }}
                    user={user}
                />
            )}
            
            {/* Compose Modal */}
            {showCompose && (
                <CreateDropModal
                    isOpen={showCompose}
                    onClose={() => {
                        setShowCompose(false);
                        setReuseMusicForCompose(null);
                    }}
                    user={user}
                    location={location}
                    initialMusic={reuseMusicForCompose}
                />
            )}
        </div>
    );
};

window.HomeFeed = HomeFeed;
