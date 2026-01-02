// EventsTab Component - Browse and manage events

const EventsTab = ({ user, deepLinkTarget }) => {
    const [events, setEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [filter, setFilter] = React.useState('upcoming'); // upcoming, past, mine
    const [selectedEvent, setSelectedEvent] = React.useState(null);
    const [showCreateEvent, setShowCreateEvent] = React.useState(false);
    
    React.useEffect(() => {
        loadEvents();
    }, [filter]);
    
    React.useEffect(() => {
        if (deepLinkTarget?.eventId) {
            loadSingleEvent(deepLinkTarget.eventId);
        }
    }, [deepLinkTarget]);
    
    const loadEvents = async () => {
        setLoading(true);
        try {
            let query = PartyNation.events();
            const now = new Date();
            
            if (filter === 'upcoming') {
                query = query.where('date', '>=', now).orderBy('date', 'asc');
            } else if (filter === 'past') {
                query = query.where('date', '<', now).orderBy('date', 'desc');
            } else if (filter === 'mine' && user) {
                query = query.where('createdBy', '==', user.uid).orderBy('date', 'desc');
            }
            
            const snapshot = await query.limit(50).get();
            setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (err) {
            console.error('Error loading events:', err);
        }
        setLoading(false);
    };
    
    const loadSingleEvent = async (eventId) => {
        try {
            const doc = await PartyNation.events().doc(eventId).get();
            if (doc.exists) {
                setSelectedEvent({ id: doc.id, ...doc.data() });
            }
        } catch (err) {
            console.error('Error loading event:', err);
        }
    };
    
    const handleRSVP = async (eventId, status) => {
        if (!user) {
            alert('Please sign in to RSVP');
            return;
        }
        
        try {
            const rsvpRef = PartyNation.events().doc(eventId)
                .collection('rsvps').doc(user.uid);
            
            await rsvpRef.set({
                userId: user.uid,
                userName: user.displayName,
                userPhoto: user.photoURL,
                status, // going, interested, not_going
                createdAt: PartyNation.serverTimestamp()
            });
            
            // Update event attendee count
            if (status === 'going') {
                await PartyNation.events().doc(eventId).update({
                    attendeeCount: PartyNation.increment(1)
                });
            }
            
            loadEvents();
        } catch (err) {
            console.error('Error updating RSVP:', err);
        }
    };
    
    const handleShare = async (event) => {
        const result = await Router.shareLink('event', event.id, null, event.name);
        if (result.success && result.method === 'clipboard') {
            alert('Event link copied!');
        }
    };
    
    const formatEventDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };
    
    return (
        <div className="min-h-screen">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Events</h2>
                {user && (
                    <button
                        onClick={() => setShowCreateEvent(true)}
                        className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-full text-sm flex items-center gap-1"
                    >
                        <Icon name="plus" size={16} />
                        Create
                    </button>
                )}
            </div>
            
            {/* Filter Tabs */}
            <div className="flex gap-2 px-4 mb-4">
                {['upcoming', 'past', ...(user ? ['mine'] : [])].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${
                            filter === f ? 'bg-yellow-400 text-black' : 'bg-white/10'
                        }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>
            
            {/* Events List */}
            {loading ? (
                <div className="p-4 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse">
                            <div className="h-40 bg-white/5 rounded-2xl"></div>
                        </div>
                    ))}
                </div>
            ) : events.length === 0 ? (
                <div className="p-8 text-center">
                    <Icon name="calendar" size={48} className="mx-auto text-white/20 mb-4" />
                    <p className="text-white/60">No events found</p>
                    {user && filter === 'mine' && (
                        <button
                            onClick={() => setShowCreateEvent(true)}
                            className="mt-4 px-6 py-2 bg-yellow-400 text-black font-bold rounded-full"
                        >
                            Create Your First Event
                        </button>
                    )}
                </div>
            ) : (
                <div className="px-4 space-y-4 pb-20">
                    {events.map(event => (
                        <div
                            key={event.id}
                            className="glass-panel rounded-2xl overflow-hidden"
                        >
                            {/* Event Image */}
                            {event.imageUrl && (
                                <div className="h-40 relative">
                                    <img src={event.imageUrl} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                </div>
                            )}
                            
                            {/* Event Info */}
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <p className="text-xs text-yellow-400 font-semibold uppercase">
                                            {formatEventDate(event.date)}
                                        </p>
                                        <h3 className="text-lg font-bold mt-1">{event.name}</h3>
                                    </div>
                                    {event.price && (
                                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold">
                                            ${event.price}
                                        </span>
                                    )}
                                </div>
                                
                                {event.location && (
                                    <p className="text-sm text-white/60 flex items-center gap-1 mb-2">
                                        <Icon name="map-pin" size={14} />
                                        {event.location}
                                    </p>
                                )}
                                
                                {event.description && (
                                    <p className="text-sm text-white/80 line-clamp-2 mb-3">{event.description}</p>
                                )}
                                
                                {/* Attendees */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2">
                                            {/* Placeholder avatars */}
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-full bg-gray-700 border-2 border-[#1a1a1a]"></div>
                                            ))}
                                        </div>
                                        <span className="text-sm text-white/60">
                                            {event.attendeeCount || 0} going
                                        </span>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleShare(event)}
                                            className="p-2 bg-white/10 rounded-full"
                                        >
                                            <Icon name="share" size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleRSVP(event.id, 'going')}
                                            className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-full text-sm"
                                        >
                                            I'm Going
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Create Event Modal */}
            {showCreateEvent && (
                <CreateEventModal
                    user={user}
                    onClose={() => setShowCreateEvent(false)}
                    onCreated={() => {
                        setShowCreateEvent(false);
                        setFilter('mine');
                        loadEvents();
                    }}
                />
            )}
            
            {/* Event Detail Modal */}
            {selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    user={user}
                    onClose={() => setSelectedEvent(null)}
                    onRSVP={handleRSVP}
                />
            )}
        </div>
    );
};

