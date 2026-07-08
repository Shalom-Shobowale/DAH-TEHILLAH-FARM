const supabase = require("../config/database");
const { success, error } = require("../utils/responseHandler");

const getDashboardStats = async (req, res) => {
  try {
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "member");

    const { count: pendingUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: approvedUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved");

    const { count: suspendedUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("status", "suspended");

    const { count: totalInvestments } = await supabase
      .from("investments")
      .select("*", { count: "exact", head: true });

    const { data: investmentData } = await supabase
      .from("investments")
      .select("slot_price")
      .eq("payment_status", "verified");

    const totalInvestmentValue =
      investmentData?.reduce(
        (sum, inv) => sum + parseFloat(inv.slot_price),
        0,
      ) || 0;

    const { data: pendingInvestments } = await supabase
      .from("investments")
      .select(
        "id, slot_price, created_at, users(full_name, email), investment_plans(name)",
      )
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false })
      .limit(5);

    await supabase.from("activity_logs").insert({
      admin_id: req.user.id,
      action: "Viewed dashboard statistics",
    });

    return success(
      res,
      {
        totalUsers,
        pendingUsers,
        approvedUsers,
        suspendedUsers,
        totalInvestments,
        totalInvestmentValue,
        recentPendingInvestments: pendingInvestments || [],
      },
      "Dashboard statistics retrieved",
    );
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return error(res, "Failed to retrieve dashboard statistics", 500);
  }
};

const getUsers = async (req, res) => {
  try {
    const { status, search } = req.query;

    let query = supabase
      .from("users")
      .select(
        "id, full_name, email, phone, role, status, created_at, updated_at",
      )
      .eq("role", "member")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      return error(res, "Failed to retrieve users", 500);
    }

    return success(res, users, "Users retrieved");
  } catch (err) {
    console.error("Get users error:", err);
    return error(res, "Failed to retrieve users", 500);
  }
};

const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email, status")
      .eq("id", id)
      .single();

    if (userError || !user) {
      return error(res, "User not found", 404);
    }

    if (user.status === "approved") {
      return error(res, "User is already approved", 400);
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, full_name, email, phone, role, status")
      .single();

    if (updateError) {
      return error(res, "Failed to approve user", 500);
    }

    await supabase.from("notifications").insert({
      user_id: id,
      name: "Account Approved",
      message:
        "Congratulations! Your account has been approved. You can now login and start investing.",
    });

    await supabase.from("activity_logs").insert({
      admin_id: req.user.id,
      action: `Approved user: ${user.full_name} (${user.email})`,
    });

    return success(res, updatedUser, "User approved successfully");
  } catch (err) {
    console.error("Approve user error:", err);
    return error(res, "Failed to approve user", 500);
  }
};

const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email, status")
      .eq("id", id)
      .single();

    if (userError || !user) {
      return error(res, "User not found", 404);
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ status: "suspended", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, full_name, email, phone, role, status")
      .single();

    if (updateError) {
      return error(res, "Failed to suspend user", 500);
    }

    await supabase.from("notifications").insert({
      user_id: id,
      name: "Account Suspended",
      message:
        "Your account has been suspended. Please contact support for assistance.",
    });

    await supabase.from("activity_logs").insert({
      admin_id: req.user.id,
      action: `Suspended user: ${user.full_name} (${user.email})`,
    });

    return success(res, updatedUser, "User suspended successfully");
  } catch (err) {
    console.error("Suspend user error:", err);
    return error(res, "Failed to suspend user", 500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("id", id)
      .single();

    if (userError || !user) {
      return error(res, "User not found", 404);
    }

    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return error(res, "Failed to delete user", 500);
    }

    await supabase.from("activity_logs").insert({
      admin_id: req.user.id,
      action: `Deleted user: ${user.full_name} (${user.email})`,
    });

    return success(res, null, "User deleted successfully");
  } catch (err) {
    console.error("Delete user error:", err);
    return error(res, "Failed to delete user", 500);
  }
};

const getInvestments = async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from("investments")
      .select(
        "id, slot_price, expected_return, payment_status, investment_status, proof_of_payment, created_at, updated_at, users(id, full_name, email), investment_plans(id, name, roi_percentage, duration_months)",
      )
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("payment_status", status);
    }

    const { data: investments, error: invError } = await query;

    if (invError) {
      console.error("Supabase investments error:", invError);
      return error(res, invError.message, 500);
    }

    return success(res, investments, "Investments retrieved");
  } catch (err) {
    console.error("Get investments error:", err);
    return error(res, "Failed to retrieve investments", 500);
  }
};

