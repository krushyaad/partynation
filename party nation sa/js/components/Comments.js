// Comments Component - Full comment system with replies, reactions

const CommentsModal = ({ isOpen, onClose, drop, user }) => {
    const [comments, setComments] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [newComment, setNewComment] = React.useState('');
    const [posting, setPosting] = React.useState(false);
    const [replyingTo, setReplyingTo] = React.useState(null);
    
    React.useEffect(() => {
        if (isOpen && drop) {
            loadComments();
        }
    }, [isOpen, drop]);
    
    const loadComments = async () => {
        setLoading(true);
        try {
            const snapshot = await PartyNation.comments()
                .where('dropId', '==', drop.id)
                .orderBy('createdAt', 'asc')
                .get();
            
            const allComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Organize into threads (parent comments with replies)
            const parentComments = allComments.filter(c => !c.parentId);
            const replies = allComments.filter(c => c.parentId);
            
            const threaded = parentComments.map(parent => ({
                ...parent,
                replies: replies.filter(r => r.parentId === parent.id)
            }));
            
            setComments(threaded);
        } catch (err) {
            console.error('Error loading comments:', err);
        }
        setLoading(false);
    };
    
    const handlePostComment = async () => {
        if (!newComment.trim() || !user) return;
        
        setPosting(true);
        try {
            const commentData = {
                dropId: drop.id,
                text: newComment.trim(),
                userId: user.uid,
                userName: user.displayName || 'User',
                userPhoto: user.photoURL || null,
                verified: user.verified || false,
                parentId: replyingTo?.id || null,
                createdAt: PartyNation.serverTimestamp(),
                reactions: {}
            };
            
            await PartyNation.comments().add(commentData);
            
            // Update comment count on drop
            await PartyNation.drops().doc(drop.id).update({
                commentCount: PartyNation.increment(1)
            });
            
            setNewComment('');
            setReplyingTo(null);
            loadComments();
        } catch (err) {
            console.error('Error posting comment:', err);
            alert('Failed to post comment');
        }
        setPosting(false);
    };
    
    const handleReaction = async (commentId, emoji) => {
        if (!user) return;
        
        try {
            const commentRef = PartyNation.comments().doc(commentId);
            const doc = await commentRef.get();
            const reactions = doc.data()?.reactions || {};
            
            // Toggle reaction
            const userReactions = reactions[emoji] || [];
            const hasReacted = userReactions.includes(user.uid);
            
            if (hasReacted) {
                reactions[emoji] = userReactions.filter(id => id !== user.uid);
            } else {
                reactions[emoji] = [...userReactions, user.uid];
            }
            
            await commentRef.update({ reactions });
            loadComments();
        } catch (err) {
            console.error('Error reacting:', err);
        }
    };
    
    const handleDelete = async (commentId) => {
        if (!confirm('Delete this comment?')) return;
        
        try {
            await PartyNation.comments().doc(commentId).delete();
            await PartyNation.drops().doc(drop.id).update({
                commentCount: PartyNation.increment(-1)
            });
            loadComments();
        } catch (err) {
            console.error('Error deleting:', err);
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <button onClick={onClose}><Icon name="x" size={24} /></button>
                <h3 className="text-lg font-bold">Comments</h3>
                <div className="w-6"></div>
            </div>
            
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <LoadingSpinner size="sm" />
                ) : comments.length === 0 ? (
                    <div className="text-center text-white/40 py-8">
                        <Icon name="message-circle" size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No comments yet</p>
                        <p className="text-sm">Be the first to comment!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map(comment => (
                            <CommentThread
                                key={comment.id}
                                comment={comment}
                                user={user}
                                onReply={() => setReplyingTo(comment)}
                                onReact={handleReaction}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
            
            {/* Reply indicator */}
            {replyingTo && (
                <div className="px-4 py-2 bg-white/5 flex items-center justify-between">
                    <p className="text-sm text-white/60">
                        Replying to <span className="font-semibold">{replyingTo.userName}</span>
                    </p>
                    <button onClick={() => setReplyingTo(null)} className="text-white/40">
                        <Icon name="x" size={16} />
                    </button>
                </div>
            )}
            
            {/* Input */}
            <div className="p-4 border-t border-white/10 flex gap-3">
                {user?.photoURL && (
                    <img src={user.photoURL} className="w-10 h-10 rounded-full flex-shrink-0" />
                )}
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder={user ? (replyingTo ? 'Write a reply...' : 'Add a comment...') : 'Sign in to comment'}
                        className="flex-1 px-4 py-2 bg-white/10 rounded-full"
                        disabled={!user}
                        onKeyPress={e => e.key === 'Enter' && handlePostComment()}
                    />
                    <button
                        onClick={handlePostComment}
                        disabled={!newComment.trim() || posting || !user}
                        className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-full disabled:opacity-50"
                    >
                        {posting ? '...' : 'Post'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Comment Thread Component
const CommentThread = ({ comment, user, onReply, onReact, onDelete }) => {
    const [showReplies, setShowReplies] = React.useState(true);
    const [showReactions, setShowReactions] = React.useState(false);
    
    const isOwn = user?.uid === comment.userId;
    const reactionEmojis = ['❤️', '😂', '😮', '😢', '👏'];
    
    const getTotalReactions = () => {
        if (!comment.reactions) return 0;
        return Object.values(comment.reactions).reduce((sum, arr) => sum + (arr?.length || 0), 0);
    };
    
    const getUserReaction = () => {
        if (!comment.reactions || !user) return null;
        for (const [emoji, users] of Object.entries(comment.reactions)) {
            if (users?.includes(user.uid)) return emoji;
        }
        return null;
    };
    
    return (
        <div>
            {/* Main Comment */}
            <div className="flex gap-3">
                <button onClick={() => router.navigate(`/user/${comment.userId}`)}>
                    {comment.userPhoto ? (
                        <img src={comment.userPhoto} className="w-9 h-9 rounded-full" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold">
                            {comment.userName?.[0]}
                        </div>
                    )}
                </button>
                
                <div className="flex-1">
                    <div className="bg-white/5 rounded-2xl px-4 py-2">
                        <p className="font-semibold text-sm flex items-center gap-1">
                            {comment.userName}
                            {comment.verified && <img src="nation/badge.png" className="w-3 h-3" />}
                        </p>
                        <p className="text-sm text-white/90">{comment.text}</p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-1 ml-2 text-xs text-white/50">
                        <span>{utils.timeAgo(comment.createdAt)}</span>
                        
                        <button 
                            onClick={() => setShowReactions(!showReactions)}
                            className={`hover:text-white ${getUserReaction() ? 'text-red-400' : ''}`}
                        >
                            {getUserReaction() || 'Like'}
                        </button>
                        
                        <button onClick={onReply} className="hover:text-white">Reply</button>
                        
                        {isOwn && (
                            <button onClick={() => onDelete(comment.id)} className="hover:text-red-400">Delete</button>
                        )}
                        
                        {getTotalReactions() > 0 && (
                            <span className="text-white/70">
                                {Object.entries(comment.reactions || {})
                                    .filter(([, arr]) => arr?.length > 0)
                                    .map(([emoji]) => emoji)
                                    .slice(0, 3)
                                    .join('')} {getTotalReactions()}
                            </span>
                        )}
                    </div>
                    
                    {/* Reaction Picker */}
                    {showReactions && (
                        <div className="flex gap-1 mt-2 ml-2">
                            {reactionEmojis.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => { onReact(comment.id, emoji); setShowReactions(false); }}
                                    className={`text-lg p-1 rounded-full hover:bg-white/10 ${
                                        getUserReaction() === emoji ? 'bg-white/20' : ''
                                    }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Replies */}
            {comment.replies?.length > 0 && (
                <div className="ml-12 mt-3 space-y-3">
                    {!showReplies ? (
                        <button 
                            onClick={() => setShowReplies(true)}
                            className="text-sm text-blue-400"
                        >
                            View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                        </button>
                    ) : (
                        <>
                            {comment.replies.map(reply => (
                                <div key={reply.id} className="flex gap-3">
                                    <button onClick={() => router.navigate(`/user/${reply.userId}`)}>
                                        {reply.userPhoto ? (
                                            <img src={reply.userPhoto} className="w-7 h-7 rounded-full" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                                                {reply.userName?.[0]}
                                            </div>
                                        )}
                                    </button>
                                    <div className="flex-1">
                                        <div className="bg-white/5 rounded-2xl px-3 py-2">
                                            <p className="font-semibold text-xs flex items-center gap-1">
                                                {reply.userName}
                                                {reply.verified && <img src="nation/badge.png" className="w-3 h-3" />}
                                            </p>
                                            <p className="text-sm text-white/90">{reply.text}</p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 ml-2 text-xs text-white/50">
                                            <span>{utils.timeAgo(reply.createdAt)}</span>
                                            {user?.uid === reply.userId && (
                                                <button onClick={() => onDelete(reply.id)} className="hover:text-red-400">Delete</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

window.CommentsModal = CommentsModal;
window.CommentThread = CommentThread;
