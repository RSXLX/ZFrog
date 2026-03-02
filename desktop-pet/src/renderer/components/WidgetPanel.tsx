import React from 'react';
import { motion } from 'framer-motion';

interface WidgetPanelProps {
  widgets: { id: string; name: string; icon: string; enabled: boolean }[];
}

const WidgetPanel: React.FC<WidgetPanelProps> = ({ widgets }) => {
  const enabledWidgets = widgets.filter(w => w.enabled);

  return (
    <div style={{ position: 'absolute', top: 40, right: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {enabledWidgets.map(widget => (
        <WidgetItem key={widget.id} widget={widget} />
      ))}
    </div>
  );
};

const WidgetItem: React.FC<{ widget: { id: string; name: string; icon: string } }> = ({ widget }) => {
  const [showContent, setShowContent] = React.useState(false);

  const renderContent = () => {
    switch (widget.id) {
      case 'clock':
        return <ClockWidget />;
      case 'weather':
        return <WeatherWidget />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ position: 'relative' }}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        onClick={() => setShowContent(!showContent)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 16,
        }}
        title={widget.name}
      >
        {widget.icon}
      </motion.div>
      
      {showContent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute',
            top: 40,
            right: 0,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 12,
            padding: 12,
            minWidth: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
          }}
        >
          {renderContent()}
        </motion.div>
      )}
    </motion.div>
  );
};

const ClockWidget = () => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' }}>
        {time.toLocaleTimeString()}
      </div>
      <div style={{ fontSize: 12, color: '#666' }}>
        {time.toLocaleDateString()}
      </div>
    </div>
  );
};

const WeatherWidget = () => {
  const [weather] = React.useState({ temp: 22, condition: '☀️' });

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 28 }}>{weather.condition}</div>
      <div style={{ fontSize: 18, fontWeight: 'bold' }}>{weather.temp}°C</div>
      <div style={{ fontSize: 11, color: '#666' }}>上海</div>
    </div>
  );
};

export default WidgetPanel;
