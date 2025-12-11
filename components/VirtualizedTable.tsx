
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
  minWidth?: number;
}

const VirtualizedTable = <T extends { id: string | number }>({ data, columns, rowHeight, minWidth = 800 }: VirtualizedTableProps<T>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height } = useResizeObserver(containerRef);

  // Determine the effective width: either the container width or the minimum width, whichever is larger.
  // This ensures the table pushes out (scrolls) if the screen is too small.
  const effectiveWidth = Math.max(width, minWidth);

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

  // Approximate header height (padding + text). 
  // We use this to subtract from total height for the FixedSizeList.
  const HEADER_HEIGHT = 45; 

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col overflow-hidden relative">
      {/* Scrollable Container for Horizontal Scrolling */}
      <div className="w-full h-full overflow-x-auto overflow-y-hidden">
        
        {/* Inner Container that enforces the minimum width */}
        <div style={{ minWidth: effectiveWidth, height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Sticky Header */}
            <div className="bg-slate-700 text-slate-200 font-semibold text-left sticky top-0 z-10 border-b border-slate-600">
                <div className="flex" style={{ gridTemplateColumns }}>
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
            
            {/* List */}
            <div className="flex-1 w-full">
                {height > 0 && (
                    <FixedSizeList
                        height={height - HEADER_HEIGHT}
                        width={effectiveWidth}
                        itemCount={data.length}
                        itemSize={rowHeight}
                        itemKey={(index: number) => data[index].id}
                        className="no-scrollbar"
                        style={{ overflowX: 'hidden' }} // We handle X scroll in parent
                    >
                        {Row}
                    </FixedSizeList>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualizedTable;
