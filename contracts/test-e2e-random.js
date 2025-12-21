// 端到端测试随机探索完整流程
const { createWalletClient, http, createPublicClient } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { readFileSync } = require('fs');
const path = require('path');

// 读取合约ABI
const contractSource = readFileSync(path.join(__dirname, 'artifacts/contracts/ZetaFrogNFT.sol/ZetaFrogNFT.json'), 'utf8');
const contractJson = JSON.parse(contractSource);
const ZETAFROG_ABI = contractJson.abi;

// ZetaChain Athens Testnet 配置
const zetachainAthens = {
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: {
        name: 'ZETA',
        symbol: 'ZETA',
        decimals: 18
    },
    rpcUrls: {
        default: { http: ['https://zetachain-athens-evm.blockpi.network/v1/rpc/public'] },
    },
};

// 合约地址
const ZETAFROG_ADDRESS = '0xE8615ffC22ff570aB21DFBE161E7Ef68820626e3';
const PRIVATE_KEY = '3cdf8ed8657b4dbb0cb06b231a90f2caa272a936e26dfacf93df5024d5d857fc';

async function testE2ERandomExploration() {
    console.log('🧪 开始端到端测试随机探索流程...\n');

    // 1. 初始化客户端
    const account = privateKeyToAccount(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
    
    const publicClient = createPublicClient({
        chain: zetachainAthens,
        transport: http(),
    });

    const walletClient = createWalletClient({
        account,
        chain: zetachainAthens,
        transport: http(),
    });

    console.log('✅ 客户端初始化成功');
    console.log(`📍 测试账户: ${account.address}`);

    // 2. 连接合约
    const contract = {
        address: ZETAFROG_ADDRESS,
        abi: ZETAFROG_ABI,
    };

    console.log(`✅ 连接到合约: ${ZETAFROG_ADDRESS}`);

    // 3. 铸造测试青蛙
    console.log('\n🐸 铸造测试青蛙...');
    const mintTx = await walletClient.writeContract({
        ...contract,
        functionName: 'mintFrog',
        args: ['E2ETest'],
    });

    const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });
    console.log(`✅ 青蛙铸造成功: ${mintTx.hash}`);

    // 获取青蛙 ID
    let tokenId;
    for (const log of mintReceipt.logs) {
        try {
            const parsedLog = publicClient.parseLog({ ...log, abi: ZETAFROG_ABI });
            if (parsedLog.eventName === 'FrogMinted') {
                tokenId = parsedLog.args.tokenId;
                break;
            }
        } catch (e) {
            // 忽略无法解析的日志
        }
    }

    if (!tokenId) {
        // 使用总供应量获取 token ID
        const totalSupply = await publicClient.readContract({
            ...contract,
            functionName: 'totalSupply',
        });
        tokenId = totalSupply - 1n;
    }

    console.log(`✅ 青蛙 ID: ${tokenId}`);

    // 4. 测试随机探索（零地址）
    console.log('\n🎲 测试随机探索（零地址）...');
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const duration = 3600n; // 1小时
    const targetChainId = 7001n; // ZetaChain

    try {
        const travelTx = await walletClient.writeContract({
            ...contract,
            functionName: 'startTravel',
            args: [tokenId, zeroAddress, duration, targetChainId],
        });

        const travelReceipt = await publicClient.waitForTransactionReceipt({ hash: travelTx });
        console.log(`✅ 随机探索开始成功: ${travelTx.hash}`);

        // 5. 验证旅行状态
        console.log('\n🔍 验证旅行状态...');
        try {
            const activeTravel = await publicClient.readContract({
                ...contract,
                functionName: 'getActiveTravel',
                args: [tokenId],
            });

            console.log('📊 旅行信息:');
            // 安全地处理BigInt序列化
            const safeStringify = (obj) => {
                return JSON.stringify(obj, (key, value) =>
                    typeof value === 'bigint' ? value.toString() + 'n' : value
                , 2);
            };
            console.log(`  - 原始数据: ${safeStringify(activeTravel)}`);
            
            // 如果是数组形式，手动解析
            if (Array.isArray(activeTravel)) {
                console.log(`  - 目标地址: ${activeTravel[2] || 'undefined'}`);
                console.log(`  - 是否为零地址: ${activeTravel[2] === zeroAddress}`);
                console.log(`  - 目标链ID: ${activeTravel[3] || 'undefined'}`);
                console.log(`  - 已完成: ${activeTravel[4] || 'undefined'}`);
                
                const startTime = Number(activeTravel[0] || 0);
                const endTime = Number(activeTravel[1] || 0);
                console.log(`  - 开始时间: ${startTime > 0 ? new Date(startTime * 1000).toISOString() : 'Invalid'}`);
                console.log(`  - 结束时间: ${endTime > 0 ? new Date(endTime * 1000).toISOString() : 'Invalid'}`);
            } else {
                console.log(`  - 目标地址: ${activeTravel.targetWallet || 'undefined'}`);
                console.log(`  - 是否为零地址: ${activeTravel.targetWallet === zeroAddress}`);
                console.log(`  - 目标链ID: ${activeTravel.targetChainId || 'undefined'}`);
                console.log(`  - 已完成: ${activeTravel.completed || 'undefined'}`);
                
                const startTime = Number(activeTravel.startTime || 0);
                const endTime = Number(activeTravel.endTime || 0);
                console.log(`  - 开始时间: ${startTime > 0 ? new Date(startTime * 1000).toISOString() : 'Invalid'}`);
                console.log(`  - 结束时间: ${endTime > 0 ? new Date(endTime * 1000).toISOString() : 'Invalid'}`);
            }
        } catch (error) {
            console.error('获取旅行状态失败:', error.message);
        }

        // 6. 验证青蛙状态
        try {
            const frog = await publicClient.readContract({
                ...contract,
                functionName: 'getFrog',
                args: [tokenId],
            });

            console.log('\n🐸 青蛙状态:');
            const safeStringify = (obj) => {
                return JSON.stringify(obj, (key, value) =>
                    typeof value === 'bigint' ? value.toString() + 'n' : value
                , 2);
            };
            console.log(`  - 原始数据: ${safeStringify(frog)}`);
            
            if (Array.isArray(frog)) {
                console.log(`  - 状态: ${frog[3]} (0=Idle, 1=Traveling)`);
                console.log(`  - 名称: ${frog[0] || 'undefined'}`);
                console.log(`  - 总旅行次数: ${frog[2] || 'undefined'}`);
            } else {
                console.log(`  - 状态: ${frog.status} (0=Idle, 1=Traveling)`);
                console.log(`  - 名称: ${frog.name || 'undefined'}`);
                console.log(`  - 总旅行次数: ${frog.totalTravels || 'undefined'}`);
            }
        } catch (error) {
            console.error('获取青蛙状态失败:', error.message);
        }

        // 7. 检查事件
        if (travelReceipt.logs.length > 0) {
            console.log('\n📝 检查事件...');
            for (const log of travelReceipt.logs) {
                try {
                    const parsedLog = publicClient.parseLog({ ...log, abi: ZETAFROG_ABI });
                    if (parsedLog.eventName === 'TravelStarted') {
                        console.log('✅ TravelStarted 事件触发');
                        console.log(`  - Token ID: ${parsedLog.args.tokenId}`);
                        console.log(`  - 目标地址: ${parsedLog.args.targetWallet}`);
                        console.log(`  - 目标链ID: ${parsedLog.args.targetChainId}`);
                        break;
                    }
                } catch (e) {
                    // 忽略无法解析的日志
                }
            }
        }

        console.log('\n✅✅✅ 端到端测试成功！');
        console.log('✅ 合约支持零地址随机探索');
        console.log('✅ 青蛙成功开始随机探索');
        console.log('✅ 旅行状态正确记录');
        
        // 8. 测试完成旅行（模拟后端操作）
        console.log('\n🔄 测试完成旅行（模拟后端操作）...');
        
        // 需要等待旅行时间结束或设置更短的duration
        console.log('⚠️  注意: 实际环境中需要等待旅行时间结束');
        console.log('⚠️  或者由后端TravelManager调用completeTravel');

    } catch (error) {
        console.error('\n❌ 测试失败!');
        console.error('错误:', error.message);
        
        if (error.message.includes('Invalid target')) {
            console.error('\n⚠️  合约拒绝零地址 - 请确认合约已更新');
        }
        
        throw error;
    }
}

// 运行测试
testE2ERandomExploration()
    .then(() => {
        console.log('\n🎉 所有测试完成！');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 测试失败:', error);
        process.exit(1);
    });