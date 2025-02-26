const User = require('../model/user');
const catchAsync = require("../util/catchAsync");
const sendEmail = require('../util/email');
const generateOtp = require('../util/generateOtp');
const JWT = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const AppError = require('../util/appError');

const signToken = (id) => {
    return JWT.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const createSendToken = (user, statusCode, res, message) => {
    const token = signToken(user._id);

    const cookieOption = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "Lax"
    };
    res.cookie("token", token, cookieOption);
    user.password = undefined;
    user.passwordConfirm = undefined;
    user.otp = undefined;

    res.status(statusCode).json({
        status: "success",
        message,
        token,
        data: {
            user,
        }
    });
};

const registerUser = catchAsync(async (req, res, next) => {
    const { username, email, password, passwordConfirm, role } = req.body;

    const checkExistingUser = await User.findOne({ $or: [{ username }, { email }] });

    if (checkExistingUser) return next(new AppError("User already exists", 400));

    const otp = generateOtp();

    const otpExpires = Date.now() + 24 * 60 * 60 * 1000;

    if (password !== passwordConfirm) {
        return next(new AppError("Two passwords aren't match", 500));
    }

    const newlyCreatedUser = new User({
        username,
        email,
        password: password,
        role: role || 'user',
        otp,
        otpExpires
    });

    await newlyCreatedUser.save();

    try {
        await sendEmail({
            email: newlyCreatedUser.email,
            subject: "OTP For Email Verification",
            html: `<h1>Your otp is: ${otp}</h1>`
        });

        createSendToken(newlyCreatedUser, 200, res, "User registered successfully!!");
    } catch (error) {
        await User.findByIdAndDelete(newlyCreatedUser.id);
        return next(new AppError("There was an error sending the email, try again", 500));
    }
});

const otpVerify = catchAsync(async (req, res, next) => {
    const { otp } = req.body;

    if (!otp) {
        return next(new AppError("Otp is missing", 400));
    }

    const user = req.user;

    if (user.otp !== otp) {
        return next(new AppError("Invalid OTP", 400));
    }

    if (Date.now() > user.otpExpires) {
        return next(new AppError("OTP has expired, please request a new OTP", 400));
    }
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save({ validateBeforeSave: false });

    createSendToken(user, 200, res, "Email has been verified.");
});

const resendOTP = catchAsync(async (req, res, next) => {
    const { email } = req.user;

    if (!email) {
        return next(new AppError("Email is required to resend OTP", 400));
    }

    const user = await User.findOne({ email });

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    if (user.isVerified) {
        return next(new AppError("This account is already verified", 400));
    }

    const newOTP = generateOtp();

    user.otp = newOTP;
    user.resetPasswordOtpExpires = Date.now() + 24 * 60 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    try {
        await sendEmail({
            email: user.email,
            subject: "Resend OTP for email verification",
            html: `<h1>Your new OTP is: ${newOTP}</h1>`
        });
        res.status(200).json({
            status: "success",
            message: "Email sent successfully."
        });
    } catch (error) {
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError("There was an error sending the email, please try again."));
    }
});

const login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError("Please provide email and password", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect password or email', 401));
    }

    createSendToken(user, 200, res, "Login Successful");
});

const logout = catchAsync(async (req, res, next) => {
    res.cookie("token", "loggedout", {
        expires: new Date(Date.now() + 10 * 100),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    });

    res.status(200).json({
        status: "success",
        message: "Logged out successfully"
    });
});

const forgetpassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return next(new AppError("No user found", 404));
    }
    const otp = generateOtp();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

    await user.save({ validateBeforeSave: false });

    try {
        await sendEmail({
            email: user.email,
            subject: "Your Password reset OTP (Valid for 5 minutes)",
            html: `<h1>Your new OTP is: ${otp}</h1>`
        });
        res.status(200).json({
            status: "success",
            message: "Email sent successfully."
        });
    } catch (error) {
        user.resetPasswordOtp = undefined;
        user.resetPasswordOtpExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new AppError("There was an error sending the email, please try again."));
    }
});

const resetPasswor = catchAsync(async (req, res, next) => {
    const { email, password, confirmPassword, otp } = req.body;

    const user = await User.findOne({
        email,
        resetPasswordOtp: otp,
        resetPasswordOtpExpires: { $gt: Date.now() },
    });

    if (!user) return next(new AppError("No user found", 400));

    user.password = password;
    user.passwordConfirm = confirmPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;

    await user.save();

    createSendToken(user, 200, res, "Password reset successfully.");
});

module.exports = { registerUser, otpVerify, resendOTP, login, logout, forgetpassword, resetPasswor };
