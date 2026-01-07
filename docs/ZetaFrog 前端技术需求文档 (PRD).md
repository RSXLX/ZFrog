# ZetaFrog 前端技术需求文档 (PRD)

## 📋 文档信息

| 项目         | 内容                 |
| ------------ | -------------------- |
| **项目名称** | ZetaFrog Desktop Pet |
| **文档版本** | v1.0                 |
| **创建日期** | 2024-12-17           |
| **文档类型** | 前端技术需求文档     |
| **目标读者** | 前端开发工程师       |

------

## 1. 项目概述

### 1.1 产品简介

ZetaFrog 是一款跨平台桌面宠物应用，用户可以领养一只 AI 驱动的青蛙，它会在桌面上陪伴用户，并能穿越不同的区块链进行"旅行"，带回有趣的故事和纪念品。

### 1.2 技术栈选型

| 类别           | 技术                   | 版本        | 选型理由                           |
| -------------- | ---------------------- | ----------- | ---------------------------------- |
| **桌面框架**   | Tauri                  | 2.0+        | 轻量（~5MB）、低内存、跨平台、安全 |
| **前端框架**   | React                  | 18.2+       | 生态成熟、开发效率高               |
| **语言**       | TypeScript             | 5.0+        | 类型安全、可维护性强               |
| **构建工具**   | Vite                   | 5.0+        | 快速热更新、原生 ESM               |
| **样式方案**   | TailwindCSS            | 3.4+        | 原子化 CSS、快速开发               |
| **动画库**     | Framer Motion          | 10.0+       | 声明式动画、手势支持               |
| **精灵动画**   | Lottie-React           | 2.4+        | JSON 动画、文件小                  |
| **状态管理**   | Zustand                | 4.4+        | 轻量、简单、支持持久化             |
| **钱包连接**   | RainbowKit + wagmi     | 2.0+        | 主流钱包支持、UX 好                |
| **区块链交互** | ethers.js / viem       | 6.0+ / 2.0+ | ZetaChain 兼容                     |
| **本地存储**   | Tauri SQLite Plugin    | -           | 离线数据持久化                     |
| **通知系统**   | Tauri Notification API | -           | 系统原生通知                       |

### 1.3 支持平台

| 平台                  | 优先级 | 备注           |
| --------------------- | ------ | -------------- |
| Windows 10/11         | P0     | 主要开发平台   |
| macOS 12+             | P0     | 需测试透明窗口 |
| Linux (Ubuntu 22.04+) | P1     | 基础支持       |

------

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ZetaFrog Desktop App                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Tauri Shell (Rust)                       │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │   │
│  │  │ Window Mgr  │ │ Tray Icon   │ │ Native Notifications│    │   │
│  │  │ 窗口管理    │ │ 系统托盘    │ │ 系统通知            │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐    │   │
│  │  │ SQLite DB   │ │ File System │ │ IPC Bridge          │    │   │
│  │  │ 本地数据库  │ │ 文件系统    │ │ 前后端通信          │    │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↑↓ IPC                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    React Frontend (WebView)                  │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │                   UI Layer (组件层)                   │   │   │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │   │   │
│  │  │  │ FrogPet    │ │ Postcard   │ │ Wardrobe       │   │   │   │
│  │  │  │ 青蛙主体   │ │ 明信片弹窗 │ │ 衣柜装扮       │   │   │   │
│  │  │  └────────────┘ └────────────┘ └────────────────┘   │   │   │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │   │   │
│  │  │  │ TravelStatus│ │ Visitor   │ │ ContextMenu    │   │   │   │
│  │  │  │ 旅行状态   │ │ 访客通知   │ │ 右键菜单       │   │   │   │
│  │  │  └────────────┘ └────────────┘ └────────────────┘   │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                              ↑↓                              │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │               State Layer (状态层)                    │   │   │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │   │   │
│  │  │  │ FrogStore  │ │ TravelStore│ │ WalletStore    │   │   │   │
│  │  │  │ 青蛙状态   │ │ 旅行状态   │ │ 钱包状态       │   │   │   │
│  │  │  └────────────┘ └────────────┘ └────────────────┘   │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                              ↑↓                              │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │              Service Layer (服务层)                   │   │   │
│  │  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │   │   │
│  │  │  │ AIService  │ │ ChainService│ │ StorageService│   │   │   │
│  │  │  │ AI 接口    │ │ 链上交互   │ │ 本地存储       │   │   │   │
│  │  │  └────────────┘ └────────────┘ └────────────────┘   │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↑↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────────────┐
│                        External Services                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ AI API      │ │ ZetaChain   │ │ Chain APIs  │ │ Image Gen   │   │
│  │ Qwen/GPT    │ │ RPC         │ │ Etherscan   │ │ DALL-E      │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 目录结构

