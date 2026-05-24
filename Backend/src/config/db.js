const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      family: 4,
      // useNewUrlParser and useUnifiedTopology are defaults in modern drivers
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    return mongoose;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    throw error;
  }
};

const closeDB = async () => {
  try {
    if (mongoose && mongoose.connection && mongoose.connection.readyState) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
  }
};

module.exports = { connectDB, closeDB, mongoose };
