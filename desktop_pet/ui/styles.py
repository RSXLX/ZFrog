# -*- coding: utf-8 -*-
"""
ZetaFrog Desktop Pet - Web3 现代风格样式系统
简约、现代、具有科技感的UI样式
"""

# ===== 颜色系统 =====
class Colors:
    """Web3 主题色彩"""
    # 主色调 - 渐变绿色系
    PRIMARY = "#10B981"       # 主绿色
    PRIMARY_DARK = "#059669"  # 深绿
    PRIMARY_LIGHT = "#34D399" # 浅绿
    
    # 背景色 - 深色玻璃质感
    BG_DARK = "#0D1117"       # 最深背景
    BG_CARD = "#161B22"       # 卡片背景
    BG_HOVER = "#21262D"      # 悬停背景
    BG_ELEVATED = "#1C2128"   # 浮层背景
    
    # 边框与分割线
    BORDER = "rgba(48, 54, 61, 0.8)"
    BORDER_LIGHT = "rgba(99, 110, 123, 0.4)"
    
    # 文字色
    TEXT_PRIMARY = "#E6EDF3"   # 主文字
    TEXT_SECONDARY = "#8B949E" # 次要文字
    TEXT_MUTED = "#6E7681"     # 弱化文字
    
    # 强调色
    ACCENT_BLUE = "#58A6FF"    # 蓝色强调
    ACCENT_PURPLE = "#A371F7"  # 紫色强调
    ACCENT_YELLOW = "#F0B429"  # 黄色强调
    ACCENT_RED = "#F85149"     # 红色/警告
    ACCENT_PINK = "#DB61A2"    # 粉色
    
    # 状态色
    SUCCESS = "#3FB950"
    WARNING = "#D29922"
    ERROR = "#F85149"
    INFO = "#58A6FF"


# ===== 对话框基础样式 =====
DIALOG_BASE_STYLE = """
QDialog {
    background-color: #0D1117;
    color: #E6EDF3;
    border: 1px solid rgba(48, 54, 61, 0.8);
    border-radius: 16px;
}
QLabel {
    color: #E6EDF3;
    background: transparent;
}
"""

# ===== 现代按钮样式 =====
BUTTON_PRIMARY_STYLE = """
QPushButton {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #10B981, stop:1 #059669);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 14px 24px;
    font-weight: 600;
    font-size: 14px;
    min-height: 20px;
}
QPushButton:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #34D399, stop:1 #10B981);
}
QPushButton:pressed {
    background: #059669;
}
QPushButton:disabled {
    background: #21262D;
    color: #6E7681;
}
"""

BUTTON_SECONDARY_STYLE = """
QPushButton {
    background: transparent;
    color: #E6EDF3;
    border: 1px solid rgba(48, 54, 61, 0.8);
    border-radius: 12px;
    padding: 14px 24px;
    font-weight: 500;
    font-size: 14px;
    min-height: 20px;
}
QPushButton:hover {
    background: #21262D;
    border-color: #30363D;
}
QPushButton:pressed {
    background: #1C2128;
}
"""

BUTTON_ACCENT_STYLE = """
QPushButton {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #58A6FF, stop:1 #A371F7);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 14px 24px;
    font-weight: 600;
    font-size: 14px;
    min-height: 20px;
}
QPushButton:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 #79B8FF, stop:1 #B392F0);
}
QPushButton:pressed {
    background: #A371F7;
}
"""

# ===== 玻璃质感卡片样式 =====
CARD_STYLE = """
QFrame#glassCard {
    background: rgba(22, 27, 34, 0.95);
    border: 1px solid rgba(48, 54, 61, 0.6);
    border-radius: 16px;
}
"""

# ===== 输入框样式 =====
INPUT_STYLE = """
QLineEdit, QTextEdit, QSpinBox, QComboBox {
    background: #161B22;
    border: 1px solid rgba(48, 54, 61, 0.8);
    border-radius: 10px;
    padding: 12px 16px;
    color: #E6EDF3;
    font-size: 14px;
    selection-background-color: #10B981;
}
QLineEdit:focus, QTextEdit:focus, QSpinBox:focus, QComboBox:focus {
    border: 1px solid #10B981;
    background: #1C2128;
}
QLineEdit:hover, QTextEdit:hover, QSpinBox:hover, QComboBox:hover {
    border-color: #30363D;
}
QComboBox::drop-down {
    border: none;
    padding-right: 10px;
}
QComboBox::down-arrow {
    width: 12px;
    height: 12px;
}
QComboBox QAbstractItemView {
    background: #161B22;
    border: 1px solid rgba(48, 54, 61, 0.8);
    border-radius: 8px;
    selection-background-color: #21262D;
    color: #E6EDF3;
    padding: 4px;
}
"""

