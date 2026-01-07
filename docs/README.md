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

## 🐸 核心功能详解

### 🌍 跨链智能旅行系统

ZetaFrog 的核心功能 —— 让你的青蛙在多条区块链上自由探索:

#### 🎯 多链支持
- **ZetaChain Athens** (7001): 主链,低Gas费大发现
- **Ethereum Sepolia** (11155111): 探索以太坊生态
- **BSC Testnet** (97): 体验 BNB Chain

#### 🔀 两种旅行模式

**1. 定向观察模式**
- 输入任意钱包地址,青蛙会观察该地址的链上活动
- 自动分析交易记录、余额变化、代币持有情况
- 识别大额转账、DeFi 交互、NFT 活动等关键事件

**2. 随机探索模式** 🎲
- 青蛙自动"发现"一个幸运地址(Fallback + Random Selection)
- 探索区块链的"风景":区块高度、时间戳、链上氛围
- 更多惊喜和不确定性,增加游戏乐趣

#### 🤖 AI 驱动的日记生成

**技术实现:**
- 集成阿里云**通义千问 (Qwen-Turbo)** 大模型
- 精心设计的 **Prompt Engineering**:将链上数据转化为故事元素
- 支持 4 种青蛙性格(哲学家、段子手、诗人、八卦蛙),每种性格生成风格不同
- 温度参数 `0.8` 确保创造性和多样性

**生成内容:**
- 📖 旅行日记正文(250-400字,第一人称青蛙视角)
- 🎭 情绪标签(HAPPY/CURIOUS/SURPRISED/PEACEFUL/EXCITED/SLEEPY)
- 📌 发现亮点(2-3个关键见闻)
- 📝 一句话总结(适合分享)

**降级机制:**
- 如果 AI API 失败,使用预设模板生成基础日记
- 确保用户体验的稳定性

#### 🎁 纪念品 NFT 自动生成

每次旅行都会生成独特的纪念品 NFT:

**生成流程:**
1. 根据旅行数据确定纪念品类型和稀有度
2. 使用 **阿里云百炼 (DashScope)** 生成纪念品图片
3. 上传到 **IPFS** (Pinata服务)
4. 链上铸造 `SouvenirNFT`(未来功能)

**稀有度系统:**
- 🤍 Common (普通): 60% 概率
- 💚 Uncommon (罕见): 25% 概率
- 💙 Rare (稀有): 10% 概率
- 💜 Epic (史诗): 4% 概率
- 🧡 Legendary (传说): 1% 概率

**示例纪念品:**
- 链上化石、加密钥匙、智能合约碎片、Gas 瓶子、区块宝石、彩虹桥羽毛...

#### ⏱️ 实时进度追踪

通过 **WebSocket** 实时推送旅行进度:

**旅行阶段:**
1. 🚀 **DEPARTING**: 准备出发
2. 🌈 **CROSSING**: 跨链穿越中(如果是跨链)
3. 🛬 **ARRIVING**: 到达目的地
4. 🔍 **EXPLORING**: 观察数据中
5. 🏠 **RETURNING**: 返程

**实时消息类型:**
- 📢 INFO: 一般信息("青蛙开始观察钱包...")
- 🔍 DISCOVERY: 发现信息("发现了一个巨鲸钱包!")
- 😄 JOKE: 有趣的小段子
- ⚠️ WARNING: 警告信息
- ❌ ERROR: 错误信息

---

### 👥 好友社交系统 V2.0

让 Web3 不再孤单,和朋友一起养蛙!

#### 核心功能

**好友管理:**
- 🔍 通过钱包地址搜索其他用户
- ✉️ 发送/接受/拒绝好友请求
- 📃 查看好友列表,实时显示在线状态
- 🗑️ 删除好友关系

**好友互动:**
- 🏠 **Visit**(串门): 派青蛙去好友家做客
- 🍎 **Feed**(喂食): 给好友的青蛙喂食
- 🎮 **Play**(玩耍): 和好友的青蛙一起玩
- 🎁 **Gift**(送礼): 赠送小礼物
- 💬 **Message**(留言): 留下问候消息

**实时通知 (WebSocket):**
- `friend:requestReceived` - 收到好友请求
- `friend:requestStatusChanged` - 好友请求状态变化
- `friend:onlineStatusChanged` - 好友上线/下线
- `friend:interaction` - 好友互动通知
- `friend:removed` - 好友关系删除

**技术亮点:**
- Prisma 关系查询优化
- WebSocket room 机制(每个青蛙一个 room)
- 互动历史记录持久化

---

### 🎖️ 徽章成就系统

激励用户探索,增强参与感:

#### 徽章类型

**旅行次数徽章:**
- 🎒 **第一次出门**: 完成第一次旅行
- ✈️ **常旅客**: 完成 5 次旅行
- 🌍 **旅行上瘾**: 完成 20 次旅行

