/**
 * useColor - A hook for resolving color values from CSS variable names or direct color values
 * 
 * This hook provides a centralized way to manage colors in the app, allowing you to:
 * - Pass direct hex/rgb color values
 * - Pass CSS variable names that get resolved to their actual values
 * - Maintain a single source of truth for color definitions
 * 
 * @example Basic Usage
 * ```tsx
 * const { getColor } = useColor();
 * const resolvedColor = getColor('text-inverted'); // Returns '#ffffff'
 * const directColor = getColor('#ff0000'); // Returns '#ff0000'
 * ```
 * 
 * @example With Default Color
 * ```tsx
 * const { getColor } = useColor();
 * const color = getColor('text-inverted', '#000000'); // Returns '#ffffff' or '#000000' as fallback
 * ```
 */

// Color mappings that correspond to CSS variables in global.css
const COLOR_MAPPINGS: Record<string, string> = {
    // Primary colors
    'accent': '#C39f27',
    'accent-hover': '#d3af37',
    
    // Text colors
    'text': '#1a1a1a',
    'text-inverted': '#ffffff',
    'muted-text': '#888888',
    
    // Background colors
    'outer-background': 'rgb(30, 30, 30)',
    'inner-background': 'rgb(253, 251, 246)',
    
    // Border colors
    'border': '#1a1a1a',
    'subtle-border': '#cccccc',
    
    // Other colors
    'highlight': '#7cb87c',
    'l': 'rgb(246, 0, 0)',
};

/**
 * Hook for resolving color values
 * @returns {Object} Object containing color resolution methods
 */
export const useColor = () => {
    /**
     * Resolves a color value from a color name or returns the direct color value
     * @param colorName - The CSS variable name (e.g., 'text-inverted') or direct color value (e.g., '#ffffff')
     * @param defaultColor - Optional fallback color if the color name is not found
     * @returns {string} The resolved color value
     */
    const getColor = (colorName: string | undefined, defaultColor?: string): string => {
        if (!colorName) {
            return defaultColor || '#000000';
        }
        
        // If it's already a hex/rgb color, return as-is
        if (colorName.startsWith('#') || colorName.startsWith('rgb')) {
            return colorName;
        }
        
        // Look up the color in our mappings
        const resolvedColor = COLOR_MAPPINGS[colorName];
        
        if (resolvedColor) {
            return resolvedColor;
        }
        
        // Return default color if provided, otherwise return the original value
        return defaultColor || colorName;
    };

    /**
     * Gets all available color names for reference
     * @returns {string[]} Array of available color names
     */
    const getAvailableColors = (): string[] => {
        return Object.keys(COLOR_MAPPINGS);
    };

    return {
        getColor,
        getAvailableColors,
        COLOR_MAPPINGS, // Export for reference/testing
    };
};

/**
 * Simplified hook for direct color resolution
 * @param colorName - The CSS variable name or direct color value
 * @param defaultColor - Optional fallback color
 * @returns {string} The resolved color value
 */
export const useGetColor = (colorName: string | undefined, defaultColor?: string): string => {
    if (!colorName) {
        return defaultColor || '#000000';
    }
    
    // If it's already a hex/rgb color, return as-is
    if (colorName.startsWith('#') || colorName.startsWith('rgb')) {
        return colorName;
    }
    
    // Look up the color in our mappings
    const resolvedColor = COLOR_MAPPINGS[colorName];
    
    if (resolvedColor) {
        return resolvedColor;
    }
    
    // Return default color if provided, otherwise return the original value
    return defaultColor || colorName;
};

export default useColor;
