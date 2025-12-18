interface PendingTransaction {
  hash: string;
  description: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export class TransactionManager {
  private static instance: TransactionManager;
  private pendingTransactions: Map<string, PendingTransaction> = new Map();
  
  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }
  
  // 添加待处理交易
  addTransaction(hash: string, description: string): void {
    this.pendingTransactions.set(hash, {
      hash,
      description,
      timestamp: Date.now(),
      status: 'pending'
    });
    
    console.log('📝 Transaction added:', { hash, description });
  }
  
  // 更新交易状态
  updateTransactionStatus(hash: string, status: 'confirmed' | 'failed'): void {
    const tx = this.pendingTransactions.get(hash);
    if (tx) {
      tx.status = status;
      console.log(`📊 Transaction ${hash} status updated to:`, status);
    }
  }
  
  // 获取待处理交易
  getPendingTransactions(): PendingTransaction[] {
    return Array.from(this.pendingTransactions.values())
      .filter(tx => tx.status === 'pending');
  }
  
  // 清理旧交易（超过24小时）
  cleanup(): void {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (const [hash, tx] of this.pendingTransactions.entries()) {
      if (now - tx.timestamp > dayMs) {
        this.pendingTransactions.delete(hash);
      }
    }
  }
}

// 导出单例实例
export const transactionManager = TransactionManager.getInstance();