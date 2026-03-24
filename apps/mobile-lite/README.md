# apps/mobile-lite

`V2-W10-02` 交付：Mobile Lite MVP 四页面（登录 / 状态 / 快捷照顾 / 祈福救援）与安全闭环。

## 当前能力（W10-02）

1. 四页面 MVP：
   1. 登录页：`/api/v1/auth/nonce` + `/api/v1/auth/wallet`。
   2. 状态页：聚合 `auth/me + life + travel stats + social status`。
   3. 照顾页：`feed/clean/play/heal/startRest/endRest/revive`。
   4. 祈福/救援页：`bless` 与 `rescueTravel`。
2. 安全闭环：
   1. 钱包地址、frogId、travelId、verificationId 参数校验。
   2. 写操作统一 in-flight 锁与 cooldown 节流，避免重复提交。
   3. 错误统一归一化（message/code/requestId）。
3. Session 持久化：
   1. `localStorage.zfrog_auth_token -> Authorization`
   2. `localStorage.zfrog_wallet_address -> x-wallet-address`

## 环境变量

1. `VITE_API_BASE_URL`：后端基地址，默认同源。

## 本地启动

```bash
pnpm --filter ./apps/mobile-lite dev
```

## 本地构建

```bash
pnpm --filter ./apps/mobile-lite build
```

## 说明

当前环境若未安装依赖，`tsc`/`vite` 可能不可用（需先恢复 workspace 安装）。
