const bcrypt = require("bcrypt");
const supabase = require("../config/database");
const crypto = require("crypto");
const transporter = require("../config/mailer");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateToken");
const { success, error } = require("../utils/responseHandler");

const register = async (req, res) => {
  try {
    const { full_name, email, phone, password } = req.body;

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return error(res, "Email already registered", 400);
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        full_name,
        email,
        phone,
        password_hash,
        role: "member",
        status: "pending",
        email_verified: false,
        verification_token: verificationToken,
      })
      .select("id, full_name, email, phone, role, status, created_at")
      .single();

    if (insertError) {
      return error(res, "Failed to create user", 500);
    }

    const verifyUrl = `http://localhost:3000/api/auth/verify-email/${verificationToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: "Verify your email",
      html: `
        <h2>Welcome to DA-TEHILLAH FARM VENTURES</h2>

        <p>Click the button below to verify your email.</p>

        <a href="${verifyUrl}">
            Verify Email
        </a>
    `,
    });

    return success(
      res,
      newUser,
      "Registration successful. Please check your email to verify your account.",
      201,
    );
  } catch (err) {
    console.error("Register error:", err);
    return error(res, "Failed to register user", 500);
  }
};

const verifyEmail = async (req, res) => {
  console.log("Verify endpoint hit");

  const token = req.params.token;
  console.log("Token:", token);

  const { data: user, error: dbError } = await supabase
    .from("users")
    .select("*")
    .eq("verification_token", token)
    .single();

  console.log("User:", user);
  console.log("DB Error:", dbError);

  if (!user) {
    return res.send("Invalid verification link.");
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      email_verified: true,
      verification_token: null,
    })
    .eq("id", user.id);

  console.log("Update Error:", updateError);

  console.log("Redirecting...");

  return res.redirect(
    "http://localhost:5500/backend/public/member/login.html?verified=true",
  );
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (userError || !user) {
      return error(res, "Invalid credentials", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return error(res, "Invalid credentials", 401);
    }

    if (!user.email_verified) {
      return error(res, "Please verify your email before logging in.", 403);
    }

    if (user.status === "pending") {
      return error(
        res,
        "Your account is awaiting administrator approval.",
        403,
      );
    }

    if (user.status === "suspended") {
      return error(
        res,
        "Your account has been suspended. Please contact support.",
        403,
      );
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await supabase.from("refresh_tokens").insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { password_hash, ...userData } = user;

    return success(
      res,
      {
        user: userData,
        accessToken,
        refreshToken,
      },
      "Login successful",
    );
  } catch (err) {
    console.error("Login error:", err);
    return error(res, "Failed to login", 500);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return error(res, "Refresh token required", 400);
    }

    const { data: storedToken, error: tokenError } = await supabase
      .from("refresh_tokens")
      .select("*, users(*)")
      .eq("token", refreshToken)
      .single();

    if (tokenError || !storedToken) {
      return error(res, "Invalid refresh token", 401);
    }

    if (new Date(storedToken.expires_at) < new Date()) {
      await supabase.from("refresh_tokens").delete().eq("id", storedToken.id);
      return error(res, "Refresh token expired", 401);
    }

    const tokenPayload = {
      id: storedToken.users.id,
      email: storedToken.users.email,
      role: storedToken.users.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    await supabase.from("refresh_tokens").delete().eq("id", storedToken.id);
    await supabase.from("refresh_tokens").insert({
      user_id: storedToken.user_id,
      token: newRefreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return success(
      res,
      { accessToken, refreshToken: newRefreshToken },
      "Token refreshed",
    );
  } catch (err) {
    console.error("Refresh token error:", err);
    return error(res, "Failed to refresh token", 500);
  }
};

const getMe = async (req, res) => {
  try {
    return success(res, req.user, "User profile retrieved");
  } catch (err) {
    console.error("Get me error:", err);
    return error(res, "Failed to get user profile", 500);
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await supabase.from("refresh_tokens").delete().eq("token", refreshToken);
    }

    return success(res, null, "Logged out successfully");
  } catch (err) {
    console.error("Logout error:", err);
    return error(res, "Failed to logout", 500);
  }
};

module.exports = { register, login, refreshToken, getMe, logout, verifyEmail };
