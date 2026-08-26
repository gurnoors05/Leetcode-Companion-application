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
  // --- ENUMS (using standard tables or check constraints, we'll use custom types for enums) ---
  pgm.createType('difficulty_enum', ['easy', 'medium', 'hard']);
  pgm.createType('status_enum', ['solved', 'attempted', 'to_revisit', 'bookmarked']);

  // --- TABLES ---

  // 1. users
  pgm.createTable('users', {
    id: 'id', // shorthand for serial primary key
    github_id: { type: 'varchar(255)', unique: true, notNull: true },
    github_username: { type: 'varchar(255)', notNull: true },
    email: { type: 'varchar(255)' },
    avatar_url: { type: 'text' },
    github_access_token: { type: 'text' }, // stored encrypted
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // 2. problems
  pgm.createTable('problems', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    title: { type: 'varchar(255)', notNull: true },
    leetcode_url: { type: 'text', notNull: true },
    leetcode_number: { type: 'integer' }, // nullable
    difficulty: { type: 'difficulty_enum' },
    status: { type: 'status_enum', default: 'attempted' },
    date_solved: { type: 'timestamp' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // 3. patterns
  pgm.createTable('patterns', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    name: { type: 'varchar(255)', notNull: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Unique constraint for patterns per user
  pgm.addConstraint('patterns', 'unique_user_pattern_name', {
    unique: ['user_id', 'name'],
  });

  // 4. problem_patterns
  pgm.createTable('problem_patterns', {
    id: 'id',
    problem_id: {
      type: 'integer',
      notNull: true,
      references: '"problems"',
      onDelete: 'CASCADE',
    },
    pattern_id: {
      type: 'integer',
      notNull: true,
      references: '"patterns"',
      onDelete: 'CASCADE',
    },
    approach_notes: { type: 'text' },
    code_snippet: { type: 'text' },
    language: { type: 'varchar(50)' },
    time_complexity: { type: 'varchar(50)' },
    space_complexity: { type: 'varchar(50)' },
    attempts_count: { type: 'integer', notNull: true, default: 1 },
    mistake_notes: { type: 'text' },
    next_review_date: { type: 'timestamp' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Unique constraint for problem_patterns
  pgm.addConstraint('problem_patterns', 'unique_problem_pattern', {
    unique: ['problem_id', 'pattern_id'],
  });

  // --- INDEXES ---
  
  // user_id indexes
  pgm.createIndex('problems', 'user_id');
  pgm.createIndex('patterns', 'user_id');
  
  // problem_patterns foreign keys indexes
  // Note: the unique constraint on (problem_id, pattern_id) implicitly creates an index on these two columns.
  // We still explicitly create an index on pattern_id to optimize lookups filtering only by pattern_id.
  pgm.createIndex('problem_patterns', 'problem_id');
  pgm.createIndex('problem_patterns', 'pattern_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.dropTable('problem_patterns');
  pgm.dropTable('patterns');
  pgm.dropTable('problems');
  pgm.dropTable('users');
  pgm.dropType('status_enum');
  pgm.dropType('difficulty_enum');
};
