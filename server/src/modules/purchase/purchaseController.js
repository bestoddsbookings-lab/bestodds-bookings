const prisma = require('../../prisma');

exports.createPurchase = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    const { bookingCodeId, amount } = req.body;
    if (!userId || !bookingCodeId) return res.status(400).json({ message: 'missing_fields' });

    // Resolve amount: prefer provided amount, otherwise derive from booking code price
    let amountToUse = typeof amount === 'number' ? amount : undefined;
    if (amountToUse === undefined) {
      const booking = await prisma.bookingCode.findUnique({ where: { id: bookingCodeId } });
      if (!booking) return res.status(400).json({ message: 'invalid_booking_code' });
      amountToUse = booking.price || 0;
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        bookingCodeId,
        amount: amountToUse,
        status: 'PENDING',
      },
    });

    res.status(201).json({ purchase });
  } catch (err) {
    console.error('createPurchase error', err);
    res.status(500).json({ message: err.message || 'server_error' });
  }
};

exports.getPurchases = async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ purchases });
  } catch (err) {
    console.error('getPurchases error', err);
    res.status(500).json({ message: err.message || 'server_error' });
  }
};

exports.approvePurchase = async (req, res) => {
  try {
    const { id } = req.params; // purchase id
    const purchase = await prisma.purchase.findUnique({ where: { id } });
    if (!purchase) return res.status(404).json({ message: 'not_found' });

    // create user booking assignment
    await prisma.userBookingCode.create({
      data: {
        userId: purchase.userId,
        bookingCodeId: purchase.bookingCodeId,
      },
    });

    await prisma.purchase.update({ where: { id }, data: { status: 'APPROVED' } });
    res.json({ status: 'approved' });
  } catch (err) {
    console.error('approvePurchase error', err);
    res.status(500).json({ message: err.message || 'server_error' });
  }
};

exports.rejectPurchase = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.purchase.update({ where: { id }, data: { status: 'REJECTED' } });
    res.json({ status: 'rejected' });
  } catch (err) {
    console.error('rejectPurchase error', err);
    res.status(500).json({ message: err.message || 'server_error' });
  }
};

exports.getMyPurchases = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'unauthenticated' });
    const purchases = await prisma.purchase.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    res.json({ purchases });
  } catch (err) {
    console.error('getMyPurchases error', err);
    res.status(500).json({ message: err.message || 'server_error' });
  }
};

module.exports = exports;
