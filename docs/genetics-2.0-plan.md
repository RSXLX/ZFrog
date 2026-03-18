# ZFrog Genetics 2.0 Plan

更新日期：2026-03-13

## 目标
把当前基于随机继承的 `PetGene` 升级为：
- **Genotype（基因型）**：显性 / 隐性配对
- **Phenotype（表现型）**：实际显示在 UI 上的颜色、花纹、体型、性格
- **Punnett Square 风格继承**：后代结果可预测、可博弈，而不只是随机混合

## 当前现状
- `usePetEgg.ts` 中 `PetGene` 只有表现型结构
- `GeneVisualizer.tsx` 只展示表现型
- 当前繁殖偏随机继承，缺少显隐性数据层

## 新增规则层
新增：`desktop-pet/src/renderer/hooks/genetics.ts`

提供：
- `PetGenotype`
- `PetPhenotype`
- `derivePhenotype()`
- `calculatePunnettOffspring()`
- `toLegacyGene()`

## 迁移步骤
1. 保持现有 `PetGene` 兼容，不直接破坏老存档
2. 先让新繁殖逻辑输出 genotype + phenotype
3. 再逐步把 `GeneVisualizer` 升级为同时展示：
   - 表现型
   - 隐藏隐性位点
   - 遗传来源
4. 最后再考虑把 localStorage 存档升级到新版结构

## 风险与约束
- 不能一次性改爆现有 `usePetEgg` 数据结构
- 需要兼容现有 `GeneVisualizer`、收集册和变异系统
- 特殊特征 `specialTraits` 先维持简化合并策略，后续再细化显隐性

## 下一步
1. 在 `usePetEgg` 的 breed 流程中接入 `calculatePunnettOffspring`
2. 给 `GeneVisualizer` 增加 genotype / phenotype 双视图
3. 补 genetics 规则测试
