import React from 'react';
import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  isLoading = false
}: PaginationProps) {
  // Always show pagination info and controls
  const showingStart = totalItems > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0;
  const showingEnd = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevPage = () => {
    if (hasPrevPage && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination
      const halfVisible = Math.floor(maxVisiblePages / 2);
      let startPage = Math.max(1, currentPage - halfVisible);
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      // Adjust if we're near the end
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      // Add first page and ellipsis if needed
      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) {
          pages.push('...');
        }
      }
      
      // Add visible pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis and last page if needed
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing <span className="pagination-range">{showingStart}-{showingEnd}</span> of <span className="pagination-total">{totalItems}</span> items
      </div>
      
      <div className="pagination-controls">
        <button
          className="pagination-btn pagination-prev"
          disabled={!hasPrevPage || isLoading}
          onClick={handlePrevPage}
          title="Previous page"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Previous</span>
        </button>
        
        <div className="pagination-numbers">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                  ...
                </span>
              );
            }
            
            return (
              <button
                key={page}
                className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                onClick={() => onPageChange(page as number)}
                disabled={isLoading}
              >
                {page}
              </button>
            );
          })}
        </div>
        
        <button
          className="pagination-btn pagination-next"
          disabled={!hasNextPage || isLoading}
          onClick={handleNextPage}
          title="Next page"
        >
          <span>Next</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
