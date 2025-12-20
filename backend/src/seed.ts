import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. 创建默认词库来源
  const defaultSource = await prisma.lexiconSource.upsert({
    where: { name: '默认词库' },
    update: {},
    create: {
      name: '默认词库',
      description: '系统默认的英语词库',
      type: 'SYSTEM'
    }
  });
  console.log('✅ Created default lexicon source');

  // 2. 创建一些示例单词
  const sampleWords = [
    {
      text: 'hello',
      phonetic: '/həˈləʊ/',
      partOfSpeech: 'interjection',
      translation: '你好',
      example: 'Hello, how are you?',
      audioUrl: 'https://example.com/audio/hello.mp3',
      sourceId: defaultSource.id
    },
    {
      text: 'world',
      phonetic: '/wɜːld/',
      partOfSpeech: 'noun',
      translation: '世界',
      example: 'The world is a beautiful place.',
      audioUrl: 'https://example.com/audio/world.mp3',
      sourceId: defaultSource.id
    },
    {
      text: 'study',
      phonetic: '/ˈstʌdi/',
      partOfSpeech: 'verb',
      translation: '学习',
      example: 'I study English every day.',
      audioUrl: 'https://example.com/audio/study.mp3',
      sourceId: defaultSource.id
    },
    {
      text: 'intelligent',
      phonetic: '/ɪnˈtelɪdʒənt/',
      partOfSpeech: 'adjective',
      translation: '智能的',
      example: 'AI is becoming more intelligent.',
      audioUrl: 'https://example.com/audio/intelligent.mp3',
      sourceId: defaultSource.id
    },
    {
      text: 'language',
      phonetic: '/ˈlæŋɡwɪdʒ/',
      partOfSpeech: 'noun',
      translation: '语言',
      example: 'English is a global language.',
      audioUrl: 'https://example.com/audio/language.mp3',
      sourceId: defaultSource.id
    },
    {
      text: 'practice',
      phonetic: '/ˈpræktɪs/',
      partOfSpeech: 'verb',
      translation: '练习',
      example: 'Practice makes perfect.',
      audioUrl: 'https://example.com/audio/practice.mp3',
      sourceId: defaultSource.id
    },
    {
      text: 'memory',
      phonetic: '/ˈmeməri/',
      partOfSpeech: 'noun',
      translation: '记忆',
      example: 'I have a good memory for words.',
      audioUrl: 'https://example.com/audio/memory.mp3',
      sourceId: defaultSource.id
    },
    {
      text: 'vocabulary',
      phonetic: '/vəˈkæbjələri/',
      partOfSpeech: 'noun',
      translation: '词汇',
      example: 'Expanding your vocabulary is important.',
      audioUrl: 'https://example.com/audio/vocabulary.mp3',
      sourceId: defaultSource.id
    },
    {
      text: 'pronunciation',
      phonetic: '/prəˌnʌnsiˈeɪʃn/',
      partOfSpeech: 'noun',
      translation: '发音',
      example: 'Good pronunciation is essential.',
      audioUrl: 'https://example.com/audio/pronunciation.mp3',
      sourceId: defaultSource.id
    },
    {
      text: 'grammar',
      phonetic: '/ˈɡræmər/',
      partOfSpeech: 'noun',
      translation: '语法',
      example: 'Grammar rules can be tricky.',
      audioUrl: 'https://example.com/audio/grammar.mp3',
      sourceId: defaultSource.id
    }
  ];

  for (const word of sampleWords) {
    await prisma.word.upsert({
      where: { text: word.text },
      update: {
        ...word,
        sourceId: defaultSource.id
      },
      create: word
    });
  }
  console.log('✅ Created sample words');

  // 3. 创建一些示例短语
  const samplePhrases = [
    {
      text: 'break a leg',
      translation: '祝你好运',
      examples: ['Break a leg on your performance!', 'I hope you break a leg in your exam.'],
      sourceId: defaultSource.id
    },
    {
      text: 'piece of cake',
      translation: '小菜一碟',
      examples: ['The exam was a piece of cake.', 'Fixing this is a piece of cake for me.'],
      sourceId: defaultSource.id
    },
    {
      text: 'hit the books',
      translation: '用功学习',
      examples: ['I need to hit the books for my test.', 'She hits the books every night.'],
      sourceId: defaultSource.id
    }
  ];

  for (const phrase of samplePhrases) {
    await prisma.phrase.upsert({
      where: { text: phrase.text },
      update: {
        ...phrase,
        sourceId: defaultSource.id
      },
      create: phrase
    });
  }
  console.log('✅ Created sample phrases');

  // 4. 创建一个测试用户
  const hashedPassword = await bcrypt.hash('password123', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      password: hashedPassword
    },
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      displayName: '测试用户'
    }
  });
  console.log('✅ Created test user');

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
