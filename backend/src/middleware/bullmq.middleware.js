import dotenv from 'dotenv';
dotenv.config();
import basicAuth from "express-basic-auth";

const dashboardAuth = basicAuth({
  users: {
    [process.env.ADMIN_USER]: process.env.ADMIN_PASSWORD,
  },
  challenge: true,
});

export default dashboardAuth;