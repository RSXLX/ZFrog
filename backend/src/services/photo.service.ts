/**
 * PhotoService - 相册系统服务
 * 
 * 功能:
 * - 上传/获取照片
 * - IPFS 上传
 * - NFT 铸造追踪
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============ 类型定义 ============

export interface CreatePhotoInput {
  frogId: number;
  travelId?: number;
  imageUrl: string;
  ipfsHash?: string;
  ipfsUrl?: string;
  caption?: string;
  location?: string;
}

export interface MintPhotoNftInput {
  photoId: string;
  nftContract: string;
  nftTokenId: string;
  mintTxHash: string;
}

// ============ 照片管理 ============

/**
 * 创建照片记录
 */
export async function createPhoto(input: CreatePhotoInput) {
  return prisma.photo.create({
    data: {
      frogId: input.frogId,
      travelId: input.travelId,
      imageUrl: input.imageUrl,
      ipfsHash: input.ipfsHash,
      ipfsUrl: input.ipfsUrl,
      caption: input.caption,
      location: input.location,
    },
    include: {
      frog: true,
      travel: true,
    },
  });
}

/**
 * 获取青蛙的相册
 */
export async function getPhotos(
  frogId: number,
  options?: {
    page?: number;
    pageSize?: number;
    nftOnly?: boolean;
  }
) {
  const { page = 1, pageSize = 20, nftOnly = false } = options ?? {};

  const where = {
    frogId,
    ...(nftOnly ? { isNft: true } : {}),
  };

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      orderBy: { takenAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        travel: {
          select: {
            id: true,
            targetWallet: true,
            targetChain: true,
            startTime: true,
          },
        },
      },
    }),
    prisma.photo.count({ where }),
  ]);

  return {
    photos,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取旅行相关的照片
 */
export async function getTravelPhotos(travelId: number) {
  return prisma.photo.findMany({
    where: { travelId },
    orderBy: { takenAt: 'asc' },
  });
}

/**
 * 更新照片 IPFS 信息
 */
export async function updatePhotoIpfs(
  photoId: string,
  ipfsHash: string,
  ipfsUrl: string
) {
  return prisma.photo.update({
    where: { id: photoId },
    data: {
      ipfsHash,
      ipfsUrl,
    },
  });
}

/**
 * 标记照片为 NFT
 */
export async function markPhotoAsNft(input: MintPhotoNftInput) {
  return prisma.photo.update({
    where: { id: input.photoId },
    data: {
      isNft: true,
      nftContract: input.nftContract,
      nftTokenId: input.nftTokenId,
      mintTxHash: input.mintTxHash,
    },
  });
}

/**
 * 点赞照片
 */
export async function likePhoto(photoId: string) {
  return prisma.photo.update({
    where: { id: photoId },
    data: {
      likesCount: { increment: 1 },
    },
  });
}

/**
 * 删除照片
 */
export async function deletePhoto(photoId: string, frogId: number) {
  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
  });

  if (!photo) {
    throw new Error('Photo not found');
  }

  if (photo.frogId !== frogId) {
    throw new Error('Not authorized to delete this photo');
  }

  // 不允许删除已铸造为 NFT 的照片
  if (photo.isNft) {
    throw new Error('Cannot delete NFT photo');
  }

  return prisma.photo.delete({
    where: { id: photoId },
  });
}

// ============ 导出 ============

export const photoService = {
  createPhoto,
  getPhotos,
  getTravelPhotos,
  updatePhotoIpfs,
  markPhotoAsNft,
  likePhoto,
  deletePhoto,
};

export default photoService;
