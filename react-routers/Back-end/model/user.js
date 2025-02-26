const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate : [validator.isEmail,"Please provide an valid email"]
    },
    password: {
        type: String,
        required: true,
        minlength:8,
        select : false
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'superAdmin'],
        default: 'user'
    },
    isVerified : {
        type : Boolean,
        default : false,
    },
    otp : {
        type : String,
        default : null
    },
    otpExpires : {
        type : Date,
        default : null,
    },
    resetPasswordOtp : {
        type : String,
        default : null
    },
    resetPasswordOtpExpires : {
        type : Date,
        default : null,
    },
    createdAt : {
        type : Date,
        default : Date.now()
    }
}, { timestamps: true });

userSchema.pre('save', async function (next){
    if(!this.isModified('password')) return next()
    
    this.password = await bcrypt.hash(this.password,12)

    this.passwordConfirm = undefined; 
    next()
})

userSchema.methods.correctPassword = async function(password,userPassword){
    return await bcrypt.compare(password, userPassword)
}
const User = mongoose.model('User', userSchema);

module.exports = User;