const ApiError = require('../utils/apiError');

/**
 * Request validation middleware factory.
 * Usage: validate(schema) - validates req.body
 *        validate(schema, 'query') - validates req.query
 *        validate(schema, 'params') - validates req.params
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new ApiError(400, 'Validation failed', result.error.errors));
    }
    // Replace with parsed/transformed data
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
