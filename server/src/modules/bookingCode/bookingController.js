const { prisma } = require('../../db');
const logger = require('../../utils/logger');

exports.getMyCodes = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const now = new Date();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.isVerified || user.accessStatus !== 'ACTIVE') return res.status(403).json({ error: 'Access denied' });

    const codes = await prisma.userBookingCode.findMany({ where: { userId }, include: { bookingCode: true } });
    const available = codes.filter(c => new Date(c.bookingCode.expiryDate) > now).map(c => c.bookingCode);
    return res.json({ codes: available });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
