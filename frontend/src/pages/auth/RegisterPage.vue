<template>
  <div class="auth-form-container">
    <h3 class="form-title">注册账号</h3>
    <p class="form-subtitle">创建您的账号开始学习之旅</p>
    
    <form class="auth-form" @submit.prevent="handleSubmit">
      <div class="form-group">
        <label class="form-label">昵称</label>
        <input 
          v-model="displayName" 
          class="form-input"
          placeholder="便于展示的昵称"
        />
      </div>
      
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
        {{ isSubmitting ? '提交中...' : '完成注册' }}
      </button>
      
      <div class="helper-links">
        <RouterLink to="/auth/login" class="helper-link">已有账号？登录</RouterLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';

import { register } from '@/services/auth.service';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

const email = ref('');
const password = ref('');
const displayName = ref('');
const isSubmitting = ref(false);
const errorMessage = ref('');

const handleSubmit = async () => {
  isSubmitting.value = true;
  errorMessage.value = '';
  try {
    const res = await register({
      email: email.value,
      password: password.value,
      displayName: displayName.value
    });
    userStore.setToken(res.accessToken);
    await router.push('/learn');
  } catch (error: any) {
    errorMessage.value = error?.response?.data?.message ?? '注册失败，请稍后再试';
  } finally {
    isSubmitting.value = false;
  }
};
</script>


