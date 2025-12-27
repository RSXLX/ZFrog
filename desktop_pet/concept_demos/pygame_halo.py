import pygame
import math
import random

# 初始化
pygame.init()
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("ZetaFrog Halo Menu - Pygame Prototype")
clock = pygame.time.Clock()

# 颜色
BLACK = (20, 20, 20)
NEON_GREEN = (50, 255, 100)
NEON_BLUE = (50, 150, 255)
NEON_PURPLE = (200, 50, 255)
WHITE = (255, 255, 255)

class Particle:
    def __init__(self, x, y, color):
        self.x = x
        self.y = y
        self.size = random.randint(2, 5)
        angle = random.uniform(0, 6.28)
        speed = random.uniform(1, 3)
        self.vx = math.cos(angle) * speed
        self.vy = math.sin(angle) * speed
        self.color = color
        self.life = 255
        
    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.life -= 5
        self.size -= 0.05
        
    def draw(self, surface):
        if self.life > 0 and self.size > 0:
            s_surf = pygame.Surface((int(self.size)*2, int(self.size)*2), pygame.SRCALPHA)
            pygame.draw.circle(s_surf, (*self.color, self.life), (int(self.size), int(self.size)), int(self.size))
            surface.blit(s_surf, (int(self.x) - self.size, int(self.y) - self.size))

class HaloButton:
    def __init__(self, x, y, radius, icon_text, color, angle_offset):
        self.base_x = x
        self.base_y = y
        self.radius = radius
        self.text = icon_text
        self.color = color
        self.angle_offset = angle_offset
        self.current_dist = 0
        self.target_dist = 0
        self.size = 0
        self.target_size = 40
        self.hovered = False
        self.x = x  # Initialize x
        self.y = y  # Initialize y
        
    def update(self, center_x, center_y, active):
        # 弹簧动画逻辑
        self.target_dist = 120 if active else 0
        self.current_dist += (self.target_dist - self.current_dist) * 0.2
        
        self.target_size = 50 if self.hovered else 40
        self.size += (self.target_size - self.size) * 0.2
        
        # 计算位置
        self.x = center_x + math.cos(self.angle_offset) * self.current_dist
        self.y = center_y + math.sin(self.angle_offset) * self.current_dist
        
    def draw(self, surface):
        if self.size < 1: return
        
        # 发光效果
        if self.hovered:
            glow_surf = pygame.Surface((self.size*3, self.size*3), pygame.SRCALPHA)
            pygame.draw.circle(glow_surf, (*self.color, 50), (self.size*1.5, self.size*1.5), self.size*1.5)
            surface.blit(glow_surf, (self.x - self.size*1.5, self.y - self.size*1.5))
            
        pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), int(self.size))
        
        # 文字
        font = pygame.font.SysFont('Arial', 20, bold=True)
        text_surf = font.render(self.text, True, BLACK)
        text_rect = text_surf.get_rect(center=(int(self.x), int(self.y)))
        surface.blit(text_surf, text_rect)

class Frog:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.radius = 40
        self.pulse = 0
        
    def update(self):
        self.pulse += 0.1
        
    def draw(self, surface):
        # 呼吸效果
        glow_size = self.radius + math.sin(self.pulse) * 5
        pygame.draw.circle(surface, (50, 255, 100, 100), (self.x, self.y), glow_size)
        pygame.draw.circle(surface, NEON_GREEN, (self.x, self.y), self.radius)
        # 眼睛
        pygame.draw.circle(surface, WHITE, (self.x - 15, self.y - 10), 12)
        pygame.draw.circle(surface, WHITE, (self.x + 15, self.y - 10), 12)
        pygame.draw.circle(surface, BLACK, (self.x - 15, self.y - 10), 5)
        pygame.draw.circle(surface, BLACK, (self.x + 15, self.y - 10), 5)

def main():
    frog = Frog(WIDTH//2, HEIGHT//2)
    buttons = [
        HaloButton(0, 0, 40, "Travel", NEON_BLUE, -math.pi/2),
        HaloButton(0, 0, 40, "Bag", NEON_PURPLE, 0),
        HaloButton(0, 0, 40, "Social", (255, 100, 100), math.pi),
        HaloButton(0, 0, 40, "Badge", (255, 200, 50), math.pi/2),
    ]
    
    particles = []
    
    running = True
    while running:
        # 清屏
        screen.fill(BLACK)
        
        mx, my = pygame.mouse.get_pos()
        dist_to_frog = math.hypot(mx - frog.x, my - frog.y)
        hover_frog = dist_to_frog < 60
        menu_active = hover_frog or any(b.hovered for b in buttons)
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.MOUSEBUTTONDOWN:
                # 点击生成粒子
                for _ in range(20):
                    particles.append(Particle(mx, my, NEON_GREEN))
        
        # 更新并绘制青蛙
        frog.update()
        frog.draw(screen)
        
        # 绘制按钮
        for btn in buttons:
            dist_to_btn = math.hypot(mx - btn.x, my - btn.y)
            btn.hovered = dist_to_btn < btn.size
            if btn.hovered:
                menu_active = True
                # 悬停粒子
                if random.random() < 0.2:
                    particles.append(Particle(btn.x, btn.y, btn.color))
            
            btn.update(frog.x, frog.y, menu_active)
            btn.draw(screen)
        
        # 绘制粒子
        for p in particles[:]:
            p.update()
            p.draw(screen)
            if p.life <= 0 or p.size <= 0:
                particles.remove(p)
                
        # 连线效果 (Web3 Link)
        if menu_active:
            for btn in buttons:
                if btn.size > 5:
                    pygame.draw.line(screen, (*btn.color, 100), (frog.x, frog.y), (btn.x, btn.y), 2)
        
        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

if __name__ == "__main__":
    main()
