import dotenv from 'dotenv';
dotenv.config();
const ADMIN_KEY = process.env.ADMIN_KEY;

function dashboardAuth(req, res, next) {
  if (req.method === 'GET' && !req.headers['x-admin-key']) {
    return next();
  }

  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  next();
}


export default dashboardAuth;