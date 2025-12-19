# Intelli-Study · 智习英语学习平台

本项目按照 `PROMPT.md` 中的要求，搭建了一个**NestJS + Prisma + PostgreSQL** 后端和 **Vue 3 + Vite + Pinia** 前端的全栈原型，覆盖注册登录、单词/短语学习、默写练习、学习历史与错词统计等核心流程。

## 仓库结构

```
.
├── backend       # NestJS 服务，包含认证 / 词库 / 练习 / 历史模块
├── frontend      # Vue 3 前端，包含学习、练习、历史页面
├── docs          # 设计文档（如架构总览）
├── docker-compose.yml
├── PROMPT.md     # 业务目标与详细需求
└── README.md
```

## 快速开始

```bash
# 安装所有 workspace 依赖并初始化 husky
npm install

# 启动后端（开发模式）
cd backend && npm run start:dev

# 启动前端（开发模式）
cd ../frontend && npm run dev
```

后端默认监听 `http://localhost:3000` 并开启 Swagger (`/docs`)，前端默认运行在 `http://localhost:5173`。

## Docker 一键启动

```bash
docker compose up --build
```

将启动：
- `db`: PostgreSQL 15
- `backend`: NestJS 服务
- `frontend`: 构建后的 Vite 静态站点（通过 `serve` 提供）

## 测试

```bash
# 后端单元测试
cd backend && npm run test

# 后端 e2e
npm run test:e2e

# 前端组件测试
cd ../frontend && npm run test
```

## 代码规范

- ESLint + Prettier：前后端均配置完成。
- Git Hooks：根目录 `.husky/pre-commit` 会在提交前执行 `npm run lint`（即前后端 lint）。
- 提交前请确保 `npm test` 全部通过，以满足 PROMPT 中的测试覆盖指标。

## 当前最新codex流程
- codex resume 019ae237-7854-7670-a815-eee76d3e0614