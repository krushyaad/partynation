// Notifications Component - Activity notifications

const NotificationsModal = ({ isOpen, onClose, user }) => {
    const [notifications, setNotifications] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    
    React.useEffect(() => {
        if (isOpen && user) {
            loadNotifications();
        }
    }, [isOpen, user]);
    
    const loadNotifications = async () => {
        setLoading(true);
        try {
            const snapshot = await PartyNation.db.collection('artifacts')
                .doc(APP_CONFIG.appId)
                .collection('notifications')
                .where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            
            // Mark as read
            const batch = PartyNation.db.batch();
            snapshot.docs.forEach(doc => {
                if (!doc.data().read) {
                    batch.update(doc.ref, { read: true });
                }
            });
            await batch.commit();
        } catch (err) {
            console.error('Error loading notifications:', err);
        }
        setLoading(false);
    };
    
    const getNotificationIcon = (type) => {
        switch (type) {
            case 'reaction': return '❤️';
            case 'comment': return '💬';
            case 'follow': return '👤';
            case 'mention': return '@';
            case 'gift': return '🎁';
            case 'coins': return '🪙';
            default: return '🔔';
        }
    };
    
    const handleNotificationClick = (notif) => {
        if (notif.dropId) {
            router.navigate(`/post/${notif.dropId}`);
            onClose();
        } else if (notif.fromUserId) {
            router.navigate(`/user/${notif.fromUserId}`);
            onClose();
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <button onClick={onClose}><Icon name="arrow-left" size={24} /></button>
                <h3 className="text-lg font-bold">Notifications</h3>
                <div className="w-6"></div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <LoadingSpinner />
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-white/40">
                        <Icon name="bell" size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    <div>
                        {notifications.map(notif => (
                            <button
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`w-full flex items-start gap-3 p-4 hover:bg-white/5 border-b border-white/5 text-left ${!notif.read ? 'bg-white/5' : ''}`}
                            >
                                <span className="text-2xl">{getNotificationIcon(notif.type)}</span>
                                
                                <div className="flex-1 min-w-0">
                                    {notif.fromUserPhoto && (
                                        <img src={notif.fromUserPhoto} className="w-8 h-8 rounded-full float-right ml-2" />
                                    )}
                                    <p className="text-sm">
                                        <span className="font-semibold">{notif.fromUserName || 'Someone'}</span>
                                        {' '}
                                        {notif.message}
                                    </p>
                                    <p className="text-xs text-white/40 mt-1">
                                        {utils.timeAgo(notif.createdAt)}
                                    </p>
                                </div>
                                
                                {!notif.read && (
                                    <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0 mt-2"></span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Notification helper - create notifications
const createNotification = async (userId, type, data) => {
    try {
        // Don't notify yourself
        if (data.fromUserId === userId) return;
        
        const messages = {
            reaction: `reacted ${data.emoji || '❤️'} to your post`,
            comment: 'commented on your post',
            follow: 'started following you',
            mention: 'mentioned you in a post',
            gift: `sent you ${data.amount} Krush Coins`,
            viral: 'Your post went viral! 🎉',
            verified: 'Your account has been verified! ✓'
        };
        
        await PartyNation.db.collection('artifacts')
            .doc(APP_CONFIG.appId)
            .collection('notifications')
            .add({
                userId,
                type,
                message: messages[type] || 'New notification',
                fromUserId: data.fromUserId || null,
                fromUserName: data.fromUserName || null,
                fromUserPhoto: data.fromUserPhoto || null,
                dropId: data.dropId || null,
                read: false,
                createdAt: PartyNation.serverTimestamp()
            });
    } catch (err) {
        console.error('Error creating notification:', err);
    }
};

// Get unread count
const getUnreadCount = async (userId) => {
    try {
        const snapshot = await PartyNation.db.collection('artifacts')
            .doc(APP_CONFIG.appId)
            .collection('notifications')
            .where('userId', '==', userId)
            .where('read', '==', false)
            .get();
        
        return snapshot.size;
    } catch (err) {
        return 0;
    }
};

window.NotificationsModal = NotificationsModal;
window.createNotification = createNotification;
window.getUnreadCount = getUnreadCount;
