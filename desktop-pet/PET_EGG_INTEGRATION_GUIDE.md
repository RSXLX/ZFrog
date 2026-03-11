# 宠物蛋功能整合指南 - Pet Egg Integration Guide

## 概述

基于ZFrog桌面宠物框架开发宠物蛋(Tamagotchi)功能，与现有的青蛙进化系统完美结合。

## 已创建的文件

### 1. Core Hook - usePetEgg.ts
**路径**: `src/renderer/hooks/usePetEgg.ts`

**功能**:
- 完整的宠物蛋状态管理
- 成长阶段系统 (蛋→婴儿→儿童→青少年→成年)
- 五大属性: 健康、饥饿、心情、精力、卫生
- 完整的互动系统: 喂食、玩耍、清洁、睡觉、治疗、抚摸
- 时间流逝自动更新
- 本地存储持久化

**与青蛙系统的结合点**:
```typescript
// 可以与 useFrogState 并行使用
const frog = useFrogState();
const petEgg = usePetEgg();

// 切换显示
const [activePet, setActivePet] = useState<'frog' | 'egg'>('frog');
```

### 2. UI Component - PetEgg.tsx + PetEgg.css
**路径**: 
- `src/renderer/components/PetEgg/PetEgg.tsx`
- `src/renderer/components/PetEgg/PetEgg.css`

**功能**:
- 美观的宠物蛋展示界面
- 实时属性条显示
- 6个操作按钮
- 成长阶段和心情显示
- 响应式设计
- 动画效果

## 整合步骤

### Step 1: 在 App.tsx 中导入和使用

```typescript
import { usePetEgg } from './hooks/usePetEgg';
import { PetEgg } from './components/PetEgg/PetEgg';

function App() {
  // 现有的青蛙状态
  const frogState = useFrogState();
  
  // 新增的宠物蛋状态
  const petEgg = usePetEgg();
  
  // 切换显示模式
  const [showPetEgg, setShowPetEgg] = useState(false);
  
  return (
    <div className="app">
      {/* 切换按钮 */}
      <button onClick={() => setShowPetEgg(!showPetEgg)}>
        {showPetEgg ? '显示青蛙' : '显示宠物蛋'}
      </button>
      
      {/* 条件渲染 */}
      {showPetEgg ? (
        petEgg.pet ? (
          <PetEgg
            pet={petEgg.pet}
            onFeed={petEgg.feed}
            onPlay={petEgg.play}
            onClean={petEgg.clean}
            onToggleSleep={petEgg.toggleSleep}
            onTreat={petEgg.treat}
            onCuddle={petEgg.cuddle}
          />
        ) : (
          <div className="create-pet">
            <button onClick={() => petEgg.createPet('小蛋', 'user_1')}>
              创建宠物蛋
            </button>
          </div>
        )
      ) : (
        <Frog state={frogState} />
      )}
    </div>
  );
}
```

### Step 2: 与青蛙系统的深度结合

**方案A: 并行模式 (推荐)**
- 青蛙和宠物蛋作为两个独立的功能
- 用户可以在设置中切换或同时显示
- 各自有独立的生命周期和状态

**方案B: 进化模式**
- 宠物蛋是青蛙的"幼年形态"
- 青蛙可以通过某种方式"退化"回蛋形态
- 共享部分属性和状态

**方案C: 繁殖模式**
- 青蛙可以"产卵"生成宠物蛋
- 宠物蛋继承青蛙的部分基因
- 形成繁殖生态系统

### Step 3: 数据同步与共享

```typescript
// 创建桥接hook
export function usePetBridge() {
  const frog = useFrogState();
  const petEgg = usePetEgg();
  
  // 同步某些状态
  useEffect(() => {
    if (frog.currentState === 'sleeping' && !petEgg.pet?.isSleeping) {
      // 青蛙睡觉时，宠物蛋也睡觉
      petEgg.toggleSleep();
    }
  }, [frog.currentState]);
  
  // 共享某些属性
  const sharedStats = useMemo(() => ({
    totalInteractions: frog.interactions + (petEgg.pet?.totalInteractions || 0),
    combinedHappiness: (frog.stats.happiness + (petEgg.pet?.attributes.happiness || 0)) / 2,
  }), [frog, petEgg.pet]);
  
  return { frog, petEgg, sharedStats };
}
```

## 测试验证

### 功能测试清单

- [ ] 宠物蛋创建成功
- [ ] 成长阶段正常推进
- [ ] 五大属性正确衰减
- [ ] 喂食功能正常
- [ ] 玩耍功能正常
- [ ] 清洁功能正常
- [ ] 睡觉/叫醒功能正常
- [ ] 治疗功能正常
- [ ] 抚摸功能正常
- [ ] 本地存储持久化
- [ ] 与青蛙系统共存正常

### 性能测试

- [ ] UI响应流畅
- [ ] 动画不卡顿
- [ ] 内存占用合理
- [ ] 定时器正确清理

## 部署发布

### 打包步骤

```bash
# 1. 确保代码完整
npm run lint
npm run type-check

# 2. 运行测试
npm test

# 3. 构建应用
npm run build

# 4. 打包发布
npm run dist
```

### 版本管理

- 主版本：重大功能更新
- 次版本：新功能添加（如宠物蛋功能）
- 修订版本：Bug修复

## 总结

通过本指南，开发者可以：
1. 理解宠物蛋功能的设计思路
2. 正确整合到ZFrog桌面宠物框架
3. 与现有的青蛙系统协同工作
4. 进行测试验证和部署发布

宠物蛋功能为ZFrog桌面宠物增加了全新的玩法维度，与青蛙系统形成互补，为用户提供更丰富的虚拟宠物养成体验。
