# ZetaFrog 徽章系统功能需求文档（简化版）

## 1. 系统概述

ZetaFrog 徽章系统是一个简单的成就系统，旨在记录青蛙的旅行里程碑，增强用户的收集乐趣。系统设计遵循"简单有趣"原则，避免过度复杂的机制，专注于旅行体验本身。

## 2. 设计原则

### 2.1 简化优先
- 最少的解锁条件类型
- 直观的进度追踪
- 与旅行系统无缝集成

### 2.2 核心目标
- 记录旅行里程碑
- 激励持续探索
- 提供收集乐趣

## 3. 系统架构

### 3.1 数据库设计（简化版）

#### 3.1.1 核心表结构

**Badge 表** - 徽章定义表
```sql
- id: String (主键)
- code: String (唯一标识，如 FIRST_TRIP)
- name: String (徽章名称)
- description: String (徽章描述)
- icon: String (emoji图标)
- requirement: String (解锁要求，如 "完成1次旅行")
- category: String (分类：trip/chain/discovery)
- createdAt: DateTime
```

**UserBadge 表** - 用户徽章关联表
```sql
- id: String (主键)
- userId: String (用户ID)
- badgeId: String (徽章ID)
- unlockedAt: DateTime (解锁时间)
- travelId: String (触发解锁的旅行ID)
```

### 3.2 后端服务架构

#### 3.2.1 API 路由层
- `GET /api/badges` - 获取所有徽章（含解锁状态）
- `GET /api/badges/unlocked` - 获取已解锁徽章

#### 3.2.2 服务层（简化版）
**核心功能：**
- `checkBadges()` - 检查并解锁徽章
- `getUserBadges()` - 获取用户徽章
- `getAllBadges()` - 获取所有徽章定义

#### 3.2.3 解锁逻辑（简化）
1. **旅行类**: 检查旅行次数
2. **链类**: 检查特定链访问
3. **发现类**: 检查特殊发现

### 3.3 前端架构

#### 3.3.1 页面组件
**BadgesPage.tsx** - 徽章页面
- 简单的徽章网格展示
- 基础筛选功能
- 进度统计

**BadgeCard.tsx** - 徽章卡片
- 统一的卡片样式
- 解锁状态显示

## 4. 功能需求（简化版）

### 4.1 核心功能

#### 4.1.1 徽章展示
- 网格布局展示所有徽章
- 已解锁徽章显示完整信息
- 未解锁徽章显示问号图标

#### 4.1.2 自动解锁
- 旅行完成时自动检查
- 简单的条件判断
- 解锁提示通知

#### 4.1.3 进度统计
- 显示收集进度
- 简单的数量统计

## 5. 徽章类型设计（简化版）

### 5.1 基础徽章（6个）

#### 5.1.1 旅行里程碑
- **🎒 第一次出门**: 完成第1次旅行
- **✈️ 小小旅行家**: 完成5次旅行
- **🌍 旅行达人**: 完成15次旅行

#### 5.1.2 链探索
- **🟡 BSC探索者**: 访问BSC测试链3次
- **💎 以太坊访客**: 访问以太坊测试链3次
- **⚡ ZetaChain体验官**: 访问ZetaChain测试链3次

### 5.2 特殊徽章（4个）
- **🌉 跨链旅行者**: 访问过2条不同的链
- **🍀 幸运发现**: 发现稀有纪念品
- **🐋 巨鲸观察者**: 发现余额超过100的钱包
- **🎯 收藏家**: 收集10个纪念品

## 6. 技术实现（简化版）

### 6.1 后端实现

#### 6.1.1 徽章检查逻辑
```typescript
async checkBadges(userId: string, travelData: TravelData) {
  const badges = await Badge.findMany();
  const userBadges = await UserBadge.findMany({ where: { userId } });
  
  for (const badge of badges) {
    if (userBadges.find(ub => ub.badgeId === badge.id)) continue;
    
    if (this meets condition(badge, travelData)) {
      await UserBadge.create({
        userId,
        badgeId: badge.id,
        travelId: travelData.id
      });
    }
  }
}
```

#### 6.1.2 触发时机
- 旅行完成时检查
- 简单的条件判断
- 避免复杂查询

### 6.2 前端实现

#### 6.2.1 组件结构
```typescript
// 徽章页面
function BadgesPage() {
  const [badges, setBadges] = useState([]);
  
  return (
    <div>
      <div className="badge-grid">
        {badges.map(badge => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    </div>
  );
}

// 徽章卡片
function BadgeCard({ badge }) {
  return (
    <div className={`badge ${badge.unlocked ? 'unlocked' : 'locked'}`}>
      <div className="icon">{badge.unlocked ? badge.icon : '❓'}</div>
      <div className="name">{badge.unlocked ? badge.name : '???'}</div>
    </div>
  );
}
```

#### 6.2.2 样式设计
- 统一的卡片样式
- 简单的解锁状态区分
- 基础的悬停效果

## 7. MVP 实现计划

### 7.1 必须实现功能
- [x] 徽章数据库表（简化版）
- [x] 基础API接口
- [x] 徽章展示页面
- [x] 自动解锁机制
- [x] 10个基础徽章

### 7.2 实现优先级
1. **第一周**: 数据库结构和基础徽章数据
2. **第二周**: 后端API和解锁逻辑
3. **第三周**: 前端页面和组件
4. **第四周**: 集成测试和优化

## 8. 简化优势

### 8.1 开发效率
- 减少复杂度，快速实现
- 降低维护成本
- 易于理解和修改

### 8.2 用户体验
- 直观的成就系统
- 不会过度复杂化
- 专注于旅行乐趣

### 8.3 扩展性
- 预留扩展接口
- 可逐步增加功能
- 保持架构简洁

## 9. 与旅行系统集成

### 9.1 解锁时机
- 旅行完成时自动检查
- 与纪念品系统关联
- 简单的触发条件

### 9.2 数据关联
- 使用travelId记录解锁来源
- 避免复杂的统计表
- 保持数据一致性

## 10. 成功标准

### 10.1 技术标准
- 徽章解锁正常工作
- 页面加载流畅
- 数据准确无误

### 10.2 用户体验
- 界面简洁明了
- 操作直观简单
- 增强旅行乐趣

---

*本文档版本: v2.0 (简化版)*  
*最后更新: 2025年12月20日*  
*设计原则: 简单、有趣、易实现*