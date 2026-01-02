// DropCard Component - Individual post card
// Handles display, reactions, comments, music player, sharing

const DropCard = ({ drop, currentUser, isHighlighted, onUserClick, onUseAudio }) => {
    const [showMenu, setShowMenu] = React.useState(false);
    const [showComments, setShowComments] = React.useState(false);
    const [showReactions, setShowReactions] = React.useState(false);
    const [userReaction, setUserReaction] = React.useState(null);
    const [reactions, setReactions] = React.useState({
        '🔥': 0, '❤️': 0, '😂': 0, '🎉': 0, '👍': 0, '😍': 0, '🙌': 0
    });
    const [commentCount, setCommentCount] = React.useState(drop.commentCount || 0);
    const [isEditing, setIsEditing] = React.useState(false);
    const [editText, setEditText] = React.useState(drop.text);
    const [showBoostModal, setShowBoostModal] = React.useState(false);
    const [showReportModal, setShowReportModal] = React.useState(false);
    
    const isOwnDrop = currentUser?.uid === drop.userId;
    const isBoosted = drop.isBoosted && drop.boostExpires?.toDate?.() > new Date() && !drop.boostPaused;
    
    // Load reactions
    React.useEffect(() => {
        const loadReactions = async () => {
            try {
                const snapshot = await PartyNation.drops().doc(drop.id)
                    .collection('reactions').get();
                
                const counts = { '🔥': 0, '❤️': 0, '😂': 0, '🎉': 0, '👍': 0, '😍': 0, '🙌': 0 };
                let myReaction = null;
                
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (counts[data.emoji] !== undefined) {
                        counts[data.emoji]++;
                    }
                    if (currentUser && doc.id === currentUser.uid) {
                        myReaction = data.emoji;
                    }
                });
                
                setReactions(counts);
                setUserReaction(myReaction);
            } catch (err) {
                console.error('Error loading reactions:', err);
            }
        };
        
        loadReactions();
    }, [drop.id, currentUser?.uid]);
    
    const handleReaction = async (emoji) => {
        if (!currentUser) {
            alert('Please sign in to react');
            return;
        }
        
        try {
            const reactionRef = PartyNation.drops().doc(drop.id)
                .collection('reactions').doc(currentUser.uid);
            
            if (userReaction === emoji) {
                // Remove reaction
                await reactionRef.delete();
                setReactions(prev => ({ ...prev, [emoji]: Math.max(0, prev[emoji] - 1) }));
                setUserReaction(null);
            } else {
                // Add/change reaction
                if (userReaction) {
                    setReactions(prev => ({ ...prev, [userReaction]: Math.max(0, prev[userReaction] - 1) }));
                }
                await reactionRef.set({
                    emoji,
                    userId: currentUser.uid,
                    createdAt: PartyNation.serverTimestamp()
                });
                setReactions(prev => ({ ...prev, [emoji]: prev[emoji] + 1 }));
                setUserReaction(emoji);
            }
        } catch (err) {
            console.error('Error toggling reaction:', err);
        }
        
        setShowReactions(false);
    };
    
    const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);
    
    const handleShare = async () => {
        const result = await Router.shareLink('post', drop.id, null, `${drop.userName}'s post on Party Nation`);
        if (result.success && result.method === 'clipboard') {
            alert('Link copied to clipboard!');
        }
    };
    
    const handleDelete = async () => {
        if (!confirm('Delete this post?')) return;
        try {
            await PartyNation.drops().doc(drop.id).delete();
        } catch (err) {
            alert('Failed to delete');
        }
    };
    
    return (
        <div className={`mb-2 relative overflow-hidden animate-fade-in-up transition-all duration-500 ${isHighlighted ? 'bg-yellow-500/5' : ''} border-t border-white/5 first:border-t-0`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3">
                <button 
                    onClick={() => onUserClick?.(drop.userId)}
                    className={`w-11 h-11 rounded-full p-0.5 ${drop.verified ? 'bg-gradient-to-br from-yellow-400 via-red-500 to-purple-600' : 'bg-gradient-to-br from-gray-600 to-gray-800'}`}
                >
                    <div className="w-full h-full rounded-full overflow-hidden bg-black">
                        {drop.userPhoto ? (
                            <img src={drop.userPhoto} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-gray-400 bg-gray-800">
                                {drop.userName?.substring(0, 2).toUpperCase() || 'PN'}
                            </div>
                        )}
                    </div>
                </button>
                
                <div className="flex-1">
                    <button 
                        onClick={() => onUserClick?.(drop.userId)}
                        className="font-semibold text-sm text-white flex items-center gap-1.5 hover:text-white/80"
                    >
                        {drop.userName || 'Anonymous'}
                        {drop.verified && (
                            <img src="nation/badge.png" alt="Verified" className="w-4 h-4" />
                        )}
                    </button>
                    <p className="text-xs text-white/40">
                        {drop.location?.city || ''}{drop.location && ' • '}{utils.timeAgo(drop.createdAt)}
                        {isBoosted && <span className="ml-2 text-orange-400">🔥 Promoted</span>}
                    </p>
                </div>
                
                {(isOwnDrop || currentUser?.isAdmin) && (
                    <div className="relative">
                        <button onClick={() => setShowMenu(!showMenu)} className="text-white/30 hover:text-white">
                            <Icon name="more-horizontal" size={16} />
                        </button>
                        
                        {showMenu && (
                            <div className="absolute right-0 top-8 bg-gray-900 border border-white/10 rounded-xl shadow-2xl py-1 w-44 z-50">
                                {isOwnDrop && (
                                    <button
                                        onClick={() => { setShowBoostModal(true); setShowMenu(false); }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-yellow-500/10 text-yellow-400 flex items-center gap-2"
                                    >
                                        <Icon name="zap" size={14} />
                                        {isBoosted ? 'Manage Boost' : 'Boost Post'}
                                    </button>
                                )}
                                <button
                                    onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2"
                                >
                                    <Icon name="edit-2" size={14} />
                                    Edit
                                </button>
                                <button
                                    onClick={() => { handleDelete(); setShowMenu(false); }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                >
                                    <Icon name="trash-2" size={14} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Report button for other users' posts */}
                {!isOwnDrop && (
                    <button 
                        onClick={() => setShowReportModal(true)}
                        className="text-white/30 hover:text-red-400"
                        title="Report"
                    >
                        <Icon name="flag" size={16} />
                    </button>
                )}
            </div>
            
            {/* Image */}
            {drop.imageUrl && (
                <div className="relative">
                    <img 
                        src={drop.imageUrl} 
                        className="w-full max-h-[80vh] object-contain bg-black"
                        alt=""
                        loading="lazy"
                    />
                </div>
            )}
            
            {/* Music Player */}
            {drop.music && (
                <MusicPlayer music={drop.music} onUseAudio={onUseAudio} />
            )}
            
            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-5">
                    {/* Reactions */}
                    <div className="relative">
                        <button onClick={() => setShowReactions(!showReactions)} className="flex items-center">
                            {userReaction ? (
                                <span className="text-2xl">{userReaction}</span>
                            ) : (
                                <Icon name="heart" size={28} className="text-white hover:text-white/70" />
                            )}
                        </button>
                        
                        {showReactions && (
                            <div className="absolute bottom-full left-0 mb-2 bg-gray-900 border border-white/10 rounded-2xl p-2 shadow-2xl z-50 flex gap-1">
                                {Object.keys(reactions).map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleReaction(emoji)}
                                        className={`text-2xl hover:scale-125 transition-transform p-1.5 rounded-lg ${userReaction === emoji ? 'bg-yellow-400/20' : 'hover:bg-white/5'}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        {totalReactions > 0 && (
                            <span className="ml-1 text-sm text-white/60">{utils.formatNumber(totalReactions)}</span>
                        )}
                    </div>
                    
                    {/* Comments */}
                    <button onClick={() => setShowComments(true)} className="flex items-center gap-1">
                        <Icon name="message-circle" size={28} className="text-white hover:text-white/70" />
                        {commentCount > 0 && <span className="text-sm text-white/60">{utils.formatNumber(commentCount)}</span>}
                    </button>
                    
                    {/* Share */}
                    <button onClick={handleShare}>
                        <Icon name="share" size={28} className="text-white hover:text-white/70" />
                    </button>
                </div>
                
                {/* Bookmark */}
                <button>
                    <Icon name="bookmark" size={28} className="text-white hover:text-white/70" />
                </button>
            </div>
            
            {/* Text */}
            {drop.text && (
                <div className="px-4 pb-3">
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg resize-none"
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={async () => {
                                        await PartyNation.drops().doc(drop.id).update({ text: editText });
                                        setIsEditing(false);
                                    }}
                                    className="px-4 py-2 bg-yellow-400 text-black rounded-lg text-sm font-semibold"
                                >
                                    Save
                                </button>
                                <button 
                                    onClick={() => { setIsEditing(false); setEditText(drop.text); }}
                                    className="px-4 py-2 bg-white/5 rounded-lg text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-white/90">
                            <span className="font-semibold mr-2">{drop.userName}</span>
                            {drop.text}
                        </p>
                    )}
                </div>
            )}
            
            {/* CTA Link for Boosted Posts */}
            {isBoosted && drop.boostCtaLink && (
                <a 
                    href={drop.boostCtaLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mx-4 mb-3 block py-3 text-center bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl"
                >
                    {drop.boostCtaText || 'Learn More'}
                </a>
            )}
            
            {/* Comments Modal */}
            {showComments && (
                <CommentsModal
                    isOpen={showComments}
                    onClose={() => setShowComments(false)}
                    drop={drop}
                    user={currentUser}
                />
            )}
            
            {/* Boost Modal */}
            {showBoostModal && (
                <BoostPostModal
                    isOpen={showBoostModal}
                    onClose={() => setShowBoostModal(false)}
                    drop={drop}
                    user={currentUser}
                    onBoosted={() => window.location.reload()}
                />
            )}
            
            {/* Report Modal */}
            {showReportModal && (
                <ReportContentModal
                    isOpen={showReportModal}
                    onClose={() => setShowReportModal(false)}
                    contentType="drop"
                    contentId={drop.id}
                    user={currentUser}
                />
            )}
        </div>
    );
};

// Export
window.DropCard = DropCard;
