const Group = require('../models/Group');

// @desc    Create new group
// @route   POST /api/groups
// @access  Public (for now)
const createGroup = async (req, res, next) => {
    try {
        const { name, members } = req.body;

        if (!name || !members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ success: false, message: 'Please provide group name and members' });
        }

        const group = await Group.create({
            name,
            members,
            createdBy: req.user ? req.user.id : null
        });

        res.status(201).json({
            success: true,
            id: group._id, // match frontend expectation: data.id || data._id
            data: group
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get single group
// @route   GET /api/groups/:id
// @access  Public
const getGroup = async (req, res, next) => {
    try {
        const group = await Group.findById(req.params.id).populate('expenses');

        if (!group) {
            return res.status(404).json({ success: false, message: 'Group not found' });
        }

        res.status(200).json({
            success: true,
            data: group
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createGroup,
    getGroup
};
