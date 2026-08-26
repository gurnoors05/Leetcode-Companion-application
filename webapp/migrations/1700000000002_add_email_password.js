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
  // Add password_hash column
  pgm.addColumn('users', {
    password_hash: { type: 'varchar(255)' },
  });

  // Make github_id and github_username nullable for email registrations
  pgm.alterColumn('users', 'github_id', { notNull: false });
  pgm.alterColumn('users', 'github_username', { notNull: false });

  // Add a unique constraint on email
  pgm.addConstraint('users', 'unique_email', {
    unique: ['email'],
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropConstraint('users', 'unique_email');
  
  // Note: making columns notNull again would fail if there are rows without github_id.
  // We'll assume down migration handles it carefully or warns.
  pgm.alterColumn('users', 'github_username', { notNull: true });
  pgm.alterColumn('users', 'github_id', { notNull: true });
  
  pgm.dropColumn('users', 'password_hash');
};
