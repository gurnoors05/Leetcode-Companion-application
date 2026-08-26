const { ZodError } = require('zod');

/**
 * Express middleware to validate request using Zod schemas
 * @param {Object} schemas - Object containing Zod schemas for body, query, and params
 */
const validate = (schemas) => {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error && error.name === 'ZodError') {
        const issues = error.errors || error.issues || [];
        const formattedErrors = issues.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
      }
      next(error);
    }
  };
};

module.exports = {
  validate,
};
