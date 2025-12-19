<template>
  <section class="practice-page">
    <header class="page-header">
      <div class="header-content">
        <h2 class="page-title">默写练习</h2>
        <p class="page-description">结合后端练习接口，支持中文提示，并记录错误次数。</p>
      </div>
      <div class="header-actions">
        <div class="select-wrapper">
          <select 
            v-model="selectedSource" 
            class="source-select"
            @change="onSourceChange"
          >
            <option value="" disabled>选择词库</option>
            <option
              v-for="src in sources"
              :key="src.id"
              :value="src.id"
            >
              {{ src.description }}
            </option>
          </select>
          <div class="select-icon">▼</div>
        </div>
      </div>
    </header>

    <div class="mode-section">
      <div class="mode-switch">
        <button 
          class="mode-btn active"
        >
          <span class="mode-icon">📝</span>
          中文默写
        </button>
      </div>
      <button 
        class="refresh-btn"
        @click="loadSession"
        :disabled="isLoadingSession"
      >
        <span class="btn-icon">🔄</span>
        {{ isLoadingSession ? '生成中...' : '重新生成题目' }}
      </button>
    </div>

    <div class="card-container">
      <div 
        class="practice-card" 
        v-if="currentWord"
        :class="{ 'fade-in': currentWord }"
      >
        <div class="practice-info">
          <div class="progress-info">
            <span class="progress-text">
              第 {{ currentIndex + 1 }} / {{ currentGroupWords.length }} 题
            </span>
            <span class="group-info">
              第 {{ currentGroup }} / {{ totalGroups }} 组
            </span>
            <span class="mistake-count" v-if="mistakeCount > 0">
              错误次数: {{ mistakeCount }}
            </span>
          </div>
          <div class="group-navigation" v-if="totalGroups > 1">
            <button 
              class="group-nav-btn" 
              @click="prevGroup" 
              :disabled="currentGroup === 1"
              title="上一组"
            >
              ←
            </button>
            <div class="group-buttons">
              <select class="group-select" v-model.number="currentGroup" @change="onGroupSelectChange">
                <option v-for="group in totalGroups" :key="group" :value="group">
                  第 {{ group }} 组
                </option>
              </select>
            </div>
            <button 
              class="group-nav-btn" 
              @click="nextGroup" 
              :disabled="currentGroup === totalGroups"
              title="下一组"
            >
              →
            </button>
          </div>
        </div>
        
        <h3 class="prompt">
          {{ currentWord.translation }}
        </h3>

        <div class="input-section">
          <input 
            v-model="answer" 
            @keyup.enter="submit" 
            placeholder="请输入英文单词"
            class="answer-input"
            :disabled="isSubmitting"
            :class="{ 'correct': isCorrect && feedback, 'error': !isCorrect && feedback }"
            ref="answerInput"
            autocomplete="off"
          />
          <div class="input-hint" v-if="!answer && !feedback">
            输入英文单词，按回车键提交
          </div>
        </div>
        
        <div class="actions">
          <button 
            class="btn btn-primary submit-btn"
            @click="submit" 
            :disabled="isSubmitting || !answer.trim()"
          >
            <span class="btn-icon">📤</span>
            {{ isSubmitting ? '提交中...' : '提交答案' }}
          </button>
          <button 
            class="btn btn-secondary hint-btn"
            @click="showHint" 
            :disabled="hintLoading"
            :class="{ 'used': hintLevel > 0 }"
          >
            <span class="btn-icon">💡</span>
            查看提示 ({{ hintLevel }})
          </button>
        </div>
        
        <div 
          class="feedback-section" 
          v-if="feedback"
          :class="{ 'success': isCorrect, 'error': !isCorrect }"
        >
          <span class="feedback-icon">{{ isCorrect ? '✅' : '❌' }}</span>
          <p class="feedback-text">{{ feedback }}</p>
        </div>
        
        <div class="word-info" v-if="isCorrect">
          <p class="original-word">{{ currentWord.text }}</p>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <div class="empty-icon">📝</div>
        <p class="empty-title">暂无可练习的单词</p>
        <p class="empty-description">请先在学习页选择词库并确保已登录</p>
        <RouterLink to="/learn" class="btn btn-primary">
          <span class="btn-icon">📚</span>
          前往学习页
        </RouterLink>
      </div>
    </div>
    
    <div class="session-complete" v-if="currentIndex >= currentGroupWords.length - 1 && currentGroupWords.length > 0 && !isCorrect && currentGroup === totalGroups">
      <div class="complete-content">
        <span class="complete-icon">🎉</span>
        <h3 class="complete-title">本轮练习完成！</h3>
        <p class="complete-text">你已完成所有题目，继续加油！</p>
        <button class="btn btn-primary" @click="loadSession">
          <span class="btn-icon">🔄</span>
          开始新的练习
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';

