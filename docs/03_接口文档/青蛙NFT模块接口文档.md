---
status: 已审核
version: 1.0
last_updated: 2026-01-14
reviewer: AI (根据实际代码检查)
---

# 青蛙 NFT 模块接口文档

## 一、接口概览

| 分类 | 接口 | 方法 | 路径 |
|------|------|------|------|
| 青蛙 | 获取详情 | GET | `/api/frogs/:tokenId` |
| 青蛙 | 我的青蛙 | GET | `/api/frogs/my/:address` |
| 青蛙 | 地址拥有的青蛙 | GET | `/api/frogs/owner/:address` |
| 青蛙 | 搜索青蛙 | GET | `/api/frogs/search` |
| 青蛙 | 世界在线列表 | GET | `/api/frogs/world-online` |
| 青蛙 | 同步数据 | POST | `/api/frogs/sync` |

---

## 二、青蛙接口

### 2.1 获取青蛙详情

```
GET /api/frogs/:tokenId
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tokenId | number | 是 | 青蛙 Token ID |

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| viewerAddress | string | 否 | 访问者钱包地址，用于判断好友关系 |

**响应**

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "tokenId": 1,
    "name": "小蛙蛙",
    "ownerAddress": "0x1234...5678",
    "birthday": "2026-01-13T08:00:00.000Z",
    "status": "Idle",
    "totalTravels": 5,
    "xp": 280,
    "level": 3,
    "hunger": 85,
    "happiness": 92,
    "imageUrl": "ipfs://...",
    "createdAt": "2026-01-13T08:00:00.000Z",
    "updatedAt": "2026-01-14T09:00:00.000Z",
    "travels": [
      {
        "id": "travel_001",
        "status": "Completed",
        "targetChain": "BSC_TESTNET",
        "createdAt": "2026-01-14T08:00:00.000Z",
        "journal": {
          "title": "旅行回顾",
          "content": "今天去了BSC链...",
          "mood": "happy",
          "highlights": []
        }
      }
    ],
    "souvenirs": [],
    "friendshipStatus": "None",
    "friendshipId": null
  }
}
```

---

### 2.2 获取我的青蛙 (单钱包单青蛙)

```
GET /api/frogs/my/:address
```

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| address | string | 是 | 钱包地址 (0x开头) |

**响应**

```json
{
  "success": true,
  "data": {
    "id": "clx1234567890",
    "tokenId": 1,
    "name": "小蛙蛙",
    "ownerAddress": "0x1234...5678",
    "birthday": "2026-01-13T08:00:00.000Z",
    "status": "Idle",
    "totalTravels": 5,
    "xp": 280,
    "level": 3,
    "travels": [...],
    "souvenirs": [...]
  }
}
```

**错误响应**

```json
{
  "success": false,
  "error": "No frog found for this address"
}
```

---

### 2.3 获取地址拥有的青蛙

```
GET /api/frogs/owner/:address
```

> 注：由于单钱包单青蛙限制，返回数组通常只有一个元素。

**路径参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| address | string | 是 | 钱包地址 (0x开头) |

**响应**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx1234567890",
      "tokenId": 1,
      "name": "小蛙蛙",
      "ownerAddress": "0x1234...5678",
      "status": "Idle",
      ...
    }
  ]
}
```

---

### 2.4 搜索青蛙

```
GET /api/frogs/search?query=<搜索词>&limit=<数量>
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| query | string | 是 | 搜索关键词 (名称/地址/tokenId) |
| limit | number | 否 | 返回数量限制，默认10，最大50 |

**搜索逻辑**

| query 格式 | 搜索方式 |
|------------|----------|
| `0x...` (10字符以上) | 按钱包地址精确匹配 |
| 纯数字 | 按 tokenId 精确匹配 |
| 其他 | 按名称模糊搜索 |

**响应**

```json
[
  {
    "tokenId": 1,
    "name": "小蛙蛙",
    "ownerAddress": "0x1234...5678",
    "status": "Idle",
    "travels": [...]
  }
]
```

