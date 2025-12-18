import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '../common/Button';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 hidden sm:inline">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnect()}
        >
          断开连接
        </Button>
      </div>
    );
  }
  
  return (
    <Button
      onClick={() => connect({ connector: connectors[0] })}
      loading={isPending}
      size="sm"
    >
      连接钱包
    </Button>
  );
}
