const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const headerToken = req.headers['x-admin-token'];
  if (headerToken && typeof headerToken === 'string') {
    return headerToken.trim();
  }

  return null;
};

export const requireAdmin = (req, res, next) => {
  if (!ADMIN_TOKEN) {
    return res
      .status(500)
      .json({ message: 'Admin token not configured on the server.' });
  }

  const token = extractToken(req);

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(403).json({ message: 'Admin privileges required.' });
  }

  return next();
};
