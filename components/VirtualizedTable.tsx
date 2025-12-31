
import React, { useRef, useCallback } from 'react';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { FixedSizeList } from 'react-window';

interface Column<T> {
  label: string;
  render: (item: T) => React.ReactNode;
  width: string; // e.g., '1fr', '150px'
  className?: string; // Allow custom classes for cells
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

  // Ensure table has at least minWidth, otherwise use container width
  const effectiveWidth = Math.max(width, minWidth);

  // Helper to calculate flex-basis and flex-grow based on input
  const getColStyle = (widthStr: string): React.CSSProperties => {
      if (widthStr.endsWith('fr')) {
          const flexGrow = widthStr.replace('fr', '');
          // flex: grow shrink basis.
          // Changed minWidth from 0 to 50px to prevent collapse on some engines/layouts
          return { flex: `${flexGrow} 1 0px`, minWidth: '50px' }; 
      }
      // Fixed width
      return { flex: `0 0 ${widthStr}`, minWidth: widthStr, maxWidth: widthStr };
  };

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
            className={`px-3 py-2 text-slate-300 ${col.className || 'overflow-hidden text-ellipsis whitespace-nowrap'}`}
            style={getColStyle(col.width)}
            role="gridcell"
          >
            {col.render(item)}
          </div>
        ))}
      </div>
    );
  }, [data, columns]);

  const HEADER_HEIGHT = 45; 

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col overflow-hidden relative border border-slate-700 rounded-lg">
      {/* Horizontal Scroll Container */}
      <div className="w-full h-full overflow-x-auto overflow-y-hidden bg-slate-800">
        
        {/* Table Layout Container */}
        <div style={{ minWidth: effectiveWidth, height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div className="bg-slate-700 text-slate-200 font-bold text-left sticky top-0 z-10 border-b border-slate-600 flex items-center h-[45px] flex-shrink-0">
                {columns.map((col, colIndex) => (
                <div 
                    key={colIndex} 
                    className="px-3 py-2 truncate"
                    style={getColStyle(col.width)}
                    role="columnheader"
                >
                    {col.label}
                </div>
                ))}
            </div>
            
            {/* Body */}
            <div className="flex-1 w-full relative">
                {height > 0 && (
                    <FixedSizeList
                        height={Math.max(height - HEADER_HEIGHT, 0)} // Prevent negative height
                        width={effectiveWidth}
                        itemCount={data.length}
                        itemSize={rowHeight}
                        itemKey={(index: number) => data[index].id}
                        className="no-scrollbar"
                        style={{ overflowX: 'hidden' }}
                    >
                        {Row}
                    </FixedSizeList>
                )}
                {data.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        Tidak ada data untuk ditampilkan.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualizedTable;
