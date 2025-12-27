# -*- coding: utf-8 -*-
"""
徽章系统对话框 - PyQt-Fluent-Widgets 现代UI
包含：进度显示、分类标签、详情弹窗
"""

from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QWidget, QGridLayout, QScrollArea
)
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont

from qfluentwidgets import (
    SubtitleLabel, BodyLabel, CaptionLabel,
    PushButton, TransparentPushButton, CardWidget,
    SegmentedWidget, FluentIcon, ProgressBar, InfoBar, InfoBarPosition
)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.api_client import api_client


# 徽章分类
BADGE_CATEGORIES = {
    'trip': {'name': '🎒 旅行', 'color': '#10B981'},
    'chain': {'name': '⛓️ 链探索', 'color': '#3B82F6'},
    'discovery': {'name': '🍀 发现', 'color': '#F59E0B'},
    'social': {'name': '👥 社交', 'color': '#EC4899'},
    'collection': {'name': '🏅 收藏', 'color': '#8B5CF6'},
}


class BadgeCard(CardWidget):
    """徽章卡片组件"""
    
    clicked = pyqtSignal(dict)
    
    RARITY_COLORS = {
        1: ('#3D4450', '#6B7280'),
        2: ('#1E3A2F', '#10B981'),
        3: ('#1E3A5F', '#3B82F6'),
        4: ('#2D1F4E', '#A855F7'),
        5: ('#3D2E1F', '#F59E0B'),
    }
    
    RARITY_STARS = {1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐', 4: '⭐⭐⭐⭐', 5: '⭐⭐⭐⭐⭐'}
    
    def __init__(self, badge, parent=None):
        super().__init__(parent)
        self.badge = badge
        self.setCursor(Qt.PointingHandCursor)
        
        unlocked = badge.get('unlocked', False)
        rarity = badge.get('rarity', 1)
        progress = badge.get('progress', 0)
        bg_color, accent_color = self.RARITY_COLORS.get(rarity, self.RARITY_COLORS[1])
        
        if unlocked:
            self.setStyleSheet(f"""
                BadgeCard {{
                    background: {bg_color};
                    border: 2px solid {accent_color};
                    border-radius: 16px;
                }}
                BadgeCard:hover {{
                    background: {bg_color}DD;
                }}
            """)
        else:
            self.setStyleSheet("""
                BadgeCard {
                    background: #21262D;
                    border: 1px solid #30363D;
                    border-radius: 16px;
                }
                BadgeCard:hover {
                    border: 1px solid #484F58;
                }
            """)
        
        self.setFixedSize(145, 180)
        
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignCenter)
        layout.setSpacing(6)
        layout.setContentsMargins(10, 12, 10, 12)
        
        icon = badge.get('icon', '🏆') if unlocked else '🔒'
        icon_label = BodyLabel(icon)
        icon_label.setFont(QFont('Segoe UI Emoji', 28))
        icon_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(icon_label)
        
        name = badge.get('name', '???') if unlocked else '???'
        name_label = CaptionLabel(name)
        name_label.setAlignment(Qt.AlignCenter)
        name_label.setWordWrap(True)
        name_label.setStyleSheet('font-weight: bold;')
        layout.addWidget(name_label)
        
        if not unlocked and progress > 0:
            progress_bar = ProgressBar(self)
            progress_bar.setMinimum(0)
            progress_bar.setMaximum(100)
            progress_bar.setValue(int(progress))
            progress_bar.setFixedHeight(6)
            layout.addWidget(progress_bar)
            
            progress_label = CaptionLabel(f'{int(progress)}%')
            progress_label.setAlignment(Qt.AlignCenter)
            progress_label.setStyleSheet(f'color: {accent_color}; font-size: 10px;')
            layout.addWidget(progress_label)
        elif not unlocked:
            hint_label = CaptionLabel('待解锁')
            hint_label.setAlignment(Qt.AlignCenter)
            hint_label.setStyleSheet('color: #6B7280; font-size: 10px;')
            layout.addWidget(hint_label)
        
        if unlocked:
            stars = self.RARITY_STARS.get(rarity, '⭐')
            stars_label = CaptionLabel(stars)
            stars_label.setAlignment(Qt.AlignCenter)
            layout.addWidget(stars_label)
    
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.clicked.emit(self.badge)
        super().mousePressEvent(event)


