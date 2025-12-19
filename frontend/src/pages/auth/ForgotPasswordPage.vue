<template>
  <div class="auth-form-container">
    <h3 class="form-title">找回密码</h3>
    <p class="form-subtitle">输入注册邮箱，我们会发送重置链接</p>
    
    <form class="auth-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label class="form-label">邮箱</label>
        <input 
          v-model="email" 
          type="email" 
          required 
          class="form-input"
          placeholder="请输入您的注册邮箱"
        />
      </div>
      
      <p class="success-message" v-if="successMessage">{{ successMessage }}</p>
      <p class="error-message" v-if="errorMessage">{{ errorMessage }}</p>
      
      <button 
        type="submit" 
        :disabled="isSubmitting"
        class="btn btn-primary form-btn"
      >
        <span class="btn-icon" v-if="isSubmitting">🔄</span>
        {{ isSubmitting ? '发送中...' : '发送重置邮件' }}
      </button>
      
      <div class="helper-links">
        <RouterLink to="/auth/login" class="helper-link">返回登录</RouterLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';

import { forgotPassword } from '@/services/auth.service';

const email = ref('');
const isSubmitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const handleSubmit = async () => {
  isSubmitting.value = true;
  successMessage.value = '';
  errorMessage.value = '';
  try {
    await forgotPassword(email.value);
    successMessage.value = '如果邮箱存在，我们已经发送了重置邮件（示例环境直接返回成功）';
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message ?? '发送失败，请稍后重试';
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
/* 成功消息样式 */
.success-message {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  border: 1px solid rgba(16, 185, 129, 0.2);
}
</style>
