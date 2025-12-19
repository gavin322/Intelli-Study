<template>
  <section class="learn-page">
    <header class="header">
      <div class="header-content">
        <h2 class="page-title">单词学习</h2>
        <p class="page-description">选择词库后开始逐个卡片学习，支持调节语速、标记掌握或加入生词本。</p>
      </div>
      <div class="header-actions">
        <div class="select-wrapper">
          <select 
            v-model="selectedSource" 
            class="source-select"
            @change="onSourceChange"
          >
            <option value="" disabled>选择词库</option>
            <option v-for="src in sources" :key="src.id" :value="src.id">
              {{ src.description }}
            </option>
          </select>
          <div class="select-icon">▼</div>
        </div>
        <button 
          class="btn btn-outline refresh-btn"
          @click="shuffleCurrentWords"
          :disabled="isLoading"
        >
          <span class="btn-icon">🔄</span>
          {{ isLoading ? '刷新中...' : '随机刷新' }}
        </button>
      </div>
    </header>

    <div class="card-container">
      <div 
        class="card" 
        v-if="currentWord"
        :class="{ 'fade-in': currentWord }"
      >
        <div class="card-header">
          <div class="word-info">
            <h3 class="word-text">{{ currentWord.text }}</h3>
            <span class="part-of-speech" v-if="currentWord.partOfSpeech">
              {{ currentWord.partOfSpeech }}
            </span>
            <span class="phonetic" v-if="currentWord.phonetic">
              {{ currentWord.phonetic }}
            </span>
            <span class="word-index">
              {{ currentIndex + 1 }} / {{ allWords.length }}
            </span>
          </div>
          <button 
            class="pronunciation-btn"
            @click="speak(currentWord.text)"
            :disabled="isSpeaking"
          >
            <span class="btn-icon">🔊</span>
            {{ isSpeaking ? '播放中...' : '播放发音' }}
          </button>
        </div>
        
        <div class="card-content">
          <h4 class="content-label">中文翻译</h4>
          <p class="translation">{{ currentWord.translation }}</p>
          
          <h4 class="content-label" v-if="currentWord.example">例句</h4>
          <p class="example" v-if="currentWord.example">{{ currentWord.example }}</p>
        </div>
        
        <div class="card-footer">
          <div class="actions">
            <button 
              class="btn btn-outline"
              @click="prevWord"
              :disabled="currentIndex === 0"
            >
              <span class="btn-icon">←</span>
              上一个
            </button>
            <button 
              class="btn btn-primary btn-mastered"
              @click="markMastered"
              :disabled="mutationLoading"
            >
              <span class="btn-icon">✅</span>
              {{ mutationLoading ? '处理中...' : '掌握' }}
            </button>
            <button 
              class="btn btn-secondary btn-notebook"
              @click="addToNotebook"
              :disabled="mutationLoading"
            >
              <span class="btn-icon">📖</span>
              加入生词本
            </button>
            <button 
              class="btn btn-outline"
              @click="nextWord"
              :disabled="isLoading || mutationLoading || !currentWord"
            >
              {{ currentIndex === allWords.length - 1 ? '下一组' : '下一个' }}
              <span class="btn-icon">→</span>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">📚</div>
        <p class="empty-text">暂无单词数据</p>
        <p class="empty-subtext">请检查是否已登录并导入词库</p>
      </div>
    </div>

    <footer class="pagination">
      <div class="progress-info">
        <span class="progress-text">已学习 {{ learnedCount }} / {{ totalCount }} 个单词</span>
        <div class="progress-bar">
          <div 
            class="progress-fill"
            :style="{ width: progressPercentage + '%' }"
          ></div>
        </div>
        <span class="progress-text" style="font-size: 12px; opacity: 0.85;">
          本组进度：{{ currentIndex + 1 }} / {{ allWords.length }}
        </span>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useQuery } from '@tanstack/vue-query';

import {
  fetchWords,
  updateWordProgress,
  fetchSources,
  markWordLearned,
  fetchLearningStats,
  type LexiconSource
} from '@/services/lexicon.service';

const selectedSource = ref<string>("");
const mutationLoading = ref(false);
const isSpeaking = ref(false);
const isLoading = ref(false);
const currentIndex = ref(0);
const allWords = ref<any[]>([]);
const learnedWords = ref<string[]>([]);
const batchSeq = ref(0);
const statsSeq = ref(0);

