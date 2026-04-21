/**
 * Dynamic Import Utilities for Heavy Libraries
 *
 * Implements lazy loading for large libraries to reduce initial bundle size
 * and improve loading performance.
 */

import dynamic from 'next/dynamic';

// Library loaders for utilities (not components)
export const LazyJSPDFLoader = () => import('jspdf');
export const LazyJSPDFAutotableLoader = () => import('jspdf-autotable');
export const LazyExcelJSLoader = () => import('exceljs');
