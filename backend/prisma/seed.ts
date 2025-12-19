import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultSource = await prisma.lexiconSource.upsert({
    where: { name: '默认词库' },
    update: {},
    create: {
      name: '默认词库',
      description: '示例词库，包含基础单词与短语'
    }
  });

  await prisma.word.upsert({
    where: { text: 'apple' },
    update: {},
    create: {
      text: 'apple',
      translation: '苹果',
      partOfSpeech: 'n.',
      example: 'I eat an apple every morning.',
      sourceId: defaultSource.id
    }
  });

  await prisma.word.upsert({
    where: { text: 'persist' },
    update: {},
    create: {
      text: 'persist',
      translation: '坚持，持续',
      partOfSpeech: 'v.',
      example: 'You must persist in practicing English every day.',
      sourceId: defaultSource.id
    }
  });

  await prisma.phrase.upsert({
    where: { text: 'by heart' },
    update: {},
    create: {
      text: 'by heart',
      translation: '熟记于心',
      examples: ['You should learn the new words by heart.'],
      sourceId: defaultSource.id
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
