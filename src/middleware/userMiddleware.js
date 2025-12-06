const getUserId = (req, res, next) => {
    // We are just simulating user authentication here.
    // TODO: Replace with real authentication logic.
    const userId = req.headers['user-id'] || 1; 
    req.userId = userId; 
    next();
};

module.exports = getUserId;