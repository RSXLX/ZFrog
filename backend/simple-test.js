const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testAPI() {
    console.log('🧪 测试 API 连接...\n');

    try {
        // 测试根路径
        console.log('1. 测试根路径...');
        const rootRes = await axios.get(API_URL);
        console.log('✅ 根路径响应:', rootRes.data);

        // 测试青蛙数量
        console.log('\n2. 测试青蛙数量...');
        const countRes = await axios.get(`${API_URL}/api/frogs/count`);
        console.log('✅ 青蛙数量:', countRes.data);

        console.log('\n✅ API 测试成功！');

    } catch (error) {
        console.error('\n❌ API 测试失败:', error.response?.data || error.message);
    }
}

testAPI();