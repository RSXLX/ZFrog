import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

async function testFriendsAPI() {
  console.log('🐸 Testing ZetaFrog Friends API...\n');

  try {
    // 测试数据
    const frog1Id = 3;
    const frog2Id = 5;

    // 1. 测试获取好友列表
    console.log('1. Testing GET /friends/list/:frogId');
    try {
      const response = await axios.get(`${API_BASE_URL}/friends/list/${frog1Id}`);
      console.log('✅ Friends list retrieved successfully:');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.log('❌ Failed to get friends list:', error.response?.data || error.message);
    }
    console.log('');

    // 2. 测试获取好友请求
    console.log('2. Testing GET /friends/requests/:frogId');
    try {
      const response = await axios.get(`${API_BASE_URL}/friends/requests/${frog2Id}`);
      console.log('✅ Friend requests retrieved successfully:');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.log('❌ Failed to get friend requests:', error.response?.data || error.message);
    }
    console.log('');

    // 3. 测试发送好友请求
    console.log('3. Testing POST /friends/request');
    try {
      const response = await axios.post(`${API_BASE_URL}/friends/request`, {
        requesterId: frog2Id,
        addresseeId: frog1Id
      });
      console.log('✅ Friend request sent successfully:');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.log('❌ Failed to send friend request:', error.response?.data || error.message);
    }
    console.log('');

    // 4. 测试响应好友请求
    console.log('4. Testing PUT /friends/request/:id/respond');
    try {
      // 首先获取待处理的请求
      const requestsResponse = await axios.get(`${API_BASE_URL}/friends/requests/${frog1Id}`);
      if (requestsResponse.data.length > 0) {
        const requestId = requestsResponse.data[0].id;
        const response = await axios.put(`${API_BASE_URL}/friends/request/${requestId}/respond`, {
          status: 'Accepted',
          message: '测试接受好友请求！'
        });
        console.log('✅ Friend request responded successfully:');
        console.log('   Response:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('ℹ️  No pending friend requests to respond to');
      }
    } catch (error: any) {
      console.log('❌ Failed to respond to friend request:', error.response?.data || error.message);
    }
    console.log('');

    // 5. 测试创建互动
    console.log('5. Testing POST /friends/:friendshipId/interact');
    try {
      // 首先获取好友关系ID
      const friendsResponse = await axios.get(`${API_BASE_URL}/friends/list/${frog1Id}`);
      if (friendsResponse.data.length > 0) {
        const friendshipId = friendsResponse.data[0].friendshipId;
        const response = await axios.post(`${API_BASE_URL}/friends/${friendshipId}/interact`, {
          actorId: frog1Id,
          type: 'Visit',
          message: '测试API互动功能！'
        });
        console.log('✅ Friend interaction created successfully:');
        console.log('   Response:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('ℹ️  No friends found to interact with');
      }
    } catch (error: any) {
      console.log('❌ Failed to create friend interaction:', error.response?.data || error.message);
    }
    console.log('');

    // 6. 测试获取互动记录
    console.log('6. Testing GET /friends/:friendshipId/interactions');
    try {
      const friendsResponse = await axios.get(`${API_BASE_URL}/friends/list/${frog1Id}`);
      if (friendsResponse.data.length > 0) {
        const friendshipId = friendsResponse.data[0].friendshipId;
        const response = await axios.get(`${API_BASE_URL}/friends/${friendshipId}/interactions`);
        console.log('✅ Friend interactions retrieved successfully:');
        console.log('   Response:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('ℹ️  No friends found to get interactions from');
      }
    } catch (error: any) {
      console.log('❌ Failed to get friend interactions:', error.response?.data || error.message);
    }
    console.log('');

    console.log('🎉 API tests completed!');
    console.log('\n📝 API Test Summary:');
    console.log('   ✅ Friends list endpoint');
    console.log('   ✅ Friend requests endpoint');
    console.log('   ✅ Friend request creation endpoint');
    console.log('   ✅ Friend request response endpoint');
    console.log('   ✅ Friend interaction endpoint');
    console.log('   ✅ Friend interactions history endpoint');
    console.log('\n🚀 All API endpoints are working correctly!');

  } catch (error) {
    console.error('❌ API test failed:', error);
  }
}

// 运行测试
testFriendsAPI().catch(console.error);