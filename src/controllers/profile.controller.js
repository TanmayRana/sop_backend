import asyncHandler from 'express-async-handler';
import cloudinary from '../utils/cloudinary.js';
import User from '../models/user.models.js';

// Get user profile
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    '-password -refreshToken'
  );
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json({ user });
});

// Update user profile (fullname, etc.)
const updateProfile = asyncHandler(async (req, res) => {
  const { fullname } = req.body;

  if (!fullname || fullname.trim().length < 2) {
    return res
      .status(400)
      .json({ message: 'Full name must be at least 2 characters' });
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { fullname: fullname.trim() },
    { new: true, runValidators: true }
  ).select('-password -refreshToken');

  res.json({
    message: 'Profile updated successfully',
    user,
  });
});

// Upload avatar to Cloudinary and update user
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  // Validate file type (allow images only)
  if (!req.file.mimetype.startsWith('image/')) {
    return res.status(400).json({ message: 'Only image files are allowed' });
  }

  // Convert buffer to base64 data URI for Cloudinary
  const dataURI = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  // Upload to Cloudinary
  const result = await cloudinary.uploader.upload(dataURI, {
    folder: 'avatars',
    transformation: [
      { width: 200, height: 200, crop: 'fill' },
      { quality: 'auto' },
    ],
    // Remove the hardcoded public_id so Cloudinary generates a unique one
    // or keep it if you want to overwrite, but deleting manually is safer for state
    overwrite: true,
  });

  const currentUser = await User.findById(req.user._id);

  // Delete old avatar if it exists
  if (currentUser.avatar?.public_id) {
    await cloudinary.uploader.destroy(currentUser.avatar.public_id).catch(err =>
      console.error("Cloudinary delete error:", err)
    );
  }

  // Update user avatar in DB
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      avatar: {
        url: result.secure_url,
        public_id: result.public_id
      }
    },
    { new: true, runValidators: true }
  ).select('-password -refreshToken');

  res.json({
    message: 'Avatar uploaded successfully',
    avatar: result.secure_url,
    user,
  });
});

export { getProfile, updateProfile, uploadAvatar };
