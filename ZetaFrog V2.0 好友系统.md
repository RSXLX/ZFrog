# ZetaFrog V2.0 好友系统 - P0 阶段完整开发方案

## 📋 P0 阶段范围定义

### 核心功能清单

| 功能 | 描述 | 用户故事 |
|------|------|----------|
| **好友搜索** | 通过钱包地址/ENS 搜索用户 | 我可以搜索并找到其他 ZetaFrog 用户 |
| **发送请求** | 向目标用户发送好友请求 | 我可以发送好友请求并附加留言 |
| **请求管理** | 接受/拒绝收到的好友请求 | 我可以管理收到的好友请求 |
| **好友列表** | 查看所有好友及其青蛙状态 | 我可以看到好友的青蛙在干什么 |
| **好友互访** | 派青蛙去好友家串门 | 我可以让青蛙去好友家玩 |
| **来访通知** | 收到好友青蛙来访的通知 | 我能知道谁的青蛙来过我家 |

---

## 1. 数据库设计

### 1.1 Prisma Schema

```prisma
// prisma/schema.prisma
// ==================== V2.0 好友系统扩展 ====================

// ============ 好友关系 ============

model Friendship {
  id            String           @id @default(cuid())
  
  // 发起方
  requesterId   String
  requester     User             @relation("FriendshipRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  
  // 接收方
  addresseeId   String
  addressee     User             @relation("FriendshipAddressee", fields: [addresseeId], references: [id], onDelete: Cascade)
  
  // 状态
  status        FriendshipStatus @default(PENDING)
  
  // 元数据
  message       String?          @db.VarChar(200) // 好友请求附言
  source        FriendSource     @default(SEARCH)
  
  // 时间
  requestedAt   DateTime         @default(now())
  respondedAt   DateTime?
  
  // 亲密度 (0-100)
  intimacy      Int              @default(0)
  
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
  
  @@unique([requesterId, addresseeId])
  @@index([requesterId, status])
  @@index([addresseeId, status])
  @@index([status])
}

enum FriendshipStatus {
  PENDING       // 待处理
  ACCEPTED      // 已接受
  REJECTED      // 已拒绝
  BLOCKED       // 已屏蔽
}

enum FriendSource {
  SEARCH        // 搜索添加
  VISITOR       // 访客转好友
  QR_CODE       // 扫码添加
  INVITE_LINK   // 邀请链接
}

// ============ 好友访问 ============

model FriendVisit {
  id              String        @id @default(cuid())
  
  // 访问者
  visitorUserId   String
  visitorUser     User          @relation("VisitsSent", fields: [visitorUserId], references: [id], onDelete: Cascade)
  visitorFrogId   String
  visitorFrog     Frog          @relation("FrogVisitsSent", fields: [visitorFrogId], references: [id], onDelete: Cascade)
  
  // 被访问者
  hostUserId      String
  hostUser        User          @relation("VisitsReceived", fields: [hostUserId], references: [id], onDelete: Cascade)
  hostFrogId      String?
  
  // 好友关系引用
  friendshipId    String
  
  // 访问详情
  activity        VisitActivity @default(CHAT)
  duration        Int           @default(300) // 停留时间(秒)
  
  // 留言
  messageLeft     String?       @db.VarChar(500)
  
  // AI 生成的访问描述
  visitSummary    String?       @db.Text
  
  // 状态
  status          VisitStatus   @default(IN_PROGRESS)
  isRead          Boolean       @default(false)
  
  // 时间
  startedAt       DateTime      @default(now())
  completedAt     DateTime?
  
  createdAt       DateTime      @default(now())
  
  @@index([hostUserId, isRead])
  @@index([visitorUserId])
  @@index([status])
  @@index([startedAt])
}

enum VisitActivity {
  CHAT          // 聊天
  PLAY          // 玩耍
  NAP           // 午睡
  EXPLORE       // 探索家园
}

enum VisitStatus {
  IN_PROGRESS   // 访问中
  COMPLETED     // 已完成
  CANCELLED     // 已取消
}

// ============ User 模型扩展 ============
// 在现有 User 模型中添加以下字段和关联

model User {
  id            String    @id @default(cuid())
  walletAddress String    @unique
  ens           String?   // ENS 域名缓存
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // 现有关联
  frog          Frog?
  travels       Travel[]
  postcards     Postcard[]
  
  // V2.0 好友系统新增
  sentRequests      Friendship[]   @relation("FriendshipRequester")
  receivedRequests  Friendship[]   @relation("FriendshipAddressee")
  visitsSent        FriendVisit[]  @relation("VisitsSent")
  visitsReceived    FriendVisit[]  @relation("VisitsReceived")
  
  // 统计字段
  friendCount       Int            @default(0)
  visitsReceivedCount Int          @default(0)
  
  @@index([walletAddress])
  @@index([ens])
}

// ============ Frog 模型扩展 ============
// 在现有 Frog 模型中添加以下关联

model Frog {
  id            String      @id @default(cuid())
  userId        String      @unique
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 基本信息
  name          String      @db.VarChar(16)
  personality   PersonalityType
  level         FrogLevel   @default(TADPOLE)
  status        FrogStatus  @default(IDLE)
  
  // NFT 信息
  tokenId       String?     @unique
  mintedAt      DateTime?
  
  // 统计
  totalTrips    Int         @default(0)
  totalSouvenirs Int        @default(0)
  
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
  
  // V2.0 好友访问
  visitsSent    FriendVisit[] @relation("FrogVisitsSent")
  
  @@index([tokenId])
  @@index([status])
}

// 确保 FrogStatus 包含 VISITING 状态
enum FrogStatus {
  IDLE          // 在家
  TRAVELING     // 旅行中
  VISITING      // 串门中
  RETURNING     // 返程中
}
```

### 1.2 数据库迁移脚本

```bash
# 生成迁移
npx prisma migrate dev --name add_friend_system_v2

# 如果需要手动 SQL
```

```sql
-- 手动创建索引优化
-- 好友查询优化
CREATE INDEX CONCURRENTLY idx_friendship_accepted_requester 
ON "Friendship" ("requesterId") 
WHERE "status" = 'ACCEPTED';

CREATE INDEX CONCURRENTLY idx_friendship_accepted_addressee 
ON "Friendship" ("addresseeId") 
WHERE "status" = 'ACCEPTED';

CREATE INDEX CONCURRENTLY idx_friendship_pending_addressee 
ON "Friendship" ("addresseeId", "requestedAt" DESC) 
WHERE "status" = 'PENDING';

-- 访问查询优化
CREATE INDEX CONCURRENTLY idx_friend_visit_host_unread 
ON "FriendVisit" ("hostUserId", "startedAt" DESC) 
WHERE "isRead" = false;

CREATE INDEX CONCURRENTLY idx_friend_visit_in_progress 
ON "FriendVisit" ("visitorFrogId") 
WHERE "status" = 'IN_PROGRESS';
```

---

## 2. 后端服务实现

### 2.1 项目结构

```
backend/src/
├── services/
│   └── social/
│       ├── index.ts              # 导出聚合
│       ├── friend.service.ts     # 好友管理服务
│       ├── visit.service.ts      # 互访服务
│       └── friend.types.ts       # 类型定义
│
├── routes/
│   ├── friend.routes.ts          # 好友 API 路由
│   └── visit.routes.ts           # 互访 API 路由
│
├── controllers/
│   ├── friend.controller.ts
│   └── visit.controller.ts
│
├── workers/
│   └── visit.worker.ts           # 访问完成处理
│
├── websocket/
│   └── social.socket.ts          # 社交实时推送
│
└── utils/
    └── ens.ts                    # ENS 解析工具
```

### 2.2 类型定义

```typescript
// src/services/social/friend.types.ts

import { FriendshipStatus, FriendSource, VisitActivity, VisitStatus, FrogStatus, FrogLevel, PersonalityType } from '@prisma/client';

// ============ 好友相关类型 ============

export interface FriendItem {
  friendshipId: string;
  user: {
    id: string;
    walletAddress: string;
    ens: string | null;
  };
  frog: {
    id: string;
    name: string;
    personality: PersonalityType;
    level: FrogLevel;
    status: FrogStatus;
    avatarUrl: string;
  } | null;
  intimacy: number;
  lastInteractionAt: string | null;
  establishedAt: string;
}

export interface FriendRequest {
  id: string;
  requester: {
    id: string;
    walletAddress: string;
    ens: string | null;
    frog: {
      name: string;
      personality: PersonalityType;
      avatarUrl: string;
    } | null;
  };
  message: string | null;
  source: FriendSource;
  requestedAt: string;
}

export interface SearchUserResult {
  userId: string;
  walletAddress: string;
  ens: string | null;
  frog: {
    name: string;
    level: FrogLevel;
    avatarUrl: string;
  } | null;
  friendshipStatus: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS' | 'BLOCKED';
}

// ============ 访问相关类型 ============

export interface VisitRecord {
  id: string;
  visitor: {
    userId: string;
    frogId: string;
    frogName: string;
    frogAvatarUrl: string;
  };
  activity: VisitActivity;
  duration: number;
  messageLeft: string | null;
  visitSummary: string | null;
  isRead: boolean;
  startedAt: string;
  completedAt: string | null;
}

export interface SendVisitResult {
  visitId: string;
  estimatedDuration: number;
  frogDepartureMessage: string;
}

// ============ API 请求/响应类型 ============

export interface SendFriendRequestBody {
  targetAddress: string;
  message?: string;
}

export interface SendVisitBody {
  friendUserId: string;
  activity?: VisitActivity;
  message?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
```

### 2.3 好友服务 (friend.service.ts)

