<template>
  <section class="history-page">
    <header class="page-header">
      <div class="header-content">
        <h2 class="page-title">学习历史 & 错词统计</h2>
        <p class="page-description">直接读取后端历史接口，展示时间线与错词回顾。</p>
      </div>
      <div class="header-actions">
        <button 
          class="btn btn-outline"
          @click="refreshData"
          :disabled="isRefreshing"
        >
          <span class="btn-icon">🔄</span>
          {{ isRefreshing ? '刷新中...' : '刷新数据' }}
        </button>
      </div>
    </header>

    <div class="stats-section">
      <div class="stat-card">
        <div class="stat-icon correct">✅</div>
        <div class="stat-content">
          <h3 class="stat-number">{{ correctCount }}</h3>
          <p class="stat-label">正确次数</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon error">❌</div>
        <div class="stat-content">
          <h3 class="stat-number">{{ errorCount }}</h3>
          <p class="stat-label">错误次数</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon total">📊</div>
        <div class="stat-content">
          <h3 class="stat-number">{{ totalCount }}</h3>
          <p class="stat-label">总练习次数</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon accuracy">🎯</div>
        <div class="stat-content">
          <h3 class="stat-number">{{ accuracy }}%</h3>
          <p class="stat-label">准确率</p>
        </div>
      </div>
    </div>

    <div class="section-container">
      <h3 class="section-title">学习时间线</h3>
      
      <div class="timeline" v-if="timelineItems.length">
        <article 
          v-for="item in timelineItems" 
          :key="item.id" 
          class="timeline-item"
          :class="{ 'correct': item.isCorrect, 'error': !item.isCorrect }"
        >
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="item-header">
              <h4 class="item-word">{{ item.word?.text ?? '单词' }}</h4>
              <span class="item-status" :class="{ 'correct': item.isCorrect, 'error': !item.isCorrect }">
                {{ item.isCorrect ? '正确' : '错误' }}
              </span>
            </div>
            <div class="item-details">
              <span class="detail-item">
                <span class="detail-label">练习模式：</span>
                {{ item.session.mode === 'CHN_TO_ENG' ? '中文默写' : '听音默写' }}
              </span>
              <time class="detail-item time">
                {{ formatDate(item.createdAt) }}
              </time>
            </div>
            <div class="item-meta" v-if="item.hintLevel > 0">
              <span class="meta-hint">使用了 {{ item.hintLevel }} 次提示</span>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">📝</div>
        <p class="empty-title">暂无学习记录</p>
        <p class="empty-description">快去开始第一轮练习吧！</p>
        <RouterLink to="/practice" class="btn btn-primary">
          <span class="btn-icon">🎯</span>
          开始练习
        </RouterLink>
      </div>
    </div>

    <div class="section-container">
      <h3 class="section-title">错词回顾</h3>
      
      <div class="error-words-grid" v-if="errorWords.length">
        <div 
          v-for="word in errorWords" 
          :key="word.word.id" 
          class="error-word-card"
        >
          <div class="word-info">
            <h4 class="word-text" :title="word.word.text">{{ word.word.text }}</h4>
            <p class="word-translation" :title="word.word.translation">{{ word.word.translation }}</p>
          </div>
          <div class="error-info">
            <span class="error-count">
              <span class="count-number">{{ word.errorCount }}</span>
              <span class="count-label">次错误</span>
            </span>
            <button 
              class="review-btn"
              @click="reviewWord(word.word)"
              title="重新练习这个单词"
            >
              <span class="btn-icon">🔁</span>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">🎊</div>
        <p class="empty-title">目前没有错词数据</p>
        <p class="empty-description">继续保持！</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRouter } from 'vue-router';

import { fetchErrors, fetchTimeline } from '@/services/history.service';

const router = useRouter();
const queryClient = useQueryClient();
const isRefreshing = ref(false);

const { data: timelineData } = useQuery({
  queryKey: ['timeline'],
  queryFn: () => fetchTimeline()
});

const { data: errorData } = useQuery({
  queryKey: ['errorWords'],
  queryFn: () => fetchErrors()
});

const timelineItems = computed(() => timelineData.value ?? []);
const errorWords = computed(() => errorData.value ?? []);

// 统计数据
const correctCount = computed(() => {
  return timelineItems.value.filter(item => item.isCorrect).length;
});

const errorCount = computed(() => {
  return timelineItems.value.filter(item => !item.isCorrect).length;
});

const totalCount = computed(() => {
  return timelineItems.value.length;
});

const accuracy = computed(() => {
  if (totalCount.value === 0) return 0;
  return Math.round((correctCount.value / totalCount.value) * 100);
});

// 格式化日期
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 刷新数据
const refreshData = async () => {
  isRefreshing.value = true;
  try {
    await queryClient.invalidateQueries({ queryKey: ['timeline'] });
    await queryClient.invalidateQueries({ queryKey: ['errorWords'] });
  } finally {
    isRefreshing.value = false;
  }
};

