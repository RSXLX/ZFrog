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
│   │   │   ├── friends.routes.ts    # 好友系统 API
│   │   │   ├── frog.routes.ts       # 青蛙管理 API
│   │   │   ├── nft-image.routes.ts  # NFT 图片生成 API
│   │   │   ├── travel.routes.ts     # 旅行系统 API
│   │   │   └── health.routes.ts     # 健康检查 API
│   │   ├── services/                # 核心服务
│   │   │   ├── dashscope-image.service.ts    # AI 图片生成
│   │   │   ├── ipfs-uploader.service.ts      # IPFS 上传
│   │   │   ├── nft-image-orchestrator.service.ts # NFT 图片编排
│   │   │   └── observer.service.ts           # 区块链观察
│   │   ├── workers/                 # 后台任务
│   │   ├── websocket/               # WebSocket 实时通信
│   │   └── config/                  # 配置文件
│   ├── scripts/                     # 测试脚本
│   └── prisma/
│       └── schema.prisma            # 数据库模型
│
└── frontend/                 # 前端应用 (React + Vite + Tauri)
    ├── src/
    │   ├── components/              # React 组件
    │   │   ├── frog/               # 青蛙相关组件
    │   │   ├── travel/             # 旅行相关组件
    │   │   ├── wallet/             # 钱包相关组件
    │   │   └── common/             # 通用组件
    │   ├── pages/                   # 页面
    │   │   ├── Home.tsx             # 首页
    │   │   ├── Friends.tsx          # 好友页面
    │   │   ├── FrogDetail.tsx       # 青蛙详情
    │   │   ├── MyFrogs.tsx          # 我的青蛙
    │   │   └── Desktop.tsx          # 桌面宠物
    │   ├── hooks/                   # 自定义 Hooks
    │   ├── services/                # API 服务
    │   └── stores/                  # 状态管理
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

# 前端测试
cd frontend
npm run test              # 运行前端测试
npm run test:e2e          # 端到端测试
```

### 测试覆盖率

- 好友系统: 95%+
- 旅行系统: 90%+
- NFT 生成: 85%+

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

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📝 更新日志

### v2.0.0 (最新)
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