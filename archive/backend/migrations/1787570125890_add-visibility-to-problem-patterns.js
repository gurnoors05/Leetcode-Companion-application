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
  pgm.addColumn('problem_patterns', {
    visibility: { type: 'varchar(50)', notNull: true, default: 'PRIVATE' },
    share_token: { type: 'text', unique: true }
  });
  
  pgm.addConstraint('problem_patterns', 'check_visibility', {
    check: "visibility IN ('PRIVATE', 'UNLISTED', 'PUBLIC')"
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('problem_patterns', 'check_visibility');
  pgm.dropColumn('problem_patterns', 'share_token');
  pgm.dropColumn('problem_patterns', 'visibility');
};
