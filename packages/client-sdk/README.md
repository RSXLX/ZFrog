# @zfrog/client-sdk

V2-02 统一客户端 SDK（HTTP/Auth/Resource）。

## 内容

1. `src/core/http.ts`：统一 transport（timeout/retry/requestId/correlationId/deprecation）。
2. `src/resources/auth.ts`：认证资源客户端。
3. `src/resources/health.ts`：健康检查资源客户端。
4. `src/resources/life.ts`：生命周期资源客户端（`/v1/frogs/*`）。
5. `src/resources/travel.ts`：旅行读模型资源客户端（`/v1/travels/*`、`/travels/*`）。
6. `src/resources/social.ts`：社交资源客户端（`/v1/social/*`、`/v1/rituals`、`/v2/communities/*`）。
7. `src/__tests__/*.test.ts`：HTTP 与资源层合约测试。

## 脚本

1. `npm run build --workspace @zfrog/client-sdk`
2. `npm run type-check --workspace @zfrog/client-sdk`
3. `npm run test:contract --workspace @zfrog/client-sdk`