```
zetafrog/
├── src-tauri/                    # Tauri Rust 后端
│   ├── src/
│   │   ├── main.rs              # 入口
│   │   ├── commands/            # IPC 命令
│   │   ├── db/                  # SQLite 操作
│   │   └── utils/               # 工具函数
│   ├── Cargo.toml
│   └── tauri.conf.json          # Tauri 配置
│
├── src/                          # React 前端
│   ├── main.tsx                 # React 入口
│   ├── App.tsx                  # 根组件
│   │
│   ├── components/              # UI 组件
│   │   ├── frog/                # 青蛙相关
│   │   │   ├── FrogPet.tsx      # 青蛙主体
│   │   │   ├── FrogSprite.tsx   # 精灵动画
│   │   │   ├── FrogBubble.tsx   # 对话气泡
│   │   │   └── FrogAccessory.tsx # 装饰物
│   │   │
│   │   ├── travel/              # 旅行相关
│   │   │   ├── Portal.tsx       # 传送门
│   │   │   ├── TravelStatus.tsx # 旅行状态卡片
│   │   │   └── TravelProgress.tsx # 进度条
│   │   │
│   │   ├── postcard/            # 明信片相关
│   │   │   ├── PostcardModal.tsx # 明信片弹窗
│   │   │   ├── DiaryContent.tsx # 日记内容
│   │   │   └── SouvenirList.tsx # 纪念品列表
│   │   │
│   │   ├── wardrobe/            # 衣柜相关
│   │   │   ├── WardrobeModal.tsx # 衣柜弹窗
│   │   │   ├── AccessoryGrid.tsx # 装饰品网格
│   │   │   └── FrogPreview.tsx  # 预览
│   │   │
│   │   ├── visitor/             # 访客相关
│   │   │   ├── VisitorNotice.tsx # 访客通知
│   │   │   └── VisitorCard.tsx  # 访客卡片
│   │   │
│   │   ├── menu/                # 菜单相关
│   │   │   ├── ContextMenu.tsx  # 右键菜单
│   │   │   └── TrayMenu.tsx     # 托盘菜单
│   │   │
│   │   └── common/              # 通用组件
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       └── Loading.tsx
│   │
│   ├── stores/                  # Zustand 状态
│   │   ├── frogStore.ts         # 青蛙状态
│   │   ├── travelStore.ts       # 旅行状态
│   │   ├── walletStore.ts       # 钱包状态
│   │   ├── settingsStore.ts     # 设置状态
│   │   └── index.ts
│   │
│   ├── services/                # 服务层
│   │   ├── ai/                  # AI 服务
│   │   │   ├── diaryGenerator.ts
│   │   │   ├── statusGenerator.ts
│   │   │   └── imageGenerator.ts
│   │   │
│   │   ├── chain/               # 链上服务
│   │   │   ├── zetachain.ts
│   │   │   ├── addressAnalyzer.ts
│   │   │   └── nftContract.ts
│   │   │
│   │   ├── storage/             # 存储服务
│   │   │   ├── database.ts
│   │   │   └── fileSystem.ts
│   │   │
│   │   └── notification/        # 通知服务
│   │       └── systemNotify.ts
│   │
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useFrogAnimation.ts
│   │   ├── useDragAndDrop.ts
│   │   ├── useWindowPosition.ts
│   │   ├── useWallet.ts
│   │   └── useTravel.ts
│   │
│   ├── utils/                   # 工具函数
│   │   ├── constants.ts         # 常量定义
│   │   ├── helpers.ts           # 辅助函数
│   │   └── formatters.ts        # 格式化函数
│   │
│   ├── types/                   # TypeScript 类型
│   │   ├── frog.ts
│   │   ├── travel.ts
│   │   ├── souvenir.ts
│   │   └── index.ts
│   │
│   ├── assets/                  # 静态资源
│   │   ├── animations/          # Lottie JSON
│   │   │   ├── frog-idle.json
│   │   │   ├── frog-walk.json
│   │   │   ├── frog-sleep.json
│   │   │   ├── frog-eat.json
│   │   │   ├── frog-happy.json
│   │   │   └── portal.json
│   │   │
│   │   ├── images/              # 图片资源
│   │   │   ├── accessories/     # 装饰品图片
│   │   │   ├── souvenirs/       # 纪念品图片
│   │   │   └── ui/              # UI 图片
│   │   │
│   │   └── sounds/              # 音效
│   │       ├── pop.mp3
│   │       ├── success.mp3
│   │       └── notification.mp3
│   │
│   └── styles/                  # 样式
│       ├── globals.css
│       └── animations.css
│
├── public/                      # 公共资源
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

------

## 3. 窗口管理需求

### 3.1 主窗口（青蛙窗口）

| 属性           | 值               | 说明                         |
| -------------- | ---------------- | ---------------------------- |
| **类型**       | 透明无边框窗口   | 只显示青蛙，背景透明         |
| **尺寸**       | 200x200 px       | 青蛙活动区域                 |
| **位置**       | 屏幕底部，可拖拽 | 初始位置任务栏上方           |
| **层级**       | Always on Top    | 始终在最上层                 |
| **点击穿透**   | 部分区域穿透     | 青蛙实体可点击，其他区域穿透 |
| **任务栏显示** | 不显示           | 不在任务栏出现               |

**Tauri 配置**:

```json
{
  "windows": [
    {
      "label": "frog",
      "title": "ZetaFrog",
      "width": 200,
      "height": 200,
      "resizable": false,
      "decorations": false,
      "transparent": true,
      "alwaysOnTop": true,
      "skipTaskbar": true,
      "x": null,
      "y": null
    }
  ]
}
```

### 3.2 弹窗窗口

| 窗口类型   | 尺寸       | 特性                 |
| ---------- | ---------- | -------------------- |
| 明信片弹窗 | 480x640 px | 居中、可拖拽、有阴影 |
| 衣柜弹窗   | 560x480 px | 居中、可拖拽         |
| 访客通知   | 320x180 px | 右下角、自动消失     |
| 旅行状态   | 280x120 px | 右上角、半透明       |
| 右键菜单   | 动态       | 跟随鼠标位置         |

### 3.3 系统托盘

| 功能     | 说明                         |
| -------- | ---------------------------- |
| 图标     | 青蛙图标，旅行中显示不同状态 |
| 左键单击 | 显示/隐藏青蛙                |
| 右键菜单 | 显示操作菜单                 |

**托盘菜单项**:

```
┌─────────────────────────────────┐
│ 🐸 小跳跳 - 在家休息中           │
├─────────────────────────────────┤
│ 🎲 随机冒险                      │
│ 🏠 串门                          │
│ ⭐ 名人探访                      │
├─────────────────────────────────┤
│ 🎒 查看背包                      │
│ 📮 历史明信片                    │
│ 👔 更换装扮                      │
├─────────────────────────────────┤
│ ⚙️ 设置                         │
│ ❓ 关于                          │
│ ❌ 退出                          │
└─────────────────────────────────┘
```

------

## 4. 组件详细设计

### 4.1 FrogPet（青蛙主体组件）

#### 4.1.1 组件职责

- 渲染青蛙精灵动画
- 处理拖拽移动
- 响应用户交互（点击、右键）
- 管理青蛙状态机
- 显示装饰品

#### 4.1.2 Props 定义

```typescript
interface FrogPetProps {
  // 青蛙数据
  frog: FrogData;
  // 当前状态
  state: FrogState;
  // 装备的装饰品
  accessories: Accessory[];
  // 事件回调
  onRightClick: (position: Position) => void;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: (position: Position) => void;
  onDropReceive: (item: DroppableItem) => void;
}

