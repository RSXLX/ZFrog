# 🐸 ZetaFrog MVP

你的跨链桌面宠物 —— 陪伴、探索、连接

## 📦 项目结构

```
FROG/
├── contracts/          # 智能合约 (Hardhat + Solidity)
│   ├── contracts/
│   │   ├── ZetaFrogNFT.sol     # 青蛙 NFT 主合约
│   │   └── SouvenirNFT.sol     # 纪念品 NFT 合约
│   └── scripts/
│       └── deploy.js           # 部署脚本
│
├── backend/            # 后端服务 (Node.js + Express)
│   ├── src/
│   │   ├── config/             # 配置
│   │   ├── services/           # 核心服务
│   │   ├── workers/            # 后台任务
│   │   └── api/routes/         # API 路由
│   └── prisma/
│       └── schema.prisma       # 数据库模型
│
└── frontend/           # 前端应用 (React + Vite)
    └── src/
        ├── components/         # React 组件
        ├── pages/              # 页面
        ├── hooks/              # 自定义 Hooks
        └── stores/             # 状态管理
```

## 🚀 快速开始

### 1. 部署合约

```bash
cd contracts
npm install
cp .env.example .env
# 编辑 .env 填入你的私钥
npx hardhat run scripts/deploy.js --network zetaAthens
```

### 2. 启动后端

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 填入数据库连接和 API Keys
npx prisma generate
npx prisma db push
npm run dev
```

### 3. 启动前端

```bash
cd frontend
npm install
cp .env.example .env
# 编辑 .env 填入合约地址
npm run dev
```

## ⚙️ 需要配置的环境变量

请参考下方的配置说明完成环境变量配置。

## 📄 技术栈

- **合约**: Solidity 0.8.20, Hardhat, OpenZeppelin
- **后端**: Node.js 18+, Express, Prisma, PostgreSQL
- **前端**: React 18, Vite, TailwindCSS, wagmi/viem
- **AI**: Qwen API (阿里云通义千问)
- **链**: ZetaChain Athens Testnet

## 🐸 功能

1. **铸造青蛙** - 创建你的 ZetaFrog NFT
2. **发起旅行** - 派青蛙去观察任意以太坊钱包
3. **AI 日记** - 获得 AI 生成的旅行故事
4. **纪念品** - 收集旅行纪念品 NFT

---

*Built with ❤️ for ZetaChain Hackathon*
