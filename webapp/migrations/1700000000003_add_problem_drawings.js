exports.up = (pgm) => {
  pgm.createTable('problem_drawings', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    problem_id: {
      type: 'integer',
      notNull: true,
      references: '"problems"',
      onDelete: 'CASCADE',
    },
    canvas_data: {
      type: 'jsonb',
      default: '{}'
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('problem_drawings', 'unique_user_problem_drawing', {
    unique: ['user_id', 'problem_id'],
  });
};

exports.down = (pgm) => {
  pgm.dropTable('problem_drawings');
};
