// 测试发送好友请求 API
const testFriendRequest = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/friends/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requesterId: 2,  // tokenId = 2 (No3)
        addresseeId: 1   // tokenId = 1 (NO2)
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
};

testFriendRequest();
