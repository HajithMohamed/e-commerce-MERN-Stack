const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.APP_USER,
            pass: process.env.APP_PASSWORD
        }
    });

    const mailOptions = {
        from: `"Shoe Bank"<hanoufaatif@gmail.com>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;