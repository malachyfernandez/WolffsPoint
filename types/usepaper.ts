export interface Usepaper {
    columns: string[];
    /** When true, the newspaper is hidden from players for this day (but still
     *  writable by whoever has control). */
    skipped?: boolean;
}
