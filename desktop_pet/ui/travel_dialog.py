# -*- coding: utf-8 -*-
"""
旅行对话框 - PyQt-Fluent-Widgets 现代UI
"""

from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QWidget, QFormLayout, QStackedWidget
)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont

from qfluentwidgets import (
    SubtitleLabel, BodyLabel, CaptionLabel,
    PrimaryPushButton, PushButton, TransparentPushButton,
    CardWidget, ComboBox, SpinBox, ListWidget,
    Pivot, FluentIcon, InfoBar, InfoBarPosition
)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.api_client import api_client


class TravelDialog(QDialog):
    """旅行系统对话框 - Fluent风格"""
    
    def __init__(self, frog, wallet_address, parent=None):
        super().__init__(parent)
        self.frog = frog
        self.wallet_address = wallet_address
        
        self.setWindowTitle('✈️ 旅行系统')
        self.setFixedSize(540, 680)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
        self._load_data()
    
    def _setup_content(self):
        """设置内容区域"""
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        # 标题
        title = SubtitleLabel('✈️ 旅行系统')
        title.setFont(QFont('Segoe UI', 18, QFont.Bold))
        layout.addWidget(title)
        
        # 青蛙信息卡片
        info_card = CardWidget(self)
        info_layout = QFormLayout(info_card)
        info_layout.setContentsMargins(20, 16, 20, 16)
        info_layout.setSpacing(12)
        
        name = self.frog.get('name', '未命名')
        status = self.frog.get('status', 'Idle')
        travels = self.frog.get('totalTravels', 0)
        level = self.frog.get('level', 1)
        
        info_layout.addRow(CaptionLabel('名称:'), BodyLabel(f'🐸 {name}'))
        status_text = {'Idle': '🏠 空闲', 'Traveling': '✈️ 旅行中'}.get(status, status)
        info_layout.addRow(CaptionLabel('状态:'), BodyLabel(status_text))
        info_layout.addRow(CaptionLabel('等级:'), BodyLabel(f'⭐ Lv.{level}'))
        info_layout.addRow(CaptionLabel('旅行次数:'), BodyLabel(f'🧳 {travels} 次'))
        
        layout.addWidget(info_card)
        
        # 标签页导航
        self.pivot = Pivot(self)
        self.stacked_widget = QStackedWidget(self)
        
        start_page = self._create_start_page()
        self.stacked_widget.addWidget(start_page)
        self.pivot.addItem('start', '🚀 开始旅行',
            onClick=lambda: self.stacked_widget.setCurrentWidget(start_page))
        
        history_page = self._create_history_page()
        self.stacked_widget.addWidget(history_page)
        self.pivot.addItem('history', '📜 旅行历史',
            onClick=lambda: self.stacked_widget.setCurrentWidget(history_page))
        
        self.pivot.setCurrentItem('start')
        
        layout.addWidget(self.pivot)
        layout.addWidget(self.stacked_widget)
        
        # 关闭按钮
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _create_start_page(self):
        """创建开始旅行页面"""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(16)
        
        # 旅行类型
        type_card = CardWidget()
        type_layout = QVBoxLayout(type_card)
        type_layout.setContentsMargins(16, 16, 16, 16)
        type_layout.setSpacing(12)
        
        type_layout.addWidget(BodyLabel('📍 选择旅行类型'))
        
        self.random_btn = PrimaryPushButton(FluentIcon.GLOBE, '🎲 随机探索')
        self.random_btn.clicked.connect(lambda: self._start_travel('RANDOM'))
        type_layout.addWidget(self.random_btn)
        
        self.visit_btn = PushButton(FluentIcon.HOME, '🏠 拜访好友')
        self.visit_btn.clicked.connect(lambda: self._start_travel('VISIT'))
        type_layout.addWidget(self.visit_btn)
        
        layout.addWidget(type_card)
        
        # 旅行参数
        param_card = CardWidget()
        param_layout = QFormLayout(param_card)
        param_layout.setContentsMargins(16, 16, 16, 16)
        param_layout.setSpacing(12)
        
        self.chain_combo = ComboBox()
        self.chain_combo.addItems(['ZetaChain', 'Ethereum', 'BSC', 'Arbitrum'])
        param_layout.addRow(CaptionLabel('目标链:'), self.chain_combo)
        
        self.duration_spin = SpinBox()
        self.duration_spin.setRange(60, 3600)
        self.duration_spin.setValue(300)
        self.duration_spin.setSuffix(' 秒')
        param_layout.addRow(CaptionLabel('旅行时长:'), self.duration_spin)
        
        layout.addWidget(param_card)
        layout.addStretch()
        
        if self.frog.get('status') != 'Idle':
            self.random_btn.setEnabled(False)
            self.visit_btn.setEnabled(False)
        
        return page
    
    def _create_history_page(self):
        """创建旅行历史页面"""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(12)
        
        self.history_list = ListWidget()
        layout.addWidget(self.history_list)
        
        refresh_btn = PushButton(FluentIcon.SYNC, '刷新')
        refresh_btn.clicked.connect(self._load_history)
        layout.addWidget(refresh_btn)
        
        return page
    
    def _load_data(self):
        self._load_history()
    
    def _load_history(self):
        self.history_list.clear()
        frog_id = self.frog.get('tokenId') or self.frog.get('id')
        travels = api_client.get_frog_travels(frog_id)
        
        for travel in travels:
            status = travel.get('status', 'Unknown')
            chain_id = travel.get('chainId', 0)
            chain_name = {7001: 'ZetaChain', 97: 'BSC', 11155111: 'Sepolia'}.get(chain_id, f'Chain {chain_id}')
            start_time = travel.get('startTime', '')[:10]
            status_emoji = {'Completed': '✅', 'Active': '🔄', 'Cancelled': '❌'}.get(status, '❓')
            self.history_list.addItem(f'{status_emoji} {start_time} - {chain_name}')
        
        if not travels:
            self.history_list.addItem('暂无旅行记录')
    
    def _start_travel(self, travel_type):
        # 后端期望 tokenId 而非数据库 id
        frog_id = self.frog.get('tokenId') or self.frog.get('id')
        chain = self.chain_combo.currentText().lower().replace(' ', '')
        duration = self.duration_spin.value()
        
        try:
            result = api_client.start_travel(frog_id, travel_type, chain, duration)
            if result.get('success'):
                InfoBar.success('成功', '旅行已开始！', parent=self,
                              position=InfoBarPosition.TOP, duration=2000)
                self.close()
            else:
                InfoBar.error('失败', result.get('error', '未知错误'), parent=self,
                            position=InfoBarPosition.TOP, duration=3000)
        except Exception as e:
            InfoBar.error('错误', str(e), parent=self,
                        position=InfoBarPosition.TOP, duration=3000)
