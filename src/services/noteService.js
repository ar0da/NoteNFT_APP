import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const noteService = {
    getAllNotes: async () => {
        try {
            const response = await axios.get(`${API_URL}/notes`);
            return response.data;
        } catch (error) {
            console.error('Error fetching notes:', error);
            throw error;
        }
    },

    createNote: async (noteData) => {
        try {
            const response = await axios.post(`${API_URL}/notes`, noteData);
            return response.data;
        } catch (error) {
            console.error('Error creating note:', error);
            throw error;
        }
    },

    getNoteById: async (tokenId) => {
        try {
            const response = await axios.get(`${API_URL}/notes/${tokenId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching note details:', error);
            throw error;
        }
    },

    updateNote: async (tokenId, noteData) => {
        try {
            const response = await axios.put(`${API_URL}/notes/${tokenId}`, noteData);
            return response.data;
        } catch (error) {
            console.error('Error updating note:', error);
            throw error;
        }
    },

    deleteNote: async (tokenId) => {
        try {
            console.log('Attempting to delete note with tokenId:', tokenId);
            console.log('TokenId type:', typeof tokenId);
            const response = await axios.delete(`${API_URL}/notes/${tokenId}`);
            console.log('Delete response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error deleting note:', error);
            console.error('Error details:', {
                tokenId,
                errorMessage: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }
}; 