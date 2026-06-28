const supabase = require("../config/database");
const { success, error } = require("../utils/responseHandler");

const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: activeInvestments, error: activeError } = await supabase
      .from("investments")
      .select(
        `id, slots, slot_price, total_invested, expected_monthly_return, total_expected_return, investment_status, created_at,investment_plans(id, name, roi_percentage, duration_months)`,
      )
      .eq("user_id", userId)
      .in("investment_status", ["active", "pending"]);

    if (activeError) {
      return error(res, "Failed to retrieve investments", 500);
    }

    const { data: totalInvested } = await supabase
      .from("investments")
      .select("total_invested")
      .eq("user_id", userId)
      .eq("payment_status", "verified");

    const totalInvestedAmount =
      totalInvested?.reduce(
        (sum, inv) => sum + Number(inv.total_invested),
        0,
      ) || 0;

    const { data: expectedReturns } = await supabase
      .from("investments")
      .select("total_expected_return")
      .eq("user_id", userId)
      .eq("payment_status", "verified");

    const totalExpectedReturn =
      expectedReturns?.reduce(
        (sum, inv) => sum + parseFloat(inv.total_expected_return),
        0,
      ) || 0;

    const { count: unreadNotifications } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    return success(
      res,
      {
        activeInvestments: activeInvestments || [],
        totalInvested: totalInvestedAmount,
        expectedReturns: totalExpectedReturn,
        unreadNotifications: unreadNotifications || 0,
      },
      "Dashboard statistics retrieved",
    );
  } catch (err) {
    console.error("Member dashboard error:", err);
    return error(res, "Failed to retrieve dashboard statistics", 500);
  }
};

const getActivePlans = async (req, res) => {
  try {
    const { data: plans, error: planError } = await supabase
      .from("investment_plans")
      .select("*")
      .eq("status", "active")
      .order("slot_price", { ascending: true });

    if (planError) {
      return error(res, "Failed to retrieve plans", 500);
    }

    return success(res, plans, "Investment plans retrieved");
  } catch (err) {
    console.error("Get plans error:", err);
    return error(res, "Failed to retrieve plans", 500);
  }
};

const getPaymentAccount = async (req, res) => {
  try {
    const { data: account, error: accError } = await supabase
      .from("payment_accounts")
      .select("*")
      .eq("is_active", true)
      .single();

    if (accError || !account) {
      return error(res, "No active payment account available", 404);
    }

    return success(res, account, "Payment account retrieved");
  } catch (err) {
    console.error("Get payment account error:", err);
    return error(res, "Failed to retrieve payment account", 500);
  }
};

const createInvestment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan_id, slots } = req.body;

    const slotCount = Number(slots);

    // validate
    if (!Number.isInteger(slotCount) || slotCount <= 0) {
      return error(res, "Slots must be a positive whole number", 400);
    }

    // get plan
    const { data: plan, error: planError } = await supabase
      .from("investment_plans")
      .select("*")
      .eq("id", plan_id)
      .eq("status", "active")
      .single();

    if (planError || !plan) {
      return error(res, "Investment plan not found", 404);
    }

    if (plan.max_slots && slotCount > plan.max_slots) {
      return error(res, "Exceeds maximum slots allowed", 400);
    }

    const totalInvested = slotCount * plan.slot_price;
    const totalAdminFee = slotCount * plan.admin_fee;

    const monthlyReturn = totalInvested * (plan.roi_percentage / 100);
    const totalReturn = monthlyReturn * plan.duration_months;

    const maturityDate = new Date();
    maturityDate.setMonth(maturityDate.getMonth() + plan.duration_months);

    const { data: investment, error: invError } = await supabase
      .from("investments")
      .insert({
        user_id: userId,
        plan_id,
        slots: slotCount,
        slot_price: plan.slot_price,
        total_invested: totalInvested,
        admin_fee: totalAdminFee,
        expected_monthly_return: monthlyReturn,
        total_expected_return: totalReturn,
        start_date: new Date().toISOString(),
        maturity_date: maturityDate.toISOString(),
        payment_status: "pending",
        investment_status: "pending",
      })
      .select()
      .single();

    if (invError) {
      return error(res, "Failed to create investment", 500);
    }

    return success(res, investment, "Investment created successfully");
  } catch (err) {
    console.error(err);
    return error(res, "Server error", 500);
  }
};

const getMyInvestments = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: investments, error: invError } = await supabase
      .from("investments")
      .select(
        `
  id,
  slots,
  slot_price,
  total_invested,
  admin_fee,
  expected_monthly_return,
  total_expected_return,
  payment_status,
  investment_status,
  proof_of_payment,
  created_at,
  updated_at,
  investment_plans(id, name, roi_percentage, duration_months)
`,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (invError) {
      return error(res, "Failed to retrieve investments", 500);
    }

    return success(res, investments, "Your investments retrieved");
  } catch (err) {
    console.error("Get my investments error:", err);
    return error(res, "Failed to retrieve investments", 500);
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: notifications, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (notifError) {
      return error(res, "Failed to retrieve notifications", 500);
    }

    return success(res, notifications, "Notifications retrieved");
  } catch (err) {
    console.error("Get notifications error:", err);
    return error(res, "Failed to retrieve notifications", 500);
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: notif, error: findError } = await supabase
      .from("notifications")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (findError || !notif) {
      return error(res, "Notification not found", 404);
    }

    if (notif.user_id !== userId) {
      return error(res, "Access denied", 403);
    }

    await supabase.from("notifications").update({ is_read: true }).eq("id", id);

    return success(res, null, "Notification marked as read");
  } catch (err) {
    console.error("Mark notification read error:", err);
    return error(res, "Failed to mark notification as read", 500);
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    return success(res, null, "All notifications marked as read");
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    return error(res, "Failed to mark all notifications as read", 500);
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email, phone, status, created_at")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return error(res, "User not found", 404);
    }

    return success(res, user, "Profile retrieved");
  } catch (err) {
    console.error("Get profile error:", err);
    return error(res, "Failed to retrieve profile", 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, phone } = req.body;

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        full_name,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id, full_name, email, phone, status, created_at")
      .single();

    if (updateError) {
      return error(res, "Failed to update profile", 500);
    }

    return success(res, updatedUser, "Profile updated successfully");
  } catch (err) {
    console.error("Update profile error:", err);
    return error(res, "Failed to update profile", 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;
    const bcrypt = require("bcrypt");

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("password_hash")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return error(res, "User not found", 404);
    }

    const isMatch = await bcrypt.compare(current_password, user.password_hash);

    if (!isMatch) {
      return error(res, "Current password is incorrect", 400);
    }

    const saltRounds = 10;
    const newHash = await bcrypt.hash(new_password, saltRounds);

    await supabase
      .from("users")
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq("id", userId);

    return success(res, null, "Password changed successfully");
  } catch (err) {
    console.error("Change password error:", err);
    return error(res, "Failed to change password", 500);
  }
};

module.exports = {
  getDashboardStats,
  getActivePlans,
  getPaymentAccount,
  createInvestment,
  getMyInvestments,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getProfile,
  updateProfile,
  changePassword,
};


