import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// İstek interceptor'ı
api.interceptors.request.use(
  (config) => {
    console.log('API İsteği:', config.url);
    return config;
  },
  (error) => {
    console.error('API İstek Hatası:', error);
    return Promise.reject(error);
  }
);

// Yanıt interceptor'ı
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Yanıt Hatası:', error);
    if (error.response) {
      console.error('Hata Detayı:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export default api; 