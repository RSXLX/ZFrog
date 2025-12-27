# -*- coding: utf-8 -*-
"""
ZetaFrog 全局主题配置
使用 PyQt-Fluent-Widgets 的 Fluent Design 风格
"""

from qfluentwidgets import (
    setTheme, Theme, setThemeColor,
    FluentStyleSheet
)
from PyQt5.QtGui import QFont, QFontDatabase
from PyQt5.QtWidgets import QApplication
from PyQt5.QtCore import Qt


# 主题颜色
THEME_COLOR = '#10B981'  # ZetaFrog 绿色


def setup_fluent_theme():
    """
    配置全局 Fluent 暗色主题
    在应用启动时调用此函数（QApplication创建之后）
    """
    # 设置暗色主题
    setTheme(Theme.DARK)
    
    # 设置主题色（绿色）
    setThemeColor(THEME_COLOR)
    
    # 设置高质量字体
    _setup_fonts()


def _setup_fonts():
    """设置高质量字体"""
    app = QApplication.instance()
    if app:
        # 优先使用 Segoe UI，其次是微软雅黑
        font = QFont('Segoe UI', 10)
        font.setHintingPreference(QFont.PreferFullHinting)
        font.setStyleStrategy(QFont.PreferAntialias)
        app.setFont(font)


def get_accent_colors():
    """获取强调色配置"""
    return {
        'primary': '#10B981',      # 主绿色
        'primary_light': '#34D399',
        'primary_dark': '#059669',
        'blue': '#58A6FF',
        'purple': '#A371F7',
        'yellow': '#F0B429',
        'pink': '#DB61A2',
        'red': '#F85149',
    }
