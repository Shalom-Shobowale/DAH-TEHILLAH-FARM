const { verifyToken } = require("../utils/generateToken");
const supabase = require("../config/database");
const { error } = require("../utils/responseHandler");

const protect = async (req, res, next) => {
  console.log("🔥 PROTECT MIDDLEWARE HIT");
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    console.log("TOKEN RECEIVED:", token);

    if (!token) {
      return error(res, "No token supplied", 401);
    }

    const decoded = verifyToken(token);

    console.log("DECODED JWT:", decoded);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email, phone, role, status, created_at")
      .eq("id", decoded.id)
      .single();

    console.log("SUPABASE USER:", user);
    console.log("SUPABASE ERROR:", userError);

    if (userError || !user) {
      return error(res, "User not found", 401);
    }

    if (user.status !== "approved") {
      return error(res, "Account awaiting approval", 403);
    }

    req.user = user;
    next();
  } catch (err) {
    console.log("JWT ERROR:", err.message);
    console.log(err);

    return error(res, err.message, 401);
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return error(res, "Access denied. Admin only.", 403);
  }
  next();
};

const memberOnly = (req, res, next) => {
  if (req.user.role !== "member") {
    return error(res, "Access denied. Members only.", 403);
  }
  next();
};

module.exports = { protect, adminOnly, memberOnly };
