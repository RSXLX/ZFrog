# WalletConnect 测试指南

## 📋 测试清单

### 1. 环境准备
- [ ] 安装 MetaMask 或其他支持的钱包插件
- [ ] 确保 `.env` 文件中配置了 `VITE_WALLETCONNECT_PROJECT_ID`
- [ ] 启动前端开发服务器

### 2. 基础连接测试
- [ ] 点击"连接钱包"按钮
- [ ] 选择 MetaMask 连接
- [ ] 确认连接请求
- [ ] 验证地址显示正确
- [ ] 验证余额显示

### 3. 链切换测试
- [ ] 如果不在 ZetaChain，点击"切换到 ZetaChain"按钮
- [ ] 确认链切换请求
- [ ] 验证链 ID 显示为 7001
- [ ] 验证余额货币显示为 ZETA

### 4. WalletConnect 测试
- [ ] 断开当前连接
- [ ] 再次点击"连接钱包"
- [ ] 选择 WalletConnect 选项
- [ ] 使用手机钱包扫描二维码
- [ ] 在手机上确认连接
- [ ] 验证桌面应用显示连接状态

### 5. 会话持久化测试
- [ ] 连接钱包后刷新页面
- [ ] 验证会话自动恢复
- [ ] 验证地址和余额信息正确显示
- [ ] 测试断开连接功能

### 6. 交易测试
- [ ] 尝试铸造青蛙（如果有合约地址）
- [ ] 验证交易状态提示
- [ ] 确认交易在钱包中显示
- [ ] 验证交易成功后的状态更新

## 🔧 故障排除

### 常见问题

1. **连接失败**
   - 检查钱包插件是否安装
   - 检查钱包是否已解锁
   - 检查网络连接

2. **链切换失败**
   - 确保 ZetaChain 配置正确
   - 检查 RPC URL 是否可用
   - 手动添加 ZetaChain 到钱包

3. **WalletConnect 无法连接**
   - 检查 Project ID 是否正确
   - 检查手机钱包是否支持 WalletConnect
   - 确保二维码扫描成功

4. **会话丢失**
   - 检查 localStorage 是否被清除
   - 检查会话有效期设置
   - 重新连接钱包

## 📱 测试步骤

### 使用 MetaMask 测试
1. 安装 MetaMask 浏览器插件
2. 创建或导入钱包
3. 切换到 ZetaChain Athens Testnet
4. 访问应用并连接钱包

### 使用 WalletConnect 测试
1. 在手机上安装支持 WalletConnect 的钱包（如 MetaMask Mobile）
2. 在桌面浏览器中访问应用
3. 选择 WalletConnect 连接方式
4. 用手机钱包扫描二维码
5. 在手机上确认连接

## 🧪 自动化测试

运行测试页面：
```bash
# 在浏览器中打开
open frontend/wallet-test.html

# 或使用简单服务器
cd frontend
python -m http.server 8080
# 访问 http://localhost:8080/wallet-test.html
```

## ✅ 验收标准

- [ ] 钱包连接成功，显示正确地址和余额
- [ ] 支持链切换到 ZetaChain
- [ ] WalletConnect 二维码正常显示和扫描
- [ ] 会话在页面刷新后保持
- [ ] 交易状态正确提示
- [ ] 错误处理友好显示
- [ ] UI 响应式设计正常

## 📊 测试报告

测试完成后，请记录：
- 测试环境（浏览器、钱包版本）
- 遇到的问题和解决方案
- 功能正常性确认
- 性能和用户体验评价