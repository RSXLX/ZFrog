// 检查旅行记录中的字段
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTravels() {
    try {
        console.log('🔍 检查旅行记录...\n');
        
        const travels = await prisma.travel.findMany({
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
                frog: {
                    select: {
                        tokenId: true,
                        name: true,
                    }
                }
            }
        });
        
        if (travels.length === 0) {
            console.log('❌ 没有找到任何旅行记录');
            return;
        }
        
        console.log(`找到 ${travels.length} 条旅行记录:\n`);
        
        for (const travel of travels) {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`Travel ID: ${travel.id}`);
            console.log(`Frog: ${travel.frog.name} (Token ID: ${travel.frog.tokenId})`);
            console.log(`Status: ${travel.status}`);
            console.log(`Start: ${travel.startTime.toISOString()}`);
            console.log(`End: ${travel.endTime.toISOString()}`);
            console.log(`Target Wallet: ${travel.targetWallet}`);
            console.log(`Chain ID: ${travel.chainId}`);
            
            // 检查关键字段
            console.log(`\n📝 关键字段检查:`);
            console.log(`  completedAt: ${travel.completedAt ? travel.completedAt.toISOString() : '❌ NULL'}`);
            console.log(`  journalHash: ${travel.journalHash || '❌ NULL'}`);
            console.log(`  journalContent: ${travel.journalContent ? `✅ 已保存 (${travel.journalContent.length} 字符)` : '❌ NULL'}`);
            console.log(`  observedTxCount: ${travel.observedTxCount !== null ? travel.observedTxCount : '❌ NULL'}`);
            console.log(`  observedTotalValue: ${travel.observedTotalValue || '❌ NULL'}`);
            console.log(`  souvenirId: ${travel.souvenirId || '无纪念品'}`);
            
            if (travel.journalContent) {
                try {
                    const journal = JSON.parse(travel.journalContent);
                    console.log(`\n📖 日记内容预览:`);
                    console.log(`  标题: ${journal.title || 'N/A'}`);
                    console.log(`  心情: ${journal.mood || 'N/A'}`);
                    console.log(`  内容: ${journal.content?.substring(0, 100)}...`);
                } catch (e) {
                    console.log(`\n⚠️  日记内容解析失败: ${travel.journalContent.substring(0, 100)}...`);
                }
            }
            
            console.log('');
        }
        
        // 统计
        const completedCount = travels.filter(t => t.status === 'Completed').length;
        const withJournal = travels.filter(t => t.journalContent).length;
        const withHash = travels.filter(t => t.journalHash).length;
        const withCompletedAt = travels.filter(t => t.completedAt).length;
        
        console.log(`\n📊 统计:`);
        console.log(`  总旅行数: ${travels.length}`);
        console.log(`  已完成: ${completedCount}`);
        console.log(`  有 journalContent: ${withJournal}`);
        console.log(`  有 journalHash: ${withHash}`);
        console.log(`  有 completedAt: ${withCompletedAt}`);
        
    } catch (error) {
        console.error('❌ 错误:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkTravels();
