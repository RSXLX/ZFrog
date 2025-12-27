# -*- coding: utf-8 -*-
"""
NFT 纪念品画廊 - PyQt-Fluent-Widgets 现代UI
包含：筛选器、排序、赠送功能、增强详情
"""

from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QWidget, QGridLayout, QScrollArea
)
from PyQt5.QtCore import Qt, QSize, pyqtSignal
from PyQt5.QtGui import QFont, QPixmap
from PyQt5.QtNetwork import QNetworkAccessManager, QNetworkRequest, QNetworkReply

from qfluentwidgets import (
    SubtitleLabel, BodyLabel, CaptionLabel,
    PushButton, PrimaryPushButton, TransparentPushButton, CardWidget, 
    FluentIcon, ComboBox, InfoBar, InfoBarPosition
)

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.api_client import api_client


# 稀有度配置
RARITY_CONFIG = {
    'Common': {'bg': '#3D4450', 'accent': '#6B7280', 'name': '普通', 'emoji': '⚪'},
    'Uncommon': {'bg': '#1E3A2F', 'accent': '#10B981', 'name': '罕见', 'emoji': '🟢'},
    'Rare': {'bg': '#1E3A5F', 'accent': '#3B82F6', 'name': '稀有', 'emoji': '🔵'},
    'Epic': {'bg': '#2D1F4E', 'accent': '#A855F7', 'name': '史诗', 'emoji': '🟣'},
    'Legendary': {'bg': '#3D2E1F', 'accent': '#F59E0B', 'name': '传说', 'emoji': '🟡'},
}

CHAIN_NAMES = {
    7001: 'ZetaChain',
    97: 'BSC',
    11155111: 'Ethereum',
    42161: 'Arbitrum',
}


class NFTCard(CardWidget):
    """NFT 卡片组件"""
    
    clicked = pyqtSignal(dict)
    
    def __init__(self, souvenir, parent=None):
        super().__init__(parent)
        self.souvenir = souvenir
        self.network_manager = QNetworkAccessManager(self)
        self.setCursor(Qt.PointingHandCursor)
        
        rarity = souvenir.get('rarity', 'Common')
        config = RARITY_CONFIG.get(rarity, RARITY_CONFIG['Common'])
        
        self.setStyleSheet(f"""
            NFTCard {{
                background: {config['bg']};
                border: 2px solid {config['accent']};
                border-radius: 16px;
            }}
            NFTCard:hover {{
                background: {config['bg']}DD;
            }}
        """)
        
        self.setFixedSize(155, 195)
        
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignCenter)
        layout.setSpacing(6)
        layout.setContentsMargins(10, 12, 10, 12)
        
        self.image_label = BodyLabel('🎁')
        self.image_label.setFont(QFont('Segoe UI Emoji', 36))
        self.image_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.image_label)
        
        name = souvenir.get('name', '纪念品')[:12]
        name_label = CaptionLabel(name)
        name_label.setAlignment(Qt.AlignCenter)
        name_label.setStyleSheet('font-weight: bold;')
        layout.addWidget(name_label)
        
        rarity_label = CaptionLabel(f"{config['emoji']} {config['name']}")
        rarity_label.setStyleSheet(f'color: {config["accent"]};')
        rarity_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(rarity_label)
        
        chain_id = souvenir.get('chainId', 7001)
        chain_name = CHAIN_NAMES.get(chain_id, 'Unknown')
        chain_label = CaptionLabel(f'🔗 {chain_name}')
        chain_label.setStyleSheet('color: #8B949E; font-size: 10px;')
        chain_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(chain_label)
        
        # 优先从 images 数组获取图片
        images = souvenir.get('images', [])
        image_url = None
        if images and isinstance(images, list) and len(images) > 0:
            # 优先找状态为 COMPLETED 的图片
            completed_images = [img for img in images if img.get('status') == 'COMPLETED']
            if completed_images:
                image_url = completed_images[0].get('imageUrl') or completed_images[0].get('gatewayUrl')
            else:
                image_url = images[0].get('imageUrl') or images[0].get('gatewayUrl')
        
        # 降级尝试直接获取字段
        if not image_url:
            image_url = souvenir.get('imageUrl') or souvenir.get('metadataUri')

        if image_url and image_url.startswith('http'):
            self._load_image(image_url)
    
    def _load_image(self, url):
        from PyQt5.QtCore import QUrl
        request = QNetworkRequest(QUrl(url))
        reply = self.network_manager.get(request)
        reply.finished.connect(lambda: self._on_image_loaded(reply))
    
    def _on_image_loaded(self, reply):
        if reply.error() == QNetworkReply.NoError:
            data = reply.readAll()
            pixmap = QPixmap()
            pixmap.loadFromData(data)
            if not pixmap.isNull():
                self.image_label.setPixmap(pixmap.scaled(
                    QSize(70, 70), Qt.KeepAspectRatio, Qt.SmoothTransformation
                ))
    
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.clicked.emit(self.souvenir)
        super().mousePressEvent(event)