```typescript
// src/services/social/friend.service.ts

import { PrismaClient, FriendshipStatus, FriendSource, Prisma } from '@prisma/client';
import { ethers } from 'ethers';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { resolveENS, getENSName } from '../../utils/ens';
import { socialSocket } from '../../websocket/social.socket';
import { 
  FriendItem, 
  FriendRequest, 
  SearchUserResult,
  SendFriendRequestBody 
} from './friend.types';

const prisma = new PrismaClient();

class FriendService {
  
  // ==================== 好友请求 ====================
  
  /**
   * 发送好友请求
   */
  async sendFriendRequest(
    requesterId: string,
    body: SendFriendRequestBody
  ): Promise<{ requestId: string; status: string; targetFrogName?: string }> {
    
    const { targetAddress, message } = body;
    
    // 1. 解析地址 (支持 ENS)
    let resolvedAddress: string;
    let ensName: string | null = null;
    
    if (targetAddress.endsWith('.eth')) {
      const resolved = await resolveENS(targetAddress);
      if (!resolved) {
        throw new Error('ENS_NOT_FOUND');
      }
      resolvedAddress = resolved;
      ensName = targetAddress;
    } else {
      try {
        resolvedAddress = ethers.getAddress(targetAddress);
      } catch {
        throw new Error('INVALID_ADDRESS');
      }
    }
    
    // 2. 查找目标用户
    const targetUser = await prisma.user.findUnique({
      where: { walletAddress: resolvedAddress },
      include: { frog: true },
    });
    
    if (!targetUser) {
      throw new Error('USER_NOT_FOUND');
    }
    
    if (targetUser.id === requesterId) {
      throw new Error('CANNOT_ADD_SELF');
    }
    
    // 3. 检查现有关系
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId: targetUser.id },
          { requesterId: targetUser.id, addresseeId: requesterId },
        ],
      },
    });
    
    if (existingFriendship) {
      switch (existingFriendship.status) {
        case FriendshipStatus.ACCEPTED:
          return { 
            requestId: existingFriendship.id, 
            status: 'ALREADY_FRIENDS',
            targetFrogName: targetUser.frog?.name 
          };
          
        case FriendshipStatus.PENDING:
          // 如果对方已发送请求给我，自动接受
          if (existingFriendship.addresseeId === requesterId) {
            await this.acceptFriendRequest(existingFriendship.id, requesterId);
            return { 
              requestId: existingFriendship.id, 
              status: 'AUTO_ACCEPTED',
              targetFrogName: targetUser.frog?.name 
            };
          }
          return { 
            requestId: existingFriendship.id, 
            status: 'ALREADY_REQUESTED' 
          };
          
        case FriendshipStatus.BLOCKED:
          throw new Error('USER_BLOCKED');
          
        case FriendshipStatus.REJECTED:
          // 允许重新发送请求 - 更新现有记录
          const updated = await prisma.friendship.update({
            where: { id: existingFriendship.id },
            data: {
              status: FriendshipStatus.PENDING,
              message: message?.slice(0, 200),
              requestedAt: new Date(),
              respondedAt: null,
            },
          });
          
          await this.notifyFriendRequest(targetUser.id, requesterId);
          
          return { 
            requestId: updated.id, 
            status: 'PENDING',
            targetFrogName: targetUser.frog?.name 
          };
      }
    }
    
    // 4. 创建新的好友请求
    const friendship = await prisma.friendship.create({
      data: {
        requesterId,
        addresseeId: targetUser.id,
        message: message?.slice(0, 200),
        source: FriendSource.SEARCH,
        status: FriendshipStatus.PENDING,
      },
    });
    
    // 5. 更新目标用户 ENS (如果有新的)
    if (ensName && !targetUser.ens) {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { ens: ensName },
      });
    }
    
    // 6. 发送实时通知
    await this.notifyFriendRequest(targetUser.id, requesterId);
    
    logger.info(`Friend request sent: ${requesterId} -> ${targetUser.id}`);
    
    return { 
      requestId: friendship.id, 
      status: 'PENDING',
      targetFrogName: targetUser.frog?.name 
    };
  }
  
  /**
   * 接受好友请求
   */
  async acceptFriendRequest(
    friendshipId: string,
    userId: string
  ): Promise<{ friendship: FriendItem }> {
    
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        requester: { include: { frog: true } },
        addressee: { include: { frog: true } },
      },
    });
    
    if (!friendship) {
      throw new Error('REQUEST_NOT_FOUND');
    }
    
    if (friendship.addresseeId !== userId) {
      throw new Error('NOT_AUTHORIZED');
    }
    
    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new Error('REQUEST_ALREADY_PROCESSED');
    }
    
    // 1. 事务: 更新状态 + 更新计数
    const [updatedFriendship] = await prisma.$transaction([
      prisma.friendship.update({
        where: { id: friendshipId },
        data: {
          status: FriendshipStatus.ACCEPTED,
          respondedAt: new Date(),
        },
        include: {
          requester: { include: { frog: true } },
          addressee: { include: { frog: true } },
        },
      }),
      prisma.user.update({
        where: { id: friendship.requesterId },
        data: { friendCount: { increment: 1 } },
      }),
      prisma.user.update({
        where: { id: friendship.addresseeId },
        data: { friendCount: { increment: 1 } },
      }),
    ]);
    
    // 2. 通知请求方
    await this.notifyFriendAccepted(friendship.requesterId, userId);
    
    logger.info(`Friend request accepted: ${friendshipId}`);
    
    // 3. 返回好友信息
    const friend = updatedFriendship.requester;
    return {
      friendship: {
        friendshipId: updatedFriendship.id,
        user: {
          id: friend.id,
          walletAddress: friend.walletAddress,
          ens: friend.ens,
        },
        frog: friend.frog ? {
          id: friend.frog.id,
          name: friend.frog.name,
          personality: friend.frog.personality,
          level: friend.frog.level,
          status: friend.frog.status,
          avatarUrl: this.getFrogAvatarUrl(friend.frog),
        } : null,
        intimacy: updatedFriendship.intimacy,
        lastInteractionAt: null,
        establishedAt: updatedFriendship.respondedAt!.toISOString(),
      },
    };
  }
  
  /**
   * 拒绝好友请求
   */
  async rejectFriendRequest(
    friendshipId: string,
    userId: string
  ): Promise<void> {
    
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    
    if (!friendship) {
      throw new Error('REQUEST_NOT_FOUND');
    }
    
    if (friendship.addresseeId !== userId) {
      throw new Error('NOT_AUTHORIZED');
    }
    
    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new Error('REQUEST_ALREADY_PROCESSED');
    }
    
    await prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: FriendshipStatus.REJECTED,
        respondedAt: new Date(),
      },
    });
    
    logger.info(`Friend request rejected: ${friendshipId}`);
  }
  
  /**
   * 删除好友
   */
  async removeFriend(
    friendshipId: string,
    userId: string
  ): Promise<void> {
    
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    
    if (!friendship) {
      throw new Error('FRIENDSHIP_NOT_FOUND');
    }
    
    // 验证用户是关系的一方
    if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
      throw new Error('NOT_AUTHORIZED');
    }
    
    if (friendship.status !== FriendshipStatus.ACCEPTED) {
      throw new Error('NOT_FRIENDS');
    }
    
    // 事务: 删除关系 + 更新计数
    await prisma.$transaction([
      prisma.friendship.delete({
        where: { id: friendshipId },
      }),
      prisma.user.update({
        where: { id: friendship.requesterId },
        data: { friendCount: { decrement: 1 } },
      }),
      prisma.user.update({
        where: { id: friendship.addresseeId },
        data: { friendCount: { decrement: 1 } },
      }),
    ]);
    
    logger.info(`Friendship removed: ${friendshipId}`);
  }
  
  // ==================== 查询 ====================
  
  /**
   * 获取好友列表
   */
  async getFriends(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ friends: FriendItem[]; total: number; page: number; hasMore: boolean }> {
    
    const skip = (page - 1) * limit;
    
    // 获取所有已接受的好友关系
    const [friendships, total] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          OR: [
            { requesterId: userId, status: FriendshipStatus.ACCEPTED },
            { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
          ],
        },
        include: {
          requester: { include: { frog: true } },
          addressee: { include: { frog: true } },
        },
        orderBy: { respondedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.friendship.count({
        where: {
          OR: [
            { requesterId: userId, status: FriendshipStatus.ACCEPTED },
            { addresseeId: userId, status: FriendshipStatus.ACCEPTED },
          ],
        },
      }),
    ]);
    
    // 获取最近互动时间
    const friendshipIds = friendships.map(f => f.id);
    const recentVisits = await prisma.friendVisit.groupBy({
      by: ['friendshipId'],
      where: {
        friendshipId: { in: friendshipIds },
      },
      _max: {
        startedAt: true,
      },
    });
    
    const visitMap = new Map(
      recentVisits.map(v => [v.friendshipId, v._max.startedAt])
    );
    
    // 格式化返回
    const friends: FriendItem[] = friendships.map(f => {
      const friend = f.requesterId === userId ? f.addressee : f.requester;
      const lastVisit = visitMap.get(f.id);
      
      return {
        friendshipId: f.id,
        user: {
          id: friend.id,
          walletAddress: friend.walletAddress,
          ens: friend.ens,
        },
        frog: friend.frog ? {
          id: friend.frog.id,
          name: friend.frog.name,
          personality: friend.frog.personality,
          level: friend.frog.level,
          status: friend.frog.status,
          avatarUrl: this.getFrogAvatarUrl(friend.frog),
        } : null,
        intimacy: f.intimacy,
        lastInteractionAt: lastVisit?.toISOString() || f.respondedAt?.toISOString() || null,
        establishedAt: f.respondedAt?.toISOString() || f.requestedAt.toISOString(),
      };
    });
    
    return {
      friends,
      total,
      page,
      hasMore: skip + friends.length < total,
    };
  }
  
  /**
   * 获取待处理的好友请求
   */
  async getPendingRequests(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ requests: FriendRequest[]; total: number; hasMore: boolean }> {
    
    const skip = (page - 1) * limit;
    
    const [requests, total] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          addresseeId: userId,
          status: FriendshipStatus.PENDING,
        },
        include: {
          requester: { include: { frog: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.friendship.count({
        where: {
          addresseeId: userId,
          status: FriendshipStatus.PENDING,
        },
      }),
    ]);
    
    const formattedRequests: FriendRequest[] = requests.map(r => ({
      id: r.id,
      requester: {
        id: r.requester.id,
        walletAddress: r.requester.walletAddress,
        ens: r.requester.ens,
        frog: r.requester.frog ? {
          name: r.requester.frog.name,
          personality: r.requester.frog.personality,
          avatarUrl: this.getFrogAvatarUrl(r.requester.frog),
        } : null,
      },
      message: r.message,
      source: r.source,
      requestedAt: r.requestedAt.toISOString(),
    }));
    
    return {
      requests: formattedRequests,
      total,
      hasMore: skip + formattedRequests.length < total,
    };
  }
  
  /**
   * 搜索用户
   */
  async searchUsers(
    currentUserId: string,
    query: string,
    limit: number = 10
  ): Promise<SearchUserResult[]> {
    
    if (!query || query.length < 3) {
      return [];
    }
    
    let searchAddress: string | null = null;
    
    // 判断是 ENS 还是地址
    if (query.endsWith('.eth')) {
      searchAddress = await resolveENS(query);
    } else if (query.startsWith('0x') && query.length === 42) {
      try {
        searchAddress = ethers.getAddress(query);
      } catch {
        // 无效地址，继续模糊搜索
      }
    }
    
    // 构建搜索条件
    const whereConditions: Prisma.UserWhereInput[] = [];
    
    if (searchAddress) {
      whereConditions.push({ walletAddress: searchAddress });
    }
    
    // ENS 模糊搜索
    if (query.includes('.eth') || query.length >= 3) {
      whereConditions.push({
        ens: {
          contains: query,
          mode: 'insensitive',
        },
      });
    }
    
    // 青蛙名字搜索
    whereConditions.push({
      frog: {
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
    });
    
    if (whereConditions.length === 0) {
      return [];
    }
    
    // 搜索用户
    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          { OR: whereConditions },
        ],
      },
      include: { frog: true },
      take: limit,
    });
    
    if (users.length === 0) {
      return [];
    }
    
    // 获取与当前用户的好友关系
    const userIds = users.map(u => u.id);
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: currentUserId, addresseeId: { in: userIds } },
          { addresseeId: currentUserId, requesterId: { in: userIds } },
        ],
      },
    });
    
    // 构建关系映射
    const relationshipMap = new Map<string, { status: FriendshipStatus; isSender: boolean }>();
    for (const f of friendships) {
      const otherId = f.requesterId === currentUserId ? f.addresseeId : f.requesterId;
      relationshipMap.set(otherId, {
        status: f.status,
        isSender: f.requesterId === currentUserId,
      });
    }
    
    // 格式化结果
    return users.map(user => {
      const relationship = relationshipMap.get(user.id);
      
      let friendshipStatus: SearchUserResult['friendshipStatus'] = 'NONE';
      if (relationship) {
        switch (relationship.status) {
          case FriendshipStatus.ACCEPTED:
            friendshipStatus = 'FRIENDS';
            break;
          case FriendshipStatus.PENDING:
            friendshipStatus = relationship.isSender ? 'PENDING_SENT' : 'PENDING_RECEIVED';
            break;
          case FriendshipStatus.BLOCKED:
            friendshipStatus = 'BLOCKED';
            break;
        }
      }
      
      return {
        userId: user.id,
        walletAddress: user.walletAddress,
        ens: user.ens,
        frog: user.frog ? {
          name: user.frog.name,
          level: user.frog.level,
          avatarUrl: this.getFrogAvatarUrl(user.frog),
        } : null,
        friendshipStatus,
      };
    });
  }
  
  /**
   * 检查是否为好友
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId1, addresseeId: userId2 },
          { requesterId: userId2, addresseeId: userId1 },
        ],
        status: FriendshipStatus.ACCEPTED,
      },
    });
    
    return !!friendship;
  }
  
  /**
   * 获取好友关系
   */
  async getFriendship(userId1: string, userId2: string) {
    return prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId1, addresseeId: userId2 },
          { requesterId: userId2, addresseeId: userId1 },
        ],
        status: FriendshipStatus.ACCEPTED,
      },
    });
  }
  
  /**
   * 增加亲密度
   */
  async increaseIntimacy(friendshipId: string, amount: number): Promise<number> {
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });
    
    if (!friendship) {
      throw new Error('FRIENDSHIP_NOT_FOUND');
    }
    
    const newIntimacy = Math.min(100, friendship.intimacy + amount);
    
    await prisma.friendship.update({
      where: { id: friendshipId },
      data: { intimacy: newIntimacy },
    });
    
    return newIntimacy;
  }
  
  // ==================== 通知 ====================
  
  private async notifyFriendRequest(targetUserId: string, requesterId: string): Promise<void> {
    const requester = await prisma.user.findUnique({
      where: { id: requesterId },
      include: { frog: true },
    });
    
    if (requester) {
      socialSocket.sendToUser(targetUserId, {
        type: 'FRIEND_REQUEST',
        data: {
          requesterId,
          requesterAddress: requester.walletAddress,
          requesterEns: requester.ens,
          frogName: requester.frog?.name,
        },
      });
    }
  }
  
  private async notifyFriendAccepted(requesterId: string, addresseeId: string): Promise<void> {
    const addressee = await prisma.user.findUnique({
      where: { id: addresseeId },
      include: { frog: true },
    });
    
    if (addressee) {
      socialSocket.sendToUser(requesterId, {
        type: 'FRIEND_ACCEPTED',
        data: {
          userId: addresseeId,
          walletAddress: addressee.walletAddress,
          ens: addressee.ens,
          frogName: addressee.frog?.name,
        },
      });
    }
  }
  
  // ==================== 工具方法 ====================
  
  private getFrogAvatarUrl(frog: { personality: string; level: string }): string {
    return `${config.CDN_URL}/frogs/avatar_${frog.personality.toLowerCase()}_${frog.level.toLowerCase()}.png`;
  }
}

export const friendService = new FriendService();
```

