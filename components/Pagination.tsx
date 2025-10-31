
import React from 'react';
import Button from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) => {
  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    const maxVisiblePages = 5;
    const half = Math.floor(maxVisiblePages / 2);

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
      return pageNumbers;
    }

    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, currentPage + half);

    if (currentPage - half < 1) {
      end = Math.min(totalPages, maxVisiblePages);
    }
    if (currentPage + half > totalPages) {
      start = Math.max(1, totalPages - maxVisiblePages + 1);
    }

    if (start > 1) {
      pageNumbers.push(1);
      if (start > 2) {
        pageNumbers.push('...');
      }
    }

    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        pageNumbers.push('...');
      }
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-slate-400 py-3">
      <p>
        Menampilkan {startItem}-{endItem} dari {totalItems} hasil
      </p>
      <div className="flex items-center gap-2 mt-2 sm:mt-0">
        <Button
          size="sm"
          variant="secondary"
          onClick={handlePrev}
          disabled={currentPage === 1}
          aria-label="Halaman Sebelumnya"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Button>
        
        <div className="flex items-center gap-1">
            {pages.map((page, index) => {
                if (page === '...') {
                    return <span key={`ellipsis-${index}`} className="px-3 py-1">...</span>;
                }
                const pageNum = page as number;
                return (
                    <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`w-8 h-8 rounded-md transition-colors ${
                            currentPage === pageNum
                            ? 'bg-[#347758] text-white font-bold'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                    >
                        {pageNum}
                    </button>
                );
            })}
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label="Halaman Berikutnya"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
