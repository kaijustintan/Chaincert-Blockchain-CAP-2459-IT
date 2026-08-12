import axios from 'axios';

const instance = axios.create({
  // Vite exposes build-time env on import.meta.env (was process.env under CRA). The REACT_APP_
  // prefix is preserved via envPrefix in vite.config.js, so the variable NAME is unchanged and no
  // .env file or deploy runbook needed updating.
  baseURL: import.meta.env.REACT_APP_API_URL || 'http://localhost:4000/api',
});

// Automatically attach the JWT token if it exists
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// UAT: on an EXPIRED/invalid session (401 while an account token is still in localStorage), clear
// the dead session and bounce to /login — instead of leaving the user on a "401 Unauthorized"
// banner (the stale-login bug). Skips: anonymous calls (no token), the verifier flow (which manages
// its own short-lived proof token), and requests already on /login (no redirect loop).
instance.interceptors.response.use(
  response => response,
  error => {
    const status = error.response && error.response.status;
    const url = (error.config && error.config.url) || '';
    const hasSession = !!localStorage.getItem('token');
    const isVerifierFlow = url.includes('/verify'); // verifier OTP + verification endpoints
    if (status === 401 && hasSession && !isVerifierFlow && window.location.pathname !== '/login') {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('email');
        sessionStorage.clear();
      } catch (_) { /* private mode */ }
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default instance;
