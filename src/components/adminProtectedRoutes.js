import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // First check: Is user logged in?
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Second check: Is user an admin?
  if (user.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  // If both checks pass, render the component
  return children;
};

export default AdminProtectedRoute;
