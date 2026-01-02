// KrushCoins Component - Complete coins economy system
// Buy, earn, spend, gift, withdraw, history

const KrushCoinsModal = ({ isOpen, onClose, user, onCoinsUpdated }) => {
    const [activeTab, setActiveTab] = React.useState('balance');
    const [coins, setCoins] = React.useState(user?.krushCoins || 0);
    const [history, setHistory] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [showBuyOverlay, setShowBuyOverlay] = React.useState(false);
    
    // Daily bonus state
    const [canClaimDaily, setCanClaimDaily] = React.useState(false);
    const [lastDailyClaim, setLastDailyClaim] = React.useState(null);
    
    const coinPackages = [
        { id: 'starter', coins: 100, price: 0.99, bonus: 0, popular: false },
        { id: 'basic', coins: 500, price: 4.99, bonus: 50, popular: false },
        { id: 'popular', coins: 1000, price: 9.99, bonus: 150, popular: true },
        { id: 'value', coins: 2500, price: 19.99, bonus: 500, popular: false },
        { id: 'premium', coins: 5000, price: 39.99, bonus: 1500, popular: false },
        { id: 'ultimate', coins: 10000, price: 74.99, bonus: 4000, popular: false }
    ];
    
    React.useEffect(() => {
        if (isOpen && user) {
            loadCoinsData();
        }
    }, [isOpen, user]);
    
    const loadCoinsData = async () => {
        setLoading(true);
        try {
            // Get user's coin balance
            const userDoc = await PartyNation.getUserById(user.uid);
            if (userDoc) {
                setCoins(userDoc.krushCoins || 0);
                setLastDailyClaim(userDoc.lastDailyBonus?.toDate?.() || null);
                
                // Check if can claim daily bonus (24 hours since last claim)
                const now = new Date();
                const lastClaim = userDoc.lastDailyBonus?.toDate?.();
                if (!lastClaim || (now - lastClaim) >= 24 * 60 * 60 * 1000) {
                    setCanClaimDaily(true);
                }
            }
            
            // Load transaction history
            const historySnapshot = await PartyNation.db.collection('artifacts')
                .doc(APP_CONFIG.appId)
                .collection('coinTransactions')
                .where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            setHistory(historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error('Error loading coins data:', err);
        }
        setLoading(false);
    };
    
    const claimDailyBonus = async () => {
        if (!canClaimDaily) return;
        
        try {
            const bonusAmount = 10; // Daily bonus
            const collection = user.isGuest ? 'guests' : 'users';
            
            // Update user coins
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection(collection).doc(user.uid).update({
                    krushCoins: PartyNation.increment(bonusAmount),
                    lastDailyBonus: PartyNation.serverTimestamp()
                });
            
            // Log transaction
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection('coinTransactions').add({
                    userId: user.uid,
                    type: 'daily_bonus',
                    amount: bonusAmount,
                    description: 'Daily login bonus',
                    createdAt: PartyNation.serverTimestamp()
                });
            
            setCoins(prev => prev + bonusAmount);
            setCanClaimDaily(false);
            onCoinsUpdated?.(coins + bonusAmount);
            
            alert(`🎉 You earned ${bonusAmount} Krush Coins!`);
            loadCoinsData();
        } catch (err) {
            console.error('Error claiming daily bonus:', err);
            alert('Failed to claim bonus');
        }
    };
    
    const handlePurchase = async (pkg) => {
        // Load PayPal SDK dynamically
        if (!window.paypal) {
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${APP_CONFIG.paypalClientId}&currency=USD`;
            script.onload = () => setShowBuyOverlay(pkg);
            document.head.appendChild(script);
        } else {
            setShowBuyOverlay(pkg);
        }
    };
    
    const completePurchase = async (pkg, orderDetails) => {
        try {
            const totalCoins = pkg.coins + pkg.bonus;
            const collection = user.isGuest ? 'guests' : 'users';
            
            // Update user coins
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection(collection).doc(user.uid).update({
                    krushCoins: PartyNation.increment(totalCoins)
                });
            
            // Log transaction
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection('coinTransactions').add({
                    userId: user.uid,
                    type: 'purchase',
                    amount: totalCoins,
                    price: pkg.price,
                    packageId: pkg.id,
                    paypalOrderId: orderDetails.id,
                    description: `Purchased ${pkg.coins} + ${pkg.bonus} bonus coins`,
                    createdAt: PartyNation.serverTimestamp()
                });
            
            setCoins(prev => prev + totalCoins);
            setShowBuyOverlay(false);
            onCoinsUpdated?.(coins + totalCoins);
            loadCoinsData();
            
            alert(`🎉 Successfully purchased ${totalCoins} Krush Coins!`);
        } catch (err) {
            console.error('Error completing purchase:', err);
            alert('Failed to add coins. Please contact support.');
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <button onClick={onClose}><Icon name="x" size={24} /></button>
                <h3 className="text-lg font-bold">🪙 Krush Coins</h3>
                <div className="w-6"></div>
            </div>
            
            {/* Balance Card */}
            <div className="p-4">
                <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6 text-center">
                    <p className="text-sm text-yellow-400/80 mb-1">Your Balance</p>
                    <p className="text-4xl font-black text-yellow-400">{coins.toLocaleString()} 🪙</p>
                    
                    {/* Daily Bonus */}
                    {canClaimDaily ? (
                        <button
                            onClick={claimDailyBonus}
                            className="mt-4 px-6 py-2 bg-green-500 text-white font-bold rounded-full animate-pulse"
                        >
                            🎁 Claim Daily Bonus (+10)
                        </button>
                    ) : (
                        <p className="mt-4 text-sm text-white/40">Daily bonus claimed ✓</p>
                    )}
                </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-white/10">
                {['balance', 'buy', 'earn', 'history'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-sm font-semibold ${activeTab === tab ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-white/60'}`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'balance' && (
                    <div className="space-y-4">
                        <h4 className="font-semibold text-white/80">What can you do with Krush Coins?</h4>
                        <div className="space-y-3">
                            {[
                                { icon: 'zap', title: 'Boost Posts', desc: 'Get more visibility for your drops', cost: '50-500' },
                                { icon: 'gift', title: 'Send Gifts', desc: 'Gift coins to friends', cost: 'Any amount' },
                                { icon: 'check-circle', title: 'Get Verified', desc: 'Blue checkmark badge', cost: '2,500' },
                                { icon: 'star', title: 'VIP Access', desc: 'Exclusive events access', cost: '1,000/mo' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl">
                                    <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center">
                                        <Icon name={item.icon} size={20} className="text-yellow-400" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{item.title}</p>
                                        <p className="text-sm text-white/60">{item.desc}</p>
                                    </div>
                                    <span className="text-sm text-yellow-400">{item.cost} 🪙</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {activeTab === 'buy' && (
                    <div className="space-y-3">
                        <p className="text-sm text-white/60 mb-4">Select a package to purchase</p>
                        {coinPackages.map(pkg => (
                            <button
                                key={pkg.id}
                                onClick={() => handlePurchase(pkg)}
                                className={`w-full p-4 rounded-xl border ${pkg.popular ? 'bg-yellow-400/10 border-yellow-400/50' : 'bg-white/5 border-white/10'} text-left relative`}
                            >
                                {pkg.popular && (
                                    <span className="absolute -top-2 right-4 px-2 py-0.5 bg-yellow-400 text-black text-xs font-bold rounded-full">
                                        BEST VALUE
                                    </span>
                                )}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-2xl font-bold">{pkg.coins.toLocaleString()} 🪙</p>
                                        {pkg.bonus > 0 && (
                                            <p className="text-sm text-green-400">+{pkg.bonus} bonus!</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold">${pkg.price}</p>
                                        <p className="text-xs text-white/40">
                                            ${(pkg.price / (pkg.coins + pkg.bonus) * 100).toFixed(1)}¢ per coin
                                        </p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                
                {activeTab === 'earn' && (
                    <div className="space-y-4">
                        <p className="text-sm text-white/60">Ways to earn free Krush Coins</p>
                        {[
                            { icon: 'calendar', title: 'Daily Login', desc: 'Claim every 24 hours', reward: '+10', available: canClaimDaily },
                            { icon: 'users', title: 'Refer Friends', desc: 'When they sign up', reward: '+100', available: true },
                            { icon: 'heart', title: 'Go Viral', desc: '100+ reactions on a post', reward: '+50', available: true },
                            { icon: 'play', title: 'Watch Ads', desc: 'Watch a short video', reward: '+5', available: false }
                        ].map((item, i) => (
                            <div key={i} className={`flex items-center gap-4 p-3 rounded-xl ${item.available ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.available ? 'bg-green-500/20' : 'bg-white/10'}`}>
                                    <Icon name={item.icon} size={20} className={item.available ? 'text-green-400' : 'text-white/40'} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">{item.title}</p>
                                    <p className="text-sm text-white/60">{item.desc}</p>
                                </div>
                                <span className={`font-bold ${item.available ? 'text-green-400' : 'text-white/40'}`}>
                                    {item.reward}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                
                {activeTab === 'history' && (
                    <div>
                        {loading ? (
                            <LoadingSpinner size="sm" />
                        ) : history.length === 0 ? (
                            <div className="text-center text-white/40 py-8">
                                <Icon name="clock" size={32} className="mx-auto mb-2 opacity-50" />
                                <p>No transactions yet</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {history.map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                                <Icon 
                                                    name={tx.amount > 0 ? 'arrow-down' : 'arrow-up'} 
                                                    size={16} 
                                                    className={tx.amount > 0 ? 'text-green-400' : 'text-red-400'} 
                                                />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{tx.description}</p>
                                                <p className="text-xs text-white/40">{utils.timeAgo(tx.createdAt)}</p>
                                            </div>
                                        </div>
                                        <span className={`font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* PayPal Buy Overlay */}
            {showBuyOverlay && (
                <PayPalCheckout
                    pkg={showBuyOverlay}
                    onComplete={(details) => completePurchase(showBuyOverlay, details)}
                    onCancel={() => setShowBuyOverlay(false)}
                />
            )}
        </div>
    );
};

// PayPal Checkout Component
const PayPalCheckout = ({ pkg, onComplete, onCancel }) => {
    const paypalRef = React.useRef(null);
    
    React.useEffect(() => {
        if (window.paypal && paypalRef.current) {
            paypalRef.current.innerHTML = '';
            
            window.paypal.Buttons({
                style: {
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'rect',
                    label: 'pay'
                },
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            description: `${pkg.coins + pkg.bonus} Krush Coins`,
                            amount: {
                                value: pkg.price.toFixed(2),
                                currency_code: 'USD'
                            }
                        }]
                    });
                },
                onApprove: async (data, actions) => {
                    const details = await actions.order.capture();
                    onComplete(details);
                },
                onCancel: () => {
                    onCancel();
                },
                onError: (err) => {
                    console.error('PayPal error:', err);
                    alert('Payment failed. Please try again.');
                }
            }).render(paypalRef.current);
        }
    }, [pkg]);
    
    return (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Complete Purchase</h3>
                    <button onClick={onCancel}><Icon name="x" size={24} /></button>
                </div>
                
                <div className="text-center mb-6 p-4 bg-yellow-400/10 rounded-xl">
                    <p className="text-3xl font-bold text-yellow-400">{(pkg.coins + pkg.bonus).toLocaleString()} 🪙</p>
                    <p className="text-sm text-white/60 mt-1">${pkg.price} USD</p>
                </div>
                
                <div ref={paypalRef}></div>
                
                <p className="text-xs text-white/40 text-center mt-4">
                    Secure payment via PayPal
                </p>
            </div>
        </div>
    );
};

// Gift Coins Modal
const GiftCoinsModal = ({ isOpen, onClose, user, recipient }) => {
    const [amount, setAmount] = React.useState('');
    const [message, setMessage] = React.useState('');
    const [sending, setSending] = React.useState(false);
    const userCoins = user?.krushCoins || 0;
    
    if (!isOpen) return null;
    
    const handleSend = async () => {
        const giftAmount = parseInt(amount);
        if (!giftAmount || giftAmount < 1) {
            alert('Please enter a valid amount');
            return;
        }
        if (giftAmount > userCoins) {
            alert('Insufficient coins');
            return;
        }
        
        setSending(true);
        try {
            const batch = PartyNation.db.batch();
            const senderCollection = user.isGuest ? 'guests' : 'users';
            
            // Deduct from sender
            const senderRef = PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection(senderCollection).doc(user.uid);
            batch.update(senderRef, {
                krushCoins: PartyNation.increment(-giftAmount)
            });
            
            // Add to recipient (check both collections)
            const recipientUserDoc = await PartyNation.users().doc(recipient.id).get();
            const recipientCollection = recipientUserDoc.exists ? 'users' : 'guests';
            const recipientRef = PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection(recipientCollection).doc(recipient.id);
            batch.update(recipientRef, {
                krushCoins: PartyNation.increment(giftAmount)
            });
            
            await batch.commit();
            
            // Log transactions
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection('coinTransactions').add({
                    userId: user.uid,
                    type: 'gift_sent',
                    amount: -giftAmount,
                    recipientId: recipient.id,
                    recipientName: recipient.displayName,
                    message: message,
                    createdAt: PartyNation.serverTimestamp()
                });
            
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection('coinTransactions').add({
                    userId: recipient.id,
                    type: 'gift_received',
                    amount: giftAmount,
                    senderId: user.uid,
                    senderName: user.displayName,
                    message: message,
                    createdAt: PartyNation.serverTimestamp()
                });
            
            alert(`🎁 Sent ${giftAmount} coins to ${recipient.displayName}!`);
            onClose();
        } catch (err) {
            console.error('Error sending gift:', err);
            alert('Failed to send gift');
        }
        setSending(false);
    };
    
    return (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">🎁 Gift Coins</h3>
                    <button onClick={onClose}><Icon name="x" size={24} /></button>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-4">
                    {recipient.photoURL ? (
                        <img src={recipient.photoURL} className="w-12 h-12 rounded-full" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center font-bold">
                            {recipient.displayName?.[0]}
                        </div>
                    )}
                    <div>
                        <p className="font-semibold">{recipient.displayName}</p>
                        <p className="text-sm text-white/60">Sending to</p>
                    </div>
                </div>
                
                <div className="mb-4">
                    <label className="text-sm text-white/60 block mb-1">Amount</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0"
                            className="flex-1 px-4 py-3 bg-white/10 rounded-xl text-xl font-bold text-center"
                            min="1"
                            max={userCoins}
                        />
                        <span className="text-2xl">🪙</span>
                    </div>
                    <p className="text-xs text-white/40 mt-1">Your balance: {userCoins} coins</p>
                </div>
                
                <div className="mb-4">
                    <label className="text-sm text-white/60 block mb-1">Message (optional)</label>
                    <input
                        type="text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Add a message..."
                        className="w-full px-4 py-3 bg-white/10 rounded-xl"
                        maxLength={100}
                    />
                </div>
                
                <button
                    onClick={handleSend}
                    disabled={sending || !amount || parseInt(amount) > userCoins}
                    className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl disabled:opacity-50"
                >
                    {sending ? 'Sending...' : `Send ${amount || 0} Coins`}
                </button>
            </div>
        </div>
    );
};

window.KrushCoinsModal = KrushCoinsModal;
window.PayPalCheckout = PayPalCheckout;
window.GiftCoinsModal = GiftCoinsModal;
