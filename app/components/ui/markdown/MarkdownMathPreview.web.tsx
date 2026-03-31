// Used by: ContentPreview.tsx
// Web-only markdown renderer with MathJax support for mathematical content

import React from 'react';
import { createMarkdownMathSourceDocument } from './createMarkdownMathSourceDocument';

interface MarkdownMathPreviewProps {
    markdown: string;
    className?: string;
    headerHeight?: number;
    footerHeight?: number;
    noBorder?: boolean;
}

const MarkdownMathPreview = ({ markdown, className = '', headerHeight = 0, footerHeight = 0, noBorder = false }: MarkdownMathPreviewProps) => {
    return (
        <iframe
            title='Math markdown preview'
            srcDoc={createMarkdownMathSourceDocument(markdown, headerHeight, footerHeight)}
            className={`w-full rounded-xl ${noBorder ? '' : 'border border-gray-300'} bg-gray-50 ${className}`}
            style={{ 
                width: '100%',
                border: noBorder ? 'none' : '1px solid #d1d5db',
                borderRadius: '12px',
                backgroundColor: '#f9fafb',
                // minHeight: '70vh',
                height: '100%',
            }}
        />
    );
};

export default MarkdownMathPreview;
