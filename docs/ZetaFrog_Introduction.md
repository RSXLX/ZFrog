# ZetaFrog 项目介绍

**ZetaFrog** 是一款基于 **ZetaChain** 全链互操作性构建的 Web3 桌面宠物应用。它结合了 **AI 智能交互**、**跨链探索机制** 与 **社交养成玩法**，旨在为用户提供一个连接多链生态的智能伴侣。

---

## 核心愿景 (Core Vision)

ZetaFrog 不仅仅是一个 NFT 头像，它是一个**活在区块链上的数字生命**。
- **全链漫游**：利用 ZetaChain 的 Omnichain 能力，青蛙可以真正“穿越”到这一条条区块链（如 Ethereum, BSC, Polygon 等）进行旅行，带回当地的特产（Tokens/NFTs）和见闻。
- **AI 赋能**：每只青蛙拥有独特的性格（哲学家、段子手等），能根据链上数据生成独特的旅行日记，并与主人进行深度对话。
- **更轻的 Web3 入口**：以桌面宠物（Desktop Pet）的形式存在，降低用户进入 Web3 的心理门槛，随时陪伴。

---

## 技术架构 (Technical Architecture)

项目采用现代化的全栈架构，深度整合 Web3 与 AI 技术。

### 1. 智能合约层 (Smart Contracts)
- **部署网络**: ZetaChain Athens Testnet (主网准备中)
- **核心合约**:
    - `ZetaFrogNFT.sol`: 核心 ERC721 合约，实现了单钱包单青蛙（One Frog Per Wallet）机制，维护青蛙的成长属性（等级、XP、性格）。
    - `OmniTravel.sol`: 跨链旅行控制器。基于 **ZetaChain Gateway** 构建，利用 ZRC20 进行跨链 Gas 支付。支持用户支付 ZETA，自动兑换为目标链 Gas (如 BNB, ETH)，实现无缝跨链交互。
    - `FrogConnector.sol`: 辅助连接器（历史版本或特定桥接逻辑）。

### 2. 后端服务 (Backend Service)
- **框架**: Node.js + Express + TypeScript
- **数据库**: PostgreSQL (Prisma ORM)
- **AI 引擎**: 集成 OpenAI API，用于生成旅行日记、对话回复、纪念品图片（Odos/Stable Diffusion）。
- **实时通信**: Socket.IO 实现前端与后端的实时状态同步（即使在跨链漫游时）。
- **任务调度**: 负责监听链上事件、触发定时跨链任务、处理超时回滚等。

### 3. 前端应用 (Frontend App)
- **框架**: React + Vite + TypeScript
- **跨平台**: 支持 Web 端访问，并配置了 Tauri 以构建桌面端应用。
- **交互设计**: 使用 Framer Motion 实现丝滑的 UI 动画。
- **Web3 集成**: Wagmi + Viem + Web3Modal，支持多钱包连接。
- **状态管理**: Zustand + React Query。

---

## 核心功能 (Key Features)

### 🐸 1. 青蛙养成系统 (Frog Cultivation)
- **唯一性**: 每个钱包限制拥有一只青蛙，确保情感连接。
- **成长体系**: 通过旅行积累 XP 升级，解锁更多功能。
- **性格系统**: 包含 哲学家、段子手、诗人、八卦蛙 等性格，决定对话风格和日记内容。

### ✈️ 2. 全链旅行 (Omnichain Travel)
- **真实跨链**: 青蛙可以前往 BSC Testnet, ETH Sepolia 等目标链。
- **物资补给**: 旅行需要消耗“干粮”（ZETA），系统自动计算跨链所需的 Gas 费用。
- **探索发现**:
    - **区块探索**: 随机发现目标链上的交易、合约交互。
    - **带回纪念品**: 有几率获得跨链 NFT 纪念品 (Souvenir)。

### 🏠 3. 家园与社交 (Homestead & Social)
- **家园系统**: 用户可以购买装饰品（家具、植物）布置青蛙的庭院和室内。
- **好友互动**:
    - **串门**: 拜访好友的家园，查看对方青蛙状态。
    - **留言板**: 在好友家留下签名或 Gift。
    - **结伴旅行**: 邀请好友的青蛙一起跨链旅行，增加收益。
- **足迹 (Footprints)**: 在链上留下永久的互动记录。

### 🤖 4. AI 智能交互 (AI Intelligence)
- **智能对话**: 支持自然语言聊天，识别意图（查询资产、开始旅行、讲笑话等）。
- **生成式内容**: 每次旅行归来，AI 根据链上数据（Gas 费、区块高度、交易量）生成一篇独一无二的旅行日记。

---

## 目录结构 (Directory Structure)

```
zetaFrog/
├── backend/            # 后端服务 (NestJS/Express)
│   ├── prisma/         # 数据库模型定义 (Schema)
│   ├── src/
│   │   ├── services/   # 业务逻辑 (AI, Intent, Travel)
│   │   └── ...
├── frontend/           # 前端应用 (React/Vite)
│   ├── src/
│   │   ├── components/ # UI 组件
│   │   ├── hooks/      # 自定义 Hooks (useMyFrog 等)
│   │   └── ...
├── contracts/          # 智能合约 (Hardhat/Foundry)
│   ├── contracts/      # Solidity 源码
│   └── scripts/        # 部署与升级脚本
├── desktop_pet/        # 桌面端相关资源
└── docs/               # 项目文档
```

---

*生成时间: 2026-01-08*
