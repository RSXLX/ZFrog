# -*- coding: utf-8 -*-
"""
旅行进度组件 - 显示实时旅行进度
"""

from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout
from PyQt5.QtCore import Qt, QTimer, pyqtSignal
from PyQt5.QtGui import QFont

from qfluentwidgets import (
    CardWidget, BodyLabel, CaptionLabel, 
    ProgressBar, FluentIcon
)


class TravelStage:
    """旅行阶段定义"""
    IDLE = 'idle'
    DEPARTING = 'departing'      # 出发中
    CROSSING = 'crossing'        # 跨链穿越
    ARRIVING = 'arriving'        # 到达目的地
    EXPLORING = 'exploring'      # 探索中
    RETURNING = 'returning'      # 返程中
    COMPLETED = 'completed'      # 完成


STAGE_INFO = {
    TravelStage.IDLE: {
        'emoji': '🏠',
        'text': '待命中',
        'progress': 0,
        'color': '#6B7280'
    },
    TravelStage.DEPARTING: {
        'emoji': '🚀',
        'text': '正在出发...',
        'progress': 10,
        'color': '#10B981'
    },
    TravelStage.CROSSING: {
        'emoji': '🌈',
        'text': '跨链穿越中...',
        'progress': 30,
        'color': '#8B5CF6'
    },
    TravelStage.ARRIVING: {
        'emoji': '🛬',
        'text': '即将到达目的地',
        'progress': 50,
        'color': '#3B82F6'
    },
    TravelStage.EXPLORING: {
        'emoji': '🔍',
        'text': '探索中...',
        'progress': 70,
        'color': '#F59E0B'
    },
    TravelStage.RETURNING: {
        'emoji': '🏠',
        'text': '正在返程...',
        'progress': 90,
        'color': '#EC4899'
    },
    TravelStage.COMPLETED: {
        'emoji': '✅',
        'text': '旅行完成！',
        'progress': 100,
        'color': '#10B981'
    }
}