const { data: sourceData } = useQuery({
  queryKey: ['lexicon-sources'],
  queryFn: () => fetchSources(),
  staleTime: 1000 * 60 * 5
});

const sources = computed<LexiconSource[]>(() => sourceData.value ?? []);

const { data: learningStatsData } = useQuery({
  queryKey: ['learning-stats', selectedSource, statsSeq],
  queryFn: () => fetchLearningStats(selectedSource.value || undefined),
  enabled: computed(() => !!selectedSource.value)
});

const { data: wordData, refetch: refetchWords } = useQuery({
  queryKey: ['words', selectedSource, batchSeq],
  queryFn: async () => {
    isLoading.value = true;
    try {
      const response = await fetchWords({
        page: 1,
        pageSize: 50, // 每次学习 50 个（学完后自动进入下一组）
        sourceId: selectedSource.value ?? undefined,
        // 关键：只拉取“未学习过”的单词；学过的词会在后端被过滤掉
        onlyUnlearned: true
      });
      return response.data;
    } finally {
      isLoading.value = false;
    }
  },
  enabled: computed(() => !!selectedSource.value)
});

// 监听单词数据变化，自动随机打乱并重置索引
watch(
  () => wordData.value?.items,
  (newItems) => {
    if (newItems && newItems.length > 0) {
      // 随机打乱单词顺序
      allWords.value = shuffleArray([...newItems]);
      currentIndex.value = 0;
      // 清空学习记录
      learnedWords.value = [];
    } else {
      allWords.value = [];
      currentIndex.value = 0;
    }
  },
  { deep: true }
);

const currentWord = computed(() => allWords.value[currentIndex.value]);

// 随机打乱数组的函数
const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// 刷新单词列表，重新随机
const refreshWords = async () => {
  if (!selectedSource.value) return;
  
  isLoading.value = true;
  try {
    await refetchWords();
    // 重新获取数据后已经通过watch自动打乱了
  } finally {
    isLoading.value = false;
  }
};

// 客户端重新随机打乱当前单词列表
const shuffleCurrentWords = () => {
  if (allWords.value.length > 0) {
    allWords.value = shuffleArray([...allWords.value]);
    currentIndex.value = 0;
    learnedWords.value = [];
  }
};

const onSourceChange = () => {
  currentIndex.value = 0;
  allWords.value = [];
  learnedWords.value = [];
  batchSeq.value++;
  statsSeq.value++;
};

// 上一个单词
const prevWord = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

// 下一个单词
const goNextBatch = async () => {
  // 重新拉取“未学单词”的第一页即可：因为学过的词已经被记录在 UserWordProgress 中
  batchSeq.value++;
  currentIndex.value = 0;
  learnedWords.value = [];
  await refetchWords();
};

const nextWord = async () => {
  if (!currentWord.value) return;

  // 只要翻到下一张卡片，就认为“学习过”（即使没有点“掌握/加入生词本”）
  // 这个接口不会影响 mastered/inNotebook，只会留下学习记录
  if (!learnedWords.value.includes(currentWord.value.id)) {
    learnedWords.value.push(currentWord.value.id);
  }
  try {
    await markWordLearned(currentWord.value.id);
    statsSeq.value++;
  } catch (e) {
    // 这里不阻塞学习流程；网络/后端异常时，下一次仍可能看到这个词
    console.warn('标记学习记录失败', e);
  }

  if (currentIndex.value < allWords.value.length - 1) {
    currentIndex.value++;
    return;
  }

  // 当前批次学完，自动进入下一批（仍然只拿未学词）
  await goNextBatch();
};

// 已学习单词数量（来自后端持久化记录）
const learnedCount = computed(() => learningStatsData.value?.learnedCount ?? 0);
const totalCount = computed(() => learningStatsData.value?.totalCount ?? 0);

// 学习进度百分比
const progressPercentage = computed(() => {
  if (!totalCount.value) return 0;
  return Math.round((learnedCount.value / totalCount.value) * 100);
});

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

// 通过浏览器 SpeechSynthesis 演示语音朗读（真实环境可以使用后端返回的音频 URL）
const speak = (text: string) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  
  isSpeaking.value = true;
  const utterance = new SpeechSynthesisUtterance(text);
  
  utterance.onend = () => {
    isSpeaking.value = false;
  };
  
  utterance.onerror = () => {
    isSpeaking.value = false;
  };
  
  window.speechSynthesis.speak(utterance);
};

