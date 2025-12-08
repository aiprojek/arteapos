
import React, { useRef, useLayoutEffect, useState, useCallback } from 'react';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { FixedSizeList } from 'react-window';

interface Column<T> {
  label: string;
  render: (item: T) => React.ReactNode;
  width: string; // e.g., '1fr', '150px'
  className?: string; // Allow custom classes for cells (e.g., overflow-visible)
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  rowHeight: number;
}

const VirtualizedTable = <T extends { id: string | number }>({ data, columns, rowHeight }: VirtualizedTableProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(containerRef);

  const gridTemplateColumns = columns.map(c => c.width).join(' ');

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = data[index];
    return (
      <div 
        style={style} 
        className="flex items-center text-sm border-b border-slate-700 hover:bg-slate-700/50"
        role="row"
      >
        {columns.map((col, colIndex) => (
          <div 
            key={colIndex} 
            className={`px-3 py-2 text-slate-300 ${col.className ?? 'overflow-hidden truncate'}`}
            style={{ flex: col.width.endsWith('fr') ? col.width.replace('fr', '') : `0 0 ${col.width}`}}
            role="gridcell"
          >
            {col.render(item)}
          </div>
        ))}
      </div>
    );
  }, [data, columns, gridTemplateColumns]);
  
  // FIX: FixedSizeList onScroll passes an object { scrollOffset, ... }, not a UIEvent.
  const handleScroll = ({ scrollOffset }: { scrollOffset: number }) => {
    if (headerRef.current) {
        headerRef.current.scrollLeft = scrollOffset;
    }
  };


  return (
    <div ref={containerRef} className="w-full h-full flex flex-col" role="grid">
      <div ref={headerRef} className="bg-slate-700 text-slate-200 font-semibold text-left sticky top-0 z-10 overflow-hidden">
        <div className="flex" style={{ gridTemplateColumns, minWidth: width }}>
             {columns.map((col, colIndex) => (
              <div 
                key={colIndex} 
                className="p-3"
                style={{ flex: col.width.endsWith('fr') ? col.width.replace('fr', '') : `0 0 ${col.width}`}}
                role="columnheader"
              >
                {col.label}
              </div>
            ))}
        </div>
      </div>
      
      <div className="flex-1 w-full h-full">
         {height > 0 && width > 0 && (
            <FixedSizeList
                height={height}
                width={width}
                itemCount={data.length}
                itemSize={rowHeight}
                itemKey={(index: number) => data[index].id}
                onScroll={handleScroll}
                className="no-scrollbar" // Optional: utility to hide scrollbar if desired, but default is fine
            >
                {Row}
            </FixedSizeList>
         )}
      </div>
    </div>
  );
};

export default VirtualizedTable;
