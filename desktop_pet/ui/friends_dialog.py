# -*- coding: utf-8 -*-
"""
好友系统对话框 - PyQt-Fluent-Widgets 现代UI
包含：好友名片、互动功能、亲密度显示
"""

from PyQt5.QtWidgets import QDialog, QVBoxLayout, QHBoxLayout, QWidget, QStackedWidget, QGridLayout, QScrollArea
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont

from qfluentwidgets import (
    SubtitleLabel, BodyLabel, CaptionLabel,
    PrimaryPushButton, PushButton, TransparentPushButton,
    CardWidget, ListWidget, LineEdit, Pivot,
    FluentIcon, InfoBar, InfoBarPosition, ProgressBar
)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.api_client import api_client


# 亲密度等级
INTIMACY_LEVELS = {
    0: {'name': '陌生蛙', 'color': '#6B7280', 'emoji': '👋'},
    20: {'name': '普通朋友', 'color': '#10B981', 'emoji': '🐸'},
    50: {'name': '好朋友', 'color': '#3B82F6', 'emoji': '💚'},
    80: {'name': '铁蛙兄弟', 'color': '#8B5CF6', 'emoji': '🤜🤛'},
    100: {'name': '灵魂蛙友', 'color': '#F59E0B', 'emoji': '✨'},
}


def get_intimacy_level(intimacy):
    """获取亲密度等级信息"""
    result = INTIMACY_LEVELS[0]
    for threshold, info in sorted(INTIMACY_LEVELS.items()):
        if intimacy >= threshold:
            result = info
    return result


class FriendCard(CardWidget):
    """好友卡片组件"""
    
    clicked = pyqtSignal(dict)
    
    def __init__(self, friend, parent=None):
        super().__init__(parent)
        self.friend = friend
        self.setCursor(Qt.PointingHandCursor)
        
        status = friend.get('status', 'Idle')
        is_online = friend.get('isOnline', False)
        
        self.setStyleSheet(f"""
            FriendCard {{
                background: {'#1C2526' if is_online else '#161B22'};
                border: 1px solid {'#10B981' if is_online else '#30363D'};
                border-radius: 12px;
            }}
            FriendCard:hover {{
                background: #21262D;
                border: 1px solid #484F58;
            }}
        """)
        
        self.setFixedHeight(80)
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 12, 16, 12)
        layout.setSpacing(12)
        
        # 头像/状态
        status_emoji = {'Idle': '🏠', 'Traveling': '✈️'}.get(status, '❓')
        online_dot = '🟢' if is_online else '⚫'
        avatar = BodyLabel(f'{status_emoji}')
        avatar.setFont(QFont('Segoe UI Emoji', 24))
        layout.addWidget(avatar)
        
        # 信息区
        info_layout = QVBoxLayout()
        info_layout.setSpacing(4)
        
        name_layout = QHBoxLayout()
        name = friend.get('name', '未知')
        name_label = BodyLabel(f'{online_dot} {name}')
        name_label.setStyleSheet('font-weight: bold;')
        name_layout.addWidget(name_label)
        name_layout.addStretch()
        
        level = friend.get('level', 1)
        level_label = CaptionLabel(f'Lv.{level}')
        level_label.setStyleSheet('color: #F59E0B;')
        name_layout.addWidget(level_label)
        
        info_layout.addLayout(name_layout)
        
        intimacy = friend.get('intimacy', 0)
        intimacy_info = get_intimacy_level(intimacy)
        intimacy_label = CaptionLabel(f"{intimacy_info['emoji']} {intimacy_info['name']}")
        intimacy_label.setStyleSheet(f"color: {intimacy_info['color']};")
        info_layout.addWidget(intimacy_label)
        
        layout.addLayout(info_layout, 1)
        
        travels = friend.get('totalTravels', 0)
        travels_label = CaptionLabel(f'🧳 {travels}')
        travels_label.setStyleSheet('color: #8B949E;')
        layout.addWidget(travels_label)
    
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.clicked.emit(self.friend)
        super().mousePressEvent(event)