class BadgeDetailDialog(QDialog):
    """徽章详情弹窗"""
    
    def __init__(self, badge, parent=None):
        super().__init__(parent)
        self.badge = badge
        
        unlocked = badge.get('unlocked', False)
        self.setWindowTitle('🏆 徽章详情' if unlocked else '🔒 未解锁徽章')
        self.setFixedSize(380, 420)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        unlocked = self.badge.get('unlocked', False)
        rarity = self.badge.get('rarity', 1)
        progress = self.badge.get('progress', 0)
        
        card = CardWidget(self)
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(20, 20, 20, 20)
        card_layout.setSpacing(16)
        card_layout.setAlignment(Qt.AlignCenter)
        
        icon = self.badge.get('icon', '🏆') if unlocked else '🔒'
        icon_label = BodyLabel(icon)
        icon_label.setFont(QFont('Segoe UI Emoji', 48))
        icon_label.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(icon_label)
        
        name = self.badge.get('name', '神秘徽章')
        name_label = SubtitleLabel(name if unlocked else '???')
        name_label.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(name_label)
        
        desc = self.badge.get('description', '完成特定条件解锁')
        desc_label = BodyLabel(desc if unlocked else '完成特定条件解锁此徽章')
        desc_label.setAlignment(Qt.AlignCenter)
        desc_label.setWordWrap(True)
        card_layout.addWidget(desc_label)
        
        requirement = self.badge.get('requirement', '')
        if requirement:
            req_label = CaptionLabel(f'📋 条件: {requirement}')
            req_label.setAlignment(Qt.AlignCenter)
            req_label.setStyleSheet('color: #8B949E;')
            card_layout.addWidget(req_label)
        
        if not unlocked:
            progress_bar = ProgressBar(self)
            progress_bar.setMinimum(0)
            progress_bar.setMaximum(100)
            progress_bar.setValue(int(progress))
            progress_bar.setFixedHeight(10)
            card_layout.addWidget(progress_bar)
            
            progress_label = BodyLabel(f'进度: {int(progress)}%')
            progress_label.setAlignment(Qt.AlignCenter)
            card_layout.addWidget(progress_label)
        
        if unlocked:
            unlock_time = self.badge.get('unlockedAt', '')
            if unlock_time:
                time_label = CaptionLabel(f'🕐 解锁时间: {unlock_time[:10]}')
                time_label.setAlignment(Qt.AlignCenter)
                time_label.setStyleSheet('color: #10B981;')
                card_layout.addWidget(time_label)
            
            rarity_names = {1: '普通', 2: '罕见', 3: '稀有', 4: '史诗', 5: '传说'}
            rarity_label = CaptionLabel(f'✨ 稀有度: {rarity_names.get(rarity, "普通")}')
            rarity_label.setAlignment(Qt.AlignCenter)
            card_layout.addWidget(rarity_label)
        
        layout.addWidget(card)
        
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)


