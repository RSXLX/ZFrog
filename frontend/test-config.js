// 简单测试配置文件
import { wagmiConfig } from './src/config/wagmi.js';
import { zetachainAthens } from './src/config/chains.js';

console.log('✅ Wagmi config loaded');
console.log('✅ Chains loaded');
console.log('ZetaChain ID:', zetachainAthens.id);
console.log('Project ID:', import.meta.env.VITE_WALLETCONNECT_PROJECT_ID);

export default function test() {
  console.log('Configuration test passed!');
}