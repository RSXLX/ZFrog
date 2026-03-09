/**
 * Code Quality Checker
 * Analyzes code quality and provides recommendations
 */

interface CodeQualityReport {
  score: number;
  issues: CodeIssue[];
  recommendations: string[];
}

interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  file?: string;
}

export class CodeQualityChecker {
  private issues: CodeIssue[] = [];
  private recommendations: string[] = [];

  /**
   * Analyze code quality
   */
  analyze(code: string, filename: string): CodeQualityReport {
    this.issues = [];
    this.recommendations = [];

    this.checkTypeScriptBestPractices(code, filename);
    this.checkPerformanceIssues(code, filename);
    this.checkSecurityIssues(code, filename);
    this.checkMaintainability(code, filename);

    const score = this.calculateScore();

    return {
      score,
      issues: this.issues,
      recommendations: this.recommendations,
    };
  }

  /**
   * Check TypeScript best practices
   */
  private checkTypeScriptBestPractices(code: string, filename: string): void {
    // Check for explicit return types
    if (code.includes('function') && !code.includes(':')) {
      this.issues.push({
        type: 'warning',
        message: 'Consider adding explicit return types to functions',
        file: filename,
      });
    }

    // Check for 'any' usage
    const anyMatches = code.match(/:\s*any/g);
    if (anyMatches && anyMatches.length > 0) {
      this.issues.push({
        type: 'warning',
        message: `Found ${anyMatches.length} uses of 'any'. Consider using more specific types.`,
        file: filename,
      });
    }

    // Check for non-null assertions
    const nonNullMatches = code.match(/!/g);
    if (nonNullMatches && nonNullMatches.length > 5) {
      this.issues.push({
        type: 'info',
        message: 'Multiple non-null assertions detected. Ensure null safety.',
        file: filename,
      });
    }
  }

  /**
   * Check for performance issues
   */
  private checkPerformanceIssues(code: string, filename: string): void {
    // Check for useEffect without dependency array
    if (code.includes('useEffect') && !code.includes('useEffect(() => {}, []')) {
      const useEffectMatches = code.match(/useEffect\(/g);
      if (useEffectMatches && useEffectMatches.length > 3) {
        this.issues.push({
          type: 'warning',
          message: 'Multiple useEffect hooks detected. Consider combining or optimizing.',
          file: filename,
        });
      }
    }

    // Check for inline function definitions in render
    if (code.includes('onClick={() =>') || code.includes('onChange={() =>')) {
      const inlineFunctions = code.match(/on\w+={\s*\(\)\s*=>/g);
      if (inlineFunctions && inlineFunctions.length > 5) {
        this.issues.push({
          type: 'warning',
          message: 'Multiple inline function definitions. Consider using useCallback.',
          file: filename,
        });
      }
    }

    // Check for large component size
    const lines = code.split('\n').length;
    if (lines > 300) {
      this.issues.push({
        type: 'warning',
        message: `Large component (${lines} lines). Consider breaking into smaller components.`,
        file: filename,
      });
    }
  }

  /**
   * Check for security issues
   */
  private checkSecurityIssues(code: string, filename: string): void {
    // Check for eval usage
    if (code.includes('eval(')) {
      this.issues.push({
        type: 'error',
        message: 'Dangerous eval() detected. Use safer alternatives.',
        file: filename,
      });
    }

    // Check for innerHTML usage
    if (code.includes('innerHTML')) {
      this.issues.push({
        type: 'warning',
        message: 'innerHTML usage detected. Ensure input sanitization.',
        file: filename,
      });
    }

    // Check for hardcoded secrets (basic check)
    const secretPatterns = [
      /password\s*=\s*["'][^"']+["']/i,
      /api[_-]?key\s*=\s*["'][^"']+["']/i,
      /secret\s*=\s*["'][^"']+["']/i,
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(code)) {
        this.issues.push({
          type: 'error',
          message: 'Potential hardcoded secret detected. Use environment variables.',
          file: filename,
        });
        break;
      }
    }
  }

  /**
   * Check for maintainability issues
   */
  private checkMaintainability(code: string, filename: string): void {
    // Check for TODO comments
    const todoMatches = code.match(/TODO|FIXME|XXX|HACK/gi);
    if (todoMatches && todoMatches.length > 0) {
      this.issues.push({
        type: 'info',
        message: `Found ${todoMatches.length} TODO/FIXME comments.`,
        file: filename,
      });
    }

    // Check for console statements
    const consoleMatches = code.match(/console\.(log|warn|error|info)/g);
    if (consoleMatches && consoleMatches.length > 3) {
      this.issues.push({
        type: 'warning',
        message: `Found ${consoleMatches.length} console statements. Consider using a logger.`,
        file: filename,
      });
    }

    // Check for duplicated code (basic check)
    const lines = code.split('\n');
    const duplicateThreshold = 5;
    const duplicates: string[] = [];

    for (let i = 0; i < lines.length - duplicateThreshold; i++) {
      const chunk = lines.slice(i, i + duplicateThreshold).join('\n');
      const restOfCode = lines.slice(i + duplicateThreshold).join('\n');
      
      if (restOfCode.includes(chunk) && !duplicates.includes(chunk)) {
        duplicates.push(chunk);
      }
    }

    if (duplicates.length > 0) {
      this.issues.push({
        type: 'warning',
        message: `Found ${duplicates.length} potential code duplications. Consider refactoring.`,
        file: filename,
      });
    }

    // Add recommendations
    this.recommendations.push(
      'Consider adding JSDoc comments to public functions',
      'Use ESLint with stricter rules',
      'Add pre-commit hooks for code quality',
      'Consider implementing Storybook for component documentation',
      'Add performance budgets to CI/CD'
    );
  }

  /**
   * Calculate overall quality score
   */
  private calculateScore(): number {
    const errors = this.issues.filter(i => i.type === 'error').length;
    const warnings = this.issues.filter(i => i.type === 'warning').length;
    const infos = this.issues.filter(i => i.type === 'info').length;

    // Scoring formula
    let score = 100;
    score -= errors * 10;      // -10 per error
    score -= warnings * 3;     // -3 per warning
    score -= infos * 1;      // -1 per info

    return Math.max(0, Math.min(100, score));
  }
}

// Export singleton instance
export const codeQualityChecker = new CodeQualityChecker();

// Export types
export type { CodeQualityReport, CodeIssue };

// Default export
export default codeQualityChecker;