### 2.4 互访服务 (visit.service.ts)

```typescript
// src/services/social/visit.service.ts

import { PrismaClient, VisitActivity, VisitStatus, FrogStatus } from '@prisma/client';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import { friendService } from './friend.service';
import { aiService } from '../ai/ai.service';
import { socialSocket } from '../../websocket/social.socket';
import { VisitRecord, SendVisitResult, SendVisitBody } from './friend.types';

const prisma = new PrismaClient();

// 访问时长配置 (秒)
const VISIT_DURATIONS: Record<VisitActivity, number> = {
  CHAT: 300,      // 5 分钟
  PLAY: 600,      // 10 分钟
  NAP: 900,       // 15 分钟
  EXPLORE: 1200,  // 20 分钟
};

// 亲密度增加配置
const INTIMACY_REWARDS: Record<VisitActivity, number> = {
  CHAT: 2,
  PLAY: 3,
  NAP: 1,
  EXPLORE: 4,
};

class VisitService {
  
  /**
   * 发起访问
   */
  async sendVisit(
    userId: string,
    body: SendVisitBody
  ): Promise<SendVisitResult> {
    
    const { friendUserId, activity = VisitActivity.CHAT, message } = body;
    
    // 1. 验证好友关系
    const friendship = await friendService.getFriendship(userId, friendUserId);
    if (!friendship) {
      throw new Error('NOT_FRIENDS');
    }
    
    // 2. 获取访问者信息
    const visitor = await prisma.user.findUnique({
      where: { id: userId },
      include: { frog: true },
    });
    
    if (!visitor?.frog) {
      throw new Error('VISITOR_FROG_NOT_FOUND');
    }
    
    // 3. 检查青蛙状态
    if (visitor.frog.status !== FrogStatus.IDLE) {
      throw new Error('FROG_NOT_AVAILABLE');
    }
    
    // 4. 获取被访问者信息
    const host = await prisma.user.findUnique({
      where: { id: friendUserId },
      include: { frog: true },
    });
    
    if (!host) {
      throw new Error('HOST_NOT_FOUND');
    }
    
    // 5. 检查是否有正在进行的访问
    const existingVisit = await prisma.friendVisit.findFirst({
      where: {
        visitorFrogId: visitor.frog.id,
        status: VisitStatus.IN_PROGRESS,
      },
    });
    
    if (existingVisit) {
      throw new Error('VISIT_ALREADY_IN_PROGRESS');
    }
    
    const duration = VISIT_DURATIONS[activity];
    
    // 6. 事务创建访问记录 + 更新青蛙状态
    const [visit] = await prisma.$transaction([
      prisma.friendVisit.create({
        data: {
          visitorUserId: userId,
          visitorFrogId: visitor.frog.id,
          hostUserId: friendUserId,
          hostFrogId: host.frog?.id,
          friendshipId: friendship.id,
          activity,
          duration,
          messageLeft: message?.slice(0, 500),
          status: VisitStatus.IN_PROGRESS,
        },
      }),
      prisma.frog.update({
        where: { id: visitor.frog.id },
        data: { status: FrogStatus.VISITING },
      }),
    ]);
    
    // 7. 生成出发消息
    const departureMessage = this.generateDepartureMessage(
      visitor.frog.name,
      host.frog?.name || host.walletAddress.slice(0, 8),
      activity
    );
    
    // 8. 通知被访问者
    await this.notifyVisitStarted(visit.id, friendUserId, visitor.frog.name, activity);
    
    // 9. 设置访问完成定时器
    this.scheduleVisitCompletion(visit.id, duration);
    
    logger.info(`Visit started: ${visitor.frog.name} -> ${host.frog?.name || host.id}`);
    
    return {
      visitId: visit.id,
      estimatedDuration: duration,
      frogDepartureMessage: departureMessage,
    };
  }
  
  /**
   * 获取来访记录
   */
  async getReceivedVisits(
    userId: string,
    options: { unreadOnly?: boolean; page?: number; limit?: number } = {}
  ): Promise<{ visits: VisitRecord[]; total: number; unreadCount: number; hasMore: boolean }> {
    
    const { unreadOnly = false, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    
    const whereCondition: any = {
      hostUserId: userId,
      status: VisitStatus.COMPLETED,
    };
    
    if (unreadOnly) {
      whereCondition.isRead = false;
    }
    
    const [visits, total, unreadCount] = await Promise.all([
      prisma.friendVisit.findMany({
        where: whereCondition,
        include: {
          visitorFrog: true,
          visitorUser: true,
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.friendVisit.count({ where: whereCondition }),
      prisma.friendVisit.count({
        where: {
          hostUserId: userId,
          status: VisitStatus.COMPLETED,
          isRead: false,
        },
      }),
    ]);
    
    const formattedVisits: VisitRecord[] = visits.map(v => ({
      id: v.id,
      visitor: {
        userId: v.visitorUserId,
        frogId: v.visitorFrogId,
        frogName: v.visitorFrog.name,
        frogAvatarUrl: this.getFrogAvatarUrl(v.visitorFrog),
      },
      activity: v.activity,
      duration: v.duration,
      messageLeft: v.messageLeft,
      visitSummary: v.visitSummary,
      isRead: v.isRead,
      startedAt: v.startedAt.toISOString(),
      completedAt: v.completedAt?.toISOString() || null,
    }));
    
    return {
      visits: formattedVisits,
      total,
      unreadCount,
      hasMore: skip + formattedVisits.length < total,
    };
  }
  
  /**
   * 获取我的访问记录
   */
  async getSentVisits(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ visits: any[]; total: number; hasMore: boolean }> {
    
    const skip = (page - 1) * limit;
    
    const [visits, total] = await Promise.all([
      prisma.friendVisit.findMany({
        where: { visitorUserId: userId },
        include: {
          hostUser: { include: { frog: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.friendVisit.count({ where: { visitorUserId: userId } }),
    ]);
    
    return {
      visits: visits.map(v => ({
        id: v.id,
        host: {
          userId: v.hostUserId,
          frogName: v.hostUser.frog?.name,
          walletAddress: v.hostUser.walletAddress,
        },
        activity: v.activity,
        status: v.status,
        startedAt: v.startedAt.toISOString(),
        completedAt: v.completedAt?.toISOString(),
      })),
      total,
      hasMore: skip + visits.length < total,
    };
  }
  
  /**
   * 标记来访为已读
   */
  async markAsRead(visitId: string, userId: string): Promise<void> {
    const visit = await prisma.friendVisit.findUnique({
      where: { id: visitId },
    });
    
    if (!visit) {
      throw new Error('VISIT_NOT_FOUND');
    }
    
    if (visit.hostUserId !== userId) {
      throw new Error('NOT_AUTHORIZED');
    }
    
    await prisma.friendVisit.update({
      where: { id: visitId },
      data: { isRead: true },
    });
  }
  
  /**
   * 批量标记已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.friendVisit.updateMany({
      where: {
        hostUserId: userId,
        isRead: false,
        status: VisitStatus.COMPLETED,
      },
      data: { isRead: true },
    });
    
    return result.count;
  }
  
  /**
   * 获取当前正在进行的访问
   */
  async getCurrentVisit(userId: string): Promise<any | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { frog: true },
    });
    
    if (!user?.frog) {
      return null;
    }
    
    const visit = await prisma.friendVisit.findFirst({
      where: {
        visitorFrogId: user.frog.id,
        status: VisitStatus.IN_PROGRESS,
      },
      include: {
        hostUser: { include: { frog: true } },
      },
    });
    
    if (!visit) {
      return null;
    }
    
    const elapsed = Math.floor((Date.now() - visit.startedAt.getTime()) / 1000);
    const remaining = Math.max(0, visit.duration - elapsed);
    
    return {
      visitId: visit.id,
      host: {
        userId: visit.hostUserId,
        frogName: visit.hostUser.frog?.name,
        walletAddress: visit.hostUser.walletAddress,
      },
      activity: visit.activity,
      remainingTime: remaining,
      startedAt: visit.startedAt.toISOString(),
    };
  }
  
  /**
   * 取消正在进行的访问
   */
  async cancelVisit(visitId: string, userId: string): Promise<void> {
    const visit = await prisma.friendVisit.findUnique({
      where: { id: visitId },
      include: { visitorFrog: true },
    });
    
    if (!visit) {
      throw new Error('VISIT_NOT_FOUND');
    }
    
    if (visit.visitorUserId !== userId) {
      throw new Error('NOT_AUTHORIZED');
    }
    
    if (visit.status !== VisitStatus.IN_PROGRESS) {
      throw new Error('VISIT_NOT_IN_PROGRESS');
    }
    
    await prisma.$transaction([
      prisma.friendVisit.update({
        where: { id: visitId },
        data: {
          status: VisitStatus.CANCELLED,
          completedAt: new Date(),
        },
      }),
      prisma.frog.update({
        where: { id: visit.visitorFrogId },
        data: { status: FrogStatus.IDLE },
      }),
    ]);
    
    logger.info(`Visit cancelled: ${visitId}`);
  }
  
  /**
   * 完成访问 (由 worker 调用)
   */
  async completeVisit(visitId: string): Promise<void> {
    const visit = await prisma.friendVisit.findUnique({
      where: { id: visitId },
      include: {
        visitorFrog: true,
        hostUser: { include: { frog: true } },
      },
    });
    
    if (!visit || visit.status !== VisitStatus.IN_PROGRESS) {
      logger.warn(`Visit ${visitId} not found or not in progress`);
      return;
    }
    
    // 1. 生成访问摘要
    const visitSummary = await this.generateVisitSummary(
      visit.visitorFrog.name,
      visit.hostUser.frog?.name || visit.hostUser.walletAddress.slice(0, 8),
      visit.activity,
      visit.messageLeft
    );
    
    // 2. 更新访问记录和青蛙状态
    await prisma.$transaction([
      prisma.friendVisit.update({
        where: { id: visitId },
        data: {
          status: VisitStatus.COMPLETED,
          completedAt: new Date(),
          visitSummary,
        },
      }),
      prisma.frog.update({
        where: { id: visit.visitorFrogId },
        data: { status: FrogStatus.IDLE },
      }),
      prisma.user.update({
        where: { id: visit.hostUserId },
        data: { visitsReceivedCount: { increment: 1 } },
      }),
    ]);
    
    // 3. 增加亲密度
    const intimacyReward = INTIMACY_REWARDS[visit.activity];
    await friendService.increaseIntimacy(visit.friendshipId, intimacyReward);
    
    // 4. 通知双方
    await this.notifyVisitCompleted(visit, visitSummary);
    
    logger.info(`Visit completed: ${visitId}`);
  }
  
  // ==================== 内部方法 ====================
  
  private scheduleVisitCompletion(visitId: string, duration: number): void {
    // 使用 setTimeout (生产环境建议用 BullMQ)
    setTimeout(async () => {
      try {
        await this.completeVisit(visitId);
      } catch (error) {
        logger.error(`Failed to complete visit ${visitId}:`, error);
      }
    }, duration * 1000);
  }
  
  private generateDepartureMessage(
    visitorName: string,
    hostName: string,
    activity: VisitActivity
  ): string {
    const messages: Record<VisitActivity, string[]> = {
      CHAT: [
        `${visitorName} 开心地跳向 ${hostName} 的家，准备好好聊聊天！`,
        `"我来啦！" ${visitorName} 兴奋地朝 ${hostName} 家蹦去~`,
        `${visitorName} 带着满满的话题出发去找 ${hostName} 了！`,
      ],
      PLAY: [
        `${visitorName} 活力满满地去找 ${hostName} 玩耍啦！`,
        `"一起玩吧！" ${visitorName} 欢快地跳向 ${hostName} 的家`,
        `${visitorName} 迫不及待要和 ${hostName} 一起玩了！`,
      ],
      NAP: [
        `${visitorName} 打着哈欠去 ${hostName} 家午睡~`,
        `"让我们一起打个盹吧~" ${visitorName} 慢悠悠地出发了`,
        `${visitorName} 想和 ${hostName} 一起享受宁静的午后时光`,
      ],
      EXPLORE: [
        `${visitorName} 带着好奇心去探索 ${hostName} 的家！`,
        `"让我看看你家有什么宝贝~" ${visitorName} 出发探险了`,
        `${visitorName} 充满冒险精神地去 ${hostName} 家探索！`,
      ],
    };
    
    const options = messages[activity];
    return options[Math.floor(Math.random() * options.length)];
  }
  
  private async generateVisitSummary(
    visitorName: string,
    hostName: string,
    activity: VisitActivity,
    messageLeft: string | null
  ): Promise<string> {
    // 简化版本，不调用 AI
    const summaries: Record<VisitActivity, string[]> = {
      CHAT: [
        `${visitorName} 和 ${hostName} 聊得很开心，分享了很多旅行趣事！`,
        `两只青蛙喝着露水茶，聊了好久的天~`,
        `${visitorName} 给 ${hostName} 讲述了最近的冒险故事`,
      ],
      PLAY: [
        `${visitorName} 和 ${hostName} 一起捉蚊子，玩得不亦乐乎！`,
        `两只青蛙在荷叶上跳来跳去，度过了愉快的时光`,
        `${visitorName} 和 ${hostName} 比赛谁跳得更高更远！`,
      ],
      NAP: [
        `${visitorName} 和 ${hostName} 在荷叶上并排小憩，呼噜声此起彼伏~`,
        `阳光温暖，两只青蛙睡得香甜`,
        `${visitorName} 在 ${hostName} 家美美地睡了一觉`,
      ],
      EXPLORE: [
        `${visitorName} 好奇地探索了 ${hostName} 家的每个角落！`,
        `${visitorName} 在 ${hostName} 家发现了很多有趣的东西`,
        `两只青蛙一起探索，发现了隐藏的宝藏！`,
      ],
    };
    
    let summary = summaries[activity][Math.floor(Math.random() * summaries[activity].length)];
    
    if (messageLeft) {
      summary += ` ${visitorName} 还留下了一句话："${messageLeft}"`;
    }
    
    return summary;
  }
  
  private async notifyVisitStarted(
    visitId: string,
    hostUserId: string,
    visitorFrogName: string,
    activity: VisitActivity
  ): Promise<void> {
    socialSocket.sendToUser(hostUserId, {
      type: 'VISIT_STARTED',
      data: {
        visitId,
        visitorFrogName,
        activity,
        message: `${visitorFrogName} 来你家${this.getActivityVerb(activity)}啦！`,
      },
    });
  }
  
  private async notifyVisitCompleted(visit: any, summary: string): Promise<void> {
    // 通知被访问者
    socialSocket.sendToUser(visit.hostUserId, {
      type: 'VISIT_COMPLETED',
      data: {
        visitId: visit.id,
        visitorFrogName: visit.visitorFrog.name,
        summary,
      },
    });
    
    // 通知访问者
    socialSocket.sendToUser(visit.visitorUserId, {
      type: 'FROG_RETURNED',
      data: {
        visitId: visit.id,
        hostFrogName: visit.hostUser.frog?.name,
        message: `${visit.visitorFrog.name} 从 ${visit.hostUser.frog?.name || '好友'} 家回来了！`,
      },
    });
  }
  
  private getActivityVerb(activity: VisitActivity): string {
    const verbs: Record<VisitActivity, string> = {
      CHAT: '聊天',
      PLAY: '玩耍',
      NAP: '午睡',
      EXPLORE: '探索',
    };
    return verbs[activity];
  }
  
  private getFrogAvatarUrl(frog: { personality: string; level: string }): string {
    return `${config.CDN_URL}/frogs/avatar_${frog.personality.toLowerCase()}_${frog.level.toLowerCase()}.png`;
  }
}

export const visitService = new VisitService();
```

