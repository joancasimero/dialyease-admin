import axios from 'axios';

// Debug environment variables
console.log('🔧 Environment Variables:', {
  REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  NODE_ENV: process.env.NODE_ENV
});

const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
console.log('🌐 API Base URL:', baseURL);

const api = axios.create({
  baseURL: baseURL,
  timeout: 10000, // 10 second timeout
});

// Add request interceptor for authentication and debugging
api.interceptors.request.use(
  (config) => {
    // Add JWT token from localStorage
    try {
      const admin = JSON.parse(localStorage.getItem('admin') || '{}');
      if (admin.token) {
        config.headers.Authorization = `Bearer ${admin.token}`;
        console.log('🔐 Auth token added to request');
      }
    } catch (e) {
      console.log('No auth token found');
    }
    
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default api;