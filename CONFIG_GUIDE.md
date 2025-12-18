# ZetaFrog MVP 环境配置说明

本文档列出所有需要您手动配置的环境变量和服务。

---

## 1. 数据库配置

### PostgreSQL 数据库
后端需要 PostgreSQL 数据库来存储青蛙、旅行和纪念品数据。

**配置位置**: `backend/.env`

```env
DATABASE_URL="postgresql://用户名:密码@主机:端口/数据库名"
```

**示例**:
```env
DATABASE_URL="postgresql://postgres:password123@localhost:5432/zetafrog"
```

**推荐方案**:
- 本地开发: 安装 PostgreSQL 或使用 Docker
- 生产环境: 使用云服务 (Supabase, Railway, Neon 等)

### Redis (可选)
用于缓存，MVP 阶段可选。

```env
REDIS_URL="redis://localhost:6379"
```

---

## 2. 区块链配置

### 部署私钥
用于部署合约和后端调用合约。

**配置位置**: 
- `contracts/.env` - PRIVATE_KEY
- `backend/.env` - RELAYER_PRIVATE_KEY

```env
PRIVATE_KEY=0x你的私钥 (不要加引号)
RELAYER_PRIVATE_KEY=0x你的私钥
```

> ⚠️ **安全警告**: 请使用测试钱包的私钥，不要使用持有大量资产的钱包！

### ZetaChain RPC
已为您预配置:
```env
ZETACHAIN_RPC_URL=https://zetachain-athens.g.allthatnode.com/archive/evm
```

### Alchemy API (用于观察以太坊钱包)
后端需要 Alchemy API 来查询以太坊链上数据。

**获取方式**: https://dashboard.alchemy.com/

```env
ALCHEMY_ETH_URL=https://eth-mainnet.g.alchemy.com/v2/你的API_KEY
```

---

## 3. 合约地址

部署合约后，需要填入合约地址:

**配置位置**: 
- `backend/.env`
- `frontend/.env`

```env
# backend/.env
ZETAFROG_NFT_ADDRESS=0x部署后的地址
SOUVENIR_NFT_ADDRESS=0x部署后的地址

# frontend/.env
VITE_ZETAFROG_ADDRESS=0x部署后的地址
VITE_SOUVENIR_ADDRESS=0x部署后的地址
```

---

## 4. AI 服务 (Qwen API)

已为您预配置 Qwen API:

```env
QWEN_API_KEY=sk-2187504e07634f55b932c231d9ebd091
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
```

---

## 5. IPFS 服务 (Pinata)

用于存储旅行日记元数据到 IPFS。

**获取方式**: https://www.pinata.cloud/

```env
PINATA_API_KEY=你的Pinata_API_Key
PINATA_SECRET_KEY=你的Pinata_Secret_Key
```

> 💡 MVP 阶段如果不配置 Pinata，系统会使用模拟的 IPFS hash，不影响测试。

---

## 6. WalletConnect (前端可选)

用于支持更多钱包连接方式。

**获取方式**: https://cloud.walletconnect.com/

```env
VITE_WALLETCONNECT_PROJECT_ID=你的Project_ID
```

---

## 快速配置清单

### 必须配置 ✅

| 配置项 | 位置 | 说明 |
|--------|------|------|
| DATABASE_URL | backend/.env | PostgreSQL 连接 |
| PRIVATE_KEY | contracts/.env | 部署合约用 |
| RELAYER_PRIVATE_KEY | backend/.env | 后端调用合约用 |
| 合约地址 | backend/.env, frontend/.env | 部署后填写 |

### 可选配置 ⭕

| 配置项 | 位置 | 说明 |
|--------|------|------|
| ALCHEMY_ETH_URL | backend/.env | 观察以太坊钱包活动 |
| PINATA_API_KEY | backend/.env | IPFS 存储 |
| VITE_WALLETCONNECT_PROJECT_ID | frontend/.env | 更多钱包支持 |

---

## 启动顺序

1. ✅ 配置 `contracts/.env` 
2. ✅ 部署合约 `npx hardhat run scripts/deploy.js --network zetaAthens`
3. ✅ 记录合约地址
4. ✅ 配置 `backend/.env` (填入合约地址和数据库)
5. ✅ 运行 `npx prisma db push` 创建数据库表
6. ✅ 配置 `frontend/.env` (填入合约地址)
7. ✅ 启动后端 `npm run dev`
8. ✅ 启动前端 `npm run dev`
