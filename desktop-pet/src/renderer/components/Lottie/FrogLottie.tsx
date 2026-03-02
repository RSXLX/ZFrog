import React from 'react';
import Lottie from 'lottie-react';

// Placeholder Lottie data - in production, these would be actual animation files
// This is a minimal valid Lottie JSON structure
const idleAnimation = {
  v: "5.5.7",
  fr: 30,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: "idle",
  ddd: 0,
  assets: [],
  layers: [{
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: "body",
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: { a: 0, k: 0 },
      p: { a: 1, k: [{ i: {x: 0.667, y: 1}, o: {x: 0.333, y: 0}, t: 0, s: [100, 100, 0] }, { i: {x: 0.667, y: 1}, o: {x: 0.333, y: 0}, t: 30, s: [100, 103, 0] }, { t: 60, s: [100, 100, 0] }] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 0, k: [100, 100, 100] }
    },
    ao: 0,
    shapes: [{
      ty: "el",
      p: { a: 0, k: [0, 0] },
      s: { a: 0, k: [80, 80] },
      nm: "ellipse"
    }, {
      ty: "fl",
      c: { a: 0, k: [0.29, 0.87, 0.5, 1] },
      o: { a: 0, k: 100 },
      nm: "fill"
    }],
    ip: 0,
    op: 60,
    st: 0
  }]
};

// More complex animations would be loaded from external JSON files
interface FrogLottieProps {
  animationType: 'idle' | 'happy' | 'excited' | 'sleeping' | 'eating' | 'dancing';
  loop?: boolean;
  autoplay?: boolean;
}

const FrogLottie: React.FC<FrogLottieProps> = ({ 
  animationType = 'idle', 
  loop = true, 
  autoplay = true 
}) => {
  // In production, you would load different animation files based on type
  // For now, we use a simple placeholder
  return (
    <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Lottie 
        animationData={idleAnimation}
        loop={loop}
        autoplay={autoplay}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default FrogLottie;
