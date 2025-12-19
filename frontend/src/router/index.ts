import { createRouter, createWebHistory } from 'vue-router';

import AuthLayout from '@/pages/auth/AuthLayout.vue';
import LoginPage from '@/pages/auth/LoginPage.vue';
import RegisterPage from '@/pages/auth/RegisterPage.vue';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage.vue';
import LearnPage from '@/pages/learn/LearnPage.vue';
import PracticePage from '@/pages/practice/PracticePage.vue';
import HistoryPage from '@/pages/history/HistoryPage.vue';
import DashboardLayout from '@/pages/DashboardLayout.vue';
import { useUserStore } from '@/stores/user';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/learn'
    },
    {
      path: '/auth',
      component: AuthLayout,
      children: [
        { path: 'login', component: LoginPage },
        { path: 'register', component: RegisterPage },
        { path: 'forgot', component: ForgotPasswordPage }
      ]
    },
    {
      path: '/',
      component: DashboardLayout,
      children: [
        { path: 'learn', component: LearnPage, meta: { requiresAuth: true } },
        { path: 'practice', component: PracticePage, meta: { requiresAuth: true } },
        { path: 'history', component: HistoryPage, meta: { requiresAuth: true } }
      ]
    }
  ]
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  if (to.meta.requiresAuth && !userStore.token) {
    next({ path: '/auth/login' });
    return;
  }
  next();
});

export default router;