const approveInvestment = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: investment, error: invError } = await supabase
      .from("investments")
      .select(
        "id, payment_status, investment_status, user_id, slot_price, expected_return, users(full_name, email), investment_plans(name)",
      )
      .eq("id", id)
      .single();

    if (invError || !investment) {
      return error(res, "Investment not found", 404);
    }

    if (investment.payment_status !== "pending") {
      return error(res, "Investment is not in pending state", 400);
    }

    const { data: updatedInvestment, error: updateError } = await supabase
      .from("investments")
      .update({
        payment_status: "verified",
        investment_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return error(res, "Failed to approve investment", 500);
    }

    await supabase.from("notifications").insert({
      user_id: investment.user_id,
      name: "Investment Approved",
      message: `Your investment of ₦${parseFloat(investment.slot_price).toLocaleString()} in ${investment.investment_plans.name} has been approved and is now active.`,
    });

    await supabase.from("activity_logs").insert({
      admin_id: req.user.id,
      action: `Approved investment ID: ${id} for ${investment.users.full_name}`,
    });

    return success(res, updatedInvestment, "Investment approved successfully");
  } catch (err) {
    console.error("Approve investment error:", err);
    return error(res, "Failed to approve investment", 500);
  }
};

const rejectInvestment = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: investment, error: invError } = await supabase
      .from("investments")
      .select(
        "id, payment_status, user_id, slot_price, investment_plans(name), users(full_name)",
      )
      .eq("id", id)
      .single();

    if (invError || !investment) {
      return error(res, "Investment not found", 404);
    }

    if (investment.payment_status !== "pending") {
      return error(res, "Investment is not in pending state", 400);
    }

    const { data: updatedInvestment, error: updateError } = await supabase
      .from("investments")
      .update({
        payment_status: "rejected",
        investment_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return error(res, "Failed to reject investment", 500);
    }

    await supabase.from("notifications").insert({
      user_id: investment.user_id,
      name: "Investment Rejected",
      message: `Your investment of ₦${parseFloat(investment.slot_price).toLocaleString()} in ${investment.investment_plans.name} was rejected. Please contact support for assistance.`,
    });

    await supabase.from("activity_logs").insert({
      admin_id: req.user.id,
      action: `Rejected investment ID: ${id} for ${investment.users.full_name}`,
    });

    return success(res, updatedInvestment, "Investment rejected");
  } catch (err) {
    console.error("Reject investment error:", err);
    return error(res, "Failed to reject investment", 500);
  }
};

const createPlan = async (req, res) => {
  try {
    const {
      name,
      description,
      slot_price,
      admin_fee,
      roi_percentage,
      duration_months,
      max_slots,
      status,
    } = req.body;

    const { data: plan, error: planError } = await supabase
      .from("investment_plans")
      .insert({
        name,
        description,
        slot_price,
        admin_fee,
        roi_percentage,
        duration_months,
        max_slots,
        status: status || "active",
      })
      .select()
      .single();

    if (planError) {
      console.log(planError);
      return error(res, planError.message, 500);
    }

    return success(res, plan, "Plan created successfully", 201);
  } catch (err) {
    console.log(err);
    return error(res, err.message, 500);
  }
};

const getPlans = async (req, res) => {
  try {
    const { data: plans, error: planError } = await supabase
      .from("investment_plans")
      .select("*")
      .order("created_at", { ascending: false });

    if (planError) {
      return error(res, "Failed to retrieve plans", 500);
    }

    return success(res, plans, "Plans retrieved");
  } catch (err) {
    console.error("Get plans error:", err);
    return error(res, "Failed to retrieve plans", 500);
  }
};

