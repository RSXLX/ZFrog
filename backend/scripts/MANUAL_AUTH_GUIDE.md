# 方案2：前端手动授权指南

如果你不想在后端 .env 中存储 owner 私钥，可以通过前端手动授权。

## 步骤

### 1. 确认你的身份
- 你需要用**合约 owner** 账户（部署合约的账户）连接钱包

### 2. 获取 Relayer 地址
```
Relayer Address: 0x53C1844Af058fE3B3195e49fEC8f97E0a4F87772
```

### 3. 调用合约函数

**选项A: 使用 ZetaScan (区块链浏览器)**
1. 访问 https://athens.explorer.zetachain.com/address/0x8460344d5435D08CaBAE2f1157D355209cb9E7cF
2. 点击 "Contract" -> "Write Contract"
3. 连接你的钱包（owner 账户）
4. 找到 `setTravelManager` 函数
5. 输入参数: `0x53C1844Af058fE3B3195e49fEC8f97E0a4F87772`
6. 点击 "Write" 并确认交易

**选项B: 创建一个临时脚本**
可以创建一个只在本地运行的脚本，不保存私钥到 .env：
```javascript
const { ethers } = require('ethers');
const readline = require('readline');

async function grantPermission() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('输入 owner 私钥 (不会被保存): ', async (privateKey) => {
        // 执行授权逻辑...
        rl.close();
    });
}

grantPermission();
```

## 验证

授权成功后，运行以下命令验证：
```bash
node scripts/check-permissions.js
```

## 注意事项

- owner 账户需要有足够的 ZETA 来支付 gas
- 授权是一次性的，之后 relayer 就可以完成旅行了
