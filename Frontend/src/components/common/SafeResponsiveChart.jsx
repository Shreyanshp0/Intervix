import { useEffect, useRef, useState } from 'react';
import { recordDiagnostic } from '../../utils/diagnostics';

const SafeResponsiveChart = ({ children, minHeight = 260, minWidth = 280, className = '' }) => {
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

  const ready = size.width >= minWidth && size.height >= minHeight;

  return (
    <div ref={containerRef} className={className || 'h-full w-full'} style={{ minHeight, minWidth: 0 }}>
      {ready ? children : (
        <div className="flex h-full min-h-[220px] items-center justify-center text-xs text-gray-500">
          Preparing chart...
        </div>
      )}
    </div>
  );
};

export default SafeResponsiveChart;