interface FrogData {
  id: string;
  name: string;
  personality: PersonalityType;
  createdAt: number;
  totalTrips: number;
  level: FrogLevel;
}

type FrogState = 
  | 'idle'        // 待机
  | 'walking'     // 走动
  | 'sleeping'    // 睡觉
  | 'eating'      // 吃东西
  | 'happy'       // 开心
  | 'excited'     // 兴奋
  | 'sad'         // 难过
  | 'thinking'    // 思考
  | 'preparing'   // 准备出发
  | 'away';       // 外出中

type PersonalityType = 
  | 'philosopher' // 哲学家
  | 'comedian'    // 段子手
  | 'poet'        // 诗人
  | 'gossip';     // 八卦蛙

type FrogLevel = 
  | 'tadpole'     // 蝌蚪 (0-5件)
  | 'small'       // 小青蛙 (6-20件)
  | 'traveler'    // 旅行家 (21-50件)
  | 'explorer'    // 探险王 (51-100件)
  | 'master';     // 全链之蛙 (100+件)
```

#### 4.1.3 状态机

```typescript
const frogStateMachine = {
  idle: {
    on: {
      CLICK: 'happy',
      START_WALK: 'walking',
      FEED: 'eating',
      SLEEP_TIME: 'sleeping',
      START_TRAVEL: 'preparing',
    }
  },
  walking: {
    on: {
      STOP: 'idle',
      REACH_EDGE: 'idle',
      CLICK: 'happy',
    }
  },
  sleeping: {
    on: {
      WAKE_UP: 'idle',
      CLICK: 'idle', // 点击唤醒
    }
  },
  eating: {
    on: {
      FINISH_EAT: 'preparing',
    }
  },
  preparing: {
    on: {
      ENTER_PORTAL: 'away',
      CANCEL: 'idle',
    }
  },
  away: {
    on: {
      RETURN: 'excited',
    }
  },
  excited: {
    on: {
      CALM_DOWN: 'idle',
    }
  },
  happy: {
    on: {
      CALM_DOWN: 'idle',
    }
  },
};
```

#### 4.1.4 动画资源需求

| 状态      | 动画文件          | 帧数 | 循环 | 时长 |
| --------- | ----------------- | ---- | ---- | ---- |
| idle      | frog-idle.json    | 24   | ✅    | 2s   |
| walking   | frog-walk.json    | 12   | ✅    | 0.5s |
| sleeping  | frog-sleep.json   | 30   | ✅    | 3s   |
| eating    | frog-eat.json     | 20   | ❌    | 1.5s |
| happy     | frog-happy.json   | 16   | ❌    | 1s   |
| excited   | frog-excited.json | 24   | ❌    | 2s   |
| preparing | frog-prepare.json | 18   | ❌    | 1.5s |

#### 4.1.5 组件实现示例

```tsx
// components/frog/FrogPet.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import Lottie from 'lottie-react';
import { useFrogStore } from '@/stores/frogStore';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import FrogSprite from './FrogSprite';
import FrogBubble from './FrogBubble';
import FrogAccessory from './FrogAccessory';

