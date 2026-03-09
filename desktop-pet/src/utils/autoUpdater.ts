/**
 * Auto Updater
 * Automatic update checking and installation
 */

interface VersionInfo {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  releaseNotes: string;
  mandatory: boolean;
}

interface UpdateConfig {
  checkInterval: number; // milliseconds
  autoDownload: boolean;
  autoInstall: boolean;
  allowPrerelease: boolean;
}

export class AutoUpdater {
  private config: UpdateConfig;
  private currentVersion: string;
  private lastCheck: number = 0;
  private checkIntervalId: NodeJS.Timeout | null = null;
  private onUpdateAvailableCallbacks: ((version: VersionInfo) => void)[] = [];
  private onUpdateDownloadedCallbacks: ((version: VersionInfo) => void)[] = [];
  private onUpdateInstalledCallbacks: ((version: VersionInfo) => void)[] = [];

  constructor(config: Partial<UpdateConfig> = {}) {
    this.config = {
      checkInterval: 24 * 60 * 60 * 1000, // 24 hours
      autoDownload: true,
      autoInstall: false,
      allowPrerelease: false,
      ...config,
    };
    
    this.currentVersion = this.getCurrentVersion();
  }

  /**
   * Get current app version
   */
  private getCurrentVersion(): string {
    // In production, this would read from package.json or app metadata
    return process.env.npm_package_version || '1.0.0';
  }

  /**
   * Start automatic update checking
   */
  start(): void {
    if (this.checkIntervalId) {
      return; // Already started
    }

    // Check immediately on start
    this.checkForUpdates();

    // Schedule periodic checks
    this.checkIntervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkInterval);

    console.log('[AutoUpdater] Started');
  }

  /**
   * Stop automatic update checking
   */
  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      console.log('[AutoUpdater] Stopped');
    }
  }

  /**
   * Check for available updates
   */
  async checkForUpdates(): Promise<VersionInfo | null> {
    try {
      const now = Date.now();
      
      // Rate limiting - don't check too frequently
      if (now - this.lastCheck < 60000) { // 1 minute minimum
        return null;
      }
      
      this.lastCheck = now;

      // In production, this would call your update server
      // For demo, simulating an update check
      const latestVersion = await this.fetchLatestVersion();
      
      if (!latestVersion) {
        return null;
      }

      // Compare versions
      if (this.isNewerVersion(latestVersion.version, this.currentVersion)) {
        console.log(`[AutoUpdater] Update available: ${latestVersion.version}`);
        
        // Notify listeners
        this.onUpdateAvailableCallbacks.forEach(callback => {
          try {
            callback(latestVersion);
          } catch (error) {
            console.error('[AutoUpdater] Error in update available callback:', error);
          }
        });

        // Auto-download if enabled
        if (this.config.autoDownload) {
          this.downloadUpdate(latestVersion);
        }

        return latestVersion;
      }

      return null;
    } catch (error) {
      console.error('[AutoUpdater] Error checking for updates:', error);
      return null;
    }
  }

  /**
   * Fetch latest version info from server
   */
  private async fetchLatestVersion(): Promise<VersionInfo | null> {
    // In production, this would make an actual API call
    // For demo purposes, simulating a response
    
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate no update available (return null)
      // In production, this would parse the actual response
      return null;
      
      /* Example of what would be returned if update available:
      return {
        version: '1.1.0',
        releaseDate: '2026-03-06',
        downloadUrl: 'https://example.com/update.zip',
        releaseNotes: 'New features and bug fixes',
        mandatory: false,
      };
      */
    } catch (error) {
      console.error('[AutoUpdater] Error fetching version:', error);
      return null;
    }
  }

  /**
   * Compare version strings
   */
  private isNewerVersion(newVersion: string, currentVersion: string): boolean {
    const parseVersion = (v: string) => v.split('.').map(Number);
    
    const newParts = parseVersion(newVersion);
    const currentParts = parseVersion(currentVersion);
    
    for (let i = 0; i < Math.max(newParts.length, currentParts.length); i++) {
      const newPart = newParts[i] || 0;
      const currentPart = currentParts[i] || 0;
      
      if (newPart > currentPart) {
        return true;
      } else if (newPart < currentPart) {
        return false;
      }
    }
    
    return false; // Versions are equal
  }

  /**
   * Download update
   */
  private async downloadUpdate(versionInfo: VersionInfo): Promise<void> {
    try {
      console.log(`[AutoUpdater] Downloading update ${versionInfo.version}...`);
      
      // In production, this would download the actual update file
      // For demo, simulating download
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`[AutoUpdater] Update ${versionInfo.version} downloaded`);
      
      // Notify listeners
      this.onUpdateDownloadedCallbacks.forEach(callback => {
        try {
          callback(versionInfo);
        } catch (error) {
          console.error('[AutoUpdater] Error in update downloaded callback:', error);
        }
      });
      
      // Auto-install if enabled
      if (this.config.autoInstall) {
        this.installUpdate(versionInfo);
      }
    } catch (error) {
      console.error('[AutoUpdater] Error downloading update:', error);
    }
  }

  /**
   * Install update
   */
  private async installUpdate(versionInfo: VersionInfo): Promise<void> {
    try {
      console.log(`[AutoUpdater] Installing update ${versionInfo.version}...`);
      
      // In production, this would install the actual update
      // For demo, simulating installation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log(`[AutoUpdater] Update ${versionInfo.version} installed`);
      
      // Notify listeners
      this.onUpdateInstalledCallbacks.forEach(callback => {
        try {
          callback(versionInfo);
        } catch (error) {
          console.error('[AutoUpdater] Error in update installed callback:', error);
        }
      });
      
      // Restart app (in production)
      // window.location.reload();
    } catch (error) {
      console.error('[AutoUpdater] Error installing update:', error