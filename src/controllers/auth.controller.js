import User from '../models/user.models.js';
import PendingSignup from '../models/pendingSignup.models.js';
import bcrypt from 'bcryptjs';
import asyncHandler from 'express-async-handler';
import generateTokens from '../utils/generateTokens.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendMail } from '../utils/mailer.js';

const OTP_EXPIRY_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_MAX_ATTEMPTS = 5;

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const sendVerificationOtpEmail = async ({ email, otp, fullname }) => {
  const subject = 'Verify your email';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
      <h2 style="margin:0 0 12px;">Verify your email</h2>
      <p style="margin:0 0 16px;">Hi ${fullname || 'there'},</p>
      <p style="margin:0 0 16px;">Your OTP is:</p>
      <div style="font-size:28px;letter-spacing:6px;font-weight:700;margin:0 0 16px;">${otp}</div>
      <p style="margin:0 0 8px;">This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
      <p style="margin:0;opacity:0.8;">If you didn’t request this, you can ignore this email.</p>
    </div>
  `;
  await sendMail({ to: email, subject, html });
};

const issueTokensForUser = async ({ userId, res }) => {
  const { accessToken, refreshToken } = generateTokens(userId);
  const user = await User.findById(userId);
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();
  setAuthCookies(res, { accessToken, refreshToken });
  return user;
};

const register = asyncHandler(async (req, res) => {
  const { fullname, email, password } = req.body;

  const normalizedEmail = email?.toLowerCase();
  if (!fullname || !normalizedEmail || !password) {
    return res
      .status(400)
      .json({ message: 'fullname, email and password are required' });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res
      .status(400)
      .json({ message: 'User already exists with this email' });
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 12);
  const passwordHash = await bcrypt.hash(password, 12);
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const pending = await PendingSignup.findOne({
    email: normalizedEmail,
  }).select('+otpLastSentAt');

  if (pending?.otpLastSentAt) {
    const secondsSinceLastSent = Math.floor(
      (Date.now() - pending.otpLastSentAt.getTime()) / 1000
    );
    if (secondsSinceLastSent < OTP_RESEND_COOLDOWN_SECONDS) {
      const remainingCooldown =
        OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSent;
      return res.status(429).json({
        message: 'Please wait before requesting another OTP',
        remainingCooldown,
      });
    }
  }

  await PendingSignup.findOneAndUpdate(
    { email: normalizedEmail },
    {
      fullname,
      email: normalizedEmail,
      passwordHash,
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      otpLastSentAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendVerificationOtpEmail({ email: normalizedEmail, otp, fullname });

  res.status(201).json({
    message: 'OTP sent to email for verification',
    email: normalizedEmail,
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = email.toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+password'
  );
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (!user.isActive) {
    return res.status(401).json({ message: 'Account is deactivated' });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({ message: 'Email not verified' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const issuedUser = await issueTokensForUser({ userId: user._id, res });

  res.json({
    message: 'Login successful',
    user: {
      id: issuedUser._id,
      fullname: issuedUser.fullname,
      email: issuedUser.email,
      avatar: issuedUser.avatar?.url,
      lastLogin: issuedUser.lastLogin,
      isEmailVerified: issuedUser.isEmailVerified,
    },
  });
});

const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const normalizedEmail = email.toLowerCase();

  const pending = await PendingSignup.findOne({
    email: normalizedEmail,
  }).select('+otpLastSentAt');
  if (!pending) {
    return res.status(400).json({ message: 'Please register first' });
  }

  if (pending.otpLastSentAt) {
    const secondsSinceLastSent = Math.floor(
      (Date.now() - pending.otpLastSentAt.getTime()) / 1000
    );
    if (secondsSinceLastSent < OTP_RESEND_COOLDOWN_SECONDS) {
      const remainingCooldown =
        OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSent;
      return res.status(429).json({
        message: 'Please wait before requesting another OTP',
        remainingCooldown,
      });
    }
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 12);
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  pending.otpHash = otpHash;
  pending.otpExpiresAt = otpExpiresAt;
  pending.otpAttempts = 0;
  pending.otpLastSentAt = new Date();
  await pending.save();

  await sendVerificationOtpEmail({
    email: pending.email,
    otp,
    fullname: pending.fullname,
  });

  res.json({ message: 'OTP sent successfully' });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  const normalizedEmail = email.toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res
      .status(400)
      .json({ message: 'User already exists with this email' });
  }

  const pending = await PendingSignup.findOne({
    email: normalizedEmail,
  }).select('+passwordHash +otpHash +otpExpiresAt +otpAttempts');
  if (!pending) {
    return res.status(400).json({ message: 'OTP not requested' });
  }

  if (pending.otpExpiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: 'OTP expired' });
  }

  if ((pending.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    return res.status(429).json({ message: 'Too many attempts' });
  }

  const isValid = await bcrypt.compare(String(otp), pending.otpHash);
  if (!isValid) {
    pending.otpAttempts = (pending.otpAttempts || 0) + 1;
    await pending.save();
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  const user = await User.create({
    fullname: pending.fullname,
    email: pending.email,
    password: pending.passwordHash,
    isEmailVerified: true,
  });

  await PendingSignup.deleteOne({ _id: pending._id });

  const issuedUser = await issueTokensForUser({ userId: user._id, res });

  res.json({
    message: 'Email verified successfully',
    user: {
      id: issuedUser._id,
      fullname: issuedUser.fullname,
      email: issuedUser.email,
      avatar: issuedUser.avatar?.url,
      lastLogin: issuedUser.lastLogin,
      isEmailVerified: issuedUser.isEmailVerified,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    const user = await User.findOne({ refreshToken });
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.json({ message: 'Logout successful' });
});

const refreshToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  const user = await User.findOne({ refreshToken });
  if (!user) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    const { accessToken } = generateTokens(user._id);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
    });

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    user.refreshToken = null;
    await user.save();

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

export { register, login, sendOtp, verifyOtp, logout, refreshToken };