export const FrogPet: React.FC<FrogPetProps> = ({
  frog,
  state,
  accessories,
  onRightClick,
  onClick,
  onDragStart,
  onDragEnd,
  onDropReceive,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const { isDragging, dragHandlers } = useDragAndDrop({
    onDragStart,
    onDragEnd: (pos) => onDragEnd(pos),
    onDropReceive,
  });

  // 随机冒泡
  useEffect(() => {
    if (state === 'idle') {
      const timer = setInterval(() => {
        if (Math.random() < 0.1) { // 10% 概率冒泡
          setBubble(getRandomBubbleText(frog.personality));
          setTimeout(() => setBubble(null), 3000);
        }
      }, 10000);
      return () => clearInterval(timer);
    }
  }, [state, frog.personality]);

  // 随机走动
  useEffect(() => {
    if (state === 'idle') {
      const timer = setInterval(() => {
        if (Math.random() < 0.2) { // 20% 概率走动
          // 触发走动状态
        }
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [state]);

  return (
    <motion.div
      ref={containerRef}
      className="frog-container"
      style={{
        position: 'fixed',
        width: 150,
        height: 150,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      drag
      dragMomentum={false}
      onContextMenu={(e) => {
        e.preventDefault();
        onRightClick({ x: e.clientX, y: e.clientY });
      }}
      onClick={onClick}
      {...dragHandlers}
    >
      {/* 青蛙精灵 */}
      <FrogSprite 
        state={state} 
        level={frog.level}
        flipped={position.x < window.innerWidth / 2}
      />
      
      {/* 装饰品层 */}
      {accessories.map((acc) => (
        <FrogAccessory 
          key={acc.id} 
          accessory={acc}
          slot={acc.slot}
        />
      ))}
      
      {/* 对话气泡 */}
      {bubble && (
        <FrogBubble text={bubble} />
      )}
      
      {/* 状态指示器 */}
      {state === 'away' && (
        <div className="away-indicator">
          ✈️ 旅行中...
        </div>
      )}
    </motion.div>
  );
};
```

------

### 4.2 Portal（传送门组件）

#### 4.2.1 组件职责

- 在屏幕边缘显示传送门动画
- 检测青蛙拖入
- 触发旅行开始

#### 4.2.2 Props 定义

```typescript
interface PortalProps {
  isVisible: boolean;
  position: 'left' | 'right' | 'top' | 'bottom';
  targetChain?: ChainType;
  onFrogEnter: () => void;
}

type ChainType = 
  | 'ethereum'
  | 'zetachain'
  | 'arbitrum'
  | 'solana'
  | 'bitcoin'
  | 'bsc'
  | 'base'
  | 'random';
```

#### 4.2.3 视觉设计

```
传送门状态:
┌─────────────────────┐
│  隐藏状态            │  完全不可见
├─────────────────────┤
│  激活状态            │  当青蛙被拖起时出现
│  (拖拽中)           │  边缘出现发光漩涡
├─────────────────────┤
│  靠近状态            │  青蛙靠近时放大、加速旋转
│                     │  显示目标链 Logo
├─────────────────────┤
│  吸入状态            │  青蛙进入时播放吸入动画
│                     │  粒子效果
└─────────────────────┘
```

#### 4.2.4 动画需求

```typescript
const portalAnimationConfig = {
  // 出现动画
  appear: {
    scale: [0, 1.2, 1],
    opacity: [0, 1],
    duration: 0.5,
  },
  // 待机旋转
  idle: {
    rotate: 360,
    duration: 4,
    repeat: Infinity,
    ease: 'linear',
  },
  // 激活状态
  activated: {
    scale: [1, 1.3, 1.2],
    rotate: 360,
    duration: 1,
    repeat: Infinity,
  },
  // 吸入效果
  absorb: {
    scale: [1.2, 1.5, 0],
    duration: 0.8,
  },
};
```

------

### 4.3 PostcardModal（明信片弹窗）

#### 4.3.1 组件职责

- 展示旅行日记和图片
- 展示获得的纪念品
- 支持分享功能
- 支持拖拽保存

#### 4.3.2 Props 定义

```typescript
interface PostcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  postcard: PostcardData;
  onShare: (platform: SharePlatform) => void;
  onSave: () => void;
}

interface PostcardData {
  id: string;
  tripId: string;
  createdAt: number;
  
  // 目标信息
  targetAddress: string;
  targetENS?: string;
  targetChain: ChainType;
  
  // AI 生成内容
  diary: string;
  mood: MoodType;
  highlight: string;
  
  // 图片
  imageUrl: string;
  
  // 纪念品
  souvenirs: Souvenir[];
  
  // 留下的东西
  giftLeft: GiftType;
}

interface Souvenir {
  id: string;
  name: string;
  icon: string;
  rarity: 1 | 2 | 3 | 4 | 5;
  description: string;
  obtainedFrom: string;
}

type MoodType = 'excited' | 'curious' | 'shocked' | 'philosophical' | 'amused';
type SharePlatform = 'twitter' | 'farcaster' | 'clipboard';
type GiftType = 'poop' | 'sticker' | 'flower' | 'note';
```

#### 4.3.3 布局设计

```
┌────────────────────────────────────────────────────┐
│  📮 旅行明信片                              [✕]   │
├────────────────────────────────────────────────────┤
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │                                              │ │
│  │             🖼️ AI 生成图片                   │ │
│  │           (青蛙在目标地址的旅行照)            │ │
│  │                                              │ │
│  │                  400x300                     │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  📍 Ethereum · vitalik.eth                        │
│  ⏰ 2024-12-17 15:30                              │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  📝 青蛙日记                                  │ │
│  │                                              │ │
│  │  "呱！今天去了传说中 V 神的家！              │ │
│  │                                              │ │
│  │   哇，他家好大，但是...好乱啊！到处都是      │ │
│  │   别人空投给他的奇怪代币，什么'ElonSperm'、 │ │
│  │   'ShibaInuMom'，堆得像小山一样，落满了灰。 │ │
│  │                                              │ │
│  │   不过我发现了一个秘密：他最近偷偷给一个     │ │
│  │   动物保护组织捐了一大笔钱，但没告诉任何人。 │ │
│  │   V 神，你是个好人！🐸💚                     │ │
│  │                                              │ │
│  │   我在他家门口留了一坨金色的便便作为纪念，   │ │
│  │   希望他不要介意，呱呱！"                    │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  🎁 获得纪念品:                                    │
│  ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ 🔷     │ │ 🌟     │ │ 🦄     │               │
│  │以太水晶│ │OG徽章  │ │独角兽角│               │
│  │  ⭐⭐  │ │⭐⭐⭐⭐│ │ ⭐⭐⭐ │               │
│  └────────┘ └────────┘ └────────┘               │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │ [🐦 分享到 Twitter]  [📋 复制]  [💾 保存]   │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
└────────────────────────────────────────────────────┘
```

#### 4.3.4 拖拽保存功能

```typescript
// 支持将明信片拖拽到桌面保存
const handleDragStart = (e: DragEvent) => {
  // 生成图片并设置为拖拽数据
  const imageBlob = await generatePostcardImage(postcard);
  e.dataTransfer.setData('DownloadURL', 
    `image/png:ZetaFrog_${postcard.id}.png:${imageBlob}`
  );
};
```

------

### 4.4 TravelStatus（旅行状态卡片）

#### 4.4.1 组件职责

- 显示青蛙当前旅行进度
- 实时更新状态文案
- 显示目标链和地址

#### 4.4.2 Props 定义

```typescript
interface TravelStatusProps {
  isVisible: boolean;
  travel: TravelData;
}

interface TravelData {
  id: string;
  startedAt: number;
  estimatedDuration: number; // 秒
  currentStage: TravelStage;
  targetChain: ChainType;
  targetAddress?: string;
  targetENS?: string;
  statusMessages: StatusMessage[];
}

type TravelStage = 
  | 'departing'     // 出发中
  | 'crossing'      // 跨链穿越中
  | 'arriving'      // 到达中
  | 'exploring'     // 探索中
  | 'returning';    // 返回中

interface StatusMessage {
  timestamp: number;
  message: string;
  type: 'info' | 'discovery' | 'joke';
}
```

#### 4.4.3 布局设计

```
┌───────────────────────────────────────┐
│  📍 小跳跳の旅行状态                   │
├───────────────────────────────────────┤
│                                       │
│  🌍 Ethereum → ⚡ ZetaChain → 🎯 ???  │
│  ████████████░░░░░░░░░  56%          │
│                                       │
│  💬 "到 Ethereum 了，Gas 费好贵..."   │
│                                       │
│  ⏱️ 预计还需 3 分钟                    │
│                                       │
└───────────────────────────────────────┘
```

------

### 4.5 ContextMenu（右键菜单）

#### 4.5.1 Props 定义

```typescript
interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  frogState: FrogState;
  onAction: (action: MenuAction) => void;
}

type MenuAction = 
  | 'random_travel'
  | 'visit_friend'
  | 'visit_celebrity'
  | 'view_backpack'
  | 'view_postcards'
  | 'change_outfit'
  | 'settings'
  | 'about';
```

#### 4.5.2 菜单结构

```typescript
const menuItems: MenuItem[] = [
  {
    id: 'travel',
    label: '🚀 出发冒险',
    children: [
      { id: 'random_travel', label: '🎲 随机冒险', shortcut: 'R' },
      { id: 'visit_friend', label: '🏠 串门', shortcut: 'V' },
      { id: 'visit_celebrity', label: '⭐ 名人探访' },
    ],
    disabled: (state) => state === 'away', // 外出时禁用
  },
  { type: 'separator' },
  { id: 'view_backpack', label: '🎒 查看背包', shortcut: 'B' },
  { id: 'view_postcards', label: '📮 历史明信片', shortcut: 'P' },
  { id: 'change_outfit', label: '👔 更换装扮', shortcut: 'O' },
  { type: 'separator' },
  { id: 'settings', label: '⚙️ 设置', shortcut: 'S' },
  { id: 'about', label: '❓ 关于 ZetaFrog' },
];
```

------

## 5. 状态管理

### 5.1 FrogStore

```typescript
// stores/frogStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FrogState {
  // 青蛙数据
  frog: FrogData | null;
  currentState: FrogState;
  accessories: Accessory[];
  souvenirs: Souvenir[];
  
  // Actions
  initFrog: (walletAddress: string) => Promise<void>;
  setFrogState: (state: FrogState) => void;
  equipAccessory: (accessory: Accessory, slot: AccessorySlot) => void;
  unequipAccessory: (slot: AccessorySlot) => void;
  addSouvenir: (souvenir: Souvenir) => void;
  updateFrogLevel: () => void;
}

export const useFrogStore = create<FrogState>()(
  persist(
    (set, get) => ({
      frog: null,
      currentState: 'idle',
      accessories: [],
      souvenirs: [],

      initFrog: async (walletAddress) => {
        // 根据钱包地址生成青蛙
        const frogData = await generateFrogFromWallet(walletAddress);
        set({ frog: frogData });
      },

      setFrogState: (state) => {
        set({ currentState: state });
      },

      equipAccessory: (accessory, slot) => {
        set((state) => ({
          accessories: [
            ...state.accessories.filter(a => a.slot !== slot),
            { ...accessory, slot }
          ]
        }));
      },

      addSouvenir: (souvenir) => {
        set((state) => {
          // 检查是否已有
          if (state.souvenirs.find(s => s.id === souvenir.id)) {
            return state;
          }
          const newSouvenirs = [...state.souvenirs, souvenir];
          // 更新等级
          const newLevel = calculateLevel(newSouvenirs.length);
          return {
            souvenirs: newSouvenirs,
            frog: state.frog ? { ...state.frog, level: newLevel } : null,
          };
        });
      },
    }),
    {
      name: 'zetafrog-storage',
    }
  )
);
```

### 5.2 TravelStore

```typescript
// stores/travelStore.ts
import { create } from 'zustand';

interface TravelState {
  // 当前旅行
  currentTravel: TravelData | null;
  isInTravel: boolean;
  
  // 历史记录
  travelHistory: TravelRecord[];
  postcards: PostcardData[];
  
  // Actions
  startTravel: (config: TravelConfig) => Promise<void>;
  updateTravelStatus: (stage: TravelStage, message: string) => void;
  completeTravel: (result: TravelResult) => void;
  cancelTravel: () => void;
}

interface TravelConfig {
  type: 'random' | 'specific' | 'celebrity';
  targetAddress?: string;
  targetChain?: ChainType;
}

interface TravelResult {
  targetAddress: string;
  targetChain: ChainType;
  addressData: AddressAnalysis;
  diary: string;
  imageUrl: string;
  souvenirs: Souvenir[];
}

export const useTravelStore = create<TravelState>((set, get) => ({
  currentTravel: null,
  isInTravel: false,
  travelHistory: [],
  postcards: [],

  startTravel: async (config) => {
    // 1. 确定目标
    const target = await resolveTarget(config);
    
    // 2. 创建旅行记录
    const travel: TravelData = {
      id: generateId(),
      startedAt: Date.now(),
      estimatedDuration: calculateDuration(target.chain),
      currentStage: 'departing',
      targetChain: target.chain,
      targetAddress: target.address,
      statusMessages: [],
    };
    
    set({ currentTravel: travel, isInTravel: true });
    
    // 3. 开始旅行流程（异步）
    executeTravelFlow(travel);
  },

  updateTravelStatus: (stage, message) => {
    set((state) => ({
      currentTravel: state.currentTravel ? {
        ...state.currentTravel,
        currentStage: stage,
        statusMessages: [
          ...state.currentTravel.statusMessages,
          { timestamp: Date.now(), message, type: 'info' }
        ]
      } : null
    }));
  },

  completeTravel: (result) => {
    // 生成明信片
    const postcard: PostcardData = {
      id: generateId(),
      tripId: get().currentTravel!.id,
      createdAt: Date.now(),
      targetAddress: result.targetAddress,
      targetChain: result.targetChain,
      diary: result.diary,
      mood: extractMood(result.diary),
      imageUrl: result.imageUrl,
      souvenirs: result.souvenirs,
      giftLeft: 'poop',
    };
    
    set((state) => ({
      currentTravel: null,
      isInTravel: false,
      postcards: [postcard, ...state.postcards],
      travelHistory: [...state.travelHistory, {
        id: state.currentTravel!.id,
        completedAt: Date.now(),
        targetAddress: result.targetAddress,
        targetChain: result.targetChain,
      }],
    }));
  },
}));
```

### 5.3 WalletStore

```typescript
// stores/walletStore.ts
import { create } from 'zustand';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  isConnected: false,
  chainId: null,

  connect: async () => {
    // 使用 wagmi 连接
  },

  disconnect: () => {
    set({ address: null, isConnected: false, chainId: null });
  },
}));
```

------

## 6. 服务层设计

### 6.1 AI Service

```typescript
// services/ai/diaryGenerator.ts

interface DiaryGeneratorConfig {
  frogName: string;
  personality: PersonalityType;
  targetAddress: string;
  targetENS?: string;
  targetChain: ChainType;
  addressData: AddressAnalysis;
}

interface AddressAnalysis {
  accountAge: string;
  mainHoldings: TokenHolding[];
  recentTransactions: Transaction[];
  protocols: string[];
  tags: string[];
  specialFindings: string[];
}

export async function generateDiary(config: DiaryGeneratorConfig): Promise<DiaryResult> {
  const prompt = buildDiaryPrompt(config);
  
  const response = await fetch(AI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'qwen-turbo',
      messages: [
        { role: 'system', content: DIARY_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  const result = await response.json();
  return parseDiaryResponse(result);
}

function buildDiaryPrompt(config: DiaryGeneratorConfig): string {
  return `
## 你访问的地址信息
- 地址: ${config.targetAddress}
- ENS: ${config.targetENS || '无'}
- 所在链: ${config.targetChain}
- 账户年龄: ${config.addressData.accountAge}
- 主要持仓: ${formatHoldings(config.addressData.mainHoldings)}
- 最近交易: ${formatTransactions(config.addressData.recentTransactions)}
- 交互协议: ${config.addressData.protocols.join(', ')}
- 特殊发现: ${config.addressData.specialFindings.join('; ')}

请用「${config.frogName}」的视角（性格：${config.personality}）写一篇旅行日记。
  `;
}
```

### 6.2 Chain Service

```typescript
// services/chain/addressAnalyzer.ts

export async function analyzeAddress(
  address: string,
  chain: ChainType
): Promise<AddressAnalysis> {
  const [
    accountAge,
    holdings,
    transactions,
    protocols,
  ] = await Promise.all([
    getAccountAge(address, chain),
    getTokenHoldings(address, chain),
    getRecentTransactions(address, chain),
    getInteractedProtocols(address, chain),
  ]);

  const tags = generateTags(holdings, transactions, protocols);
  const specialFindings = detectSpecialFindings(holdings, transactions);

  return {
    accountAge,
    mainHoldings: holdings.slice(0, 10),
    recentTransactions: transactions.slice(0, 20),
    protocols,
    tags,
    specialFindings,
  };
}

function generateTags(
  holdings: TokenHolding[],
  transactions: Transaction[],
  protocols: string[]
): string[] {
  const tags: string[] = [];
  
  // 巨鲸检测
  const totalValue = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  if (totalValue > 1000000) tags.push('🐋 巨鲸');
  else if (totalValue > 100000) tags.push('🦈 大户');
  
  // NFT 收藏家
  const nftCount = holdings.filter(h => h.type === 'nft').length;
  if (nftCount > 50) tags.push('🖼️ NFT收藏家');
  
  // DeFi 农民
  if (protocols.some(p => ['Aave', 'Compound', 'Uniswap'].includes(p))) {
    tags.push('🌾 DeFi农民');
  }
  
  // 钻石手
  const hasOldHoldings = holdings.some(h => h.holdingDays > 365);
  if (hasOldHoldings) tags.push('💎 钻石手');
  
  return tags;
}
```

### 6.3 Notification Service

```typescript
// services/notification/systemNotify.ts
import { sendNotification } from '@tauri-apps/api/notification';

export async function notifyTravelStatus(message: string) {
  await sendNotification({
    title: '🐸 ZetaFrog',
    body: message,
    icon: 'icons/frog.png',
  });
}

export async function notifyTravelComplete(postcard: PostcardData) {
  await sendNotification({
    title: '🐸 小跳跳回来了！',
    body: `从 ${postcard.targetChain} 带回了 ${postcard.souvenirs.length} 个纪念品`,
    icon: 'icons/frog-happy.png',
  });
}

export async function notifyVisitor(visitor: VisitorData) {
  await sendNotification({
    title: '📬 有访客来过！',
    body: `${visitor.frogName} 从 ${visitor.fromChain} 来拜访了你`,
    icon: 'icons/visitor.png',
  });
}
```

------

## 7. 自定义 Hooks

### 7.1 useFrogAnimation

```typescript
// hooks/useFrogAnimation.ts
import { useState, useEffect, useCallback } from 'react';

interface UseFrogAnimationOptions {
  initialState: FrogState;
  onStateChange?: (newState: FrogState) => void;
}

export function useFrogAnimation(options: UseFrogAnimationOptions) {
  const [currentState, setCurrentState] = useState(options.initialState);
  const [animationData, setAnimationData] = useState(null);

  // 加载动画数据
  useEffect(() => {
    const loadAnimation = async () => {
      const data = await import(`@/assets/animations/frog-${currentState}.json`);
      setAnimationData(data.default);
    };
    loadAnimation();
  }, [currentState]);

  // 状态转换
  const transitionTo = useCallback((newState: FrogState) => {
    setCurrentState(newState);
    options.onStateChange?.(newState);
  }, [options.onStateChange]);

  // 自动状态循环（idle 时随机切换）
  useEffect(() => {
    if (currentState !== 'idle') return;

    const timer = setInterval(() => {
      const random = Math.random();
      if (random < 0.05) {
        transitionTo('sleeping');
        setTimeout(() => transitionTo('idle'), 10000);
      } else if (random < 0.15) {
        transitionTo('walking');
        setTimeout(() => transitionTo('idle'), 3000);
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [currentState, transitionTo]);

  return {
    currentState,
    animationData,
    transitionTo,
  };
}
```

### 7.2 useDragAndDrop

```typescript
// hooks/useDragAndDrop.ts
import { useState, useCallback, useRef } from 'react';

interface UseDragAndDropOptions {
  onDragStart?: () => void;
  onDragEnd?: (position: Position) => void;
  onDropReceive?: (item: DroppableItem) => void;
}

export function useDragAndDrop(options: UseDragAndDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY };
    options.onDragStart?.();
  }, [options.onDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragRef.current) return;
    
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    
    setPosition({ x: dx, y: dy });
  }, [isDragging]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    dragRef.current = null;
    
    options.onDragEnd?.({ x: e.clientX, y: e.clientY });
  }, [isDragging, options.onDragEnd]);

  // 接收拖放
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
      const item = JSON.parse(data) as DroppableItem;
      options.onDropReceive?.(item);
    }
  }, [options.onDropReceive]);

  return {
    isDragging,
    position,
    dragHandlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onDrop: handleDrop,
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
    },
  };
}
```

### 7.3 useWindowPosition

```typescript
// hooks/useWindowPosition.ts
import { useState, useEffect } from 'react';
import { appWindow } from '@tauri-apps/api/window';

