const OddsService = require('../services/oddsService');

exports.createOdds = async (req, res) => {
    try {
        const oddsData = req.body;
        const newOdds = await OddsService.createOdds(oddsData);
        res.status(201).json(newOdds);
    } catch (error) {
        res.status(500).json({ message: 'Error creating odds', error });
    }
};

exports.getOdds = async (req, res) => {
    try {
        const odds = await OddsService.getOdds();
        res.status(200).json(odds);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving odds', error });
    }
};

exports.updateOdds = async (req, res) => {
    try {
        const { id } = req.params;
        const oddsData = req.body;
        const updatedOdds = await OddsService.updateOdds(id, oddsData);
        res.status(200).json(updatedOdds);
    } catch (error) {
        res.status(500).json({ message: 'Error updating odds', error });
    }
};

exports.deleteOdds = async (req, res) => {
    try {
        const { id } = req.params;
        await OddsService.deleteOdds(id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting odds', error });
    }
};