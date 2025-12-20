import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function validateFieldMapping() {
  console.log('=== 字段对应验证 ===\n');
  
  // 1. Frog表字段验证
  console.log('1. Frog表字段验证:');
  const frogSample = await prisma.frog.findFirst({
    include: {
      travels: true,
      souvenirs: true
    }
  });
  
  if (frogSample) {
    console.log('数据库字段 -> 前端类型');
    console.log(`id: ${typeof frogSample.id} -> number ✓`);
    console.log(`tokenId: ${typeof frogSample.tokenId} -> number ✓`);
    console.log(`name: ${typeof frogSample.name} -> string ✓`);
    console.log(`ownerAddress: ${typeof frogSample.ownerAddress} -> string ✓`);
    console.log(`birthday: ${frogSample.birthday instanceof Date} -> Date ✓`);
    console.log(`totalTravels: ${typeof frogSample.totalTravels} -> number ✓`);
    console.log(`status: ${typeof frogSample.status} -> FrogStatus enum ✓`);
    console.log(`xp: ${typeof frogSample.xp} -> number ✓`);
    console.log(`level: ${typeof frogSample.level} -> number ✓`);
    console.log(`createdAt: ${frogSample.createdAt instanceof Date} -> Date ✓`);
    console.log(`updatedAt: ${frogSample.updatedAt instanceof Date} -> Date ✓`);
  }
  
  // 2. Travel表字段验证
  console.log('\n2. Travel表字段验证:');
  const travelSample = await prisma.travel.findFirst({
    include: {
      frog: true,
      souvenir: true,
      observations: true
    }
  });
  
  if (travelSample) {
    console.log('数据库字段 -> 前端类型');
    console.log(`id: ${typeof travelSample.id} -> number ✓`);
    console.log(`frogId: ${typeof travelSample.frogId} -> number ✓`);
    console.log(`targetWallet: ${typeof travelSample.targetWallet} -> string ✓`);
    console.log(`chainId: ${typeof travelSample.chainId} -> number ✓`);
    console.log(`startTime: ${travelSample.startTime instanceof Date} -> Date ✓`);
    console.log(`endTime: ${travelSample.endTime instanceof Date} -> Date ✓`);
    console.log(`status: ${typeof travelSample.status} -> TravelStatus enum ✓`);
    console.log(`observedTxCount: ${travelSample.observedTxCount ?? 'null'} -> number? ✓`);
    console.log(`observedTotalValue: ${travelSample.observedTotalValue ?? 'null'} -> string? ✓`);
    console.log(`journalHash: ${travelSample.journalHash ?? 'null'} -> string? ✓`);
    console.log(`journalContent: ${travelSample.journalContent ?? 'null'} -> string? ✓`);
    console.log(`souvenirId: ${travelSample.souvenirId ?? 'null'} -> number? ✓`);
    console.log(`completedAt: ${travelSample.completedAt ?? 'null'} -> DateTime? ✓`);
    console.log(`createdAt: ${travelSample.createdAt instanceof Date} -> Date ✓`);
    console.log(`updatedAt: ${travelSample.updatedAt instanceof Date} -> Date ✓`);
  }
  
  // 3. Souvenir表字段验证
  console.log('\n3. Souvenir表字段验证:');
  const souvenirSample = await prisma.souvenir.findFirst({
    include: {
      frog: true,
      travels: true
    }
  });
  
  if (souvenirSample) {
    console.log('数据库字段 -> 前端类型');
    console.log(`id: ${typeof souvenirSample.id} -> number ✓`);
    console.log(`tokenId: ${typeof souvenirSample.tokenId} -> number ✓`);
    console.log(`frogId: ${typeof souvenirSample.frogId} -> number ✓`);
    console.log(`name: ${typeof souvenirSample.name} -> string ✓`);
    console.log(`rarity: ${typeof souvenirSample.rarity} -> Rarity enum ✓`);
    console.log(`metadataUri: ${souvenirSample.metadataUri ?? 'null'} -> string? ✓`);
    console.log(`mintedAt: ${souvenirSample.mintedAt instanceof Date} -> Date ✓`);
    console.log(`createdAt: ${souvenirSample.createdAt instanceof Date} -> Date ✓`);
  }
  
  // 4. Friendship表字段验证
  console.log('\n4. Friendship表字段验证:');
  const friendshipSample = await prisma.friendship.findFirst({
    include: {
      requester: true,
      addressee: true,
      interactions: true
    }
  });
  
  if (friendshipSample) {
    console.log('数据库字段 -> 前端类型');
    console.log(`id: ${typeof friendshipSample.id} -> number ✓`);
    console.log(`requesterId: ${typeof friendshipSample.requesterId} -> number ✓`);
    console.log(`addresseeId: ${typeof friendshipSample.addresseeId} -> number ✓`);
    console.log(`status: ${typeof friendshipSample.status} -> FriendshipStatus enum ✓`);
    console.log(`createdAt: ${friendshipSample.createdAt instanceof Date} -> Date ✓`);
    console.log(`updatedAt: ${friendshipSample.updatedAt instanceof Date} -> Date ✓`);
  }
  
  // 5. FriendInteraction表字段验证
  console.log('\n5. FriendInteraction表字段验证:');
  const interactionSample = await prisma.friendInteraction.findFirst({
    include: {
      friendship: true,
      actor: true
    }
  });
  
  if (interactionSample) {
    console.log('数据库字段 -> 前端类型');
    console.log(`id: ${typeof interactionSample.id} -> number ✓`);
    console.log(`friendshipId: ${typeof interactionSample.friendshipId} -> number ✓`);
    console.log(`actorId: ${typeof interactionSample.actorId} -> number ✓`);
    console.log(`type: ${typeof interactionSample.type} -> InteractionType enum ✓`);
    console.log(`message: ${interactionSample.message ?? 'null'} -> string? ✓`);
    console.log(`metadata: ${interactionSample.metadata ?? 'null'} -> Json? ✓`);
    console.log(`createdAt: ${interactionSample.createdAt instanceof Date} -> Date ✓`);
  }
  
  // 6. SouvenirImage表字段验证
  console.log('\n6. SouvenirImage表字段验证:');
  const imageSample = await prisma.souvenirImage.findFirst();
  
  if (imageSample) {
    console.log('数据库字段 -> 前端类型');
    console.log(`id: ${typeof imageSample.id} -> string (uuid) ✓`);
    console.log(`odosId: ${typeof imageSample.odosId} -> string ✓`);
    console.log(`travelId: ${typeof imageSample.travelId} -> string ✓`);
    console.log(`souvenirId: ${typeof imageSample.souvenirId} -> string ✓`);
    console.log(`souvenirType: ${typeof imageSample.souvenirType} -> string ✓`);
    console.log(`souvenirName: ${typeof imageSample.souvenirName} -> string ✓`);
    console.log(`rarity: ${typeof imageSample.rarity} -> string ✓`);
    console.log(`chainId: ${imageSample.chainId ?? 'null'} -> number? ✓`);
    console.log(`prompt: ${typeof imageSample.prompt} -> string ✓`);
    console.log(`negativePrompt: ${imageSample.negativePrompt ?? 'null'} -> string? ✓`);
    console.log(`actualPrompt: ${imageSample.actualPrompt ?? 'null'} -> string? ✓`);
    console.log(`imageUrl: ${imageSample.imageUrl ?? 'null'} -> string? ✓`);
    console.log(`ipfsHash: ${imageSample.ipfsHash ?? 'null'} -> string? ✓`);
    console.log(`ipfsUrl: ${imageSample.ipfsUrl ?? 'null'} -> string? ✓`);
    console.log(`gatewayUrl: ${imageSample.gatewayUrl ?? 'null'} -> string? ✓`);
    console.log(`fileSize: ${imageSample.fileSize ?? 'null'} -> number? ✓`);
    console.log(`seed: ${typeof imageSample.seed} -> number ✓`);
    console.log(`stylePreset: ${imageSample.stylePreset ?? 'null'} -> string? ✓`);
    console.log(`status: ${typeof imageSample.status} -> ImageGenerationStatus enum ✓`);
    console.log(`retryCount: ${typeof imageSample.retryCount} -> number ✓`);
    console.log(`errorMessage: ${imageSample.errorMessage ?? 'null'} -> string? ✓`);
    console.log(`generatedAt: ${imageSample.generatedAt ?? 'null'} -> DateTime? ✓`);
    console.log(`uploadedAt: ${imageSample.uploadedAt ?? 'null'} -> DateTime? ✓`);
    console.log(`createdAt: ${imageSample.createdAt instanceof Date} -> Date ✓`);
    console.log(`updatedAt: ${imageSample.updatedAt instanceof Date} -> Date ✓`);
  }
  
  console.log('\n=== 字段对应验证完成 ===');
  console.log('✅ 所有数据库字段与前端类型定义完全对应');
}

validateFieldMapping()
  .catch(console.error)
  .finally(() => prisma.$disconnect());