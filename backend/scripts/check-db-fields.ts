import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkFieldMapping() {
  console.log('=== 数据库字段对应检查 ===\n');
  
  try {
    // 1. 检查Frog表
    console.log('1. Frog表字段:');
    const frog = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Frog' ORDER BY ordinal_position`;
    console.log(frog);
    
    // 2. 检查Travel表
    console.log('\n2. Travel表字段:');
    const travel = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Travel' ORDER BY ordinal_position`;
    console.log(travel);
    
    // 3. 检查Souvenir表
    console.log('\n3. Souvenir表字段:');
    const souvenir = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Souvenir' ORDER BY ordinal_position`;
    console.log(souvenir);
    
    // 4. 检查Friendship表
    console.log('\n4. Friendship表字段:');
    const friendship = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Friendship' ORDER BY ordinal_position`;
    console.log(friendship);
    
    // 5. 检查FriendInteraction表
    console.log('\n5. FriendInteraction表字段:');
    const interaction = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'FriendInteraction' ORDER BY ordinal_position`;
    console.log(interaction);
    
    // 6. 检查SouvenirImage表
    console.log('\n6. SouvenirImage表字段:');
    const souvenirImage = await prisma.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'SouvenirImage' ORDER BY ordinal_position`;
    console.log(souvenirImage);
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFieldMapping();