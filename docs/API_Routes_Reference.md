# ZetaFrog 前后端路由与接口文档

> 生成时间: 2026-01-07

## 目录

1. [前端路由](#前端路由)
2. [后端 API 接口](#后端-api-接口)
   - [青蛙管理 (Frog)](#青蛙管理-frog)
   - [旅行系统 (Travel)](#旅行系统-travel)
   - [跨链旅行 (Cross-Chain)](#跨链旅行-cross-chain)
   - [好友系统 (Friends)](#好友系统-friends)
   - [家园系统 (Garden)](#家园系统-garden)
   - [家园功能 (Homestead)](#家园功能-homestead)
   - [纪念品 (Souvenir)](#纪念品-souvenir)
   - [徽章 (Badge)](#徽章-badge)
   - [聊天 (Chat)](#聊天-chat)
   - [留言 (Message)](#留言-message)
   - [跨链转账 (CrossChain Transfer)](#跨链转账-crosschain-transfer)
   - [NFT 图片 (NFT Image)](#nft-图片-nft-image)
   - [价格 (Price)](#价格-price)
   - [健康检查 (Health)](#健康检查-health)

---

## 前端路由

| 路径 | 组件 | 描述 |
|------|------|------|
| `/` | `Home` | 首页，展示介绍内容和铸造入口 |
| `/my-frog` | `MyFrog` | 我的青蛙页面（自动跳转到青蛙详情） |
| `/frog/:tokenId` | `FrogDetail` | 青蛙详情页面（支持查看他人青蛙） |
| `/friends` | `Friends` | 好友系统页面 |
| `/garden` | `GardenPage` | 我的家园 |
| `/visit/:address` | `GardenPage` | 访问他人家园 |
| `/souvenirs` | `SouvenirsPage` | 我的纪念品 |
| `/badges` | `BadgesPage` | 我的徽章 |
| `/travel/:travelId` | `TravelResultPage` | 旅行结果页面 |
| `/travel-detail/:travelId` | `TravelDetailPage` | 旅行详情页面 |
| `/travel-history` | `TravelHistoryPage` | 旅行历史页面 |
| `/desktop` | `Desktop` | 桌面宠物模式 |
| `/animation-demo` | `AnimationDemoPage` | 动画演示页面 |
| `/home-scene` | `HomeScenePage` | 家园场景页面 |

---

## 后端 API 接口

### 青蛙管理 (Frog)

**路由前缀**: `/api/frogs`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| GET | `/world-online` | 获取世界在线青蛙列表 | `limit`, `offset` | 青蛙列表（含在线状态） |
| GET | `/my/:address` | 获取某地址的唯一青蛙（单钱包单青蛙） | `address` (路径参数) | 青蛙详情 |
| GET | `/search` | 搜索青蛙（按地址/名称/tokenId） | `query`, `limit` | 青蛙列表 |
| GET | `/owner/:address` | 获取某地址拥有的所有青蛙 | `address` (路径参数) | 青蛙列表 |
| GET | `/:tokenId` | 获取青蛙详情 | `tokenId` (路径参数), `viewerAddress` (查询参数，可选) | 青蛙详情（含好友关系状态） |
| POST | `/sync` | 手动同步青蛙数据 | `{ tokenId }` | `{ success: true }` |

---

### 旅行系统 (Travel)

**路由前缀**: `/api/travels`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| GET | `/history` | 获取用户所有旅行历史（分页） | `address`, `frogId` (可选), `limit`, `offset` | 旅行列表（含分页信息） |
| GET | `/stats` | 获取用户旅行统计数据 | `address` | 统计数据（总次数、各链次数等） |
| GET | `/:frogId` | 获取青蛙的旅行历史 | `frogId` (路径参数) | 旅行列表 |
| GET | `/:frogId/active` | 获取青蛙当前进行中的旅行 | `frogId` (路径参数) | 活跃旅行详情 |
| POST | `/group` | 发起结伴旅行 | `{ leaderId, companionId, duration }` | 旅行详情 |

---

### 跨链旅行 (Cross-Chain)

**路由前缀**: `/api/v1/cross-chain`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| GET | `/chains` | 获取支持的链列表 | - | 链列表 |
| GET | `/can-travel/:tokenId` | 检查青蛙是否可以开始跨链旅行 | `tokenId`, `targetChainId` | 可行性检查结果 |
| POST | `/travel` | 创建跨链旅行记录 | `{ frogId, tokenId, targetChainId, duration, ownerAddress }` | 旅行记录 |
| POST | `/travel/:travelId/started` | 更新旅行状态（链上交易确认后） | `{ messageId, txHash }` | 更新结果 |
| POST | `/travel/:tokenId/completed` | 处理跨链旅行完成 | `tokenId` | 完成结果 |
| GET | `/travel/:tokenId/status` | 获取跨链旅行状态 | `tokenId` | 链上状态 |
| GET | `/travel/:tokenId/visiting` | 检查青蛙是否在目标链上 | `tokenId`, `targetChainId` | 访问状态 |
| GET | `/active` | 获取所有活跃的跨链旅行 | - | 活跃旅行列表 |
| POST | `/sync/:tokenId` | 同步数据库与链上状态 | `tokenId` | 同步结果 |
| GET | `/travel/:travelId/discoveries` | 获取旅行发现和链上统计 | `travelId` | 发现详情 |

---

### 好友系统 (Friends)

**路由前缀**: `/api/friends`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| POST | `/request` | 发送好友请求 | `{ requesterId, addresseeId, walletAddress }` | 好友关系 |
| PUT | `/request/:id/respond` | 响应好友请求（接受/拒绝） | `{ status, message }` | 更新后的好友关系 |
| GET | `/list/:frogId` | 获取青蛙的好友列表 | `frogId` (tokenId) | 好友列表（含在线状态） |
| GET | `/requests/:frogId` | 获取青蛙收到的好友请求 | `frogId` (tokenId) | 请求列表 |
| DELETE | `/:friendshipId` | 删除好友关系 | `friendshipId` | 删除结果 |
| POST | `/:friendshipId/interact` | 与好友互动 | `{ actorId, type, message, metadata }` | 互动记录 |

---

### 家园系统 (Garden)

**路由前缀**: `/api/garden`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| GET | `/:frogId` | 获取家园状态 | `frogId` (tokenId) | 家园状态（含访客、装饰等） |
| POST | `/:frogId/visit` | 发送访问请求 | `{ guestFrogId, giftType }` | 访问记录 |
| GET | `/:frogId/visitors` | 获取当前访客列表 | `frogId` | 访客列表 |
| POST | `/:frogId/interact` | 与访客互动 | `{ targetFrogId, type, data }` | 互动结果 |
| POST | `/:frogId/leave` | 访客离开家园 | `{ guestFrogId }` | 离开结果 |
| GET | `/:frogId/messages` | 获取家园留言板 | `frogId` | 留言列表 |

---

### 家园功能 (Homestead)

**路由前缀**: `/api/garden`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| GET | `/:frogId/layout/:sceneType` | 获取布局 | `frogId`, `sceneType` | 布局数据 |
| POST | `/:frogId/layout/:sceneType` | 保存布局 | `{ items, createSnapshot }` | 保存结果 |
| GET | `/:frogId/layout/:sceneType/history` | 获取布局历史 | `limit` | 历史记录 |
| GET | `/:frogId/decorations` | 获取装饰品库存 | `frogId` | 装饰品列表 |
| GET | `/:frogId/decorations/unplaced/:sceneType` | 获取未摆放的装饰品 | - | 装饰品列表 |
| GET | `/:frogId/gifts` | 获取礼物 | `page`, `pageSize` | 礼物列表 |
| POST | `/:frogId/gifts` | 发送礼物 | `{ fromAddress, giftType, itemName, quantity }` | 礼物记录 |
| GET | `/:frogId/photos` | 获取相册 | `page`, `pageSize`, `nftOnly` | 照片列表 |
| POST | `/:frogId/photos` | 添加照片 | 照片数据 | 照片记录 |
| POST | `/:frogId/photos/:photoId/mint` | 铸造照片为 NFT | `{ nftContract, nftTokenId, mintTxHash }` | NFT 记录 |
| GET | `/:frogId/achievements` | 获取成就 | - | 成就列表 |
| POST | `/:frogId/achievements/:achievementId/mint` | 铸造成就为 SBT | `{ sbtTokenId, sbtTxHash }` | SBT 记录 |
| POST | `/:frogId/messages` | 发送带签名的留言 | `{ message, emoji, signature, timestamp, fromAddress }` | 留言记录 |
| POST | `/:frogId/messages/:messageId/tip` | 验证打赏交易并记录 | `{ txHash, tipAmount }` | 更新结果 |

---

### 纪念品 (Souvenir)

**路由前缀**: `/api/souvenirs`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| GET | `/` | 获取纪念品列表 | `frogId` 或 `ownerAddress` | 纪念品列表（含图片） |
| GET | `/:frogId` | 获取特定青蛙的所有纪念品 | `frogId` (tokenId) | 纪念品列表 |

---

### 徽章 (Badge)

**路由前缀**: `/api/badges`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| GET | `/` | 获取徽章列表 | `frogId` 或 `ownerAddress` | 徽章列表 |
| GET | `/:frogId` | 获取所有徽章（含解锁状态） | `frogId` (tokenId) | 徽章列表 |
| GET | `/:frogId/unlocked` | 获取已解锁徽章 | `frogId` (tokenId) | 已解锁徽章 |
| GET | `/frog/:frogId/travel` | 获取青蛙的旅行徽章列表 | `frogId` (tokenId) | 徽章列表 |
| GET | `/frog/:frogId/stats` | 获取青蛙的徽章统计 | `frogId` (tokenId) | 统计数据 |

---

### 聊天 (Chat)

**路由前缀**: `/api/chat`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| POST | `/message` | 发送消息给青蛙 | `{ frogId, message, sessionId, ownerAddress }` | AI 响应 |
| GET | `/history/:sessionId` | 获取聊天历史 | `sessionId`, `ownerAddress` | 消息列表 |
| GET | `/sessions` | 获取用户所有会话 | `ownerAddress` | 会话列表 |
| POST | `/session` | 创建新的聊天会话 | `{ frogId, ownerAddress }` | 会话信息 |

---

### 留言 (Message)

**路由前缀**: `/api/messages`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| POST | `/leave` | 留下串门留言 | `{ fromFrogId, toAddress, message, travelId, emoji }` | 留言记录 |
| GET | `/inbox/:address` | 获取收到的留言 | `address`, `limit`, `offset`, `unreadOnly` | 留言列表 |
| POST | `/read/:messageId` | 标记消息为已读 | `messageId` | 更新结果 |
| POST | `/read-all/:address` | 标记所有消息为已读 | `address` | 更新数量 |
| GET | `/sent/:frogId` | 获取青蛙发送的留言 | `frogId`, `limit`, `offset` | 留言列表 |

---

### 跨链转账 (CrossChain Transfer)

**路由前缀**: `/api/crosschain-transfer`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| POST | `/create` | 创建跨链转账记录 | `{ fromFrogId, fromAddress, toAddress, toFrogId, amount, tokenSymbol, sourceChain, targetChain, message }` | 转账记录 |
| POST | `/confirm` | 确认跨链转账 | `{ transferId, cctxHash, status, targetTxHash }` | 更新结果 |
| GET | `/:frogId/history` | 获取转账历史 | `frogId`, `type`, `limit`, `offset` | 转账列表 |
| GET | `/:frogId/stats` | 获取转账统计 | `frogId` | 统计数据 |
| GET | `/:frogId/friends` | 获取可转账好友列表 | `frogId` | 好友列表 |

---

### NFT 图片 (NFT Image)

**路由前缀**: `/api/nft-image`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| POST | `/generate` | 生成纪念品图片 | `{ odosId, travelId, souvenirId, souvenirType, rarity, chainId }` | 生成结果 |
| POST | `/generate-batch` | 批量生成纪念品图片 | `{ items }` | 批量结果 |
| GET | `/status/:souvenirId` | 查询纪念品的生成状态 | `souvenirId` | 状态信息 |
| GET | `/list/:odosId` | 获取某个青蛙的所有图片 | `odosId`, `page`, `limit`, `status` | 图片列表 |
| GET | `/types` | 获取所有纪念品类型 | - | 类型列表 |
| POST | `/retry/:recordId` | 重试失败的生成任务 | `recordId` | 重试结果 |

---

### 价格 (Price)

**路由前缀**: `/api/price`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| GET | `/batch` | 批量获取价格 | `symbols` | 价格列表 |
| GET | `/trending` | 获取热门代币价格 | - | 热门价格列表 |
| GET | `/search/:query` | 搜索代币价格 | `query` | 搜索结果 |
| GET | `/:symbol` | 获取单个代币价格 | `symbol` | 价格信息 |

---

### 健康检查 (Health)

**路由前缀**: `/api/health`

| 方法 | 路径 | 描述 | 请求参数 | 响应 |
|------|------|------|----------|------|
| GET | `/` | 健康检查 | - | `{ status: 'ok', timestamp, service, version }` |
| GET | `/ready` | 就绪检查 | - | `{ ready: true, timestamp }` |

---

## 前端服务层 API 封装

前端 `apiService` 类封装了常用 API 调用：

| 方法 | 描述 |
|------|------|
| `getMyFrog(address)` | 获取某地址的唯一青蛙 |
| `getFrogsByOwner(address)` | 获取某地址拥有的所有青蛙 (deprecated) |
| `getFrogDetail(tokenId, viewerAddress?)` | 获取青蛙详情 |
| `syncFrog(tokenId)` | 手动同步青蛙数据 |
| `getFrogsTravels(frogId)` | 获取青蛙旅行历史 |
| `getTravelHistory(address, frogId?)` | 获取旅行历史 |
| `getSouvenirImageStatus(souvenirId)` | 获取纪念品图片生成状态 |
| `getBadges(frogId?, ownerAddress?)` | 获取徽章 |
| `getSouvenirs(frogId?, ownerAddress?)` | 获取纪念品 |
| `discoverLuckyAddress(chain)` | 发现幸运地址 |
| `startRandomTravel(frogId, targetChain, duration)` | 开始随机探索 |
| `startTargetedTravel(frogId, targetChain, targetAddress, duration)` | 开始指定地址旅行 |
