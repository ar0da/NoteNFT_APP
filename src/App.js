import React, { useState, useRef, useEffect } from 'react';
import { Container, Paper, Typography, Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Snackbar, Alert } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TokenIcon from '@mui/icons-material/Token';
import html2canvas from 'html2canvas';
import { connectWallet, mintNoteAsNFT } from './services/web3Service';

function App() {
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [isEditing, setIsEditing] = useState(false);
  const noteRefs = useRef({});
  const [walletAddress, setWalletAddress] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isNFTProcessing, setIsNFTProcessing] = useState(false);

  useEffect(() => {
    // LocalStorage'dan notları yükle
    const savedNotes = localStorage.getItem('notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  useEffect(() => {
    // Notları LocalStorage'a kaydet
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClickOpen = () => {
    setOpen(true);
    setIsEditing(false);
    setNewNote({ title: '', content: '' });
  };

  const handleClose = () => {
    setOpen(false);
    setNewNote({ title: '', content: '' });
    setIsEditing(false);
  };

  const handleDetailOpen = (note, event) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedNote(note);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedNote(null);
  };

  const handleAddNote = () => {
    if (newNote.title && newNote.content) {
      const now = Date.now();
      if (isEditing) {
        setNotes(notes.map(note => 
          note.id === newNote.id ? { 
            ...newNote, 
            updatedAt: now,
            lastEdited: true
          } : note
        ));
      } else {
        setNotes([...notes, { 
          id: now, 
          ...newNote, 
          createdAt: now,
          updatedAt: now,
          lastEdited: false
        }]);
      }
      handleClose();
    }
  };

  const handleEdit = (note, event) => {
    event.stopPropagation();
    setNewNote(note);
    setIsEditing(true);
    setOpen(true);
    handleDetailClose();
  };

  const handleDelete = (noteId, event) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this certificate?')) {
      setNotes(notes.filter(note => note.id !== noteId));
      if (selectedNote && selectedNote.id === noteId) {
        handleDetailClose();
      }
    }
  };

  const handleDownload = async (noteId) => {
    const noteElement = noteRefs.current[noteId];
    if (noteElement) {
      try {
        const canvas = await html2canvas(noteElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          height: noteElement.scrollHeight,
          windowHeight: noteElement.scrollHeight
        });
        
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `not-${noteId}.png`;
        link.click();
      } catch (error) {
        console.error('PNG dönüşümünde hata:', error);
      }
    }
  };

  const handleConnectWallet = async () => {
    const result = await connectWallet();
    if (result.success) {
      setWalletAddress(result.address);
      setSnackbar({
        open: true,
        message: 'Wallet connected successfully!',
        severity: 'success'
      });
    } else {
      setSnackbar({
        open: true,
        message: result.error,
        severity: 'error'
      });
    }
  };

  const handleMintNFT = async (note) => {
    if (!walletAddress) {
      setSnackbar({
        open: true,
        message: 'Please connect your wallet first!',
        severity: 'warning'
      });
      return;
    }

    setIsNFTProcessing(true);
    try {
      const noteElement = noteRefs.current[note.id];
      const canvas = await html2canvas(noteElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        height: noteElement.scrollHeight,
        windowHeight: noteElement.scrollHeight
      });
      
      const imageBase64 = canvas.toDataURL('image/png');
      const result = await mintNoteAsNFT(note, imageBase64);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: (
            <div>
              Certificate successfully minted as NFT!
              <br />
              <a 
                href={result.explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-300 hover:text-blue-400 underline"
              >
                View transaction →
              </a>
            </div>
          ),
          severity: 'success'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Failed to mint NFT: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsNFTProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-500 to-pink-500 p-4">
      <Container maxWidth="lg" className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <Typography variant="h2" className="text-white font-bold">
                My Certificates
              </Typography>
              {walletAddress && (
                <Typography variant="subtitle1" className="text-white/80">
                  Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </Typography>
              )}
            </div>
            <div className="flex gap-2">
              {!walletAddress && (
                <Button
                  variant="contained"
                  onClick={handleConnectWallet}
                  className="bg-white text-purple-500 hover:bg-gray-100"
                >
                  Connect Wallet
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleClickOpen}
                className="bg-white text-purple-500 hover:bg-gray-100"
              >
                Add Certificate
              </Button>
            </div>
          </div>
          
          {notes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Paper className="p-8 text-center bg-white/10 backdrop-blur-sm">
                <Typography variant="h6" className="text-white mb-4">
                  No certificates added yet
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleClickOpen}
                  className="bg-white text-purple-500 hover:bg-gray-100"
                >
                  Add First Certificate
                </Button>
              </Paper>
            </motion.div>
          ) : (
            <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {notes.map((note) => (
                  <motion.div
                    key={note.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="h-full cursor-pointer relative group"
                    onClick={() => handleDetailOpen(note)}
                  >
                    <Paper className="p-6 bg-white hover:shadow-xl transition-shadow h-full">
                      <Typography variant="h5" className="text-gray-800 font-bold mb-3">
                        {note.title}
                      </Typography>
                      <Typography 
                        variant="body1" 
                        className="text-gray-600 line-clamp-3 mb-4"
                      >
                        {note.content}
                      </Typography>
                      <div className="flex items-center text-gray-400 text-sm mt-auto">
                        <AccessTimeIcon fontSize="small" className="mr-1" />
                        <span>
                          {note.lastEdited ? 'Son Güncelleme: ' : 'Verilme Tarihi: '}
                          {formatDate(note.lastEdited ? note.updatedAt : note.createdAt)}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <IconButton
                          size="small"
                          onClick={(e) => handleEdit(note, e)}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => handleDelete(note.id, e)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </div>
                    </Paper>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Box>
          )}
        </motion.div>

        {/* Certificate Add/Edit Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            {isEditing ? 'Edit Certificate' : 'Add New Certificate'}
          </DialogTitle>
          <DialogContent className="mt-4">
            <TextField
              autoFocus
              margin="dense"
              label="Certificate Title"
              type="text"
              fullWidth
              variant="outlined"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              className="mb-4"
            />
            <TextField
              margin="dense"
              label="Certificate Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={8}
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            />
          </DialogContent>
          <DialogActions className="p-4">
            <Button onClick={handleClose} className="text-gray-500">
              Cancel
            </Button>
            <Button 
              onClick={handleAddNote} 
              variant="contained" 
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {isEditing ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Certificate Detail Dialog */}
        <Dialog 
          open={detailOpen} 
          onClose={handleDetailClose} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            style: {
              minHeight: '70vh',
              maxHeight: '90vh'
            }
          }}
        >
          {selectedNote && (
            <>
              <DialogTitle className="bg-gradient-to-r from-purple-500 to-pink-500 flex justify-between items-center">
                <div>
                  <Typography variant="h5" className="text-white font-bold">
                    {selectedNote.title}
                  </Typography>
                  <Typography variant="caption" className="text-white/80 flex items-center mt-1">
                    <AccessTimeIcon fontSize="small" className="mr-1" />
                    {selectedNote.lastEdited ? 'Last updated: ' : 'Issue date: '}
                    {formatDate(selectedNote.lastEdited ? selectedNote.updatedAt : selectedNote.createdAt)}
                  </Typography>
                </div>
                <div className="flex items-center gap-2">
                  <IconButton 
                    onClick={(e) => handleEdit(selectedNote, e)}
                    className="text-white hover:bg-white/20"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    onClick={(e) => handleDelete(selectedNote.id, e)}
                    className="text-white hover:bg-white/20"
                  >
                    <DeleteIcon />
                  </IconButton>
                  <IconButton onClick={handleDetailClose} className="text-white">
                    <CloseIcon />
                  </IconButton>
                </div>
              </DialogTitle>
              <DialogContent className="mt-4">
                <div ref={el => noteRefs.current[selectedNote.id] = el} className="p-6 bg-white rounded-lg">
                  <Typography 
                    variant="h4" 
                    className="text-gray-800 font-bold mb-4 text-center"
                  >
                    {selectedNote.title}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    className="text-gray-600 whitespace-pre-wrap break-words text-lg"
                    style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}
                  >
                    {selectedNote.content}
                  </Typography>
                </div>
              </DialogContent>
              <DialogActions className="p-4 flex gap-2">
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(selectedNote.id)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 flex-1"
                >
                  Download as PNG
                </Button>
                <Button
                  variant="contained"
                  startIcon={<TokenIcon />}
                  onClick={() => handleMintNFT(selectedNote)}
                  disabled={isNFTProcessing}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 flex-1"
                >
                  {isNFTProcessing ? 'Processing...' : 'Mint as NFT'}
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Snackbar bildirimleri */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </div>
  );
}

export default App;
