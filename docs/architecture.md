# Intelli-Study 架构概览

## 分层结构
- `apps/backend`: NestJS + Prisma + PostgreSQL/MySQL，可通过 `.env` 切换。
- `apps/frontend`: Vue 3 + Vite + Pinia + Vue Router，主要通过 REST 调后端。
- `packages/shared`: 复用的类型定义（DTO/接口枚举）。
- `infra`: Dockerfile、docker-compose、数据库初始化脚本。

## 核心域模块（后端）
1. `auth`
   - 注册、登录、JWT 鉴权、重置密码邮件占位。
2. `lexicon`
   - 单词/短语词库管理、掌握/生词本标记、发音链接字段。
3. `practice`
   - 默写/听写会话、错误次数统计、提示控制。
4. `history`
   - 用户学习历史、错词统计查询。
5. `logging`
   - 使用 Nest 内置 `Logger` + 拦截器写入。

## 数据库实体（Prisma）
- `User`、`PasswordResetToken`、`Word`, `Phrase`, `UserWordProgress`, `PracticeSession`, `PracticeAttempt`。
- 预留词库导入表 `LexiconSource`，满足 OQ-1。

## 前端路由草图
1. `/auth` 登录/注册/忘记密码。
2. `/learn`
   - `/:type(words|phrases)` 选择词库 -> 卡片模式学习。
3. `/practice`
   - `dictation` 听写、`typing` 中文提示默写。
4. `/history`
   - 时间线 + 错题列表。
5. `/settings`
   - 语速、语音、个人资料。

## 日志与监控
- 所有写操作通过 Nest 拦截器记录：`userId`、资源、结果。
- 预留 Winston 传输到文件/控制台。

## 安全与性能
- bcrypt 哈希；JWT 守卫；DTO 校验。
- 单词卡接口分页 + Redis 预留（通过缓存服务接口）。

## 测试策略
- `apps/backend/test` 使用 Jest：单元 + e2e。
- `apps/frontend/tests` 使用 Vitest + Playwright（E2E）。

## 打包与部署
- Docker multi-stage：Node 20-alpine。
- docker-compose 启动 backend、frontend、db、pgadmin。
