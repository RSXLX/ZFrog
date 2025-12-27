# -*- coding: utf-8 -*-
"""
ZetaFrog Desktop Pet - 主程序入口
"""

import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from PyQt5.QtWidgets import QApplication
from PyQt5.QtCore import Qt

from ui.pet_widget import PetWidget
from ui.theme_config import setup_fluent_theme


def main():
    """主函数"""
    # 高 DPI 支持
    QApplication.setAttribute(Qt.AA_EnableHighDpiScaling, True)
    QApplication.setAttribute(Qt.AA_UseHighDpiPixmaps, True)
    
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)  # 关闭窗口不退出，通过托盘退出
    
    # 初始化 Fluent 暗色主题
    setup_fluent_theme()
    
    # 创建主窗口
    pet = PetWidget()
    pet.show()
    
    # 显示欢迎消息
    pet.tray_icon.showMessage(
        'ZetaFrog 桌面宠物',
        '🐸 欢迎！右键点击青蛙或托盘图标查看菜单',
        pet.tray_icon.Information,
        3000
    )
    
    sys.exit(app.exec_())


if __name__ == '__main__':
    main()
