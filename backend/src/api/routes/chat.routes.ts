// backend/src/api/routes/chat.routes.ts

import { Router } from 'express';
import { ChatService } from '../../services/ai/chat.service';

const router = Router();
const chatService = new ChatService();

/**
 * POST /api/chat/message
 * 发送消息给青蛙
 */
router.post('/message', async (req, res) => {
  try {
    const { frogId, message, sessionId, ownerAddress } = req.body;
    
    // 验证请求参数
    if (!frogId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: frogId, message'
      });
    }
    
    // 使用提供的ownerAddress或默认值
    const userAddress = ownerAddress || '0x0000000000000000000000000000000000000000';
    
    // 处理消息
    const response = await chatService.processMessage(
      frogId,
      userAddress,
      message,
      sessionId
    );
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    
    // 根据错误类型返回不同的状态码
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error instanceof Error) {
      if (error.message.includes('Frog not found')) {
        statusCode = 404;
        errorMessage = `Frog with ID ${req.body.frogId} not found`;
      } else if (error.message.includes('Invalid')) {
        statusCode = 400;
        errorMessage = error.message;
      }
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * POST /api/chat/message/stream
 * 流式发送消息给青蛙（SSE）
 */
router.post('/message/stream', async (req, res) => {
  try {
    const { frogId, message, sessionId, ownerAddress } = req.body;
    
    if (!frogId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: frogId, message'
      });
    }
    
    const userAddress = ownerAddress || '0x0000000000000000000000000000000000000000';
    
    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
    
    // 流式处理
    const stream = chatService.processMessageStream(
      frogId,
      userAddress,
      message,
      sessionId
    );
    
    for await (const event of stream) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
    
    res.end();
    
  } catch (error) {
    console.error('Error in chat stream:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', data: { message: 'Stream error' } })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/chat/history/:sessionId
 * 获取聊天历史
 */
router.get('/history/:sessionId', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    
    if (isNaN(sessionId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session ID'
      });
    }
    
    const { ownerAddress } = req.query;
    const userAddress = ownerAddress as string || '0x0000000000000000000000000000000000000000';
    
    const history = await chatService.getChatHistory(sessionId, userAddress);
    
    res.json({
      success: true,
      data: {
        messages: history
      }
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/chat/sessions
 * 获取用户所有会话
 */
router.get('/sessions', async (req, res) => {
  try {
    const { ownerAddress } = req.query;
    const userAddress = ownerAddress as string || '0x0000000000000000000000000000000000000000';
    
    const sessions = await chatService.getUserSessions(userAddress);
    
    res.json({
      success: true,
      data: {
        sessions
      }
    });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/chat/session
 * 创建新的聊天会话
 */
router.post('/session', async (req, res) => {
  try {
    const { frogId, ownerAddress } = req.body;
    
    if (!frogId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: frogId'
      });
    }
    
    const userAddress = ownerAddress || '0x0000000000000000000000000000000000000000';
    
    const session = await chatService.createSession(frogId, userAddress);
    
    res.json({
      success: true,
      data: {
        sessionId: session.id,
        frogId: session.frogId,
        createdAt: session.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;