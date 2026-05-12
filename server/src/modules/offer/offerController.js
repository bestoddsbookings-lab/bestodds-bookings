const { prisma } = require('../../db');
const logger = require('../../utils/logger');

exports.listOffers = async (req, res) => {
  try {
    const now = new Date();
    // available booking codes are those not assigned in UserBookingCode and expiryDate in future
    const assigned = await prisma.userBookingCode.findMany({ select: { bookingCodeId: true } });
    const assignedIds = assigned.map(a => a.bookingCodeId);
    const offers = await prisma.bookingCode.findMany({
      where: {
        id: { notIn: assignedIds.length ? assignedIds : undefined },
        expiryDate: { gt: now },
      },
      select: { id: true, code: true, matchName: true, expiryDate: true, price: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(offers);
  } catch (err) {
    console.error('listOffers error', err && err.stack ? err.stack : err);
    logger.error(err);
    res.status(500).json({ message: 'server_error' });
  }
};

exports.createOffer = async (req, res) => {
  try {
    const { code, matchName, expiryDate, price } = req.body;
    if (!code || !matchName || !expiryDate) return res.status(400).json({ message: 'missing_fields' });
    const created = await prisma.bookingCode.create({ data: { code, matchName, expiryDate: new Date(expiryDate), price: parseFloat(price || 0) } });
    res.status(201).json(created);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'server_error' });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.bookingCode.delete({ where: { id } });
    res.json({ status: 'deleted' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'server_error' });
  }
};

module.exports = exports;
