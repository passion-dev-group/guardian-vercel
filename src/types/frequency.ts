/**
 * Frequency enum for recurring transactions, contributions, and circle payouts
 * Used across the application for consistent frequency handling
 */
export enum Frequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

/**
 * Type alias for frequency values
 */
export type FrequencyType = `${Frequency}`;

/**
 * Helper function to get the number of days for each frequency
 */
export const getFrequencyDays = (frequency: FrequencyType): number => {
  switch (frequency) {
    case Frequency.DAILY: return 1;
    case Frequency.WEEKLY: return 7;
    case Frequency.BIWEEKLY: return 14;
    case Frequency.MONTHLY: return 30;
    case Frequency.QUARTERLY: return 90;
    case Frequency.YEARLY: return 365;
    default: return 30; // Default to monthly
  }
};

/**
 * Helper function to get human-readable frequency labels
 */
export const getFrequencyLabel = (frequency: FrequencyType): string => {
  switch (frequency) {
    case Frequency.DAILY: return 'Daily';
    case Frequency.WEEKLY: return 'Weekly';
    case Frequency.BIWEEKLY: return 'Every 2 weeks';
    case Frequency.MONTHLY: return 'Monthly';
    case Frequency.QUARTERLY: return 'Every 3 months';
    case Frequency.YEARLY: return 'Yearly';
    default: return 'Monthly';
  }
};

/**
 * Helper function to get frequency options for dropdowns
 */
export const getFrequencyOptions = () => [
  { value: Frequency.DAILY, label: getFrequencyLabel(Frequency.DAILY) },
  { value: Frequency.WEEKLY, label: getFrequencyLabel(Frequency.WEEKLY) },
  { value: Frequency.BIWEEKLY, label: getFrequencyLabel(Frequency.BIWEEKLY) },
  { value: Frequency.MONTHLY, label: getFrequencyLabel(Frequency.MONTHLY) },
  { value: Frequency.QUARTERLY, label: getFrequencyLabel(Frequency.QUARTERLY) },
  { value: Frequency.YEARLY, label: getFrequencyLabel(Frequency.YEARLY) }
];

/**
 * Validation function to check if a string is a valid frequency
 */
export const isValidFrequency = (frequency: string): frequency is FrequencyType => {
  return Object.values(Frequency).includes(frequency as Frequency);
};