class TravelProgressCard(CardWidget):
    """旅行进度卡片组件"""
    
    travel_completed = pyqtSignal()  # 旅行完成信号
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self._current_stage = TravelStage.IDLE
        self._target_progress = 0
        self._current_progress = 0
        self._travel_id = None
        self._start_time = None
        self._duration = 0
        
        self._setup_ui()
        self._setup_timer()
        
    def _setup_ui(self):
        """设置 UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)
        
        # 标题行
        title_layout = QHBoxLayout()
        self.title_label = BodyLabel('✈️ 旅行进度')
        self.title_label.setFont(QFont('Microsoft YaHei', 11, QFont.Bold))
        title_layout.addWidget(self.title_label)
        title_layout.addStretch()
        
        self.chain_label = CaptionLabel('')
        title_layout.addWidget(self.chain_label)
        layout.addLayout(title_layout)
        
        # 阶段显示
        self.stage_label = BodyLabel('🏠 待命中')
        self.stage_label.setFont(QFont('Segoe UI Emoji', 14))
        self.stage_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.stage_label)
        
        # 进度条
        self.progress_bar = ProgressBar(self)
        self.progress_bar.setMinimum(0)
        self.progress_bar.setMaximum(100)
        self.progress_bar.setValue(0)
        self.progress_bar.setFixedHeight(8)
        layout.addWidget(self.progress_bar)
        
        # 进度文字
        progress_text_layout = QHBoxLayout()
        self.progress_text = CaptionLabel('0%')
        self.time_left = CaptionLabel('')
        progress_text_layout.addWidget(self.progress_text)
        progress_text_layout.addStretch()
        progress_text_layout.addWidget(self.time_left)
        layout.addLayout(progress_text_layout)
        
        # 提示文字
        self.tip_label = CaptionLabel('')
        self.tip_label.setAlignment(Qt.AlignCenter)
        self.tip_label.setStyleSheet('color: #8B949E;')
        layout.addWidget(self.tip_label)
        
        self.setMinimumHeight(150)
        
    def _setup_timer(self):
        """设置动画定时器"""
        self._anim_timer = QTimer(self)
        self._anim_timer.timeout.connect(self._animate_progress)
        self._anim_timer.setInterval(50)  # 50ms 更新一次
        
        self._time_timer = QTimer(self)
        self._time_timer.timeout.connect(self._update_time_left)
        self._time_timer.setInterval(1000)  # 1秒更新时间
        
    def start_travel(self, travel_id: int, chain_name: str, duration: int):
        """开始旅行追踪"""
        import time
        
        self._travel_id = travel_id
        self._duration = duration
        self._start_time = time.time()
        
        self.chain_label.setText(f'🔗 {chain_name}')
        self.set_stage(TravelStage.DEPARTING)
        
        self._time_timer.start()
        self._simulate_stages()
        
    def _simulate_stages(self):
        """模拟旅行阶段变化"""
        import time
        
        if self._duration <= 0:
            return
            
        # 根据总时长计算各阶段时间点
        stage_times = {
            TravelStage.DEPARTING: 0,
            TravelStage.CROSSING: self._duration * 0.15,
            TravelStage.ARRIVING: self._duration * 0.35,
            TravelStage.EXPLORING: self._duration * 0.50,
            TravelStage.RETURNING: self._duration * 0.85,
            TravelStage.COMPLETED: self._duration
        }
        
        elapsed = time.time() - self._start_time
        
        for stage, threshold in reversed(list(stage_times.items())):
            if elapsed >= threshold:
                if stage != self._current_stage:
                    self.set_stage(stage)
                break
                
        if self._current_stage != TravelStage.COMPLETED:
            QTimer.singleShot(1000, self._simulate_stages)
        
    def set_stage(self, stage: str):
        """设置当前阶段"""
        self._current_stage = stage
        info = STAGE_INFO.get(stage, STAGE_INFO[TravelStage.IDLE])
        
        self.stage_label.setText(f"{info['emoji']} {info['text']}")
        self._target_progress = info['progress']
        
        # 设置进度条颜色
        self.progress_bar.setStyleSheet(f"""
            ProgressBar::groove {{
                background: #21262D;
                border-radius: 4px;
            }}
            ProgressBar::chunk {{
                background: {info['color']};
                border-radius: 4px;
            }}
        """)
        
        # 设置提示文字
        tips = self._get_stage_tip(stage)
        self.tip_label.setText(tips)
        
        # 启动进度动画
        if not self._anim_timer.isActive():
            self._anim_timer.start()
            
        # 完成时发出信号
        if stage == TravelStage.COMPLETED:
            self._time_timer.stop()
            self.travel_completed.emit()
            
    def _get_stage_tip(self, stage: str) -> str:
        """获取阶段提示文字"""
        tips = {
            TravelStage.DEPARTING: '🐸 青蛙正在收拾行李准备出发...',
            TravelStage.CROSSING: '✨ 穿越区块链的奇妙旅程！',
            TravelStage.ARRIVING: '🗺️ 即将抵达新的链上世界...',
            TravelStage.EXPLORING: '👀 发现了一些有趣的东西！',
            TravelStage.RETURNING: '🎁 满载而归，带着纪念品回家~',
            TravelStage.COMPLETED: '🎉 旅行圆满结束！',
        }
        return tips.get(stage, '')
        
    def _animate_progress(self):
        """进度条动画"""
        if self._current_progress < self._target_progress:
            self._current_progress += 1
            self.progress_bar.setValue(self._current_progress)
            self.progress_text.setText(f'{self._current_progress}%')
        elif self._current_progress > self._target_progress:
            self._current_progress = self._target_progress
            self.progress_bar.setValue(self._current_progress)
            self.progress_text.setText(f'{self._current_progress}%')
        else:
            self._anim_timer.stop()
            
    def _update_time_left(self):
        """更新剩余时间"""
        import time
        
        if not self._start_time or self._duration <= 0:
            return
            
        elapsed = time.time() - self._start_time
        remaining = max(0, self._duration - elapsed)
        
        if remaining > 60:
            mins = int(remaining // 60)
            secs = int(remaining % 60)
            self.time_left.setText(f'⏱️ 剩余 {mins}分{secs}秒')
        else:
            self.time_left.setText(f'⏱️ 剩余 {int(remaining)}秒')
            
        if remaining <= 0:
            self.time_left.setText('⏱️ 即将完成')
            
    def reset(self):
        """重置状态"""
        self._current_stage = TravelStage.IDLE
        self._current_progress = 0
        self._target_progress = 0
        self._travel_id = None
        self._start_time = None
        self._duration = 0
        
        self.progress_bar.setValue(0)
        self.progress_text.setText('0%')
        self.time_left.setText('')
        self.chain_label.setText('')
        self.tip_label.setText('')
        self.stage_label.setText('🏠 待命中')
        
        self._anim_timer.stop()
        self._time_timer.stop()
        
    @property
    def is_traveling(self) -> bool:
        """是否正在旅行中"""
        return self._current_stage not in [TravelStage.IDLE, TravelStage.COMPLETED]
