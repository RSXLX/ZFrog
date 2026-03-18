import { ReactNode, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, Info, Play, RotateCcw } from 'lucide-react';
import { Button } from './Button';

// Test Result Types
type TestStatus = 'idle' | 'running' | 'passed' | 'failed' | 'skipped';

interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  duration?: number;
  error?: string;
  stackTrace?: string;
}

// Test Runner Component
interface TestRunnerProps {
  tests: Array<{
    name: string;
    test: () => Promise<void> | void;
  }>;
  onComplete?: (results: TestResult[]) => void;
  autoRun?: boolean;
}

export function TestRunner({ tests, onComplete, autoRun = false }: TestRunnerProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const runTests = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    const newResults: TestResult[] = [];

    for (let i = 0; i < tests.length; i++) {
      const { name, test } = tests[i];
      setCurrentTest(name);

      const startTime = Date.now();
      let status: TestStatus = 'passed';
      let error: string | undefined;

      try {
        await Promise.resolve(test());
      } catch (err: any) {
        status = 'failed';
        error = err.message || 'Test failed';
      }

      const duration = Date.now() - startTime;

      const result: TestResult = {
        id: `test-${i}`,
        name,
        status,
        duration,
        error,
      };

      newResults.push(result);
      setResults([...newResults]);
    }

    setIsRunning(false);
    setCurrentTest('');
    onComplete?.(newResults);
  }, [tests, onComplete]);

  // Auto-run on mount if enabled
  useEffect(() => {
    if (autoRun) {
      runTests();
    }
  }, [autoRun, runTests]);

  const passedCount = results.filter((r) => r.status === 'passed').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Test Runner</h3>
          {results.length > 0 && (
            <span className="text-sm text-gray-500">
              ({passedCount}/{results.length} passed)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={runTests}
          disabled={isRunning}
          icon={isRunning ? undefined : <Play size={14} />}
        >
          {isRunning ? 'Running...' : 'Run Tests'}
        </Button>
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Running: {currentTest}</span>
            <span className="text-blue-600">
              {results.length + 1}/{tests.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-blue-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((results.length + 1) / tests.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {results.map((result) => (
          <TestResultItem key={result.id} result={result} />
        ))}

        {results.length === 0 && !isRunning && (
          <div className="px-4 py-8 text-center text-gray-500">
            <Play className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p>Click "Run Tests" to start testing</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {results.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-green-600">
                <Check size={16} />
                {passedCount} passed
              </span>
              {failedCount > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <X size={16} />
                  {failedCount} failed
                </span>
              )}
            </div>
            <span className="text-gray-500">{totalDuration}ms</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Test Result Item
function TestResultItem({ result }: { result: TestResult }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    passed: { icon: Check, color: 'text-green-500', bg: 'bg-green-50' },
    failed: { icon: X, color: 'text-red-500', bg: 'bg-red-50' },
    skipped: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    idle: { icon: Info, color: 'text-gray-400', bg: 'bg-gray-50' },
    running: { icon: LoadingSpinner, color: 'text-blue-500', bg: 'bg-blue-50' },
  };

  const config = statusConfig[result.status] || statusConfig.idle;
  const StatusIcon = config.icon;

  return (
    <div className={`px-4 py-3 ${config.bg}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${config.color}`}>
          <StatusIcon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 truncate">{result.name}</h4>
            {result.duration && (
              <span className="text-xs text-gray-500 ml-2">{result.duration}ms</span>
            )}
          </div>

          {result.error && (
            <div className="mt-2">
              <p className="text-sm text-red-600">{result.error}</p>
              {result.stackTrace && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-1 text-xs text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? 'Hide' : 'Show'} stack trace
                </button>
              )}
              {isExpanded && result.stackTrace && (
                <pre className="mt-2 text-xs text-red-500 overflow-x-auto whitespace-pre-wrap">
                  {result.stackTrace}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple Loading Spinner Component for tests
function LoadingSpinner({ size = 18 }: { size?: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="inline-block"
    >
      <div
        className="rounded-full border-2 border-current border-t-transparent"
        style={{ width: size, height: size }}
      />
    </motion.div>
  );
}