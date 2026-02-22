/**
 * 🐸 P5 繁殖系统服务
 * 功能: 配对请求、条件检查、遗传计算、子代生成
 */

import { prisma } from '../database';
import { BreedStatus, Personality } from '@prisma/client';

// 繁殖配置
export const BREED_CONFIG = {
  REQUIRED_INTIMACY: 100,       // 需要亲密度
  COOLDOWN_DAYS: 7,             // 冷却期天数
  FEE_ZETA: 5.0,                // 总费用
  REQUEST_EXPIRY_HOURS: 24,     // 请求过期时间
};

// 遗传概率配置
const GENETICS_CONFIG = {
  SKIN_INHERIT_CHANCE: 0.7,     // 70% 继承父/母皮肤
  SKIN_MUTATE_CHANCE: 0.3,      // 30% 变异
  PERSONALITY_FATHER: 0.5,      // 50% 继承父亲性格
  PERSONALITY_MOTHER: 0.3,      // 30% 继承母亲性格
  PERSONALITY_MUTATE: 0.2,      // 20% 随机变异
  STATS_VARIANCE: 0.1,          // 属性上限 ±10%
  RARE_DOUBLE_INHERIT: 0.8,     // 双方都有稀有特征时继承概率
  RARE_SINGLE_INHERIT: 0.5,     // 单方有稀有特征时继承概率
};

// ======================== V4.0 孟德尔遗传系统 ========================

// 等位基因结构
interface GeneAllele {
  dominant: string;   // 显性基因
  recessive: string;  // 隐性基因
}

// 青蛙基因型
interface FrogGenes {
  skin: GeneAllele;     // 皮肤颜色基因
  eyes: GeneAllele;     // 眼睛样式基因
  pattern: GeneAllele;  // 花纹类型基因
}

// 隐性特征列表 (双隐性才表达)
const RECESSIVE_TRAITS = [
  'gold',      // 金色皮肤
  'rainbow',   // 彩虹色
  'albino',    // 白化
  'crystal',   // 水晶纹理
  'starry',    // 星空眼
  'gradient',  // 渐变花纹
];

/**
 * 判断特征是否为显性
 */
function isDominantTrait(trait: string): boolean {
  return !RECESSIVE_TRAITS.includes(trait);
}

/**
 * 单个位点的孟德尔遗传 (Punnett Square 简化版)
 */
function inheritLocus(p1Locus: GeneAllele, p2Locus: GeneAllele): GeneAllele {
  // 从每个父母随机选一个等位基因
  const fromP1 = Math.random() < 0.5 ? p1Locus.dominant : p1Locus.recessive;
  const fromP2 = Math.random() < 0.5 ? p2Locus.dominant : p2Locus.recessive;
  
  // 按显隐性排序 (显性在前)
  if (isDominantTrait(fromP1) || !isDominantTrait(fromP2)) {
    return { dominant: fromP1, recessive: fromP2 };
  } else {
    return { dominant: fromP2, recessive: fromP1 };
  }
}

/**
 * 完整的孟德尔遗传算法
 */
function mendelianInheritance(p1Genes: FrogGenes, p2Genes: FrogGenes): FrogGenes {
  return {
    skin: inheritLocus(p1Genes.skin, p2Genes.skin),
    eyes: inheritLocus(p1Genes.eyes, p2Genes.eyes),
    pattern: inheritLocus(p1Genes.pattern, p2Genes.pattern),
  };
}

/**
 * 获取表型 (外在表现)
 * 规则: 双隐性表达隐性特征，否则表达显性
 */
function getPhenotype(genes: FrogGenes): { skin: string; eyes: string; pattern: string } {
  const express = (allele: GeneAllele) => {
    // 双隐性才表达隐性特征
    if (!isDominantTrait(allele.dominant) && !isDominantTrait(allele.recessive)) {
      return allele.recessive; // 双隐性 -> 表达隐性
    }
    return allele.dominant; // 否则表达显性
  };
  
  return {
    skin: express(genes.skin),
    eyes: express(genes.eyes),
    pattern: express(genes.pattern),
  };
}

/**
 * 从 appearanceParams 解析为基因型
 */
function parseGenesToGeneType(appearanceParams: any): FrogGenes {
  const defaultGene = (value: string): GeneAllele => ({
    dominant: value || 'green',
    recessive: value || 'green',
  });
  
  return {
    skin: appearanceParams?.genes?.skin || defaultGene(appearanceParams?.primaryColor),
    eyes: appearanceParams?.genes?.eyes || defaultGene(appearanceParams?.eyeStyle),
    pattern: appearanceParams?.genes?.pattern || defaultGene(appearanceParams?.pattern),
  };
}


/**
 * 检查繁殖条件
 */
