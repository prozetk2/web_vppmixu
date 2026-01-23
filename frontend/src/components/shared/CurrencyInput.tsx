import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
}

// Format number with thousand separators (Vietnamese format: 1.000.000)
export const formatNumberWithSeparator = (num: number | string): string => {
    if (num === '' || num === null || num === undefined) return '';
    const numStr = String(num).replace(/[^0-9]/g, '');
    if (!numStr) return '';
    return parseInt(numStr, 10).toLocaleString('vi-VN');
};

// Parse formatted string back to number
export const parseFormattedNumber = (str: string): number => {
    if (!str) return 0;
    const numStr = str.replace(/[^0-9]/g, '');
    return parseInt(numStr, 10) || 0;
};

export default function CurrencyInput({
    value,
    onChange,
    placeholder = '0',
    className = '',
    style = {},
    disabled = false,
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState('');

    // Sync display value when external value changes
    useEffect(() => {
        if (value > 0) {
            setDisplayValue(formatNumberWithSeparator(value));
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Allow only digits and dots (which we'll strip anyway)
        const numericValue = parseFormattedNumber(inputValue);

        // Update display with formatted value
        if (inputValue === '') {
            setDisplayValue('');
            onChange(0);
        } else {
            setDisplayValue(formatNumberWithSeparator(numericValue));
            onChange(numericValue);
        }
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            value={displayValue}
            onChange={handleChange}
            placeholder={placeholder}
            className={className}
            style={style}
            disabled={disabled}
        />
    );
}
