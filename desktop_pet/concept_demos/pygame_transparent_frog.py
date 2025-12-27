import pygame
import win32api
import win32con
import win32gui
import math
import random

# 窗口设置
WIDTH, HEIGHT = 400, 400
TRANSPARENT_COLOR = (255, 0, 128) # 用于扣除的颜色 (洋红色)

def make_window_transparent():
    """使用 Windows API 让窗口背景透明"""
    hwnd = pygame.display.get_wm_info()["window"]
    
    # 获取当前样式
    style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
    
    # 设置 Layered 属性 (透明窗口必须)
    win32gui.SetWindowLong(hwnd, win32con.GWL_EXSTYLE, style | win32con.WS_EX_LAYERED)
    
    # 设置颜色键 (Chroma Key)：将 TRANSPARENT_COLOR 变为完全透明
    # 最后一个参数 0 表示 Alpha，但这里我们用 LWA_COLORKEY 模式，只扣颜色
    win32gui.SetLayeredWindowAttributes(hwnd, win32api.RGB(*TRANSPARENT_COLOR), 0, win32con.LWA_COLORKEY)
    
    # 这一步是为了让窗口始终置顶
    win32gui.SetWindowPos(hwnd, win32con.HWND_TOPMOST, 0, 0, 0, 0, 
                          win32con.SWP_NOMOVE | win32con.SWP_NOSIZE)

def main():
    pygame.init()
    # 创建无边框窗口
    screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.NOFRAME)
    pygame.display.set_caption("Transparent Pygame Frog")
    
    # 应用透明 Hack
    make_window_transparent()
    
    clock = pygame.time.Clock()
    
    # 青蛙和粒子数据
    frog_x, frog_y = WIDTH//2, HEIGHT//2
    particles = []
    
    dragging = False
    drag_offset = (0, 0)
    hwnd = pygame.display.get_wm_info()["window"]
    
    running = True
    while running:
        # 清屏：填充要被扣除的透明色
        screen.fill(TRANSPARENT_COLOR)
        
        # 处理事件
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
                
            elif event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1: # 左键
                    mx, my = pygame.mouse.get_pos()
                    # 只有点击青蛙身体才触发拖拽
                    if math.hypot(mx-frog_x, my-frog_y) < 50:
                        dragging = True
                        # 记录鼠标相对于窗口左上角的偏移
                        # 注意：我们需要移动的是整个窗口
                        drag_offset = pygame.mouse.get_pos()
                        
                        # 同时也触发粒子
                        for _ in range(10):
                            particles.append({
                                'x': frog_x, 'y': frog_y,
                                'vx': random.uniform(-5, 5), 'vy': random.uniform(-5, 5),
                                'life': 255, 'color': (random.randint(50, 255), 255, 100)
                            })
                            
            elif event.type == pygame.MOUSEBUTTONUP:
                if event.button == 1:
                    dragging = False
                    
            elif event.type == pygame.MOUSEMOTION:
                if dragging:
                    # 获取屏幕绝对坐标
                    global_mx, global_my = win32api.GetCursorPos()
                    # 计算新窗口位置 = 鼠标绝对位置 - 鼠标相对窗口偏移
                    new_x = global_mx - drag_offset[0]
                    new_y = global_my - drag_offset[1]
                    
                    win32gui.SetWindowPos(hwnd, 0, new_x, new_y, 0, 0, 
                                          win32con.SWP_NOSIZE | win32con.SWP_NOZORDER)

        # === 绘制青蛙 (模拟 SVG) ===
        # 身体
        pygame.draw.circle(screen, (74, 222, 128), (frog_x, frog_y), 50)
        # 眼睛
        pygame.draw.circle(screen, (255, 255, 255), (frog_x - 20, frog_y - 15), 15)
        pygame.draw.circle(screen, (255, 255, 255), (frog_x + 20, frog_y - 15), 15)
        pygame.draw.circle(screen, (0, 0, 0), (frog_x - 20, frog_y - 15), 6)
        pygame.draw.circle(screen, (0, 0, 0), (frog_x + 20, frog_y - 15), 6)
        
        # 腮红
        pygame.draw.circle(screen, (255, 150, 150), (frog_x - 35, frog_y + 10), 8)
        pygame.draw.circle(screen, (255, 150, 150), (frog_x + 35, frog_y + 10), 8)
        
        # === 绘制粒子 ===
        for p in particles[:]:
            p['x'] += p['vx']
            p['y'] += p['vy']
            p['life'] -= 5
            
            if p['life'] <= 0:
                particles.remove(p)
            else:
                # 绘制带 Alpha 的圆 (需要画在临时 Surface 上)
                s = pygame.Surface((10, 10))
                s.set_colorkey((0,0,0)) # 黑底透明
                s.set_alpha(p['life'])
                pygame.draw.circle(s, p['color'], (5, 5), 4)
                screen.blit(s, (int(p['x'])-5, int(p['y'])-5))
        
        # 显示 FPS
        font = pygame.font.SysFont('Arial', 12)
        fps_text = font.render(f"FPS: {int(clock.get_fps())}", True, (255, 255, 255))
        screen.blit(fps_text, (10, 10))
        
        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

if __name__ == "__main__":
    main()
