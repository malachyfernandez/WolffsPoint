export interface RuleBookData {
    /** V2 composition source. An empty string intentionally displays no content. */
    modularContent?: string;
    content: string;
    roleOrder: number[];
    ruleBookTitle?: string;
    roleDescriptionsTitle?: string;
}