### 2.5 ENS 解析工具

```typescript
// src/utils/ens.ts

import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';
import { config } from '../config';
import { logger } from './logger';

const client = createPublicClient({
  chain: mainnet,
  transport: http(config.ETHEREUM_RPC_URL),
});

// ENS 缓存 (生产环境用 Redis)
const ensCache = new Map<string, { address: string | null; expiry: number }>();
const addressCache = new Map<string, { ens: string | null; expiry: number }>();

const CACHE_TTL = 3600 * 1000; // 1 小时

/**
 * 解析 ENS 域名为地址
 */
export async function resolveENS(ensName: string): Promise<string | null> {
  try {
    const normalized = normalize(ensName);
    
    // 检查缓存
    const cached = ensCache.get(normalized);
    if (cached && cached.expiry > Date.now()) {
      return cached.address;
    }
    
    // 解析
    const address = await client.getEnsAddress({ name: normalized });
    
    // 缓存结果
    ensCache.set(normalized, {
      address,
      expiry: Date.now() + CACHE_TTL,
    });
    
    return address;
  } catch (error) {
    logger.error(`Failed to resolve ENS ${ensName}:`, error);
    return null;
  }
}

/**
 * 根据地址获取 ENS 域名
 */
export async function getENSName(address: string): Promise<string | null> {
  try {
    const normalizedAddress = address.toLowerCase();
    
    // 检查缓存
    const cached = addressCache.get(normalizedAddress);
    if (cached && cached.expiry > Date.now()) {
      return cached.ens;
    }
    
    // 反向解析
    const ensName = await client.getEnsName({ address: address as `0x${string}` });
    
    // 缓存结果
    addressCache.set(normalizedAddress, {
      ens: ensName,
      expiry: Date.now() + CACHE_TTL,
    });
    
    return ensName;
  } catch (error) {
    logger.error(`Failed to get ENS for ${address}:`, error);
    return null;
  }
}
```

### 2.6 WebSocket 社交推送

```typescript
// src/websocket/social.socket.ts

import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';

interface SocialEvent {
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED' | 'VISIT_STARTED' | 'VISIT_COMPLETED' | 'FROG_RETURNED';
  data: any;
}

class SocialSocket {
  private io: Server | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  
  initialize(io: Server): void {
    this.io = io;
    
    io.on('connection', (socket: Socket) => {
      const userId = socket.handshake.auth.userId;
      
      if (userId) {
        this.registerSocket(userId, socket.id);
        
        socket.on('disconnect', () => {
          this.unregisterSocket(userId, socket.id);
        });
      }
    });
    
    logger.info('Social WebSocket initialized');
  }
  
  private registerSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    logger.debug(`Socket registered: ${userId} -> ${socketId}`);
  }
  
  private unregisterSocket(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    logger.debug(`Socket unregistered: ${userId} -> ${socketId}`);
  }
  
  /**
   * 发送事件给指定用户
   */
  sendToUser(userId: string, event: SocialEvent): void {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }
    
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      for (const socketId of socketIds) {
        this.io.to(socketId).emit('social', event);
      }
      logger.debug(`Event sent to ${userId}: ${event.type}`);
    } else {
      // 用户不在线，可以存储离线消息
      logger.debug(`User ${userId} offline, event ${event.type} not delivered`);
    }
  }
  
  /**
   * 广播给多个用户
   */
  broadcast(userIds: string[], event: SocialEvent): void {
    for (const userId of userIds) {
      this.sendToUser(userId, event);
    }
  }
  
  /**
   * 检查用户是否在线
   */
  isOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }
}

export const socialSocket = new SocialSocket();
```

