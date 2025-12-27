# -*- coding: utf-8 -*-
"""
组队旅行系统 - PyQt-Fluent-Widgets 现代UI
"""

from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QWidget, QGridLayout, QScrollArea
)
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont

from qfluentwidgets import (
    SubtitleLabel, BodyLabel, CaptionLabel,
    PrimaryPushButton, PushButton, TransparentPushButton, CardWidget,
    FluentIcon, InfoBar, InfoBarPosition, ComboBox, SpinBox, ProgressBar
)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.api_client import api_client


TEAM_BONUS = {
    2: {'xp': 20, 'rarity': 10, 'name': '双人组'},
    3: {'xp': 35, 'rarity': 20, 'name': '三人组'},
    4: {'xp': 50, 'rarity': 30, 'name': '满员队'},
}

CHAIN_OPTIONS = [
    {'id': 7001, 'name': 'ZetaChain', 'emoji': '⚡'},
    {'id': 97, 'name': 'BSC', 'emoji': '🟡'},
    {'id': 11155111, 'name': 'Ethereum', 'emoji': '💎'},
]


class FriendInviteCard(CardWidget):
    toggled = pyqtSignal(dict, bool)
    
    def __init__(self, friend, parent=None):
        super().__init__(parent)
        self.friend = friend
        self.selected = False
        self.setCursor(Qt.PointingHandCursor)
        self._setup_ui()
        self._update_style()
    
    def _setup_ui(self):
        self.setFixedSize(150, 100)
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignCenter)
        layout.setSpacing(6)
        
        avatar = BodyLabel('🐸')
        avatar.setFont(QFont('Segoe UI Emoji', 24))
        avatar.setAlignment(Qt.AlignCenter)
        layout.addWidget(avatar)
        
        name = self.friend.get('name', '未知')[:8]
        self.name_label = CaptionLabel(name)
        self.name_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.name_label)
        
        status = self.friend.get('status', 'Idle')
        status_text = '🏠 空闲' if status == 'Idle' else '✈️ 旅行中'
        self.status_label = CaptionLabel(status_text)
        self.status_label.setStyleSheet('color: #8B949E; font-size: 10px;')
        layout.addWidget(self.status_label)
        
        if status != 'Idle':
            self.setEnabled(False)
    
    def _update_style(self):
        if self.selected:
            self.setStyleSheet("FriendInviteCard { background: #1E3A2F; border: 2px solid #10B981; border-radius: 12px; }")
        else:
            self.setStyleSheet("FriendInviteCard { background: #21262D; border: 1px solid #30363D; border-radius: 12px; }")
    
    def toggle(self):
        self.selected = not self.selected
        self._update_style()
        self.toggled.emit(self.friend, self.selected)
    
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton and self.isEnabled():
            self.toggle()
        super().mousePressEvent(event)


