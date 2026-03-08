const couchDB = require('../couchDB_service');

const accountController = {
  getUserInfo: async (req, res) => {
    try {
      const { id } = req.params;
      const user = await couchDB.getUser(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.username,
          email: user.email,
          role: user.role,
          summary: user.summary || '',
          isPublic: user.isPublic,
          profilePicture: user.profilePicture || null
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `User lookup error: ${error.message}`
      });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const users = await couchDB.getAllUsers();
      const filteredUsers = users.filter(u => !u.role || u.role === 'user');

      return res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        users: filteredUsers,
        count: filteredUsers.length
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Retrieve users error: ${error.message}`
      });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { userId, summary, isPublic, username } = req.body;
      const result = await couchDB.updateProfile(userId, { summary, isPublic, username });

      return res.status(200).json({
        success: true,
        message: 'Profile updated',
        data: result
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  uploadProfilePicture: async (req, res) => {
    try {
      const { userId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is missing.' });
      }

      const fileBuffer = file.buffer;
      const fileType = file.mimetype;
      const base64Image = `data:${fileType};base64,${fileBuffer.toString('base64')}`;

      await couchDB.updateUser(userId, {
        profilePicture: base64Image
      });

      return res.status(200).json({
        success: true,
        message: 'Profile picture updated!',
        imageUrl: base64Image
      });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = accountController;
