import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import authService from '../../services/authService';

const PrivateRoute = () => {
  const admin = authService.getCurrentAdmin();
  return admin ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;