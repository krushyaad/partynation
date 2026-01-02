// BoostPost Component - Post boosting with coins

const BoostPostModal = ({ isOpen, onClose, drop, user, onBoosted }) => {
    const [selectedPlan, setSelectedPlan] = React.useState(null);
    const [ctaLink, setCtaLink] = React.useState('');
    const [ctaText, setCtaText] = React.useState('Learn More');
    const [boosting, setBoosting] = React.useState(false);
    const [isPaused, setIsPaused] = React.useState(drop?.boostPaused || false);
    
    const userCoins = user?.krushCoins || 0;
    const isCurrentlyBoosted = drop?.isBoosted && drop?.boostExpires?.toDate?.() > new Date();
    
    const boostPlans = [
        { id: 'basic', duration: '6 hours', cost: 50, reach: '~500 users' },
        { id: 'standard', duration: '24 hours', cost: 150, reach: '~2,000 users' },
        { id: 'premium', duration: '3 days', cost: 350, reach: '~5,000 users' },
        { id: 'mega', duration: '7 days', cost: 700, reach: '~15,000 users' }
    ];
    
    if (!isOpen) return null;
    
    const handleBoost = async () => {
        if (!selectedPlan) {
            alert('Please select a boost plan');
            return;
        }
        if (selectedPlan.cost > userCoins) {
            alert('Insufficient Krush Coins');
            return;
        }
        
        setBoosting(true);
        try {
            const durationHours = {
                'basic': 6,
                'standard': 24,
                'premium': 72,
                'mega': 168
            }[selectedPlan.id];
            
            const boostExpires = new Date(Date.now() + durationHours * 60 * 60 * 1000);
            
            // Update drop with boost info
            await PartyNation.drops().doc(drop.id).update({
                isBoosted: true,
                boostPlan: selectedPlan.id,
                boostExpires: boostExpires,
                boostStarted: PartyNation.serverTimestamp(),
                boostPaused: false,
                boostCtaLink: ctaLink || null,
                boostCtaText: ctaText || 'Learn More'
            });
            
            // Deduct coins
            const collection = user.isGuest ? 'guests' : 'users';
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection(collection).doc(user.uid).update({
                    krushCoins: PartyNation.increment(-selectedPlan.cost)
                });
            
            // Log transaction
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection('coinTransactions').add({
                    userId: user.uid,
                    type: 'boost',
                    amount: -selectedPlan.cost,
                    dropId: drop.id,
                    plan: selectedPlan.id,
                    description: `Boosted post for ${selectedPlan.duration}`,
                    createdAt: PartyNation.serverTimestamp()
                });
            
            onBoosted?.();
            onClose();
            alert('🚀 Post boosted successfully!');
        } catch (err) {
            console.error('Error boosting post:', err);
            alert('Failed to boost post');
        }
        setBoosting(false);
    };
    
    const handlePauseResume = async () => {
        try {
            await PartyNation.drops().doc(drop.id).update({
                boostPaused: !isPaused
            });
            setIsPaused(!isPaused);
            alert(isPaused ? 'Boost resumed!' : 'Boost paused');
        } catch (err) {
            console.error('Error toggling pause:', err);
        }
    };
    
    const handleCancel = async () => {
        if (!confirm('Cancel boost? No refund will be given.')) return;
        
        try {
            await PartyNation.drops().doc(drop.id).update({
                isBoosted: false,
                boostPaused: false,
                boostExpires: null
            });
            onBoosted?.();
            onClose();
            alert('Boost cancelled');
        } catch (err) {
            console.error('Error cancelling boost:', err);
        }
    };
    
    // Manage existing boost
    if (isCurrentlyBoosted) {
        const remaining = Math.max(0, drop.boostExpires.toDate() - new Date());
        const hoursRemaining = Math.ceil(remaining / (1000 * 60 * 60));
        
        return (
            <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
                <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold">🚀 Manage Boost</h3>
                        <button onClick={onClose}><Icon name="x" size={24} /></button>
                    </div>
                    
                    <div className="text-center mb-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-green-400 animate-pulse'}`}></span>
                            {isPaused ? 'Paused' : 'Active'}
                        </div>
                        <p className="text-2xl font-bold mt-3">{hoursRemaining}h remaining</p>
                        <p className="text-sm text-white/60">
                            Expires {drop.boostExpires.toDate().toLocaleString()}
                        </p>
                    </div>
                    
                    <div className="space-y-3">
                        <button
                            onClick={handlePauseResume}
                            className={`w-full py-3 rounded-xl font-semibold ${isPaused ? 'bg-green-500 text-white' : 'bg-yellow-400 text-black'}`}
                        >
                            {isPaused ? '▶️ Resume Boost' : '⏸️ Pause Boost'}
                        </button>
                        <button
                            onClick={handleCancel}
                            className="w-full py-3 bg-red-500/20 text-red-400 rounded-xl font-semibold"
                        >
                            Cancel Boost
                        </button>
                    </div>
                    
                    {drop.boostCtaLink && (
                        <div className="mt-4 p-3 bg-white/5 rounded-xl">
                            <p className="text-xs text-white/60 mb-1">CTA Link</p>
                            <p className="text-sm truncate">{drop.boostCtaLink}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    
    // New boost
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <button onClick={onClose}><Icon name="x" size={24} /></button>
                <h3 className="text-lg font-bold">🚀 Boost Post</h3>
                <div className="text-yellow-400 font-semibold">{userCoins} 🪙</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
                {/* Preview */}
                <div className="mb-6">
                    <p className="text-sm text-white/60 mb-2">Post Preview</p>
                    <div className="bg-white/5 rounded-xl p-3 flex gap-3">
                        {drop.imageUrl && (
                            <img src={drop.imageUrl} className="w-16 h-16 rounded-lg object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{drop.userName}</p>
                            <p className="text-sm text-white/60 line-clamp-2">{drop.text || 'Image post'}</p>
                        </div>
                    </div>
                </div>
                
                {/* Plans */}
                <p className="text-sm text-white/60 mb-3">Select a boost plan</p>
                <div className="space-y-3 mb-6">
                    {boostPlans.map(plan => (
                        <button
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan)}
                            disabled={plan.cost > userCoins}
                            className={`w-full p-4 rounded-xl border text-left transition ${
                                selectedPlan?.id === plan.id 
                                    ? 'bg-orange-500/20 border-orange-500' 
                                    : plan.cost > userCoins 
                                        ? 'bg-white/5 border-white/10 opacity-50' 
                                        : 'bg-white/5 border-white/10 hover:border-white/30'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-lg">{plan.duration}</p>
                                    <p className="text-sm text-white/60">{plan.reach}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-yellow-400">{plan.cost} 🪙</p>
                                    {plan.cost > userCoins && (
                                        <p className="text-xs text-red-400">Not enough</p>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
                
                {/* CTA Options */}
                <div className="space-y-3">
                    <p className="text-sm text-white/60">Add Call-to-Action (optional)</p>
                    <input
                        type="url"
                        value={ctaLink}
                        onChange={e => setCtaLink(e.target.value)}
                        placeholder="https://yourlink.com"
                        className="w-full px-4 py-3 bg-white/10 rounded-xl"
                    />
                    <select
                        value={ctaText}
                        onChange={e => setCtaText(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 rounded-xl"
                    >
                        <option value="Learn More">Learn More</option>
                        <option value="Shop Now">Shop Now</option>
                        <option value="Sign Up">Sign Up</option>
                        <option value="Get Tickets">Get Tickets</option>
                        <option value="Book Now">Book Now</option>
                        <option value="Contact Us">Contact Us</option>
                    </select>
                </div>
            </div>
            
            {/* Boost Button */}
            <div className="p-4 border-t border-white/10">
                <button
                    onClick={handleBoost}
                    disabled={!selectedPlan || boosting}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl disabled:opacity-50"
                >
                    {boosting ? 'Boosting...' : selectedPlan ? `Boost for ${selectedPlan.cost} 🪙` : 'Select a Plan'}
                </button>
            </div>
        </div>
    );
};

window.BoostPostModal = BoostPostModal;
