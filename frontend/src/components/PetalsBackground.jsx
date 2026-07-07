import { useEffect, useState } from 'react';

function PetalsBackground() {
  const [petals, setPetals] = useState([]);

  useEffect(() => {
    // Generate 60 diverse petals
    const newPetals = Array.from({ length: 60 }).map((_, i) => {
      // 3 types of petals: rose (round), cherry blossom (slight oval), small petal
      const type = Math.random();
      let borderRadius = '150% 0 150% 0'; // default cherry blossom shape
      let background = 'linear-gradient(135deg, #f43f5e 0%, #fda4af 100%)'; // default pink/red
      let sizeBase = 10;

      if (type > 0.7) {
        // Rose petal - rounder
        borderRadius = '50% 0 50% 50%';
        background = 'linear-gradient(135deg, #fb7185 0%, #ffe4e6 100%)';
        sizeBase = 14;
      } else if (type < 0.3) {
        // Light pink tiny petal
        borderRadius = '150% 20% 150% 20%';
        background = 'linear-gradient(135deg, #fecdd3 0%, #fff1f2 100%)';
        sizeBase = 6;
      }

      return {
        id: i,
        left: Math.random() * 100 + 'vw',
        animationDurationFall: Math.random() * 8 + 6 + 's', // 6-14s
        animationDurationSway: Math.random() * 4 + 3 + 's', // 3-7s
        animationDelay: Math.random() * 15 + 's',
        width: Math.random() * 10 + sizeBase + 'px',
        height: Math.random() * 10 + sizeBase + 'px',
        opacity: Math.random() * 0.4 + 0.3,
        borderRadius,
        background
      };
    });
    setPetals(newPetals);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: -1, overflow: 'hidden' }}>
      {petals.map(p => (
        <div
          key={p.id}
          className="petal"
          style={{
            left: p.left,
            width: p.width,
            height: p.height,
            animationDuration: `${p.animationDurationFall}, ${p.animationDurationSway}`,
            animationDelay: `${p.animationDelay}, ${p.animationDelay}`,
            opacity: p.opacity,
            borderRadius: p.borderRadius,
            background: p.background
          }}
        />
      ))}
    </div>
  );
}

export default PetalsBackground;
