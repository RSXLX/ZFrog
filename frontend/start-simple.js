const { spawn } = require('child_process');
const path = require('path');

// 启动开发服务器
const devServer = spawn('npm', ['run', 'dev'], {
  cwd: path.resolve(__dirname),
  stdio: 'inherit',
  shell: true
});

devServer.on('error', (error) => {
  console.error('启动失败:', error);
});

devServer.on('close', (code) => {
  console.log(`开发服务器退出，代码: ${code}`);
});