# ===== 标签页样式 =====
TAB_STYLE = """
QTabWidget::pane {
    background: #161B22;
    border: 1px solid rgba(48, 54, 61, 0.6);
    border-radius: 12px;
    margin-top: -1px;
}
QTabBar::tab {
    background: transparent;
    color: #8B949E;
    padding: 12px 20px;
    margin-right: 4px;
    border-bottom: 2px solid transparent;
    font-weight: 500;
}
QTabBar::tab:hover {
    color: #E6EDF3;
    background: rgba(33, 38, 45, 0.5);
}
QTabBar::tab:selected {
    color: #10B981;
    border-bottom: 2px solid #10B981;
}
"""

# ===== 列表样式 =====
LIST_STYLE = """
QListWidget {
    background: #161B22;
    border: 1px solid rgba(48, 54, 61, 0.6);
    border-radius: 12px;
    padding: 8px;
    color: #E6EDF3;
    outline: none;
}
QListWidget::item {
    padding: 12px 16px;
    border-radius: 8px;
    margin: 2px 0;
}
QListWidget::item:hover {
    background: #21262D;
}
QListWidget::item:selected {
    background: rgba(16, 185, 129, 0.15);
    color: #10B981;
}
"""

# ===== 分组框样式 =====
GROUP_BOX_STYLE = """
QGroupBox {
    background: rgba(22, 27, 34, 0.6);
    border: 1px solid rgba(48, 54, 61, 0.5);
    border-radius: 12px;
    margin-top: 16px;
    padding: 20px 16px 16px 16px;
    font-weight: 600;
    color: #E6EDF3;
}
QGroupBox::title {
    subcontrol-origin: margin;
    subcontrol-position: top left;
    left: 16px;
    padding: 0 8px;
    background: #0D1117;
    color: #10B981;
}
"""

# ===== 滚动条样式 =====
SCROLLBAR_STYLE = """
QScrollBar:vertical {
    background: transparent;
    width: 8px;
    margin: 0;
}
QScrollBar::handle:vertical {
    background: rgba(99, 110, 123, 0.4);
    border-radius: 4px;
    min-height: 30px;
}
QScrollBar::handle:vertical:hover {
    background: rgba(99, 110, 123, 0.6);
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0;
}
QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {
    background: transparent;
}
"""

# ===== 进度条样式 =====
PROGRESS_STYLE = """
QProgressBar {
    background: #21262D;
    border: none;
    border-radius: 6px;
    height: 8px;
    text-align: center;
}
QProgressBar::chunk {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
        stop:0 #10B981, stop:1 #34D399);
    border-radius: 6px;
}
"""


def get_full_dialog_style():
    """获取完整对话框样式"""
    return "\n".join([
        DIALOG_BASE_STYLE,
        BUTTON_PRIMARY_STYLE,
        INPUT_STYLE,
        TAB_STYLE,
        LIST_STYLE,
        GROUP_BOX_STYLE,
        SCROLLBAR_STYLE,
        PROGRESS_STYLE,
    ])


def get_button_style(style_type='primary', color=None):
    """
    获取按钮样式
    style_type: 'primary', 'secondary', 'accent', 'custom'
    color: 自定义颜色 (用于 style_type='custom')
    """
    if style_type == 'primary':
        return BUTTON_PRIMARY_STYLE
    elif style_type == 'secondary':
        return BUTTON_SECONDARY_STYLE
    elif style_type == 'accent':
        return BUTTON_ACCENT_STYLE
    elif style_type == 'custom' and color:
        return f"""
QPushButton {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {color}, stop:1 {_darken_hex(color)});
    color: white;
    border: none;
    border-radius: 12px;
    padding: 14px 24px;
    font-weight: 600;
    font-size: 14px;
    min-height: 20px;
}}
QPushButton:hover {{
    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
        stop:0 {_lighten_hex(color)}, stop:1 {color});
}}
QPushButton:pressed {{
    background: {_darken_hex(color)};
}}
"""
    return BUTTON_PRIMARY_STYLE


def _darken_hex(hex_color, factor=0.8):
    """使十六进制颜色变深"""
    hex_color = hex_color.lstrip('#')
    r = int(int(hex_color[0:2], 16) * factor)
    g = int(int(hex_color[2:4], 16) * factor)
    b = int(int(hex_color[4:6], 16) * factor)
    return f"#{r:02x}{g:02x}{b:02x}"


def _lighten_hex(hex_color, factor=1.2):
    """使十六进制颜色变浅"""
    hex_color = hex_color.lstrip('#')
    r = min(255, int(int(hex_color[0:2], 16) * factor))
    g = min(255, int(int(hex_color[2:4], 16) * factor))
    b = min(255, int(int(hex_color[4:6], 16) * factor))
    return f"#{r:02x}{g:02x}{b:02x}"


# ===== 预设功能按钮颜色 =====
class ButtonColors:
    """功能按钮颜色"""
    TRAVEL = "#10B981"     # 旅行 - 绿色
    FRIENDS = "#A371F7"    # 好友 - 紫色
    BADGES = "#F0B429"     # 徽章 - 金色
    NFT = "#DB61A2"        # NFT - 粉色
    REFRESH = "#58A6FF"    # 刷新 - 蓝色
    CLOSE = "#6E7681"      # 关闭 - 灰色
    DANGER = "#F85149"     # 危险 - 红色