import { fetchWords, fetchSourceStats, type LexiconSourceStat } from '@/services/lexicon.service';
import { fetchHint, startSession, submitAttempt } from '@/services/practice.service';

const router = useRouter();
const answerInput = ref<HTMLInputElement | null>(null);

const answer = ref('');
const hintLevel = ref(0);
const feedback = ref('');
const isCorrect = ref(false);
const isSubmitting = ref(false);
const hintLoading = ref(false);
const isLoadingSession = ref(false);
const sessionId = ref('');
// 当前页（每页20个）的单词列表
const allWords = ref<any[]>([]);
const currentIndex = ref(0);
const mistakeCount = ref(0);
const selectedSource = ref<string>("");
const currentGroup = ref(1); // 当前页码（每页=20个）
const totalGroups = ref(0); // 总页数（按20个分组）
const GROUP_SIZE = 20; // 每页单词数量

// 获取词库来源列表（包含每个分类的总词数与总页数）
const { data: sourceData } = useQuery({
  queryKey: ['lexicon-sources'],
  queryFn: () => fetchSourceStats(GROUP_SIZE),
  staleTime: 1000 * 60 * 5
});

const sources = computed<LexiconSourceStat[]>(() => sourceData.value ?? []);
const selectedSourceStat = computed(() => sources.value.find((s) => s.id === selectedSource.value) ?? null);

// 当前页的单词列表
const currentGroupWords = computed(() => {
  return allWords.value;
});

// 当前单词
const currentWord = computed(() => {
  return currentGroupWords.value[currentIndex.value];
});

const loadSession = async () => {
  if (!selectedSource.value) return;
  
  isLoadingSession.value = true;
  feedback.value = '';
  
  try {
    const { data } = await fetchWords({ 
      page: currentGroup.value,
      pageSize: GROUP_SIZE,
      sourceId: selectedSource.value
    });
    
    if (!data.items.length) {
      allWords.value = [];
      totalGroups.value = 0;
      currentIndex.value = 0;
      return;
    }
    
    // 当前页就是一组（20个）
    allWords.value = data.items;
    totalGroups.value = selectedSourceStat.value?.pageCount ?? Math.ceil(data.total / GROUP_SIZE);
    currentIndex.value = 0;
    
    // 为当前页创建练习会话
    await createSessionForCurrentGroup();
    
    await resetState();
    await nextTick();
    focusInput();
  } catch (error) {
    feedback.value = '无法加载练习，请确认已登录并完成词库同步。';
  } finally {
    isLoadingSession.value = false;
  }
};

// 为当前组创建练习会话
const createSessionForCurrentGroup = async () => {
  if (currentGroupWords.value.length === 0) return;
  
  const session = await startSession({
    mode: 'CHN_TO_ENG',
    source: 'WORD',
    wordIds: currentGroupWords.value.map((item) => item.id)
  });
  
  sessionId.value = session.sessionId;
};

// 切换到指定组
const switchToGroup = async (group: number) => {
  if (group < 1 || group > totalGroups.value) return;
  
  currentGroup.value = group;
  currentIndex.value = 0;
  await loadSession();
};

// 切换到上一组
const prevGroup = async () => {
  if (currentGroup.value > 1) {
    await switchToGroup(currentGroup.value - 1);
  }
};

// 切换到下一组
const nextGroup = async () => {
  if (currentGroup.value < totalGroups.value) {
    await switchToGroup(currentGroup.value + 1);
  }
};

const onSourceChange = () => {
  currentGroup.value = 1;
  loadSession();
};

const onGroupSelectChange = () => {
  switchToGroup(currentGroup.value);
};

// 当词库来源加载完成后，自动选择第一个词库
onMounted(() => {
  if (sources.value.length > 0 && !selectedSource.value) {
    selectedSource.value = sources.value[0].id;
  }
});

