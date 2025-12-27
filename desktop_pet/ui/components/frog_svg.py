# -*- coding: utf-8 -*-
"""
FrogSvg 组件 - 直接使用 QSvgRenderer 渲染原始 Frog.svg
"""

from PyQt5.QtWidgets import QWidget
from PyQt5.QtCore import Qt, QTimer, QRectF, QByteArray
from PyQt5.QtGui import QPainter, QColor, QTransform
from PyQt5.QtSvg import QSvgRenderer
import os
import sys
import math

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import FrogState, STATE_COLORS


class FrogSvgWidget(QWidget):
    """
    青蛙 SVG 渲染组件
    直接使用 QSvgRenderer 渲染原始 SVG 文件
    """
    
    def __init__(self, parent=None, size=200):
        super().__init__(parent)
        self._size = size
        self.setFixedSize(size, size)
        self.setAttribute(Qt.WA_TranslucentBackground)
        
        self._state = FrogState.IDLE
        self._direction = 'right'
        self._show_backpack = False
        self._show_souvenir = False
        self._souvenir_emoji = '🎁'
        
        # 动画参数
        self._breath_phase = 0.0
        self._scale_y = 1.0
        self._offset_y = 0.0
        
        # 加载原始 SVG
        svg_path = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'frog.svg')
        self._svg_content = None
        self._svg_renderer = None
        
        if os.path.exists(svg_path):
            with open(svg_path, 'r', encoding='utf-8') as f:
                self._svg_content = f.read()
            self._update_svg_renderer()
        
        # 呼吸动画定时器
        self._breath_timer = QTimer(self)
        self._breath_timer.timeout.connect(self._update_breath)
        self._breath_timer.start(50)  # 20 FPS
    
    def _update_svg_renderer(self):
        """根据当前状态更新 SVG 渲染器"""
        if not self._svg_content:
            return
        
        # 获取状态颜色
        colors = STATE_COLORS.get(self._state, STATE_COLORS[FrogState.IDLE])
        body_colors = colors['body']
        cheek_color = colors['cheek']
        
        # 替换 SVG 中的颜色
        svg = self._svg_content
        
        # 替换渐变颜色
        svg = svg.replace('#4ADE80', body_colors[0])
        svg = svg.replace('#FCD34D', body_colors[1])
        svg = svg.replace('#FDBA74', body_colors[2])
        svg = svg.replace('#FDA4AF', cheek_color)
        
        # 创建渲染器
        svg_bytes = QByteArray(svg.encode('utf-8'))
        self._svg_renderer = QSvgRenderer(svg_bytes)
    
    @property
    def state(self):
        return self._state
    
    @state.setter
    def state(self, value):
        if self._state != value:
            self._state = value
            self._update_svg_renderer()
            self.update()
    
    @property
    def direction(self):
        return self._direction
    
    @direction.setter
    def direction(self, value):
        self._direction = value
        self.update()
    
    def set_traveling(self, traveling: bool):
        self._show_backpack = traveling
        self.update()
    
    def set_souvenir(self, show: bool, emoji: str = '🎁'):
        self._show_souvenir = show
        self._souvenir_emoji = emoji
        self.update()
    
    def _update_breath(self):
        """更新呼吸动画"""
        self._breath_phase += 0.05
        # 模拟 CSS: scale(1.03, 0.97) translateY(3px)
        t = math.sin(self._breath_phase)
        self._scale_y = 1.0 - 0.03 * t
        self._offset_y = 3 * t
        self.update()
    
    def paintEvent(self, event):
        if not self._svg_renderer or not self._svg_renderer.isValid():
            return
        
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setRenderHint(QPainter.SmoothPixmapTransform)
        
        # 应用方向翻转
        if self._direction == 'left':
            painter.translate(self._size, 0)
            painter.scale(-1, 1)
        
        # 应用呼吸动画变换（从底部中心）
        center_x = self._size / 2
        bottom_y = self._size
        
        painter.translate(center_x, bottom_y)
        painter.scale(1.0, self._scale_y)
        painter.translate(-center_x, -bottom_y + self._offset_y)
        
        # 渲染 SVG
        self._svg_renderer.render(painter, QRectF(0, 0, self._size, self._size))
        
        # 绘制状态特效
        self._draw_state_effects(painter)
        
        # 绘制配件
        self._draw_accessories(painter)
        
        painter.end()
    
    def _draw_state_effects(self, painter):
        """绘制状态特效"""
        if self._state == FrogState.SLEEPING:
            # ZZZ
            painter.save()
            font = painter.font()
            font.setBold(True)
            font.setPointSize(14)
            painter.setFont(font)
            painter.setPen(QColor('#6366F1'))
            painter.drawText(155, 20, 'Z')
            font.setPointSize(11)
            painter.setFont(font)
            painter.drawText(165, 32, 'z')
            font.setPointSize(9)
            painter.setFont(font)
            painter.drawText(172, 42, 'z')
            painter.restore()
        
        elif self._state == FrogState.RICH:
            # 墨镜
            painter.save()
            painter.setBrush(QColor('#1F2937'))
            painter.setPen(Qt.NoPen)
            painter.drawRoundedRect(36, 33, 48, 24, 5, 5)
            painter.drawRoundedRect(116, 33, 48, 24, 5, 5)
            painter.drawRect(84, 42, 32, 6)
            painter.restore()
        
        elif self._state == FrogState.ANGRY:
            # 怒气符号
            painter.save()
            font = painter.font()
            font.setPointSize(16)
            painter.setFont(font)
            painter.drawText(155, 20, '💢')
            painter.restore()
        
        elif self._state == FrogState.CRYING:
            # 眼泪
            painter.save()
            painter.setBrush(QColor('#60A5FA'))
            painter.setPen(Qt.NoPen)
            # 左眼泪 (眼睛在 60,45)
            painter.drawEllipse(56, 65, 8, 14)
            # 右眼泪 (眼睛在 140,45)
            painter.drawEllipse(136, 65, 8, 14)
            painter.restore()
    
    def _draw_accessories(self, painter):
        """绘制配件"""
        painter.save()
        font = painter.font()
        font.setPointSize(20)
        painter.setFont(font)
        
        if self._show_backpack:
            painter.drawText(160, 100, '🎒')
        
        if self._show_souvenir:
            painter.drawText(15, 80, self._souvenir_emoji)
        
        painter.restore()
