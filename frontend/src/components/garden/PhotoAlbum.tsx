/**
 * PhotoAlbum - 相册组件
 * 
 * 功能:
 * - 显示旅行照片
 * - 照片详情
 * - NFT 铸造
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';

export interface Photo {
  id: string;
  imageUrl: string;
  ipfsUrl?: string;
  caption?: string;
  location?: string;
  takenAt: string;
  likesCount: number;
  isNft: boolean;
  nftTokenId?: string;
  travel?: {
    id: number;
    targetChain: string;
  };
}

interface PhotoAlbumProps {
  frogId: number;
  isOwner: boolean;
  onClose: () => void;
}

export const PhotoAlbum: React.FC<PhotoAlbumProps> = ({
  frogId,
  isOwner,
  onClose,
}) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [filter, setFilter] = useState<'all' | 'nft'>('all');

  // 加载照片
  useEffect(() => {
    loadPhotos();
  }, [frogId, filter]);

  const loadPhotos = async () => {
    try {
      const response = await apiService.get(`/homestead/${frogId}/photos`, {
        params: {
          nftOnly: filter === 'nft' ? 'true' : 'false',
        }
      });
      if (response.success) {
        setPhotos(response.data?.photos || []);
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  // 点赞
  const handleLike = async (photoId: string) => {
    try {
      await apiService.post(`/homestead/${frogId}/photos/${photoId}/like`);
      setPhotos(prevPhotos =>
        prevPhotos.map(p =>
          p.id === photoId ? { ...p, likesCount: p.likesCount + 1 } : p
        )
      );
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto({ ...selectedPhoto, likesCount: selectedPhoto.likesCount + 1 });
      }
    } catch (error) {
      console.error('Failed to like photo:', error);
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg 
                   max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b 
                        dark:border-gray-700 bg-gradient-to-r from-blue-400 to-indigo-400">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            📷 相册
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* 筛选 */}
        <div className="flex gap-2 p-3 border-b dark:border-gray-700">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('nft')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
              filter === 'nft'
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            🖼️ NFT
          </button>
        </div>

        {/* 照片网格 */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="text-center text-gray-400 py-8">加载中...</div>
          ) : photos.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <div className="text-4xl mb-2">📸</div>
              <p>还没有照片</p>
              <p className="text-sm mt-1">旅行中会自动拍照哦</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => (
                <motion.div
                  key={photo.id}
                  className="relative aspect-square rounded-lg overflow-hidden 
                             cursor-pointer group"
                  onClick={() => setSelectedPhoto(photo)}
                  whileHover={{ scale: 1.02 }}
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.caption || '旅行照片'}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* 悬浮遮罩 */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 
                                  group-hover:opacity-100 transition-opacity 
                                  flex items-center justify-center">
                    <span className="text-white text-sm">查看</span>
                  </div>
                  
                  {/* NFT 标记 */}
                  {photo.isNft && (
                    <div className="absolute top-1 right-1 bg-purple-500 text-white 
                                    text-xs px-1.5 py-0.5 rounded">
                      NFT
                    </div>
                  )}
                  
                  {/* 点赞数 */}
                  {photo.likesCount > 0 && (
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white 
                                    text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                      ❤️ {photo.likesCount}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* 照片详情弹窗 */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-60 p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden 
                         max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 照片 */}
              <div className="relative aspect-square">
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.caption || '旅行照片'}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white 
                             rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              
              {/* 信息 */}
              <div className="p-4">
                {selectedPhoto.caption && (
                  <p className="text-gray-700 dark:text-gray-200 mb-2">
                    {selectedPhoto.caption}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-3">
                    {selectedPhoto.location && (
                      <span>📍 {selectedPhoto.location}</span>
                    )}
                    <span>📅 {formatDate(selectedPhoto.takenAt)}</span>
                  </div>
                  
                  <button
                    onClick={() => handleLike(selectedPhoto.id)}
                    className="flex items-center gap-1 hover:text-pink-500 transition-colors"
                  >
                    ❤️ {selectedPhoto.likesCount}
                  </button>
                </div>
                
                {/* NFT 信息 */}
                {selectedPhoto.isNft && (
                  <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg 
                                  flex items-center gap-2">
                    <span className="text-purple-500">🖼️</span>
                    <span className="text-sm text-purple-600 dark:text-purple-300">
                      已铸造为 NFT #{selectedPhoto.nftTokenId}
                    </span>
                  </div>
                )}
                
                {/* 铸造按钮 (仅限 owner 且未铸造) */}
                {isOwner && !selectedPhoto.isNft && (
                  <button
                    className="mt-3 w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 
                               text-white rounded-full font-medium hover:opacity-90"
                    onClick={() => {
                      // TODO: 实现 NFT 铸造
                      alert('NFT 铸造功能即将上线');
                    }}
                  >
                    铸造为 NFT 🎨
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PhotoAlbum;
