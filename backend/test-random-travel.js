const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function testRandomTravel() {
    console.log('🧪 开始测试随机探索功能...\n');

    try {
        // 1. 测试服务器连接
        console.log('1. 测试服务器连接...');
        const healthRes = await axios.get(`${API_URL}/api/health`).catch(() => {
            console.log('⚠️ /api/health 不存在，尝试其他端点...');
            return axios.get(`${API_URL}/api/frogs/count`);
        });
        console.log('✅ 服务器连接成功');

        // 2. 测试获取幸运地址
        console.log('\n2. 测试获取幸运地址...');
        try {
            const luckyAddressRes = await axios.get(`${API_URL}/api/travels/lucky-address?chain=ZETACHAIN_ATHENS`);
            console.log('✅ 获取幸运地址成功:', luckyAddressRes.data);
        } catch (error) {
            console.log('⚠️ 获取幸运地址失败:', error.response?.data || error.message);
        }

        // 3. 获取用户的青蛙列表
        console.log('\n3. 获取青蛙列表...');
        const testAddress = '0x53C1844Af058fE3B3195e49fEC8f97E0a4F87772'; // 测试地址
        const frogsRes = await axios.get(`${API_URL}/api/frogs/owner/${testAddress.toLowerCase()}`);
        
        if (!frogsRes.data || frogsRes.data.length === 0) {
            console.log('❌ 没有找到青蛙，请先铸造青蛙');
            return;
        }

        const frog = frogsRes.data[0];
        console.log('✅ 找到青蛙:', frog.name, 'Token ID:', frog.tokenId);

        // 4. 发起随机探索
        console.log('\n4. 发起随机探索...');
        const travelRes = await axios.post(`${API_URL}/api/travel/start`, {
            frogId: frog.id,
            travelType: 'RANDOM',
            targetChain: 'ZETACHAIN_ATHENS',
            duration: 3600, // 1小时
        });

        console.log('✅ 随机探索发起成功:', travelRes.data);
        console.log('   旅行ID:', travelRes.data.travelId);
        console.log('   交易哈希:', travelRes.data.txHash);

        // 5. 查询旅行状态
        console.log('\n5. 查询旅行状态...');
        const travelStatusRes = await axios.get(`${API_URL}/api/travels/${frog.id}`);
        console.log('✅ 旅行状态:', travelStatusRes.data);

        console.log('\n✅ 测试完成！');

    } catch (error) {
        console.error('\n❌ 测试失败:', error.response?.data || error.message);
    }
}

// 运行测试
testRandomTravel();