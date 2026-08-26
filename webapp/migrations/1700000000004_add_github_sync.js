exports.up = (pgm) => {
  pgm.addColumns('users', {
    github_sync_repo: {
      type: 'varchar(255)',
      notNull: false,
    },
  });

  pgm.addColumns('problem_patterns', {
    github_synced_url: {
      type: 'varchar(2048)',
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['github_sync_repo']);
  pgm.dropColumns('problem_patterns', ['github_synced_url']);
};
