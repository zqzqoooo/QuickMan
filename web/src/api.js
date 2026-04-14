import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.heshanws.top/api',
  timeout: 10000,
});

// 🌟 请求拦截器：每一笔请求都带上“通行证”
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('quickman_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：如果 Token 过期，自动踢回登录页
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('quickman_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;