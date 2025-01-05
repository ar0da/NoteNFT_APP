const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS ayarları
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB bağlantısı
mongoose.connect('mongodb://127.0.0.1:27017/studynotesdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('MongoDB\'ye başarıyla bağlandı');
}).catch(err => {
    console.error('MongoDB bağlantı hatası:', err);
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB bağlantı hatası:'));
db.once('open', () => {
    console.log('MongoDB\'ye başarıyla bağlandı');
});

// Not şeması
const noteSchema = new mongoose.Schema({
    tokenId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    course: String,
    topic: String,
    author: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    priceInWei: {
        type: String,
        required: true
    },
    maxSupplyInWei: {
        type: String,
        required: true
    },
    tokenURI: {
        type: String,
        required: true
    },
    contentHash: {
        type: String,
        required: true
    }
});

const Note = mongoose.model('Note', noteSchema);

// API rotaları
const router = express.Router();

// Middleware to log all requests
router.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    console.log('Request body:', req.body);
    console.log('Request params:', req.params);
    next();
});

// Delete a specific note - this must come before the get route
router.delete('/notes/:tokenId', async (req, res) => {
    try {
        const { tokenId } = req.params;
        console.log('Deleting note with tokenId:', tokenId);
        console.log('TokenId type:', typeof tokenId);
        
        // Find note before deletion to check if it exists
        const existingNote = await Note.findOne({ tokenId: tokenId });
        console.log('Existing note:', existingNote);
        
        if (!existingNote) {
            console.log(`Note not found with tokenId: ${tokenId}`);
            return res.status(404).json({ 
                success: false, 
                message: `Note not found with tokenId: ${tokenId}`,
                debug: {
                    searchedTokenId: tokenId,
                    tokenIdType: typeof tokenId
                }
            });
        }
        
        // Find and delete the note
        const deletedNote = await Note.findOneAndDelete({ tokenId: tokenId });
        console.log('Deleted note:', deletedNote);
        
        if (!deletedNote) {
            console.log(`Failed to delete note with tokenId: ${tokenId}`);
            return res.status(500).json({ 
                success: false, 
                message: `Failed to delete note with tokenId: ${tokenId}` 
            });
        }

        console.log(`Note deleted successfully: ${tokenId}`);
        res.json({ 
            success: true, 
            message: 'Note deleted successfully', 
            note: deletedNote 
        });
    } catch (error) {
        console.error('Error deleting note:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            tokenId: req.params.tokenId
        });
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting note', 
            error: error.message,
            debug: {
                errorType: error.name,
                errorMessage: error.message
            }
        });
    }
});

// Other routes
router.get('/notes', async (req, res) => {
    try {
        const notes = await Note.find().sort({ timestamp: -1 });
        console.log('All notes in database:', notes.map(note => ({
            tokenId: note.tokenId,
            title: note.title,
            author: note.author
        })));
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post('/notes', async (req, res) => {
    const note = new Note(req.body);
    try {
        const newNote = await note.save();
        res.status(201).json(newNote);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/notes/:tokenId', async (req, res) => {
    try {
        const note = await Note.findOne({ tokenId: req.params.tokenId });
        if (note) {
            res.json(note);
        } else {
            res.status(404).json({ message: 'Note not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/notes/:tokenId', async (req, res) => {
    try {
        const note = await Note.findOneAndUpdate(
            { tokenId: req.params.tokenId },
            req.body,
            { new: true }
        );
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }
        res.json(note);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Mount router
app.use('/api', router);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 