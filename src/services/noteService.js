import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const noteService = {
    getAllNotes: async () => {
        try {
            const response = await axios.get(`${API_URL}/notes`);
            return response.data;
        } catch (error) {
            console.error('Notlar getirilirken hata:', error);
            throw error;
        }
    },

    createNote: async (noteData) => {
        try {
            const response = await axios.post(`${API_URL}/notes`, noteData);
            return response.data;
        } catch (error) {
            console.error('Not oluşturulurken hata:', error);
            throw error;
        }
    },

    getNoteById: async (tokenId) => {
        try {
            const response = await axios.get(`${API_URL}/notes/${tokenId}`);
            return response.data;
        } catch (error) {
            console.error('Not detayları getirilirken hata:', error);
            throw error;
        }
    },

    updateNote: async (tokenId, noteData) => {
        try {
            const response = await axios.put(`${API_URL}/notes/${tokenId}`, noteData);
            return response.data;
        } catch (error) {
            console.error('Not güncellenirken hata:', error);
            throw error;
        }
    }
}; 