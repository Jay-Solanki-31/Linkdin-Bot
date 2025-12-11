// src/modules/logger/logger.js
import fs from "fs";
import path from "path";
import winston from "winston";

const logDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (err) {
    console.error("Could not create logs directory:", err.message);
  }
}

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp }) => `[${timestamp}] ${level}: ${message}`)
);

const transports = [
  new winston.transports.Console({ format: consoleFormat }),
];

if (fs.existsSync(logDir)) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, "app.log"),
      level: "info",
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      tailable: true,
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  transports,
  exitOnError: false,
});

export default logger;
