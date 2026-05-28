import { useEffect, useRef, useState } from 'react';
import { recordDiagnostic } from '../../utils/diagnostics';

const SafeResponsiveChart = ({ children, minHeight = 260, minWidth = 0, className = '' }) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const update = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      setSize({ width, height });

      if (width < 1 || height < 1) {
        recordDiagnostic('CHART_RENDER', {
          level: 'warn',
          message: 'Chart container not ready',
          width,
          height
        });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Relax checking to simply ensure we have non-zero dimensions to render Recharts ResponsiveContainer
  const ready = size.width > 0 && size.height > 0;

  return (
    <div 
      ref={containerRef} 
      className={`${className} w-full`} 
      style={{ 
        width: '100%', 
        height: `${minHeight}px`, 
        minHeight: `${minHeight}px`, 
        minWidth: '0px', 
        position: 'relative' 
      }}
    >
      {ready ? children : (
        <div className="flex w-full items-center justify-center text-xs text-gray-500" style={{ height: `${minHeight}px` }}>
          Preparing chart...
        </div>
      )}
    </div>
  );
};

export default SafeResponsiveChart;
