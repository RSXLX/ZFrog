import { useEffect, useState, useCallback, useRef } from 'react';
import { ChainEvent, WhaleAlert, ChainMonitorState } from '../types/frogAnimation';
import { systemFeatureApi } from '../features/system/api';

const MONITOR_CONFIG = {
  priceAlertThreshold: 2, // 2% 触发价格预警
  largeTradeThresholdPercent: 4, // 24h 变化超过 4% 视为大额信号
  whaleThresholdPercent: 8, // 24h 变化超过 8% 触发鲸鱼预警
  pollInterval: 15000, // 15s
};

const GAS_ALERT_THRESHOLD_GWEI = BigInt(60);
const DEFAULT_GAS_PRICE = BigInt(10_000_000_000); // 10 Gwei

const RPC_URLS = [
  import.meta.env.VITE_ZETACHAIN_RPC_URL,
  import.meta.env.VITE_BSC_TESTNET_RPC_URL,
  import.meta.env.VITE_ETH_SEPOLIA_RPC_URL,
].filter(Boolean) as string[];

const API_HEALTH_ENDPOINTS = ['/price/ZETA', '/price/ETH'];

async function getGasPriceFromRpc(): Promise<bigint> {
  if (RPC_URLS.length === 0) return DEFAULT_GAS_PRICE;

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_gasPrice',
    params: [],
  };

  for (const rpcUrl of RPC_URLS) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) continue;

      const data = await response.json();
      if (data?.result) {
        return BigInt(data.result as string);
      }
    } catch {
      // Try next RPC endpoint
    }
  }

  return DEFAULT_GAS_PRICE;
}

export function useChainMonitor() {
  const [state, setState] = useState<ChainMonitorState>({
    latestEvent: null,
    priceChange: 0,
    whaleAlert: null,
    gasPrice: DEFAULT_GAS_PRICE,
    isConnected: false,
    events: [],
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const priceHistoryRef = useRef<Map<string, number>>(new Map());

  const addEvent = useCallback((event: ChainEvent) => {
    setState((prev) => ({
      ...prev,
      latestEvent: event,
      events: [event, ...prev.events].slice(0, 50),
    }));
  }, []);

  const setConnected = useCallback((isConnected: boolean) => {
    setState((prev) => (prev.isConnected === isConnected ? prev : { ...prev, isConnected }));
  }, []);

  const checkApiHealth = useCallback(async () => {
    try {
      await systemFeatureApi.checkHealth(API_HEALTH_ENDPOINTS);
      setConnected(true);
    } catch (error) {
      console.error('Chain monitor health check failed:', error);
      setConnected(false);
    }
  }, [setConnected]);

  const monitorLargeTransfers = useCallback(async () => {
    try {
      const data = await systemFeatureApi.getPrice('ZETA');
      if (!data) return;

      const change24h = Number(data.change24h || 0);
      if (!Number.isFinite(change24h)) return;

      if (Math.abs(change24h) >= MONITOR_CONFIG.largeTradeThresholdPercent) {
        addEvent({
          type: change24h >= 0 ? 'large_buy' : 'large_sell',
          token: 'ZETA',
          value: Math.abs(change24h) * 100000,
          timestamp: Date.now(),
        });
      }

      if (Math.abs(change24h) >= MONITOR_CONFIG.whaleThresholdPercent) {
        const whaleAlert: WhaleAlert = {
          address: '0xMarketSignal',
          amount: Math.abs(change24h) * 250000,
          token: 'ZETA',
          direction: change24h >= 0 ? 'in' : 'out',
          timestamp: Date.now(),
        };
        setState((prev) => ({ ...prev, whaleAlert }));
      }
    } catch (error) {
      console.error('Failed to monitor large transfers:', error);
    }
  }, [addEvent]);

  const monitorPriceChanges = useCallback(async () => {
    try {
      const symbols = ['ZETA', 'ETH', 'BTC', 'BNB'];
      const responses = await Promise.all(
        symbols.map((symbol) => systemFeatureApi.getPrice(symbol))
      );

      const prices = responses
        .filter((res) => Boolean(res))
        .map((res) => res as any) as Array<{
        symbol: string;
        priceUsd: number;
        change24h?: number;
      }>;

      if (prices.length === 0) return;

      let latestZetaChange = 0;

      prices.forEach((priceData) => {
        const symbol = (priceData.symbol || '').toUpperCase();
        const price = Number(priceData.priceUsd);
        if (!symbol || !Number.isFinite(price) || price <= 0) return;

        const previous = priceHistoryRef.current.get(symbol);
        if (previous && previous > 0) {
          const deltaPercent = ((price - previous) / previous) * 100;
          if (Math.abs(deltaPercent) >= MONITOR_CONFIG.priceAlertThreshold) {
            addEvent({
              type: 'price_change',
              token: symbol,
              value: deltaPercent,
              timestamp: Date.now(),
            });
          }
          if (symbol === 'ZETA') {
            latestZetaChange = deltaPercent;
          }
        } else if (symbol !== 'ZETA') {
          addEvent({
            type: 'new_listing',
            token: symbol,
            value: price,
            timestamp: Date.now(),
          });
        }

        priceHistoryRef.current.set(symbol, price);
      });

      if (latestZetaChange !== 0) {
        setState((prev) => ({ ...prev, priceChange: latestZetaChange }));
      }
    } catch (error) {
      console.error('Failed to monitor price changes:', error);
    }
  }, [addEvent]);

  const monitorGasPrice = useCallback(async () => {
    try {
      const gasPrice = await getGasPriceFromRpc();
      setState((prev) => ({ ...prev, gasPrice }));

      const gasGwei = gasPrice / BigInt(1_000_000_000);
      if (gasGwei >= GAS_ALERT_THRESHOLD_GWEI) {
        addEvent({
          type: 'whale_transfer',
          token: 'GAS',
          value: Number(gasGwei),
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to monitor gas price:', error);
    }
  }, [addEvent]);

  const refresh = useCallback(() => {
    checkApiHealth();
    monitorLargeTransfers();
    monitorPriceChanges();
    monitorGasPrice();
  }, [checkApiHealth, monitorLargeTransfers, monitorPriceChanges, monitorGasPrice]);

  const clearAlerts = useCallback(() => {
    setState((prev) => ({
      ...prev,
      latestEvent: null,
      whaleAlert: null,
      priceChange: 0,
    }));
  }, []);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, MONITOR_CONFIG.pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refresh]);

  return {
    ...state,
    refresh,
    clearAlerts,
  };
}
