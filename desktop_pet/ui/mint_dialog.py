# -*- coding: utf-8 -*-
"""
铸造青蛙对话框 - PyQt-Fluent-Widgets 现代UI
"""

from PyQt5.QtWidgets import QDialog, QVBoxLayout
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont

from qfluentwidgets import (
    SubtitleLabel, BodyLabel, CaptionLabel,
    PrimaryPushButton, TransparentPushButton, CardWidget,
    LineEdit, ProgressBar, FluentIcon, InfoBar, InfoBarPosition
)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.wallet_manager import wallet_manager
from services.api_client import api_client


class MintWorker(QThread):
    """铸造工作线程"""
    success = pyqtSignal(str, int)
    error = pyqtSignal(str)
    status = pyqtSignal(str)
    
    def __init__(self, name: str):
        super().__init__()
        self.name = name
    
    def run(self):
        try:
            from web3 import Web3
            import time
            
            self.status.emit('正在连接到区块链...')
            
            if not wallet_manager.can_sign:
                self.error.emit('需要可签名的钱包才能铸造')
                return
            
            rpc_url = 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public'
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            
            if not w3.is_connected():
                self.error.emit('无法连接到区块链')
                return
            
            self.status.emit('正在准备交易...')
            
            contract_address = '0x76e7baA23fce77DA7Edbea58D8B888128D47A1Ff'
            mint_abi = [{
                "inputs": [{"internalType": "string", "name": "name", "type": "string"}],
                "name": "mintFrog",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "nonpayable",
                "type": "function"
            }]
            
            contract = w3.eth.contract(
                address=Web3.to_checksum_address(contract_address),
                abi=mint_abi
            )
            
            address = Web3.to_checksum_address(wallet_manager.address)
            nonce = w3.eth.get_transaction_count(address)
            
            tx = contract.functions.mintFrog(self.name).build_transaction({
                'from': address,
                'nonce': nonce,
                'gas': 300000,
                'gasPrice': w3.eth.gas_price,
                'chainId': 7001
            })
            
            self.status.emit('正在签名交易...')
            success, result = wallet_manager.sign_transaction(tx)
            
            if not success:
                self.error.emit(result)
                return
            
            signed_tx_hex = result
            
            self.status.emit('正在发送交易...')
            tx_hash = w3.eth.send_raw_transaction(signed_tx_hex)
            tx_hash_hex = tx_hash.hex()
            
            self.status.emit('等待区块确认...')
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            if receipt.status == 1:
                token_id = 1
                for log in receipt.logs:
                    if len(log['topics']) >= 4:
                        token_id = int(log['topics'][3].hex(), 16)
                        break
                self.success.emit(tx_hash_hex, token_id)
            else:
                self.error.emit('交易失败')
                
        except Exception as e:
            self.error.emit(str(e))


class MintDialog(QDialog):
    """铸造青蛙对话框 - Fluent风格"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.setWindowTitle('🐸 铸造 ZetaFrog')
        self.setFixedSize(440, 400)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._minted_token_id = None
        self._setup_content()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        # 标题
        title = SubtitleLabel('🐸 铸造 ZetaFrog')
        title.setFont(QFont('Segoe UI', 18, QFont.Bold))
        layout.addWidget(title)
        
        # 说明卡片
        info_card = CardWidget(self)
        info_layout = QVBoxLayout(info_card)
        info_layout.setSpacing(12)
        
        info_layout.addWidget(BodyLabel('给你的青蛙起个名字'))
        info_layout.addWidget(CaptionLabel('名字将永久存储在区块链上'))
        
        self.name_input = LineEdit()
        self.name_input.setPlaceholderText('输入青蛙名字...')
        self.name_input.setClearButtonEnabled(True)
        info_layout.addWidget(self.name_input)
        
        layout.addWidget(info_card)
        
        # 状态卡片
        status_card = CardWidget(self)
        status_layout = QVBoxLayout(status_card)
        
        self.status_label = CaptionLabel('准备就绪')
        self.status_label.setAlignment(Qt.AlignCenter)
        status_layout.addWidget(self.status_label)
        
        self.progress = ProgressBar()
        self.progress.setRange(0, 0)
        self.progress.hide()
        status_layout.addWidget(self.progress)
        
        layout.addWidget(status_card)
        
        # 铸造按钮
        self.mint_btn = PrimaryPushButton(FluentIcon.ADD, '🐸 铸造青蛙')
        self.mint_btn.clicked.connect(self._start_mint)
        layout.addWidget(self.mint_btn)
        
        # 关闭按钮
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _start_mint(self):
        name = self.name_input.text().strip()
        
        if not name:
            InfoBar.warning('提示', '请输入青蛙名字', parent=self,
                          position=InfoBarPosition.TOP, duration=2000)
            return
        
        if not wallet_manager.can_sign:
            InfoBar.error('错误', '需要可签名的钱包才能铸造', parent=self,
                        position=InfoBarPosition.TOP, duration=3000)
            return
        
        self.mint_btn.setEnabled(False)
        self.progress.show()
        
        self.worker = MintWorker(name)
        self.worker.status.connect(self._on_status)
        self.worker.success.connect(self._on_success)
        self.worker.error.connect(self._on_error)
        self.worker.start()
    
    def _on_status(self, status):
        self.status_label.setText(status)
    
    def _on_success(self, tx_hash, token_id):
        self.progress.hide()
        self._minted_token_id = token_id
        
        self.status_label.setText(f'✅ 铸造成功！Token ID: #{token_id}')
        self.status_label.setStyleSheet('color: #10B981;')
        
        InfoBar.success('成功', f'青蛙 #{token_id} 已诞生', parent=self,
                       position=InfoBarPosition.TOP, duration=3000)
        
        self.mint_btn.setText('✅ 完成')
        self.mint_btn.setEnabled(False)
    
    def _on_error(self, error):
        self.progress.hide()
        self.mint_btn.setEnabled(True)
        
        self.status_label.setText(f'❌ 失败: {error}')
        self.status_label.setStyleSheet('color: #F85149;')
        
        InfoBar.error('失败', error, parent=self,
                     position=InfoBarPosition.TOP, duration=3000)
    
    @property
    def minted_token_id(self):
        return self._minted_token_id
