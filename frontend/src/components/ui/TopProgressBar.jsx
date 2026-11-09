import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function TopProgressBar() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // On route change, trigger progress animation
    setVisible(true);
    setProgress(30);

    const t1 = setTimeout(() => {
      setProgress(75);
    }, 120);

    const t2 = setTimeout(() => {
      setProgress(100);
    }, 280);

    const t3 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [location.pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none overflow-hidden bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(34,211,238,0.8)]"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}

