const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.BACKUP_EMAIL,
      subject: 'Test Backup',
      text: 'This is a test email.'
    });

    console.log('Email sent successfully!');
  } catch (e) {
    console.error('Email failed:', e);
  }
}

testEmail();