class FriendProfileDialog(QDialog):
    """好友名片弹窗"""
    
    interaction_sent = pyqtSignal(str, dict)
    
    def __init__(self, friend, parent=None):
        super().__init__(parent)
        self.friend = friend
        
        name = friend.get('name', '好友')
        self.setWindowTitle(f'🐸 {name} 的名片')
        self.setFixedSize(420, 580)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        # 头像区
        avatar_card = CardWidget(self)
        avatar_layout = QVBoxLayout(avatar_card)
        avatar_layout.setAlignment(Qt.AlignCenter)
        avatar_layout.setSpacing(8)
        
        avatar = BodyLabel('🐸')
        avatar.setFont(QFont('Segoe UI Emoji', 56))
        avatar.setAlignment(Qt.AlignCenter)
        avatar_layout.addWidget(avatar)
        
        name = self.friend.get('name', '未知')
        name_label = SubtitleLabel(name)
        name_label.setAlignment(Qt.AlignCenter)
        avatar_layout.addWidget(name_label)
        
        is_online = self.friend.get('isOnline', False)
        status = '🟢 在线' if is_online else '⚫ 离线'
        status_label = CaptionLabel(status)
        status_label.setAlignment(Qt.AlignCenter)
        avatar_layout.addWidget(status_label)
        
        layout.addWidget(avatar_card)
        
        # 数据卡片
        stats_card = CardWidget(self)
        stats_card.setStyleSheet("CardWidget { background: #161B22; border: 1px solid #30363D; }")
        stats_layout = QGridLayout(stats_card)
        stats_layout.setSpacing(16)
        stats_layout.setContentsMargins(16, 16, 16, 16)
        
        level = self.friend.get('level', 1)
        xp = self.friend.get('xp', 0)
        travels = self.friend.get('totalTravels', 0)
        
        stats = [
            ('⭐ 等级', f'Lv.{level}'),
            ('📊 经验', f'{xp} XP'),
            ('🧳 旅行次数', str(travels)),
        ]
        
        for i, (label, value) in enumerate(stats):
            row, col = divmod(i, 2)
            item_layout = QVBoxLayout()
            item_layout.addWidget(CaptionLabel(label))
            val_label = BodyLabel(value)
            val_label.setStyleSheet('font-weight: bold;')
            item_layout.addWidget(val_label)
            stats_layout.addLayout(item_layout, row, col)
        
        layout.addWidget(stats_card)
        
        # 亲密度
        intimacy_card = CardWidget(self)
        intimacy_layout = QVBoxLayout(intimacy_card)
        intimacy_layout.setSpacing(8)
        
        intimacy = self.friend.get('intimacy', 0)
        intimacy_info = get_intimacy_level(intimacy)
        
        intimacy_header = QHBoxLayout()
        intimacy_header.addWidget(BodyLabel(f"{intimacy_info['emoji']} 亲密度"))
        intimacy_header.addStretch()
        intimacy_header.addWidget(CaptionLabel(f"{intimacy_info['name']} ({intimacy}/100)"))
        intimacy_layout.addLayout(intimacy_header)
        
        progress = ProgressBar(self)
        progress.setMinimum(0)
        progress.setMaximum(100)
        progress.setValue(intimacy)
        progress.setFixedHeight(8)
        intimacy_layout.addWidget(progress)
        
        layout.addWidget(intimacy_card)
        
        # 互动按钮
        action_card = CardWidget(self)
        action_layout = QHBoxLayout(action_card)
        action_layout.setSpacing(8)
        
        actions = [
            ('👋', '打招呼', 'wave'),
            ('🍎', '喂食', 'feed'),
            ('🎁', '送礼', 'gift'),
            ('💬', '留言', 'message'),
        ]
        
        for emoji, text, action_type in actions:
            btn = PushButton(f'{emoji}')
            btn.setToolTip(text)
            btn.setFixedSize(50, 40)
            btn.clicked.connect(lambda checked, t=action_type: self._on_action(t))
            action_layout.addWidget(btn)
        
        layout.addWidget(action_card)
        
        # 拜访按钮
        visit_btn = PrimaryPushButton(FluentIcon.HOME, '🏠 去拜访')
        visit_btn.clicked.connect(lambda: self._on_action('visit'))
        layout.addWidget(visit_btn)
        
        # 关闭按钮
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _on_action(self, action_type):
        action_names = {
            'wave': '打了个招呼',
            'feed': '喂了食物',
            'gift': '送了礼物',
            'message': '留了言',
            'visit': '去拜访',
        }
        
        InfoBar.success(
            title='互动成功',
            content=f"你给 {self.friend.get('name')} {action_names.get(action_type, '互动了')}！",
            parent=self,
            position=InfoBarPosition.TOP,
            duration=2000
        )
        
        self.interaction_sent.emit(action_type, self.friend)
        
        if action_type == 'visit':
            self.close()