const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      slot_price,
      admin_fee,
      roi_percentage,
      duration_months,
      max_slots,
      status,
    } = req.body;

    const { data: existingPlan, error: findError } = await supabase
      .from("investment_plans")
      .select("id, name")
      .eq("id", id)
      .single();

    if (findError || !existingPlan) {
      return error(res, "Plan not found", 404);
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;

    if (description !== undefined) updateData.description = description;

    if (slot_price !== undefined) updateData.slot_price = slot_price;

    if (admin_fee !== undefined) updateData.admin_fee = admin_fee;

    if (roi_percentage !== undefined)
      updateData.roi_percentage = roi_percentage;

    if (duration_months !== undefined)
      updateData.duration_months = duration_months;

    if (max_slots !== undefined) updateData.max_slots = max_slots;

    if (status !== undefined) updateData.status = status;

    const { data: updatedPlan, error: updateError } = await supabase
      .from("investment_plans")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.log("SUPABASE UPDATE ERROR:", updateError);
      return error(res, updateError.message, 500);
    }

    await supabase.from("activity_logs").insert({
      admin_id: req.user.id,
      action: `Updated investment plan: ${existingPlan.name}`,
    });

    return success(res, updatedPlan, "Plan updated successfully");
  } catch (err) {
    console.error("Update plan error:", err);
    return error(res, err.message, 500);
  }
};

const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: plan, error: findError } = await supabase
      .from("investment_plans")
      .select("id, name")
      .eq("id", id)
      .single();

    if (findError || !plan) {
      return error(res, "Plan not found", 404);
    }

    const { error: deleteError } = await supabase
      .from("investment_plans")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return error(res, "Failed to delete plan", 500);
    }

    await supabase.from("activity_logs").insert({
      admin_id: req.user.id,
      action: `Deleted investment plan: ${plan.name}`,
    });

    return success(res, null, "Plan deleted successfully");
  } catch (err) {
    console.error("Delete plan error:", err);
    return error(res, "Failed to delete plan", 500);
  }
};

const createPaymentAccount = async (req, res) => {
  try {
    const { bank_name, account_name, account_number } = req.body;

    const { data: account, error: accError } = await supabase
      .from("payment_accounts")
      .insert({
        bank_name,
        account_name,
        account_number,
        is_active: true,
      })
      .select()
      .single();

    if (accError) {
      return error(res, "Failed to create payment account", 500);
    }

    await supabase.from("activity_logs").insert({
      admin_id: req.user.id,
      action: `Created payment account: ${bank_name}`,
    });

    return success(res, account, "Payment account created successfully", 201);
  } catch (err) {
    console.error("Create payment account error:", err);
    return error(res, "Failed to create payment account", 500);
  }
};

const getPaymentAccounts = async (req, res) => {
  try {
    const { data: accounts, error: accError } = await supabase
      .from("payment_accounts")
      .select("*")
      .order("created_at", { ascending: false });

    if (accError) {
      return error(res, "Failed to retrieve payment accounts", 500);
    }

    return success(res, accounts, "Payment accounts retrieved");
  } catch (err) {
    console.error("Get payment accounts error:", err);
    return error(res, "Failed to retrieve payment accounts", 500);
  }
};

const updatePaymentAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { bank_name, account_name, account_number, is_active } = req.body;

    const { data: existingAccount, error: findError } = await supabase
      .from("payment_accounts")
      .select("id, bank_name")
      .eq("id", id)
      .single();

    if (findError || !existingAccount) {
      return error(res, "Payment account not found", 404);
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (bank_name) updateData.bank_name = bank_name;
    if (account_name) updateData.account_name = account_name;
    if (account_number) updateData.account_number = account_number;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedAccount, error: updateError } = await supabase
      .from("payment_accounts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return error(res, "Failed to update payment account", 500);
    }

    await supabase.from("activity_logs").insert({
      admin_id: req.user.id,
      action: `Updated payment account: ${existingAccount.bank_name}`,
    });

    return success(res, updatedAccount, "Payment account updated successfully");
  } catch (err) {
    console.error("Update payment account error:", err);
    return error(res, "Failed to update payment account", 500);
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const { data: logs, error: logError } = await supabase
      .from("activity_logs")
      .select("id, action, created_at, users(id, full_name, email)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (logError) {
      return error(res, "Failed to retrieve activity logs", 500);
    }

    return success(res, logs, "Activity logs retrieved");
  } catch (err) {
    console.error("Get activity logs error:", err);
    return error(res, "Failed to retrieve activity logs", 500);
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  approveUser,
  suspendUser,
  deleteUser,
  getInvestments,
  approveInvestment,
  rejectInvestment,
  createPlan,
  getPlans,
  updatePlan,
  deletePlan,
  createPaymentAccount,
  getPaymentAccounts,
  updatePaymentAccount,
  getActivityLogs,
};
