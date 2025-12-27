# -*- coding: utf-8 -*-
"""
纪念品合成系统 - PyQt-Fluent-Widgets 现代UI
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
import random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.api_client import api_client


RARITY_CONFIG = {
    'Common': {'bg': '#3D4450', 'accent': '#6B7280', 'name': '普通', 'emoji': '⚪', 'order': 1},
    'Uncommon': {'bg': '#1E3A2F', 'accent': '#10B981', 'name': '罕见', 'emoji': '🟢', 'order': 2},
    'Rare': {'bg': '#1E3A5F', 'accent': '#3B82F6', 'name': '稀有', 'emoji': '🔵', 'order': 3},
    'Epic': {'bg': '#2D1F4E', 'accent': '#A855F7', 'name': '史诗', 'emoji': '🟣', 'order': 4},
    'Legendary': {'bg': '#3D2E1F', 'accent': '#F59E0B', 'name': '传说', 'emoji': '🟡', 'order': 5},
}

SYNTHESIS_RULES = {
    'Common': {'result': 'Uncommon', 'success_rate': 90, 'count': 3},
    'Uncommon': {'result': 'Rare', 'success_rate': 75, 'count': 3},
    'Rare': {'result': 'Epic', 'success_rate': 50, 'count': 3},
    'Epic': {'result': 'Legendary', 'success_rate': 25, 'count': 3},
}


class SouvenirSlot(CardWidget):
    clicked = pyqtSignal(int)
    
    def __init__(self, index, parent=None):
        super().__init__(parent)
        self.index = index
        self.souvenir = None
        self.setCursor(Qt.PointingHandCursor)
        self._setup_ui()
        self._update_display()
    
    def _setup_ui(self):
        self.setFixedSize(100, 120)
        self.setStyleSheet("SouvenirSlot { background: #21262D; border: 2px dashed #30363D; border-radius: 12px; }")
        
        layout = QVBoxLayout(self)
        layout.setAlignment(Qt.AlignCenter)
        layout.setSpacing(6)
        
        self.icon_label = BodyLabel('➕')
        self.icon_label.setFont(QFont('Segoe UI Emoji', 28))
        self.icon_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.icon_label)
        
        self.name_label = CaptionLabel('点击添加')
        self.name_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.name_label)
    
    def set_souvenir(self, souvenir):
        self.souvenir = souvenir
        self._update_display()
    
    def clear(self):
        self.souvenir = None
        self._update_display()
    
    def _update_display(self):
        if self.souvenir:
            rarity = self.souvenir.get('rarity', 'Common')
            config = RARITY_CONFIG.get(rarity, RARITY_CONFIG['Common'])
            self.icon_label.setText('🎁')
            name = self.souvenir.get('name', '纪念品')[:6]
            self.name_label.setText(name)
            self.name_label.setStyleSheet(f"color: {config['accent']};")
            self.setStyleSheet(f"SouvenirSlot {{ background: {config['bg']}; border: 2px solid {config['accent']}; border-radius: 12px; }}")
        else:
            self.icon_label.setText('➕')
            self.name_label.setText('点击添加')
            self.name_label.setStyleSheet('color: #6B7280;')
            self.setStyleSheet("SouvenirSlot { background: #21262D; border: 2px dashed #30363D; border-radius: 12px; }")
    
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.clicked.emit(self.index)
        super().mousePressEvent(event)


class SouvenirSelectDialog(QDialog):
    selected = pyqtSignal(dict)
    
    def __init__(self, souvenirs, exclude_ids=None, rarity_filter=None, parent=None):
        super().__init__(parent)
        self.souvenirs = souvenirs
        self.exclude_ids = exclude_ids or []
        self.rarity_filter = rarity_filter
        
        self.setWindowTitle('🎁 选择纪念品')
        self.setFixedSize(500, 500)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        title = SubtitleLabel('🎁 选择纪念品')
        layout.addWidget(title)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")
        
        grid_widget = QWidget()
        grid_layout = QGridLayout(grid_widget)
        grid_layout.setSpacing(10)
        
        available = [s for s in self.souvenirs if s.get('id') not in self.exclude_ids]
        if self.rarity_filter:
            available = [s for s in available if s.get('rarity') == self.rarity_filter]
        
        cols = 4
        for i, souvenir in enumerate(available):
            card = self._create_souvenir_card(souvenir)
            grid_layout.addWidget(card, i // cols, i % cols)
        
        if not available:
            empty = CaptionLabel('没有可用的纪念品')
            empty.setAlignment(Qt.AlignCenter)
            grid_layout.addWidget(empty, 0, 0, 1, cols)
        
        scroll.setWidget(grid_widget)
        layout.addWidget(scroll)
        
        close_btn = TransparentPushButton('取消')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _create_souvenir_card(self, souvenir):
        rarity = souvenir.get('rarity', 'Common')
        config = RARITY_CONFIG.get(rarity, RARITY_CONFIG['Common'])
        
        card = CardWidget()
        card.setFixedSize(100, 100)
        card.setCursor(Qt.PointingHandCursor)
        card.setStyleSheet(f"CardWidget {{ background: {config['bg']}; border: 1px solid {config['accent']}; border-radius: 10px; }}")
        
        layout = QVBoxLayout(card)
        layout.setAlignment(Qt.AlignCenter)
        
        icon = BodyLabel('🎁')
        icon.setFont(QFont('Segoe UI Emoji', 20))
        icon.setAlignment(Qt.AlignCenter)
        layout.addWidget(icon)
        
        name = CaptionLabel(souvenir.get('name', '纪念品')[:6])
        name.setAlignment(Qt.AlignCenter)
        layout.addWidget(name)
        
        card.mousePressEvent = lambda e, s=souvenir: self._on_select(s)
        return card
    
    def _on_select(self, souvenir):
        self.selected.emit(souvenir)
        self.close()


class SynthesisDialog(QDialog):
    def __init__(self, frog, parent=None):
        super().__init__(parent)
        self.frog = frog
        self.souvenirs = []
        self.slots = []
        self.current_rarity = None
        
        self.setWindowTitle('🔮 纪念品合成')
        self.setFixedSize(520, 620)
        self.setStyleSheet("QDialog { background-color: #202020; }")
        
        self._setup_content()
        self._load_data()
    
    def _setup_content(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 24)
        
        title = SubtitleLabel('🔮 纪念品合成')
        title.setFont(QFont('Segoe UI', 18, QFont.Bold))
        layout.addWidget(title)
        
        # 说明
        info_card = CardWidget(self)
        info_layout = QVBoxLayout(info_card)
        info_layout.addWidget(BodyLabel('✨ 合成规则'))
        info_layout.addWidget(CaptionLabel('• 3 个同稀有度纪念品 → 1 个更高稀有度'))
        info_layout.addWidget(CaptionLabel('• 普通→罕见: 90% | 罕见→稀有: 75%'))
        info_layout.addWidget(CaptionLabel('• 稀有→史诗: 50% | 史诗→传说: 25%'))
        layout.addWidget(info_card)
        
        # 合成槽位
        slots_card = CardWidget(self)
        slots_layout = QVBoxLayout(slots_card)
        slots_layout.addWidget(SubtitleLabel('📦 材料槽位'))
        
        slots_row = QHBoxLayout()
        slots_row.setAlignment(Qt.AlignCenter)
        
        for i in range(3):
            slot = SouvenirSlot(i)
            slot.clicked.connect(self._on_slot_clicked)
            self.slots.append(slot)
            slots_row.addWidget(slot)
        
        slots_layout.addLayout(slots_row)
        
        clear_btn = PushButton(FluentIcon.DELETE, '清空材料')
        clear_btn.clicked.connect(self._clear_slots)
        slots_layout.addWidget(clear_btn)
        layout.addWidget(slots_card)
        
        # 结果预览
        result_card = CardWidget(self)
        result_layout = QVBoxLayout(result_card)
        result_header = QHBoxLayout()
        result_header.addWidget(SubtitleLabel('🎯 合成预览'))
        result_header.addStretch()
        self.success_label = CaptionLabel('')
        result_header.addWidget(self.success_label)
        result_layout.addLayout(result_header)
        
        self.result_preview = BodyLabel('选择 3 个同稀有度纪念品')
        self.result_preview.setAlignment(Qt.AlignCenter)
        result_layout.addWidget(self.result_preview)
        layout.addWidget(result_card)
        
        self.synth_btn = PrimaryPushButton(FluentIcon.SYNC, '🔮 开始合成')
        self.synth_btn.clicked.connect(self._do_synthesis)
        self.synth_btn.setEnabled(False)
        layout.addWidget(self.synth_btn)
        
        close_btn = TransparentPushButton('关闭')
        close_btn.clicked.connect(self.close)
        layout.addWidget(close_btn)
    
    def _load_data(self):
        frog_id = self.frog.get('tokenId') or self.frog.get('id')
        self.souvenirs = api_client.get_souvenirs(frog_id)
    
    def _on_slot_clicked(self, index):
        if self.slots[index].souvenir:
            self.slots[index].clear()
            self._update_preview()
            return
        
        exclude_ids = [s.souvenir.get('id') for s in self.slots if s.souvenir]
        rarity_filter = None
        for slot in self.slots:
            if slot.souvenir:
                rarity_filter = slot.souvenir.get('rarity')
                break
        
        dialog = SouvenirSelectDialog(self.souvenirs, exclude_ids, rarity_filter, self)
        dialog.selected.connect(lambda s: self._on_souvenir_selected(index, s))
        dialog.exec_()
    
    def _on_souvenir_selected(self, index, souvenir):
        self.slots[index].set_souvenir(souvenir)
        self._update_preview()
    
    def _clear_slots(self):
        for slot in self.slots:
            slot.clear()
        self._update_preview()
    
    def _update_preview(self):
        filled_slots = [s for s in self.slots if s.souvenir]
        
        if len(filled_slots) == 0:
            self.result_preview.setText('选择 3 个同稀有度纪念品')
            self.success_label.setText('')
            self.synth_btn.setEnabled(False)
            self.current_rarity = None
            return
        
        rarity = filled_slots[0].souvenir.get('rarity', 'Common')
        self.current_rarity = rarity
        config = RARITY_CONFIG.get(rarity, RARITY_CONFIG['Common'])
        
        if len(filled_slots) < 3:
            remaining = 3 - len(filled_slots)
            self.result_preview.setText(f"还需要 {remaining} 个 {config['emoji']} {config['name']} 纪念品")
            self.success_label.setText('')
            self.synth_btn.setEnabled(False)
            return
        
        rule = SYNTHESIS_RULES.get(rarity)
        if not rule:
            self.result_preview.setText('🟡 传说纪念品无法继续合成')
            self.synth_btn.setEnabled(False)
            return
        
        result_config = RARITY_CONFIG.get(rule['result'])
        self.result_preview.setText(f"3x {config['emoji']} {config['name']} → 1x {result_config['emoji']} {result_config['name']}")
        self.success_label.setText(f"成功率: {rule['success_rate']}%")
        self.synth_btn.setEnabled(True)
    
    def _do_synthesis(self):
        if not self.current_rarity:
            return
        
        rule = SYNTHESIS_RULES.get(self.current_rarity)
        if not rule:
            return
        
        success = random.randint(1, 100) <= rule['success_rate']
        
        if success:
            result_config = RARITY_CONFIG.get(rule['result'])
            InfoBar.success('成功', f"获得 1 个 {result_config['emoji']} {result_config['name']} 纪念品！",
                           parent=self, position=InfoBarPosition.TOP, duration=3000)
        else:
            InfoBar.warning('失败', '材料消耗，返还 1 个原材料',
                           parent=self, position=InfoBarPosition.TOP, duration=3000)
        
        self._clear_slots()
        self._load_data()