export async function checkBreedEligibility(frogId1: number, frogId2: number) {
  // 获取双方青蛙信息
  const [frog1, frog2] = await Promise.all([
    prisma.frog.findUnique({ where: { id: frogId1 } }),
    prisma.frog.findUnique({ where: { id: frogId2 } }),
  ]);

  if (!frog1 || !frog2) {
    return { eligible: false, reason: '青蛙不存在' };
  }

  // 获取亲密度
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: 'Accepted',
      OR: [
        { requesterId: frogId1, addresseeId: frogId2 },
        { requesterId: frogId2, addresseeId: frogId1 },
      ],
    },
  });

  const errors: string[] = [];

  // 检查亲密度
  if (!friendship || friendship.intimacy < BREED_CONFIG.REQUIRED_INTIMACY) {
    errors.push(`亲密度不足 (当前: ${friendship?.intimacy || 0}, 需要: ${BREED_CONFIG.REQUIRED_INTIMACY})`);
  }

  // 检查等级 (需要成熟)
  if (frog1.level < 10) {
    errors.push(`${frog1.name} 等级不足 (当前: ${frog1.level}, 需要: 10)`);
  }
  if (frog2.level < 10) {
    errors.push(`${frog2.name} 等级不足 (当前: ${frog2.level}, 需要: 10)`);
  }

  // 检查冷却期
  const now = new Date();
  if (frog1.breedCooldownUntil && frog1.breedCooldownUntil > now) {
    const remaining = Math.ceil((frog1.breedCooldownUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    errors.push(`${frog1.name} 在冷却期中 (剩余 ${remaining} 天)`);
  }
  if (frog2.breedCooldownUntil && frog2.breedCooldownUntil > now) {
    const remaining = Math.ceil((frog2.breedCooldownUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    errors.push(`${frog2.name} 在冷却期中 (剩余 ${remaining} 天)`);
  }

  // 检查是否有待处理的繁殖请求
  const pendingRequest = await prisma.breedRequest.findFirst({
    where: {
      OR: [
        { requesterId: frogId1, partnerId: frogId2 },
        { requesterId: frogId2, partnerId: frogId1 },
      ],
      status: { in: ['Pending', 'Accepted', 'Paid'] },
    },
  });

  if (pendingRequest) {
    errors.push('已有待处理的繁殖请求');
  }

  return {
    eligible: errors.length === 0,
    errors,
    frog1: { id: frog1.id, name: frog1.name, level: frog1.level, personality: frog1.personality },
    frog2: { id: frog2.id, name: frog2.name, level: frog2.level, personality: frog2.personality },
    intimacy: friendship?.intimacy || 0,
    fee: BREED_CONFIG.FEE_ZETA,
  };
}

/**
 * 发起繁殖请求
 */
export async function createBreedRequest(requesterId: number, partnerId: number) {
  // 先检查条件
  const eligibility = await checkBreedEligibility(requesterId, partnerId);
  if (!eligibility.eligible) {
    throw new Error(`繁殖条件不满足: ${eligibility.errors?.join(', ')}`);
  }

  const expiresAt = new Date(Date.now() + BREED_CONFIG.REQUEST_EXPIRY_HOURS * 60 * 60 * 1000);

  // 预计算遗传基因
  const [requester, partner] = await Promise.all([
    prisma.frog.findUnique({ where: { id: requesterId } }),
    prisma.frog.findUnique({ where: { id: partnerId } }),
  ]);

  const offspringGenes = calculateOffspringGenes(requester!, partner!);

  const request = await prisma.breedRequest.create({
    data: {
      requesterId,
      partnerId,
      status: 'Pending',
      breedFee: BREED_CONFIG.FEE_ZETA,
      expiresAt,
      offspringGenes,
    },
    include: {
      requester: true,
      partner: true,
    },
  });

  return request;
}

/**
 * 接受繁殖请求
 */
export async function acceptBreedRequest(requestId: number) {
  const request = await prisma.breedRequest.update({
    where: { id: requestId },
    data: {
      status: 'Accepted',
      acceptedAt: new Date(),
    },
    include: { requester: true, partner: true },
  });

  return request;
}

/**
 * 拒绝繁殖请求
 */
export async function rejectBreedRequest(requestId: number) {
  return prisma.breedRequest.update({
    where: { id: requestId },
    data: { status: 'Rejected' },
  });
}

/**
 * 记录支付
 */
export async function recordPayment(requestId: number, payerFrogId: number) {
  const request = await prisma.breedRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new Error('请求不存在');

  const isRequester = request.requesterId === payerFrogId;
  const updateData = isRequester
    ? { requesterPaid: true }
    : { partnerPaid: true };

  const updated = await prisma.breedRequest.update({
    where: { id: requestId },
    data: updateData,
  });

  // 双方都已支付，更新状态
  if (updated.requesterPaid && updated.partnerPaid) {
    await prisma.breedRequest.update({
      where: { id: requestId },
      data: { status: 'Paid' },
    });
  }

  return updated;
}

/**
 * 执行繁殖 (生成子代)
 */
export async function executeBreeding(requestId: number) {
  const request = await prisma.breedRequest.findUnique({
    where: { id: requestId },
    include: { requester: true, partner: true },
  });

  if (!request) throw new Error('请求不存在');
  if (request.status !== 'Paid') throw new Error('请求状态不正确');

  const genes = request.offspringGenes as any;

  // 创建子代青蛙 (作为蛋/待孵化状态)
  const offspring = await prisma.frog.create({
    data: {
      tokenId: 0, // 需要后续 mint 时更新
      name: genes.suggestedName || `${request.requester.name}Jr`,
      ownerAddress: request.requester.ownerAddress, // 暂时归发起方
      birthday: new Date(),
      personality: genes.personality,
      generation: Math.max(request.requester.generation || 0, request.partner.generation || 0) + 1,
      parentFrogId1: request.requesterId,
      parentFrogId2: request.partnerId,
      appearanceParams: genes.appearanceParams,
      level: 1,
    },
  });

  // 设置双方冷却期
  const cooldownUntil = new Date(Date.now() + BREED_CONFIG.COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  await Promise.all([
    prisma.frog.update({ where: { id: request.requesterId }, data: { breedCooldownUntil: cooldownUntil } }),
    prisma.frog.update({ where: { id: request.partnerId }, data: { breedCooldownUntil: cooldownUntil } }),
  ]);

  // 更新请求状态
  const completed = await prisma.breedRequest.update({
    where: { id: requestId },
    data: {
      status: 'Completed',
      offspringId: offspring.id,
      completedAt: new Date(),
    },
    include: { offspring: true },
  });

  return completed;
}

/**
 * 计算遗传基因
 */
export function calculateOffspringGenes(parent1: any, parent2: any) {
  // 性格遗传
  const personalityRoll = Math.random();
  let personality: Personality;
  if (personalityRoll < GENETICS_CONFIG.PERSONALITY_FATHER) {
    personality = parent1.personality;
  } else if (personalityRoll < GENETICS_CONFIG.PERSONALITY_FATHER + GENETICS_CONFIG.PERSONALITY_MOTHER) {
    personality = parent2.personality;
  } else {
    // 随机变异
    const personalities = Object.values(Personality);
    personality = personalities[Math.floor(Math.random() * personalities.length)] as Personality;
  }

  // 外观遗传
  const skin1 = parent1.appearanceParams?.primaryColor || '#4CAF50';
  const skin2 = parent2.appearanceParams?.primaryColor || '#4CAF50';
  let primaryColor: string;
  
  if (Math.random() < GENETICS_CONFIG.SKIN_MUTATE_CHANCE) {
    // 混合变异
    primaryColor = blendColors(skin1, skin2);
  } else {
    // 随机继承一方
    primaryColor = Math.random() < 0.5 ? skin1 : skin2;
  }

  // 属性上限
  const avgStats = {
    maxHunger: Math.floor((100 + 100) / 2 * (1 + (Math.random() - 0.5) * 2 * GENETICS_CONFIG.STATS_VARIANCE)),
    maxHealth: Math.floor((100 + 100) / 2 * (1 + (Math.random() - 0.5) * 2 * GENETICS_CONFIG.STATS_VARIANCE)),
  };

  // 稀有特征遗传
  const isRare1 = parent1.isHiddenEdition || parent1.rarityTier === 'rare' || parent1.rarityTier === 'epic';
  const isRare2 = parent2.isHiddenEdition || parent2.rarityTier === 'rare' || parent2.rarityTier === 'epic';
  let isHiddenEdition = false;
  if (isRare1 && isRare2) {
    isHiddenEdition = Math.random() < GENETICS_CONFIG.RARE_DOUBLE_INHERIT;
  } else if (isRare1 || isRare2) {
    isHiddenEdition = Math.random() < GENETICS_CONFIG.RARE_SINGLE_INHERIT;
  }

  return {
    personality,
    appearanceParams: {
      primaryColor,
      eyeStyle: Math.random() < 0.5 ? parent1.appearanceParams?.eyeStyle : parent2.appearanceParams?.eyeStyle,
      pattern: Math.random() < 0.5 ? parent1.appearanceParams?.pattern : parent2.appearanceParams?.pattern,
    },
    ...avgStats,
    isHiddenEdition,
    suggestedName: `${parent1.name.charAt(0)}${parent2.name.charAt(0)}宝宝`,
    parentNames: [parent1.name, parent2.name],
  };
}

/**
 * 混合两种颜色
 */
function blendColors(color1: string, color2: string): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r = Math.floor((parseInt(hex1.substr(0, 2), 16) + parseInt(hex2.substr(0, 2), 16)) / 2);
  const g = Math.floor((parseInt(hex1.substr(2, 2), 16) + parseInt(hex2.substr(2, 2), 16)) / 2);
  const b = Math.floor((parseInt(hex1.substr(4, 2), 16) + parseInt(hex2.substr(4, 2), 16)) / 2);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * 获取繁殖请求列表
 */
export async function getBreedRequests(frogId: number) {
  return prisma.breedRequest.findMany({
    where: {
      OR: [{ requesterId: frogId }, { partnerId: frogId }],
    },
    include: { requester: true, partner: true, offspring: true },
    orderBy: { createdAt: 'desc' },
  });
}

export default {
  checkBreedEligibility,
  createBreedRequest,
  acceptBreedRequest,
  rejectBreedRequest,
  recordPayment,
  executeBreeding,
  calculateOffspringGenes,
  getBreedRequests,
  BREED_CONFIG,
};
