import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getOdds = async () => {
    try {
        const odds = await prisma.odds.findMany();
        return odds;
    } catch (error) {
        throw new Error('Error fetching odds data');
    }
};

export const createOdds = async (data) => {
    try {
        const newOdds = await prisma.odds.create({
            data,
        });
        return newOdds;
    } catch (error) {
        throw new Error('Error creating odds data');
    }
};

export const updateOdds = async (id, data) => {
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

export const deleteOdds = async (id) => {
    try {
        await prisma.odds.delete({
            where: { id },
        });
    } catch (error) {
        throw new Error('Error deleting odds data');
    }
};