export function useWindowPosition() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const init = async () => {
      const pos = await appWindow.outerPosition();
      const size = await appWindow.outerSize();
      setPosition({ x: pos.x, y: pos.y });
      
      // 获取屏幕尺寸
      setScreenSize({
        width: window.screen.width,
        height: window.screen.height,
      });
    };
    init();
  }, []);

  const moveTo = async (x: number, y: number) => {
    await appWindow.setPosition({ x, y });
    setPosition({ x, y });
  };

  const moveToBottom = async () => {
    const y = screenSize.height - 200; // 青蛙高度
    await moveTo(position.x, y);
  };

  const moveToCorner = async (corner: 'bottomLeft' | 'bottomRight') => {
    const y = screenSize.height - 200;
    const x = corner === 'bottomLeft' ? 50 : screenSize.width - 250;
    await moveTo(x, y);
  };

  return {
    position,
    screenSize,
    moveTo,
    moveToBottom,
    moveToCorner,
  };
}
```

------

## 8. 类型定义汇总

```typescript
// types/index.ts

// ============ 青蛙相关 ============
export interface FrogData {
  id: string;
  name: string;
  personality: PersonalityType;
  level: FrogLevel;
  createdAt: number;
  totalTrips: number;
  walletAddress: string;
}

export type PersonalityType = 'philosopher' | 'comedian' | 'poet' | 'gossip';

