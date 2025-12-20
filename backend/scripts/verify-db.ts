import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDB() {
  try {
    console.log('检查青蛙表...');
    const frogCount = await prisma.frog.count();
    console.log(`青蛙表记录数: ${frogCount}`);
    
    console.log('检查旅行表...');
    const travelCount = await prisma.travel.count();
    console.log(`旅行表记录数: ${travelCount}`);
    
    console.log('检查纪念品表...');
    const souvenirCount = await prisma.souvenir.count();
    console.log(`纪念品表记录数: ${souvenirCount}`);
    
    console.log('检查好友关系表...');
    const friendshipCount = await prisma.friendship.count();
    console.log(`好友关系表记录数: ${friendshipCount}`);
    
    console.log('检查纪念品图片表...');
    const imageCount = await prisma.souvenirImage.count();
    console.log(`纪念品图片表记录数: ${imageCount}`);
    
    console.log('\n✅ 数据库结构验证完成');
  } catch (error) {
    console.error('❌ 数据库验证失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDB();