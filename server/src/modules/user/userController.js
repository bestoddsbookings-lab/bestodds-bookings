const { prisma } = require('../../db');
const logger = require('../../utils/logger');

exports.getUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};
