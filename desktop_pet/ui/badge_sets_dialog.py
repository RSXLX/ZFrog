# -*- coding: utf-8 -*-
"""
徽章套装系统 - PyQt-Fluent-Widgets 现代UI
"""

from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QWidget, QGridLayout, QScrollArea
)
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont

from qfluentwidgets import (
    SubtitleLabel, BodyLabel, CaptionLabel,
    PrimaryPushButton, PushButton, TransparentPushButton, CardWidget,
    FluentIcon, InfoBar, InfoBarPosition, ProgressBar
)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.api_client import api_client


BADGE_SETS = [
    {
        'id': 'travel_master',
        'name': '🧳 旅行大师',
        'description': '完成所有旅行里程碑徽章',
        'badge_codes': ['FIRST_TRIP', 'TRAVELER_5', 'TRAVELER_15'],
        'reward': {'type': 'title', 'name': '环球旅行家', 'icon': '🌍'},
        'color': '#10B981',
    },
    {
        'id': 'chain_explorer',
        'name': '⛓️ 链间探索者',
        'description': '访问所有支持的区块链',
        'badge_codes': ['BSC_VISITOR', 'ETH_VISITOR', 'ZETA_VISITOR', 'CROSS_CHAIN'],
        'reward': {'type': 'effect', 'name': '彩虹光环', 'icon': '🌈'},
        'color': '#3B82F6',
    },
    {
        'id': 'lucky_finder',
        'name': '🍀 幸运发现者',
        'description': '解锁所有发现类徽章',
        'badge_codes': ['LUCKY_FIND', 'WHALE_WATCHER', 'COLLECTOR_10'],
        'reward': {'type': 'bonus', 'name': '幸运加成 +5%', 'icon': '🎰'},
        'color': '#F59E0B',
    },
    {
        'id': 'social_star',
        'name': '👥 社交之星',
        'description': '成为活跃的社区成员',
        'badge_codes': ['FIRST_FRIEND', 'POPULAR_5', 'HELPER_10'],
        'reward': {'type': 'title', 'name': '人气王', 'icon': '⭐'},
        'color': '#EC4899',
    },
]


class BadgeSetCard(CardWidget):
    clicked = pyqtSignal(dict)
    
    def __init__(self, badge_set, progress, completed, parent=None):
        super().__init__(parent)
        self.badge_set = badge_set
        self.progress = progress
        self.completed = completed
        self.setCursor(Qt.PointingHandCursor)
        self._setup_ui()
    
    def _setup_ui(self):
        color = self.badge_set.get('color', '#6B7280')
        
        if self.completed:
            self.setStyleSheet(f"BadgeSetCard {{ background: {color}30; border: 2px solid {color}; border-radius: 16px; }}")
        else:
            self.setStyleSheet(f"BadgeSetCard {{ background: #21262D; border: 1px solid #30363D; border-radius: 16px; }}")
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(10)
        
        header = QHBoxLayout()
        name = self.badge_set.get('name', '套装')
        name_label = SubtitleLabel(name)
        header.addWidget(name_label)
        header.addStretch()
        
        if self.completed:
            complete_label = CaptionLabel('✅ 已完成')
            complete_label.setStyleSheet(f'color: {color};')
            header.addWidget(complete_label)
        
        layout.addLayout(header)
        
        desc = self.badge_set.get('description', '')
        desc_label = CaptionLabel(desc)
        desc_label.setStyleSheet('color: #8B949E;')
        desc_label.setWordWrap(True)
        layout.addWidget(desc_label)
        
        if not self.completed:
            progress_layout = QHBoxLayout()
            progress_bar = ProgressBar(self)
            progress_bar.setMinimum(0)
            progress_bar.setMaximum(self.progress['total'])
            progress_bar.setValue(self.progress['current'])
            progress_bar.setFixedHeight(8)
            progress_layout.addWidget(progress_bar)
            
            progress_text = CaptionLabel(f"{self.progress['current']}/{self.progress['total']}")
            progress_text.setStyleSheet(f'color: {color};')
            progress_layout.addWidget(progress_text)
            layout.addLayout(progress_layout)
        
        reward = self.badge_set.get('reward', {})
        reward_layout = QHBoxLayout()
        reward_layout.addWidget(CaptionLabel('🎁 奖励:'))
        reward_text = f"{reward.get('icon', '🎁')} {reward.get('name', '神秘奖励')}"
        reward_label = CaptionLabel(reward_text)
        reward_label.setStyleSheet(f'color: {color}; font-weight: bold;')
        reward_layout.addWidget(reward_label)
        reward_layout.addStretch()
        layout.addLayout(reward_layout)
    
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.clicked.emit(self.badge_set)
        super().mousePressEvent(event)