// 监听词库来源变化，自动选择第一个词库
watch(
  () => sources.value,
  (list) => {
    if (list.length > 0 && (!selectedSource.value || !list.some(src => src.id === selectedSource.value))) {
      selectedSource.value = list[0].id;
    }
  },
  { deep: true }
);

// 监听selectedSource变化，自动加载练习
watch(
  selectedSource,
  (newSource) => {
    if (newSource) {
      currentGroup.value = 1;
      totalGroups.value = selectedSourceStat.value?.pageCount ?? 0;
      loadSession();
    }
  }
);

const submit = async () => {
  if (!currentWord.value || !sessionId.value || !answer.value.trim() || isSubmitting.value) return;
  
  isSubmitting.value = true;
  
  try {
    const result = await submitAttempt({
      sessionId: sessionId.value,
      wordId: currentWord.value.id,
      prompt: currentWord.value.translation,
      answer: answer.value,
      mistakeCount: mistakeCount.value,
      hintLevel: hintLevel.value
    });
    
    isCorrect.value = result.isCorrect;
    
    if (result.isCorrect) {
      feedback.value = '✅ 正确，继续保持！';
      setTimeout(() => {
        goNext();
      }, 1500);
    } else {
      feedback.value = `❌ 拼写不正确，正确答案是：${currentWord.value.text}`;
      mistakeCount.value += 1;
    }
  } catch (error) {
    feedback.value = '提交失败，请稍后重试';
  } finally {
    isSubmitting.value = false;
  }
};

const showHint = async () => {
  if (!currentWord.value || hintLoading.value) return;
  
  hintLoading.value = true;
  
  try {
    const res = await fetchHint(currentWord.value.id, hintLevel.value);
    hintLevel.value = res.level;
    feedback.value = `💡 提示：${res.hint}`;
  } finally {
    hintLoading.value = false;
  }
};

const goNext = async () => {
  if (currentIndex.value < currentGroupWords.value.length - 1) {
    // 继续当前组的下一题
    currentIndex.value += 1;
    await resetState();
    await nextTick();
    focusInput();
  } else if (currentGroup.value < totalGroups.value) {
    // 进入下一组
    await switchToGroup(currentGroup.value + 1);
  } else {
    // 所有组完成
    feedback.value = '🎉 所有练习完成，可点击“重新生成题目”';
  }
};

const resetState = () => {
  answer.value = '';
  hintLevel.value = 0;
  mistakeCount.value = 0;
  feedback.value = '';
  isCorrect.value = false;
};

const focusInput = () => {
  if (answerInput.value) {
    answerInput.value.focus();
  }
};

onMounted(() => {
  loadSession();
});

// 监听currentWord变化，自动聚焦输入框
watch(currentWord, (newWord) => {
  if (newWord) {
    nextTick(() => {
      focusInput();
    });
  }
});
</script>

<style scoped>
.practice-page {
  background: #fff;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  max-width: 1200px;
  margin: 0 auto;
}

.practice-page:hover {
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
  flex: 1;
  min-width: 280px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.select-wrapper {
  position: relative;
  display: inline-block;
  min-width: 180px;
}

.source-select {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.3s ease;
  appearance: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.source-select:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15), 0 0 0 3px rgba(59, 130, 246, 0.05);
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.source-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.2), 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
}

.source-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  border-color: #cbd5e1;
  background: #f8fafc;
}

.select-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: #64748b;
  pointer-events: none;
  transition: all 0.3s ease;
}

.select-wrapper:hover .select-icon {
  color: #3b82f6;
  transform: translateY(-50%) scale(1.1);
}

.select-wrapper:focus-within .select-icon {
  color: #3b82f6;
  transform: translateY(-50%) scale(1.1) rotate(180deg);
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

.mode-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  gap: 16px;
  flex-wrap: wrap;
}

.mode-switch {
  display: flex;
  gap: 12px;
  flex: 1;
  min-width: 280px;
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border: 2px solid #e2e8f0;
  background: #fff;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.mode-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.mode-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-color: #3b82f6;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.mode-icon {
  font-size: 16px;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 18px 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
  flex-shrink: 0;
  height: 56px;
  box-sizing: border-box;
}

.refresh-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.refresh-btn .btn-icon {
  font-size: 16px;
  animation: rotate 1s linear infinite;
  animation-play-state: paused;
}

