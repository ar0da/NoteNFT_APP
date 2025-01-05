import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, TextField, Typography } from '@mui/material';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import TokenIcon from '@mui/icons-material/Token';
import SubjectIcon from '@mui/icons-material/Subject';
import TitleIcon from '@mui/icons-material/Title';
import TopicIcon from '@mui/icons-material/Topic';
import DescriptionIcon from '@mui/icons-material/Description';

const DialogForm = React.memo(({ initialNote, onNoteChange, courses }) => {
  const [localNote, setLocalNote] = useState(initialNote);

  useEffect(() => {
    setLocalNote(initialNote);
  }, [initialNote]);

  const handleChange = useCallback((field, value) => {
    const updated = {
      ...localNote,
      [field]: value
    };
    setLocalNote(updated);
    onNoteChange(updated);
  }, [onNoteChange, localNote]);

  const handlePriceChange = useCallback((e) => {
    const value = e.target.value;
    if (value >= 0) {
      handleChange('price', value);
    }
  }, [handleChange]);

  const handleMaxSupplyChange = useCallback((e) => {
    const value = parseInt(e.target.value);
    if (value >= 1) {
      handleChange('maxSupply', value.toString());
    }
  }, [handleChange]);

  const handleContentChange = useCallback((e) => {
    handleChange('content', e.target.value);
  }, [handleChange]);

  const handleTitleChange = useCallback((e) => {
    handleChange('title', e.target.value);
  }, [handleChange]);

  const handleTopicChange = useCallback((e) => {
    handleChange('topic', e.target.value);
  }, [handleChange]);

  const handleCourseChange = useCallback((e) => {
    handleChange('course', e.target.value);
  }, [handleChange]);

  const inputStyle = useMemo(() => ({
    '& .MuiOutlinedInput-root': {
      borderRadius: '12px',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      transition: 'all 0.3s ease',
      '&:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
      },
      '&.Mui-focused': {
        backgroundColor: 'rgba(255, 255, 255, 1)',
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5)',
      }
    },
    '& .MuiInputLabel-root': {
      color: 'rgb(59, 130, 246)',
    },
    '& .MuiSelect-icon': {
      color: 'rgb(59, 130, 246)',
    }
  }), []);

  const contentStyle = useMemo(() => ({
    ...inputStyle,
    '& .MuiOutlinedInput-root': {
      ...inputStyle['& .MuiOutlinedInput-root'],
      padding: '16px',
    }
  }), [inputStyle]);

  const courseOptions = useMemo(() => (
    courses.map((course) => (
      <MenuItem key={course} value={course}>{course}</MenuItem>
    ))
  ), [courses]);

  return (
    <Box component="form" noValidate autoComplete="off" onSubmit={e => e.preventDefault()}>
      <Typography variant="subtitle1" className="text-blue-600 mb-4 flex items-center gap-2">
        <SubjectIcon /> Course Information
      </Typography>
      
      <FormControl fullWidth sx={{ ...inputStyle, mb: 3 }}>
        <InputLabel>Subject</InputLabel>
        <Select
          value={localNote.course}
          label="Subject"
          onChange={handleCourseChange}
        >
          {courseOptions}
        </Select>
      </FormControl>

      <Typography variant="subtitle1" className="text-blue-600 mb-4 flex items-center gap-2">
        <DescriptionIcon /> Note Details
      </Typography>

      <TextField
        margin="dense"
        label="Title"
        type="text"
        fullWidth
        variant="outlined"
        value={localNote.title}
        onChange={handleTitleChange}
        className="mb-4"
        sx={inputStyle}
        InputProps={{
          startAdornment: (
            <TitleIcon className="mr-2 text-blue-500" />
          ),
        }}
      />

      <TextField
        margin="dense"
        label="Topic"
        type="text"
        fullWidth
        variant="outlined"
        value={localNote.topic}
        onChange={handleTopicChange}
        className="mb-4"
        sx={inputStyle}
        InputProps={{
          startAdornment: (
            <TopicIcon className="mr-2 text-blue-500" />
          ),
        }}
      />

      <TextField
        margin="dense"
        label="Note Content"
        multiline
        rows={8}
        fullWidth
        variant="outlined"
        value={localNote.content}
        onChange={handleContentChange}
        className="mb-4"
        sx={contentStyle}
        placeholder="Write your educational content here..."
      />

      <Typography variant="subtitle1" className="text-blue-600 mb-4 flex items-center gap-2">
        <TokenIcon /> NFT Settings
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          margin="dense"
          label="Price (EDU)"
          type="number"
          fullWidth
          variant="outlined"
          value={localNote.price}
          onChange={handlePriceChange}
          sx={inputStyle}
          InputProps={{
            startAdornment: (
              <MonetizationOnIcon className="mr-2 text-blue-500" />
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
          value={localNote.maxSupply}
          onChange={handleMaxSupplyChange}
          sx={inputStyle}
          InputProps={{
            startAdornment: (
              <TokenIcon className="mr-2 text-blue-500" />
            ),
            inputProps: { 
              min: "1",
              step: "1"
            }
          }}
        />
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => {
  return prevProps.initialNote === nextProps.initialNote &&
         prevProps.courses === nextProps.courses &&
         prevProps.onNoteChange === nextProps.onNoteChange;
});

export default DialogForm; 