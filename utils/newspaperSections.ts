import {
    NewspaperDividerStyle,
    NewspaperSectionStyle,
    NewspaperTitleFont,
    Usepaper,
} from '../types/usepaper';

// ---------------------------------------------------------------------------
// Font definitions
// ---------------------------------------------------------------------------

export const NEWSPAPER_TITLE_FONTS: {
    value: NewspaperTitleFont;
    label: string;
    fontFamily: string;
}[] = [
    { value: 'libreBaskerville', label: 'Libre Baskerville', fontFamily: 'LibreBaskerville' },
    { value: 'playfairDisplay', label: 'Playfair Display', fontFamily: 'PlayfairDisplay' },
    { value: 'ebGaramond', label: 'EB Garamond', fontFamily: 'EBGaramond' },
    { value: 'crimsonText', label: 'Crimson Text', fontFamily: 'CrimsonText' },
    { value: 'imFellEnglish', label: 'IM Fell English', fontFamily: 'IMFellEnglish' },
];

export const getNewspaperFontFamily = (font?: NewspaperTitleFont): string => {
    const match = NEWSPAPER_TITLE_FONTS.find((f) => f.value === font);
    return match?.fontFamily ?? 'LibreBaskerville';
};

// ---------------------------------------------------------------------------
// Divider definitions
// ---------------------------------------------------------------------------

export const NEWSPAPER_DIVIDER_STYLES: {
    value: NewspaperDividerStyle;
    label: string;
}[] = [
    { value: 'thin', label: 'Thin Rule' },
    { value: 'doubleThin', label: 'Double Rule' },
    { value: 'centeredShort', label: 'Centered Short' },
    { value: 'diamond', label: 'Diamond' },
];

// ---------------------------------------------------------------------------
// Legacy style → (titleFont, dividerStyle) migration
// ---------------------------------------------------------------------------

const LEGACY_STYLE_MAP: Record<NewspaperSectionStyle, { titleFont: NewspaperTitleFont; dividerStyle: NewspaperDividerStyle }> = {
    classic: { titleFont: 'libreBaskerville', dividerStyle: 'thin' },
    gazette: { titleFont: 'playfairDisplay', dividerStyle: 'doubleThin' },
    editorial: { titleFont: 'ebGaramond', dividerStyle: 'centeredShort' },
    bulletin: { titleFont: 'crimsonText', dividerStyle: 'thin' },
    lateEdition: { titleFont: 'imFellEnglish', dividerStyle: 'diamond' },
};

const isTitleFont = (value: unknown): value is NewspaperTitleFont =>
    NEWSPAPER_TITLE_FONTS.some((f) => f.value === value);

const isDividerStyle = (value: unknown): value is NewspaperDividerStyle =>
    NEWSPAPER_DIVIDER_STYLES.some((d) => d.value === value);

const isLegacyStyle = (value: unknown): value is NewspaperSectionStyle =>
    Object.keys(LEGACY_STYLE_MAP).includes(value as string);

/** Resolve the title font for a section, falling back to legacy `style` then
 *  the default. */
export const resolveTitleFont = (section: { titleFont?: NewspaperTitleFont; style?: NewspaperSectionStyle }): NewspaperTitleFont => {
    if (isTitleFont(section.titleFont)) return section.titleFont;
    if (isLegacyStyle(section.style)) return LEGACY_STYLE_MAP[section.style].titleFont;
    return 'libreBaskerville';
};

/** Resolve the divider style for a section, falling back to legacy `style`
 *  then the default. */
export const resolveDividerStyle = (section: { dividerStyle?: NewspaperDividerStyle; style?: NewspaperSectionStyle }): NewspaperDividerStyle => {
    if (isDividerStyle(section.dividerStyle)) return section.dividerStyle;
    if (isLegacyStyle(section.style)) return LEGACY_STYLE_MAP[section.style].dividerStyle;
    return 'thin';
};

// ---------------------------------------------------------------------------
// Legacy combined styles (kept for NewspaperSectionOptionsDialog labels)
// ---------------------------------------------------------------------------

export const NEWSPAPER_SECTION_STYLES: {
    value: NewspaperSectionStyle;
    label: string;
    description: string;
}[] = [
    { value: 'classic', label: 'Classic Press', description: 'Traditional serif headlines with a full-width rule.' },
    { value: 'gazette', label: 'Grand Gazette', description: 'Uppercase, widely spaced headlines with double rules.' },
    { value: 'editorial', label: 'Editorial', description: 'Italic headlines and a restrained centered divider.' },
    { value: 'bulletin', label: 'City Bulletin', description: 'Strong headlines with a heavy full-width divider.' },
    { value: 'lateEdition', label: 'Late Edition', description: 'Dramatic headlines with an ornamental diamond divider.' },
];

// ---------------------------------------------------------------------------
// Section helpers
// ---------------------------------------------------------------------------

/** A section with titleFont and dividerStyle resolved to non-optional values. */
export interface ResolvedNewspaperSection {
    id: string;
    columns: string[];
    titleFont: NewspaperTitleFont;
    dividerStyle: NewspaperDividerStyle;
}

export const createNewspaperSection = (
    columns: string[] = ['', ''],
    titleFont: NewspaperTitleFont = 'libreBaskerville',
    dividerStyle: NewspaperDividerStyle = 'thin',
): ResolvedNewspaperSection => ({
    id: `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    columns,
    titleFont,
    dividerStyle,
});

export const getNewspaperSections = (usepaper?: Usepaper | null): ResolvedNewspaperSection[] => {
    if (usepaper?.sections?.length) {
        return usepaper.sections.map((section, index) => ({
            id: section.id || `section-${index}`,
            columns: section.columns?.length ? section.columns : ['', ''],
            titleFont: resolveTitleFont(section),
            dividerStyle: resolveDividerStyle(section),
        }));
    }

    return [{
        id: 'legacy-section',
        columns: usepaper?.columns?.length ? usepaper.columns : ['', ''],
        titleFont: 'libreBaskerville' as NewspaperTitleFont,
        dividerStyle: 'thin' as NewspaperDividerStyle,
    }];
};

export const withNewspaperSections = (
    usepaper: Usepaper,
    sections: ResolvedNewspaperSection[],
): Usepaper => ({
    ...usepaper,
    columns: sections[0]?.columns ?? [],
    sections,
});

export const getNewspaperColumns = (usepaper?: Usepaper | null) => {
    return getNewspaperSections(usepaper).flatMap((section) => section.columns);
};

export const hasNewspaperContent = (usepaper?: Usepaper | null) => {
    return getNewspaperColumns(usepaper).some((column) => column.trim().length > 0);
};
