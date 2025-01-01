import React, { useState, useRef, useEffect } from 'react';
import { Container, Paper, Typography, Box, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Snackbar, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TokenIcon from '@mui/icons-material/Token';
import SchoolIcon from '@mui/icons-material/School';
import LockIcon from '@mui/icons-material/Lock';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import html2canvas from 'html2canvas';
import Web3 from 'web3';
import { connectWallet, createNote, mintNote, hasNoteAccess, getNoteDetails, getContract } from './services/web3Service';
import { uploadToPinata } from './services/pinataService';
import { noteService } from './services/noteService';

function App() {
  const [notes, setNotes] = useState([]);
  const [noteContents, setNoteContents] = useState({});
  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [newNote, setNewNote] = useState({ 
    title: '', 
    content: '', 
    course: '', 
    topic: '',
    price: '0.01',
    maxSupply: '10',
    isLocked: false 
  });
  const [isEditing, setIsEditing] = useState(false);
  const noteRefs = useRef({});
  const [walletAddress, setWalletAddress] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isNFTProcessing, setIsNFTProcessing] = useState(false);
  const [noteAccess, setNoteAccess] = useState({});
  const [contract, setContract] = useState(null);

  const courses = [
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'History',
    'Geography',
    'Literature',
    'English',
    'Other'
  ];

  useEffect(() => {
    const initContract = async () => {
      try {
        const contractInstance = await getContract();
        setContract(contractInstance);
      } catch (error) {
        console.error('Contract yüklenirken hata:', error);
      }
    };
    initContract();
  }, []);

  const loadNotesAndCheckAccess = async () => {
    try {
      // Backend'den tüm notları çek
      const allNotes = await noteService.getAllNotes();
      
      if (!Array.isArray(allNotes)) {
        console.error('Backend\'den geçersiz not verisi alındı');
        setNotes([]);
        setNoteAccess({});
        return;
      }

      setNotes(allNotes);

      // Cüzdan bağlıysa erişim kontrollerini yap
      if (walletAddress && contract) {
        const accessMap = {};
        for (const note of allNotes) {
          if (note.tokenId) {
            try {
              // NFT sahipliğini kontrol et
              const balance = await contract.methods.balanceOf(walletAddress, note.tokenId).call();
              console.log('NFT sahipliği:', balance);
              // String olarak karşılaştır
              const hasToken = balance && balance !== '0';
              
              // Not yaratıcısını kontrol et
              const isCreator = note.author?.toLowerCase() === walletAddress?.toLowerCase();
              
              accessMap[note.tokenId] = hasToken || isCreator;
              console.log(`Not ${note.tokenId} erişim durumu:`, { hasToken, isCreator, finalAccess: accessMap[note.tokenId] });
            } catch (error) {
              console.error(`Not erişim kontrolü hatası ${note.tokenId}:`, error);
              accessMap[note.tokenId] = note.author?.toLowerCase() === walletAddress?.toLowerCase();
            }
          }
        }
        console.log('Güncel erişim haritası:', accessMap);
        setNoteAccess(accessMap);
      } else {
        // Cüzdan bağlı değilse tüm erişimleri sıfırla
        setNoteAccess({});
      }
    } catch (error) {
      console.error('Notlar yüklenirken hata:', error);
      setSnackbar({
        open: true,
        message: 'Notlar yüklenirken bir hata oluştu',
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    if (walletAddress || contract) {
      loadNotesAndCheckAccess();
    }
  }, [walletAddress, contract]); // contract değiştiğinde de çalışsın

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleClickOpen = () => {
    if (!walletAddress) {
      setSnackbar({
        open: true,
        message: 'Not oluşturmak için önce cüzdanınızı bağlamanız gerekiyor',
        severity: 'warning'
      });
      return;
    }
    setOpen(true);
    setIsEditing(false);
    setNewNote({ 
      title: '', 
      content: '', 
      course: '', 
      topic: '',
      price: '0.01',
      maxSupply: '10',
      isLocked: true 
    });
  };

  const handleClose = () => {
    setOpen(false);
    setNewNote({ 
      title: '', 
      content: '', 
      course: '', 
      topic: '',
      price: '0.01',
      maxSupply: '10',
      isLocked: false 
    });
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

  const handleAddNote = async () => {
    if (!walletAddress) {
      setSnackbar({
        open: true,
        message: 'Not oluşturmak için önce cüzdanınızı bağlamanız gerekiyor',
        severity: 'warning'
      });
      return;
    }

    if (!newNote.title || !newNote.content || !newNote.course || !newNote.topic || !newNote.price || !newNote.maxSupply) {
      setSnackbar({
        open: true,
        message: 'Lütfen tüm alanları doldurun',
        severity: 'warning'
      });
      return;
    }

    try {
      setIsNFTProcessing(true);
      
      // Not içeriğini hazırla
      const noteContent = {
        title: newNote.title,
        content: newNote.content,
        course: newNote.course,
        topic: newNote.topic,
        timestamp: new Date().toISOString(),
        author: walletAddress,
        price: newNote.price,
        maxSupply: newNote.maxSupply
      };

      // IPFS'e yükle ve NFT oluştur
      const web3Instance = new Web3(window.ethereum);
      const contentHash = web3Instance.utils.sha3(JSON.stringify(noteContent));
      const tokenURI = await uploadToPinata(noteContent);

      // Wei'ye çevir
      const maxSupplyInWei = Number(newNote.maxSupply).toString();
      const priceInWei = web3Instance.utils.toWei(newNote.price, 'ether');
      
      const result = await createNote(
        tokenURI, 
        contentHash, 
        maxSupplyInWei,
        priceInWei,
        walletAddress
      );

      if (!result || !result.events || !result.events.NoteCreated) {
        throw new Error('Not oluşturma işlemi başarısız oldu');
      }

      const tokenId = result.events.NoteCreated.returnValues.tokenId;

      // Backend'e kaydet
      const newNoteObj = {
        tokenId,
        ...noteContent,
        contentHash: contentHash,
        priceInWei: priceInWei,
        maxSupplyInWei: maxSupplyInWei,
        tokenURI: tokenURI
      };

      await noteService.createNote(newNoteObj);

      // Tüm notları yeniden yükle
      const updatedNotes = await noteService.getAllNotes();
      setNotes(updatedNotes);

      setOpen(false);
      setNewNote({ 
        title: '', 
        content: '', 
        course: '', 
        topic: '',
        price: '0.01',
        maxSupply: '10',
        isLocked: true 
      });

      setSnackbar({
        open: true,
        message: 'Not başarıyla oluşturuldu!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Not oluşturma hatası:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Not oluşturulurken bir hata oluştu',
        severity: 'error'
      });
    } finally {
      setIsNFTProcessing(false);
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
    try {
      const result = await connectWallet();
      if (result.success) {
        setWalletAddress(result.address);
        // Cüzdan bağlandıktan sonra notları ve erişim haklarını yeniden yükle
        await loadNotesAndCheckAccess();
        setSnackbar({
          open: true,
          message: 'Cüzdan başarıyla bağlandı!',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Cüzdan bağlanamadı',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Cüzdan bağlantı hatası:', error);
      setSnackbar({
        open: true,
        message: 'Cüzdan bağlanırken bir hata oluştu: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleEditNote = (note) => {
    setNewNote(note);
    setIsEditing(true);
    setOpen(true);
  };

  const handleMintNFT = async (note) => {
    if (!walletAddress) {
      setSnackbar({
        open: true,
        message: 'Lütfen önce cüzdanınızı bağlayın',
        severity: 'warning'
      });
      return;
    }

    if (!note.tokenId) {
      setSnackbar({
        open: true,
        message: 'Not ID bulunamadı',
        severity: 'error'
      });
      return;
    }

    try {
      setIsNFTProcessing(true);
      
      await mintNote(note.tokenId, walletAddress);
      
      // Not erişimini güncelle
      setNoteAccess(prev => ({
        ...prev,
        [note.tokenId]: true
      }));

      setSnackbar({
        open: true,
        message: 'NFT başarıyla mint edildi!',
        severity: 'success'
      });
    } catch (error) {
      console.error('NFT mint hatası:', error);
      setSnackbar({
        open: true,
        message: 'NFT mint edilirken bir hata oluştu: ' + error.message,
        severity: 'error'
      });
    } finally {
      setIsNFTProcessing(false);
    }
  };

  const handleDisconnectWallet = () => {
    setWalletAddress(null);
    setNoteAccess({});
    setSnackbar({
      open: true,
      message: 'Cüzdan bağlantısı kesildi',
      severity: 'info'
    });
  };

  const renderNoteContent = (note) => {
    if (!noteAccess[note.tokenId]) {
      return (
        <Box sx={{ textAlign: 'center', p: 2 }}>
          <LockIcon sx={{ fontSize: 40, color: 'grey.500', mb: 1 }} />
          <Typography variant="body1" color="text.secondary">
            Bu içeriği görüntülemek için NFT'yi mint etmeniz gerekiyor
          </Typography>
          <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
            Fiyat: {note.price} EDU
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<TokenIcon />}
            onClick={() => handleMintNFT(note)}
            sx={{ mt: 2 }}
          >
            NFT'Yİ MINT ET
          </Button>
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="body1">{note.content}</Typography>
      </Box>
    );
  };

  const NoteCard = ({ note }) => {
    const hasAccess = noteAccess[note.tokenId] || note.author === walletAddress;
    const isAuthor = note.author === walletAddress;

    const handleNoteClick = (event) => {
        if (!hasAccess) {
            event.preventDefault();
            event.stopPropagation();
            setSnackbar({
                open: true,
                message: 'Bu notu görüntülemek için NFT\'yi mint etmeniz gerekiyor',
                severity: 'warning'
            });
            return;
        }
        handleDetailOpen(note);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
        >
            <Paper
                ref={el => noteRefs.current[note.tokenId] = el}
                elevation={3}
                className="p-4 mb-4 relative cursor-pointer"
                onClick={handleNoteClick}
                sx={{
                    backgroundColor: '#ffffff',
                    position: 'relative',
                    '&:hover': {
                        boxShadow: 6
                    }
                }}
            >
                <Box className="flex justify-between items-start mb-2">
                    <Typography variant="h6" component="h2" className="font-bold">
                        {note.title || 'Başlıksız Not'}
                    </Typography>
                    <Box className="flex items-center space-x-2">
                        {!hasAccess && (
                            <IconButton
                                color="primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMintNFT(note);
                                }}
                                disabled={isNFTProcessing}
                            >
                                <LockIcon />
                            </IconButton>
                        )}
                        {isAuthor && (
                            <IconButton
                                color="primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditNote(note);
                                }}
                            >
                                <EditIcon />
                            </IconButton>
                        )}
                    </Box>
                </Box>

                <Box className="flex items-center space-x-2 mb-2 text-gray-600">
                    <SchoolIcon fontSize="small" />
                    <Typography variant="body2">{note.course || 'Genel'}</Typography>
                    <Typography variant="body2">•</Typography>
                    <Typography variant="body2">{note.topic || 'Konu Belirtilmemiş'}</Typography>
                </Box>

                {hasAccess ? (
                    <Typography 
                        variant="body1" 
                        className="mb-4 whitespace-pre-wrap overflow-hidden"
                        sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxHeight: '4.5em',
                            lineHeight: '1.5em'
                        }}
                    >
                        {note.content}
                    </Typography>
                ) : (
                    <Box className="text-center py-4 bg-gray-50 rounded-lg">
                        <LockIcon sx={{ fontSize: 40, color: 'gray' }} />
                        <Typography variant="body1" className="mt-2">
                            Bu içeriği görüntülemek için NFT'yi mint etmeniz gerekiyor
                        </Typography>
                        <Typography variant="body2" color="primary" className="mt-1">
                            Fiyat: {Web3.utils.fromWei(note.priceInWei || '0', 'ether')} EDU
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<MonetizationOnIcon />}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleMintNFT(note);
                            }}
                            disabled={isNFTProcessing}
                            className="mt-3"
                        >
                            NFT'yi Mint Et
                        </Button>
                    </Box>
                )}

                <Box className="flex justify-between items-center text-gray-500 text-sm mt-4">
                    <Box className="flex items-center space-x-1">
                        <AccessTimeIcon fontSize="small" />
                        <Typography variant="caption">
                            {note.timestamp ? formatDate(note.timestamp) : 'Tarih belirtilmemiş'}
                        </Typography>
                    </Box>
                    <Box className="flex items-center space-x-1">
                        <TokenIcon fontSize="small" />
                        <Typography variant="caption">
                            NFT ID: {note.tokenId || 'ID bulunamadı'}
                        </Typography>
                    </Box>
                </Box>
            </Paper>
        </motion.div>
    );
  };

  const renderDialogContent = (note) => {
    const hasAccess = noteAccess[note.tokenId] || note.author === walletAddress;

    if (!hasAccess) {
        return (
            <Box className="text-center py-8">
                <LockIcon sx={{ fontSize: 60, color: 'gray', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                    Bu içeriği görüntülemek için NFT'yi mint etmeniz gerekiyor
                </Typography>
                <Typography variant="body1" color="textSecondary" gutterBottom>
                    Fiyat: {Web3.utils.fromWei(note.priceInWei || '0', 'ether')} EDU
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<MonetizationOnIcon />}
                    onClick={() => handleMintNFT(note)}
                    disabled={isNFTProcessing}
                    sx={{ mt: 2 }}
                >
                    NFT'yi Mint Et
                </Button>
            </Box>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg">
            <Typography 
                variant="body1" 
                className="text-gray-600 whitespace-pre-wrap break-words text-lg"
                sx={{
                    maxHeight: '60vh',
                    overflowY: 'auto',
                    overflowWrap: 'break-word',
                    wordWrap: 'break-word',
                    '&::-webkit-scrollbar': {
                        width: '8px'
                    },
                    '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '4px'
                    },
                    '&::-webkit-scrollbar-thumb': {
                        background: '#888',
                        borderRadius: '4px',
                        '&:hover': {
                            background: '#555'
                        }
                    }
                }}
            >
                {note.content}
            </Typography>
        </div>
    );
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
              <Typography variant="h2" className="text-white font-bold" sx={{ display: 'flex', alignItems: 'center' }}>
                <SchoolIcon sx={{ mr: 2, fontSize: 40 }} />
                My Study Notes
              </Typography>
              {walletAddress && (
                <Typography variant="subtitle1" className="text-white/80">
                  Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </Typography>
              )}
            </div>
            <div className="flex gap-2">
              {!walletAddress ? (
                <Button
                  variant="contained"
                  onClick={handleConnectWallet}
                  className="bg-white text-purple-500 hover:bg-gray-100"
                >
                  Connect Wallet
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="contained"
                    onClick={handleDisconnectWallet}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    Disconnect Wallet
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleClickOpen}
                    className="bg-white text-purple-500 hover:bg-gray-100"
                  >
                    Add New Note
                  </Button>
                </div>
              )}
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
                  No notes added yet
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleClickOpen}
                  className="bg-white text-purple-500 hover:bg-gray-100"
                >
                  Add First Note
                </Button>
              </Paper>
            </motion.div>
          ) : (
            <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {notes.map((note) => (
                  <NoteCard key={note.tokenId} note={note} />
                ))}
              </AnimatePresence>
            </Box>
          )}
        </motion.div>

        {/* Note Add/Edit Dialog */}
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            {isEditing ? 'Edit Note' : 'Add New Note'}
          </DialogTitle>
          <DialogContent className="mt-4">
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Subject</InputLabel>
              <Select
                value={newNote.course}
                label="Subject"
                onChange={(e) => setNewNote({ ...newNote, course: e.target.value })}
              >
                {courses.map((course) => (
                  <MenuItem key={course} value={course}>{course}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              autoFocus
              margin="dense"
              label="Title"
              type="text"
              fullWidth
              variant="outlined"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
              className="mb-4"
            />
            <TextField
              margin="dense"
              label="Topic"
              type="text"
              fullWidth
              variant="outlined"
              value={newNote.topic}
              onChange={(e) => setNewNote({ ...newNote, topic: e.target.value })}
              className="mb-4"
            />
            <TextField
              margin="dense"
              label="Note Content"
              multiline
              rows={8}
              fullWidth
              variant="outlined"
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              className="mb-4"
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                margin="dense"
                label="Price (EDU)"
                type="number"
                fullWidth
                variant="outlined"
                value={newNote.price}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value >= 0) {
                    setNewNote({ ...newNote, price: value });
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <MonetizationOnIcon color="primary" />
                    </Box>
                  ),
                  inputProps: { 
                    min: "0",
                    step: "0.000000000000000001"
                  }
                }}
              />
              <TextField
                margin="dense"
                label="Maximum Supply"
                type="number"
                fullWidth
                variant="outlined"
                value={newNote.maxSupply}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 1) {
                    setNewNote({ ...newNote, maxSupply: value.toString() });
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                      <TokenIcon color="primary" />
                    </Box>
                  ),
                  inputProps: { 
                    min: "1",
                    step: "1"
                  }
                }}
              />
            </Box>
          </DialogContent>
          <DialogActions className="p-4">
            <Button onClick={handleClose} className="text-gray-500">
              Cancel
            </Button>
            <Button 
              onClick={handleAddNote} 
              variant="contained" 
              className="bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={isNFTProcessing}
            >
              {isNFTProcessing ? 'Processing...' : (isEditing ? 'Update' : 'Add')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Note Detail Dialog */}
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
                  <Typography variant="subtitle1" className="text-white/80">
                    {selectedNote.course} - {selectedNote.topic}
                  </Typography>
                  <Typography variant="caption" className="text-white/80 flex items-center mt-1">
                    <AccessTimeIcon fontSize="small" className="mr-1" />
                    Created: {formatDate(selectedNote.createdAt)}
                    {selectedNote.lastEdited && ` (Last Edit: ${formatDate(selectedNote.updatedAt)})`}
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
                  <IconButton onClick={handleDetailClose} className="text-white hover:bg-white/20">
                    <CloseIcon />
                  </IconButton>
                </div>
              </DialogTitle>
              <DialogContent className="mt-4">
                {renderDialogContent(selectedNote)}
              </DialogContent>
              <DialogActions className="p-4 flex gap-2">
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(selectedNote.id)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 flex-1"
                >
                  Download as PDF
                </Button>
                <Button
                  variant="contained"
                  startIcon={<TokenIcon />}
                  onClick={() => {
                    if (!walletAddress) {
                      setSnackbar({
                        open: true,
                        message: 'Please connect your wallet first!',
                        severity: 'warning'
                      });
                      return;
                    }
                    handleMintNFT(selectedNote);
                  }}
                  disabled={isNFTProcessing}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 flex-1"
                >
                  {isNFTProcessing ? 'Processing...' : 'Save as NFT'}
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Snackbar notifications */}
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
