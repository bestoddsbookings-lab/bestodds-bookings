const { prisma } = require('../../db');

async function createUser(data) {
  return prisma.user.create({ data });
}

module.exports = { createUser };
