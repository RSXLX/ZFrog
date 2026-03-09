# 🧪 ZFrog 测试指南

## 📋 测试环境设置

### 1. 安装依赖

```bash
# 进入测试目录
cd /Users/sxlx/.gemini/antigravity/ZFrog/test

# 安装测试依赖
npm install

# 或使用 yarn
yarn install
```

### 2. 配置测试环境

```bash
# 复制示例配置文件
cp .env.test.example .env.test

# 编辑 .env.test 文件，填入你的测试配置
# 重要：使用测试网钱包，不要用在主网！
nano .env.test
```

### 3. 配置测试钱包

1. **创建测试钱包** (使用 Metamask)
   - 切换到 ZetaChain Athens 测试网
   - 创建新钱包地址
   - 导出私钥 (0x开头)

2. **获取测试代币**
   - 访问 [ZetaChain Athens Faucet](https://labs.zetachain.com/athens/claim)
   - 输入你的测试地址
   - 领取 ZETA 测试代币

3. **配置私钥**
   ```bash
   # 在 .env.test 中设置
   TEST_PRIVATE_KEY=0x你的私钥
   TEST_WALLET_ADDRESS=0x你的地址
   ```

## 🚀 运行测试

### 运行所有测试

```bash
npm test
```

### 运行特定测试文件

```bash
# 核心功能测试
npm test TravelSystem.test.ts

# 合约测试
npm test TravelRouter.test.ts

# 徽章系统测试
npm test BadgeSystem.test.ts
```

### 运行特定测试用例

```bash
# 使用测试名称匹配
npm test -- -t "应该能够开始单次旅行"
```

### 调试模式

```bash
# 使用 Node 调试器
node --inspect-brk node_modules/.bin/jest --runInBand

# 在 VS Code 中设置断点并调试
```

## 📝 测试报告

### 生成覆盖率报告

```bash
npm run test:coverage
```

报告将生成在 `coverage/` 目录，包含:
- HTML 报告: `coverage/lcov-report/index.html`
- LCOV 报告: `coverage/lcov.info`

### 生成测试报告

```bash
npm run test:report
```

## 🔧 常见问题

### 1. 测试超时

```bash
# 增加超时时间
npm test -- --testTimeout=60000
```

### 2. Gas 价格太高

```bash
# 在 .env.test 中设置最大 Gas 价格
MAX_GAS_PRICE=50  # 50 Gwei
```

### 3. 测试网连接失败

```bash
# 检查网络连接
curl -X POST https://zetachain-athens.g.allthatnode.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 4. 私钥错误

```bash
# 验证私钥格式 (应该是 66 字符: 0x + 64 十六进制)
echo "0x..." | wc -c  # 应该输出 67 (包括换行符)
```

## 🛡️ 安全注意事项

⚠️ **重要警告**:

1. **永远不要使用主网钱包**
   - 仅使用测试网钱包
   - 确保钱包内只有测试代币

2. **保护私钥**
   - 永远不要提交 `.env.test` 到 Git
   - 使用 `.gitignore` 忽略敏感文件
   - 定期更换测试钱包

3. **合约安全**
   - 测试环境仅部署到测试网
   - 生产环境需要完整审计

## 📚 相关文档

- [Hardhat 文档](https://hardhat.org/docs)
- [Jest 文档](https://jestjs.io/docs/getting-started)
- [Ethers.js 文档](https://docs.ethers.io/v5/)
- [ZetaChain 文档](https://www.zetachain.com/docs/)

## 🤝 贡献

发现 Bug 或有改进建议？欢迎提交 Issue 或 PR！

---

**🎉 准备好开始测试了吗？** 按照上面的步骤配置环境，然后运行 `npm test` 开始吧！
