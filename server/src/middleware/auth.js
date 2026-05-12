const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const session = await prisma.session.findFirst({
      where: { userId: decoded.userId },
    });

    if (!session) return res.status(401).json({ message: "session_invalid" });

    // Check user access status (ban enforcement)
    try {
      const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { accessStatus: true } });
      if (user && user.accessStatus === 'BANNED') return res.status(403).json({ message: 'banned' });
    } catch (e) {
      // on any error, proceed with existing session behavior
      console.error('auth middleware user check failed', e);
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: "invalid_token" });
  }
};
