// Verification Component - Get verified badge

const VerificationModal = ({ isOpen, onClose, user }) => {
    const [method, setMethod] = React.useState(null); // 'coins' or 'payment'
    const [processing, setProcessing] = React.useState(false);
    
    const VERIFICATION_COST_COINS = 2500;
    const VERIFICATION_COST_USD = 25;
    
    const userCoins = user?.krushCoins || 0;
    const canAffordCoins = userCoins >= VERIFICATION_COST_COINS;
    const isAlreadyVerified = user?.verified;
    
    if (!isOpen) return null;
    
    const handleVerifyWithCoins = async () => {
        if (!canAffordCoins) {
            alert('Insufficient Krush Coins');
            return;
        }
        
        setProcessing(true);
        try {
            const collection = user.isGuest ? 'guests' : 'users';
            
            // Deduct coins and verify
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection(collection).doc(user.uid).update({
                    krushCoins: PartyNation.increment(-VERIFICATION_COST_COINS),
                    verified: true,
                    verifiedAt: PartyNation.serverTimestamp(),
                    verificationMethod: 'coins'
                });
            
            // Log transaction
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection('coinTransactions').add({
                    userId: user.uid,
                    type: 'verification',
                    amount: -VERIFICATION_COST_COINS,
                    description: 'Account verification',
                    createdAt: PartyNation.serverTimestamp()
                });
            
            // Create notification
            await createNotification(user.uid, 'verified', {});
            
            alert('🎉 Congratulations! Your account is now verified!');
            onClose();
            window.location.reload(); // Refresh to show badge
        } catch (err) {
            console.error('Error verifying:', err);
            alert('Verification failed. Please try again.');
        }
        setProcessing(false);
    };
    
    const handleVerifyWithPayment = async (orderDetails) => {
        setProcessing(true);
        try {
            const collection = user.isGuest ? 'guests' : 'users';
            
            await PartyNation.db.collection('artifacts').doc(APP_CONFIG.appId)
                .collection(collection).doc(user.uid).update({
                    verified: true,
                    verifiedAt: PartyNation.serverTimestamp(),
                    verificationMethod: 'payment',
                    verificationOrderId: orderDetails.id
                });
            
            await createNotification(user.uid, 'verified', {});
            
            alert('🎉 Congratulations! Your account is now verified!');
            onClose();
            window.location.reload();
        } catch (err) {
            console.error('Error verifying:', err);
            alert('Verification failed. Please contact support.');
        }
        setProcessing(false);
    };
    
    if (isAlreadyVerified) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
                <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full text-center">
                    <img src="nation/badge.png" className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">You're Verified!</h3>
                    <p className="text-white/60 mb-4">
                        Your account already has the verified badge.
                    </p>
                    <button onClick={onClose} className="px-6 py-2 bg-white/10 rounded-full">
                        Close
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <button onClick={onClose}><Icon name="x" size={24} /></button>
                <h3 className="text-lg font-bold">Get Verified</h3>
                <div className="w-6"></div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
                {/* Hero */}
                <div className="text-center mb-8">
                    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 p-1">
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                            <img src="nation/badge.png" className="w-12 h-12" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Verified Badge</h2>
                    <p className="text-white/60">
                        Stand out from the crowd with a verified badge on your profile.
                    </p>
                </div>
                
                {/* Benefits */}
                <div className="mb-8">
                    <h4 className="font-semibold mb-3">Benefits include:</h4>
                    <div className="space-y-2">
                        {[
                            'Blue checkmark on your profile',
                            'Verified badge on all your posts',
                            'Priority in search results',
                            'Exclusive verified-only features',
                            'Build trust with your followers'
                        ].map((benefit, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <Icon name="check" size={16} className="text-green-400" />
                                <span>{benefit}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Payment Options */}
                {!method ? (
                    <div className="space-y-3">
                        <button
                            onClick={() => setMethod('coins')}
                            className={`w-full p-4 rounded-xl border text-left ${canAffordCoins ? 'bg-yellow-400/10 border-yellow-400/50' : 'bg-white/5 border-white/10 opacity-60'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold">Pay with Krush Coins</p>
                                    <p className="text-sm text-white/60">
                                        You have: {userCoins} 🪙
                                    </p>
                                </div>
                                <p className="text-xl font-bold text-yellow-400">
                                    {VERIFICATION_COST_COINS} 🪙
                                </p>
                            </div>
                            {!canAffordCoins && (
                                <p className="text-xs text-red-400 mt-2">
                                    You need {VERIFICATION_COST_COINS - userCoins} more coins
                                </p>
                            )}
                        </button>
                        
                        <button
                            onClick={() => setMethod('payment')}
                            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-left"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-bold">Pay with Card/PayPal</p>
                                    <p className="text-sm text-white/60">One-time payment</p>
                                </div>
                                <p className="text-xl font-bold">${VERIFICATION_COST_USD}</p>
                            </div>
                        </button>
                    </div>
                ) : method === 'coins' ? (
                    <div className="text-center">
                        <div className="p-6 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl mb-4">
                            <p className="text-3xl font-bold text-yellow-400 mb-2">
                                {VERIFICATION_COST_COINS} 🪙
                            </p>
                            <p className="text-sm text-white/60">
                                Your balance after: {userCoins - VERIFICATION_COST_COINS} coins
                            </p>
                        </div>
                        
                        <button
                            onClick={handleVerifyWithCoins}
                            disabled={!canAffordCoins || processing}
                            className="w-full py-4 bg-yellow-400 text-black font-bold rounded-xl disabled:opacity-50 mb-3"
                        >
                            {processing ? 'Processing...' : 'Confirm & Verify'}
                        </button>
                        
                        <button
                            onClick={() => setMethod(null)}
                            className="text-white/60 text-sm"
                        >
                            ← Back to options
                        </button>
                    </div>
                ) : (
                    <div>
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl mb-4 text-center">
                            <p className="text-3xl font-bold mb-2">${VERIFICATION_COST_USD}</p>
                            <p className="text-sm text-white/60">One-time payment via PayPal</p>
                        </div>
                        
                        <VerificationPayPal
                            amount={VERIFICATION_COST_USD}
                            onComplete={handleVerifyWithPayment}
                            onCancel={() => setMethod(null)}
                        />
                        
                        <button
                            onClick={() => setMethod(null)}
                            className="w-full text-white/60 text-sm mt-4"
                        >
                            ← Back to options
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// PayPal for verification
const VerificationPayPal = ({ amount, onComplete, onCancel }) => {
    const paypalRef = React.useRef(null);
    const [loaded, setLoaded] = React.useState(false);
    
    React.useEffect(() => {
        const loadPayPal = () => {
            if (window.paypal && paypalRef.current) {
                paypalRef.current.innerHTML = '';
                
                window.paypal.Buttons({
                    style: {
                        layout: 'vertical',
                        color: 'gold',
                        shape: 'rect'
                    },
                    createOrder: (data, actions) => {
                        return actions.order.create({
                            purchase_units: [{
                                description: 'Party Nation Verification Badge',
                                amount: {
                                    value: amount.toFixed(2),
                                    currency_code: 'USD'
                                }
                            }]
                        });
                    },
                    onApprove: async (data, actions) => {
                        const details = await actions.order.capture();
                        onComplete(details);
                    },
                    onCancel: () => onCancel(),
                    onError: (err) => {
                        console.error('PayPal error:', err);
                        alert('Payment failed');
                    }
                }).render(paypalRef.current);
                
                setLoaded(true);
            }
        };
        
        if (!window.paypal) {
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${APP_CONFIG.paypalClientId}&currency=USD`;
            script.onload = loadPayPal;
            document.head.appendChild(script);
        } else {
            loadPayPal();
        }
    }, [amount]);
    
    return (
        <div>
            {!loaded && <LoadingSpinner size="sm" text="Loading payment..." />}
            <div ref={paypalRef}></div>
        </div>
    );
};

window.VerificationModal = VerificationModal;
window.VerificationPayPal = VerificationPayPal;
