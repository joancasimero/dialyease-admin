import axios from 'axios';

const API_URL = 'http://localhost:5000/api/admin';

// Helper function to decode JWT token
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

const register = async (adminData) => {
  const response = await axios.post(API_URL + '/register', adminData);
  
  if (response.data && response.data.token) {
    const decodedToken = decodeToken(response.data.token);
    const adminWithRole = {
      ...response.data,
      role: decodedToken?.role || 'admin'
    };
    localStorage.setItem('admin', JSON.stringify(adminWithRole));
    return adminWithRole;
  }
  
  return response.data;
};

const login = async (adminData) => {
  const response = await axios.post(API_URL + '/login', adminData);
  
  if (response.data && response.data.token) {
    const decodedToken = decodeToken(response.data.token);
    const adminWithRole = {
      ...response.data,
      role: decodedToken?.role || 'admin'
    };
    localStorage.setItem('admin', JSON.stringify(adminWithRole));
    return adminWithRole;
  }
  
  return response.data;
};

const logout = () => {
  localStorage.removeItem('admin');
};

const getCurrentAdmin = () => {
  const adminData = JSON.parse(localStorage.getItem('admin'));
  if (adminData && adminData.token && !adminData.role) {
    // If stored admin data doesn't have role, decode it from token
    const decodedToken = decodeToken(adminData.token);
    const adminWithRole = {
      ...adminData,
      role: decodedToken?.role || 'admin'
    };
    localStorage.setItem('admin', JSON.stringify(adminWithRole));
    return adminWithRole;
  }
  return adminData;
};

const requestAdminOtp = async (email) => {
  const response = await axios.post(API_URL + '/forgot-password', { email });
  return response.data;
};

const verifyAdminOtp = async (email, otp) => {
  const response = await axios.post(API_URL + '/verify-otp', { email, otp });
  return response.data;
};

const resetAdminPassword = async (email, newPassword) => {
  const response = await axios.post(API_URL + '/reset-password', { email, new_password: newPassword });
  return response.data;
};

const authService = {
  register,
  login,
  logout,
  getCurrentAdmin,
  requestAdminOtp,
  verifyAdminOtp,
  resetAdminPassword,
};

export default authService;