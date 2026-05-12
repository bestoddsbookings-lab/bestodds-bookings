const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    const u = await prisma.user.update({ where: { email: 'silintoj56@gmail.com' }, data: { isVerified: true } });
    console.log('marked_verified', u.id);
  } catch (e) {
    console.error('err', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
