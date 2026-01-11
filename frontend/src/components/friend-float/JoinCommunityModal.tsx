import React, { useState } from 'react';
import { useCommunityStore, Community, CredentialType } from '../../stores/communityStore';
import { apiService } from '../../services/api';

interface JoinCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinCommunityModal: React.FC<JoinCommunityModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addCommunity } = useCommunityStore();
  const [step, setStep] = useState<'input' | 'verifying' | 'success' | 'error'>('input');
  const [credential, setCredential] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [foundCommunity, setFoundCommunity] = useState<Community | null>(null);

  const handleSubmit = async () => {
    if (!credential.trim()) {
      setErrorMessage('请输入社区凭证');
      return;
    }

    setStep('verifying');
    setErrorMessage('');

    try {
      // 调用后端验证凭证
      const response = await apiService.post('/communities/verify-credential', {
        credential: credential.trim(),
      });

      if (response.success && response.data) {
        const community: Community = response.data.community;
        setFoundCommunity(community);
        
        // 添加到用户社区列表
        addCommunity({
          communityId: community.id,
          community,
          joinedAt: new Date(),
          credential: credential.trim(),
          isActive: false,
        });
        
        setStep('success');
      } else {
        setErrorMessage(response.message || '凭证验证失败');
        setStep('error');
      }
    } catch (error) {
      console.error('Verify credential error:', error);
      setErrorMessage('验证失败，请检查凭证是否正确');
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('input');
    setCredential('');
    setErrorMessage('');
    setFoundCommunity(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="join-community-modal" onClick={handleClose}>
      <div 
        className="join-community-content"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'input' && (
          <>
            <h3 className="join-community-title">🏘️ 加入新社区</h3>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
              输入社区凭证（邀请码或 NFT 合约地址）
            </p>
            <input
              type="text"
              className="join-community-input"
              placeholder="输入邀请码或合约地址..."
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            {errorMessage && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {errorMessage}
              </p>
            )}
            <div className="join-community-actions">
              <button
                className="float-footer-btn"
                onClick={handleClose}
              >
                取消
              </button>
              <button
                className="float-footer-btn primary"
                onClick={handleSubmit}
              >
                验证并加入
              </button>
            </div>
          </>
        )}

        {step === 'verifying' && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>正在验证凭证...</p>
          </div>
        )}

        {step === 'success' && foundCommunity && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
              {foundCommunity.icon}
            </div>
            <h3 className="join-community-title" style={{ color: foundCommunity.themeColor }}>
              🎉 加入成功！
            </h3>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              欢迎加入 <strong>{foundCommunity.name}</strong>
            </p>
            <button
              className="float-footer-btn primary"
              onClick={handleClose}
              style={{ width: '100%' }}
            >
              完成
            </button>
          </div>
        )}

        {step === 'error' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>❌</div>
              <h3 className="join-community-title">验证失败</h3>
              <p style={{ color: '#666' }}>{errorMessage}</p>
            </div>
            <div className="join-community-actions">
              <button
                className="float-footer-btn"
                onClick={handleClose}
              >
                关闭
              </button>
              <button
                className="float-footer-btn primary"
                onClick={() => setStep('input')}
              >
                重试
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
