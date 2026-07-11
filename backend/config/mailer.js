const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

transporter.verify((err, success) => {
  if (err) {
    console.error("SMTP Error:", err);
  } else {
    console.log("SMTP Server is ready");
  }
});

module.exports = transporter;