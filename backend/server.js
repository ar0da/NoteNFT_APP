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
// Tüm notları getir
app.get('/api/notes', async (req, res) => {
    try {
        const notes = await Note.find().sort({ timestamp: -1 });
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Yeni not oluştur
app.post('/api/notes', async (req, res) => {
    const note = new Note(req.body);
    try {
        const newNote = await note.save();
        res.status(201).json(newNote);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Belirli bir notu getir
app.get('/api/notes/:tokenId', async (req, res) => {
    try {
        const note = await Note.findOne({ tokenId: req.params.tokenId });
        if (note) {
            res.json(note);
        } else {
            res.status(404).json({ message: 'Not bulunamadı' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Notu güncelle
app.put('/api/notes/:tokenId', async (req, res) => {
    try {
        const note = await Note.findOneAndUpdate(
            { tokenId: req.params.tokenId },
            req.body,
            { new: true }
        );
        res.json(note);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
}); 