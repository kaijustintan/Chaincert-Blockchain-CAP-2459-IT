// frontend/src/services/authenticationService.js
// ✅ FRONTEND VERSION - Uses ES6 export syntax for React

import { USER_SYNC_EVENT } from '../utils/userDisplay';

const emitAuthSync = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(USER_SYNC_EVENT));
  }
};

// ✅ COMPLETE LOGOUT FUNCTION WITH FULL CLEANUP
export const logout = () => {
  // ✅ Define all storage keys that need to be cleared
  const keysToRemove = [
    'token',
    'user',
    'role',
    'email',
    'userRole',
    'isAuthenticated',
    'orgName',
    'fullName',
    'userId',
    'userEmail',
    'authToken',
    'sessionToken'
  ];
  
  // ✅ Remove each key from localStorage
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  // ✅ Clear sessionStorage completely
  sessionStorage.clear();

  emitAuthSync();
};


// ✅ LOGIN FUNCTION - Store user data
export const login = (token, user, role, email) => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const cleanUser = Object.fromEntries(Object.entries(user || {}).filter(([, value]) => value !== undefined));
  const storedUser = { ...currentUser, ...cleanUser, role: role || cleanUser.role || currentUser.role };
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(storedUser));
  localStorage.setItem('role', role);
  localStorage.setItem('email', email);
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userRole', role);
  localStorage.setItem('isAuthenticated', 'true');
  emitAuthSync();
};


// ✅ GET AUTH DATA - Retrieve stored user data
export const getAuthData = () => {
  return {
    token: localStorage.getItem('token'),
    user: localStorage.getItem('user'),
    role: localStorage.getItem('role'),
    email: localStorage.getItem('email'),
    isAuthenticated: localStorage.getItem('isAuthenticated') === 'true'
  };
};


// ✅ CHECK IF AUTHENTICATED
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const isAuth = localStorage.getItem('isAuthenticated');
  return token && isAuth === 'true';
};


// ✅ GET USER ROLE
export const getUserRole = () => {
  return localStorage.getItem('role') || localStorage.getItem('userRole');
};


// ✅ CHECK IF ADMIN
export const isAdmin = () => {
  const role = getUserRole();
  return role === 'admin' || role === 'Admin';
};