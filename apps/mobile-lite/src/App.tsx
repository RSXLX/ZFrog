import { FormEvent, useMemo, useState } from 'react';
import {
  AuthNonceResponse,
  CareActionType,
  MobileCouncilBriefPreferencesReadModel,
  MobileCouncilBriefReadModel,
  MobileStatusSnapshot,
  fetchCouncilBriefForMobile,
  fetchCouncilBriefPreferencesForMobile,
  formatMobileLiteError,
  fetchMobileStatusSnapshot,
  getSessionSnapshot,
  issueAuthNonce,
  loginWithWalletSignature,
  runBlessAction,
  runCareAction,
  runRescueAction,
  updateCouncilBriefPreferencesForMobile,
} from './features/mobileLiteApi';
import { clearStoredSession } from './lib/sdk';

type MobileTab = 'login' | 'status' | 'council' | 'care' | 'ritual';

interface EthereumProvider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>;
}

const TAB_ITEMS: Array<{ key: MobileTab; label: string }> = [
  { key: 'login', label: '登录' },
  { key: 'status', label: '状态' },
  { key: 'council', label: '议会周报' },
  { key: 'care', label: '照顾' },
  { key: 'ritual', label: '祈福/救援' },
];

const DEFAULT_WALLET_ADDRESS = '0x0000000000000000000000000000000000000001';

const toPositiveInt = (value: string): number | null => {
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const normalizeWalletAddress = (value: string): string => value.trim().toLowerCase();

const isWalletAddress = (value: string): boolean => /^0x[a-f0-9]{40}$/.test(normalizeWalletAddress(value));

const parseChainId = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
};

const parseThrottleMs = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(parsed) || parsed < 60_000 || parsed > 86_400_000) {
    return undefined;
  }
  return parsed;
};

const readInjectedProvider = (): EthereumProvider | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const maybeProvider = (window as Window & { ethereum?: EthereumProvider }).ethereum;
  if (!maybeProvider || typeof maybeProvider.request !== 'function') {
    return null;
  }

  return maybeProvider;
};