class NFTDetailDialog(QDialog):
    """NFT 详情弹窗"""
    
    gift_requested = pyqtSignal(dict)
    
    def __init__(self, souvenir, friends=None, parent=None):
        super().__init__(parent)
        self.souvenir = souvenir
        self.friends = friends or []
        
        self.setWindowTitle('🎁 纪念品详情')
        self.setFixedSize(420, 560)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        rarity = self.souvenir.get('rarity', 'Common')
        config = RARITY_CONFIG.get(rarity, RARITY_CONFIG['Common'])
        
        card = CardWidget(self)
        card_layout = QVBoxLayout(card)
        card_layout.setAlignment(Qt.AlignCenter)
        card_layout.setSpacing(14)
        card_layout.setContentsMargins(20, 20, 20, 20)
        
        self.image_label = BodyLabel('🎁')
        self.image_label.setFont(QFont('Segoe UI Emoji', 48))
        self.image_label.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(self.image_label)
        
        # 尝试加载图片
        images = self.souvenir.get('images', [])
        image_url = None
        if images and isinstance(images, list) and len(images) > 0:
            completed_images = [img for img in images if img.get('status') == 'COMPLETED']
            if completed_images:
                image_url = completed_images[0].get('imageUrl') or completed_images[0].get('gatewayUrl')
            else:
                image_url = images[0].get('imageUrl') or images[0].get('gatewayUrl')
        
        if not image_url:
            image_url = self.souvenir.get('imageUrl') or self.souvenir.get('metadataUri')

        if image_url and image_url.startswith('http'):
            self.network_manager = QNetworkAccessManager(self)
            from PyQt5.QtCore import QUrl
            request = QNetworkRequest(QUrl(image_url))
            reply = self.network_manager.get(request)
            reply.finished.connect(lambda: self._on_image_loaded(reply))
        
        name = self.souvenir.get('name', '纪念品')
        name_label = SubtitleLabel(name)
        name_label.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(name_label)
        
        rarity_label = BodyLabel(f"{config['emoji']} {config['name']}")
        rarity_label.setStyleSheet(f'color: {config["accent"]}; font-size: 14px;')
        rarity_label.setAlignment(Qt.AlignCenter)
        card_layout.addWidget(rarity_label)
        
        info_card = CardWidget()
        info_card.setStyleSheet("CardWidget { background: #161B22; border: 1px solid #30363D; }")
        info_layout = QVBoxLayout(info_card)
        info_layout.setSpacing(8)
        
        token_id = self.souvenir.get('tokenId', 'N/A')
        info_layout.addWidget(CaptionLabel(f'🔢 Token ID: #{token_id}'))
        
        chain_id = self.souvenir.get('chainId', 7001)
        chain_name = CHAIN_NAMES.get(chain_id, 'Unknown')
        info_layout.addWidget(CaptionLabel(f'🔗 来源链: {chain_name}'))
        
        created_at = self.souvenir.get('createdAt', '')
        if created_at:
            info_layout.addWidget(CaptionLabel(f'📅 获取时间: {created_at[:10]}'))
        
        card_layout.addWidget(info_card)
        
        layout.addWidget(card)
        
        if self.friends:
            gift_card = CardWidget(self)
            gift_layout = QVBoxLayout(gift_card)
            gift_layout.setSpacing(10)
            
            gift_layout.addWidget(BodyLabel('🎁 赠送给好友'))
            
            self.friend_combo = ComboBox()
            for friend in self.friends:
                self.friend_combo.addItem(f"🐸 {friend.get('name', '未知')}")
            gift_layout.addWidget(self.friend_combo)
            
            gift_btn = PrimaryPushButton(FluentIcon.SEND, '赠送')
            gift_btn.clicked.connect(self._on_gift)
            gift_layout.addWidget(gift_btn)
            
            layout.addWidget(gift_card)
        
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _on_image_loaded(self, reply):
        from PyQt5.QtGui import QPixmap
        from PyQt5.QtCore import QSize
        from PyQt5.QtNetwork import QNetworkReply

        if reply.error() == QNetworkReply.NoError:
            data = reply.readAll()
            pixmap = QPixmap()
            pixmap.loadFromData(data)
            if not pixmap.isNull():
                self.image_label.setPixmap(pixmap.scaled(
                    QSize(120, 120), Qt.KeepAspectRatio, Qt.SmoothTransformation
                ))

    def _on_gift(self):
        if self.friends and self.friend_combo.currentIndex() >= 0:
            friend = self.friends[self.friend_combo.currentIndex()]
            self.gift_requested.emit({'souvenir': self.souvenir, 'to_friend': friend})
            InfoBar.success(
                title='赠送成功',
                content=f'已将纪念品赠送给 {friend.get("name")}！',
                parent=self,
                position=InfoBarPosition.TOP,
                duration=2000
            )
            self.close()


