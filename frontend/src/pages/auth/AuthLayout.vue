<template>
  <div class="auth-layout">
    <div class="auth-card fade-in">
      <div class="auth-header">
        <h1 class="app-title">Intelli Study</h1>
        <h2 class="auth-title">智习 · 英语学习</h2>
        <p class="auth-subtitle">一个专注学习、练习、复习的智能平台</p>
      </div>
      <RouterView />
    </div>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
/* 全局容器样式 */
.auth-layout {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* 认证卡片样式 */
.auth-card {
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 450px;
  transition: all 0.3s ease;
}

.auth-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.25);
}

/* 头部样式 */
.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.app-title {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px 0;
}

.auth-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.auth-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

/* 动画效果 */
.fade-in {
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .auth-layout {
    padding: 16px;
  }
  
  .auth-card {
    padding: 32px;
    border-radius: 20px;
  }
  
  .app-title {
    font-size: 28px;
  }
  
  .auth-title {
    font-size: 20px;
  }
  
  .auth-subtitle {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .auth-card {
    padding: 24px;
    border-radius: 16px;
  }
  
  .app-title {
    font-size: 24px;
  }
  
  .auth-title {
    font-size: 18px;
  }
  
  .auth-header {
    margin-bottom: 24px;
  }
}
</style>
