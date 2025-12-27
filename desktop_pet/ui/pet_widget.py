# -*- coding: utf-8 -*-
"""
ZetaFrog Desktop Pet - 主窗口
透明无边框桌面宠物窗口
"""

from PyQt5.QtWidgets import (
    QWidget, QVBoxLayout, QApplication, QMenu, QAction,
    QSystemTrayIcon, QMessageBox, QInputDialog, QLabel
)
from PyQt5.QtCore import Qt, QPoint, QTimer
from PyQt5.QtGui import QIcon, QCursor, QPixmap

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import FrogState, WINDOW_SIZE
from ui.components.frog_svg import FrogSvgWidget


class PetWidget(QWidget):
    """透明无边框的桌面宠物窗口"""
    
    def __init__(self):
        super().__init__()
        
        # 窗口设置
        self.setWindowFlags(
            Qt.FramelessWindowHint |      # 无边框
            Qt.WindowStaysOnTopHint |     # 置顶
            Qt.Tool                       # 不显示在任务栏
        )
        self.setAttribute(Qt.WA_TranslucentBackground)  # 透明背景
        self.setFixedSize(WINDOW_SIZE, WINDOW_SIZE)
        
        # 拖拽相关
        self._dragging = False
        self._drag_position = QPoint()
        
        # 当前用户和青蛙
        self._wallet_address = None
        self._current_frog = None
        self._frogs = []
        
        # 创建 UI
        self._setup_ui()
        self._setup_tray()
        
        # 初始位置：屏幕右下角
        self._move_to_corner()
    
    def _setup_ui(self):
        """设置 UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 青蛙组件
        self.frog_widget = FrogSvgWidget(self, WINDOW_SIZE)
        layout.addWidget(self.frog_widget)

        # 交互升级：Halo Menu (环形菜单)
        # 注意：不设置 parent 以作为独立顶层窗口，但手动管理生命周期
        from ui.components.halo_menu import HaloMenu
        self.halo_menu = HaloMenu()
        
        # 连接信号
        self.halo_menu.travel_clicked.connect(self._on_travel_clicked)
        self.halo_menu.bag_clicked.connect(self._on_bag_clicked)
        self.halo_menu.social_clicked.connect(self._on_social_clicked)
        self.halo_menu.badge_clicked.connect(self._on_badge_clicked)
        
        # 悬停防抖定时器
        self._hover_timer = QTimer(self)
        self._hover_timer.setSingleShot(True)
        self._hover_timer.timeout.connect(self._check_hover_leave)
    
    def _check_hover_leave(self):
        """检查鼠标是否真的离开了热区"""
        # 如果鼠标还在 HaloMenu 的范围内（即使是透明区域，只要是几何范围内）
        # 我们这里依赖 QCursor 全局位置是否在 HaloMenu 的 rect 内
        # 由于 HaloMenu 是 ToolWindow，globalPos 有效
        if self.halo_menu.isVisible() and self.halo_menu.geometry().contains(QCursor.pos()):
            # 鼠标在菜单范围内，继续监测，不收起
            self._hover_timer.start(200)
        else:
            self.halo_menu.collapse()
    
    def _setup_tray(self):
        """设置系统托盘"""
        self.tray_icon = QSystemTrayIcon(self)
        
        # 创建托盘图标
        icon = self._create_frog_icon()
        self.tray_icon.setIcon(icon)
        self.tray_icon.setToolTip('ZetaFrog 桌面宠物')
        
        # 托盘菜单
        tray_menu = QMenu()
        
        # 青蛙信息
        self.frog_info_action = QAction('🐸 未登录', self)
        self.frog_info_action.setEnabled(False)
        tray_menu.addAction(self.frog_info_action)
        
        tray_menu.addSeparator()
        
        # 功能菜单
        login_action = QAction('🔑 登录', self)
        login_action.triggered.connect(self._show_login)
        tray_menu.addAction(login_action)
        
        # 铸造青蛙
        mint_action = QAction('✨ 铸造青蛙', self)
        mint_action.triggered.connect(self._show_mint)
        tray_menu.addAction(mint_action)
        
        # 主面板（双击青蛙也会打开）
        panel_action = QAction('📋 打开面板', self)
        panel_action.triggered.connect(self._show_main_panel)
        tray_menu.addAction(panel_action)
        
        tray_menu.addSeparator()
        
        travel_action = QAction('✈️ 旅行系统', self)
        travel_action.triggered.connect(self._show_travel)
        tray_menu.addAction(travel_action)
        
        friends_action = QAction('👥 好友系统', self)
        friends_action.triggered.connect(self._show_friends)
        tray_menu.addAction(friends_action)
        
        badges_action = QAction('🏆 我的徽章', self)
        badges_action.triggered.connect(self._show_badges)
        tray_menu.addAction(badges_action)
        
        nft_action = QAction('🎁 纪念品收藏', self)
        nft_action.triggered.connect(self._show_nft_gallery)
        tray_menu.addAction(nft_action)
        
        tray_menu.addSeparator()
        
        # P2 功能子菜单
        advanced_menu = tray_menu.addMenu('🔮 进阶功能')
        
        team_travel_action = QAction('👥 组队旅行', self)
        team_travel_action.triggered.connect(self._show_team_travel)
        advanced_menu.addAction(team_travel_action)
        
        synthesis_action = QAction('🔮 纪念品合成', self)
        synthesis_action.triggered.connect(self._show_synthesis)
        advanced_menu.addAction(synthesis_action)
        
        badge_sets_action = QAction('🎖️ 徽章套装', self)
        badge_sets_action.triggered.connect(self._show_badge_sets)
        advanced_menu.addAction(badge_sets_action)
        
        tray_menu.addSeparator()
        
        # 切换青蛙
        self.switch_frog_menu = tray_menu.addMenu('🐸 切换青蛙')
        
        tray_menu.addSeparator()
        
        # 状态测试菜单
        state_menu = tray_menu.addMenu('🎭 测试状态')
        for state in [FrogState.IDLE, FrogState.HAPPY, FrogState.ANGRY, 
                      FrogState.SCARED, FrogState.SLEEPING, FrogState.RICH,
                      FrogState.CRYING, FrogState.EXCITED]:
            action = QAction(state, self)
            action.triggered.connect(lambda checked, s=state: self._set_state(s))
            state_menu.addAction(action)
        
        tray_menu.addSeparator()
        
        # 退出
        quit_action = QAction('❌ 退出', self)
        quit_action.triggered.connect(QApplication.quit)
        tray_menu.addAction(quit_action)
        
        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.activated.connect(self._on_tray_activated)
        self.tray_icon.show()
    
    def _create_frog_icon(self):
        """创建青蛙图标"""
        # 简单的纯色图标
        pixmap = QPixmap(32, 32)
        pixmap.fill(Qt.transparent)
        
        from PyQt5.QtGui import QPainter, QColor, QBrush
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setBrush(QBrush(QColor('#4ADE80')))
        painter.setPen(Qt.NoPen)
        painter.drawEllipse(2, 2, 28, 28)
        
        # 眼睛
        painter.setBrush(QBrush(QColor('white')))
        painter.drawEllipse(6, 8, 8, 8)
        painter.drawEllipse(18, 8, 8, 8)
        
        painter.setBrush(QBrush(QColor('black')))
        painter.drawEllipse(8, 10, 4, 4)
        painter.drawEllipse(20, 10, 4, 4)
        
        painter.end()
        
        return QIcon(pixmap)
    
    def _move_to_corner(self):
        """移动到屏幕右下角"""
        screen = QApplication.primaryScreen().geometry()
        x = screen.width() - self.width() - 50
        y = screen.height() - self.height() - 100
        self.move(x, y)
    
    def _on_tray_activated(self, reason):
        """托盘图标被点击"""
        if reason == QSystemTrayIcon.Trigger:
            if self.isVisible():
                self.hide()
            else:
                self.show()
    
    def _set_state(self, state):
        """设置青蛙状态"""
        self.frog_widget.state = state
    
    def _show_login(self):
        """显示登录对话框"""
        from ui.wallet_dialog import WalletConnectDialog
        from services.wallet_manager import wallet_manager
        
        dialog = WalletConnectDialog(self)
        if dialog.exec_():
            # 连接成功
            self._wallet_address = wallet_manager.address
            self._load_frogs()
            
            # 显示签名能力信息
            if wallet_manager.can_sign:
                self.tray_icon.showMessage(
                    'ZetaFrog',
                    '✅ 钱包已连接，可进行签名操作',
                    QSystemTrayIcon.Information,
                    2000
                )
            else:
                self.tray_icon.showMessage(
                    'ZetaFrog',
                    '👁️ 钱包已连接（只读模式）',
                    QSystemTrayIcon.Information,
                    2000
                )
    
    def _load_frogs(self):
        """加载用户的青蛙"""
        if not self._wallet_address:
            return
        
        from services.api_client import api_client
        
        try:
            frogs = api_client.get_frogs_by_owner(self._wallet_address)
            self._frogs = frogs
            
            if frogs:
                self._current_frog = frogs[0]
                self._update_frog_info()
                self._update_switch_menu()
                
                self.tray_icon.showMessage(
                    'ZetaFrog',
                    f'欢迎回来！找到 {len(frogs)} 只青蛙',
                    QSystemTrayIcon.Information,
                    2000
                )
            else:
                # 没有青蛙，询问是否铸造
                from services.wallet_manager import wallet_manager
                
                if wallet_manager.can_sign:
                    # 可以签名，询问是否铸造
                    reply = QMessageBox.question(
                        self,
                        '🐸 欢迎！',
                        '您还没有 ZetaFrog\n\n是否现在铸造一只？',
                        QMessageBox.Yes | QMessageBox.No,
                        QMessageBox.Yes
                    )
                    if reply == QMessageBox.Yes:
                        self._show_mint()
                else:
                    self.tray_icon.showMessage(
                        'ZetaFrog',
                        '未找到青蛙\n\n请使用私钥/助记词连接后铸造',
                        QSystemTrayIcon.Warning,
                        3000
                    )
        except Exception as e:
            self.tray_icon.showMessage(
                'ZetaFrog',
                f'加载失败: {str(e)}',
                QSystemTrayIcon.Critical,
                3000
            )
    
    def _update_frog_info(self):
        """更新青蛙信息显示"""
        if self._current_frog:
            name = self._current_frog.get('name', '未命名')
            status = self._current_frog.get('status', 'Idle')
            status_text = {'Idle': '空闲', 'Traveling': '旅行中', 'Returning': '返回中'}.get(status, status)
            self.frog_info_action.setText(f'🐸 {name} - {status_text}')
            
            # 更新状态
            if status == 'Traveling':
                self.frog_widget.state = FrogState.TRAVELING
                self.frog_widget.set_traveling(True)
            else:
                self.frog_widget.state = FrogState.IDLE
                self.frog_widget.set_traveling(False)
    
    def _update_switch_menu(self):
        """更新切换青蛙菜单"""
        self.switch_frog_menu.clear()
        
        for frog in self._frogs:
            name = frog.get('name', '未命名')
            token_id = frog.get('tokenId', '?')
            action = QAction(f'🐸 {name} (#{token_id})', self)
            action.triggered.connect(lambda checked, f=frog: self._switch_frog(f))
            self.switch_frog_menu.addAction(action)
    
    def _switch_frog(self, frog):
        """切换当前青蛙"""
        self._current_frog = frog
        self._update_frog_info()
        
        self.tray_icon.showMessage(
            'ZetaFrog',
            f'已切换到 {frog.get("name", "未命名")}',
            QSystemTrayIcon.Information,
            1500
        )
    
    def _show_travel(self):
        """显示旅行对话框"""
        if not self._check_login():
            return
        
        from ui.travel_dialog import TravelDialog
        dialog = TravelDialog(self._current_frog, self._wallet_address, self)
        dialog.exec_()
        self._load_frogs()  # 刷新状态
    
    def _show_friends(self):
        """显示好友对话框"""
        if not self._check_login():
            return
        
        from ui.friends_dialog import FriendsDialog
        dialog = FriendsDialog(self._current_frog, self)
        dialog.exec_()
        
        # 恢复状态
        if hasattr(self, '_last_state'):
            self.frog_widget.state = self._last_state
    
    def _show_badges(self):
        """显示徽章对话框"""
        if not self._check_login():
            return
        
        from ui.badges_dialog import BadgesDialog
        dialog = BadgesDialog(self._current_frog, self._wallet_address, self)
        dialog.exec_()
        
        # 恢复状态
        if hasattr(self, '_last_state'):
            self.frog_widget.state = self._last_state
    
    def _show_nft_gallery(self):
        """显示 NFT 画廊"""
        if not self._check_login():
            return
        
        from ui.nft_gallery import NFTGalleryDialog
        dialog = NFTGalleryDialog(self._current_frog, self._wallet_address, self)
        dialog.exec_()
        
        # 恢复动作
        self.frog_widget.set_souvenir(False)
    
    def _show_team_travel(self):
        """显示组队旅行对话框"""
        if not self._check_login():
            return
        
        from ui.team_travel_dialog import TeamTravelDialog
        dialog = TeamTravelDialog(self._current_frog, self._wallet_address, self)
        dialog.exec_()
        self._load_frogs()  # 刷新状态
    
    def _show_synthesis(self):
        """显示纪念品合成对话框"""
        if not self._check_login():
            return
        
        from ui.synthesis_dialog import SynthesisDialog
        dialog = SynthesisDialog(self._current_frog, self)
        dialog.exec_()
    
    def _show_badge_sets(self):
        """显示徽章套装对话框"""
        if not self._check_login():
            return
        
        from ui.badge_sets_dialog import BadgeSetsDialog
        dialog = BadgeSetsDialog(self._current_frog, self)
        dialog.exec_()
    
    def _show_mint(self):
        """显示铸造对话框"""
        from services.wallet_manager import wallet_manager
        
        if not wallet_manager.is_connected:
            QMessageBox.warning(self, '提示', '请先连接钱包')
            self._show_login()
            return
        
        if not wallet_manager.can_sign:
            QMessageBox.warning(
                self, 
                '提示', 
                '只读模式无法铸造青蛙\n\n请使用私钥或助记词方式连接钱包'
            )
            return
        
        from ui.mint_dialog import MintDialog
        dialog = MintDialog(self)
        if dialog.exec_():
            # 铸造成功，刷新青蛙列表
            self._load_frogs()
            self.tray_icon.showMessage(
                'ZetaFrog',
                '🎉 铸造成功！新青蛙已添加',
                QSystemTrayIcon.Information,
                3000
            )
    
    # ===== 交互特效槽函数 =====
    
    def _on_travel_clicked(self):
        """点击旅行：传送门特效 + 背包动作"""
        self.halo_menu.play_effect('PORTAL')
        self.frog_widget.set_traveling(True)
        # 延迟打开
        QTimer.singleShot(1200, self._show_travel)
        
    def _on_bag_clicked(self):
        """点击背包：彩纸特效 + 礼物动作"""
        self.halo_menu.play_effect('CONFETTI')
        self.frog_widget.set_souvenir(True)
        QTimer.singleShot(1200, self._show_nft_gallery)
        
    def _on_social_clicked(self):
        """点击社交：爱心特效 + 高兴状态"""
        self.halo_menu.play_effect('HEARTS')
        # 保存旧状态以便恢复
        self._last_state = self.frog_widget.state
        self.frog_widget.state = FrogState.EXCITED
        QTimer.singleShot(1200, self._show_friends)
        
    def _on_badge_clicked(self):
        """点击徽章：金币特效 + 富有状态"""
        self.halo_menu.play_effect('GOLD_RAIN')
        self._last_state = self.frog_widget.state
        self.frog_widget.state = FrogState.RICH
        QTimer.singleShot(1200, self._show_badges)

    def _check_login(self):
        """检查是否已登录"""
        if not self._wallet_address or not self._current_frog:
            QMessageBox.warning(self, '提示', '请先登录并选择青蛙')
            self._show_login()
            return False
        return True
    
    # ===== 鼠标事件与交互 =====
    
    def enterEvent(self, event):
        """鼠标进入青蛙区域：展开光环"""
        if not self._dragging:
            self._hover_timer.stop()
            # 同步位置：将 HaloMenu 中心对齐到青蛙中心
            center = self.mapToGlobal(self.rect().center())
            self.halo_menu.set_center(center)
            self.halo_menu.expand()
        super().enterEvent(event)
        
    def leaveEvent(self, event):
        """鼠标离开：启动延时收起"""
        # 延时检查，给用户移动到按钮上的时间
        self._hover_timer.start(100)
        super().leaveEvent(event)
    
    def mousePressEvent(self, event):
        """鼠标按下"""
        if event.button() == Qt.LeftButton:
            self._dragging = True
            self._drag_position = event.globalPos() - self.frameGeometry().topLeft()
            
            # 拖拽时收起菜单
            self.halo_menu.collapse()
            
            event.accept()
    
    def mouseMoveEvent(self, event):
        """鼠标移动（拖拽）"""
        if self._dragging and event.buttons() == Qt.LeftButton:
            self.move(event.globalPos() - self._drag_position)
            
            # 拖拽时同步菜单位置（虽然是收起状态，以此保证下次展开位置正确）
            center = self.mapToGlobal(self.rect().center())
            self.halo_menu.set_center(center)
            
            event.accept()
    
    def mouseReleaseEvent(self, event):
        """鼠标释放"""
        if event.button() == Qt.LeftButton:
            self._dragging = False
            event.accept()
    
    def mouseDoubleClickEvent(self, event):
        """双击打开主面板"""
        if event.button() == Qt.LeftButton:
            self._show_main_panel()
    
    def _show_main_panel(self):
        """显示主控制面板"""
        if not self._check_login():
            return
        
        from ui.main_panel import MainPanelDialog
        dialog = MainPanelDialog(self._current_frog, self._wallet_address, self)
        dialog.exec_()
        self._load_frogs()  # 刷新状态
    
    def contextMenuEvent(self, event):
        """右键菜单"""
        menu = QMenu(self)
        
        # 状态信息
        if self._current_frog:
            name = self._current_frog.get('name', '未命名')
            info_action = menu.addAction(f'🐸 {name}')
            info_action.setEnabled(False)
        else:
            menu.addAction('🐸 未登录').setEnabled(False)
        
        menu.addSeparator()
        
        # 功能菜单
        menu.addAction('🔑 登录').triggered.connect(self._show_login)
        menu.addAction('📋 打开面板').triggered.connect(self._show_main_panel)
        
        menu.addSeparator()
        
        menu.addAction('✈️ 旅行').triggered.connect(self._show_travel)
        menu.addAction('👥 好友').triggered.connect(self._show_friends)
        menu.addAction('🏆 徽章').triggered.connect(self._show_badges)
        menu.addAction('🎁 纪念品').triggered.connect(self._show_nft_gallery)
        
        menu.addSeparator()
        
        # 进阶功能
        menu.addAction('👥 组队旅行').triggered.connect(self._show_team_travel)
        menu.addAction('🔮 纪念品合成').triggered.connect(self._show_synthesis)
        menu.addAction('🎖️ 徽章套装').triggered.connect(self._show_badge_sets)
        
        menu.addSeparator()
        menu.addAction('❌ 退出').triggered.connect(QApplication.quit)
        
        menu.exec_(event.globalPos())
