import { useState, useLayoutEffect, RefObject } from 'react';

interface Size {
  width: number;
  height: number;
}

export const useResizeObserver = (ref: RefObject<HTMLElement>): Size => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(entries => {
      // Hanya proses entri pertama karena kita hanya mengamati satu elemen
      if (!entries || entries.length === 0) {
        return;
      }
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });

    observer.observe(element);

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return size;
};