# Collection × Mutation Integration Plan

更新日期：2026-03-13

## 当前补齐内容
- 新增 `desktop-pet/src/renderer/hooks/useCollectionBook.ts`
- 图鉴条目现在支持记录：
  - 基础外观基因
  - `specialTraits`
  - `mutationTraits`

## 目的
让后续由 breed / evolution / hatch 产生的稀有变异，不只停留在 UI 标签，而能进入长期收集数据。

## 下一步接法
1. 在 `usePetEgg` 的 create / breed 成功后，把新宠物写入 collection
2. 用 `mutationTraits` 标记稀有图鉴
3. 后续 CollectionBookView 可增加“仅看变异种”筛选

## 原则
- 先落数据层，再接 UI
- 先记录 mutation trait，再做稀有度排序和筛选
- 保持 localStorage 兼容，避免破坏现有存档
