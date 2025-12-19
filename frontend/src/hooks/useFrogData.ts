import { useState, useEffect } from 'react';
import { apiService, type Frog } from '../services/api';

export function useFrogData(tokenId: number) {
  const [frog, setFrog] = useState<Frog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (isNaN(tokenId)) return;
    
    try {
      setLoading(true);
      const data = await apiService.getFrogDetail(tokenId);
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
  }, [tokenId]);

  return {
    frog,
    loading,
    error,
    refetch: fetchData,
  };
}