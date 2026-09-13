const NO_BORDER_MARKER = '__WOLFFSPOINT_NO_IMAGE_BORDER__';

export const encodeMarkdownImageAlt = (alt: string, hasBorder: boolean) => {
    return hasBorder ? alt : `${alt}${NO_BORDER_MARKER}`;
};

export const parseMarkdownImageAlt = (alt: string) => ({
    alt: alt.replace(NO_BORDER_MARKER, ''),
    hasBorderOverride: alt.includes(NO_BORDER_MARKER) ? false : undefined,
});
