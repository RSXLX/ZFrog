import { useState, useEffect } from 'react';
import { apiService, type Frog } from '../services/api';

export function useFrogData(tokenIdOrAddress: number | string | null | undefined) {
  const [frog, setFrog] = useState<Frog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!tokenIdOrAddress) return;
    
    try {
      setLoading(true);
      let data: Frog | null = null;
      
      if (typeof tokenIdOrAddress === 'string') {
        // 如果是address，获取该地址的所有青蛙
        const frogs = await apiService.getFrogsByOwner(tokenIdOrAddress);
        data = frogs.length > 0 ? frogs[0] : null;
      } else {
        // 如果是tokenId，获取特定青蛙
        data = await apiService.getFrogDetail(tokenIdOrAddress);
      }
      
      setFrog(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching frog data:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tokenIdOrAddress]);

  return {
    frog,
    loading,
    error,
    refetch: fetchData,
  };
}