---

### 2.5 获取世界在线青蛙列表

```
GET /api/frogs/world-online?limit=<数量>&offset=<偏移>
```

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| limit | number | 否 | 返回数量，默认20，最大50 |
| offset | number | 否 | 偏移量，默认0 |

**响应**

```json
{
  "success": true,
  "data": [
    {
      "id": "clx1234567890",
      "tokenId": 1,
      "name": "小蛙蛙",
      "ownerAddress": "0x...",
      "status": "Idle",
      "level": 3,
      "xp": 280,
      "isOnline": true,
      "travels": [...]
    }
  ],
  "total": 15
}
```

---

### 2.6 手动同步青蛙数据

```
POST /api/frogs/sync
```

**请求体**

```json
{
  "tokenId": 1
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| tokenId | number | 是 | 要同步的青蛙 Token ID |

**成功响应**

```json
{
  "success": true
}
```

**失败响应**

```json
{
  "error": "Frog not found on chain or sync failed"
}
```

---

## 三、智能合约接口

### 3.1 写入函数

| 函数 | 说明 | 权限 |
|------|------|------|
| `mintFrog(string name)` | 铸造新青蛙 | 公开（每钱包限1只） |
| `setFrogStatus(uint256, FrogStatus)` | 设置青蛙状态 | 仅旅行合约 |
| `addExperience(uint256, uint256)` | 增加经验值 | 仅旅行合约 |
| `setTravelContract(address)` | 设置旅行合约 | 仅合约Owner |
| `emergencyResetFrogStatus(uint256)` | 紧急重置状态 | 仅合约Owner |
| `pause()` / `unpause()` | 暂停/恢复合约 | 仅合约Owner |

### 3.2 只读函数

| 函数 | 说明 | 返回值 |
|------|------|--------|
| `getFrog(uint256 tokenId)` | 获取青蛙完整数据 | (name, birthday, totalTravels, status, xp, level) |
| `getFrogStatus(uint256 tokenId)` | 获取青蛙状态 | FrogStatus |
| `getTokenIdByOwner(address)` | 根据地址获取TokenId | uint256 |
| `hasFrog(address)` | 检查是否拥有青蛙 | bool |
| `hasMinted(address)` | 检查是否已铸造 | bool |
| `totalSupply()` | 获取总供应量 | uint256 |
| `ownerOf(uint256)` | 获取NFT所有者 | address |

---

## 四、数据类型

### 4.1 FrogStatus (青蛙状态)

| 值 | 说明 |
|------|------|
| `Idle` | 空闲状态，可以开始新旅行 |
| `Traveling` | 本地旅行中 |
| `CrossChainLocked` | 跨链旅行锁定中 |

### 4.2 friendshipStatus (好友关系)

| 值 | 说明 |
|------|------|
| `None` | 无关系 |
| `Pending` | 待确认 |
| `Accepted` | 已成为好友 |
| `Rejected` | 已拒绝 |

---

## 五、事件 (智能合约)

| 事件 | 参数 | 说明 |
|------|------|------|
| `FrogMinted` | (owner, tokenId, name, timestamp) | 青蛙铸造成功 |
| `FrogStatusUpdated` | (tokenId, status) | 状态变更 |
| `LevelUp` | (tokenId, newLevel, timestamp) | 青蛙升级 |

---

## 六、错误码

| HTTP | code | 说明 |
|------|------|------|
| 400 | INVALID_TOKEN_ID | 无效的 Token ID |
| 400 | SEARCH_QUERY_REQUIRED | 搜索关键词必填 |
| 400 | TOKEN_ID_REQUIRED | Token ID 必填 |
| 404 | FROG_NOT_FOUND | 青蛙不存在 |
| 404 | NO_FROG_FOR_ADDRESS | 该地址没有青蛙 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
| 500 | SYNC_FAILED | 同步失败 |

---

## 七、变更记录

| 日期 | 内容 |
|------|------|
| 2026-01-14 | 初始版本 |
