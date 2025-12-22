<template>
  <div class="dashboard-layout">
    <!-- 头部任务栏 -->
    <header class="top-nav">
      <div class="top-nav-left">
        <h1 class="app-title">智习 Intelli-Study</h1>
      </div>
      <div class="top-nav-right">
        <button class="logout-btn" @click="handleLogout">
          <span class="logout-icon">🚪</span>
          <span class="logout-text">退出登录</span>
        </button>
      </div>
    </header>
    
    <!-- 主体内容区 -->
    <div class="main-content">
      <!-- 侧边栏 -->
      <aside class="sidebar">
        <div class="profile" v-if="profile" :class="{ fadeIn: profile }">
          <div class="profile-info">
            <p class="profile-name">你好，{{ profile.displayName ?? profile.email }}</p>
            <small class="profile-email">{{ profile.email }}</small>
          </div>
        </div>
        <nav class="nav-menu">
          <RouterLink 
            to="/learn" 
            class="nav-item"
            active-class="active"
          >
            <span class="nav-icon">📚</span>
            <span class="nav-text">学习</span>
          </RouterLink>
          <RouterLink 
          to="/practice" 
          class="nav-item"
          active-class="active"
        >
          <span class="nav-icon">✏️</span>
          <span class="nav-text">默写</span>
        </RouterLink>
          <RouterLink 
            to="/history" 
            class="nav-item"
            active-class="active"
          >
            <span class="nav-icon">📊</span>
            <span class="nav-text">学习历史</span>
          </RouterLink>
        </nav>
      </aside>
      
      <!-- 主内容 -->
      <main class="content">
        <RouterView v-slot="{ Component }">
          <transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';

import { fetchProfile } from '@/services/user.service';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const profile = computed(() => userStore.profile);

onMounted(async () => {
  if (!userStore.profile) {
    try {
      const data = await fetchProfile();
      userStore.setProfile(data);
    } catch (error) {
      // 忽略未登录错误，保持访客状态
    }
  }
});

// 退出登录处理
const handleLogout = () => {
  // 清除用户状态
  userStore.clear();
  // 跳转到登录页面
  router.push('/auth/login');
};
</script>

<style scoped>
.dashboard-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  padding: 10px;
  gap: 10px;
  background-color: #f8fafc;
}

/* 头部任务栏样式 */
.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  color: #fff;
  padding: 12px 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.top-nav-left {
  display: flex;
  align-items: center;
}

.app-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.top-nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 退出登录按钮样式 */
.logout-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  color: #fff;
}

.logout-icon {
  font-size: 16px;
}

.logout-text {
  font-size: 14px;
}

/* 主体内容区样式 */
.main-content {
  display: flex;
  flex: 1;
  gap: 10px;
  min-height: 0;
}

/* 侧边栏样式 */
.sidebar {
  width: 240px;
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border-radius: 12px;
  flex-shrink: 0;
}

/* 个人资料样式 */
.profile {
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.profile:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.profile-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.profile-email {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

/* 导航菜单样式 */
.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 导航项样式 */
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  border-radius: 12px;
  transition: all 0.3s ease;
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 4px;
  background: #fff;
  transform: scaleY(0);
  transition: transform 0.3s ease;
  border-radius: 0 2px 2px 0;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nav-item:hover::before {
  transform: scaleY(1);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nav-item.active::before {
  transform: scaleY(1);
}

.nav-icon {
  font-size: 18px;
  width: 24px;
  text-align: center;
  transition: all 0.3s ease;
}

.nav-item:hover .nav-icon {
  transform: scale(1.1);
}

.nav-text {
  font-size: 15px;
}

/* 主内容区域样式 */
.content {
  flex: 1;
  padding: 24px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  overflow-y: auto;
}

/* 页面过渡动画 */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.3s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

/* 淡入动画 */
.fadeIn {
  animation: fadeIn 0.5s ease-in;
}

/* 脉冲动画 */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* 淡入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard-layout {
    flex-direction: column;
    padding: 8px;
    gap: 8px;
  }
  
  .main-content {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    flex-direction: row;
    gap: 0;
    padding: 8px;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
    order: 2;
  }
  
  .profile {
    display: none;
  }
  
  .nav-menu {
    flex-direction: row;
    justify-content: space-around;
    gap: 8px;
    overflow-x: hidden;
    padding: 0;
    flex: 1;
  }
  
  .nav-item {
    flex: 1;
    padding: 10px 8px;
    min-width: auto;
    justify-content: center;
    gap: 6px;
    border-radius: 8px;
  }
  
  .nav-icon {
    font-size: 16px;
  }
  
  .nav-text {
    font-size: 12px;
  }
  
  .content {
    padding: 16px;
    border-radius: 12px;
    flex: 1;
    order: 1;
  }
  
  /* 顶部导航栏调整 */
  .top-nav {
    padding: 10px 12px;
    border-radius: 10px;
  }
  
  .app-title {
    font-size: 16px;
  }
  
  .logout-btn {
    padding: 6px 10px;
    gap: 4px;
  }
  
  .logout-text {
    display: none;
  }
}

@media (max-width: 480px) {
  .dashboard-layout {
    padding: 4px;
    gap: 4px;
  }
  
  .content {
    padding: 12px;
    border-radius: 8px;
  }
  
  .sidebar {
    padding: 6px;
  }
  
  .nav-item {
    padding: 8px 4px;
    gap: 4px;
  }
  
  .nav-icon {
    font-size: 14px;
  }
  
  .nav-text {
    font-size: 11px;
  }
  
  .top-nav {
    padding: 8px 10px;
  }
  
  .app-title {
    font-size: 14px;
  }
  
  .logout-btn {
    padding: 4px 8px;
  }
}
</style>
