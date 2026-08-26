/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.addColumns('problem_patterns', {
    interval_days: { type: 'integer', default: 1 },
    ease_factor: { type: 'real', default: 2.5 },
    review_mode: { type: 'text', default: 'algorithm' },
  });
  
  // Add check constraint for review_mode
  pgm.addConstraint('problem_patterns', 'check_review_mode', {
    check: "review_mode IN ('algorithm', 'manual')",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('problem_patterns', 'check_review_mode');
  pgm.dropColumns('problem_patterns', ['interval_days', 'ease_factor', 'review_mode']);
};
