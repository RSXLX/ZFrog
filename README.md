# 🐸 ZetaFrog - 跨链桌面宠物

你的智能桌面宠物 —— 陪伴、探索、连接、创造

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![ZetaChain](https://img.shields.io/badge/ZetaChain-Athens%20Testnet-blue)](https://zetachain.com/)

## 🎯 项目概述

ZetaFrog 是一个创新的 Web3 桌面宠物应用，结合了 AI、NFT 和社交功能。用户可以铸造自己的青蛙 NFT，让它去探索区块链世界，收集旅行纪念品，结交好友，并通过 AI 生成独特的旅行故事和图片。

---

## 📦 项目结构

```
FROG/
├── contracts/                 # 智能合约 (Hardhat + Solidity)
│   ├── contracts/
│   │   ├── ZetaFrogNFT.sol           # 青蛙 NFT 主合约
│   │   └── SouvenirNFT.sol           # 纪念品 NFT 合约
│   └── scripts/
│       └── deploy.js                 # 部署脚本
│
├── backend/                  # 后端服务 (Node.js + Express)
│   ├── src/
│   │   ├── api/routes/              # API 路由
│   │   │   ├── badge.routes.ts      # 徽章系统 API
│   │   │   ├── friends.routes.ts    # 好友系统 API
│   │   │   ├── frog.routes.ts       # 青蛙管理 API
│   │   │   ├── nft-image.routes.ts  # NFT 图片生成 API
│   │   │   └── travel.routes.ts     # 旅行系统 API
│   │   ├── services/                # 核心服务
│   │   │   ├── ai/                  # AI 服务模块
│   │   │   ├── badge/               # 徽章服务
│   │   │   ├── travel/              # 旅行服务
│   │   │   ├── dashscope-image.service.ts    # AI 图片生成
│   │   │   ├── ipfs-uploader.service.ts      # IPFS 上传
│   │   │   ├── nft-image-orchestrator.service.ts # NFT 图片编排
│   │   │   └── observer.service.ts           # 区块链观察
│   │   ├── workers/                 # 后台任务
│   │   │   ├── eventListener.ts     # 事件监听器
│   │   │   └── travelProcessor.ts   # 旅行处理器
│   │   ├── websocket/               # WebSocket 实时通信
│   │   ├── config/                  # 配置文件
│   │   │   ├── chains.ts            # 链配置
│   │   │   ├── contracts.ts         # 合约配置
│   │   │   └── prompt-templates.ts  # 提示词模板
│   │   └── scripts/                 # 脚本工具
│   ├── scripts/                     # 测试和工具脚本
│   │   ├── check-db-fields.ts       # 数据库字段检查
│   │   ├── seed-badges.ts           # 徽章数据种子
│   │   ├── validate-fields.ts       # 字段验证
│   │   └── verify-db.ts             # 数据库验证
│   └── prisma/
│       ├── schema.prisma            # 数据库模型
│       └── migrations/              # 数据库迁移
│
└── frontend/                 # 前端应用 (React + Vite + Tauri)
    ├── src/
    │   ├── components/              # React 组件
    │   │   ├── badge/               # 徽章组件
    │   │   ├── frog/                # 青蛙相关组件
    │   │   │   ├── AddFriend.tsx    # 添加好友
    │   │   │   ├── FriendInteraction.tsx # 好友交互
    │   │   │   ├── FriendRequests.tsx     # 好友请求
    │   │   │   ├── FriendsList.tsx       # 好友列表
    │   │   │   ├── FrogPet.tsx          # 青蛙宠物
    │   │   │   └── FrogPetAnimated.tsx  # 动画青蛙
    │   │   ├── travel/              # 旅行相关组件
    │   │   │   ├── TravelForm.tsx       # 旅行表单
    │   │   │   ├── TravelJournal.tsx    # 旅行日记
    │   │   │   ├── TravelP0Form.tsx     # P0旅行表单
    │   │   │   ├── TravelResult.tsx     # 旅行结果
    │   │   │   └── TravelStatus.tsx     # 旅行状态
    │   │   ├── wallet/              # 钱包相关组件
    │   │   └── common/              # 通用组件
    │   │       └── Navbar.tsx           # 导航栏
    │   ├── pages/                   # 页面
    │   │   ├── BadgesPage.tsx       # 徽章页面
    │   │   ├── Desktop.tsx          # 桌面宠物
    │   │   ├── Friends.tsx          # 好友页面
    │   │   ├── FrogDetail.tsx       # 青蛙详情
    │   │   ├── Home.tsx             # 首页
    │   │   ├── MyFrogs.tsx          # 我的青蛙
    │   │   ├── SouvenirsPage.tsx    # 纪念品页面
    │   │   ├── TravelDetailPage.tsx # 旅行详情
    │   │   ├── TravelHistoryPage.tsx # 旅行历史
    │   │   └── TravelResultPage.tsx # 旅行结果
    │   ├── hooks/                   # 自定义 Hooks
    │   │   ├── useFriendWebSocket.ts    # 好友WebSocket
    │   │   ├── useFrogData.ts           # 青蛙数据
    │   │   ├── useFrogStatus.ts         # 青蛙状态
    │   │   ├── useTransaction.ts        # 交易处理
    │   │   ├── useWallet.ts             # 钱包管理
    │   │   └── useWebSocket.ts          # WebSocket连接
    │   ├── services/                # API 服务
    │   │   ├── api.ts                # API 接口
    │   │   └── wallet/               # 钱包服务
    │   ├── config/                  # 配置文件
    │   │   ├── chains.ts            # 链配置
    │   │   ├── contracts.ts         # 合约配置
    │   │   ├── wagmi.ts             # Wagmi配置
    │   │   └── web3modal.ts         # Web3Modal配置
    │   ├── stores/                  # 状态管理
    │   │   └── frogStore.ts         # 青蛙状态存储
    │   └── types/                   # 类型定义
    │       └── index.ts             # 主类型文件
    └── src-tauri/                   # Tauri 桌面应用配置
```

---

## 🚀 快速开始

### 📋 环境要求

- Node.js 18+
- PostgreSQL 14+
- Git

### 1. 克隆项目

```bash
git clone https://github.com/RSXLX/ZFrog.git
cd FROG
```

### 2. 部署智能合约

```bash
cd contracts
npm install
cp .env.example .env
# 编辑 .env 填入你的私钥和 RPC URL
npx hardhat run scripts/deploy.js --network zetaAthens
```

### 3. 启动后端服务

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 填入以下配置：
# - DATABASE_URL: PostgreSQL 连接字符串
# - QWEN_API_KEY: 阿里云通义千问 API Key
# - PINATA_API_KEY: IPFS 上传服务 API Key
# - ZETACHAIN_RPC: ZetaChain RPC 端点

npx prisma generate
npx prisma db push
npm run dev
```

### 4. 启动前端应用

```bash
cd frontend
npm install
cp .env.example .env
# 编辑 .env 填入合约地址和其他配置

npm run dev
# 或者启动桌面应用
npm run tauri dev
```

### 🎮 快速启动脚本

Windows 用户可以直接运行：

```bash
start-frontend.bat
```

---

## ⚙️ 环境变量配置

### 后端环境变量 (.env)

```env
# 数据库
DATABASE_URL="postgresql://username:password@localhost:5432/zetafrog"

# AI 服务
QWEN_API_KEY="your_qwen_api_key"
DASHSCOPE_API_KEY="your_dashscope_api_key"

# IPFS 服务
PINATA_API_KEY="your_pinata_api_key"
PINATA_SECRET_API_KEY="your_pinata_secret"

# 区块链
ZETACHAIN_RPC="https://zetachain-athens.blockpi.network/v1/rpc/public"
PRIVATE_KEY="your_private_key"

# JWT
JWT_SECRET="your_jwt_secret"
```

### 前端环境变量 (.env)

```env
# 合约地址
VITE_ZETAFROG_NFT_ADDRESS="0x..."
VITE_SOUVENIR_NFT_ADDRESS="0x..."

# API 端点
VITE_API_URL="http://localhost:3001"
VITE_WS_URL="http://localhost:3001"

# Web3Modal
VITE_WALLETCONNECT_PROJECT_ID="your_project_id"
```

---

## 🐸 核心功能

### 🏠 桌面宠物
- **实时动画**: 青蛙在桌面上的生动表现
- **互动系统**: 点击、喂食、玩耍等互动
- **状态显示**: 饥饿度、心情、疲劳度等状态

### 🎖️ 徽章系统
- **成就徽章**: 完成特定任务获得徽章
- **徽章展示**: 个人徽章墙展示
- **徽章等级**: 不同等级的徽章奖励
- **徽章分享**: 与好友分享徽章成就

### 👥 好友系统 V2.0
- **好友搜索**: 通过钱包地址/ENS 搜索用户
- **好友请求**: 发送和管理好友请求
- **好友互访**: 派青蛙去好友家串门
- **实时通知**: WebSocket 实时推送好友动态

### 🌍 旅行探索
- **跨链观察**: 派青蛙观察任意以太坊钱包
- **AI 日记**: 通义千问生成独特的旅行故事
- **纪念品收集**: 自动生成旅行纪念品 NFT
- **地标系统**: 访问著名的区块链地标
- **P0旅行系统**: 基础随机探索功能
- **跨链交互**: 支持多链旅行和互动

### 🎨 NFT 图片生成
- **AI 图片生成**: 使用阿里云百炼生成独特图片
- **IPFS 存储**: 自动上传到 IPFS 网络
- **模板系统**: 丰富的提示词模板
- **批量处理**: 支持批量生成和处理

### 🎮 游戏化元素
- **等级系统**: 青蛙成长和进化
- **成就系统**: 完成目标获得奖励
- **排行榜**: 好友间的互动排行
- **随机探索**: 基础随机探索功能

---

## 🔧 技术栈

### 区块链层
- **智能合约**: Solidity 0.8.20, Hardhat, OpenZeppelin
- **链**: ZetaChain Athens Testnet
- **钱包**: MetaMask, WalletConnect
- **Web3**: wagmi, viem, Web3Modal

### 后端服务
- **运行时**: Node.js 18+, Express, TypeScript
- **数据库**: PostgreSQL, Prisma ORM
- **实时通信**: Socket.IO
- **AI 服务**: 阿里云通义千问, 百炼图片生成
- **存储**: IPFS, Pinata
- **工具**: Winston 日志, Sharp 图片处理

### 前端应用
- **框架**: React 18, TypeScript
- **构建工具**: Vite
- **样式**: TailwindCSS
- **状态管理**: Zustand
- **路由**: React Router
- **桌面应用**: Tauri
- **动画**: Framer Motion

---

## 📊 API 文档

### 徽章系统 API

```
GET    /api/badges           # 获取徽章列表
POST   /api/badges/earn      # 获得徽章
GET    /api/badges/user/:id  # 获取用户徽章
```

### 好友系统 API

```
GET    /api/friends          # 获取好友列表
POST   /api/friends/request  # 发送好友请求
PUT    /api/friends/accept   # 接受好友请求
DELETE /api/friends/:id      # 删除好友
```

### 旅行系统 API

```
POST   /api/travel/start     # 开始旅行
GET    /api/travel/status    # 获取旅行状态
GET    /api/travel/journal   # 获取旅行日记
POST   /api/travel/visit     # 访问好友
POST   /api/travel/p0        # P0旅行探索
```

### NFT 图片生成 API

```
POST   /api/nft-image/generate  # 生成 NFT 图片
GET    /api/nft-image/status    # 获取生成状态
POST   /api/nft-image/upload    # 上传到 IPFS
```

---

## 🧪 测试

### 运行测试脚本

```bash
# 后端测试
cd backend
npm run test:friends      # 测试好友系统
npm run test:travel       # 测试旅行系统
npm run test:nft-image    # 测试 NFT 图片生成
npm run test:badges       # 测试徽章系统

# 前端测试
cd frontend
npm run test              # 运行前端测试
npm run test:e2e          # 端到端测试
```

### 测试脚本工具

```bash
# 数据库检查
npm run check-db          # 检查数据库状态
npm run verify-db         # 验证数据库完整性

# 合约检查
npm run check-contract    # 检查合约状态

# 旅行系统测试
npm run test-travel       # 测试旅行功能
```

### 测试覆盖率

- 好友系统: 95%+
- 旅行系统: 90%+
- NFT 生成: 85%+
- 徽章系统: 90%+

---

## 📈 部署

### 生产环境部署

1. **合约部署**
```bash
npx hardhat run scripts/deploy.js --network zetaMainnet
```

2. **后端部署**
```bash
npm run build
npm start
```

3. **前端部署**
```bash
npm run build
# 部署到 Vercel/Netlify
```

### Docker 部署

```bash
docker-compose up -d
```

---

## 📚 文档

- [ZetaFrog MVP 完整开发文档](./ZetaFrog%20MVP%20完整开发文档.md)
- [ZetaFrog 徽章系统功能需求文档](./ZetaFrog%20徽章系统功能需求文档.md)
- [ZetaFrog V2.0 好友系统](./ZetaFrog%20V2.0%20好友系统.md)
- [ZetaFrog 旅行系统](./ZetaFrog%20旅行系统.md)
- [ZetaFrog 跨链交互增强方案](./ZetaFrog_跨链交互增强方案.md)
- [ZetaFrog NFT 图片生成功能](./ZetaFrog%20NFT%20图片生成功能.md)
- [配置指南](./CONFIG_GUIDE.md)
- [简单设置指南](./SIMPLE_SETUP.md)

---

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 更新日志

### v2.1.0 (最新)
- ✨ 新增徽章系统
- ✨ 优化旅行系统P0功能
- ✨ 增强跨链交互
- 🔧 完善好友系统V2.0
- 🐛 修复已知问题

### v2.0.0
- ✨ 新增好友系统 V2.0
- ✨ 新增 NFT AI 图片生成
- ✨ 新增桌面宠物功能
- 🔧 优化旅行系统
- 🐛 修复已知问题

### v1.0.0
- 🎉 初始版本发布
- ✨ 基础青蛙 NFT 铸造
- ✨ 旅行系统
- ✨ AI 日记生成

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🔗 相关链接

- [ZetaChain 官网](https://zetachain.com/)
- [智能合约文档](./contracts/README.md)
- [API 文档](./docs/API.md)
- [前端组件文档](./frontend/docs/COMPONENTS.md)

---

## 🐸 团队

Built with ❤️ for ZetaChain Hackathon

- **开发团队**: ZetaFrog Team
- **联系**: [GitHub Issues](https://github.com/RSXLX/ZFrog/issues)

---

*🐸 让你的青蛙开始探索 Web3 世界吧！*