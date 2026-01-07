const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFriendships() {
  try {
    console.log('=== 检查青蛙数据 ===');
    const frogs = await prisma.frog.findMany({
      select: {
        id: true,
        tokenId: true,
        name: true,
        ownerAddress: true
      }
    });
    console.log('青蛙列表:');
    frogs.forEach(f => {
      console.log(`  - DB ID: ${f.id}, tokenId: ${f.tokenId}, name: ${f.name}`);
    });

    console.log('\n=== 检查好友请求 ===');
    const friendships = await prisma.friendship.findMany({
      include: {
        requester: {
          select: { id: true, tokenId: true, name: true }
        },
        addressee: {
          select: { id: true, tokenId: true, name: true }
        }
      }
    });
    
    if (friendships.length === 0) {
      console.log('❌ 数据库中没有任何好友请求！');
    } else {
      console.log(`找到 ${friendships.length} 条好友关系记录：`);
      friendships.forEach(f => {
        console.log(`\n  ID: ${f.id}`);
        console.log(`  请求者: ${f.requester.name} (DB ID: ${f.requesterId}, tokenId: ${f.requester.tokenId})`);
        console.log(`  接收者: ${f.addressee.name} (DB ID: ${f.addresseeId}, tokenId: ${f.addressee.tokenId})`);
        console.log(`  状态: ${f.status}`);
        console.log(`  创建时间: ${f.createdAt}`);
      });
    }

    console.log('\n=== 测试查询逻辑 ===');
    // 测试用 tokenId 查询
    for (const frog of frogs) {
      console.log(`\n测试 tokenId=${frog.tokenId} (${frog.name}) 的请求：`);
      
      // 先用tokenId查找青蛙
      const foundFrog = await prisma.frog.findUnique({
        where: { tokenId: frog.tokenId }
      });
      
      if (foundFrog) {
        console.log(`  ✓ 找到青蛙 DB ID: ${foundFrog.id}`);
        
        // 再用数据库ID查询好友请求
        const requests = await prisma.friendship.findMany({
          where: {
            addresseeId: foundFrog.id,
            status: 'Pending'
          }
        });
        console.log(`  收到的待处理请求: ${requests.length} 条`);
      }
    }

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFriendships();
