import React from 'react';

/**
 * A reusable button component with multiple visual variants.
 *
 * @param {object} props
 * @param {'primary' | 'secondary'} [props.variant='primary'] - The visual style of the button.
 * @param {React.ReactNode} props.children - The content inside the button (e.g., text).
 * @param {() => void} [props.onClick] - The function to call when the button is clicked.
 * @param {string} [props.className] - Optional additional classes to apply.
 * @param {string} [props.type='button'] - The button's type attribute.
 */

const Button = ({ children, variant = 'primary', onClick, className = '', type = 'button' }) => {
    // Base styles shared by all button variants
    const baseClasses =
        'px-6 py-2 rounded-md font-semibold text-base transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#04000D]';

    // Styles specific to each variant
    let variantClasses = '';
    switch (variant) {
        case 'secondary':
            variantClasses =
                'bg-transparent border border-gray-600 text-purple-400 hover:bg-purple-500 hover:text-white hover:border-purple-500 focus:ring-purple-400';
            break;
        case 'primary':
        default:
            variantClasses =
                'bg-white text-black hover:bg-gray-200 focus:ring-gray-500';
            break;
    }

    return (
        <button
            type={type}
            onClick={onClick}
            className={`${baseClasses} ${variantClasses} ${className}`}
        >
            {children}
        </button>
    );
};

export default Button;