# -*- coding: utf-8 -*-
from PyQt5.QtWidgets import QWidget, QPushButton, QGraphicsDropShadowEffect
from PyQt5.QtCore import Qt, QPoint, QPropertyAnimation, QEasingCurve, QParallelAnimationGroup, pyqtSignal, QSize, QTimer
from PyQt5.QtGui import QPainter, QColor, QPen, QBrush, QFont, QPainterPath
from qfluentwidgets import FluentIcon as FIF

import math
import random

class Particle:
    """简单的粒子类"""
    def __init__(self, x, y, dx, dy, color, life=255, size=4, shape='circle'):
        self.x = x
        self.y = y
        self.dx = dx
        self.dy = dy
        self.color = color
        self.life = life
        self.max_life = life
        self.size = size
        self.shape = shape # 'circle', 'square', 'heart'
        
    def update(self):
        self.x += self.dx
        self.y += self.dy
        self.life -= 5
        self.size *= 0.95 # 慢慢变小
        
    def draw(self, painter):
        if self.life <= 0: return
        
        painter.save()
        
        # 设置颜色和透明度
        c = QColor(self.color)
        c.setAlpha(min(255, max(0, int(self.life))))
        painter.setBrush(QBrush(c))
        painter.setPen(Qt.NoPen)
        
        if self.shape == 'circle':
            painter.drawEllipse(QPoint(int(self.x), int(self.y)), int(self.size), int(self.size))
        elif self.shape == 'square':
            painter.translate(self.x, self.y)
            painter.rotate(random.randint(0, 360)) # 随机旋转增加动感
            s = int(self.size * 2)
            painter.drawRect(-s//2, -s//2, s, s)
        elif self.shape == 'heart':
            # 简单的爱心绘制
            painter.translate(self.x, self.y)
            path = QPainterPath()
            s = self.size
            path.moveTo(0, s/3)
            path.cubicTo(-s, -s/2, -s/2, -s*1.5, 0, -s/2)
            path.cubicTo(s/2, -s*1.5, s, -s/2, 0, s/3)
            painter.drawPath(path)
            
        painter.restore()

class HaloButton(QPushButton):
    """圆形发光按钮"""
    
    def __init__(self, icon, color, parent=None):
        super().__init__(parent)
        self.setFixedSize(50, 50)
        self.icon_char = icon
        self.base_color = QColor(color)
        self.hover_scale = 1.0
        
        # 阴影效果（发光）
        self.shadow = QGraphicsDropShadowEffect(self)
        self.shadow.setBlurRadius(20)
        self.shadow.setColor(self.base_color)
        self.shadow.setOffset(0, 0)
        self.setGraphicsEffect(self.shadow)
        
    def enterEvent(self, event):
        self.hover_scale = 1.2
        self.update()
        super().enterEvent(event)
        
    def leaveEvent(self, event):
        self.hover_scale = 1.0
        self.update()
        super().leaveEvent(event)
        
    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setRenderHint(QPainter.SmoothPixmapTransform)
        
        # 计算缩放后的尺寸
        center = self.rect().center()
        radius = 20 * self.hover_scale
        
        # 绘制背景
        painter.setPen(Qt.NoPen)
        color = QColor(self.base_color)
        color.setAlpha(200 if self.hover_scale > 1.0 else 180)
        painter.setBrush(color)
        painter.drawEllipse(center, radius, radius)
        
        # 绘制高亮边框
        if self.hover_scale > 1.0:
            pen = QPen(Qt.white)
            pen.setWidth(2)
            painter.setPen(pen)
            painter.setBrush(Qt.NoBrush)
            painter.drawEllipse(center, radius, radius)
            
        # 绘制图标
        if self.icon_char:
             icon_size = int(24 * self.hover_scale)
             # FluentIcon 是 Enum，.icon() 返回 QIcon
             try:
                 ic = self.icon_char.icon()
                 pix = ic.pixmap(icon_size, icon_size)
                 painter.drawPixmap(
                     int(center.x() - icon_size / 2),
                     int(center.y() - icon_size / 2),
                     pix
                 )
             except:
                 pass

class HaloMenu(QWidget):
    """环形菜单容器"""
    
    # ... existing signals ...
    travel_clicked = pyqtSignal()
    bag_clicked = pyqtSignal()
    social_clicked = pyqtSignal()
    badge_clicked = pyqtSignal()
    
    # 动画完成信号，通知 PetWidget 可以打开 Dialog 了
    effect_finished = pyqtSignal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.Tool | Qt.WindowStaysOnTopHint)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setFixedSize(300, 300)  # 足够大的画布
        
        self.center_pos = QPoint(150, 150)
        self.is_expanded = False
        
        # 粒子系统
        self.particles = []
        self.is_playing_effect = False
        
        # 按钮配置
        self.buttons = []
        configs = [
            # (图标, 颜色, 角度, 信号)
            (FIF.AIRPLANE, '#3B82F6', -90, self.travel_clicked),    # 上: 旅行 (Blue)
            (FIF.SHOPPING_CART, '#A855F7', 0, self.bag_clicked),    # 右: 背包 (Purple)
            (FIF.PEOPLE, '#EF4444', 180, self.social_clicked),   # 左: 社交 (Red)
            (FIF.CERTIFICATE, '#F59E0B', 90, self.badge_clicked)      # 下: 徽章 (Orange)
        ]
        
        self.anim_group = QParallelAnimationGroup(self)
        
        for icon, color, angle, signal in configs:
            btn = HaloButton(icon, color, self)
            btn.clicked.connect(signal)
            btn.angle = math.radians(angle)
            btn.target_dist = 110  # 展开半径
            btn.move(125, 125) # 初始在中心附近
            btn.hide()
            
            # 存储额外属性
            btn.base_color_str = color # 存储颜色字符串方便粒子取色
            
            self.buttons.append(btn)

    def set_center(self, global_pos):
        """设置菜单中心点（对应青蛙位置）"""
        # 将全局坐标转换为窗口左上角坐标，使中心对齐
        self.move(global_pos.x() - 150, global_pos.y() - 150)

    def paintEvent(self, event):
        """绘制连线和粒子"""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        
        center = self.rect().center()
        
        # 1. 绘制连线
        if self.is_expanded or self.anim_group.state() == QParallelAnimationGroup.Running:
            for btn in self.buttons:
                if btn.isVisible():
                    btn_center = btn.pos() + QPoint(25, 25)
                    grad = QColor(btn.base_color)
                    grad.setAlpha(100)
                    pen = QPen(grad)
                    pen.setWidth(2)
                    pen.setStyle(Qt.DotLine)
                    painter.setPen(pen)
                    painter.drawLine(center, btn_center)
        
        # 2. 绘制粒子
        if self.particles:
            for p in self.particles:
                p.draw(painter)
                
    def update(self):
        """主循环：更新粒子和动画"""
        # 更新粒子
        if self.particles:
            dead_particles = []
            for p in self.particles:
                p.update()
                if p.life <= 0:
                    dead_particles.append(p)
            
            for dp in dead_particles:
                self.particles.remove(dp)
                
            if not self.particles and self.is_playing_effect:
                self.is_playing_effect = False
                self.effect_finished.emit() # 特效播放完毕
                
            super().update() # 触发重绘
            
        elif self.anim_group.state() == QParallelAnimationGroup.Running:
             super().update()
             
    def play_effect(self, effect_type, color='#FFFFFF'):
        """播放指定特效"""
        self.is_playing_effect = True
        self.particles.clear()
        
        cx, cy = 150, 150  # 中心点
        
        if effect_type == 'PORTAL': # 传送门：螺旋向外
            for i in range(50):
                angle = random.uniform(0, 6.28)
                speed = random.uniform(2, 5)
                # 蓝色系
                c = QColor('#3B82F6') if random.random() > 0.5 else QColor('#60A5FA')
                dx = math.cos(angle) * speed
                dy = math.sin(angle) * speed
                self.particles.append(Particle(cx, cy, dx, dy, c, size=random.randint(3, 6)))
                
        elif effect_type == 'CONFETTI': # 彩纸：四周炸开
            colors = ['#FFD700', '#FF69B4', '#00BFFF', '#32CD32']
            for i in range(60):
                angle = random.uniform(0, 6.28)
                speed = random.uniform(3, 8)
                c = QColor(random.choice(colors))
                dx = math.cos(angle) * speed
                dy = math.sin(angle) * speed
                self.particles.append(Particle(cx, cy, dx, dy, c, shape='square', size=random.randint(4, 8)))
                
        elif effect_type == 'HEARTS': # 爱心：向上飘动
            for i in range(20):
                x = cx + random.uniform(-40, 40)
                y = cy + random.uniform(-10, 30)
                speed = random.uniform(1, 4)
                c = QColor('#EF4444')
                self.particles.append(Particle(x, y, 0, -speed, c, shape='heart', size=random.randint(10, 20)))
        
        elif effect_type == 'GOLD_RAIN': # 金币雨/星光
            for i in range(40):
                angle = random.uniform(0, 6.28)
                dist = random.uniform(30, 80)
                x = cx + math.cos(angle) * dist
                y = cy + math.sin(angle) * dist
                c = QColor('#F59E0B')
                self.particles.append(Particle(x, y, 0, 1, c, size=random.randint(2, 5)))

        # 确保定时器运行
        if hasattr(self, 'update_timer') and not self.update_timer.isActive():
            self.update_timer.start(16)
        elif not hasattr(self, 'update_timer'):
             self.update_timer = QTimer(self)
             self.update_timer.timeout.connect(self.update)
             self.update_timer.start(16)
    
    def expand(self):
        """展开菜单"""
        if self.is_expanded: return
        self.is_expanded = True
        self.show()
        
        self.anim_group.clear()
        
        for btn in self.buttons:
            btn.show()
            # 计算目标位置
            target_x = 125 + math.cos(btn.angle) * btn.target_dist
            target_y = 125 + math.sin(btn.angle) * btn.target_dist
            
            anim = QPropertyAnimation(btn, b"pos")
            anim.setDuration(400)
            anim.setStartValue(QPoint(125, 125))
            anim.setEndValue(QPoint(int(target_x), int(target_y)))
            # 使用 OutBack 模拟弹簧回弹效果
            anim.setEasingCurve(QEasingCurve.OutBack)
            
            self.anim_group.addAnimation(anim)
            
        # 这里的动画只负责移动按钮，PaintEvent 会自动跟随（如果需要高频重绘可能需要 Timer）
        # 为了连线动画流畅，我们添加一个 Timer 触发 update
        self.update_timer = QTimer(self)
        self.update_timer.timeout.connect(self.update)
        self.update_timer.start(16) # 60FPS
        
        self.anim_group.start()
        
    def collapse(self):
        """收起菜单"""
        if not self.is_expanded: return
        self.is_expanded = False
        
        self.anim_group.clear()
        
        for btn in self.buttons:
            anim = QPropertyAnimation(btn, b"pos")
            anim.setDuration(300)
            anim.setStartValue(btn.pos())
            anim.setEndValue(QPoint(125, 125))
            anim.setEasingCurve(QEasingCurve.InBack)
            self.anim_group.addAnimation(anim)
            
        self.anim_group.finished.connect(self._on_collapse_finished)
        self.anim_group.start()
        
    def _on_collapse_finished(self):
        for btn in self.buttons:
            btn.hide()
        if hasattr(self, 'update_timer'):
            self.update_timer.stop()
        self.hide() # 隐藏整个窗口
        self.anim_group.finished.disconnect(self._on_collapse_finished)