class NFTGalleryDialog(QDialog):
    """NFT 纪念品画廊"""
    
    def __init__(self, frog, wallet_address, parent=None):
        super().__init__(parent)
        self.frog = frog
        self.wallet_address = wallet_address
        self.souvenirs = []
        self.friends = []
        self.rarity_filter = 'all'
        self.chain_filter = 'all'
        self.sort_by = 'newest'
        
        self.setWindowTitle('🎁 纪念品收藏')
        self.setFixedSize(720, 800)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
        self._load_data()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        # 标题
        title = SubtitleLabel('🎁 纪念品收藏')
        title.setFont(QFont('Segoe UI', 18, QFont.Bold))
        layout.addWidget(title)
        
        # 统计卡片
        stats_card = CardWidget(self)
        stats_layout = QHBoxLayout(stats_card)
        stats_layout.setContentsMargins(16, 12, 16, 12)
        
        self.stats_label = BodyLabel('🎁 收藏: 0 件')
        stats_layout.addWidget(self.stats_label)
        
        stats_layout.addStretch()
        
        self.rarity_stats = CaptionLabel('')
        self.rarity_stats.setStyleSheet('color: #8B949E;')
        stats_layout.addWidget(self.rarity_stats)
        
        layout.addWidget(stats_card)
        
        # 筛选器行
        filter_layout = QHBoxLayout()
        filter_layout.setSpacing(12)
        
        filter_layout.addWidget(CaptionLabel('稀有度:'))
        self.rarity_combo = ComboBox()
        self.rarity_combo.addItems(['全部', '普通', '罕见', '稀有', '史诗', '传说'])
        self.rarity_combo.currentTextChanged.connect(self._on_rarity_filter)
        self.rarity_combo.setFixedWidth(90)
        filter_layout.addWidget(self.rarity_combo)
        
        filter_layout.addWidget(CaptionLabel('来源:'))
        self.chain_combo = ComboBox()
        self.chain_combo.addItems(['全部', 'ZetaChain', 'BSC', 'Ethereum'])
        self.chain_combo.currentTextChanged.connect(self._on_chain_filter)
        self.chain_combo.setFixedWidth(100)
        filter_layout.addWidget(self.chain_combo)
        
        filter_layout.addWidget(CaptionLabel('排序:'))
        self.sort_combo = ComboBox()
        self.sort_combo.addItems(['最新获取', '最早获取', '稀有度高', '稀有度低'])
        self.sort_combo.currentTextChanged.connect(self._on_sort)
        self.sort_combo.setFixedWidth(100)
        filter_layout.addWidget(self.sort_combo)
        
        filter_layout.addStretch()
        layout.addLayout(filter_layout)
        
        # NFT 网格
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        self.grid_widget = QWidget()
        self.grid_layout = QGridLayout(self.grid_widget)
        self.grid_layout.setSpacing(12)
        
        scroll.setWidget(self.grid_widget)
        layout.addWidget(scroll)
        
        # 底部按钮
        btn_layout = QHBoxLayout()
        
        refresh_btn = PushButton(FluentIcon.SYNC, '刷新')
        refresh_btn.clicked.connect(self._load_data)
        btn_layout.addWidget(refresh_btn)
        
        btn_layout.addStretch()
        
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        btn_layout.addWidget(close_btn)
        
        layout.addLayout(btn_layout)
    
    def _load_data(self):
        frog_id = self.frog.get('tokenId') or self.frog.get('id')
        print(f"[NFTGallery] Loading data for frog_id: {frog_id}")
        self.souvenirs = api_client.get_souvenirs(frog_id)
        print(f"[NFTGallery] Souvenirs count: {len(self.souvenirs)}")
        self.friends = api_client.get_friends(frog_id)
        self._update_display()
    
    def _on_rarity_filter(self, text):
        rarity_map = {'全部': 'all', '普通': 'Common', '罕见': 'Uncommon', 
                      '稀有': 'Rare', '史诗': 'Epic', '传说': 'Legendary'}
        self.rarity_filter = rarity_map.get(text, 'all')
        self._update_display()
    
    def _on_chain_filter(self, text):
        chain_map = {'全部': 'all', 'ZetaChain': 7001, 'BSC': 97, 'Ethereum': 11155111}
        self.chain_filter = chain_map.get(text, 'all')
        self._update_display()
    
    def _on_sort(self, text):
        sort_map = {'最新获取': 'newest', '最早获取': 'oldest', 
                    '稀有度高': 'rarity_desc', '稀有度低': 'rarity_asc'}
        self.sort_by = sort_map.get(text, 'newest')
        self._update_display()
    
    def _update_display(self):
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        filtered = self.souvenirs[:]
        
        if self.rarity_filter != 'all':
            filtered = [s for s in filtered if s.get('rarity') == self.rarity_filter]
        
        if self.chain_filter != 'all':
            filtered = [s for s in filtered if s.get('chainId') == self.chain_filter]
        
        rarity_order = {'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Epic': 4, 'Legendary': 5}
        
        if self.sort_by == 'newest':
            filtered.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        elif self.sort_by == 'oldest':
            filtered.sort(key=lambda x: x.get('createdAt', ''))
        elif self.sort_by == 'rarity_desc':
            filtered.sort(key=lambda x: rarity_order.get(x.get('rarity', 'Common'), 1), reverse=True)
        elif self.sort_by == 'rarity_asc':
            filtered.sort(key=lambda x: rarity_order.get(x.get('rarity', 'Common'), 1))
        
        total = len(self.souvenirs)
        filtered_count = len(filtered)
        self.stats_label.setText(f'🎁 收藏: {total} 件' + (f' (显示 {filtered_count})' if filtered_count != total else ''))
        
        rarity_counts = {}
        for s in self.souvenirs:
            r = s.get('rarity', 'Common')
            rarity_counts[r] = rarity_counts.get(r, 0) + 1
        
        rarity_text = ' | '.join([f"{RARITY_CONFIG.get(r, {}).get('emoji', '⚪')}{c}" 
                                   for r, c in rarity_counts.items()])
        self.rarity_stats.setText(rarity_text)
        
        cols = 4
        for i, souvenir in enumerate(filtered):
            card = NFTCard(souvenir)
            card.clicked.connect(self._show_detail)
            self.grid_layout.addWidget(card, i // cols, i % cols)
        
        if not filtered:
            empty_label = CaptionLabel('暂无纪念品')
            empty_label.setAlignment(Qt.AlignCenter)
            self.grid_layout.addWidget(empty_label, 0, 0, 1, cols)
    
    def _show_detail(self, souvenir):
        dialog = NFTDetailDialog(souvenir, self.friends, self)
        dialog.gift_requested.connect(self._on_gift_souvenir)
        dialog.exec_()
    
    def _on_gift_souvenir(self, data):
        souvenir = data.get('souvenir')
        friend = data.get('to_friend')
        try:
            result = api_client.gift_souvenir(souvenir.get('id'), friend.get('id'))
            if result.get('success'):
                self._load_data()
        except Exception as e:
            print(f"Gift failed: {e}")
