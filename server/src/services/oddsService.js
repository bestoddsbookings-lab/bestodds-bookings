const prisma = require('../prisma');

const getOdds = async () => {
    try {
        const odds = await prisma.odds.findMany();
        return odds;
    } catch (error) {
        throw new Error('Error fetching odds data');
    }
};

const createOdds = async (data) => {
    try {
        const newOdds = await prisma.odds.create({
            data,
        });
        return newOdds;
    } catch (error) {
        throw new Error('Error creating odds data');
    }
};

const updateOdds = async (id, data) => {
    try {
        const updatedOdds = await prisma.odds.update({
            where: { id },
            data,
        });
        return updatedOdds;
    } catch (error) {
        throw new Error('Error updating odds data');
    }
};

const deleteOdds = async (id) => {
    try {
        await prisma.odds.delete({
            where: { id },
        });
    } catch (error) {
        throw new Error('Error deleting odds data');
    }
};

module.exports = {
    getOdds,
    createOdds,
    updateOdds,
    deleteOdds,
};