export type FrogLevel = 'tadpole' | 'small' | 'traveler' | 'explorer' | 'master';

export type FrogState = 
  | 'idle' | 'walking' | 'sleeping' | 'eating' 
  | 'happy' | 'excited' | 'sad' | 'thinking' 
  | 'preparing' | 'away';

// ============ 装饰品相关 ============
export interface Accessory {
  id: string;
  name: string;
  icon: string;
  slot: AccessorySlot;
  rarity: number;
  source: string;
}

export type AccessorySlot = 'head' | 'eyes' | 'body' | 'back' | 'hand';

// ============ 纪念品相关 ============
export interface Souvenir {
  id: string;
  name: string;
  icon: string;
  rarity: 1 | 2 | 3 | 4 | 5;
  description: string;
  obtainCondition: string;
  obtainedAt?: number;
  obtainedFrom?: string;
}

// ============ 旅行相关 ============
export interface TravelData {
  id: string;
  startedAt: number;
  estimatedDuration: number;
  currentStage: TravelStage;
  targetChain: ChainType;
  targetAddress?: string;
  targetENS?: string;
  statusMessages: StatusMessage[];
}

export type TravelStage = 
  | 'departing' | 'crossing' | 'arriving' | 'exploring' | 'returning';

export interface StatusMessage {
  timestamp: number;
  message: string;
  type: 'info' | 'discovery' | 'joke';
}

