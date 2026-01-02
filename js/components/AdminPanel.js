// Admin Panel Component - Moderation and management

const AdminPanel = ({ isOpen, onClose, user }) => {
    const [activeSection, setActiveSection] = React.useState('overview');
    const [stats, setStats] = React.useState(null);
    const [reports, setReports] = React.useState([]);
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [searchQuery, setSearchQuery] = React.useState('');
    
    React.useEffect(() => {
        if (isOpen && user?.isAdmin) {
            loadAdminData();
        }
    }, [isOpen, user]);
    
    const loadAdminData = async () => {
        setLoading(true);
        try {
            // Load stats
            const [dropsSnap, usersSnap, guestsSnap, eventsSnap] = await Promise.all([
                PartyNation.drops().orderBy('createdAt', 'desc').limit(1).get(),
                PartyNation.users().get(),
                PartyNation.guests().get(),
                PartyNation.events().get()
            ]);
            
            // Get counts
            const totalDrops = (await PartyNation.drops().get()).size;
            
            setStats({
                totalUsers: usersSnap.size + guestsSnap.size,
                totalDrops: totalDrops,
                totalEvents: eventsSnap.size,
                verifiedUsers: usersSnap.docs.filter(d => d.data().verified).length
            });
            
            // Load reports
            const reportsSnap = await PartyNation.db.collection('artifacts')
                .doc(APP_CONFIG.appId)
                .collection('reports')
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            
            // Load recent users
            const recentUsers = usersSnap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0))
                .slice(0, 20);
            
            setUsers(recentUsers);
        } catch (err) {
            console.error('Error loading admin data:', err);
        }
        setLoading(false);
    };
    
    const handleVerifyUser = async (userId, verify) => {
        try {
            await PartyNation.users().doc(userId).update({
                verified: verify,
                verifiedAt: verify ? PartyNation.serverTimestamp() : null
            });
            loadAdminData();
            alert(verify ? 'User verified!' : 'Verification removed');
        } catch (err) {
            console.error('Error updating verification:', err);
        }
    };
    
    const handleBanUser = async (userId, ban) => {
        if (!confirm(ban ? 'Ban this user?' : 'Unban this user?')) return;
        
        try {
            await PartyNation.users().doc(userId).update({
                isBanned: ban,
                bannedAt: ban ? PartyNation.serverTimestamp() : null,
                bannedBy: ban ? user.uid : null
            });
            loadAdminData();
            alert(ban ? 'User banned' : 'User unbanned');
        } catch (err) {
            console.error('Error updating ban status:', err);
        }
    };
    
    const handleResolveReport = async (reportId, action) => {
        try {
            const report = reports.find(r => r.id === reportId);
            
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection('reports').doc(reportId).update({
                    status: 'resolved',
                    resolution: action,
                    resolvedBy: user.uid,
                    resolvedAt: PartyNation.serverTimestamp()
                });
            
            if (action === 'remove' && report.contentId) {
                // Remove the reported content
                if (report.contentType === 'drop') {
                    await PartyNation.drops().doc(report.contentId).delete();
                } else if (report.contentType === 'comment') {
                    await PartyNation.comments().doc(report.contentId).delete();
                }
            }
            
            loadAdminData();
            alert('Report resolved');
        } catch (err) {
            console.error('Error resolving report:', err);
        }
    };
    
    const handleAwardCoins = async (userId, amount) => {
        const coins = parseInt(prompt('Enter amount of coins to award:', '100'));
        if (!coins || isNaN(coins)) return;
        
        try {
            await PartyNation.users().doc(userId).update({
                krushCoins: PartyNation.increment(coins)
            });
            
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection('coinTransactions').add({
                    userId,
                    type: 'admin_award',
                    amount: coins,
                    awardedBy: user.uid,
                    description: 'Admin award',
                    createdAt: PartyNation.serverTimestamp()
                });
            
            alert(`Awarded ${coins} coins`);
            loadAdminData();
        } catch (err) {
            console.error('Error awarding coins:', err);
        }
    };
    
    if (!isOpen || !user?.isAdmin) return null;
    
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <button onClick={onClose}><Icon name="x" size={24} /></button>
                <h3 className="text-lg font-bold">🛡️ Admin Panel</h3>
                <div className="w-6"></div>
            </div>
            
            {/* Navigation */}
            <div className="flex border-b border-white/10 overflow-x-auto">
                {['overview', 'reports', 'users', 'settings'].map(section => (
                    <button
                        key={section}
                        onClick={() => setActiveSection(section)}
                        className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${
                            activeSection === section ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-white/60'
                        }`}
                    >
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                        {section === 'reports' && reports.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                {reports.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {/* Overview */}
                        {activeSection === 'overview' && stats && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Total Users', value: stats.totalUsers, icon: 'users' },
                                        { label: 'Total Drops', value: stats.totalDrops, icon: 'grid' },
                                        { label: 'Events', value: stats.totalEvents, icon: 'calendar' },
                                        { label: 'Verified', value: stats.verifiedUsers, icon: 'check-circle' }
                                    ].map((stat, i) => (
                                        <div key={i} className="p-4 bg-white/5 rounded-xl">
                                            <Icon name={stat.icon} size={20} className="text-yellow-400 mb-2" />
                                            <p className="text-2xl font-bold">{stat.value}</p>
                                            <p className="text-sm text-white/60">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                    <h4 className="font-semibold text-red-400 mb-2">Pending Reports</h4>
                                    <p className="text-3xl font-bold">{reports.length}</p>
                                    {reports.length > 0 && (
                                        <button 
                                            onClick={() => setActiveSection('reports')}
                                            className="mt-2 text-sm text-red-400 underline"
                                        >
                                            Review now →
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Reports */}
                        {activeSection === 'reports' && (
                            <div className="space-y-3">
                                {reports.length === 0 ? (
                                    <div className="text-center text-white/40 py-8">
                                        <Icon name="check-circle" size={48} className="mx-auto mb-2 opacity-50" />
                                        <p>No pending reports</p>
                                    </div>
                                ) : (
                                    reports.map(report => (
                                        <div key={report.id} className="p-4 bg-white/5 rounded-xl">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="font-semibold capitalize">{report.contentType} Report</p>
                                                    <p className="text-sm text-white/60">{report.reason}</p>
                                                </div>
                                                <span className="text-xs text-white/40">{utils.timeAgo(report.createdAt)}</span>
                                            </div>
                                            {report.description && (
                                                <p className="text-sm text-white/80 mb-3">{report.description}</p>
                                            )}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleResolveReport(report.id, 'remove')}
                                                    className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm"
                                                >
                                                    Remove Content
                                                </button>
                                                <button
                                                    onClick={() => handleResolveReport(report.id, 'dismiss')}
                                                    className="px-3 py-1 bg-white/10 rounded-lg text-sm"
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        
                        {/* Users */}
                        {activeSection === 'users' && (
                            <div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search users..."
                                    className="w-full px-4 py-3 bg-white/10 rounded-xl mb-4"
                                />
                                
                                <div className="space-y-2">
                                    {users
                                        .filter(u => !searchQuery || 
                                            u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map(u => (
                                            <div key={u.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                                {u.photoURL ? (
                                                    <img src={u.photoURL} className="w-10 h-10 rounded-full" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                                                        {u.displayName?.[0]}
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold flex items-center gap-1">
                                                        {u.displayName}
                                                        {u.verified && <img src="nation/badge.png" className="w-4 h-4" />}
                                                        {u.isBanned && <span className="text-xs bg-red-500 px-1 rounded">BANNED</span>}
                                                    </p>
                                                    <p className="text-xs text-white/60 truncate">{u.email}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => handleVerifyUser(u.id, !u.verified)}
                                                        className={`p-2 rounded-lg ${u.verified ? 'bg-yellow-400/20 text-yellow-400' : 'bg-white/10'}`}
                                                        title={u.verified ? 'Remove verification' : 'Verify'}
                                                    >
                                                        <Icon name="check-circle" size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAwardCoins(u.id)}
                                                        className="p-2 bg-white/10 rounded-lg"
                                                        title="Award coins"
                                                    >
                                                        🪙
                                                    </button>
                                                    <button
                                                        onClick={() => handleBanUser(u.id, !u.isBanned)}
                                                        className={`p-2 rounded-lg ${u.isBanned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                                                        title={u.isBanned ? 'Unban' : 'Ban'}
                                                    >
                                                        <Icon name={u.isBanned ? 'user-check' : 'user-x'} size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                        
                        {/* Settings */}
                        {activeSection === 'settings' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <h4 className="font-semibold mb-2">App Settings</h4>
                                    <p className="text-sm text-white/60">Coming soon...</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// Report Content Modal
const ReportContentModal = ({ isOpen, onClose, contentType, contentId, user }) => {
    const [reason, setReason] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);
    
    const reasons = [
        'Spam or misleading',
        'Harassment or bullying',
        'Hate speech',
        'Violence or dangerous content',
        'Sexual content',
        'Copyright violation',
        'Other'
    ];
    
    if (!isOpen) return null;
    
    const handleSubmit = async () => {
        if (!reason) {
            alert('Please select a reason');
            return;
        }
        
        setSubmitting(true);
        try {
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection('reports').add({
                    contentType,
                    contentId,
                    reason,
                    description: description.trim(),
                    reportedBy: user?.uid || 'anonymous',
                    status: 'pending',
                    createdAt: PartyNation.serverTimestamp()
                });
            
            alert('Report submitted. Thank you for helping keep our community safe.');
            onClose();
        } catch (err) {
            console.error('Error submitting report:', err);
            alert('Failed to submit report');
        }
        setSubmitting(false);
    };
    
    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">🚨 Report {contentType}</h3>
                    <button onClick={onClose}><Icon name="x" size={24} /></button>
                </div>
                
                <p className="text-sm text-white/60 mb-4">
                    Help us understand what's wrong with this content.
                </p>
                
                <div className="space-y-2 mb-4">
                    {reasons.map(r => (
                        <button
                            key={r}
                            onClick={() => setReason(r)}
                            className={`w-full p-3 rounded-xl text-left ${
                                reason === r ? 'bg-red-500/20 border border-red-500' : 'bg-white/5'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
                
                <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Additional details (optional)..."
                    className="w-full px-4 py-3 bg-white/10 rounded-xl resize-none mb-4"
                    rows={3}
                />
                
                <button
                    onClick={handleSubmit}
                    disabled={!reason || submitting}
                    className="w-full py-3 bg-red-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
            </div>
        </div>
    );
};

window.AdminPanel = AdminPanel;
window.ReportContentModal = ReportContentModal;
