
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '/')));

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/myhomemistri')
.then(() => console.log('✅ Connected to MongoDB: myhomemistri'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// --- SCHEMAS & MODELS ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, default: "Home Owner" },
    joinedDate: { type: Date, default: Date.now }
});

const ProviderSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    phone: String,
    password: { type: String, required: true },
    specialty: String,
    city: String,
    rating: { type: Number, default: 5.0 },
    reviews: { type: Number, default: 0 }
});

const BookingSchema = new mongoose.Schema({
    providerName: String,
    userEmail: String,
    specialty: String,
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'Upcoming' }
});

const PostSchema = new mongoose.Schema({
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
    media: String, 
    mediaType: String, 
    caption: String,
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Provider = mongoose.model('Provider', ProviderSchema);
const Booking = mongoose.model('Booking', BookingSchema);
const Post = mongoose.model('Post', PostSchema);

// --- API ROUTES ---

// Marketplace: Get all providers
app.get('/api/providers', async (req, res) => {
    try {
        const providers = await Provider.find();
        res.json(providers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Marketplace: Get Single Provider by ID
app.get('/api/providers/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid Provider ID format" });
    }
    try {
        const provider = await Provider.findById(req.params.id);
        if (!provider) return res.status(404).json({ error: "Provider not found" });
        res.json(provider);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Provider Register
app.post('/api/providers/register', async (req, res) => {
    try {
        if (!req.body.password || req.body.password.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(req.body.password)) {
            return res.status(400).json({ error: "Password must be at least 8 characters with a special character" });
        }
        const existing = await Provider.findOne({ email: req.body.email });
        if (existing) return res.status(400).json({ error: "Provider exists" });
        const newProvider = new Provider(req.body);
        await newProvider.save();
        res.status(201).json(newProvider);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Provider Login Route ---
app.post('/api/providers/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }
        const provider = await Provider.findOne({ email });
        
        // Comparison logic
        if (provider && provider.password === password) {
            res.json(provider);
        } else {
            res.status(401).json({ error: 'Invalid provider email or password' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Provider: Update Profile
app.put('/api/providers/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid Provider ID format" });
    }
    try {
        const updatedProvider = await Provider.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        if (!updatedProvider) return res.status(404).json({ error: "Provider not found" });
        res.json(updatedProvider);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User Login
app.post('/api/users/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && user.password === password) {
            res.json(user);
        } else {
            res.status(401).json({ error: 'Invalid user email or password' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User Register
app.post('/api/users/register', async (req, res) => {
    try {
        if (!req.body.password || req.body.password.length < 8 || !/[!@#$%^&*(),.?":{}|<>]/.test(req.body.password)) {
            return res.status(400).json({ error: "Password must be at least 8 characters with a special character" });
        }
        const existing = await User.findOne({ email: req.body.email });
        if (existing) return res.status(400).json({ error: "User exists" });
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// User: Update Profile
app.put('/api/users/:id', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: "Invalid User ID format" });
    }
    try {
        if (req.body.email) {
            const user = await User.findById(req.params.id);
            if (user && user.email !== req.body.email) {
                await Booking.updateMany({ userEmail: user.email }, { userEmail: req.body.email });
            }
        }
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Booking: Save request
app.post('/api/bookings', async (req, res) => {
    try {
        const newBooking = new Booking(req.body);
        await newBooking.save();
        res.status(201).json({ message: "Booking confirmed" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Booking: Update Status
app.put('/api/bookings/:id', async (req, res) => {
    const bookingId = req.params.id.trim();
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ error: "Invalid Booking ID" });
    }
    try {
        const updatedBooking = await Booking.findByIdAndUpdate(bookingId, { status: req.body.status }, { new: true });
        res.json(updatedBooking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get User History
app.get('/api/user/history/:email', async (req, res) => {
    try {
        const bookings = await Booking.find({ userEmail: req.params.email }).sort({ date: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Provider Bookings
app.get('/api/provider/bookings/:name', async (req, res) => {
    try {
        const bookings = await Booking.find({ providerName: req.params.name }).sort({ date: -1 });
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Post
app.post('/api/posts', async (req, res) => {
    try {
        const newPost = new Post(req.body);
        await newPost.save();
        res.status(201).json(newPost);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Posts by Provider
app.get('/api/posts/:providerId', async (req, res) => {
    try {
        const posts = await Post.find({ providerId: req.params.providerId }).sort({ date: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Seed Route
app.get('/api/seed', async (req, res) => {
    const mockProviders = [
        { name: "Rajesh Kumar", email: "rajesh@test.com", phone: "9876543210", password: "Password@123", specialty: "Electrician", city: "Delhi", rating: 4.8 },
        { name: "Anita Desai", email: "anita@test.com", phone: "9876543211", password: "Password@123", specialty: "Plumber", city: "Mumbai", rating: 4.9 },
        { name: "Suresh Singh", email: "suresh@test.com", phone: "9876543212", password: "Password@123", specialty: "Carpenter", city: "Bangalore", rating: 4.7 }
    ];
    await Provider.deleteMany({});
    await Provider.insertMany(mockProviders);
    res.send('✅ Database Seeded Successfully with secure passwords!');
});

// --- 404 HANDLER FOR API ---
app.use('/api', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Page Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'user-login.html')));

// --- SERVER LISTEN ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
});