import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://172.27.177.220:4000/api',
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

export default instance;