.refresh-btn:not(:disabled):hover .btn-icon {
  animation-play-state: running;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.card-container {
  margin-bottom: 32px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 400px;
}

.practice-card {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  width: 100%;
  max-width: 800px;
  transform: translateY(0);
}

.practice-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.12);
}

.practice-info {
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-info {
  display: flex;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
}

.group-info {
  font-size: 14px;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 4px 12px;
  border-radius: 16px;
}

.mistake-count {
  font-size: 14px;
  font-weight: 600;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
  padding: 4px 12px;
  border-radius: 16px;
}

/* 组导航样式 */
.group-navigation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

.group-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.group-select {
  padding: 10px 12px;
  border-radius: 12px;
  border: 2px solid #e2e8f0;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
}

.group-btn {
  width: 36px;
  height: 36px;
  border: 2px solid #e2e8f0;
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.group-btn:hover:not(.active) {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.group-btn.active {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-color: #3b82f6;
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.group-nav-btn {
  width: 36px;
  height: 36px;
  border: 2px solid #e2e8f0;
  background: #fff;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.group-nav-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.group-nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.prompt {
  margin: 0 0 24px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  text-align: center;
  line-height: 1.3;
}

.audio-section {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
}

.audio-player {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.audio-player:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.audio-placeholder {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  width: 100%;
  justify-content: center;
}

.placeholder-icon {
  font-size: 20px;
  color: #3b82f6;
}

.input-section {
  margin-bottom: 24px;
}

.answer-input {
  width: 100%;
  padding: 18px 24px;
  border: 3px solid #e2e8f0;
  border-radius: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  background: #fff;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.answer-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
}

.answer-input:hover:not(:disabled) {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.answer-input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background: #f8fafc;
}

.answer-input.correct {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.1);
}

.answer-input.error {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  font-style: italic;
}

.actions {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
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
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
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

.btn-secondary {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: #fff;
}

.btn-secondary:hover:not(:disabled) {
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.btn-secondary.used {
  background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
}

.btn-icon {
  font-size: 16px;
}

.feedback-section {
  margin-bottom: 24px;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s ease;
}

.feedback-section.success {
  background: rgba(16, 185, 129, 0.1);
  border: 2px solid rgba(16, 185, 129, 0.3);
  color: #059669;
}

.feedback-section.error {
  background: rgba(239, 68, 68, 0.1);
  border: 2px solid rgba(239, 68, 68, 0.3);
  color: #dc2626;
}

.feedback-icon {
  font-size: 24px;
  margin-bottom: 8px;
  display: block;
}

.feedback-text {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
}

.word-info {
  padding: 20px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 12px;
  text-align: center;
  border: 2px solid rgba(59, 130, 246, 0.3);
}

.original-word {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1d4ed8;
}

.word-translation {
  margin: 0;
  font-size: 16px;
  color: #64748b;
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
  width: 100%;
  max-width: 600px;
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

/* 会话完成样式 */
.session-complete {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 2px solid #86efac;
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  margin-top: 24px;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
  animation: slideIn 0.5s ease-out;
}

.complete-content {
  max-width: 500px;
  margin: 0 auto;
}

.complete-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
  animation: bounce 1s ease-in-out infinite;
}

.complete-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 700;
  color: #059669;
}

.complete-text {
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #166534;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .practice-page {
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
  
  .mode-section {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 24px;
    gap: 12px;
  }
  
  .mode-switch {
    min-width: auto;
  }
  
  .practice-card {
    padding: 24px;
    border-radius: 20px;
  }
  
  .prompt {
    font-size: 24px;
  }
  
  .actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .btn {
    min-width: auto;
  }
  
  .answer-input {
    padding: 14px 20px;
    font-size: 16px;
  }
  
  .card-container {
    min-height: 300px;
  }
  
  .progress-info {
    gap: 12px;
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .practice-page {
    padding: 16px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .practice-card {
    padding: 20px;
    border-radius: 16px;
  }
  
  .prompt {
    font-size: 20px;
  }
  
  .answer-input {
    padding: 12px 16px;
    font-size: 14px;
  }
  
  .btn {
    padding: 12px 16px;
    font-size: 13px;
  }
  
  .mode-btn {
    padding: 12px 16px;
    font-size: 13px;
  }
  
  .refresh-btn {
    padding: 12px 16px;
    font-size: 13px;
  }
  
  .session-complete {
    padding: 20px;
  }
  
  .complete-title {
    font-size: 20px;
  }
}
</style>
