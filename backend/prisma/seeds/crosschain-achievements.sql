-- Cross-chain Achievement Seeds
-- Run: psql -U postgres -d postgres -f prisma/seeds/crosschain-achievements.sql

INSERT INTO "Achievement" (id, code, name, description, icon, category, rarity, condition, "isSbt", "isHidden")
VALUES 
  (
    gen_random_uuid()::text,
    'CROSS_CHAIN_PIONEER',
    'Cross-Chain Pioneer',
    'Complete first cross-chain transfer',
    '⚡',
    'CROSSCHAIN',
    2,
    '{"type": "cross_chain_transfer_count", "count": 1}'::json,
    true,
    false
  ),
  (
    gen_random_uuid()::text,
    'CROSS_CHAIN_FRIENDSHIP',
    'Cross-Chain Friendship',
    'Send cross-chain transfer to friend',
    '💝',
    'CROSSCHAIN',
    3,
    '{"type": "friend_cross_chain_transfer", "count": 1}'::json,
    true,
    false
  ),
  (
    gen_random_uuid()::text,
    'CROSS_CHAIN_AMBASSADOR',
    'Cross-Chain Ambassador',
    'Complete 10 cross-chain transfers',
    '🌐',
    'CROSSCHAIN',
    4,
    '{"type": "cross_chain_transfer_count", "count": 10}'::json,
    true,
    false
  ),
  (
    gen_random_uuid()::text,
    'MULTI_CHAIN_EXPLORER',
    'Multi-Chain Explorer',
    'Transfer to 3 different chains',
    '🗺',
    'CROSSCHAIN',
    4,
    '{"type": "unique_target_chains", "count": 3}'::json,
    true,
    false
  ),
  (
    gen_random_uuid()::text,
    'ZETA_WHALE',
    'ZETA Whale',
    'Total cross-chain volume over 100 ZETA',
    '🐋',
    'CROSSCHAIN',
    5,
    '{"type": "total_volume", "amount": "100"}'::json,
    true,
    false
  );