class BadgesDialog(QDialog):
    """徽章系统对话框 - Fluent风格"""
    
    def __init__(self, frog, wallet_address, parent=None):
        super().__init__(parent)
        self.frog = frog
        self.wallet_address = wallet_address
        self.badges = []
        self.filter = 'all'
        self.category_filter = None
        
        self.setWindowTitle('🏆 我的徽章')
        self.setFixedSize(680, 780)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
        self._load_data()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        # 标题
        title = SubtitleLabel('🏆 我的徽章')
        title.setFont(QFont('Segoe UI', 18, QFont.Bold))
        layout.addWidget(title)
        
        # 统计卡片
        stats_card = CardWidget(self)
        stats_layout = QHBoxLayout(stats_card)
        stats_layout.setContentsMargins(16, 12, 16, 12)
        
        self.stats_label = BodyLabel('已解锁: 0 / 0')
        stats_layout.addWidget(self.stats_label)
        
        stats_layout.addStretch()
        
        self.progress_label = CaptionLabel('收集进度: 0%')
        self.progress_label.setStyleSheet('color: #8B949E;')
        stats_layout.addWidget(self.progress_label)
        
        layout.addWidget(stats_card)
        
        # 筛选器
        self.segment = SegmentedWidget(self)
        self.segment.addItem('all', '全部', lambda: self._set_filter('all'))
        self.segment.addItem('unlocked', '已解锁', lambda: self._set_filter('unlocked'))
        self.segment.addItem('locked', '未解锁', lambda: self._set_filter('locked'))
        self.segment.setCurrentItem('all')
        layout.addWidget(self.segment)
        
        # 徽章网格
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        self.grid_widget = QWidget()
        self.grid_layout = QGridLayout(self.grid_widget)
        self.grid_layout.setSpacing(12)
        
        scroll.setWidget(self.grid_widget)
        layout.addWidget(scroll)
        
        # 关闭按钮
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _load_data(self):
        frog_id = self.frog.get('tokenId') or self.frog.get('id')
        print(f"[BadgesDialog] Loading badges for frog_id: {frog_id}")
        self.badges = api_client.get_badges(frog_id)
        print(f"[BadgesDialog] Received badges count: {len(self.badges)}")
        if self.badges:
            print(f"[BadgesDialog] First badge sample: {self.badges[0]}")
        
        for badge in self.badges:
            if not badge.get('unlocked'):
                code = badge.get('code', '')
                if 'TRIP' in code:
                    total_travels = self.frog.get('totalTravels', 0)
                    if 'FIRST' in code:
                        badge['progress'] = min(100, total_travels * 100)
                    elif '5' in badge.get('requirement', ''):
                        badge['progress'] = min(100, total_travels * 20)
                    else:
                        badge['progress'] = min(100, int(total_travels / 15 * 100))
                else:
                    badge['progress'] = 0
        
        self._update_display()
    
    def _set_filter(self, filter_type):
        self.filter = filter_type
        self.category_filter = None
        self._update_display()
    
    def _update_display(self):
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        filtered = self.badges
        
        if self.filter == 'unlocked':
            filtered = [b for b in filtered if b.get('unlocked')]
        elif self.filter == 'locked':
            filtered = [b for b in filtered if not b.get('unlocked')]
        
        if self.category_filter:
            filtered = [b for b in filtered if b.get('category') == self.category_filter]
        
        unlocked_count = len([b for b in self.badges if b.get('unlocked')])
        total = len(self.badges)
        progress_pct = int(unlocked_count / total * 100) if total > 0 else 0
        
        self.stats_label.setText(f'✅ 已解锁: {unlocked_count} / {total}')
        self.progress_label.setText(f'📊 收集进度: {progress_pct}%')
        
        cols = 4
        for i, badge in enumerate(filtered):
            card = BadgeCard(badge)
            card.clicked.connect(self._show_detail)
            self.grid_layout.addWidget(card, i // cols, i % cols)
            card.show()
            print(f"[BadgesDialog] Added card: {badge.get('name')}")
            
        if not filtered:
            empty_label = CaptionLabel('暂无徽章')
            empty_label.setAlignment(Qt.AlignCenter)
            self.grid_layout.addWidget(empty_label, 0, 0, 1, cols)
            
        self.grid_widget.adjustSize()
        self.grid_widget.update()
    
    def _show_detail(self, badge):
        dialog = BadgeDetailDialog(badge, self)
        dialog.exec_()
