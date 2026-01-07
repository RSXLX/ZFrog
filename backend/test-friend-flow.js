// 完整测试好友系统流程
async function testCompleteFriendFlow() {
  console.log('=== 测试完整的好友系统流程 ===\n');
  
  // 测试1: 获取 tokenId=1 (NO2) 的好友请求
  console.log('📨 测试1: 获取 NO2 (tokenId=1) 收到的好友请求');
  try {
    const response = await fetch('http://localhost:3001/api/friends/requests/1');
    const data = await response.json();
    console.log(`状态: ${response.status}`);
    console.log(`收到 ${data.length} 条请求`);
    if (data.length > 0) {
      data.forEach((req, idx) => {
        console.log(`  请求${idx+1}: ${req.requester.name} (tokenId=${req.requester.tokenId}) 想添加你为好友`);
      });
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
  
  console.log('\n📨 测试2: 获取 SXLX (tokenId=0) 收到的好友请求');
  try {
    const response = await fetch('http://localhost:3001/api/friends/requests/0');
    const data = await response.json();
    console.log(`状态: ${response.status}`);
    console.log(`收到 ${data.length} 条请求`);
    if (data.length > 0) {
      data.forEach((req, idx) => {
        console.log(`  请求${idx+1}: ${req.requester.name} (tokenId=${req.requester.tokenId}) 想添加你为好友`);
      });
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
  
  // 测试3: 发送新的好友请求 (从 tokenId=0 到 tokenId=2)
  console.log('\n📤 测试3: SXLX (tokenId=0) 向 No3 (tokenId=2) 发送好友请求');
  try {
    const response = await fetch('http://localhost:3001/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requesterId: 0,  // tokenId
        addresseeId: 2   // tokenId
      })
    });
    const data = await response.json();
    console.log(`状态: ${response.status}`);
    if (response.status === 201) {
      console.log(`✅ 成功发送请求！`);
    } else {
      console.log(`❌ 失败: ${data.error}`);
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
  
  // 测试4: 验证 No3 是否收到请求
  console.log('\n📨 测试4: 验证 No3 (tokenId=2) 是否收到请求');
  try {
    const response = await fetch('http://localhost:3001/api/friends/requests/2');
    const data = await response.json();
    console.log(`状态: ${response.status}`);
    console.log(`收到 ${data.length} 条请求`);
    if (data.length > 0) {
      data.forEach((req, idx) => {
        console.log(`  请求${idx+1}: ${req.requester.name} (tokenId=${req.requester.tokenId}) 想添加你为好友`);
      });
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
  
  console.log('\n✅ 测试完成！');
}

testCompleteFriendFlow();
