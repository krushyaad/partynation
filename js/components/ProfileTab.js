// ProfileTab Component - User profile with posts, stats, settings

const ProfileTab = ({ user, deepLinkTarget }) => {
    const [profileUser, setProfileUser] = React.useState(null);
    const [userDrops, setUserDrops] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [activeSection, setActiveSection] = React.useState('posts'); // posts, saved, tagged
    const [isOwnProfile, setIsOwnProfile] = React.useState(true);
    const [isFollowing, setIsFollowing] = React.useState(false);
    const [stats, setStats] = React.useState({ posts: 0, followers: 0, following: 0 });
    const [showEditProfile, setShowEditProfile] = React.useState(false);
    const [selectedDrop, setSelectedDrop] = React.useState(null);
    
    // Load profile
    React.useEffect(() => {
        if (deepLinkTarget?.data) {
            // Profile from deep link (by username)
            loadProfile(deepLinkTarget.data.id || deepLinkTarget.userId);
            setIsOwnProfile(user?.uid === (deepLinkTarget.data.id || deepLinkTarget.userId));
        } else if (deepLinkTarget?.userId) {
            loadProfile(deepLinkTarget.userId);
            setIsOwnProfile(user?.uid === deepLinkTarget.userId);
        } else if (user) {
            loadProfile(user.uid);
            setIsOwnProfile(true);
        } else {
            setLoading(false);
        }
    }, [user, deepLinkTarget]);
    
    const loadProfile = async (userId) => {
        setLoading(true);
        try {
            // Get user data
            const userData = await PartyNation.getUserById(userId);
            if (userData) {
                setProfileUser(userData);
                
                // Load user's posts
                const dropsSnapshot = await PartyNation.drops()
                    .where('userId', '==', userId)
                    .orderBy('createdAt', 'desc')
                    .limit(30)
                    .get();
                
                setUserDrops(dropsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                
                // Load stats
                setStats({
                    posts: dropsSnapshot.docs.length,
                    followers: userData.followersCount || 0,
                    following: userData.followingCount || 0
                });
                
                // Check if following (if not own profile)
                if (user && user.uid !== userId) {
                    const followDoc = await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                        .collection('follows').doc(`${user.uid}_${userId}`).get();
                    setIsFollowing(followDoc.exists);
                }
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        }
        setLoading(false);
    };
    
    const handleFollow = async () => {
        if (!user || !profileUser) return;
        
        const followRef = PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
            .collection('follows').doc(`${user.uid}_${profileUser.id}`);
        
        try {
            if (isFollowing) {
                await followRef.delete();
                setIsFollowing(false);
                setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
            } else {
                await followRef.set({
                    followerId: user.uid,
                    followingId: profileUser.id,
                    createdAt: PartyNation.serverTimestamp()
                });
                setIsFollowing(true);
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            }
        } catch (err) {
            console.error('Error toggling follow:', err);
        }
    };
    
    const handleShare = async () => {
        if (!profileUser) return;
        const result = await Router.shareLink('profile', profileUser.id, profileUser.userTag, `${profileUser.displayName} on Party Nation`);
        if (result.success && result.method === 'clipboard') {
            alert('Profile link copied!');
        }
    };
    
    // Not logged in and no deep link
    if (!loading && !user && !deepLinkTarget) {
        return (
            <div className="p-4 text-center">
                <div className="glass-panel rounded-3xl p-8">
                    <Icon name="user" size={64} className="mx-auto text-white/20 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Sign In to View Profile</h2>
                    <p className="text-white/60 mb-6">Create an account to start posting and connecting</p>
                    <button 
                        onClick={() => PartyNation.signInWithGoogle()}
                        className="px-6 py-3 bg-white text-black font-bold rounded-full flex items-center gap-2 mx-auto"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign in with Google
                    </button>
                </div>
            </div>
        );
    }
    
    if (loading) {
        return (
            <div className="p-4">
                <div className="animate-pulse">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-20 h-20 rounded-full bg-white/10"></div>
                        <div className="flex-1">
                            <div className="h-6 w-32 bg-white/10 rounded mb-2"></div>
                            <div className="h-4 w-24 bg-white/5 rounded"></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="aspect-square bg-white/5 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    
    if (!profileUser) {
        return (
            <div className="p-4 text-center">
                <div className="glass-panel rounded-3xl p-8">
                    <Icon name="user-x" size={48} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/60">User not found</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="pb-4">
            {/* Profile Header */}
            <div className="p-4">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-20 h-20 rounded-full p-0.5 ${profileUser.verified ? 'bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600' : 'bg-white/20'}`}>
                        <div className="w-full h-full rounded-full bg-black overflow-hidden">
                            {profileUser.photoURL ? (
                                <img src={profileUser.photoURL} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-gray-800">
                                    {profileUser.displayName?.[0] || '?'}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex-1 flex justify-around text-center">
                        <div>
                            <p className="text-xl font-bold">{stats.posts}</p>
                            <p className="text-xs text-white/60">Posts</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold">{utils.formatNumber(stats.followers)}</p>
                            <p className="text-xs text-white/60">Followers</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold">{utils.formatNumber(stats.following)}</p>
                            <p className="text-xs text-white/60">Following</p>
                        </div>
                    </div>
                </div>
                
                {/* Name & Bio */}
                <div className="mt-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {profileUser.displayName || 'User'}
                        {profileUser.verified && (
                            <img src="nation/badge.png" alt="Verified" className="w-5 h-5" />
                        )}
                    </h2>
                    {profileUser.userTag && (
                        <p className="text-white/60 text-sm">@{profileUser.userTag}</p>
                    )}
                    {profileUser.bio && (
                        <p className="mt-2 text-sm text-white/80">{profileUser.bio}</p>
                    )}
                    
                    {/* Krush Coins */}
                    {isOwnProfile && profileUser.krushCoins > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-yellow-400/10 rounded-full">
                            <span className="text-yellow-400 font-semibold">{profileUser.krushCoins} 🪙</span>
                        </div>
                    )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                    {isOwnProfile ? (
                        <>
                            <button 
                                onClick={() => setShowEditProfile(true)}
                                className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-semibold"
                            >
                                Edit Profile
                            </button>
                            <button onClick={handleShare} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl">
                                <Icon name="share" size={20} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={handleFollow}
                                className={`flex-1 py-2 rounded-xl font-semibold ${isFollowing ? 'bg-white/10' : 'bg-yellow-400 text-black'}`}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                            <button className="px-4 py-2 bg-white/10 rounded-xl">
                                <Icon name="message-circle" size={20} />
                            </button>
                            <button onClick={handleShare} className="px-4 py-2 bg-white/10 rounded-xl">
                                <Icon name="share" size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>
            
            {/* Section Tabs */}
            <div className="flex border-b border-white/10">
                <button 
                    onClick={() => setActiveSection('posts')}
                    className={`flex-1 py-3 text-center ${activeSection === 'posts' ? 'border-b-2 border-yellow-400 text-yellow-400' : 'text-white/60'}`}
                >
                    <Icon name="grid" size={20} className="mx-auto" />
                </button>
                <button 
                    onClick={() => setActiveSection('saved')}
                    className={`flex-1 py-3 text-center ${activeSection === 'saved' ? 'border-b-2 border-yellow-400 text-yellow-400' : 'text-white/60'}`}
                >
                    <Icon name="bookmark" size={20} className="mx-auto" />
                </button>
                <button 
                    onClick={() => setActiveSection('tagged')}
                    className={`flex-1 py-3 text-center ${activeSection === 'tagged' ? 'border-b-2 border-yellow-400 text-yellow-400' : 'text-white/60'}`}
                >
                    <Icon name="at-sign" size={20} className="mx-auto" />
                </button>
            </div>
            
            {/* Posts Grid */}
            {activeSection === 'posts' && (
                <div className="grid grid-cols-3 gap-0.5 p-0.5">
                    {userDrops.map(drop => (
                        <button
                            key={drop.id}
                            onClick={() => setSelectedDrop(drop)}
                            className="aspect-square relative group"
                        >
                            {drop.imageUrl ? (
                                <img src={drop.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center p-2">
                                    <p className="text-xs text-white/60 line-clamp-3 text-center">{drop.text}</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <span className="text-sm">❤️ {drop.reactionCount || 0}</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
            {activeSection === 'saved' && (
                <div className="p-8 text-center text-white/40">
                    <Icon name="bookmark" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Saved posts coming soon</p>
                </div>
            )}
            
            {activeSection === 'tagged' && (
                <div className="p-8 text-center text-white/40">
                    <Icon name="at-sign" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Tagged posts coming soon</p>
                </div>
            )}
            
            {/* Full Post Modal */}
            {selectedDrop && (
                <div 
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setSelectedDrop(null)}
                >
                    <button className="absolute top-4 right-4 text-white/60 hover:text-white z-20">
                        <Icon name="x" size={28} />
                    </button>
                    <div 
                        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#1a1a1a] rounded-3xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <DropCard
                            drop={selectedDrop}
                            currentUser={user}
                            onUserClick={() => {}}
                        />
                    </div>
                </div>
            )}
            
            {/* Edit Profile Modal */}
            {showEditProfile && (
                <EditProfileModal
                    user={profileUser}
                    onClose={() => setShowEditProfile(false)}
                    onSave={() => {
                        setShowEditProfile(false);
                        loadProfile(profileUser.id);
                    }}
                />
            )}
        </div>
    );
};

// Edit Profile Modal
const EditProfileModal = ({ user, onClose, onSave }) => {
    const [displayName, setDisplayName] = React.useState(user?.displayName || '');
    const [userTag, setUserTag] = React.useState(user?.userTag || '');
    const [bio, setBio] = React.useState(user?.bio || '');
    const [saving, setSaving] = React.useState(false);
    
    const handleSave = async () => {
        setSaving(true);
        try {
            const collection = user.isGuest ? 'guests' : 'users';
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection(collection).doc(user.id).update({
                    displayName: displayName.trim(),
                    userTag: userTag.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                    bio: bio.trim(),
                    updatedAt: PartyNation.serverTimestamp()
                });
            onSave();
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('Failed to save');
        }
        setSaving(false);
    };
    
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <button onClick={onClose}><Icon name="x" size={24} /></button>
                <h3 className="text-lg font-bold">Edit Profile</h3>
                <button onClick={handleSave} disabled={saving} className="text-yellow-400 font-semibold disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 pb-32 space-y-4">
                <div>
                    <label className="text-sm text-white/60 block mb-1">Display Name</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 rounded-xl"
                        maxLength={30}
                    />
                </div>
                
                <div>
                    <label className="text-sm text-white/60 block mb-1">Username</label>
                    <div className="flex items-center">
                        <span className="px-4 py-3 bg-white/5 rounded-l-xl text-white/40">@</span>
                        <input
                            type="text"
                            value={userTag}
                            onChange={e => setUserTag(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            className="flex-1 px-4 py-3 bg-white/10 rounded-r-xl"
                            maxLength={20}
                            placeholder="username"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="text-sm text-white/60 block mb-1">Bio</label>
                    <textarea
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 rounded-xl resize-none"
                        rows={3}
                        maxLength={150}
                        placeholder="Tell us about yourself..."
                    />
                    <p className="text-right text-xs text-white/30">{bio.length}/150</p>
                </div>
                
                {/* Sign Out */}
                <div className="pt-8 border-t border-white/10">
                    <button
                        onClick={() => {
                            if (confirm('Sign out?')) {
                                PartyNation.signOut();
                                onClose();
                            }
                        }}
                        className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl font-semibold"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

window.ProfileTab = ProfileTab;
window.EditProfileModal = EditProfileModal;
