/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // Add next_review_date to problems table
  pgm.addColumn('problems', {
    next_review_date: { type: 'timestamp', notNull: false },
  });

  // Drop spaced repetition columns from problem_patterns table
  pgm.dropColumns('problem_patterns', [
    'next_review_date',
    'interval_days',
    'ease_factor',
    'review_mode'
  ]);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Add columns back to problem_patterns table
  pgm.addColumns('problem_patterns', {
    next_review_date: { type: 'timestamp', notNull: false },
    interval_days: { type: 'integer', notNull: true, default: 1 },
    ease_factor: { type: 'double precision', notNull: true, default: 2.5 },
    review_mode: { type: 'text', notNull: true, default: 'algorithm' },
  });

  // Drop next_review_date from problems table
  pgm.dropColumn('problems', 'next_review_date');
};
