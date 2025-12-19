// 测试 AI 服务和 JSON 序列化
import { aiService } from '../src/services/ai.service';
import { observerService } from '../src/services/observer.service';

async function testJournalGeneration() {
    try {
        console.log('🧪 测试 AI 服务生成日记...\n');
        
        // 模拟观察数据
        const mockObservation = {
            walletAddress: '0x53c1844af058fe3b3195e49fec8f97e0a4f87772',
            chainId: 1,
            totalTxCount: 5,
            totalValueWei: BigInt('1000000000000000000'),
            transactions: [],
            notableEvents: [
                { 
                    type: 'large_transfer' as const, 
                    description: '大额转账',
                    txHash: '0x1234567890abcdef',
                    timestamp: Date.now()
                }
            ],
            observedFrom: new Date(),
            observedTo: new Date()
        };
        
        // 生成日记
        const journal = await aiService.generateJournal(
            '测试青蛙',
            mockObservation,
            1 // 1小时
        );
        
        console.log('✅ AI 服务返回的日记对象:');
        console.log('类型:', typeof journal);
        console.log('内容:', JSON.stringify(journal, null, 2));
        
        // 测试 JSON 序列化
        console.log('\n🔍 测试 JSON 序列化:');
        try {
            const serialized = JSON.stringify(journal);
            console.log('✅ 序列化成功，长度:', serialized.length);
            console.log('前100字符:', serialized.substring(0, 100) + '...');
            
            // 测试反序列化
            const parsed = JSON.parse(serialized);
            console.log('✅ 反序列化成功');
            console.log('解析后的标题:', parsed.title);
            
        } catch (error) {
            console.error('❌ JSON 序列化失败:', error);
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

testJournalGeneration();