class FriendsDialog(QDialog):
    """好友系统对话框 - Fluent风格"""
    
    def __init__(self, frog, parent=None):
        super().__init__(parent)
        self.frog = frog
        self.friends_data = []
        self.requests_data = []
        self.world_data = []
        
        self.setWindowTitle('👥 好友系统')
        self.setFixedSize(580, 700)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
        self._load_data()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        # 标题
        title = SubtitleLabel('👥 好友系统')
        title.setFont(QFont('Segoe UI', 18, QFont.Bold))
        layout.addWidget(title)
        
        # 统计卡片
        stats_card = CardWidget(self)
        stats_layout = QHBoxLayout(stats_card)
        stats_layout.setContentsMargins(16, 10, 16, 10)
        
        self.stats_label = BodyLabel('👥 好友: 0')
        stats_layout.addWidget(self.stats_label)
        
        stats_layout.addStretch()
        
        self.online_label = CaptionLabel('🟢 在线: 0')
        self.online_label.setStyleSheet('color: #10B981;')
        stats_layout.addWidget(self.online_label)
        
        layout.addWidget(stats_card)
        
        # 标签页导航
        self.pivot = Pivot(self)
        self.stacked_widget = QStackedWidget(self)
        
        friends_page = self._create_friends_page()
        self.stacked_widget.addWidget(friends_page)
        self.pivot.addItem('friends', '👥 我的好友', 
            lambda: self.stacked_widget.setCurrentWidget(friends_page))
        
        requests_page = self._create_requests_page()
        self.stacked_widget.addWidget(requests_page)
        self.pivot.addItem('requests', '📩 请求', 
            lambda: self.stacked_widget.setCurrentWidget(requests_page))
        
        world_page = self._create_world_page()
        self.stacked_widget.addWidget(world_page)
        self.pivot.addItem('world', '🌍 探索', 
            lambda: self.stacked_widget.setCurrentWidget(world_page))
        
        self.pivot.setCurrentItem('friends')
        
        layout.addWidget(self.pivot)
        layout.addWidget(self.stacked_widget)
        
        # 关闭按钮
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _create_friends_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(8)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        scroll_widget = QWidget()
        self.friends_container = QVBoxLayout(scroll_widget)
        self.friends_container.setSpacing(8)
        
        scroll.setWidget(scroll_widget)
        layout.addWidget(scroll)
        
        refresh_btn = PushButton(FluentIcon.SYNC, '刷新')
        refresh_btn.clicked.connect(self._load_friends)
        layout.addWidget(refresh_btn)
        
        return page
    
    def _create_requests_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(12)
        
        self.requests_list = ListWidget()
        layout.addWidget(self.requests_list)
        
        btn_layout = QHBoxLayout()
        accept_btn = PrimaryPushButton(FluentIcon.ACCEPT, '接受')
        accept_btn.clicked.connect(self._accept_request)
        btn_layout.addWidget(accept_btn)
        
        refresh_btn = PushButton(FluentIcon.SYNC, '刷新')
        refresh_btn.clicked.connect(self._load_requests)
        btn_layout.addWidget(refresh_btn)
        
        layout.addLayout(btn_layout)
        return page
    
    def _create_world_page(self):
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setSpacing(12)
        
        self.world_list = ListWidget()
        layout.addWidget(self.world_list)
        
        btn_layout = QHBoxLayout()
        add_btn = PrimaryPushButton(FluentIcon.ADD, '添加好友')
        add_btn.clicked.connect(self._add_friend_from_world)
        btn_layout.addWidget(add_btn)
        
        refresh_btn = PushButton(FluentIcon.SYNC, '刷新')
        refresh_btn.clicked.connect(self._load_world)
        btn_layout.addWidget(refresh_btn)
        
        layout.addLayout(btn_layout)
        return page
    
    def _load_data(self):
        self._load_friends()
        self._load_requests()
        self._load_world()
    
    def _load_friends(self):
        while self.friends_container.count():
            item = self.friends_container.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        frog_id = self.frog.get('tokenId') or self.frog.get('id')
        self.friends_data = api_client.get_friends(frog_id)
        
        total = len(self.friends_data)
        online = len([f for f in self.friends_data if f.get('isOnline')])
        self.stats_label.setText(f'👥 好友: {total}')
        self.online_label.setText(f'🟢 在线: {online}')
        
        for friend in self.friends_data:
            card = FriendCard(friend)
            card.clicked.connect(self._show_profile)
            self.friends_container.addWidget(card)
        
        if not self.friends_data:
            empty_label = CaptionLabel('暂无好友')
            empty_label.setAlignment(Qt.AlignCenter)
            self.friends_container.addWidget(empty_label)
    
    def _load_requests(self):
        self.requests_list.clear()
        frog_id = self.frog.get('tokenId') or self.frog.get('id')
        self.requests_data = api_client.get_friend_requests(frog_id)
        
        for req in self.requests_data:
            from_name = req.get('fromFrogName', '未知')
            self.requests_list.addItem(f'📩 来自 {from_name} 的请求')
        
        if not self.requests_data:
            self.requests_list.addItem('暂无请求')
    
    def _load_world(self):
        self.world_list.clear()
        my_frog_id = self.frog.get('id')
        self.world_data = api_client.get_world_online(my_frog_id)
        for frog in self.world_data:
            if frog.get('id') != my_frog_id:
                name = frog.get('name', '未知')
                level = frog.get('level', 1)
                self.world_list.addItem(f'🐸 {name} (Lv.{level})')
        
        if self.world_list.count() == 0:
            self.world_list.addItem('暂无其他青蛙在线')
    
    def _show_profile(self, friend):
        dialog = FriendProfileDialog(friend, self)
        dialog.interaction_sent.connect(self._on_interaction)
        dialog.exec_()
    
    def _on_interaction(self, action_type, friend):
        try:
            frog_id = self.frog.get('tokenId') or self.frog.get('id')
            friend_id = friend.get('id')
            api_client.send_interaction(frog_id, friend_id, action_type)
        except Exception as e:
            print(f"Interaction failed: {e}")
    
    def _accept_request(self):
        current_row = self.requests_list.currentRow()
        if current_row < 0 or current_row >= len(self.requests_data):
            InfoBar.warning('提示', '请先选择一个请求', parent=self, 
                          position=InfoBarPosition.TOP, duration=2000)
            return
        
        request = self.requests_data[current_row]
        InfoBar.success('成功', '已接受好友请求', parent=self, 
                       position=InfoBarPosition.TOP, duration=2000)
        self._load_requests()
        self._load_friends()
    
    def _add_friend_from_world(self):
        current_row = self.world_list.currentRow()
        if current_row < 0:
            InfoBar.warning('提示', '请先选择一只青蛙', parent=self, 
                          position=InfoBarPosition.TOP, duration=2000)
            return
        
        InfoBar.success('成功', '已发送好友请求', parent=self, 
                       position=InfoBarPosition.TOP, duration=2000)
