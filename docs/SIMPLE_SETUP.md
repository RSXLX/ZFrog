# ZetaFrog 简化配置说明

## 已完成的配置

### 1. 智能合约
- ✅ 已部署到 ZetaChain Athens 测试网
- ✅ 合约地址已配置到环境变量

### 2. 后端配置
- ✅ 使用 ZetaChain 公共 RPC (免费)
- ✅ 移除了 Alchemy 依赖
- ✅ IPFS 使用模拟方案，无需 Pinata
- ✅ 使用部署合约的私钥作为 relayer

### 3. 前端配置
- ✅ 合约地址已配置
- ✅ WalletConnect 可暂时留空

## 还需要配置的

### 1. 数据库 (必需)
```bash
# 安装 PostgreSQL
# 创建数据库
createdb zetafrog

# 更新 backend/.env 中的 DATABASE_URL
DATABASE_URL="postgresql://username:password@localhost:5432/zetafrog"
```

### 2. 启动项目
```bash
# 后端
cd backend
npm install
npx prisma migrate dev
npm run dev

# 前端
cd frontend
npm install
npm run dev
```

## 简化方案说明

### IPFS 替代方案
- 测试阶段使用模拟 IPFS hash
- 图片存储在本地 `backend/public/images` 目录
- 元数据暂存在数据库中

### RPC 替代方案
- 使用 ZetaChain 公共 RPC
- 测试阶段完全免费
- 生产环境可考虑 Alchemy 或 Infura

### 钱包连接
- 测试阶段可暂时跳过 WalletConnect
- 直接使用 MetaMask 等钱包连接