// ============ 明信片相关 ============
export interface PostcardData {
  id: string;
  tripId: string;
  createdAt: number;
  targetAddress: string;
  targetENS?: string;
  targetChain: ChainType;
  diary: string;
  mood: MoodType;
  highlight: string;
  imageUrl: string;
  souvenirs: Souvenir[];
  giftLeft: GiftType;
}

export type MoodType = 'excited' | 'curious' | 'shocked' | 'philosophical' | 'amused';
export type GiftType = 'poop' | 'sticker' | 'flower' | 'note';

// ============ 访客相关 ============
export interface VisitorData {
  id: string;
  frogId: string;
  frogName: string;
  fromAddress: string;
  fromChain: ChainType;
  visitedAt: number;
  message: string;
  giftLeft: GiftType;
}

// ============ 链相关 ============
export type ChainType = 
  | 'ethereum' | 'zetachain' | 'arbitrum' | 'optimism'
  | 'solana' | 'bitcoin' | 'bsc' | 'base' | 'polygon';

export interface AddressAnalysis {
  accountAge: string;
  mainHoldings: TokenHolding[];
  recentTransactions: Transaction[];
  protocols: string[];
  tags: string[];
  specialFindings: string[];
}

export interface TokenHolding {
  symbol: string;
  name: string;
  balance: string;
  valueUsd: number;
  type: 'native' | 'erc20' | 'nft';
  holdingDays: number;
}