// 复习单词
const reviewWord = (word: any) => {
  // 这里可以添加跳转到练习页面并练习该单词的逻辑
  router.push('/practice');
};
</script>

<style scoped>
.history-page {
  background: #fff;
  padding: 32px;
  border-radius: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  max-width: 1200px;
  margin: 0 auto;
}

.history-page:hover {
  box-shadow: 0 15px 60px rgba(0, 0, 0, 0.12);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  gap: 24px;
  flex-wrap: wrap;
}

.header-content {
  max-width: 800px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.2;
}

.page-description {
  margin: 0;
  font-size: 16px;
  color: #64748b;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* 按钮样式 */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-outline {
  background: transparent;
  color: #64748b;
  border: 2px solid #e2e8f0;
}

.btn-outline:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #334155;
}

.btn-icon {
  font-size: 16px;
}

/* 统计卡片样式 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: #3b82f6;
}

.stat-icon {
  font-size: 32px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-icon.correct {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.stat-icon.error {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.stat-icon.total {
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
}

.stat-icon.accuracy {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}

.stat-content {
  flex: 1;
}

.stat-number {
  margin: 0 0 4px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.stat-label {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

/* 章节样式 */
.section-container {
  margin-bottom: 40px;
}

.section-title {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 时间线样式 */
.timeline {
  position: relative;
  padding-left: 32px;
  margin: 0;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(to bottom, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 2px;
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
  background: #fff;
  padding: 20px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 2px solid #e2e8f0;
}

.timeline-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: #3b82f6;
}

.timeline-item.correct {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.05);
}

.timeline-item.error {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

.timeline-dot {
  position: absolute;
  left: -36px;
  top: 24px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  border: 4px solid #3b82f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.timeline-item.correct .timeline-dot {
  border-color: #10b981;
}

.timeline-item.error .timeline-dot {
  border-color: #ef4444;
}

.timeline-item:hover .timeline-dot {
  transform: scale(1.2);
}

.timeline-content {
  margin: 0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-word {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.item-status {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.item-status.correct {
  background: rgba(16, 185, 129, 0.2);
  color: #059669;
}

.item-status.error {
  background: rgba(239, 68, 68, 0.2);
  color: #dc2626;
}

.item-details {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 14px;
  color: #64748b;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-label {
  font-weight: 600;
  color: #475569;
}

.time {
  color: #94a3b8;
  font-style: italic;
  margin-left: auto;
}

.item-meta {
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

.meta-hint {
  background: rgba(245, 158, 11, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  color: #d97706;
  font-weight: 500;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 32px;
  background: #fff;
  border: 2px dashed #e2e8f0;
  border-radius: 24px;
  text-align: center;
  margin: 24px 0;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #475569;
}

.empty-description {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #94a3b8;
  max-width: 400px;
}

/* 错词网格样式 */
.error-words-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 24px;
  width: 100%;
  box-sizing: border-box;
}

.error-word-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 2px solid rgba(239, 68, 68, 0.3);
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.error-word-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.word-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.word-text {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: help;
  max-width: 100%;
  display: inline-block;
}

.word-translation {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: help;
  max-width: 100%;
  display: inline-block;
}

.error-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.error-count {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.count-number {
  font-size: 24px;
  font-weight: 700;
  color: #ef4444;
}

.count-label {
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.review-btn {
  padding: 10px;
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.review-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .history-page {
    padding: 24px;
    border-radius: 0;
  }
  
  .page-header {
    margin-bottom: 24px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .page-description {
    font-size: 14px;
  }
  
  .stats-section {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  
  .stat-card {
    padding: 16px;
    gap: 12px;
  }
  
  .stat-icon {
    font-size: 24px;
    width: 50px;
    height: 50px;
  }
  
  .stat-number {
    font-size: 24px;
  }
  
  .timeline {
    padding-left: 24px;
  }
  
  .timeline::before {
    left: 4px;
    width: 3px;
  }
  
  .timeline-dot {
    left: -28px;
    width: 16px;
    height: 16px;
    border-width: 3px;
  }
  
  .timeline-item {
    padding: 16px;
    margin-bottom: 20px;
  }
  
  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .time {
    margin-left: 0;
  }
  
  .item-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .error-words-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .error-word-card {
    padding: 16px;
  }
  
  .word-text {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .history-page {
    padding: 16px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .stat-card {
    padding: 12px;
    flex-direction: column;
    text-align: center;
  }
  
  .timeline {
    padding-left: 20px;
  }
  
  .timeline-item {
    padding: 12px;
  }
  
  .section-title {
    font-size: 18px;
  }
  
  .btn {
    padding: 10px 16px;
    font-size: 13px;
  }
}
</style>
