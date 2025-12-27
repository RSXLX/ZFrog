# -*- coding: utf-8 -*-
"""
钱包连接对话框 - PyQt-Fluent-Widgets 现代UI
支持多种连接方式：只读模式、私钥、助记词
"""

from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QWidget, QFormLayout, QStackedWidget
)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont

from qfluentwidgets import (
    SubtitleLabel, BodyLabel, CaptionLabel,
    PrimaryPushButton, PushButton, TransparentPushButton,
    CardWidget, LineEdit, TextEdit, SpinBox,
    Pivot, FluentIcon, InfoBar, InfoBarPosition,
    setTheme, Theme
)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.wallet_manager import wallet_manager


class WalletConnectDialog(QDialog):
    """钱包连接对话框 - Fluent风格"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        
        self.setWindowTitle('🔐 连接钱包')
        self.setFixedSize(500, 520)
        self.setStyleSheet("""
            QDialog {
                background-color: #202020;
            }
        """)
        
        self._connected = False
        self._setup_content()
    
    def _setup_content(self):
        """设置内容区域"""
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        # 标题
        title = SubtitleLabel('🔐 连接钱包')
        title.setFont(QFont('Segoe UI', 18, QFont.Bold))
        layout.addWidget(title)
        
        # 标签页导航
        self.pivot = Pivot(self)
        self.stacked_widget = QStackedWidget(self)
        
        # 只读模式页
        readonly_page = self._create_readonly_page()
        self.stacked_widget.addWidget(readonly_page)
        self.pivot.addItem(
            routeKey='readonly',
            text='👁️ 只读',
            onClick=lambda: self.stacked_widget.setCurrentWidget(readonly_page)
        )
        
        # 私钥页
        pk_page = self._create_pk_page()
        self.stacked_widget.addWidget(pk_page)
        self.pivot.addItem(
            routeKey='pk',
            text='🔑 私钥',
            onClick=lambda: self.stacked_widget.setCurrentWidget(pk_page)
        )
        
        # 助记词页
        mnemonic_page = self._create_mnemonic_page()
        self.stacked_widget.addWidget(mnemonic_page)
        self.pivot.addItem(
            routeKey='mnemonic',
            text='📝 助记词',
            onClick=lambda: self.stacked_widget.setCurrentWidget(mnemonic_page)
        )
        
        self.pivot.setCurrentItem('readonly')
        
        layout.addWidget(self.pivot)
        layout.addWidget(self.stacked_widget)
        
        # 状态显示
        self.status_label = CaptionLabel('状态: 未连接')
        self.status_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.status_label)
        
        # 关闭按钮
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _create_readonly_page(self):
        """创建只读模式页面"""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(16)
        
        card = CardWidget()
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(20, 20, 20, 20)
        card_layout.setSpacing(16)
        
        card_layout.addWidget(BodyLabel('👁️ 只读模式（推荐用于查看）'))
        
        self.address_input = LineEdit()
        self.address_input.setPlaceholderText('0x...')
        card_layout.addWidget(CaptionLabel('钱包地址:'))
        card_layout.addWidget(self.address_input)
        
        warning = CaptionLabel('⚠️ 只读模式无法进行签名操作')
        warning.setStyleSheet('color: #F0B429;')
        card_layout.addWidget(warning)
        
        connect_btn = PushButton(FluentIcon.LINK, '连接（只读）')
        connect_btn.clicked.connect(self._connect_readonly)
        card_layout.addWidget(connect_btn)
        
        layout.addWidget(card)
        layout.addStretch()
        
        return page
    
    def _create_pk_page(self):
        """创建私钥导入页面"""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(16)
        
        card = CardWidget()
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(20, 20, 20, 20)
        card_layout.setSpacing(16)
        
        card_layout.addWidget(BodyLabel('🔑 私钥导入'))
        
        self.pk_input = LineEdit()
        self.pk_input.setPlaceholderText('0x... 或纯十六进制')
        self.pk_input.setEchoMode(LineEdit.Password)
        card_layout.addWidget(CaptionLabel('私钥:'))
        card_layout.addWidget(self.pk_input)
        
        warning = CaptionLabel('⚠️ 请勿在不信任的环境使用！')
        warning.setStyleSheet('color: #F85149;')
        card_layout.addWidget(warning)
        
        connect_btn = PrimaryPushButton(FluentIcon.ACCEPT, '导入私钥')
        connect_btn.clicked.connect(self._connect_private_key)
        card_layout.addWidget(connect_btn)
        
        layout.addWidget(card)
        layout.addStretch()
        
        return page
    
    def _create_mnemonic_page(self):
        """创建助记词恢复页面"""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(16)
        
        card = CardWidget()
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(20, 20, 20, 20)
        card_layout.setSpacing(12)
        
        card_layout.addWidget(BodyLabel('📝 助记词恢复'))
        
        card_layout.addWidget(CaptionLabel('12 或 24 个助记词（空格分隔）:'))
        self.mnemonic_input = TextEdit()
        self.mnemonic_input.setPlaceholderText('word1 word2 word3 ...')
        self.mnemonic_input.setMaximumHeight(80)
        card_layout.addWidget(self.mnemonic_input)
        
        index_layout = QHBoxLayout()
        index_layout.addWidget(CaptionLabel('账户索引:'))
        self.index_spin = SpinBox()
        self.index_spin.setRange(0, 100)
        self.index_spin.setValue(0)
        index_layout.addWidget(self.index_spin)
        index_layout.addStretch()
        card_layout.addLayout(index_layout)
        
        connect_btn = PrimaryPushButton(FluentIcon.ACCEPT, '恢复钱包')
        connect_btn.clicked.connect(self._connect_mnemonic)
        card_layout.addWidget(connect_btn)
        
        layout.addWidget(card)
        layout.addStretch()
        
        return page
    
    def _connect_readonly(self):
        """只读模式连接"""
        address = self.address_input.text().strip()
        
        if not address:
            InfoBar.warning('错误', '请输入钱包地址', parent=self,
                          position=InfoBarPosition.TOP, duration=2000)
            return
        
        if wallet_manager.connect_readonly(address):
            self._connected = True
            self.status_label.setText(f'✅ 已连接: {address[:10]}...{address[-6:]}')
            self.status_label.setStyleSheet('color: #10B981;')
            InfoBar.success('成功', f'已连接', parent=self,
                          position=InfoBarPosition.TOP, duration=2000)
            self.accept()
        else:
            InfoBar.error('错误', '地址格式无效', parent=self,
                        position=InfoBarPosition.TOP, duration=2000)
    
    def _connect_private_key(self):
        """私钥导入"""
        pk = self.pk_input.text().strip()
        
        if not pk:
            InfoBar.warning('错误', '请输入私钥', parent=self,
                          position=InfoBarPosition.TOP, duration=2000)
            return
        
        success, result = wallet_manager.connect_with_private_key(pk)
        
        if success:
            self._connected = True
            address = result
            self.status_label.setText(f'✅ 已连接: {address[:10]}...{address[-6:]}')
            self.status_label.setStyleSheet('color: #10B981;')
            InfoBar.success('成功', f'已连接，可签名', parent=self,
                          position=InfoBarPosition.TOP, duration=2000)
            self.accept()
        else:
            InfoBar.error('错误', result, parent=self,
                        position=InfoBarPosition.TOP, duration=2000)
    
    def _connect_mnemonic(self):
        """助记词恢复"""
        mnemonic = self.mnemonic_input.toPlainText().strip()
        index = self.index_spin.value()
        
        if not mnemonic:
            InfoBar.warning('错误', '请输入助记词', parent=self,
                          position=InfoBarPosition.TOP, duration=2000)
            return
        
        words = mnemonic.split()
        if len(words) not in [12, 24]:
            InfoBar.warning('错误', f'助记词应为12或24个词', parent=self,
                          position=InfoBarPosition.TOP, duration=2000)
            return
        
        success, result = wallet_manager.connect_with_mnemonic(mnemonic, index)
        
        if success:
            self._connected = True
            address = result
            self.status_label.setText(f'✅ 已连接: {address[:10]}...{address[-6:]}')
            self.status_label.setStyleSheet('color: #10B981;')
            InfoBar.success('成功', f'已连接，可签名', parent=self,
                          position=InfoBarPosition.TOP, duration=2000)
            self.accept()
        else:
            InfoBar.error('错误', result, parent=self,
                        position=InfoBarPosition.TOP, duration=2000)
    
    @property
    def is_connected(self):
        return self._connected