// Create Event Modal
const CreateEventModal = ({ user, onClose, onCreated }) => {
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [location, setLocation] = React.useState('');
    const [date, setDate] = React.useState('');
    const [time, setTime] = React.useState('');
    const [price, setPrice] = React.useState('');
    const [image, setImage] = React.useState(null);
    const [creating, setCreating] = React.useState(false);
    
    const fileInputRef = React.useRef(null);
    
    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const compressed = await utils.compressImage(file, 1200, 0.85);
        setImage(compressed);
    };
    
    const handleCreate = async () => {
        if (!name.trim() || !date || !time) {
            alert('Please fill in event name, date and time');
            return;
        }
        
        setCreating(true);
        try {
            const eventDate = new Date(`${date}T${time}`);
            
            await PartyNation.events().add({
                name: name.trim(),
                description: description.trim(),
                location: location.trim(),
                date: eventDate,
                price: price ? parseFloat(price) : null,
                imageUrl: image,
                createdBy: user.uid,
                createdByName: user.displayName,
                createdByPhoto: user.photoURL,
                createdAt: PartyNation.serverTimestamp(),
                attendeeCount: 0,
                status: 'active'
            });
            
            onCreated();
        } catch (err) {
            console.error('Error creating event:', err);
            alert('Failed to create event');
        }
        setCreating(false);
    };
    
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <button onClick={onClose}><Icon name="x" size={24} /></button>
                <h3 className="text-lg font-bold">Create Event</h3>
                <button
                    onClick={handleCreate}
                    disabled={creating || !name.trim()}
                    className="text-yellow-400 font-semibold disabled:opacity-50"
                >
                    {creating ? 'Creating...' : 'Create'}
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                {/* Event Image */}
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-40 bg-white/5 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/10 overflow-hidden"
                >
                    {image ? (
                        <img src={image} className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center">
                            <Icon name="image" size={32} className="mx-auto text-white/40 mb-2" />
                            <p className="text-sm text-white/40">Add Cover Image</p>
                        </div>
                    )}
                </div>
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
                
                <div>
                    <label className="text-sm text-white/60 block mb-1">Event Name *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 rounded-xl"
                        placeholder="What's the event called?"
                        maxLength={100}
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm text-white/60 block mb-1">Date *</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full px-4 py-3 bg-white/10 rounded-xl"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-white/60 block mb-1">Time *</label>
                        <input
                            type="time"
                            value={time}
                            onChange={e => setTime(e.target.value)}
                            className="w-full px-4 py-3 bg-white/10 rounded-xl"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="text-sm text-white/60 block mb-1">Location</label>
                    <input
                        type="text"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 rounded-xl"
                        placeholder="Where is it happening?"
                    />
                </div>
                
                <div>
                    <label className="text-sm text-white/60 block mb-1">Price (optional)</label>
                    <div className="flex items-center">
                        <span className="px-4 py-3 bg-white/5 rounded-l-xl text-white/40">$</span>
                        <input
                            type="number"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            className="flex-1 px-4 py-3 bg-white/10 rounded-r-xl"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="text-sm text-white/60 block mb-1">Description</label>
                    <textarea
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 rounded-xl resize-none"
                        rows={4}
                        placeholder="Tell people about your event..."
                        maxLength={500}
                    />
                </div>
            </div>
        </div>
    );
};

// Event Detail Modal
const EventDetailModal = ({ event, user, onClose, onRSVP }) => {
    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };
    
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
            <div className="p-4 flex items-center justify-between">
                <button onClick={onClose}><Icon name="arrow-left" size={24} /></button>
                <button onClick={() => Router.shareLink('event', event.id, null, event.name)}>
                    <Icon name="share" size={24} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {event.imageUrl && (
                    <div className="h-56">
                        <img src={event.imageUrl} className="w-full h-full object-cover" />
                    </div>
                )}
                
                <div className="p-4">
                    <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
                    
                    <div className="space-y-3 mb-6">
                        <p className="flex items-center gap-3 text-white/80">
                            <Icon name="calendar" size={20} className="text-yellow-400" />
                            {formatDate(event.date)}
                        </p>
                        {event.location && (
                            <p className="flex items-center gap-3 text-white/80">
                                <Icon name="map-pin" size={20} className="text-yellow-400" />
                                {event.location}
                            </p>
                        )}
                        {event.price && (
                            <p className="flex items-center gap-3 text-white/80">
                                <Icon name="dollar-sign" size={20} className="text-green-400" />
                                ${event.price}
                            </p>
                        )}
                    </div>
                    
                    {event.description && (
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2">About</h3>
                            <p className="text-white/80">{event.description}</p>
                        </div>
                    )}
                    
                    {/* Host */}
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl mb-6">
                        {event.createdByPhoto ? (
                            <img src={event.createdByPhoto} className="w-10 h-10 rounded-full" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                                {event.createdByName?.[0]}
                            </div>
                        )}
                        <div>
                            <p className="text-xs text-white/60">Hosted by</p>
                            <p className="font-semibold">{event.createdByName}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* RSVP Button */}
            <div className="p-4 border-t border-white/10">
                <button
                    onClick={() => { onRSVP(event.id, 'going'); onClose(); }}
                    className="w-full py-4 bg-yellow-400 text-black font-bold rounded-xl text-lg"
                >
                    I'm Going! 🎉
                </button>
            </div>
        </div>
    );
};

window.EventsTab = EventsTab;
window.CreateEventModal = CreateEventModal;
window.EventDetailModal = EventDetailModal;
