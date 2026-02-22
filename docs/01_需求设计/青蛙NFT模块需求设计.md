---
status: 已审核
version: 1.0
last_updated: 2026-01-13
reviewer: AI
---

# 青蛙 NFT 模块需求设计

## 一、模块概述

青蛙 NFT 是 ZetaFrog 项目的核心资产，每只青蛙都是独特的 ERC-721 代币，拥有独特的外观和属性。

## 二、用户场景

### 2.1 铸造青蛙
- 用户连接钱包后可以铸造新的青蛙 NFT
- 铸造时随机生成青蛙属性和外观
- 需要支付 gas 费用

### 2.2 查看青蛙详情
- 查看青蛙的基本属性（等级、经验值、状态）
- 查看青蛙的外观图片
- 查看青蛙的旅行历史和成就

### 2.3 管理青蛙
- 查看拥有的所有青蛙列表
- 选择当前活跃青蛙
- 青蛙状态管理（饥饿、心情等）

## 三、功能需求

### 3.1 NFT 合约功能
| 功能 | 描述 |
|------|------|
| mint | 铸造新青蛙 |
| transfer | 转移青蛙所有权 |
| tokenURI | 获取青蛙元数据 |
| setTravelContract | 授权旅行合约 |

### 3.2 后端功能
| 功能 | 描述 |
|------|------|
| 同步 NFT 数据 | 监听链上事件，同步到数据库 |
| 缓存元数据 | 缓存青蛙属性和图片 |
| 状态计算 | 计算青蛙当前状态 |

### 3.3 前端功能
| 功能 | 描述 |
|------|------|
| 铸造界面 | 引导用户铸造青蛙 |
| 详情展示 | 展示青蛙完整信息 |
| 列表管理 | 展示用户所有青蛙 |

## 四、数据结构

```typescript
interface Frog {
  tokenId: number;
  owner: string;
  name: string;
  level: number;
  experience: number;
  hunger: number;
  happiness: number;
  imageUrl: string;
  attributes: FrogAttributes;
  createdAt: Date;
}
```

## 五、接口依赖

- 后端路由：`frog.routes.ts`
- 合约：`ZetaFrogNFT.sol`、`ZetaFrogNFTUpgradeable.sol`
- 前端组件：`components/frog/`

## 六、边界条件

- 每个钱包铸造数量限制
- 铸造失败的回滚处理
- 元数据 IPFS 上传失败的处理

---