### 2.7 API 路由

#### 好友路由

```typescript
// src/routes/friend.routes.ts

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { friendService } from '../services/social/friend.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import { SendFriendRequestBody, PaginationQuery } from '../services/social/friend.types';

export async function friendRoutes(fastify: FastifyInstance) {
  
  // 所有路由都需要认证
  fastify.addHook('preHandler', authMiddleware);
  
  // ==================== 好友列表 ====================
  
  /**
   * 获取好友列表
   * GET /api/friends
   */
  fastify.get<{ Querystring: PaginationQuery }>(
    '/',
    async (request, reply) => {
      const userId = request.user!.id;
      const { page = 1, limit = 20 } = request.query;
      
      const result = await friendService.getFriends(userId, Number(page), Number(limit));
      
      return reply.send({
        success: true,
        data: result,
      });
    }
  );
  
  // ==================== 好友请求 ====================
  
  /**
   * 获取待处理的好友请求
   * GET /api/friends/requests
   */
  fastify.get<{ Querystring: PaginationQuery }>(
    '/requests',
    async (request, reply) => {
      const userId = request.user!.id;
      const { page = 1, limit = 20 } = request.query;
      
      const result = await friendService.getPendingRequests(userId, Number(page), Number(limit));
      
      return reply.send({
        success: true,
        data: result,
      });
    }
  );
  
  /**
   * 发送好友请求
   * POST /api/friends/request
   */
  fastify.post<{ Body: SendFriendRequestBody }>(
    '/request',
    {
      schema: {
        body: {
          type: 'object',
          required: ['targetAddress'],
          properties: {
            targetAddress: { type: 'string', minLength: 3 },
            message: { type: 'string', maxLength: 200 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.id;
      
      try {
        const result = await friendService.sendFriendRequest(userId, request.body);
        
        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        const errorMessages: Record<string, { code: number; message: string }> = {
          ENS_NOT_FOUND: { code: 404, message: 'ENS 域名未找到' },
          INVALID_ADDRESS: { code: 400, message: '无效的钱包地址' },
          USER_NOT_FOUND: { code: 404, message: '用户未注册 ZetaFrog' },
          CANNOT_ADD_SELF: { code: 400, message: '不能添加自己为好友' },
          USER_BLOCKED: { code: 403, message: '无法添加此用户' },
        };
        
        const err = errorMessages[error.message] || { code: 500, message: '请求失败' };
        return reply.code(err.code).send({
          success: false,
          error: err.message,
        });
      }
    }
  );
  
  /**
   * 接受好友请求
   * POST /api/friends/:requestId/accept
   */
  fastify.post<{ Params: { requestId: string } }>(
    '/:requestId/accept',
    async (request, reply) => {
      const userId = request.user!.id;
      const { requestId } = request.params;
      
      try {
        const result = await friendService.acceptFriendRequest(requestId, userId);
        
        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        const errorMessages: Record<string, { code: number; message: string }> = {
          REQUEST_NOT_FOUND: { code: 404, message: '请求不存在' },
          NOT_AUTHORIZED: { code: 403, message: '无权操作此请求' },
          REQUEST_ALREADY_PROCESSED: { code: 400, message: '请求已处理' },
        };
        
        const err = errorMessages[error.message] || { code: 500, message: '操作失败' };
        return reply.code(err.code).send({
          success: false,
          error: err.message,
        });
      }
    }
  );
  
  /**
   * 拒绝好友请求
   * POST /api/friends/:requestId/reject
   */
  fastify.post<{ Params: { requestId: string } }>(
    '/:requestId/reject',
    async (request, reply) => {
      const userId = request.user!.id;
      const { requestId } = request.params;
      
      try {
        await friendService.rejectFriendRequest(requestId, userId);
        
        return reply.send({
          success: true,
          message: '已拒绝好友请求',
        });
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
  
  /**
   * 删除好友
   * DELETE /api/friends/:friendshipId
   */
  fastify.delete<{ Params: { friendshipId: string } }>(
    '/:friendshipId',
    async (request, reply) => {
      const userId = request.user!.id;
      const { friendshipId } = request.params;
      
      try {
        await friendService.removeFriend(friendshipId, userId);
        
        return reply.send({
          success: true,
          message: '已删除好友',
        });
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
  
  // ==================== 搜索 ====================
  
  /**
   * 搜索用户
   * GET /api/friends/search?q=xxx
   */
  fastify.get<{ Querystring: { q: string; limit?: number } }>(
    '/search',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', minLength: 3 },
            limit: { type: 'number', default: 10, maximum: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.id;
      const { q, limit = 10 } = request.query;
      
      const results = await friendService.searchUsers(userId, q, Number(limit));
      
      return reply.send({
        success: true,
        data: { users: results },
      });
    }
  );
}
```

#### 互访路由

```typescript
// src/routes/visit.routes.ts

import { FastifyInstance } from 'fastify';
import { visitService } from '../services/social/visit.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import { SendVisitBody, PaginationQuery } from '../services/social/friend.types';
import { VisitActivity } from '@prisma/client';

export async function visitRoutes(fastify: FastifyInstance) {
  
  fastify.addHook('preHandler', authMiddleware);
  
  // ==================== 发起访问 ====================
  
  /**
   * 去好友家串门
   * POST /api/visits/send
   */
  fastify.post<{ Body: SendVisitBody }>(
    '/send',
    {
      schema: {
        body: {
          type: 'object',
          required: ['friendUserId'],
          properties: {
            friendUserId: { type: 'string' },
            activity: { type: 'string', enum: Object.values(VisitActivity) },
            message: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.user!.id;
      
      try {
        const result = await visitService.sendVisit(userId, request.body);
        
        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        const errorMessages: Record<string, { code: number; message: string }> = {
          NOT_FRIENDS: { code: 400, message: '你们还不是好友' },
          VISITOR_FROG_NOT_FOUND: { code: 400, message: '你还没有青蛙' },
          FROG_NOT_AVAILABLE: { code: 400, message: '你的青蛙正忙' },
          HOST_NOT_FOUND: { code: 404, message: '好友不存在' },
          VISIT_ALREADY_IN_PROGRESS: { code: 400, message: '你的青蛙正在串门中' },
        };
        
        const err = errorMessages[error.message] || { code: 500, message: '发起访问失败' };
        return reply.code(err.code).send({
          success: false,
          error: err.message,
        });
      }
    }
  );
  
  // ==================== 查询访问 ====================
  
  /**
   * 获取来访记录
   * GET /api/visits/received
   */
  fastify.get<{ Querystring: PaginationQuery & { unreadOnly?: boolean } }>(
    '/received',
    async (request, reply) => {
      const userId = request.user!.id;
      const { page = 1, limit = 20, unreadOnly = false } = request.query;
      
      const result = await visitService.getReceivedVisits(userId, {
        page: Number(page),
        limit: Number(limit),
        unreadOnly: unreadOnly === true || unreadOnly === 'true',
      });
      
      return reply.send({
        success: true,
        data: result,
      });
    }
  );
  
  /**
   * 获取我的访问记录
   * GET /api/visits/sent
   */
  fastify.get<{ Querystring: PaginationQuery }>(
    '/sent',
    async (request, reply) => {
      const userId = request.user!.id;
      const { page = 1, limit = 20 } = request.query;
      
      const result = await visitService.getSentVisits(userId, Number(page), Number(limit));
      
      return reply.send({
        success: true,
        data: result,
      });
    }
  );
  
  /**
   * 获取当前进行中的访问
   * GET /api/visits/current
   */
  fastify.get(
    '/current',
    async (request, reply) => {
      const userId = request.user!.id;
      
      const currentVisit = await visitService.getCurrentVisit(userId);
      
      return reply.send({
        success: true,
        data: { visit: currentVisit },
      });
    }
  );
  
  // ==================== 操作 ====================
  
  /**
   * 标记来访为已读
   * POST /api/visits/:visitId/read
   */
  fastify.post<{ Params: { visitId: string } }>(
    '/:visitId/read',
    async (request, reply) => {
      const userId = request.user!.id;
      const { visitId } = request.params;
      
      try {
        await visitService.markAsRead(visitId, userId);
        
        return reply.send({
          success: true,
          message: '已标记为已读',
        });
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
  
  /**
   * 全部标记已读
   * POST /api/visits/read-all
   */
  fastify.post(
    '/read-all',
    async (request, reply) => {
      const userId = request.user!.id;
      
      const count = await visitService.markAllAsRead(userId);
      
      return reply.send({
        success: true,
        data: { markedCount: count },
      });
    }
  );
  
  /**
   * 取消正在进行的访问
   * POST /api/visits/:visitId/cancel
   */
  fastify.post<{ Params: { visitId: string } }>(
    '/:visitId/cancel',
    async (request, reply) => {
      const userId = request.user!.id;
      const { visitId } = request.params;
      
      try {
        await visitService.cancelVisit(visitId, userId);
        
        return reply.send({
          success: true,
          message: '已取消访问',
        });
      } catch (error: any) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }
    }
  );
}
```

### 2.8 路由注册

```typescript
// src/routes/index.ts

import { FastifyInstance } from 'fastify';
import { friendRoutes } from './friend.routes';
import { visitRoutes } from './visit.routes';
// ... 其他路由导入

export async function registerRoutes(fastify: FastifyInstance) {
  // 现有路由
  fastify.register(frogRoutes, { prefix: '/api/frog' });
  fastify.register(travelRoutes, { prefix: '/api/travel' });
  fastify.register(postcardRoutes, { prefix: '/api/postcards' });
  
  // V2.0 社交路由
  fastify.register(friendRoutes, { prefix: '/api/friends' });
  fastify.register(visitRoutes, { prefix: '/api/visits' });
}
```

---

## 3. 前端实现

### 3.1 组件结构

```
frontend/src/
├── components/
│   └── social/
│       ├── FriendList.tsx           # 好友列表
│       ├── FriendCard.tsx           # 好友卡片
│       ├── FriendRequestList.tsx    # 好友请求列表
│       ├── FriendRequestCard.tsx    # 请求卡片
│       ├── AddFriendModal.tsx       # 添加好友弹窗
│       ├── FriendSearch.tsx         # 搜索组件
│       ├── VisitNotification.tsx    # 来访通知
│       ├── VisitHistory.tsx         # 来访记录
│       ├── SendVisitModal.tsx       # 发起串门弹窗
│       └── VisitProgress.tsx        # 串门进度
│
├── hooks/
│   ├── useFriends.ts                # 好友状态管理
│   ├── useVisits.ts                 # 访问状态管理
│   └── useSocialSocket.ts           # 社交 WebSocket
│
├── services/
│   └── social/
│       ├── friend.api.ts            # 好友 API
│       └── visit.api.ts             # 访问 API
│
├── stores/
│   └── socialStore.ts               # 社交状态
│
└── types/
    └── social.ts                    # 社交类型
```

### 3.2 类型定义

