
import nodemailer from "nodemailer";

const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  console.log("Email account:", process.env.EMAIL_USER);
  console.log("Email password configured:", !!process.env.EMAIL_PASS);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for Login",
    text: `Hi,

Here is your OTP: ${otp}

Please enter this code to verify your account. It will expire in 5 minutes.

Thanks!`,
  });
};

export default sendOTP;