// ============ 通用 ============
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}
```

------

## 9. 常量配置

```typescript
// utils/constants.ts

// 链配置
export const CHAIN_CONFIG: Record<ChainType, ChainInfo> = {
  ethereum: {
    name: 'Ethereum',
    icon: '🔷',
    color: '#627EEA',
    rpcUrl: 'https://eth.llamarpc.com',
    explorerApi: 'https://api.etherscan.io/api',
  },
  zetachain: {
    name: 'ZetaChain',
    icon: '⚡',
    color: '#00D395',
    rpcUrl: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
  },
  arbitrum: {
    name: 'Arbitrum',
    icon: '🔵',
    color: '#28A0F0',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
  },
  solana: {
    name: 'Solana',
    icon: '☀️',
    color: '#9945FF',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  },
  bitcoin: {
    name: 'Bitcoin',
    icon: '₿',
    color: '#F7931A',
  },
  bsc: {
    name: 'BNB Chain',
    icon: '🔶',
    color: '#F0B90B',
    rpcUrl: 'https://bsc-dataseed.binance.org',
  },
  base: {
    name: 'Base',
    icon: '🔷',
    color: '#0052FF',
    rpcUrl: 'https://mainnet.base.org',
  },
};

// 纪念品配置
export const SOUVENIR_CONFIG: Record<string, SouvenirConfig> = {
  bitcoin_gold: {
    id: 'bitcoin_gold',
    name: '比特金币',
    icon: '₿',
    rarity: 2,
    description: '来自比特币网络的珍贵纪念品',
    obtainCondition: '访问 Bitcoin 链地址',
  },
  eth_crystal: {
    id: 'eth_crystal',
    name: '以太水晶',
    icon: '🔷',
    rarity: 1,
    description: '闪闪发光的以太坊水晶',
    obtainCondition: '访问 Ethereum 地址',
  },
  whale_crown: {
    id: 'whale_crown',
    name: '巨鲸皇冠',
    icon: '👑',
    rarity: 4,
    description: '只有访问过真正的巨鲸才能获得',
    obtainCondition: '访问余额 >1000 ETH 的地址',
  },
  // ... 更多纪念品
};

// 青蛙等级配置
export const LEVEL_CONFIG: Record<FrogLevel, LevelInfo> = {
  tadpole: { minSouvenirs: 0, maxSouvenirs: 5, title: '蝌蚪' },
  small: { minSouvenirs: 6, maxSouvenirs: 20, title: '小青蛙' },
  traveler: { minSouvenirs: 21, maxSouvenirs: 50, title: '旅行家' },
  explorer: { minSouvenirs: 51, maxSouvenirs: 100, title: '探险王' },
  master: { minSouvenirs: 101, maxSouvenirs: Infinity, title: '全链之蛙' },
};

// 动画配置
export const ANIMATION_CONFIG = {
  frog: {
    idle: { duration: 2000, loop: true },
    walking: { duration: 500, loop: true },
    sleeping: { duration: 3000, loop: true },
    eating: { duration: 1500, loop: false },
    happy: { duration: 1000, loop: false },
    excited: { duration: 2000, loop: false },
  },
  portal: {
    appear: { duration: 500 },
    idle: { duration: 4000, loop: true },
    absorb: { duration: 800 },
  },
};

// UI 配置
export const UI_CONFIG = {
  frogWindow: {
    width: 200,
    height: 200,
  },
  postcardModal: {
    width: 480,
    height: 640,
  },
  wardrobeModal: {
    width: 560,
    height: 480,
  },
  travelStatus: {
    width: 280,
    height: 120,
  },
};
```

------

## 10. 开发规范

### 10.1 代码风格

- 使用 ESLint + Prettier 统一代码风格
- 组件使用函数式组件 + Hooks
- 状态管理使用 Zustand
- 样式使用 TailwindCSS，避免内联样式

### 10.2 命名规范

| 类型     | 规范                 | 示例                  |
| -------- | -------------------- | --------------------- |
| 组件     | PascalCase           | `FrogPet.tsx`         |
| Hooks    | camelCase, use 前缀  | `useFrogAnimation.ts` |
| 工具函数 | camelCase            | `formatAddress.ts`    |
| 常量     | SCREAMING_SNAKE_CASE | `CHAIN_CONFIG`        |
| 类型     | PascalCase           | `FrogState`           |
| 文件夹   | kebab-case           | `frog-components/`    |

### 10.3 Git 提交规范

```
feat: 新功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

### 10.4 性能优化要点

1. **动画优化**：使用 `transform` 和 `opacity`，避免触发重排
2. **状态优化**：使用 `zustand` 的 `shallow` 对比避免不必要渲染
3. **资源优化**：动画文件压缩，图片使用 WebP 格式
4. **内存优化**：组件卸载时清理定时器和事件监听

------

## 11. 测试要求

### 11.1 单元测试

- 覆盖所有 Service 层函数
- 覆盖所有 Store 的 Actions
- 覆盖所有自定义 Hooks

### 11.2 组件测试

- 使用 React Testing Library
- 测试关键交互流程

### 11.3 E2E 测试

- 使用 Playwright
- 覆盖核心用户流程：
  - 青蛙孵化
  - 出发旅行
  - 查看明信片
  - 更换装扮

------

## 12. 交付清单

### 12.1 P0（必须完成）

-  青蛙主体组件（所有基础动画）
-  透明窗口 + 拖拽移动
-  右键菜单
-  旅行流程（出发 → 状态 → 归来）
-  AI 日记生成
-  明信片弹窗
-  纪念品系统（基础）
-  系统托盘

### 12.2 P1（应该完成）

-  传送门动画
-  实时旅行状态推送
-  衣柜装扮系统
-  访客通知
-  社交分享功能

### 12.3 P2（可选完成）

-  音效系统
-  环境感知（Gas、市场）
-  多语言支持
-  设置面板

------

*文档版本 v1.0 | 最后更新 2024-12-17*