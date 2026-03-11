# ZFrog 宠物蛋进化功能开发任务 (B+C方案)

## 项目概述
**方案**: B+C (进化模式)  
**核心概念**: 宠物蛋作为青蛙的幼年形态，形成完整进化链  
**进化路径**: 蛋 → 蝌蚪 → 幼蛙 → 成蛙  

## 开发阶段

### Phase 1: 核心架构 (当前 - 第1周)
**目标**: 建立完整的进化系统基础

#### 任务清单
- [ ] 1.1 创建 EvolutionContext
  - 管理进化状态
  - 处理阶段转换
  - 存储进化历史

- [ ] 1.2 定义进化阶段数据模型
  ```typescript
  interface EvolutionStage {
    id: 'egg' | 'tadpole' | 'young_frog' | 'adult_frog';
    name: string;
    duration: number; // 阶段持续时间
    requirements: EvolutionRequirement[];
    attributes: Partial<FrogAttributes>;
    abilities: string[];
    appearance: AppearanceConfig;
  }
  ```

- [ ] 1.3 实现进化检查器
  - 定期检查进化条件
  - 触发进化事件
  - 处理退化情况

#### 交付物
- EvolutionContext.tsx
- evolutionStages.ts (阶段配置)
- evolutionChecker.ts
- evolutionTypes.ts

---

### Phase 2: 宠物蛋阶段 (第2周)
**目标**: 完整实现宠物蛋阶段功能

#### 任务清单
- [ ] 2.1 创建宠物蛋Hook
  - 基于usePetEgg.ts重构
  - 整合到进化系统
  - 添加蛋特有的属性和行为

- [ ] 2.2 实现蛋的孵化机制
  - 时间孵化 (默认5分钟)
  - 互动加速孵化 (戳、加热等)
  - 孵化事件和动画

- [ ] 2.3 创建蛋阶段UI
  - 蛋壳外观变化
  - 裂纹进度显示
  - 孵化倒计时
  - 互动按钮 (戳、加热、摇晃)

- [ ] 2.4 实现蛋的记忆系统
  - 记录孵化过程中的互动
  - 影响蝌蚪的初始属性
  - 保存特殊事件

#### 交付物
- useEggStage.ts
- EggStageUI.tsx
- eggHatching.ts
- eggMemory.ts
- eggAnimations.css

---

### Phase 3: 蝌蚪阶段 (第3周)
**目标**: 实现蝌蚪到幼蛙的进化

#### 任务清单
- [ ] 3.1 创建蝌蚪Hook
  - 蝌蚪特有的移动方式
  - 水生环境需求
  - 变态发育进度

- [ ] 3.2 实现变态发育机制
  - 后腿生长
  - 前腿生长
  - 尾巴吸收
  - 肺部发育

- [ ] 3.3 创建蝌蚪UI
  - 水波纹效果
  - 变态进度显示
  - 游泳动画
  - 喂食按钮 (藻类、微生物)

- [ ] 3.4 实现水生环境管理
  - 水质管理
  - 温度控制
  - 氧气含量
  - 清洁度

#### 交付物
- useTadpoleStage.ts
- TadpoleStageUI.tsx
- metamorphosis.ts
- aquaticEnvironment.ts
- tadpoleAnimations.css

---

### Phase 4: 幼蛙到成蛙 (第4周)
**目标**: 完成最终进化阶段

#### 任务清单
- [ ] 4.1 整合到现有青蛙系统
  - 幼蛙与现有青蛙的衔接
  - 属性继承
  - 外观变化

- [ ] 4.2 实现成蛙特性
  - 繁殖能力解锁
  - 高级互动
  - 社会系统接入

- [ ] 4.3 创建进化时间线
  - 可视化进化历程
  - 关键时刻标记
  - 成就解锁

- [ ] 4.4 实现退化机制
  - 特殊情况下的退化
  - 退化惩罚
  - 恢复机制

#### 交付物
- frogEvolution.ts
- evolutionTimeline.tsx
- frogMaturation.ts
- degeneration.ts
- evolutionAchievements.ts

---

### Phase 5: 整合与测试 (第5周)
**目标**: 完整整合并全面测试

#### 任务清单
- [ ] 5.1 整合到App.tsx
  - EvolutionProvider
  - 进化状态管理
  - UI整合

- [ ] 5.2 与链上系统结合
  - 进化NFT
  - 链上记录
  - 智能合约

- [ ] 5.3 与AI系统结合
  - 进化建议
  - 个性化成长
  - 智能提醒

- [ ] 5.4 全面测试
  - 单元测试
  - 集成测试
  - E2E测试
  - 性能测试

- [ ] 5.5 文档完善
  - API文档
  - 用户指南
  - 开发文档
  - 部署文档

#### 交付物
- App.tsx (整合版)
- EvolutionProvider.tsx
- evolutionTests/
- documentation/
- deployment/

---

## 心跳任务配置

### 每日检查清单

**上午 (9:00)**
- [ ] 检查昨日任务完成度
- [ ] 审查代码提交
- [ ] 更新任务状态
- [ ] 规划今日任务

**下午 (14:00)**
- [ ] 检查测试通过率
- [ ] 审查代码质量
- [ ] 更新文档进度
- [ ] 调整任务优先级

**晚上 (18:00)**
- [ ] 总结今日进展
- [ ] 记录问题和解决方案
- [ ] 更新项目状态
- [ ] 准备明日计划

### 每周里程碑

**周一**: 周计划制定，任务分配  
**周三**: 中期检查，进度调整  
**周五**: 周总结，成果演示  

### 自动监控脚本

```bash
#!/bin/bash
# evolution-monitor.sh

echo "=== ZFrog Evolution Monitor ==="
echo "Time: $(date)"
echo ""

# 检查任务完成度
echo "📊 Task Completion:"
grep -c "\[x\]" EVOLUTION_TASKS.md
echo ""

# 检查代码行数
echo "📈 Code Statistics:"
find src -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
echo ""

# 检查测试状态
echo "🧪 Test Status:"
npm test -- --passWithNoTests 2>&1 | grep -E "(PASS|FAIL|Tests:)" | tail -3
echo ""

# 生成报告
echo "✅ Report Generated: reports/evolution-$(date +%Y%m%d).md"
```

## 联系方式

- **项目负责人**: AI Assistant (Claude)
- **项目路径**: `/Users/sxlx/.gemini/antigravity/ZFrog/desktop-pet/`
- **心跳监控**: 每日自动检查
- **紧急联系**: 通过系统消息

---

**项目状态**: 🚧 开发中 (Phase 1)  
**最后更新**: 2026-03-11  
**下次检查**: 每日上午9:00  

*"进化永不停歇 🐸🥚"*