```typescript
// src/types/social.ts

export interface FriendItem {
  friendshipId: string;
  user: {
    id: string;
    walletAddress: string;
    ens: string | null;
  };
  frog: {
    id: string;
    name: string;
    personality: string;
    level: string;
    status: 'IDLE' | 'TRAVELING' | 'VISITING' | 'RETURNING';
    avatarUrl: string;
  } | null;
  intimacy: number;
  lastInteractionAt: string | null;
  establishedAt: string;
}

export interface FriendRequest {
  id: string;
  requester: {
    id: string;
    walletAddress: string;
    ens: string | null;
    frog: {
      name: string;
      personality: string;
      avatarUrl: string;
    } | null;
  };
  message: string | null;
  source: string;
  requestedAt: string;
}

export interface SearchUserResult {
  userId: string;
  walletAddress: string;
  ens: string | null;
  frog: {
    name: string;
    level: string;
    avatarUrl: string;
  } | null;
  friendshipStatus: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS' | 'BLOCKED';
}

export interface VisitRecord {
  id: string;
  visitor: {
    userId: string;
    frogId: string;
    frogName: string;
    frogAvatarUrl: string;
  };
  activity: 'CHAT' | 'PLAY' | 'NAP' | 'EXPLORE';
  duration: number;
  messageLeft: string | null;
  visitSummary: string | null;
  isRead: boolean;
  startedAt: string;
  completedAt: string | null;
}

export interface CurrentVisit {
  visitId: string;
  host: {
    userId: string;
    frogName: string | null;
    walletAddress: string;
  };
  activity: string;
  remainingTime: number;
  startedAt: string;
}
```

### 3.3 API 服务

```typescript
// src/services/social/friend.api.ts

import { apiClient } from '../api-client';
import { FriendItem, FriendRequest, SearchUserResult } from '@/types/social';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

export const friendApi = {
  // 获取好友列表
  async getFriends(page = 1, limit = 20): Promise<PaginatedResponse<FriendItem>> {
    const response = await apiClient.get('/api/friends', {
      params: { page, limit },
    });
    return {
      data: response.data.data.friends,
      total: response.data.data.total,
      page: response.data.data.page,
      hasMore: response.data.data.hasMore,
    };
  },
  
  // 获取好友请求
  async getPendingRequests(page = 1, limit = 20): Promise<PaginatedResponse<FriendRequest>> {
    const response = await apiClient.get('/api/friends/requests', {
      params: { page, limit },
    });
    return {
      data: response.data.data.requests,
      total: response.data.data.total,
      page: 1,
      hasMore: response.data.data.hasMore,
    };
  },
  
  // 发送好友请求
  async sendRequest(targetAddress: string, message?: string): Promise<{
    requestId: string;
    status: string;
    targetFrogName?: string;
  }> {
    const response = await apiClient.post('/api/friends/request', {
      targetAddress,
      message,
    });
    return response.data.data;
  },
  
  // 接受好友请求
  async acceptRequest(requestId: string): Promise<{ friendship: FriendItem }> {
    const response = await apiClient.post(`/api/friends/${requestId}/accept`);
    return response.data.data;
  },
  
  // 拒绝好友请求
  async rejectRequest(requestId: string): Promise<void> {
    await apiClient.post(`/api/friends/${requestId}/reject`);
  },
  
  // 删除好友
  async removeFriend(friendshipId: string): Promise<void> {
    await apiClient.delete(`/api/friends/${friendshipId}`);
  },
  
  // 搜索用户
  async searchUsers(query: string, limit = 10): Promise<SearchUserResult[]> {
    const response = await apiClient.get('/api/friends/search', {
      params: { q: query, limit },
    });
    return response.data.data.users;
  },
};
```

```typescript
// src/services/social/visit.api.ts

import { apiClient } from '../api-client';
import { VisitRecord, CurrentVisit } from '@/types/social';

export const visitApi = {
  // 发起串门
  async sendVisit(
    friendUserId: string,
    activity?: string,
    message?: string
  ): Promise<{
    visitId: string;
    estimatedDuration: number;
    frogDepartureMessage: string;
  }> {
    const response = await apiClient.post('/api/visits/send', {
      friendUserId,
      activity,
      message,
    });
    return response.data.data;
  },
  
  // 获取来访记录
  async getReceivedVisits(options?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }): Promise<{
    visits: VisitRecord[];
    total: number;
    unreadCount: number;
    hasMore: boolean;
  }> {
    const response = await apiClient.get('/api/visits/received', {
      params: options,
    });
    return response.data.data;
  },
  
  // 获取当前访问
  async getCurrentVisit(): Promise<CurrentVisit | null> {
    const response = await apiClient.get('/api/visits/current');
    return response.data.data.visit;
  },
  
  // 标记已读
  async markAsRead(visitId: string): Promise<void> {
    await apiClient.post(`/api/visits/${visitId}/read`);
  },
  
  // 全部标记已读
  async markAllAsRead(): Promise<{ markedCount: number }> {
    const response = await apiClient.post('/api/visits/read-all');
    return response.data.data;
  },
  
  // 取消访问
  async cancelVisit(visitId: string): Promise<void> {
    await apiClient.post(`/api/visits/${visitId}/cancel`);
  },
};
```

### 3.4 状态管理

```typescript
// src/stores/socialStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FriendItem, FriendRequest, VisitRecord, CurrentVisit } from '@/types/social';
import { friendApi } from '@/services/social/friend.api';
import { visitApi } from '@/services/social/visit.api';

interface SocialState {
  // 好友
  friends: FriendItem[];
  friendsLoading: boolean;
  friendsTotal: number;
  
  // 好友请求
  pendingRequests: FriendRequest[];
  requestsLoading: boolean;
  pendingCount: number;
  
  // 来访
  recentVisits: VisitRecord[];
  visitsLoading: boolean;
  unreadVisitCount: number;
  
  // 当前访问
  currentVisit: CurrentVisit | null;
  
  // Actions
  fetchFriends: (page?: number) => Promise<void>;
  fetchPendingRequests: () => Promise<void>;
  fetchRecentVisits: () => Promise<void>;
  fetchCurrentVisit: () => Promise<void>;
  
  sendFriendRequest: (address: string, message?: string) => Promise<{ status: string }>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendshipId: string) => Promise<void>;
  
  sendVisit: (friendUserId: string, activity?: string, message?: string) => Promise<string>;
  markVisitAsRead: (visitId: string) => Promise<void>;
  markAllVisitsAsRead: () => Promise<void>;
  cancelCurrentVisit: () => Promise<void>;
  
  // WebSocket 更新
  handleFriendRequest: (data: any) => void;
  handleFriendAccepted: (data: any) => void;
  handleVisitStarted: (data: any) => void;
  handleVisitCompleted: (data: any) => void;
  handleFrogReturned: (data: any) => void;
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      // 初始状态
      friends: [],
      friendsLoading: false,
      friendsTotal: 0,
      
      pendingRequests: [],
      requestsLoading: false,
      pendingCount: 0,
      
      recentVisits: [],
      visitsLoading: false,
      unreadVisitCount: 0,
      
      currentVisit: null,
      
      // ==================== 获取数据 ====================
      
      fetchFriends: async (page = 1) => {
        set({ friendsLoading: true });
        try {
          const result = await friendApi.getFriends(page);
          set({
            friends: page === 1 ? result.data : [...get().friends, ...result.data],
            friendsTotal: result.total,
          });
        } finally {
          set({ friendsLoading: false });
        }
      },
      
      fetchPendingRequests: async () => {
        set({ requestsLoading: true });
        try {
          const result = await friendApi.getPendingRequests();
          set({
            pendingRequests: result.data,
            pendingCount: result.total,
          });
        } finally {
          set({ requestsLoading: false });
        }
      },
      
      fetchRecentVisits: async () => {
        set({ visitsLoading: true });
        try {
          const result = await visitApi.getReceivedVisits({ limit: 20 });
          set({
            recentVisits: result.visits,
            unreadVisitCount: result.unreadCount,
          });
        } finally {
          set({ visitsLoading: false });
        }
      },
      
      fetchCurrentVisit: async () => {
        const visit = await visitApi.getCurrentVisit();
        set({ currentVisit: visit });
      },
      
      // ==================== 好友操作 ====================
      
      sendFriendRequest: async (address, message) => {
        const result = await friendApi.sendRequest(address, message);
        return { status: result.status };
      },
      
      acceptFriendRequest: async (requestId) => {
        const result = await friendApi.acceptRequest(requestId);
        
        // 更新状态
        set((state) => ({
          pendingRequests: state.pendingRequests.filter(r => r.id !== requestId),
          pendingCount: state.pendingCount - 1,
          friends: [result.friendship, ...state.friends],
        }));
      },
      
      rejectFriendRequest: async (requestId) => {
        await friendApi.rejectRequest(requestId);
        
        set((state) => ({
          pendingRequests: state.pendingRequests.filter(r => r.id !== requestId),
          pendingCount: state.pendingCount - 1,
        }));
      },
      
      removeFriend: async (friendshipId) => {
        await friendApi.removeFriend(friendshipId);
        
        set((state) => ({
          friends: state.friends.filter(f => f.friendshipId !== friendshipId),
          friendsTotal: state.friendsTotal - 1,
        }));
      },
      
      // ==================== 访问操作 ====================
      
      sendVisit: async (friendUserId, activity, message) => {
        const result = await visitApi.sendVisit(friendUserId, activity, message);
        
        // 更新当前访问
        set({
          currentVisit: {
            visitId: result.visitId,
            host: {
              userId: friendUserId,
              frogName: null,
              walletAddress: '',
            },
            activity: activity || 'CHAT',
            remainingTime: result.estimatedDuration,
            startedAt: new Date().toISOString(),
          },
        });
        
        return result.frogDepartureMessage;
      },
      
      markVisitAsRead: async (visitId) => {
        await visitApi.markAsRead(visitId);
        
        set((state) => ({
          recentVisits: state.recentVisits.map(v =>
            v.id === visitId ? { ...v, isRead: true } : v
          ),
          unreadVisitCount: Math.max(0, state.unreadVisitCount - 1),
        }));
      },
      
      markAllVisitsAsRead: async () => {
        await visitApi.markAllAsRead();
        
        set((state) => ({
          recentVisits: state.recentVisits.map(v => ({ ...v, isRead: true })),
          unreadVisitCount: 0,
        }));
      },
      
      cancelCurrentVisit: async () => {
        const { currentVisit } = get();
        if (currentVisit) {
          await visitApi.cancelVisit(currentVisit.visitId);
          set({ currentVisit: null });
        }
      },
      
      // ==================== WebSocket 处理 ====================
      
      handleFriendRequest: (data) => {
        // 刷新请求列表
        get().fetchPendingRequests();
      },
      
      handleFriendAccepted: (data) => {
        // 刷新好友列表
        get().fetchFriends();
      },
      
      handleVisitStarted: (data) => {
        // 可以显示 toast 通知
        get().fetchRecentVisits();
      },
      
      handleVisitCompleted: (data) => {
        get().fetchRecentVisits();
      },
      
      handleFrogReturned: (data) => {
        set({ currentVisit: null });
      },
    }),
    {
      name: 'zetafrog-social',
      partialize: (state) => ({
        // 只持久化必要数据
      }),
    }
  )
);
```

### 3.5 WebSocket Hook

