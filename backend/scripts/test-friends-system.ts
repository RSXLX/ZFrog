import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

async function testHealthCheck() {
  try {
    const response = await axios.get(`${API_BASE}/health`);
    results.push({
      name: '健康检查',
      passed: response.status === 200,
      message: '后端服务正常运行',
      data: response.data
    });
  } catch (error: any) {
    results.push({
      name: '健康检查',
      passed: false,
      message: `后端服务未运行: ${error.message}`
    });
    throw error;
  }
}

async function testFrogSearch() {
  try {
    const addressSearch = await axios.get(`${API_BASE}/frogs/search`, {
      params: { query: '0x' }
    });
    
    results.push({
      name: '青蛙搜索 - 按地址',
      passed: addressSearch.status === 200,
      message: `找到 ${addressSearch.data.length} 只青蛙`,
      data: addressSearch.data
    });

    const nameSearch = await axios.get(`${API_BASE}/frogs/search`, {
      params: { query: 'Frog' }
    });
    
    results.push({
      name: '青蛙搜索 - 按名称',
      passed: nameSearch.status === 200,
      message: `找到 ${nameSearch.data.length} 只青蛙`,
      data: nameSearch.data
    });

  } catch (error: any) {
    results.push({
      name: '青蛙搜索',
      passed: false,
      message: `搜索失败: ${error.message}`
    });
  }
}

async function testFriendRequest(frogId1: number, frogId2: number) {
  try {
    const requestResponse = await axios.post(`${API_BASE}/friends/request`, {
      requesterId: frogId1,
      addresseeId: frogId2
    });
    
    results.push({
      name: '发送好友请求',
      passed: requestResponse.status === 201,
      message: `好友请求已发送 (ID: ${requestResponse.data.id})`,
      data: requestResponse.data
    });

    return requestResponse.data.id;
  } catch (error: any) {
    results.push({
      name: '发送好友请求',
      passed: false,
      message: `发送失败: ${error.response?.data?.error || error.message}`
    });
    return null;
  }
}

async function testFriendRequestList(frogId: number) {
  try {
    const response = await axios.get(`${API_BASE}/friends/requests/${frogId}`);
    
    results.push({
      name: '获取好友请求列表',
      passed: response.status === 200,
      message: `找到 ${response.data.length} 个好友请求`,
      data: response.data
    });

    return response.data;
  } catch (error: any) {
    results.push({
      name: '获取好友请求列表',
      passed: false,
      message: `获取失败: ${error.message}`
    });
    return [];
  }
}

async function testRespondToRequest(requestId: number, status: 'Accepted' | 'Declined') {
  try {
    const response = await axios.put(`${API_BASE}/friends/request/${requestId}/respond`, {
      status,
      message: status === 'Accepted' ? '很高兴成为朋友！' : undefined
    });
    
    results.push({
      name: `响应好友请求 (${status})`,
      passed: response.status === 200,
      message: `请求已${status === 'Accepted' ? '接受' : '拒绝'}`,
      data: response.data
    });

    return true;
  } catch (error: any) {
    results.push({
      name: `响应好友请求 (${status})`,
      passed: false,
      message: `响应失败: ${error.message}`
    });
    return false;
  }
}

async function testFriendsList(frogId: number) {
  try {
    const response = await axios.get(`${API_BASE}/friends/list/${frogId}`);
    
    results.push({
      name: '获取好友列表',
      passed: response.status === 200,
      message: `找到 ${response.data.length} 个好友`,
      data: response.data
    });

    return response.data;
  } catch (error: any) {
    results.push({
      name: '获取好友列表',
      passed: false,
      message: `获取失败: ${error.message}`
    });
    return [];
  }
}

async function testFriendInteraction(friendshipId: number, actorId: number) {
  try {
    const response = await axios.post(`${API_BASE}/friends/${friendshipId}/interact`, {
      actorId,
      type: 'Message',
      message: '测试互动消息 🐸'
    });
    
    results.push({
      name: '好友互动',
      passed: response.status === 201,
      message: '互动成功',
      data: response.data
    });

    return true;
  } catch (error: any) {
    results.push({
      name: '好友互动',
      passed: false,
      message: `互动失败: ${error.message}`
    });
    return false;
  }
}

async function testGetInteractions(friendshipId: number) {
  try {
    const response = await axios.get(`${API_BASE}/friends/${friendshipId}/interactions`);
    
    results.push({
      name: '获取互动记录',
      passed: response.status === 200,
      message: `找到 ${response.data.length} 条互动记录`,
      data: response.data
    });

    return response.data;
  } catch (error: any) {
    results.push({
      name: '获取互动记录',
      passed: false,
      message: `获取失败: ${error.message}`
    });
    return [];
  }
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('好友系统测试结果');
  console.log('='.repeat(80) + '\n');

  let passed = 0;
  let failed = 0;

  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${status} - ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.data && !result.passed) {
      console.log(`   数据: ${JSON.stringify(result.data, null, 2)}`);
    }
    console.log('');

    if (result.passed) passed++;
    else failed++;
  });

  console.log('='.repeat(80));
  console.log(`总计: ${results.length} 个测试`);
  console.log(`通过: ${passed} ✅`);
  console.log(`失败: ${failed} ❌`);
  console.log(`成功率: ${((passed / results.length) * 100).toFixed(2)}%`);
  console.log('='.repeat(80) + '\n');
}

async function runTests() {
  console.log('开始测试好友系统...\n');

  try {
    await testHealthCheck();

    await testFrogSearch();

    const frogId1 = 3;
    const frogId2 = 5;

    const requestId = await testFriendRequest(frogId1, frogId2);

    if (requestId) {
      await testFriendRequestList(frogId2);

      const accepted = await testRespondToRequest(requestId, 'Accepted');

      if (accepted) {
        const friends = await testFriendsList(frogId1);

        if (friends.length > 0) {
          const friendship = friends[0];
          
          await testFriendInteraction(friendship.friendshipId, frogId1);

          await testGetInteractions(friendship.friendshipId);
        }
      }
    }

  } catch (error: any) {
    console.error('测试过程中出现错误:', error.message);
  }

  printResults();
}

runTests().catch(console.error);