**链访问徽章:**
- 🌾 **BSC 游客**: 去 BSC 旅行 3 次
- 💎 **以太坊游客**: 去以太坊旅行 3 次
- ⚡ **ZetaChain 游客**: 去 ZetaChain 旅行 3 次

**跨链徽章:**
- 🌉 **链间旅行者**: 去过 2 条不同的链
- 🌈 **全链旅行家**: 去过所有 3 条链

**稀有发现徽章:**
- 🍀 **幸运儿**: 发现稀有度 4 星以上的纪念品
- 🐋 **观鲸者**: 发现一个巨鲸钱包(余额>1000 ETH)

#### 解锁机制

**自动检测:**
- 每次旅行完成后自动检查徽章解锁条件
- 使用 `FrogTravelStats` 表追踪统计数据
- 支持链级别、全局级别、稀有度级别的条件判断

**通知:**
- 解锁徽章时通过 WebSocket 实时推送
- 前端显示动画效果

---

### 💬 智能对话系统

让你的青蛙不仅仅是宠物,还是智能助手!

#### 对话能力

**意图识别:**
- 🔢 **price_query**: 查询代币价格("ETH 多少钱?")
- 💰 **asset_query**: 查询账户资产("我有多少 ZETA?")
- 🐸 **frog_status**: 查询青蛙状态("我的青蛙怎么样?")
- 🗺️ **travel_info**: 查询旅行信息("上次旅行去了哪?")
- 🚀 **start_travel**: 发起旅行("去以太坊旅行!")
- 💬 **chitchat**: 闲聊
-❓ **help**: 帮助信息
- ❔ **unknown**: 未识别意图

#### 性格系统

每只青蛙有独特的性格,影响对话风格:

1. **🤔 PHILOSOPHER**(哲学家)
   - 深沉、爱思考
   - 回复示例:"呱...生命的意义在于探索未知,就像区块链的去中心化..."

2. **😄 COMEDIAN**(段子手)
   - 吐槽、搞笑
   - 回复示例:"呱呱呱!Gas 费又涨了?这是要让我吃土的节奏啊!"

3. **🌸 POET**(诗人)
   - 浪漫、文艺
   - 回复示例:"那片链上的月光,洒在我旅行的路上..."

4. **👀 GOSSIP**(八卦蛙)
   - 爱打听、爱爆料
   - 回复示例:"嘿!你知道吗?我昨天遇到的那个钱包,居然有1000个ETH!"

#### 技术实现

- 使用通义千问生成自然语言回复
- System Prompt 定义性格特征
- 支持 Fallback 响应,确保稳定性

---

### 🎨 NFT 图片生成与管理

将旅行记忆视觉化:

#### 图片生成流程

1. **生成提示词**
   - 根据纪念品类型、稀有度、链类型生成专业 Prompt
   - 支持负面提示词(Negative Prompt)过滤不想要的元素

2. **调用 AI 图片生成**
   - 使用阿里云**百炼图片生成 API**
   - 参数:`wanx-v1` 模型,分辨率 1024x1024
   - 支持风格预设和随机种子

3. **IPFS 上传**
   - 使用 **Pinata SDK** 上传到 IPFS
   - 生成 `ipfs://` URI 和 Gateway URL
   - 自动生成 NFT 元数据 JSON

4. **数据库记录**
   - `SouvenirImage` 表追踪生成状态
   - 支持重试机制(最多 3 次)
   - 状态机:`PENDING → GENERATING → UPLOADING → COMPLETED`

---

### 🖥️ 桌面宠物体验

基于 **Tauri** 的原生桌面应用:

**特色功能:**
- 🎭 青蛙动画:SVG 动画,支持多种状态表情
- 🖱️ 点击互动:点击青蛙触发对话或动作
- 📢 系统通知:旅行完成、好友消息等
- 🌐 Web + Desktop 双模式:可在浏览器或桌面使用

**状态系统:**
- IDLE (闲置): 眨眼、摇摆
- HAPPY (开心): 跳跃、微笑
- TRAVELING (旅行中): 行走动画
- ANGRY (生气): 瞪眼、不理人
- SCARED (害怕): 躲藏

---

### 🎮 游戏化设计

让 Web3 交互充满乐趣:

**等级系统:**
- 每次旅行获得 XP (经验值)
- XP 累积提升青蛙等级
- 等级公式:`level = floor(sqrt(xp / 100)) + 1`
- 高等级青蛙可解锁特殊功能(未来)

**统计追踪:**
- 总旅行次数
- 各链旅行次数(BSC/ETH/ZETA)
- 总发现数
- 稀有发现数
- 访问的最早区块、最古老日期

**排行榜 (未来功能):**
- 旅行次数排行
- XP 总量排行
- 徽章数量排行
- 好友数排行

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