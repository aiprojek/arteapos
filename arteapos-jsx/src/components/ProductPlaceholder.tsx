import React from 'react';

interface ProductPlaceholderProps {
  productName: string;
  className?: string;
  size?: 'small' | 'large';
}

const ProductPlaceholder: React.FC<ProductPlaceholderProps> = ({ productName, className = '', size = 'large' }) => {
    if (size === 'small') {
        const initials = productName.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
        return (
            <svg 
                className={className} 
                viewBox="0 0 40 40"
                preserveAspectRatio="xMidYMid meet" 
                xmlns="http://www.w3.org/2000/svg"
            >
                <rect width="100%" height="100%" fill="#334155" /> {/* slate-700 */}
                <text 
                    x="50%" 
                    y="50%" 
                    dominantBaseline="central" 
                    textAnchor="middle" 
                    fill="#94a3b8" /* slate-400 */
                    fontSize="16"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                >
                    {initials}
                </text>
            </svg>
        );
    }
    
    // large size (default)
    return (
        <svg 
            className={className} 
            viewBox="0 0 160 120"
            preserveAspectRatio="xMidYMid slice" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="100%" height="100%" fill="#334155" /> {/* slate-700 */}
            <foreignObject x="0" y="0" width="100%" height="100%">
                <div 
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        height: '100%',
                        padding: '8px',
                        boxSizing: 'border-box',
                        textAlign: 'center',
                        fontFamily: 'sans-serif',
                        color: '#cbd5e1' // slate-300
                    }}
                >
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>AI Projek</div>
                    <div 
                        style={{ 
                            fontSize: '18px', 
                            color: '#f1f5f9', // slate-100
                            fontWeight: '600', 
                            lineHeight: '1.2',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            // @ts-ignore
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                        }}
                    >
                       {productName}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>aiprojek01.my.id</div>
                </div>
            </foreignObject>
        </svg>
    );
};

export default ProductPlaceholder;
