# -*- coding: utf-8 -*-
"""
钱包管理模块 - 解决 Python 端的签名问题

## 签名方案说明

在 Python 桌面端，有以下几种方式处理钱包签名：

### 方案 1: 私钥直接导入（简单但风险高）
- 用户输入私钥
- 使用 eth-account 库进行签名
- ⚠️ 风险：私钥存储在本地

### 方案 2: 助记词生成钱包
- 用户输入 12/24 词助记词
- 使用 eth-account 派生私钥
- ⚠️ 风险：助记词暴露

### 方案 3: WalletConnect 协议
- 扫码连接移动端钱包
- 签名请求发送到手机
- ✅ 推荐：私钥不离开钱包

### 方案 4: 只读模式 + 后端代理
- 仅输入钱包地址（当前方案）
- 需要签名的操作通过后端代理
- ✅ 推荐：简单安全

本模块实现方案 1 和 2，用于演示。
生产环境建议使用方案 3（WalletConnect）或方案 4（后端代理）。
"""

from typing import Optional, Tuple
from dataclasses import dataclass
import json
import os


@dataclass
class WalletInfo:
    """钱包信息"""
    address: str
    has_private_key: bool = False


class WalletManager:
    """
    钱包管理器
    
    支持：
    1. 只读模式（仅地址）
    2. 私钥模式（可签名）
    3. 助记词模式（可签名）
    """
    
    def __init__(self):
        self._address: Optional[str] = None
        self._private_key: Optional[str] = None
        self._account = None  # eth_account.Account 实例
    
    @property
    def address(self) -> Optional[str]:
        return self._address
    
    @property
    def is_connected(self) -> bool:
        return self._address is not None
    
    @property
    def can_sign(self) -> bool:
        return self._account is not None
    
    def connect_readonly(self, address: str) -> bool:
        """
        只读模式连接（仅地址）
        
        Args:
            address: 钱包地址 (0x...)
            
        Returns:
            是否连接成功
        """
        if not self._is_valid_address(address):
            return False
        
        self._address = address.lower()
        self._private_key = None
        self._account = None
        return True
    
    def connect_with_private_key(self, private_key: str) -> Tuple[bool, str]:
        """
        使用私钥连接
        
        Args:
            private_key: 私钥 (0x... 或纯 hex)
            
        Returns:
            (是否成功, 错误信息或地址)
        """
        try:
            from eth_account import Account
            
            # 标准化私钥格式
            if not private_key.startswith('0x'):
                private_key = '0x' + private_key
            
            # 从私钥获取账户
            account = Account.from_key(private_key)
            
            self._address = account.address.lower()
            self._private_key = private_key
            self._account = account
            
            return True, self._address
            
        except ImportError:
            return False, "请安装 eth-account: pip install eth-account"
        except Exception as e:
            return False, f"私钥无效: {str(e)}"
    
    def connect_with_mnemonic(self, mnemonic: str, index: int = 0) -> Tuple[bool, str]:
        """
        使用助记词连接
        
        Args:
            mnemonic: 12/24 词助记词
            index: 派生路径索引（默认 0）
            
        Returns:
            (是否成功, 错误信息或地址)
        """
        try:
            from eth_account import Account
            
            # 启用助记词功能
            Account.enable_unaudited_hdwallet_features()
            
            # 派生路径: m/44'/60'/0'/0/{index}
            account = Account.from_mnemonic(
                mnemonic,
                account_path=f"m/44'/60'/0'/0/{index}"
            )
            
            self._address = account.address.lower()
            self._account = account
            
            return True, self._address
            
        except ImportError:
            return False, "请安装 eth-account: pip install eth-account"
        except Exception as e:
            return False, f"助记词无效: {str(e)}"
    
    def sign_message(self, message: str) -> Tuple[bool, str]:
        """
        签名消息（用于登录验证等）
        
        Args:
            message: 要签名的消息
            
        Returns:
            (是否成功, 签名或错误信息)
        """
        if not self.can_sign:
            return False, "钱包未连接或无法签名（只读模式）"
        
        try:
            from eth_account.messages import encode_defunct
            
            message_hash = encode_defunct(text=message)
            signed = self._account.sign_message(message_hash)
            
            return True, signed.signature.hex()
            
        except Exception as e:
            return False, f"签名失败: {str(e)}"
    
    def sign_transaction(self, tx_dict: dict) -> Tuple[bool, str]:
        """
        签名交易
        
        Args:
            tx_dict: 交易字典
            
        Returns:
            (是否成功, 签名后的交易或错误信息)
        """
        if not self.can_sign:
            return False, "钱包未连接或无法签名（只读模式）"
        
        try:
            signed_tx = self._account.sign_transaction(tx_dict)
            # 兼容不同版本的 eth-account (rawTransaction vs raw_transaction)
            raw_tx = getattr(signed_tx, 'rawTransaction', getattr(signed_tx, 'raw_transaction', None))
            if raw_tx is None:
                raise ValueError(f"无法获取原始交易数据，对象属性: {dir(signed_tx)}")
                
            return True, raw_tx.hex()
        except Exception as e:
            return False, f"交易签名失败: {str(e)}"
    
    def disconnect(self):
        """断开连接"""
        self._address = None
        self._private_key = None
        self._account = None
    
    def _is_valid_address(self, address: str) -> bool:
        """验证地址格式"""
        if not address:
            return False
        if not address.startswith('0x'):
            return False
        if len(address) != 42:
            return False
        try:
            int(address, 16)
            return True
        except ValueError:
            return False


# 全局实例
wallet_manager = WalletManager()


# ============ WalletConnect 方案说明 ============
"""
WalletConnect 2.0 集成说明：

如需实现 WalletConnect（扫码连接钱包），需要：

1. 安装依赖：
   pip install pywalletconnect

2. 获取 WalletConnect Project ID：
   https://cloud.walletconnect.com/

3. 基本使用：
   ```python
   from pywalletconnect import WCClient
   
   # 创建客户端
   wc = WCClient(
       project_id="your_project_id",
       metadata={
           "name": "ZetaFrog Desktop",
           "description": "桌面宠物",
           "url": "https://zetafrog.app",
           "icons": []
       }
   )
   
   # 生成连接 URI（显示二维码）
   uri = wc.create_session()
   print(f"扫码连接: {uri}")
   
   # 等待连接
   session = await wc.wait_for_session()
   address = session.accounts[0]
   
   # 请求签名
   signature = await wc.sign_message(address, "Hello")
   ```

4. 二维码显示：
   使用 qrcode 库生成二维码图片
   pip install qrcode[pil]
   
5. 注意事项：
   - WalletConnect 是异步的，需要使用 asyncio
   - 签名请求会发送到用户的移动端钱包
   - 用户在手机上确认后返回签名
"""
