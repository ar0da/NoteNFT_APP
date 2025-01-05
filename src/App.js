import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { connectWallet, createNote, mintNote, hasNoteAccess, getNoteDetails, getContract, toggleNoteActive } from './services/web3Service';
import { uploadToPinata } from './services/pinataService';
import { noteService } from './services/noteService';
import DialogForm from './components/DialogForm';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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
        console.log('Contract successfully initialized:', contractInstance?.options?.address);
        setContract(contractInstance);
      } catch (error) {
        console.error('Error loading contract:', error);
        setSnackbar({
          open: true,
          message: 'Contract connection failed',
          severity: 'error'
        });
      }
    };
    initContract();
  }, []);

  const loadNotesAndCheckAccess = async () => {
    try {
        // Get all notes from backend
        const allNotes = await noteService.getAllNotes();
        
        if (!Array.isArray(allNotes)) {
            console.error('Invalid note data received from backend');
            setNotes([]);
            setNoteAccess({});
            return;
        }

        setNotes(allNotes);

        // Check access if wallet is connected
        if (walletAddress && contract) {
            const accessMap = {};
            for (const note of allNotes) {
                if (note.tokenId) {
                    try {
                        // Use hasNoteAccess function from smart contract
                        const hasAccess = await contract.methods.hasNoteAccess(note.tokenId, walletAddress).call();
                        accessMap[note.tokenId] = hasAccess;
                        console.log(`Note ${note.tokenId} access status:`, { hasAccess });
                    } catch (error) {
                        console.error(`Note access check error ${note.tokenId}:`, error);
                        accessMap[note.tokenId] = false;
                    }
                }
            }
            console.log('Updated access map:', accessMap);
            setNoteAccess(accessMap);
        } else {
            // Reset all access if wallet is not connected
            setNoteAccess({});
        }
    } catch (error) {
        console.error('Error loading notes:', error);
        setSnackbar({
            open: true,
            message: 'An error occurred while loading notes',
            severity: 'error'
        });
    }
  };

  useEffect(() => {
    if (walletAddress || contract) {
      console.log('Notes loading...', { walletAddress, contractAddress: contract?.options?.address });
      loadNotesAndCheckAccess();
    }
  }, [walletAddress, contract]);

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
        message: 'Please connect your wallet to create a note',
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
            message: 'Please connect your wallet to create a note',
            severity: 'warning'
        });
        return;
    }

    if (!newNote.title || !newNote.content || !newNote.course || !newNote.topic || !newNote.price || !newNote.maxSupply) {
        setSnackbar({
            open: true,
            message: 'Please fill in all fields',
            severity: 'warning'
        });
        return;
    }

    try {
        setIsNFTProcessing(true);
        
        // Prepare note content
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

        // Upload to IPFS and create NFT
        const web3Instance = new Web3(window.ethereum);
        const contentHash = web3Instance.utils.sha3(JSON.stringify(noteContent));
        const tokenURI = await uploadToPinata(noteContent);

        // Convert to Wei
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
            throw new Error('Note creation failed');
        }

        const tokenId = result.events.NoteCreated.returnValues.tokenId;

        // Save to backend
        const newNoteObj = {
            tokenId,
            ...noteContent,
            contentHash: contentHash,
            priceInWei: priceInWei,
            maxSupplyInWei: maxSupplyInWei,
            tokenURI: tokenURI
        };

        await noteService.createNote(newNoteObj);

        // Reload all notes
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
            message: 'Note created successfully!',
            severity: 'success'
        });
    } catch (error) {
        console.error('Note creation error:', error);
        setSnackbar({
            open: true,
            message: error.message || 'An error occurred while creating the note',
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

  const handleDelete = async (note, event) => {
    event.stopPropagation();
    
    if (!walletAddress || note.author !== walletAddress) {
        setSnackbar({
            open: true,
            message: 'Only the author can delete this note',
            severity: 'error'
        });
        return;
    }

    if (!note.tokenId) {
        setSnackbar({
            open: true,
            message: 'Invalid note: TokenId is missing',
            severity: 'error'
        });
        return;
    }

    console.log('Note to be deleted:', {
        note,
        tokenId: note.tokenId,
        tokenIdType: typeof note.tokenId
    });

    if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
        return;
    }

    try {
        setIsNFTProcessing(true);

        // First deactivate the note on blockchain
        console.log('Deactivating note on blockchain...', note.tokenId);
        await toggleNoteActive(note.tokenId, walletAddress);

        // Then delete from database
        console.log('Deleting note from database...', note.tokenId);
        const result = await noteService.deleteNote(note.tokenId);
        console.log('Delete result:', result);
        
        // Update UI
        const updatedNotes = notes.filter(n => n.tokenId !== note.tokenId);
        setNotes(updatedNotes);

        // Close detail dialog if the deleted note was selected
        if (selectedNote && selectedNote.tokenId === note.tokenId) {
            setDetailOpen(false);
            setSelectedNote(null);
        }

        setSnackbar({
            open: true,
            message: 'Note deleted and deactivated successfully',
            severity: 'success'
        });
    } catch (error) {
        console.error('Error deleting note:', error);
        let errorMessage = 'Failed to delete note. ';
        
        if (error.response) {
            errorMessage += error.response.data.message || 'Please try again.';
        } else if (error.request) {
            errorMessage += 'Server is not responding. Please try again later.';
        } else {
            errorMessage += error.message || 'Please try again.';
        }

        setSnackbar({
            open: true,
            message: errorMessage,
            severity: 'error'
        });
    } finally {
        setIsNFTProcessing(false);
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
        console.error('PNG conversion error:', error);
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
          message: 'Wallet connected successfully!',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: result.error || 'Wallet connection failed',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setSnackbar({
        open: true,
        message: 'An error occurred while connecting wallet: ' + error.message,
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
            message: 'Please connect your wallet first',
            severity: 'warning'
        });
        return;
    }

    if (!note.tokenId) {
        setSnackbar({
            open: true,
            message: 'Note ID not found',
            severity: 'error'
        });
        return;
    }

    try {
        setIsNFTProcessing(true);
        
        await mintNote(note.tokenId, walletAddress);
        
        // Update note access
        setNoteAccess(prev => ({
            ...prev,
            [note.tokenId]: true
        }));

        setSnackbar({
            open: true,
            message: 'NFT minted successfully!',
            severity: 'success'
        });
    } catch (error) {
        console.error('NFT mint error:', error);
        setSnackbar({
            open: true,
            message: 'An error occurred while minting NFT: ' + error.message,
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
        message: 'Wallet disconnected',
        severity: 'info'
    });
  };

  const NoteCard = React.memo(({ note }) => {
    const hasAccess = useMemo(() => noteAccess[note.tokenId] || note.author === walletAddress, [note.tokenId, note.author, walletAddress, noteAccess]);
    const isAuthor = useMemo(() => note.author === walletAddress, [note.author, walletAddress]);
    const [mintInfo, setMintInfo] = useState({ currentSupply: 0, maxSupply: 0 });

    const courseColor = useMemo(() => {
      const colors = {
        'Mathematics': 'from-blue-400 to-blue-600',
        'Physics': 'from-purple-400 to-purple-600',
        'Chemistry': 'from-green-400 to-green-600',
        'Biology': 'from-yellow-400 to-yellow-600',
        'History': 'from-red-400 to-red-600',
        'Geography': 'from-indigo-400 to-indigo-600',
        'Literature': 'from-pink-400 to-pink-600',
        'English': 'from-teal-400 to-teal-600',
        'Other': 'from-gray-400 to-gray-600'
      };
      return colors[note.course] || 'from-blue-400 to-blue-600';
    }, [note.course]);

    const handleMintClick = useCallback((e) => {
      e.stopPropagation();
      handleMintNFT(note);
    }, [note]);

    const handleEditClick = useCallback((e) => {
      e.stopPropagation();
      handleEdit(note, e);
    }, [note]);

    const handleCardClick = useCallback((event) => {
      if (!hasAccess) {
        event.preventDefault();
        event.stopPropagation();
        setSnackbar({
          open: true,
          message: 'You need to mint the NFT to view this note',
          severity: 'warning'
        });
        return;
      }
      handleDetailOpen(note);
    }, [hasAccess, note]);

    useEffect(() => {
      let isMounted = true;
      const getMintInfo = async () => {
        if (!note?.tokenId || !contract) return;
        try {
          const details = await contract.methods.getNoteDetails(note.tokenId).call();
          if (isMounted) {
            setMintInfo({
              currentSupply: Number(details.currentSupply),
              maxSupply: Number(details.maxSupply)
            });
          }
        } catch (error) {
          console.error('Mint information not available:', error);
        }
      };
      getMintInfo();
      return () => {
        isMounted = false;
      };
    }, [note?.tokenId, contract]);

    const cardContent = useMemo(() => (
      <Paper
        ref={el => noteRefs.current[note.tokenId] = el}
        elevation={3}
        onClick={handleCardClick}
        className="relative h-full overflow-hidden group cursor-pointer transition-all duration-300 hover:shadow-xl"
        sx={{
          borderRadius: '24px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        }}
      >
        <Box className={`h-32 bg-gradient-to-r ${courseColor} p-6 transition-all duration-300 group-hover:h-36`}>
          <Box className="flex justify-between">
            <SchoolIcon className="text-white/80 text-3xl" />
            <Box className="flex gap-2">
              {!hasAccess && (
                <IconButton
                  size="small"
                  onClick={handleMintClick}
                  disabled={isNFTProcessing}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  <TokenIcon />
                </IconButton>
              )}
              {isAuthor && (
                <>
                  <IconButton
                    size="small"
                    onClick={handleEditClick}
                    className="bg-white/20 hover:bg-white/30 text-white"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => handleDelete(note, e)}
                    className="bg-red-400/20 hover:bg-red-400/30 text-white"
                  >
                    <DeleteIcon />
                  </IconButton>
                </>
              )}
            </Box>
          </Box>
          <Typography variant="h6" className="text-white font-bold mt-4 line-clamp-1">
            {note.title || 'Untitled Note'}
          </Typography>
        </Box>

        <Box className="p-6">
          <Box className="flex items-center gap-2 mb-4">
            <Typography variant="body2" className="text-gray-600 font-medium">
              {note.course || 'General'}
            </Typography>
            <Box className="w-1 h-1 bg-gray-400 rounded-full" />
            <Typography variant="body2" className="text-gray-600">
              {note.topic || 'Topic Not Specified'}
            </Typography>
          </Box>

          {hasAccess ? (
            <Typography 
              variant="body2" 
              className="text-gray-700 mb-4 line-clamp-3"
            >
              {note.content}
            </Typography>
          ) : (
            <Box className="text-center py-6 bg-gray-50 rounded-xl">
              <LockIcon className="text-gray-400 mb-2 text-3xl" />
              <Typography variant="body2" className="text-gray-600 mb-2">
                You need to mint the NFT to view this content
              </Typography>
              <Box className="flex items-center justify-center gap-2 text-blue-600 font-medium mb-4">
                <MonetizationOnIcon fontSize="small" />
                <Typography variant="body2">
                  {Web3.utils.fromWei(note.priceInWei || '0', 'ether')} EDU
                </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={handleMintClick}
                disabled={isNFTProcessing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                startIcon={<TokenIcon />}
              >
                Mint NFT
              </Button>
            </Box>
          )}

          <Box className="flex items-center justify-between mt-4 text-gray-500 text-sm">
            <Box className="flex items-center gap-2">
              <AccessTimeIcon fontSize="small" />
              <Typography variant="caption">
                {note.timestamp ? formatDate(note.timestamp) : 'Date Not Specified'}
              </Typography>
            </Box>
            <Box className="flex items-center gap-2">
              <Box className="flex items-center gap-1">
                <TokenIcon fontSize="small" className="text-blue-500" />
                <Typography variant="caption" className="font-medium">
                  {mintInfo.currentSupply}/{mintInfo.maxSupply}
                </Typography>
              </Box>
              {mintInfo.currentSupply >= mintInfo.maxSupply && (
                <Box className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                  Sold Out
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Paper>
    ), [note, hasAccess, isAuthor, mintInfo, courseColor, handleCardClick, handleMintClick, handleEditClick, isNFTProcessing]);

    return (
      <motion.div
        layout="position"
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="h-full"
      >
        {cardContent}
      </motion.div>
    );
  }, (prevProps, nextProps) => {
    return prevProps.note.tokenId === nextProps.note.tokenId &&
           prevProps.note.content === nextProps.note.content &&
           prevProps.note.title === nextProps.note.title &&
           prevProps.note.author === nextProps.note.author &&
           prevProps.note.course === nextProps.note.course &&
           prevProps.note.topic === nextProps.note.topic;
  });

  const NoteDialogContent = ({ note }) => {
    const [mintInfo, setMintInfo] = useState({ currentSupply: 0, maxSupply: 0 });
    
    useEffect(() => {
        const getMintInfo = async () => {
            if (!note?.tokenId || !contract) {
                console.log('Contract or tokenId missing:', { contract, tokenId: note?.tokenId });
                return;
            }

            try {
                const details = await contract.methods.getNoteDetails(note.tokenId).call();
                setMintInfo({
                    currentSupply: Number(details.currentSupply),
                    maxSupply: Number(details.maxSupply)
                });
            } catch (error) {
                console.error('Dialog mint information not available:', error);
            }
        };

        getMintInfo();
    }, [note?.tokenId, contract]);

    if (!note) return null;

    const hasAccess = noteAccess[note.tokenId] || note.author === walletAddress;

    if (!hasAccess) {
        return (
            <Box className="text-center py-8">
                <LockIcon sx={{ fontSize: 60, color: 'gray', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                    You need to mint the NFT to view this content
                </Typography>
                <Typography variant="body1" color="textSecondary" gutterBottom>
                    Price: {Web3.utils.fromWei(note.priceInWei || '0', 'ether')} EDU
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                    Mint Status: {mintInfo.currentSupply}/{mintInfo.maxSupply}
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<MonetizationOnIcon />}
                    onClick={() => handleMintNFT(note)}
                    disabled={isNFTProcessing || mintInfo.currentSupply >= mintInfo.maxSupply}
                    sx={{ mt: 2 }}
                >
                    {mintInfo.currentSupply >= mintInfo.maxSupply ? 'Sold Out' : 'Mint NFT'}
                </Button>
            </Box>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg">
            <Box className="flex justify-between items-center mb-4">
                <Typography variant="body2" color="textSecondary">
                    Mint Status: {mintInfo.currentSupply}/{mintInfo.maxSupply}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    NFT ID: {note.tokenId}
                </Typography>
            </Box>
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

  const renderDialogContent = (note) => {
    if (!note) return null;
    return <NoteDialogContent note={note} />;
  };

  const handleNoteChange = useCallback((updatedNote) => {
    setNewNote(updatedNote);
  }, []);

  const memoizedCourses = useMemo(() => courses, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-400 to-indigo-600 p-4">
      <Container maxWidth="lg" className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-blue-800 to-indigo-900 p-6 rounded-2xl backdrop-blur-md shadow-xl border border-blue-700/30">
            <div>
              <Typography variant="h2" className="text-white font-bold flex items-center gap-4">
                <SchoolIcon sx={{ fontSize: 48 }} className="text-blue-300" />
                <span className="bg-gradient-to-r from-blue-200 via-blue-300 to-blue-100 text-transparent bg-clip-text">
                  EduNotes
                </span>
              </Typography>
              {walletAddress && (
                <Typography variant="subtitle1" className="text-blue-200/90 mt-2 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </Typography>
              )}
            </div>
            <div className="flex gap-3">
              {!walletAddress ? (
                <Button
                  variant="contained"
                  onClick={handleConnectWallet}
                  className="bg-blue-600/20 hover:bg-blue-600/30 backdrop-blur-md text-blue-100 px-6 py-2 rounded-xl transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-900/20"
                  startIcon={<TokenIcon />}
                >
                  Connect Wallet
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="contained"
                    onClick={handleDisconnectWallet}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-200 px-6 py-2 rounded-xl transition-all duration-300 border border-red-500/30 hover:border-red-400/50"
                  >
                    Disconnect
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleClickOpen}
                    className="bg-blue-600/20 hover:bg-blue-600/30 backdrop-blur-md text-blue-100 px-6 py-2 rounded-xl transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-900/20"
                  >
                    Create Note
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
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <SchoolIcon sx={{ fontSize: 80 }} className="text-white/80 mb-4" />
                <Typography variant="h4" className="text-white mb-4 font-light">
                  Start Your Learning Journey
                </Typography>
                <Typography variant="body1" className="text-white/80 mb-6 max-w-lg">
                  Create your first educational note and share your knowledge with others!
                </Typography>
                {walletAddress ? (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleClickOpen}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-8 py-3 rounded-full transition-all duration-300 border border-white/30 hover:shadow-lg hover:shadow-white/10"
                  >
                    Create Your First Note
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<TokenIcon />}
                    onClick={handleConnectWallet}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-8 py-3 rounded-full transition-all duration-300 border border-white/30 hover:shadow-lg hover:shadow-white/10"
                  >
                    Connect Wallet to Start
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="wait" initial={false}>
                {notes.map((note) => (
                  <NoteCard key={note.tokenId || note._id} note={note} />
                ))}
              </AnimatePresence>
            </Box>
          )}
        </motion.div>

        {/* Note Add/Edit Dialog */}
        <Dialog 
          open={open} 
          onClose={handleClose} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            style: {
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)'
            }
          }}
        >
          <DialogTitle className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 flex justify-between items-center">
            <Typography variant="h5" className="font-bold flex items-center gap-3">
              {isEditing ? <EditIcon /> : <AddIcon />}
              {isEditing ? 'Edit Note' : 'Create New Note'}
            </Typography>
            <IconButton onClick={handleClose} className="text-white hover:bg-white/20">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent className="mt-4 p-6">
            <DialogForm 
              initialNote={newNote}
              onNoteChange={handleNoteChange}
              courses={memoizedCourses}
            />
          </DialogContent>
          <DialogActions className="p-6 bg-gray-50">
            <Button 
              onClick={handleClose} 
              className="text-gray-500 px-6 py-2 rounded-full"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNote} 
              variant="contained" 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-2 rounded-full"
              disabled={isNFTProcessing}
            >
              {isNFTProcessing ? 'Processing...' : (isEditing ? 'Update Note' : 'Create Note')}
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
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              minHeight: '70vh',
              maxHeight: '90vh'
            }
          }}
        >
          {selectedNote && (
            <>
              <DialogTitle className="bg-gradient-to-r from-blue-500 to-indigo-600 flex justify-between items-start p-6">
                <div>
                  <Typography variant="h5" className="text-white font-bold">
                    {selectedNote.title}
                  </Typography>
                  <Typography variant="subtitle1" className="text-white/80 mt-2 flex items-center gap-2">
                    <SchoolIcon fontSize="small" />
                    {selectedNote.course} - {selectedNote.topic}
                  </Typography>
                  <Typography variant="caption" className="text-white/70 flex items-center mt-2">
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
                  <IconButton onClick={handleDetailClose} className="text-white hover:bg-white/20">
                    <CloseIcon />
                  </IconButton>
                </div>
              </DialogTitle>
              <DialogContent className="mt-4 p-6">
                {renderDialogContent(selectedNote)}
              </DialogContent>
              <DialogActions className="p-6 bg-gray-50 gap-3">
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(selectedNote.id)}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50 px-6 py-2 rounded-full"
                >
                  Download PDF
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
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-2 rounded-full"
                >
                  {isNFTProcessing ? 'Processing...' : 'Mint as NFT'}
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
            className="rounded-xl"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </div>
  );
}

export default App;