class BadgeSetDetailDialog(QDialog):
    def __init__(self, badge_set, badges, parent=None):
        super().__init__(parent)
        self.badge_set = badge_set
        self.badges = badges
        
        name = badge_set.get('name', '套装')
        self.setWindowTitle(f'{name} 详情')
        self.setFixedSize(450, 550)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        color = self.badge_set.get('color', '#6B7280')
        
        info_card = CardWidget(self)
        info_layout = QVBoxLayout(info_card)
        info_layout.addWidget(SubtitleLabel(self.badge_set.get('name', '套装')))
        desc_label = CaptionLabel(self.badge_set.get('description', ''))
        desc_label.setWordWrap(True)
        info_layout.addWidget(desc_label)
        layout.addWidget(info_card)
        
        badges_card = CardWidget(self)
        badges_layout = QVBoxLayout(badges_card)
        badges_layout.addWidget(SubtitleLabel('🏅 需要的徽章'))
        
        badge_codes = self.badge_set.get('badge_codes', [])
        user_badge_codes = set(b.get('code') for b in self.badges if b.get('unlocked'))
        
        for code in badge_codes:
            has_badge = code in user_badge_codes
            badge_info = self._get_badge_by_code(code)
            
            row = QHBoxLayout()
            status = '✅' if has_badge else '🔒'
            icon = badge_info.get('icon', '🏆') if has_badge else '❓'
            name = badge_info.get('name', code) if has_badge else '???'
            row.addWidget(BodyLabel(f'{status} {icon} {name}'))
            row.addStretch()
            badges_layout.addLayout(row)
        
        layout.addWidget(badges_card)
        
        reward_card = CardWidget(self)
        reward_layout = QVBoxLayout(reward_card)
        reward_layout.addWidget(SubtitleLabel('🎁 套装奖励'))
        
        reward = self.badge_set.get('reward', {})
        reward_layout.addWidget(BodyLabel(f"{reward.get('icon', '🎁')} {reward.get('name', '神秘奖励')}"))
        
        completed = self._check_completed()
        if completed:
            reward_layout.addWidget(CaptionLabel('✅ 已获得此奖励'))
        
        layout.addWidget(reward_card)
        
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _get_badge_by_code(self, code):
        for badge in self.badges:
            if badge.get('code') == code:
                return badge
        return {}
    
    def _check_completed(self):
        badge_codes = self.badge_set.get('badge_codes', [])
        user_badge_codes = set(b.get('code') for b in self.badges if b.get('unlocked'))
        return all(code in user_badge_codes for code in badge_codes)


class BadgeSetsDialog(QDialog):
    def __init__(self, frog, parent=None):
        super().__init__(parent)
        self.frog = frog
        self.badges = []
        
        self.setWindowTitle('🎖️ 徽章套装')
        self.setFixedSize(600, 700)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
        self._load_data()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        title = SubtitleLabel('🎖️ 徽章套装')
        title.setFont(QFont('Segoe UI', 18, QFont.Bold))
        layout.addWidget(title)
        
        info_card = CardWidget(self)
        info_layout = QVBoxLayout(info_card)
        info_layout.addWidget(BodyLabel('✨ 集齐套装内的所有徽章，解锁专属奖励！'))
        info_layout.addWidget(CaptionLabel('点击套装查看详情和进度'))
        layout.addWidget(info_card)
        
        stats_layout = QHBoxLayout()
        self.stats_label = BodyLabel('套装进度: 0/4')
        stats_layout.addWidget(self.stats_label)
        stats_layout.addStretch()
        self.completed_label = CaptionLabel('已完成: 0 个')
        self.completed_label.setStyleSheet('color: #10B981;')
        stats_layout.addWidget(self.completed_label)
        layout.addLayout(stats_layout)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        self.sets_container = QWidget()
        self.sets_layout = QVBoxLayout(self.sets_container)
        self.sets_layout.setSpacing(12)
        
        scroll.setWidget(self.sets_container)
        layout.addWidget(scroll)
        
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _load_data(self):
        frog_id = self.frog.get('tokenId') or self.frog.get('id')
        self.badges = api_client.get_badges(frog_id)
        self._display_sets()
    
    def _display_sets(self):
        while self.sets_layout.count():
            item = self.sets_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        user_badge_codes = set(b.get('code') for b in self.badges if b.get('unlocked'))
        completed_count = 0
        
        for badge_set in BADGE_SETS:
            badge_codes = badge_set.get('badge_codes', [])
            current = sum(1 for c in badge_codes if c in user_badge_codes)
            progress = {'current': current, 'total': len(badge_codes)}
            completed = current == len(badge_codes)
            
            if completed:
                completed_count += 1
            
            card = BadgeSetCard(badge_set, progress, completed)
            card.clicked.connect(self._show_detail)
            self.sets_layout.addWidget(card)
        
        self.sets_layout.addStretch()
        
        total = len(BADGE_SETS)
        self.stats_label.setText(f'套装进度: {completed_count}/{total}')
        self.completed_label.setText(f'已完成: {completed_count} 个')
    
    def _show_detail(self, badge_set):
        dialog = BadgeSetDetailDialog(badge_set, self.badges, self)
        dialog.exec_()
