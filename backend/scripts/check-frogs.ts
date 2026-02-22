import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 查询数据库中的青蛙 ===\n');
  
  const frogs = await prisma.frog.findMany({
    take: 10,
    select: {
      id: true,
      tokenId: true,
      name: true,
      status: true,
      ownerAddress: true
    }
  });
  
  console.log('青蛙列表:');
  frogs.forEach(f => {
    console.log(`  ID=${f.id}, TokenId=${f.tokenId}, Name=${f.name}, Status=${f.status}, Owner=${f.ownerAddress}`);
  });
  
  // 查找特定钱包
  const wallet1 = '0x0Ec7E9feBE57EdF4989525a170148D998F05C531';
  const wallet2 = '0x53C1844Af058fE3B3195e49fEC8f97E0a4F87772';
  
  console.log('\n查找目标钱包:');
  console.log(`钱包1: ${wallet1}`);
  console.log(`钱包2: ${wallet2}`);
  
  const frog1 = await prisma.frog.findFirst({
    where: { ownerAddress: { equals: wallet1, mode: 'insensitive' } }
  });
  
  const frog2 = await prisma.frog.findFirst({
    where: { ownerAddress: { equals: wallet2, mode: 'insensitive' } }
  });
  
  console.log('\n结果:');
  console.log(`钱包1 青蛙: ${frog1 ? `${frog1.name} (tokenId=${frog1.tokenId})` : '未找到'}`);
  console.log(`钱包2 青蛙: ${frog2 ? `${frog2.name} (tokenId=${frog2.tokenId})` : '未找到'}`);
  
  // 检查好友关系
  if (frog1 && frog2) {
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: frog1.id, addresseeId: frog2.id },
          { requesterId: frog2.id, addresseeId: frog1.id }
        ]
      }
    });
    console.log(`\n好友关系: ${friendship ? `已是好友 (状态: ${friendship.status})` : '未找到好友关系'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