class TeamTravelDialog(QDialog):
    def __init__(self, frog, wallet_address, parent=None):
        super().__init__(parent)
        self.frog = frog
        self.wallet_address = wallet_address
        self.friends = []
        self.selected_friends = []
        self.friend_cards = []
        
        self.setWindowTitle('👥 组队旅行')
        self.setFixedSize(580, 720)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
        self._load_data()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        title = SubtitleLabel('👥 组队旅行')
        title.setFont(QFont('Segoe UI', 18, QFont.Bold))
        layout.addWidget(title)
        
        # 说明卡片
        info_card = CardWidget(self)
        info_layout = QVBoxLayout(info_card)
        info_layout.addWidget(BodyLabel('🎯 组队加成'))
        info_layout.addWidget(CaptionLabel('• 双人组: XP +20%, 稀有度 +10%'))
        info_layout.addWidget(CaptionLabel('• 三人组: XP +35%, 稀有度 +20%'))
        info_layout.addWidget(CaptionLabel('• 满员队: XP +50%, 稀有度 +30%'))
        layout.addWidget(info_card)
        
        # 队伍信息
        team_card = CardWidget(self)
        team_layout = QHBoxLayout(team_card)
        team_layout.addWidget(BodyLabel('🐸 队伍:'))
        my_frog_label = CaptionLabel(f"🐸 {self.frog.get('name', '我')} (队长)")
        my_frog_label.setStyleSheet('color: #F59E0B;')
        team_layout.addWidget(my_frog_label)
        team_layout.addStretch()
        self.team_count_label = BodyLabel('1/4 人')
        team_layout.addWidget(self.team_count_label)
        layout.addWidget(team_card)
        
        # 邀请好友
        invite_card = CardWidget(self)
        invite_layout = QVBoxLayout(invite_card)
        invite_layout.addWidget(SubtitleLabel('📨 邀请好友 (最多3人)'))
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        scroll.setMaximumHeight(150)
        
        self.friends_widget = QWidget()
        self.friends_layout = QHBoxLayout(self.friends_widget)
        self.friends_layout.setAlignment(Qt.AlignLeft)
        scroll.setWidget(self.friends_widget)
        invite_layout.addWidget(scroll)
        layout.addWidget(invite_card)
        
        # 加成预览
        bonus_card = CardWidget(self)
        bonus_layout = QVBoxLayout(bonus_card)
        bonus_header = QHBoxLayout()
        bonus_header.addWidget(SubtitleLabel('✨ 当前加成'))
        bonus_header.addStretch()
        self.bonus_label = CaptionLabel('无加成 (单人)')
        bonus_header.addWidget(self.bonus_label)
        bonus_layout.addLayout(bonus_header)
        self.xp_bonus = BodyLabel('📊 XP 加成: +0%')
        bonus_layout.addWidget(self.xp_bonus)
        self.rarity_bonus = BodyLabel('🎁 稀有度加成: +0%')
        bonus_layout.addWidget(self.rarity_bonus)
        layout.addWidget(bonus_card)
        
        # 旅行参数
        param_card = CardWidget(self)
        param_layout = QVBoxLayout(param_card)
        param_layout.addWidget(SubtitleLabel('⚙️ 旅行设置'))
        
        chain_row = QHBoxLayout()
        chain_row.addWidget(BodyLabel('目标链:'))
        self.chain_combo = ComboBox()
        for chain in CHAIN_OPTIONS:
            self.chain_combo.addItem(f"{chain['emoji']} {chain['name']}")
        chain_row.addWidget(self.chain_combo)
        param_layout.addLayout(chain_row)
        
        duration_row = QHBoxLayout()
        duration_row.addWidget(BodyLabel('时长:'))
        self.duration_spin = SpinBox()
        self.duration_spin.setRange(60, 3600)
        self.duration_spin.setValue(300)
        self.duration_spin.setSuffix(' 秒')
        duration_row.addWidget(self.duration_spin)
        param_layout.addLayout(duration_row)
        layout.addWidget(param_card)
        
        self.start_btn = PrimaryPushButton(FluentIcon.SEND, '🚀 发起组队旅行')
        self.start_btn.clicked.connect(self._start_team_travel)
        layout.addWidget(self.start_btn)
        
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _load_data(self):
        frog_id = self.frog.get('tokenId') or self.frog.get('id')
        self.friends = api_client.get_friends(frog_id)
        self._display_friends()
    
    def _display_friends(self):
        while self.friends_layout.count():
            item = self.friends_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        self.friend_cards.clear()
        
        for friend in self.friends:
            card = FriendInviteCard(friend)
            card.toggled.connect(self._on_friend_toggled)
            self.friend_cards.append(card)
            self.friends_layout.addWidget(card)
        
        if not self.friends:
            empty = CaptionLabel('暂无好友')
            self.friends_layout.addWidget(empty)
        
        self.friends_layout.addStretch()
    
    def _on_friend_toggled(self, friend, selected):
        if selected:
            if len(self.selected_friends) >= 3:
                for card in self.friend_cards:
                    if card.friend.get('id') == friend.get('id'):
                        card.selected = False
                        card._update_style()
                        break
                InfoBar.warning('提示', '最多只能邀请 3 位好友', parent=self,
                              position=InfoBarPosition.TOP, duration=2000)
                return
            self.selected_friends.append(friend)
        else:
            self.selected_friends = [f for f in self.selected_friends 
                                     if f.get('id') != friend.get('id')]
        self._update_bonus()
    
    def _update_bonus(self):
        team_size = len(self.selected_friends) + 1
        self.team_count_label.setText(f'{team_size}/4 人')
        
        if team_size == 1:
            self.bonus_label.setText('无加成 (单人)')
            self.xp_bonus.setText('📊 XP 加成: +0%')
            self.rarity_bonus.setText('🎁 稀有度加成: +0%')
        else:
            bonus = TEAM_BONUS.get(team_size, TEAM_BONUS[2])
            self.bonus_label.setText(f"✨ {bonus['name']}")
            self.bonus_label.setStyleSheet('color: #10B981;')
            self.xp_bonus.setText(f"📊 XP 加成: +{bonus['xp']}%")
            self.rarity_bonus.setText(f"🎁 稀有度加成: +{bonus['rarity']}%")
    
    def _start_team_travel(self):
        chain_index = self.chain_combo.currentIndex()
        chain = CHAIN_OPTIONS[chain_index]
        duration = self.duration_spin.value()
        team_size = len(self.selected_friends) + 1
        bonus = TEAM_BONUS.get(team_size, {'xp': 0, 'rarity': 0, 'name': '单人'})
        
        try:
            frog_id = self.frog.get('tokenId') or self.frog.get('id')
            result = api_client.start_travel(frog_id, 'TEAM', chain['name'].lower(), duration)
            
            if result.get('success'):
                InfoBar.success('成功', f"组队旅行开始！加成: XP +{bonus['xp']}%", parent=self,
                               position=InfoBarPosition.TOP, duration=3000)
                self.close()
            else:
                InfoBar.error('失败', result.get('error', '未知错误'), parent=self,
                            position=InfoBarPosition.TOP, duration=2000)
        except Exception as e:
            InfoBar.error('错误', str(e), parent=self,
                        position=InfoBarPosition.TOP, duration=2000)
