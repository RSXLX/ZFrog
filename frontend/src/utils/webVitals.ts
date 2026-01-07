// frontend/src/utils/webVitals.ts
/**
 * Web Vitals 性能监控工具
 * 用于监控 LCP, CLS, FID, INP, TTFB 等关键指标
 */

// import { onCLS, onFID, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

interface VitalsReport {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// ... internal functions commented out or unused ...

type ReportHandler = (report: VitalsReport) => void;

/**
 * 初始化 Web Vitals 监控
 * @param onReport 自定义报告处理函数
 * @param enableAnalytics 是否发送到分析服务
 */
export function initWebVitals(
  onReport?: ReportHandler,
  enableAnalytics = false
): void {
  console.log('Web Vitals monitoring disabled temporarily for build debugging');
  // const handleMetric = (metric: Metric) => { ... }
  // onCLS(handleMetric);
  // ...
}

export function getPerformanceSummary(): Record<string, number> {
    return {};
}

export type { VitalsReport, ReportHandler };
