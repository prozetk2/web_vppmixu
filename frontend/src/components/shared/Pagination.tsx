import './Pagination.css';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage = 10,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const showEllipsisStart = currentPage > 3;
        const showEllipsisEnd = currentPage < totalPages - 2;

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            pages.push(1);

            if (showEllipsisStart) {
                pages.push('...');
            }

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (showEllipsisEnd) {
                pages.push('...');
            }

            pages.push(totalPages);
        }

        return pages;
    };

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems || 0);

    return (
        <div className="pagination-wrapper">
            {totalItems !== undefined && (
                <div className="pagination-info">
                    Hiển thị {startItem}-{endItem} / {totalItems} bản ghi
                </div>
            )}
            <div className="pagination">
                <button
                    className="pagination-btn pagination-prev"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    ‹ Trước
                </button>

                <div className="pagination-pages">
                    {getPageNumbers().map((page, index) => (
                        typeof page === 'number' ? (
                            <button
                                key={index}
                                className={`pagination-btn pagination-page ${currentPage === page ? 'active' : ''}`}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </button>
                        ) : (
                            <span key={index} className="pagination-ellipsis">{page}</span>
                        )
                    ))}
                </div>

                <button
                    className="pagination-btn pagination-next"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Sau ›
                </button>
            </div>
        </div>
    );
}
