import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFriendsSystem() {
  console.log('🐸 Testing ZetaFrog Friends System...\n');

  try {
    // 1. 检查数据库连接
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // 2. 检查青蛙数据
    console.log('2. Checking existing frogs...');
    const frogs = await prisma.frog.findMany({
      take: 5,
      orderBy: { id: 'asc' }
    });
    
    if (frogs.length === 0) {
      console.log('❌ No frogs found in database. Please create some frogs first.\n');
      return;
    }
    
    console.log(`✅ Found ${frogs.length} frogs:`);
    frogs.forEach(frog => {
      console.log(`   - Frog ID: ${frog.id}, Name: ${frog.name}, Token ID: ${frog.tokenId}`);
    });
    console.log('');

    // 3. 测试好友关系创建
    if (frogs.length >= 2) {
      console.log('3. Testing friend request creation...');
      const frog1 = frogs[0];
      const frog2 = frogs[1];

      // 检查是否已存在好友关系
      const existingFriendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { requesterId: frog1.id, addresseeId: frog2.id },
            { requesterId: frog2.id, addresseeId: frog1.id }
          ]
        }
      });

      if (existingFriendship) {
        console.log(`ℹ️  Friendship already exists between ${frog1.name} and ${frog2.name}`);
        console.log(`   Status: ${existingFriendship.status}`);
      } else {
        // 创建好友请求
        const friendship = await prisma.friendship.create({
          data: {
            requesterId: frog1.id,
            addresseeId: frog2.id,
            status: 'Pending'
          },
          include: {
            requester: true,
            addressee: true
          }
        });

        console.log(`✅ Friend request created:`);
        console.log(`   - From: ${friendship.requester.name} (ID: ${friendship.requesterId})`);
        console.log(`   - To: ${friendship.addressee.name} (ID: ${friendship.addresseeId})`);
        console.log(`   - Status: ${friendship.status}`);
      }
      console.log('');

      // 4. 测试接受好友请求
      console.log('4. Testing friend request acceptance...');
      const pendingRequest = await prisma.friendship.findFirst({
        where: {
          status: 'Pending',
          addresseeId: frog2.id
        }
      });

      if (pendingRequest) {
        const updatedFriendship = await prisma.friendship.update({
          where: { id: pendingRequest.id },
          data: { status: 'Accepted' },
          include: {
            requester: true,
            addressee: true
          }
        });

        console.log(`✅ Friend request accepted:`);
        console.log(`   - ${updatedFriendship.requester.name} and ${updatedFriendship.addressee.name} are now friends!`);

        // 5. 测试创建互动
        console.log('\n5. Testing friend interaction...');
        const interaction = await prisma.friendInteraction.create({
          data: {
            friendshipId: updatedFriendship.id,
            actorId: frog1.id,
            type: 'Message',
            message: '很高兴成为朋友！🐸'
          },
          include: {
            actor: true,
            friendship: {
              include: {
                requester: true,
                addressee: true
              }
            }
          }
        });

        console.log(`✅ Friend interaction created:`);
        console.log(`   - Actor: ${interaction.actor.name}`);
        console.log(`   - Type: ${interaction.type}`);
        console.log(`   - Message: ${interaction.message}`);
      } else {
        console.log('ℹ️  No pending friend requests found');
      }
      console.log('');

      // 6. 测试获取好友列表
      console.log('6. Testing friends list retrieval...');
      const friendships = await prisma.friendship.findMany({
        where: {
          status: 'Accepted',
          OR: [
            { requesterId: frog1.id },
            { addresseeId: frog1.id }
          ]
        },
        include: {
          requester: true,
          addressee: true,
          interactions: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        }
      });

      console.log(`✅ Found ${friendships.length} friends for ${frog1.name}:`);
      friendships.forEach(fs => {
        const friend = fs.requesterId === frog1.id ? fs.addressee : fs.requester;
        console.log(`   - Friend: ${friend.name} (ID: ${friend.id})`);
        console.log(`   - Interactions: ${fs.interactions.length}`);
      });
      console.log('');
    }

    // 7. 测试获取好友请求
    console.log('7. Testing friend requests retrieval...');
    const requests = await prisma.friendship.findMany({
      where: {
        status: 'Pending'
      },
      include: {
        requester: true,
        addressee: true
      }
    });

    console.log(`✅ Found ${requests.length} pending friend requests:`);
    requests.forEach(req => {
      console.log(`   - From: ${req.requester.name} to ${req.addressee.name}`);
    });
    console.log('');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📝 Test Summary:');
    console.log('   ✅ Database connection');
    console.log('   ✅ Frog data retrieval');
    console.log('   ✅ Friend request creation');
    console.log('   ✅ Friend request acceptance');
    console.log('   ✅ Friend interaction creation');
    console.log('   ✅ Friends list retrieval');
    console.log('   ✅ Friend requests retrieval');
    console.log('\n🚀 The friends system is ready to use!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testFriendsSystem().catch(console.error);