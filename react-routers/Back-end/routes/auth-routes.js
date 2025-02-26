const express = require('express');

const router = express();

const { 
    registerUser, 
    otpVerify, 
    resendOTP, 
    login, 
    logout, 
    forgetpassword, 
    resetPasswor 
} = require('../controller/authController');
const { isAuthenticated } = require('../middleware/isAuthenticated');

router.post('/register', registerUser);
router.post('/verify', isAuthenticated, otpVerify);
router.post('/resendotp',isAuthenticated,resendOTP)
router.get('/login',isAuthenticated,login)
router.post('/logout',logout)
router.post('/forget-password',forgetpassword)
router.post('/reset-password',resetPasswor)

module.exports = router;