export const App = () => {
  const [activeTab, setActiveTab] = useState<MobileTab>('login');

  const initialSession = useMemo(() => getSessionSnapshot(), []);
  const [session, setSession] = useState(initialSession);

  const [walletInput, setWalletInput] = useState(
    initialSession.walletAddress || DEFAULT_WALLET_ADDRESS
  );
  const [chainIdInput, setChainIdInput] = useState('7001');
  const [noncePayload, setNoncePayload] = useState<AuthNonceResponse | null>(null);
  const [signatureInput, setSignatureInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginResult, setLoginResult] = useState<unknown>(null);
  const [isIssuingNonce, setIsIssuingNonce] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [statusFrogIdInput, setStatusFrogIdInput] = useState('1');
  const [statusWalletInput, setStatusWalletInput] = useState(
    initialSession.walletAddress || DEFAULT_WALLET_ADDRESS
  );
  const [statusSnapshot, setStatusSnapshot] = useState<MobileStatusSnapshot | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const [careFrogIdInput, setCareFrogIdInput] = useState('1');
  const [careFoodType, setCareFoodType] = useState('fly');
  const [careQuantityInput, setCareQuantityInput] = useState('1');
  const [careResult, setCareResult] = useState<unknown>(null);
  const [careError, setCareError] = useState<string | null>(null);
  const [activeCareAction, setActiveCareAction] = useState<CareActionType | null>(null);

  const [blessTargetFrogIdInput, setBlessTargetFrogIdInput] = useState('1');
  const [blessBlresserFrogIdInput, setBlessBlresserFrogIdInput] = useState('1');
  const [blessVerificationId, setBlessVerificationId] = useState('');
  const [rescueTravelIdInput, setRescueTravelIdInput] = useState('1');
  const [rescueFrogIdInput, setRescueFrogIdInput] = useState('1');
  const [rescueVerificationId, setRescueVerificationId] = useState('');
  const [ritualResult, setRitualResult] = useState<unknown>(null);
  const [ritualError, setRitualError] = useState<string | null>(null);
  const [activeRitualAction, setActiveRitualAction] = useState<'bless' | 'rescue' | null>(null);

  const [councilBrief, setCouncilBrief] = useState<MobileCouncilBriefReadModel | null>(null);
  const [councilPreferences, setCouncilPreferences] = useState<MobileCouncilBriefPreferencesReadModel | null>(null);
  const [councilThrottleInput, setCouncilThrottleInput] = useState('900000');
  const [councilError, setCouncilError] = useState<string | null>(null);
  const [isCouncilLoading, setIsCouncilLoading] = useState(false);
  const [isCouncilSaving, setIsCouncilSaving] = useState(false);

  const refreshSession = (): void => {
    const next = getSessionSnapshot();
    setSession(next);
    if (next.walletAddress) {
      setWalletInput(next.walletAddress);
      setStatusWalletInput(next.walletAddress);
    }
  };

  const isLoginWalletValid = isWalletAddress(walletInput);
  const isNonceSubmitDisabled = isIssuingNonce || !isLoginWalletValid;
  const isLoginSubmitDisabled = isLoggingIn || !isLoginWalletValid || signatureInput.trim().length === 0;

  const onIssueNonce = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isNonceSubmitDisabled) {
      return;
    }

    setIsIssuingNonce(true);
    setLoginError(null);

    try {
      const payload = await issueAuthNonce(walletInput);
      setNoncePayload(payload);
      setSignatureInput('');
      setLoginResult(null);
    } catch (error) {
      setLoginError(formatMobileLiteError(error));
      setNoncePayload(null);
    } finally {
      setIsIssuingNonce(false);
    }
  };

  const completeLogin = async (walletAddress: string, signature: string): Promise<void> => {
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const payload = await loginWithWalletSignature({
        walletAddress,
        signature,
        chainId: parseChainId(chainIdInput),
      });
      setLoginResult(payload);
      setNoncePayload(null);
      setSignatureInput('');
      refreshSession();
      setActiveTab('status');
    } catch (error) {
      setLoginResult(null);
      setLoginError(formatMobileLiteError(error));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const onLoginWithSignature = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoginSubmitDisabled) {
      return;
    }

    await completeLogin(walletInput, signatureInput.trim());
  };

  const onSignAndLogin = async (): Promise<void> => {
    const provider = readInjectedProvider();
    if (!provider) {
      setLoginError('No injected wallet provider found. Please use manual signature login.');
      return;
    }
    if (!noncePayload) {
      setLoginError('Please issue nonce before wallet signing.');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[];

      const selectedAddress = normalizeWalletAddress(Array.isArray(accounts) ? accounts[0] || '' : '');
      if (!isWalletAddress(selectedAddress)) {
        throw new Error('Wallet did not return a valid address');
      }

      setWalletInput(selectedAddress);

      const signature = (await provider.request({
        method: 'personal_sign',
        params: [noncePayload.message, selectedAddress],
      })) as string;

      const chainHex = (await provider.request({
        method: 'eth_chainId',
      })) as string;

      if (typeof chainHex === 'string' && chainHex.startsWith('0x')) {
        const chainId = Number.parseInt(chainHex, 16);
        if (Number.isInteger(chainId) && chainId > 0) {
          setChainIdInput(String(chainId));
        }
      }

      setSignatureInput(signature);
      setIsLoggingIn(false);
      await completeLogin(selectedAddress, signature);
    } catch (error) {
      setIsLoggingIn(false);
      setLoginError(formatMobileLiteError(error));
    }
  };

  const onLogout = (): void => {
    clearStoredSession();
    setActiveTab('login');
    refreshSession();
    setNoncePayload(null);
    setSignatureInput('');
    setLoginResult(null);
    setStatusSnapshot(null);
    setRitualResult(null);
    setCareResult(null);
    setCouncilBrief(null);
    setCouncilPreferences(null);
    setCouncilError(null);
  };

  const onLoadStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.isLoggedIn) {
      setStatusError('Please login first.');
      return;
    }
    const frogId = toPositiveInt(statusFrogIdInput);
    const walletAddress = normalizeWalletAddress(statusWalletInput);
    if (!frogId || !isWalletAddress(walletAddress)) {
      setStatusError('frogId / walletAddress is invalid');
      return;
    }

    setIsStatusLoading(true);
    setStatusError(null);

    try {
      const snapshot = await fetchMobileStatusSnapshot({
        frogId,
        walletAddress,
      });
      setStatusSnapshot(snapshot);
    } catch (error) {
      setStatusSnapshot(null);
      setStatusError(formatMobileLiteError(error));
    } finally {
      setIsStatusLoading(false);
    }
  };

  const runCare = async (action: CareActionType): Promise<void> => {
    if (!session.isLoggedIn) {
      setCareError('Please login first.');
      return;
    }
    const frogId = toPositiveInt(careFrogIdInput);
    const quantity = toPositiveInt(careQuantityInput);
    if (!frogId) {
      setCareError('frogId must be a positive integer');
      return;
    }

    setActiveCareAction(action);
    setCareError(null);

    try {
      const result = await runCareAction({
        action,
        frogId,
        ...(action === 'feed'
          ? {
              foodType: careFoodType,
              quantity: quantity ?? 1,
            }
          : {}),
      });
      setCareResult(result);
    } catch (error) {
      setCareResult(null);
      setCareError(formatMobileLiteError(error));
    } finally {
      setActiveCareAction(null);
    }
  };

  const onSubmitBless = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.isLoggedIn) {
      setRitualError('Please login first.');
      return;
    }
    const targetFrogId = toPositiveInt(blessTargetFrogIdInput);
    const blesserFrogId = toPositiveInt(blessBlresserFrogIdInput);
    if (!targetFrogId || !blesserFrogId) {
      setRitualError('targetFrogId and blesserFrogId must be positive integers');
      return;
    }

    setActiveRitualAction('bless');
    setRitualError(null);

    try {
      const result = await runBlessAction({
        targetFrogId,
        blesserFrogId,
        verificationId: blessVerificationId,
      });
      setRitualResult(result);
    } catch (error) {
      setRitualResult(null);
      setRitualError(formatMobileLiteError(error));
    } finally {
      setActiveRitualAction(null);
    }
  };

  const onSubmitRescue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session.isLoggedIn) {
      setRitualError('Please login first.');
      return;
    }
    const travelId = toPositiveInt(rescueTravelIdInput);
    const rescuerFrogId = toPositiveInt(rescueFrogIdInput);
    if (!travelId || !rescuerFrogId) {
      setRitualError('travelId and rescuerFrogId must be positive integers');
      return;
    }

    setActiveRitualAction('rescue');
    setRitualError(null);

    try {
      const result = await runRescueAction({
        travelId,
        rescuerFrogId,
        verificationId: rescueVerificationId,
      });
      setRitualResult(result);
    } catch (error) {
      setRitualResult(null);
      setRitualError(formatMobileLiteError(error));
    } finally {
      setActiveRitualAction(null);
    }
  };

  const onLoadCouncilPreferences = async (): Promise<void> => {
    if (!session.isLoggedIn) {
      setCouncilError('Please login first.');
      return;
    }

    setIsCouncilLoading(true);
    setCouncilError(null);
    try {
      const nextPreferences = await fetchCouncilBriefPreferencesForMobile();
      setCouncilPreferences(nextPreferences);
      setCouncilThrottleInput(String(nextPreferences.throttleMs));
    } catch (error) {
      setCouncilError(formatMobileLiteError(error));
    } finally {
      setIsCouncilLoading(false);
    }
  };

  const onLoadCouncilBrief = async (): Promise<void> => {
    if (!session.isLoggedIn) {
      setCouncilError('Please login first.');
      return;
    }

    setIsCouncilLoading(true);
    setCouncilError(null);
    try {
      const brief = await fetchCouncilBriefForMobile();
      setCouncilBrief(brief);
    } catch (error) {
      setCouncilBrief(null);
      setCouncilError(formatMobileLiteError(error));
    } finally {
      setIsCouncilLoading(false);
    }
  };

  const onToggleCouncilBrief = async (): Promise<void> => {
    if (!session.isLoggedIn) {
      setCouncilError('Please login first.');
      return;
    }

    const currentEnabled = councilPreferences?.channels.mobileLite ?? true;
    const throttleMs = parseThrottleMs(councilThrottleInput);
    if (councilThrottleInput.trim().length > 0 && !throttleMs) {
      setCouncilError('Throttle must be 60000 - 86400000 milliseconds');
      return;
    }

    setIsCouncilSaving(true);
    setCouncilError(null);
    try {
      const nextPreferences = await updateCouncilBriefPreferencesForMobile({
        mobileLiteEnabled: !currentEnabled,
        ...(typeof throttleMs === 'number' ? { throttleMs } : {}),
      });
      setCouncilPreferences(nextPreferences);
      setCouncilThrottleInput(String(nextPreferences.throttleMs));
    } catch (error) {
      setCouncilError(formatMobileLiteError(error));
    } finally {
      setIsCouncilSaving(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">ZFrog V2-W10-02</p>
        <h1>Mobile Lite MVP</h1>
        <p className="subtitle">登录、状态、议会周报、照顾、祈福/救援五页闭环。</p>
      </section>

      <section className="panel">
        <div className="tab-row">
          {TAB_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === activeTab ? 'tab-button active' : 'tab-button'}
              onClick={() => setActiveTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="session-strip">
          <div>
            <strong>Session</strong>
            <p>{session.isLoggedIn ? `Logged in: ${session.walletAddress}` : 'Not logged in'}</p>
            <p className="muted">Token: {session.tokenPreview}</p>
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={onLogout}
            disabled={!session.isLoggedIn}
          >
            Logout
          </button>
        </div>

        {activeTab === 'login' ? (
          <div className="stack">
            <h2>登录页</h2>
            <p className="panel-caption">Challenge 登录：先拿 nonce，再签名提交。</p>

            <form onSubmit={onIssueNonce} className="form-grid">
              <label>
                Wallet Address
                <input
                  type="text"
                  value={walletInput}
                  onChange={(event) => setWalletInput(event.target.value)}
                  placeholder="0x..."
                />
              </label>
              <label>
                Chain ID (optional)
                <input
                  type="number"
                  min={1}
                  value={chainIdInput}
                  onChange={(event) => setChainIdInput(event.target.value)}
                />
              </label>
              <button type="submit" disabled={isNonceSubmitDisabled}>
                {isIssuingNonce ? 'Issuing...' : 'Issue Nonce'}
              </button>
            </form>

            {noncePayload ? (
              <article>
                <h3>Nonce Challenge</h3>
                <p className="muted">Expires: {noncePayload.expiresAt}</p>
                <pre>{noncePayload.message}</pre>
                <button type="button" onClick={onSignAndLogin} disabled={isLoggingIn}>
                  {isLoggingIn ? 'Signing...' : 'Sign With Wallet + Login'}
                </button>
              </article>
            ) : null}

            <form onSubmit={onLoginWithSignature} className="form-grid">
              <label className="full-span">
                Signature (manual fallback)
                <textarea
                  value={signatureInput}
                  onChange={(event) => setSignatureInput(event.target.value)}
                  placeholder="0x..."
                  rows={4}
                />
              </label>
              <button type="submit" disabled={isLoginSubmitDisabled}>
                {isLoggingIn ? 'Logging in...' : 'Login With Signature'}
              </button>
            </form>

            {loginError ? <p className="error-banner">{loginError}</p> : null}
            {loginResult ? (
              <article>
                <h3>Login Result</h3>
                <pre>{JSON.stringify(loginResult, null, 2)}</pre>
              </article>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'status' ? (
          <div className="stack">
            <h2>状态页</h2>
            <p className="panel-caption">读取 auth/me、life、travel stats、social status。</p>
            <form onSubmit={onLoadStatus} className="form-grid">
              <label>
                Frog ID
                <input
                  type="number"
                  min={1}
                  value={statusFrogIdInput}
                  onChange={(event) => setStatusFrogIdInput(event.target.value)}
                />
              </label>
              <label>
                Wallet Address
                <input
                  type="text"
                  value={statusWalletInput}
                  onChange={(event) => setStatusWalletInput(event.target.value)}
                />
              </label>
              <button type="submit" disabled={isStatusLoading || !session.isLoggedIn}>
                {isStatusLoading ? 'Loading...' : 'Refresh Snapshot'}
              </button>
            </form>

            {statusError ? <p className="error-banner">{statusError}</p> : null}
            {statusSnapshot ? (
              <div className="result-stack">
                <article>
                  <h3>Auth / Me</h3>
                  <pre>{JSON.stringify(statusSnapshot.authMe, null, 2)}</pre>
                </article>
                <article>
                  <h3>Life</h3>
                  <pre>{JSON.stringify(statusSnapshot.life, null, 2)}</pre>
                </article>
                <article>
                  <h3>Travel Stats</h3>
                  <pre>{JSON.stringify(statusSnapshot.travelStats, null, 2)}</pre>
                </article>
                <article>
                  <h3>Social Status</h3>
                  <pre>{JSON.stringify(statusSnapshot.socialStatus, null, 2)}</pre>
                </article>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'council' ? (
          <div className="stack">
            <h2>议会周报页</h2>
            <p className="panel-caption">V3 council brief：移动端拉取周报 + 通知开关 + 节流配置。</p>
            <div className="form-grid">
              <label>
                Mobile Throttle (ms)
                <input
                  type="number"
                  min={60000}
                  max={86400000}
                  value={councilThrottleInput}
                  onChange={(event) => setCouncilThrottleInput(event.target.value)}
                />
              </label>
            </div>

            <div className="action-grid">
              <button
                type="button"
                disabled={isCouncilLoading || !session.isLoggedIn}
                onClick={() => {
                  void onLoadCouncilPreferences();
                }}
              >
                {isCouncilLoading ? 'Loading...' : 'Load Preferences'}
              </button>
              <button
                type="button"
                disabled={isCouncilSaving || !session.isLoggedIn}
                onClick={() => {
                  void onToggleCouncilBrief();
                }}
              >
                {isCouncilSaving
                  ? 'Saving...'
                  : councilPreferences?.channels.mobileLite === false
                    ? 'Enable Mobile Brief'
                    : 'Disable Mobile Brief'}
              </button>
              <button
                type="button"
                disabled={isCouncilLoading || !session.isLoggedIn}
                onClick={() => {
                  void onLoadCouncilBrief();
                }}
              >
                {isCouncilLoading ? 'Loading...' : 'Fetch Weekly Brief'}
              </button>
            </div>

            {councilError ? <p className="error-banner">{councilError}</p> : null}
            {councilPreferences ? (
              <article>
                <h3>Council Brief Preferences</h3>
                <pre>{JSON.stringify(councilPreferences, null, 2)}</pre>
              </article>
            ) : null}
            {councilBrief ? (
              <article>
                <h3>Council Brief</h3>
                <pre>{JSON.stringify(councilBrief, null, 2)}</pre>
              </article>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'care' ? (
          <div className="stack">
            <h2>照顾页</h2>
            <p className="panel-caption">
              快捷照顾动作（feed/clean/play/heal/rest）带防重入与短冷却。
            </p>
            <div className="form-grid">
              <label>
                Frog ID
                <input
                  type="number"
                  min={1}
                  value={careFrogIdInput}
                  onChange={(event) => setCareFrogIdInput(event.target.value)}
                />
              </label>
              <label>
                Feed Food Type
                <input
                  type="text"
                  value={careFoodType}
                  onChange={(event) => setCareFoodType(event.target.value)}
                />
              </label>
              <label>
                Feed Quantity
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={careQuantityInput}
                  onChange={(event) => setCareQuantityInput(event.target.value)}
                />
              </label>
            </div>

            <div className="action-grid">
              <button
                type="button"
                disabled={Boolean(activeCareAction) || !session.isLoggedIn}
                onClick={() => {
                  void runCare('feed');
                }}
              >
                {activeCareAction === 'feed' ? 'Running...' : 'Feed'}
              </button>
              <button
                type="button"
                disabled={Boolean(activeCareAction) || !session.isLoggedIn}
                onClick={() => {
                  void runCare('clean');
                }}
              >
                {activeCareAction === 'clean' ? 'Running...' : 'Clean'}
              </button>
              <button
                type="button"
                disabled={Boolean(activeCareAction) || !session.isLoggedIn}
                onClick={() => {
                  void runCare('play');
                }}
              >
                {activeCareAction === 'play' ? 'Running...' : 'Play'}
              </button>
              <button
                type="button"
                disabled={Boolean(activeCareAction) || !session.isLoggedIn}
                onClick={() => {
                  void runCare('heal');
                }}
              >
                {activeCareAction === 'heal' ? 'Running...' : 'Heal'}
              </button>
              <button
                type="button"
                disabled={Boolean(activeCareAction) || !session.isLoggedIn}
                onClick={() => {
                  void runCare('startRest');
                }}
              >
                {activeCareAction === 'startRest' ? 'Running...' : 'Start Rest'}
              </button>
              <button
                type="button"
                disabled={Boolean(activeCareAction) || !session.isLoggedIn}
                onClick={() => {
                  void runCare('endRest');
                }}
              >
                {activeCareAction === 'endRest' ? 'Running...' : 'End Rest'}
              </button>
            </div>

            {careError ? <p className="error-banner">{careError}</p> : null}
            {careResult ? (
              <article>
                <h3>Care Result</h3>
                <pre>{JSON.stringify(careResult, null, 2)}</pre>
              </article>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'ritual' ? (
          <div className="stack">
            <h2>祈福 / 救援页</h2>
            <p className="panel-caption">祈福和救援均要求 verificationId，失败会返回标准错误码。</p>

            <form onSubmit={onSubmitBless} className="form-grid">
              <label>
                Bless Target Frog ID
                <input
                  type="number"
                  min={1}
                  value={blessTargetFrogIdInput}
                  onChange={(event) => setBlessTargetFrogIdInput(event.target.value)}
                />
              </label>
              <label>
                Blesser Frog ID
                <input
                  type="number"
                  min={1}
                  value={blessBlresserFrogIdInput}
                  onChange={(event) => setBlessBlresserFrogIdInput(event.target.value)}
                />
              </label>
              <label className="full-span">
                Bless Verification ID
                <input
                  type="text"
                  value={blessVerificationId}
                  onChange={(event) => setBlessVerificationId(event.target.value)}
                  placeholder="worldid-proof-..."
                />
              </label>
              <button type="submit" disabled={Boolean(activeRitualAction) || !session.isLoggedIn}>
                {activeRitualAction === 'bless' ? 'Submitting...' : 'Submit Bless'}
              </button>
            </form>

            <form onSubmit={onSubmitRescue} className="form-grid">
              <label>
                Rescue Travel ID
                <input
                  type="number"
                  min={1}
                  value={rescueTravelIdInput}
                  onChange={(event) => setRescueTravelIdInput(event.target.value)}
                />
              </label>
              <label>
                Rescuer Frog ID
                <input
                  type="number"
                  min={1}
                  value={rescueFrogIdInput}
                  onChange={(event) => setRescueFrogIdInput(event.target.value)}
                />
              </label>
              <label className="full-span">
                Rescue Verification ID
                <input
                  type="text"
                  value={rescueVerificationId}
                  onChange={(event) => setRescueVerificationId(event.target.value)}
                  placeholder="worldid-proof-..."
                />
              </label>
              <button type="submit" disabled={Boolean(activeRitualAction) || !session.isLoggedIn}>
                {activeRitualAction === 'rescue' ? 'Submitting...' : 'Submit Rescue'}
              </button>
            </form>

            {ritualError ? <p className="error-banner">{ritualError}</p> : null}
            {ritualResult ? (
              <article>
                <h3>Ritual Result</h3>
                <pre>{JSON.stringify(ritualResult, null, 2)}</pre>
              </article>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
};
