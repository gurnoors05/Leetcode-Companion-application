exports.up = async (pgm) => {
  pgm.createTable('submission_attempts', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'cascade'
    },
    problem_id: {
      type: 'integer',
      references: '"problems"',
      onDelete: 'cascade'
    },
    leetcode_number: {
      type: 'integer'
    },
    title: {
      type: 'varchar(255)'
    },
    difficulty: {
      type: 'varchar(50)'
    },
    status_msg: {
      type: 'text',
      notNull: true
    },
    code_snippet: {
      type: 'text'
    },
    language: {
      type: 'varchar(50)'
    },
    mistake_category: {
      type: 'varchar(100)'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  pgm.createIndex('submission_attempts', 'user_id');
  pgm.createIndex('submission_attempts', 'problem_id');
  pgm.createIndex('submission_attempts', 'leetcode_number');
};

exports.down = async (pgm) => {
  pgm.dropTable('submission_attempts');
};
