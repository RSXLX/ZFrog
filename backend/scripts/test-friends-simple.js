const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testFriendsAPI() {
  try {
    console.log('Testing Friends API...');

    // 测试好友列表
    try {
      const response = await axios.get(`${API_BASE_URL}/friends/list/3`);
      console.log('✅ Friends list:', response.data);
    } catch (error) {
      console.log('❌ Friends list failed:', error.response?.data || error.message);
    }

    // 测试好友请求
    try {
      const response = await axios.get(`${API_BASE_URL}/friends/requests/5`);
      console.log('✅ Friend requests:', response.data);
    } catch (error) {
      console.log('❌ Friend requests failed:', error.response?.data || error.message);
    }

    // 测试发送好友请求
    try {
      const response = await axios.post(`${API_BASE_URL}/friends/request`, {
        requesterId: 3,
        addresseeId: 5
      });
      console.log('✅ Friend request sent:', response.data);
    } catch (error) {
      console.log('❌ Friend request failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testFriendsAPI();