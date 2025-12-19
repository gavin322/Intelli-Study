<template>
  <div class="auth-form-container">
    <h3 class="form-title">欢迎回来</h3>
    <p class="form-subtitle">登录您的账号继续学习</p>
    
    <form class="auth-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label class="form-label">邮箱</label>
        <input 
          v-model="email" 
          type="email" 
          required 
          class="form-input"
          placeholder="请输入您的邮箱"
        />
      </div>
      
      <div class="form-group">
        <label class="form-label">密码</label>
        <input 
          v-model="password" 
          type="password" 
          required 
          class="form-input"
          placeholder="请输入您的密码"
        />
      </div>
      
      <p class="error-message" v-if="errorMessage">{{ errorMessage }}</p>
      
      <button 
        type="submit" 
        :disabled="isSubmitting"
        class="btn btn-primary form-btn"
      >
        <span class="btn-icon" v-if="isSubmitting">🔄</span>
        {{ isSubmitting ? '登录中...' : '立即登录' }}
      </button>
      
      <div class="helper-links">
        <RouterLink to="/auth/forgot" class="helper-link">忘记密码？</RouterLink>
        <RouterLink to="/auth/register" class="helper-link">没有账号？注册</RouterLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';

import { login } from '@/services/auth.service';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const email = ref('');
const password = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

const handleSubmit = async () => {
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    // 真实调用后端登录接口，获取 JWT 并缓存
    const res = await login(email.value, password.value);
    userStore.setToken(res.accessToken);
    
    // 获取登录前的重定向路径，默认为 /learn
    const redirectPath = router.currentRoute.value.query.redirect as string || '/learn';
    await router.push(redirectPath);
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message ?? '登录失败，请检查账号或密码';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* 表单容器样式 */
.auth-form-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 表单标题样式 */
.form-title {
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  text-align: center;
}

.form-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
  text-align: center;
}

/* 表单样式 */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.form-input {
  width: 100%;
  padding: 14px 20px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 16px;
  font-family: inherit;
  transition: all 0.3s ease;
  background: white;
  color: #1e293b;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  transform: translateY(-2px);
}

.form-input:hover:not(:disabled) {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.form-input::placeholder {
  color: #94a3b8;
}

/* 按钮样式 */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-family: inherit;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.form-btn {
  width: 100%;
  margin-top: 8px;
}

.btn-icon {
  font-size: 18px;
  animation: spin 1s linear infinite;
}

/* 错误信息样式 */
.error-message {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

/* 辅助链接样式 */
.helper-links {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 14px;
}

.helper-link {
  color: #64748b;
  text-decoration: none;
  transition: all 0.3s ease;
  font-weight: 500;
}

.helper-link:hover {
  color: #3b82f6;
  text-decoration: underline;
}

/* 动画效果 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-input {
    padding: 12px 14px;
    font-size: 14px;
  }
  
  .btn {
    padding: 14px 20px;
    font-size: 14px;
  }
  
  .helper-links {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .form-title {
    font-size: 20px;
  }
  
  .form-subtitle {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .auth-form {
    gap: 16px;
  }
  
  .form-input {
    padding: 10px 12px;
    font-size: 14px;
  }
  
  .btn {
    padding: 12px 16px;
    font-size: 13px;
  }
  
  .form-title {
    font-size: 18px;
  }
}
</style>
