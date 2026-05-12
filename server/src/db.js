const prisma = require('./prisma');

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log('Database connected successfully (SSL enforced)');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};

const disconnectDB = async () => {
    await prisma.$disconnect();
};

module.exports = {
    connectDB,
    disconnectDB,
    prisma,
};