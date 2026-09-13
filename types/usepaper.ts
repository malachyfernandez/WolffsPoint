/** Font options for newspaper section headings. */
export type NewspaperTitleFont =
    | 'libreBaskerville'
    | 'playfairDisplay'
    | 'ebGaramond'
    | 'crimsonText'
    | 'imFellEnglish';

/** Divider styles for `---` rules inside newspaper section content. */
export type NewspaperDividerStyle =
    | 'thin'          // simple full-width thin rule
    | 'doubleThin'    // thin double rule
    | 'centeredShort' // short centered rule
    | 'diamond';      // thin rule with a small diamond in the center

/** Legacy combined style — still used for backward-compat migration. */
export type NewspaperSectionStyle = 'classic' | 'gazette' | 'editorial' | 'bulletin' | 'lateEdition';

export interface NewspaperSection {
    id: string;
    columns: string[];
    /** Heading font for this section. */
    titleFont?: NewspaperTitleFont;
    /** In-content `---` divider style for this section. */
    dividerStyle?: NewspaperDividerStyle;
    /** Legacy combined style. Used to derive titleFont/dividerStyle when those
     *  fields are absent (old data). */
    style?: NewspaperSectionStyle;
}

export interface Usepaper {
    columns: string[];
    sections?: NewspaperSection[];
    /** When true, the newspaper is hidden from players for this day (but still
     *  writable by whoever has control). */
    skipped?: boolean;
}
