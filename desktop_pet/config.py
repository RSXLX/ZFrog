# -*- coding: utf-8 -*-
"""
ZetaFrog Desktop Pet - 配置文件
"""

# API 配置
API_BASE_URL = "http://127.0.0.1:3001"

# 窗口配置
WINDOW_SIZE = 200
WINDOW_ALWAYS_ON_TOP = True

# 动画配置
ANIMATION_FPS = 30
BREATH_DURATION = 3500  # 呼吸动画周期（毫秒）

# 状态枚举
class FrogState:
    IDLE = "idle"
    SLEEPING = "sleeping"
    EATING = "eating"
    WALKING = "walking"
    JUMPING = "jumping"
    TRAVELING = "traveling"
    RETURNING = "returning"
    WRITING = "writing"
    EXCITED = "excited"
    SCARED = "scared"
    RICH = "rich"
    CURIOUS = "curious"
    DANCING = "dancing"
    CRYING = "crying"
    HAPPY = "happy"
    ANGRY = "angry"
    LOVE = "love"
    THINKING = "thinking"

# 状态颜色映射
STATE_COLORS = {
    FrogState.IDLE: {
        'body': ['#4ADE80', '#FCD34D', '#FDBA74'],
        'cheek': '#FDA4AF',
    },
    FrogState.ANGRY: {
        'body': ['#EF4444', '#F87171', '#FECACA'],
        'cheek': '#FF6B6B',
    },
    FrogState.SCARED: {
        'body': ['#93C5FD', '#A5B4FC', '#C4B5FD'],
        'cheek': '#DDD6FE',
    },
    FrogState.HAPPY: {
        'body': ['#4ADE80', '#FCD34D', '#FDBA74'],
        'cheek': '#FDA4AF',
    },
    FrogState.RICH: {
        'body': ['#FFD700', '#FFA500', '#FF8C00'],
        'cheek': '#FFE4B5',
    },
    FrogState.EXCITED: {
        'body': ['#34D399', '#FBBF24', '#F59E0B'],
        'cheek': '#FCD34D',
    },
    FrogState.CRYING: {
        'body': ['#94A3B8', '#CBD5E1', '#E2E8F0'],
        'cheek': '#E2E8F0',
    },
    FrogState.SLEEPING: {
        'body': ['#6366F1', '#A5B4FC', '#C4B5FD'],
        'cheek': '#DDD6FE',
    },
}

# 嘴巴路径映射
MOUTH_PATHS = {
    FrogState.IDLE: 'M 85 115 Q 100 125 115 115',
    FrogState.HAPPY: 'M 80 110 Q 100 130 120 110',
    FrogState.ANGRY: 'M 85 120 Q 100 110 115 120',
    FrogState.SCARED: 'M 90 115 Q 100 120 110 115',
    FrogState.CRYING: 'M 85 120 Q 100 112 115 120',
    FrogState.EXCITED: 'M 75 108 Q 100 135 125 108',
    FrogState.RICH: 'M 80 105 Q 100 130 120 105',
    FrogState.SLEEPING: 'M 90 118 Q 100 118 110 118',
}
