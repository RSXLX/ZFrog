# -*- coding: utf-8 -*-
"""
主控制面板 - PyQt-Fluent-Widgets 现代UI
显示青蛙信息、状态，提供功能入口
"""

from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QWidget, QGridLayout
)
from PyQt5.QtCore import Qt, QTimer
from PyQt5.QtGui import QFont, QColor

from qfluentwidgets import (
    SubtitleLabel, BodyLabel, CaptionLabel,
    PrimaryPushButton, PushButton, TransparentPushButton,
    CardWidget, FluentIcon, ProgressBar
)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ui.components.frog_svg import FrogSvgWidget
from services.api_client import api_client
from services.wallet_manager import wallet_manager
from config import FrogState


class MainPanelDialog(QDialog):
    """主控制面板 - Fluent Design 风格"""
    
    def __init__(self, frog, wallet_address, parent=None):
        super().__init__(parent)
        self.frog = frog
        self.wallet_address = wallet_address
        
        self.setWindowTitle(f'🐸 {frog.get("name", "ZetaFrog")}')
        self.setFixedSize(480, 700)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
        self._start_auto_refresh()
    
    def _setup_content(self):
        """设置内容区域"""
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        # ===== 青蛙信息卡片 =====
        info_card = CardWidget(self)
        info_layout = QVBoxLayout(info_card)
        info_layout.setSpacing(16)
        info_layout.setContentsMargins(20, 20, 20, 20)
        
        # 顶部：青蛙 + 名字
        top_row = QHBoxLayout()
        
        # 青蛙 SVG
        self.frog_widget = FrogSvgWidget(size=100)
        self._update_frog_state()
        top_row.addWidget(self.frog_widget)
        
        # 信息区
        info_col = QVBoxLayout()
        info_col.setSpacing(8)
        
        # 名字
        name = self.frog.get('name', '未命名')
        name_label = SubtitleLabel(name)
        name_label.setFont(QFont('Segoe UI', 18, QFont.Bold))
        info_col.addWidget(name_label)
        
        # 状态标签
        status = self.frog.get('status', 'Idle')
        self.status_label = CaptionLabel()
        self._update_status_label(status)
        info_col.addWidget(self.status_label)
        
        # 统计
        stats_layout = QHBoxLayout()
        stats_layout.setSpacing(20)
        
        travels = self.frog.get('totalTravels', 0)
        xp = self.frog.get('xp', 0)
        level = self.frog.get('level', 1)
        
        for icon, value, label in [('✈️', travels, '旅行'), ('⭐', f'Lv.{level}', '等级'), ('📊', xp, 'XP')]:
            stat_w = QVBoxLayout()
            stat_w.setSpacing(2)
            val_label = BodyLabel(f'{icon} {value}')
            val_label.setFont(QFont('Segoe UI', 12, QFont.Bold))
            stat_w.addWidget(val_label)
            desc_label = CaptionLabel(label)
            stat_w.addWidget(desc_label)
            stats_layout.addLayout(stat_w)
        
        stats_layout.addStretch()
        info_col.addLayout(stats_layout)
        
        top_row.addLayout(info_col)
        top_row.addStretch()
        info_layout.addLayout(top_row)
        
        # 刷新按钮
        refresh_btn = PushButton(FluentIcon.SYNC, '刷新')
        refresh_btn.clicked.connect(self._refresh_data)
        info_layout.addWidget(refresh_btn)
        
        layout.addWidget(info_card)
        
        # ===== 功能按钮网格 =====
        buttons_card = CardWidget(self)
        buttons_layout = QGridLayout(buttons_card)
        buttons_layout.setSpacing(12)
        buttons_layout.setContentsMargins(16, 16, 16, 16)
        
        # 按钮配置
        buttons = [
            ('✈️ 开始旅行', FluentIcon.AIRPLANE, self._show_travel, True),
            ('👥 好友系统', FluentIcon.PEOPLE, self._show_friends, False),
            ('🏆 我的徽章', FluentIcon.TAG, self._show_badges, False),
            ('🎁 纪念品', FluentIcon.HEART, self._show_nft, False),
        ]
        
        for i, (text, icon, callback, is_primary) in enumerate(buttons):
            if is_primary:
                btn = PrimaryPushButton(icon, text)
            else:
                btn = PushButton(icon, text)
            btn.setFixedHeight(50)
            btn.clicked.connect(callback)
            buttons_layout.addWidget(btn, i // 2, i % 2)
        
        layout.addWidget(buttons_card)
        
        # ===== 最近旅行 =====
        history_card = CardWidget(self)
        history_layout = QVBoxLayout(history_card)
        history_layout.setContentsMargins(16, 16, 16, 16)
        
        history_title = SubtitleLabel('📖 最近旅行')
        history_layout.addWidget(history_title)
        
        # 旅行列表
        self.travels_container = QVBoxLayout()
        self.travels_container.setSpacing(8)
        history_layout.addLayout(self.travels_container)
        
        self._load_travels()
        
        layout.addWidget(history_card)
        
        # 关闭按钮
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _update_frog_state(self):
        """根据状态更新青蛙显示"""
        status = self.frog.get('status', 'Idle')
        if status == 'Traveling':
            self.frog_widget.state = FrogState.TRAVELING
            self.frog_widget.set_traveling(True)
        else:
            self.frog_widget.state = FrogState.IDLE
            self.frog_widget.set_traveling(False)
    
    def _update_status_label(self, status):
        """更新状态标签"""
        if status == 'Traveling':
            self.status_label.setText('✈️ 旅行中')
            self.status_label.setStyleSheet("""
                background: rgba(88, 166, 255, 0.2);
                color: #58A6FF;
                padding: 6px 14px;
                border-radius: 12px;
            """)
        else:
            self.status_label.setText('🏠 在家')
            self.status_label.setStyleSheet("""
                background: rgba(16, 185, 129, 0.2);
                color: #10B981;
                padding: 6px 14px;
                border-radius: 12px;
            """)
    
    def _load_travels(self):
        """加载旅行历史"""
        while self.travels_container.count():
            item = self.travels_container.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        frog_id = self.frog.get('tokenId') or self.frog.get('id')
        travels = api_client.get_frog_travels(frog_id)
        
        for travel in travels[:3]:
            travel_item = self._create_travel_item(travel)
            self.travels_container.addWidget(travel_item)
        
        if not travels:
            empty_label = CaptionLabel('还没有旅行记录')
            empty_label.setAlignment(Qt.AlignCenter)
            self.travels_container.addWidget(empty_label)
    
    def _create_travel_item(self, travel):
        """创建旅行条目"""
        card = CardWidget()
        layout = QHBoxLayout(card)
        layout.setContentsMargins(14, 10, 14, 10)
        
        status = travel.get('status', 'Unknown')
        status_emoji = {'Completed': '✅', 'Active': '🔄', 'Cancelled': '❌'}.get(status, '❓')
        chain_id = travel.get('chainId', 0)
        chain_name = {7001: 'ZetaChain', 97: 'BSC', 11155111: 'Sepolia'}.get(chain_id, f'Chain {chain_id}')
        start_time = travel.get('startTime', '')[:10]
        
        info_label = BodyLabel(f'{status_emoji} {start_time} → {chain_name}')
        layout.addWidget(info_label)
        layout.addStretch()
        
        souvenir = travel.get('souvenir')
        if souvenir:
            layout.addWidget(BodyLabel('🎁'))
        
        return card
    
    def _refresh_data(self):
        """刷新数据"""
        if self.wallet_address:
            new_frog = api_client.get_frog_detail(self.frog.get('tokenId'), self.wallet_address)
            if new_frog:
                self.frog = new_frog
                self._update_frog_state()
                self._update_status_label(self.frog.get('status', 'Idle'))
                self._load_travels()
    
    def _start_auto_refresh(self):
        """启动自动刷新"""
        self.refresh_timer = QTimer(self)
        self.refresh_timer.timeout.connect(self._refresh_data)
        self.refresh_timer.start(30000)
    
    def _show_travel(self):
        from ui.travel_dialog import TravelDialog
        dialog = TravelDialog(self.frog, self.wallet_address, self)
        dialog.exec_()
        self._refresh_data()
    
    def _show_friends(self):
        from ui.friends_dialog import FriendsDialog
        dialog = FriendsDialog(self.frog, self)
        dialog.exec_()
    
    def _show_badges(self):
        from ui.badges_dialog import BadgesDialog
        dialog = BadgesDialog(self.frog, self.wallet_address, self)
        dialog.exec_()
    
    def _show_nft(self):
        from ui.nft_gallery import NFTGalleryDialog
        dialog = NFTGalleryDialog(self.frog, self.wallet_address, self)
        dialog.exec_()
