const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP Error:", err);
  } else {
    console.log("SMTP Server is ready");
  }
});

module.exports = transporter;