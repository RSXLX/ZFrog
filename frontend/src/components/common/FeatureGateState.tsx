import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

interface FeatureGateStateProps {
  emoji: string;
  title: string;
  description: string;
  actionLabel: string;
  actionTo: string;
  secondaryLabel?: string;
  secondaryTo?: string;
  className?: string;
}

export function FeatureGateState({
  emoji,
  title,
  description,
  actionLabel,
  actionTo,
  secondaryLabel,
  secondaryTo,
  className = 'min-h-screen bg-gradient-to-b from-sky-200 to-green-200',
}: FeatureGateStateProps) {
  const navigate = useNavigate();

  return (
    <div className={`${className} flex items-center justify-center p-4`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-white/50 bg-white/70 p-8 text-center shadow-xl backdrop-blur"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
          className="mb-5 text-6xl"
        >
          {emoji}
        </motion.div>

        <h2 className="mb-3 text-2xl font-bold text-gray-800">{title}</h2>
        <p className="mb-6 text-gray-600">{description}</p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button variant="primary" onClick={() => navigate(actionTo)}>
            {actionLabel}
          </Button>

          {secondaryLabel && secondaryTo && (
            <Button variant="outline" onClick={() => navigate(secondaryTo)}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default FeatureGateState;
