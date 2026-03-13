import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'pill';
    width?: string | number;
    height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
    className = '', 
    variant = 'pill', 
    width, 
    height 
}) => {
    const variantClasses = {
        text: 'rounded',
        circular: 'rounded-full',
        pill: 'rounded-full',
    };

    return (
        <motion.div
            className={`bg-slate-700/50 ${variantClasses[variant]} ${className}`}
            style={{ width, height }}
            initial={{ opacity: 0.3 }}
            animate={{ 
                opacity: [0.3, 0.6, 0.3],
                transition: {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            }}
        />
    );
};

export default Skeleton;
