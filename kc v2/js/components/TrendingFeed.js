// TrendingFeed Component - Popular posts and trending content

const TrendingFeed = ({ user }) => {
    const [trendingDrops, setTrendingDrops] = React.useState([]);
    const [trendingUsers, setTrendingUsers] = React.useState([]);
    const [trendingMusic, setTrendingMusic] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState('posts');
    
    React.useEffect(() => {
        loadTrending();
        loadTrendingMusic();
    }, []);
    
    const loadTrending = async () => {
        setLoading(true);
        try {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            
            const dropsSnapshot = await PartyNation.drops()
                .where('createdAt', '>=', weekAgo)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            const drops = dropsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                engagement: (doc.data().reactionCount || 0) + (doc.data().commentCount || 0) * 2
            }));
            
            drops.sort((a, b) => b.engagement - a.engagement);
            setTrendingDrops(drops.slice(0, 20));
            
            // Get unique users with most engagement
            const userEngagement = {};
            drops.forEach(d => {
                if (!userEngagement[d.userId]) {
                    userEngagement[d.userId] = {
                        userId: d.userId,
                        userName: d.userName,
                        userPhoto: d.userPhoto,
                        verified: d.verified,
                        totalEngagement: 0,
                        postCount: 0
                    };
                }
                userEngagement[d.userId].totalEngagement += d.engagement;
                userEngagement[d.userId].postCount++;
            });
            
            const topUsers = Object.values(userEngagement)
                .sort((a, b) => b.totalEngagement - a.totalEngagement)
                .slice(0, 10);
            
            setTrendingUsers(topUsers);
        } catch (err) {
            console.error('Error loading trending:', err);
        }
        setLoading(false);
    };
    
    const loadTrendingMusic = async () => {
        const music = await utils.loadTrendingMusic();
        setTrendingMusic(music);
    };
    
    const handleUserClick = (userId) => {
        router.navigate(`/user/${userId}`);
    };
    
    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <div className="p-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Icon name="trending-up" size={24} className="text-yellow-400" />
                    Trending
                </h2>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 px-4 mb-4">
                {[
                    { id: 'posts', label: 'Posts', icon: 'grid' },
                    { id: 'people', label: 'People', icon: 'users' },
                    { id: 'music', label: 'Music', icon: 'music' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                            activeTab === tab.id ? 'bg-yellow-400 text-black' : 'bg-white/10'
                        }`}
                    >
                        <Icon name={tab.icon} size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>
            
            {loading ? (
                <div className="p-4 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse h-40 bg-white/5 rounded-2xl"></div>
                    ))}
                </div>
            ) : (
                <>
                    {/* Trending Posts */}
                    {activeTab === 'posts' && (
                        <div>
                            {trendingDrops.length === 0 ? (
                                <div className="p-8 text-center text-white/40">
                                    <Icon name="trending-up" size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No trending posts yet</p>
                                </div>
                            ) : (
                                trendingDrops.map((drop, index) => (
                                    <div key={drop.id} className="relative">
                                        {/* Rank Badge */}
                                        {index < 3 && (
                                            <div className={`absolute top-6 left-6 z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                                index === 0 ? 'bg-yellow-400 text-black' :
                                                index === 1 ? 'bg-gray-300 text-black' :
                                                'bg-orange-600 text-white'
                                            }`}>
                                                #{index + 1}
                                            </div>
                                        )}
                                        <DropCard
                                            drop={drop}
                                            currentUser={user}
                                            onUserClick={handleUserClick}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    
                    {/* Trending People */}
                    {activeTab === 'people' && (
                        <div className="px-4 space-y-3">
                            {trendingUsers.length === 0 ? (
                                <div className="p-8 text-center text-white/40">
                                    <Icon name="users" size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>No trending users yet</p>
                                </div>
                            ) : (
                                trendingUsers.map((u, index) => (
                                    <button
                                        key={u.userId}
                                        onClick={() => handleUserClick(u.userId)}
                                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition"
                                    >
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                            index === 0 ? 'bg-yellow-400 text-black' :
                                            index === 1 ? 'bg-gray-300 text-black' :
                                            index === 2 ? 'bg-orange-600 text-white' :
                                            'bg-white/10'
                                        }`}>
                                            {index + 1}
                                        </span>
                                        
                                        <div className={`w-12 h-12 rounded-full p-0.5 ${u.verified ? 'bg-gradient-to-br from-yellow-400 to-purple-600' : ''}`}>
                                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                                                {u.userPhoto ? (
                                                    <img src={u.userPhoto} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-bold">
                                                        {u.userName?.[0]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold flex items-center gap-1">
                                                {u.userName}
                                                {u.verified && <img src="nation/badge.png" className="w-4 h-4" />}
                                            </p>
                                            <p className="text-sm text-white/60">
                                                {u.postCount} posts • {u.totalEngagement} engagement
                                            </p>
                                        </div>
                                        
                                        <Icon name="chevron-right" size={20} className="text-white/40" />
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                    
                    {/* Trending Music */}
                    {activeTab === 'music' && (
                        <div className="px-4 space-y-2">
                            {trendingMusic.length === 0 ? (
                                <div className="p-8 text-center text-white/40">
                                    <Icon name="music" size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Loading trending music...</p>
                                </div>
                            ) : (
                                trendingMusic.map((track, index) => (
                                    <div
                                        key={track.id}
                                        className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition"
                                    >
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                            index < 3 ? 'bg-purple-500' : 'bg-white/10'
                                        }`}>
                                            {index + 1}
                                        </span>
                                        
                                        {track.albumArt && (
                                            <img src={track.albumArt} className="w-12 h-12 rounded-lg" />
                                        )}
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{track.name}</p>
                                            <p className="text-sm text-white/60 truncate">{track.artist}</p>
                                        </div>
                                        
                                        <a
                                            href={track.deezerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 bg-purple-500/20 rounded-full text-purple-400 hover:bg-purple-500/30"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <Icon name="play" size={16} />
                                        </a>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

window.TrendingFeed = TrendingFeed;