```typescript
// src/hooks/useSocialSocket.ts

import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSocialStore } from '@/stores/socialStore';
import { useWalletStore } from '@/stores/walletStore';
import { config } from '@/config';
import { toast } from 'react-hot-toast';

let socket: Socket | null = null;

export function useSocialSocket() {
  const { userId, isConnected } = useWalletStore();
  const {
    handleFriendRequest,
    handleFriendAccepted,
    handleVisitStarted,
    handleVisitCompleted,
    handleFrogReturned,
  } = useSocialStore();
  
  const connect = useCallback(() => {
    if (!userId || socket?.connected) return;
    
    socket = io(config.WS_URL, {
      auth: { userId },
      transports: ['websocket'],
    });
    
    socket.on('connect', () => {
      console.log('Social socket connected');
    });
    
    socket.on('social', (event) => {
      console.log('Social event:', event);
      
      switch (event.type) {
        case 'FRIEND_REQUEST':
          handleFriendRequest(event.data);
          toast.success(`${event.data.frogName || '新朋友'} 想和你成为好友！`, {
            icon: '🐸',
          });
          break;
          
        case 'FRIEND_ACCEPTED':
          handleFriendAccepted(event.data);
          toast.success(`${event.data.frogName || '好友'} 接受了你的好友请求！`, {
            icon: '🎉',
          });
          break;
          
        case 'VISIT_STARTED':
          handleVisitStarted(event.data);
          toast(event.data.message, {
            icon: '🏠',
            duration: 5000,
          });
          break;
          
        case 'VISIT_COMPLETED':
          handleVisitCompleted(event.data);
          toast.success(`${event.data.visitorFrogName} 的来访已结束`, {
            icon: '👋',
          });
          break;
          
        case 'FROG_RETURNED':
          handleFrogReturned(event.data);
          toast.success(event.data.message, {
            icon: '🐸',
          });
          break;
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Social socket disconnected');
    });
  }, [userId]);
  
  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }, []);
  
  useEffect(() => {
    if (isConnected && userId) {
      connect();
    } else {
      disconnect();
    }
    
    return () => {
      disconnect();
    };
  }, [isConnected, userId, connect, disconnect]);
  
  return { socket };
}
```

### 3.6 核心组件

#### FriendList.tsx

```tsx
// src/components/social/FriendList.tsx

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialStore } from '@/stores/socialStore';
import FriendCard from './FriendCard';
import FriendRequestList from './FriendRequestList';
import AddFriendModal from './AddFriendModal';
import { Search, UserPlus, Users, Bell, ChevronRight } from 'lucide-react';

interface FriendListProps {
  onSelectFriend?: (friend: any) => void;
}

export const FriendList: React.FC<FriendListProps> = ({ onSelectFriend }) => {
  const {
    friends,
    friendsLoading,
    pendingCount,
    fetchFriends,
    fetchPendingRequests,
  } = useSocialStore();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    fetchFriends();
    fetchPendingRequests();
  }, []);
  
  const filteredFriends = friends.filter(f =>
    f.frog?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.user.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.user.ens?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // 按状态分组
  const onlineFriends = filteredFriends.filter(f => f.frog?.status === 'IDLE');
  const busyFriends = filteredFriends.filter(f => f.frog?.status !== 'IDLE');
  
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-50 to-emerald-50 rounded-2xl overflow-hidden">
      {/* 头部 */}
      <div className="p-4 bg-white/80 backdrop-blur border-b border-green-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-green-800">
              好友 <span className="text-green-500">({friends.length})</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 好友请求按钮 */}
            <button
              onClick={() => setShowRequests(true)}
              className="relative p-2 hover:bg-green-100 rounded-full transition"
            >
              <Bell className="w-5 h-5 text-green-600" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </button>
            
            {/* 添加好友按钮 */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-full text-sm font-medium hover:bg-green-600 transition shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              添加
            </button>
          </div>
        </div>
        
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索好友名字或地址..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-green-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent text-sm"
          />
        </div>
      </div>
      
      {/* 好友列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {friendsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent" />
          </div>
        ) : filteredFriends.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="text-5xl mb-4">🐸</div>
            <p className="text-gray-500 mb-2">
              {searchQuery ? '没有找到匹配的好友' : '还没有好友'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-green-600 font-medium hover:underline"
              >
                添加好友一起冒险吧！
              </button>
            )}
          </motion.div>
        ) : (
          <>
            {/* 在线好友 */}
            {onlineFriends.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1">
                  在家 ({onlineFriends.length})
                </h3>
                <div className="space-y-2">
                  <AnimatePresence>
                    {onlineFriends.map((friend, index) => (
                      <motion.div
                        key={friend.friendshipId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <FriendCard
                          friend={friend}
                          onClick={() => onSelectFriend?.(friend)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
            
            {/* 外出好友 */}
            {busyFriends.length > 0 && (
              <div>
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-1">
                  外出中 ({busyFriends.length})
                </h3>
                <div className="space-y-2">
                  <AnimatePresence>
                    {busyFriends.map((friend, index) => (
                      <motion.div
                        key={friend.friendshipId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <FriendCard
                          friend={friend}
                          onClick={() => onSelectFriend?.(friend)}
                          disabled
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* 弹窗 */}
      <AddFriendModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
      
      <FriendRequestList
        isOpen={showRequests}
        onClose={() => setShowRequests(false)}
      />
    </div>
  );
};

export default FriendList;
```

#### FriendCard.tsx

```tsx
// src/components/social/FriendCard.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { FriendItem } from '@/types/social';
import { MapPin, Heart, MoreHorizontal } from 'lucide-react';

interface FriendCardProps {
  friend: FriendItem;
  onClick?: () => void;
  disabled?: boolean;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  IDLE: { text: '在家', color: 'bg-green-100 text-green-700' },
  TRAVELING: { text: '旅行中', color: 'bg-blue-100 text-blue-700' },
  VISITING: { text: '串门中', color: 'bg-purple-100 text-purple-700' },
  RETURNING: { text: '返程中', color: 'bg-yellow-100 text-yellow-700' },
};

export const FriendCard: React.FC<FriendCardProps> = ({
  friend,
  onClick,
  disabled = false,
}) => {
  const { frog, user, intimacy } = friend;
  const status = frog?.status || 'IDLE';
  const statusInfo = statusLabels[status] || statusLabels.IDLE;
  
  // 亲密度等级
  const intimacyLevel = intimacy >= 80 ? '💕' : intimacy >= 50 ? '❤️' : intimacy >= 20 ? '💛' : '🤍';
  
  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={!disabled ? onClick : undefined}
      className={`
        flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-green-100
        ${disabled ? 'opacity-60 cursor-default' : 'cursor-pointer hover:shadow-md hover:border-green-200'}
        transition-all duration-200
      `}
    >
      {/* 头像 */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-green-100">
          {frog?.avatarUrl ? (
            <img
              src={frog.avatarUrl}
              alt={frog.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">
              🐸
            </div>
          )}
        </div>
        
        {/* 在线状态指示器 */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white ${
          status === 'IDLE' ? 'bg-green-500' : 'bg-gray-400'
        }`} />
      </div>
      
      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 truncate">
            {frog?.name || '未命名青蛙'}
          </span>
          <span className="text-sm">{intimacyLevel}</span>
        </div>
        
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusInfo.color}`}>
            {statusInfo.text}
          </span>
          
          {user.ens && (
            <span className="text-xs text-gray-400 truncate">
              {user.ens}
            </span>
          )}
        </div>
      </div>
      
      {/* 操作按钮 */}
      {!disabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            // 显示更多操作菜单
          }}
          className="p-1.5 hover:bg-gray-100 rounded-full transition"
        >
          <MoreHorizontal className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </motion.div>
  );
};

export default FriendCard;
```

#### AddFriendModal.tsx

```tsx
// src/components/social/AddFriendModal.tsx

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialStore } from '@/stores/socialStore';
import { friendApi } from '@/services/social/friend.api';
import { SearchUserResult } from '@/types/social';
import { X, Search, UserPlus, Check, Clock, Ban, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { debounce } from 'lodash';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { sendFriendRequest } = useSocialStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<SearchUserResult | null>(null);
  
  // 防抖搜索
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSearchResults([]);
        return;
      }
      
      setSearching(true);
      try {
        const results = await friendApi.searchUsers(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 300),
    []
  );
  
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    debouncedSearch(value);
  };
  
  const handleSendRequest = async (user: SearchUserResult) => {
    setSending(user.userId);
    try {
      const result = await sendFriendRequest(user.walletAddress, message);
      
      if (result.status === 'PENDING') {
        toast.success(`已向 ${user.frog?.name || '用户'} 发送好友请求`);
        // 更新本地状态
        setSearchResults(prev =>
          prev.map(u =>
            u.userId === user.userId
              ? { ...u, friendshipStatus: 'PENDING_SENT' }
              : u
          )
        );
      } else if (result.status === 'AUTO_ACCEPTED') {
        toast.success(`和 ${user.frog?.name || '用户'} 成为了好友！`);
        setSearchResults(prev =>
          prev.map(u =>
            u.userId === user.userId
              ? { ...u, friendshipStatus: 'FRIENDS' }
              : u
          )
        );
      } else if (result.status === 'ALREADY_FRIENDS') {
        toast.success('你们已经是好友了');
      }
      
      setSelectedUser(null);
      setMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || '发送请求失败');
    } finally {
      setSending(null);
    }
  };
  
  const getStatusButton = (user: SearchUserResult) => {
    switch (user.friendshipStatus) {
      case 'FRIENDS':
        return (
          <span className="flex items-center gap-1 text-green-600 text-sm">
            <Check className="w-4 h-4" />
            已是好友
          </span>
        );
      case 'PENDING_SENT':
        return (
          <span className="flex items-center gap-1 text-yellow-600 text-sm">
            <Clock className="w-4 h-4" />
            等待回应
          </span>
        );
      case 'PENDING_RECEIVED':
        return (
          <button
            onClick={() => {/* 跳转到请求列表 */}}
            className="text-sm text-blue-600 hover:underline"
          >
            查看请求
          </button>
        );
      case 'BLOCKED':
        return (
          <span className="flex items-center gap-1 text-gray-400 text-sm">
            <Ban className="w-4 h-4" />
            已屏蔽
          </span>
        );
      default:
        return (
          <button
            onClick={() => setSelectedUser(user)}
            disabled={sending === user.userId}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded-full hover:bg-green-600 transition disabled:opacity-50"
          >
            {sending === user.userId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            添加
          </button>
        );
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold text-gray-800">添加好友</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* 搜索框 */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="输入钱包地址、ENS 或青蛙名字"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent"
                autoFocus
              />
            </div>
            
            {searchQuery.length > 0 && searchQuery.length < 3 && (
              <p className="text-xs text-gray-400 mt-2">请至少输入 3 个字符</p>
            )}
          </div>
          
          {/* 搜索结果 */}
          <div className="max-h-80 overflow-y-auto px-4 pb-4">
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-green-500" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    {/* 头像 */}
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
                      {user.frog?.avatarUrl ? (
                        <img src={user.frog.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">🐸</span>
                      )}
                    </div>
                    
                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {user.frog?.name || '未命名青蛙'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user.ens || `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`}
                      </p>
                    </div>
                    
                    {/* 操作按钮 */}
                    {getStatusButton(user)}
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 3 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">没有找到用户</p>
                <p className="text-sm text-gray-400 mt-1">请检查地址或 ENS 是否正确</p>
              </div>
            ) : null}
          </div>
          
          {/* 发送请求确认 */}
          {selectedUser && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg"
            >
              <p className="text-sm text-gray-600 mb-3">
                向 <strong>{selectedUser.frog?.name || '用户'}</strong> 发送好友请求
              </p>
              
              <textarea
                placeholder="添加一句话介绍自己吧～ (选填)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                rows={2}
              />
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={() => handleSendRequest(selectedUser)}
                  disabled={sending === selectedUser.userId}
                  className="flex-1 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending === selectedUser.userId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      发送请求
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddFriendModal;
```

