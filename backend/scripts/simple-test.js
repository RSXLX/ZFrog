const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function simpleTest() {
  try {
    console.log('Testing basic API connectivity...');
    
    // 测试健康检查
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Health check passed:', response.data);
    } catch (error) {
      console.log('❌ Health check failed:', error.response?.data || error.message);
    }

    // 测试青蛙API
    try {
      const response = await axios.get(`${API_BASE_URL}/frogs/1`);
      console.log('✅ Frog API works:', response.data.name);
    } catch (error) {
      console.log('❌ Frog API failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

simpleTest();