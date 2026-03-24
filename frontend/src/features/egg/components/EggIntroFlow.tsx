import { motion } from 'framer-motion';
import { FrogMint } from '../../../components/frog/FrogMint';
import { useI18n } from '../../../i18n';

interface EggIntroFlowProps {
  onClaimSuccess?: () => void;
}

const steps = ['connect', 'claim', 'journey'] as const;

export function EggIntroFlow({ onClaimSuccess }: EggIntroFlowProps) {
  const { tr } = useI18n();

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-3 sm:grid-cols-3"
      >
        {steps.map((step, index) => (
          <div
            key={step}
            className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left shadow-sm"
          >
            <div className="text-xs font-semibold uppercase text-emerald-700">
              Step {index + 1}
            </div>
            <div className="mt-1 text-sm font-medium text-emerald-900">
              {step === 'connect'
                ? tr('连接钱包', 'Connect Wallet')
                : step === 'claim'
                  ? tr('认领青蛙蛋', 'Claim Egg')
                  : tr('进入主线', 'Enter Main Loop')}
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              {step === 'connect'
                ? tr('完成连接后可执行链上认领。', 'Complete wallet connection before claiming.')
                : step === 'claim'
                  ? tr('给你的青蛙命名并提交交易。', 'Name your frog and confirm the transaction.')
                  : tr(
                      '认领成功后进入 Life / Travel / Memory。',
                      'After claiming, continue to Life / Travel / Memory.'
                    )}
            </p>
          </div>
        ))}
      </motion.div>

      <FrogMint onSuccess={onClaimSuccess} />
    </div>
  );
}

export default EggIntroFlow;
