import axios from 'axios';
import { useUserStore } from '@/stores/user';
import router from '@/router';

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true
});

// 请求拦截器 - 添加token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理401错误
http.interceptors.response.use(
  (response) => response,
  (error) => {
    // 处理401 Unauthorized错误
    if (error.response?.status === 401) {
      const userStore = useUserStore();
      
      // 清除用户登录状态
      userStore.clear();
      
      // 跳转到登录页面，并记录当前路径以便登录后返回
      router.push({
        path: '/auth/login',
        query: { redirect: router.currentRoute.value.fullPath }
      });
    }
    return Promise.reject(error);
  }
);