#### SendVisitModal.tsx

```tsx
// src/components/social/SendVisitModal.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialStore } from '@/stores/socialStore';
import { FriendItem } from '@/types/social';
import { X, MessageCircle, Gamepad2, Moon, Compass, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SendVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: FriendItem;
}

const activities = [
  { id: 'CHAT', name: '聊天', icon: MessageCircle, duration: '5分钟', color: 'bg-blue-100 text-blue-600' },
  { id: 'PLAY', name: '玩耍', icon: Gamepad2, duration: '10分钟', color: 'bg-pink-100 text-pink-600' },
  { id: 'NAP', name: '午睡', icon: Moon, duration: '15分钟', color: 'bg-purple-100 text-purple-600' },
  { id: 'EXPLORE', name: '探索', icon: Compass, duration: '20分钟', color: 'bg-orange-100 text-orange-600' },
];

export const SendVisitModal: React.FC<SendVisitModalProps> = ({
  isOpen,
  onClose,
  friend,
}) => {
  const { sendVisit } = useSocialStore();
  
  const [selectedActivity, setSelectedActivity] = useState('CHAT');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const handleSend = async () => {
    setSending(true);
    try {
      const departureMessage = await sendVisit(friend.user.id, selectedActivity, message);
      
      toast.success(departureMessage, {
        icon: '🐸',
        duration: 4000,
      });
      
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || '发起串门失败');
    } finally {
      setSending(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold text-gray-800">去串门</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* 好友信息 */}
          <div className="p-4 bg-green-50 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center overflow-hidden">
              {friend.frog?.avatarUrl ? (
                <img src={friend.frog.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🐸</span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-800">{friend.frog?.name || '好友'}</p>
              <p className="text-sm text-gray-500">
                {friend.user.ens || `${friend.user.walletAddress.slice(0, 8)}...`}
              </p>
            </div>
          </div>
          
          {/* 活动选择 */}
          <div className="p-4">
            <p className="text-sm font-medium text-gray-600 mb-3">选择活动</p>
            <div className="grid grid-cols-2 gap-2">
              {activities.map((activity) => {
                const Icon = activity.icon;
                const isSelected = selectedActivity === activity.id;
                
                return (
                  <button
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity.id)}
                    className={`
                      flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition
                      ${isSelected 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-100 hover:border-gray-200'
                      }
                    `}
                  >
                    <div className={`w-10 h-10 rounded-full ${activity.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm text-gray-700">{activity.name}</span>
                    <span className="text-xs text-gray-400">{activity.duration}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* 留言 */}
          <div className="px-4 pb-4">
            <textarea
              placeholder="给好友留个言吧～"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 resize-none text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              rows={2}
            />
          </div>
          
          {/* 发送按钮 */}
          <div className="p-4 border-t">
            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  出发中...
                </>
              ) : (
                <>
                  🐸 出发去串门！
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SendVisitModal;
```

---

## 4. 测试用例

### 4.1 后端单元测试

```typescript
// tests/unit/friend.service.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { friendService } from '../../src/services/social/friend.service';

const prisma = new PrismaClient();

describe('FriendService', () => {
  let testUser1: any;
  let testUser2: any;
  
  beforeEach(async () => {
    // 创建测试用户
    testUser1 = await prisma.user.create({
      data: {
        walletAddress: '0x1111111111111111111111111111111111111111',
        frog: {
          create: {
            name: 'TestFrog1',
            personality: 'PHILOSOPHER',
          },
        },
      },
    });
    
    testUser2 = await prisma.user.create({
      data: {
        walletAddress: '0x2222222222222222222222222222222222222222',
        frog: {
          create: {
            name: 'TestFrog2',
            personality: 'COMEDIAN',
          },
        },
      },
    });
  });
  
  afterEach(async () => {
    // 清理测试数据
    await prisma.friendship.deleteMany();
    await prisma.frog.deleteMany();
    await prisma.user.deleteMany();
  });
  
  describe('sendFriendRequest', () => {
    it('should create a pending friend request', async () => {
      const result = await friendService.sendFriendRequest(testUser1.id, {
        targetAddress: testUser2.walletAddress,
        message: 'Hi!',
      });
      
      expect(result.status).toBe('PENDING');
      expect(result.requestId).toBeDefined();
      
      const friendship = await prisma.friendship.findUnique({
        where: { id: result.requestId },
      });
      
      expect(friendship).not.toBeNull();
      expect(friendship?.requesterId).toBe(testUser1.id);
      expect(friendship?.addresseeId).toBe(testUser2.id);
    });
    
    it('should not allow adding self as friend', async () => {
      await expect(
        friendService.sendFriendRequest(testUser1.id, {
          targetAddress: testUser1.walletAddress,
        })
      ).rejects.toThrow('CANNOT_ADD_SELF');
    });
    
    it('should auto-accept if reverse request exists', async () => {
      // User2 先发请求给 User1
      await friendService.sendFriendRequest(testUser2.id, {
        targetAddress: testUser1.walletAddress,
      });
      
      // User1 发请求给 User2 - 应该自动接受
      const result = await friendService.sendFriendRequest(testUser1.id, {
        targetAddress: testUser2.walletAddress,
      });
      
      expect(result.status).toBe('AUTO_ACCEPTED');
      
      // 验证好友关系
      const areFriends = await friendService.areFriends(testUser1.id, testUser2.id);
      expect(areFriends).toBe(true);
    });
  });
  
  describe('acceptFriendRequest', () => {
    it('should accept a pending request and update friend counts', async () => {
      const { requestId } = await friendService.sendFriendRequest(testUser1.id, {
        targetAddress: testUser2.walletAddress,
      });
      
      await friendService.acceptFriendRequest(requestId, testUser2.id);
      
      // 验证好友关系
      const areFriends = await friendService.areFriends(testUser1.id, testUser2.id);
      expect(areFriends).toBe(true);
      
      // 验证计数更新
      const user1 = await prisma.user.findUnique({ where: { id: testUser1.id } });
      const user2 = await prisma.user.findUnique({ where: { id: testUser2.id } });
      
      expect(user1?.friendCount).toBe(1);
      expect(user2?.friendCount).toBe(1);
    });
    
    it('should not allow non-addressee to accept', async () => {
      const { requestId } = await friendService.sendFriendRequest(testUser1.id, {
        targetAddress: testUser2.walletAddress,
      });
      
      await expect(
        friendService.acceptFriendRequest(requestId, testUser1.id)
      ).rejects.toThrow('NOT_AUTHORIZED');
    });
  });
  
  describe('getFriends', () => {
    it('should return paginated friend list', async () => {
      // 建立好友关系
      const { requestId } = await friendService.sendFriendRequest(testUser1.id, {
        targetAddress: testUser2.walletAddress,
      });
      await friendService.acceptFriendRequest(requestId, testUser2.id);
      
      const result = await friendService.getFriends(testUser1.id);
      
      expect(result.friends).toHaveLength(1);
      expect(result.friends[0].user.id).toBe(testUser2.id);
      expect(result.total).toBe(1);
    });
  });
});
```

### 4.2 API 集成测试

```typescript
// tests/integration/friend.routes.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';

describe('Friend Routes', () => {
  let app: FastifyInstance;
  let authToken: string;
  
  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    
    // 模拟认证
    authToken = 'test-auth-token';
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  describe('POST /api/friends/request', () => {
    it('should return 400 for invalid address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          targetAddress: 'invalid-address',
        },
      });
      
      expect(response.statusCode).toBe(400);
    });
    
    it('should create friend request for valid address', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/friends/request',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          targetAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
          message: 'Hello!',
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
    });
  });
  
  describe('GET /api/friends', () => {
    it('should return friend list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/friends',
        headers: { authorization: `Bearer ${authToken}` },
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.friends)).toBe(true);
    });
    
    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/friends?page=1&limit=10',
        headers: { authorization: `Bearer ${authToken}` },
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.page).toBe(1);
    });
  });
});
```

---

## 5. 部署清单

### 5.1 环境变量

```bash
# .env.example 新增

# ==================== V2.0 Social System ====================

# ENS Resolution
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY

# WebSocket
WS_URL=wss://api.zetafrog.com
WS_PORT=3001

# Feature Flags
ENABLE_ONCHAIN_FRIENDS=false  # 是否启用链上好友注册

# Rate Limits
FRIEND_REQUEST_DAILY_LIMIT=50
VISIT_HOURLY_LIMIT=10

# CDN
CDN_URL=https://cdn.zetafrog.com
```

### 5.2 数据库迁移步骤

```bash
# 1. 生成迁移文件
npx prisma migrate dev --name v2_friend_system --create-only

# 2. 检查生成的 SQL
cat prisma/migrations/*/migration.sql

# 3. 应用迁移
npx prisma migrate deploy

# 4. 生成客户端
npx prisma generate
```

### 5.3 部署检查清单

- [ ] 数据库迁移完成
- [ ] 环境变量配置
- [ ] WebSocket 服务启动
- [ ] ENS 解析服务可用
- [ ] Redis 缓存配置
- [ ] API 路由注册
- [ ] 前端构建部署
- [ ] 端到端测试通过

---

## 6. 开发排期

| 周次 | 任务 | 交付物 |
|-----|------|--------|
| **第1周** | | |
| Day 1-2 | 数据库设计 & 迁移 | Prisma Schema, Migration |
| Day 3-4 | FriendService 核心实现 | friend.service.ts |
| Day 5 | 好友 API 路由 | friend.routes.ts |
| **第2周** | | |
| Day 1-2 | VisitService 实现 | visit.service.ts |
| Day 3 | 访问 API 路由 | visit.routes.ts |
| Day 4-5 | WebSocket 集成 | social.socket.ts |
| **第3周** | | |
| Day 1-2 | 前端好友列表组件 | FriendList, FriendCard |
| Day 3-4 | 前端添加好友流程 | AddFriendModal, Search |
| Day 5 | 前端好友请求管理 | FriendRequestList |
| **第4周** | | |
| Day 1-2 | 前端互访组件 | SendVisitModal, VisitHistory |
| Day 3 | 状态管理 & WebSocket Hook | socialStore, useSocialSocket |
| Day 4-5 | 测试 & Bug 修复 | 单元测试, 集成测试 |

---

**Eason，这份 P0 阶段完整方案包含了所有必要的代码实现。你可以直接按照这个文档开始开发。如果需要某个具体模块的更详细实现或有任何问题，随时告诉我！**