const mutateProgress = async (payload: { mastered: boolean; inNotebook: boolean }) => {
  if (!currentWord.value) return;
  
  mutationLoading.value = true;
  try {
    await updateWordProgress(currentWord.value.id, payload);
    // 标记为已学习
    if (!learnedWords.value.includes(currentWord.value.id)) {
      learnedWords.value.push(currentWord.value.id);
    }
    // 自动进入下一个单词（这里会同时写入“学习过”的记录）
    await nextWord();
  } catch (error) {
    // 显示错误提示
    console.error('操作失败，请稍后重试');
  } finally {
    mutationLoading.value = false;
  }
};

const markMastered = () => mutateProgress({ mastered: true, inNotebook: false });

const addToNotebook = () => mutateProgress({ mastered: false, inNotebook: true });
</script>

<style scoped>
.learn-page {
  background: #fff;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  max-width: 1200px;
  margin: 0 auto;
}

.learn-page:hover {
  box-shadow: 0 15px 60px rgba(0, 0, 0, 0.12);
}

.header {
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

.card-container {
  margin-bottom: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.card {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  color: #fff;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
  width: 100%;
  max-width: 800px;
  transform: translateY(0);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 25px 70px rgba(59, 130, 246, 0.4);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.word-info {
  flex: 1;
  min-width: 200px;
}

.word-text {
  margin: 0 0 8px 0;
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.part-of-speech {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-right: 12px;
  margin-bottom: 8px;
  backdrop-filter: blur(10px);
}

.phonetic {
  display: inline-block;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
  margin-right: 12px;
}

.word-index {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

.pronunciation-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.pronunciation-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.pronunciation-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.pronunciation-btn .btn-icon {
  font-size: 18px;
}

.card-content {
  margin-bottom: 24px;
  line-height: 1.6;
}

.content-label {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.translation {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.example {
  margin: 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
  font-style: italic;
  background: rgba(255, 255, 255, 0.1);
  padding: 16px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.card-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding-top: 24px;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

/* 上一个和下一个按钮样式 */
.actions .btn-outline {
  flex: 0.8;
  min-width: 100px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.actions .btn-outline:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 中间的主按钮样式 */
.actions .btn-primary,
.actions .btn-secondary {
  flex: 1;
  min-width: 140px;
}

.refresh-btn {
  min-width: 140px;
  padding: 12px 16px;
  height: 44px;
  box-sizing: border-box;
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

.empty-text {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #475569;
}

.empty-subtext {
  margin: 0;
  font-size: 14px;
  color: #94a3b8;
  max-width: 400px;
}

/* 分页样式 */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 24px 0;
  background: #fff;
  border-top: 1px solid #e2e8f0;
  border-radius: 0 0 24px 24px;
}

.progress-info {
  width: 100%;
  max-width: 600px;
}

.progress-text {
  display: block;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 12px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
  transition: width 0.3s ease;
  border-radius: 4px;
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
  min-width: 160px;
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
  background: #34d399;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #22c55e;
  box-shadow: 0 4px 12px rgba(52, 211, 153, 0.3);
}

.btn-secondary {
  background: #f59e0b;
  color: #fff;
}

.btn-secondary:hover:not(:disabled) {
  background: #d97706;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
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

/* 响应式设计 */
@media (max-width: 768px) {
  .learn-page {
    padding: 24px;
    border-radius: 0;
  }
  
  .header {
    margin-bottom: 24px;
  }
  
  .page-title {
    font-size: 24px;
  }
  
  .page-description {
    font-size: 14px;
  }
  
  .card {
    padding: 24px;
    border-radius: 20px;
  }
  
  .word-text {
    font-size: 30px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .pronunciation-btn {
    width: 100%;
    justify-content: center;
  }
  
  .actions {
    flex-direction: column;
    gap: 12px;
  }
  
  .btn {
    min-width: auto;
  }
  
  .card-container {
    min-height: 300px;
  }
  
  .pagination {
    padding: 16px 0;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .learn-page {
    padding: 16px;
  }
  
  .page-title {
    font-size: 20px;
  }
  
  .card {
    padding: 20px;
    border-radius: 16px;
  }
  
  .word-text {
    font-size: 24px;
  }
  
  .translation {
    font-size: 18px;
  }
  
  .example {
    font-size: 14px;
    padding: 12px;
  }
  
  .pagination {
    gap: 8px;
  }
  
  .btn {
    padding: 12px 16px;
    font-size: 13px;
  }
}
</style>
