# -*- coding: utf-8 -*-
"""
ZetaFrog Desktop Pet - API 客户端
"""

import requests
from typing import Optional, Dict, Any, List
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import API_BASE_URL


class ApiClient:
    """API 客户端基类"""
    
    def __init__(self, base_url: str = API_BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
        })
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """发送请求"""
        # 自动补全 /api 前缀
        if not endpoint.startswith('/api'):
            endpoint = f"/api{endpoint}" if endpoint.startswith('/') else f"/api/{endpoint}"
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            print(f"[API] {method} {url}")  # 调试日志
            response = self.session.request(method, url, **kwargs)
            print(f"[API] Response: {response.status_code}")  # 调试日志
            response.raise_for_status()
            data = response.json()
            print(f"[API] Data: {data}")  # 调试日志
            
            # 统一返回结构
            if isinstance(data, dict) and 'success' in data:
                return data
            return {'success': True, 'data': data}
            
        except requests.exceptions.RequestException as e:
            print(f"[API] Error: {e}")  # 调试日志
            return {'success': False, 'error': str(e)}
    
    def get(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """GET 请求"""
        return self._request('GET', endpoint, params=params)
    
    def post(self, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """POST 请求"""
        return self._request('POST', endpoint, json=data)
    
    def put(self, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """PUT 请求"""
        return self._request('PUT', endpoint, json=data)
    
    def delete(self, endpoint: str) -> Dict[str, Any]:
        """DELETE 请求"""
        return self._request('DELETE', endpoint)
    
    # ===== Frog API =====
    
    def get_frogs_by_owner(self, address: str) -> List[Dict]:
        """获取用户的所有青蛙"""
        result = self.get(f'/frogs/owner/{address.lower()}')
        return result.get('data', []) if result.get('success') else []
    
    def get_frog_detail(self, token_id: int, viewer_address: Optional[str] = None) -> Optional[Dict]:
        """获取青蛙详情"""
        endpoint = f'/frogs/{token_id}'
        if viewer_address:
            endpoint += f'?viewerAddress={viewer_address.lower()}'
        result = self.get(endpoint)
        return result.get('data') if result.get('success') else None
    
    def sync_frog(self, token_id: int) -> bool:
        """同步青蛙数据"""
        result = self.post('/frogs/sync', {'tokenId': token_id})
        return result.get('success', False)
    
    # ===== Travel API =====
    
    def get_travel_history(self, address: str, frog_id: Optional[int] = None) -> Dict:
        """获取旅行历史"""
        params = {'address': address}
        if frog_id:
            params['frogId'] = str(frog_id)
        result = self.get('/travels/history', params=params)
        return result.get('data', {}) if result.get('success') else {}
    
    def get_frog_travels(self, frog_id: int) -> List[Dict]:
        """获取青蛙旅行列表"""
        result = self.get(f'/travels/{frog_id}')
        return result.get('data', []) if result.get('success') else []
    
    def get_lucky_address(self, chain: str) -> Optional[str]:
        """获取幸运地址"""
        result = self.get('/travels/lucky-address', {'chain': chain})
        return result.get('data') if result.get('success') else None
    
    def start_travel(self, frog_id: int, travel_type: str, target_chain: str, 
                     duration: int, target_address: Optional[str] = None) -> Dict:
        """开始旅行"""
        data = {
            'frogId': frog_id,
            'travelType': travel_type,
            'targetChain': target_chain,
            'duration': duration,
        }
        if target_address:
            data['targetAddress'] = target_address
        return self.post('/travels/start', data)  # 修复：使用复数 travels
    
    # ===== Friends API =====
    
    def get_friends(self, frog_id: int) -> List[Dict]:
        """获取好友列表"""
        result = self.get(f'/friends/list/{frog_id}')  # 修复：使用 /list/ 路径
        if result.get('success'):
            return result.get('data', [])
        # 兼容直接返回数组的情况
        return result if isinstance(result, list) else []
    
    def get_friend_requests(self, frog_id: int) -> List[Dict]:
        """获取好友请求"""
        result = self.get(f'/friends/requests/{frog_id}')
        if result.get('success'):
            return result.get('data', [])
        return result if isinstance(result, list) else []
    
    def get_world_online(self, frog_id: int) -> List[Dict]:
        """获取世界在线列表"""
        result = self.get(f'/friends/world-online', {'currentFrogId': frog_id})
        return result.get('data', []) if result.get('success') else []
    
    def add_friend(self, from_frog_id: int, to_frog_id: int) -> Dict:
        """发送好友请求"""
        return self.post('/friends/request', {  # 修复：使用 /request 路径
            'requesterId': from_frog_id,
            'addresseeId': to_frog_id,
        })
    
    def accept_friend(self, friendship_id: int) -> Dict:
        """接受好友请求"""
        return self.put(f'/friends/request/{friendship_id}/respond', {  # 修复：使用正确路径
            'status': 'Accepted'
        })
    
    # ===== Badges API =====
    
    def get_badges(self, frog_id: Optional[int] = None, owner_address: Optional[str] = None) -> List[Dict]:
        """获取徽章"""
        if frog_id:
            result = self.get(f'/badges/{frog_id}')
        elif owner_address:
            result = self.get('/badges', {'ownerAddress': owner_address})
        else:
            return []
        return result.get('data', []) if result.get('success') else []
    
    # ===== Souvenirs API =====
    
    def get_souvenirs(self, frog_id: Optional[int] = None, owner_address: Optional[str] = None) -> List[Dict]:
        """获取纪念品"""
        if frog_id:
            result = self.get(f'/souvenirs/{frog_id}')
        elif owner_address:
            result = self.get('/souvenirs', {'ownerAddress': owner_address})
        else:
            return []
        return result.get('data', []) if result.get('success') else []
    
    def get_souvenir_image_status(self, souvenir_id: str) -> Dict:
        """获取纪念品图片状态"""
        return self.get(f'/nft-image/status/{souvenir_id}')
    
    def gift_souvenir(self, souvenir_id: int, to_frog_id: int) -> Dict:
        """赠送纪念品给好友"""
        return self.post('/souvenirs/gift', {
            'souvenirId': souvenir_id,
            'toFrogId': to_frog_id
        })
    
    # ===== Interaction API =====
    
    def send_interaction(self, from_frog_id: int, to_frog_id: int, action_type: str) -> Dict:
        """发送好友互动"""
        return self.post('/friends/interact', {
            'fromFrogId': from_frog_id,
            'toFrogId': to_frog_id,
            'actionType': action_type  # wave, feed, gift, message, visit
        })
    
    def accept_friend_request(self, request_id: int) -> Dict:
        """接受好友请求 (别名方法)"""
        return self.accept_friend(request_id)
    
    def send_friend_request(self, from_frog_id: int, to_frog_id: int) -> Dict:
        """发送好友请求 (别名方法)"""
        return self.add_friend(from_frog_id, to_frog_id)
    


# 全局实例
api_client = ApiClient()

