const { body, param, validationResult } = require("express-validator");
const { error } = require("../utils/responseHandler");

const planValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title must not exceed 255 characters"),
  body("description").trim().optional(),
  body("slot_price")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),
  body("roi_percentage")
    .notEmpty()
    .withMessage("ROI percentage is required")
    .isFloat({ min: 0, max: 100 })
    .withMessage("ROI must be between 0 and 100"),
  body("duration_months")
    .notEmpty()
    .withMessage("Duration is required")
    .isInt({ min: 1 })
    .withMessage("Duration must be at least 1 month"),
];

const paymentAccountValidation = [
  body("bank_name").trim().notEmpty().withMessage("Bank name is required"),
  body("account_name")
    .trim()
    .notEmpty()
    .withMessage("Account name is required"),
  body("account_number")
    .trim()
    .notEmpty()
    .withMessage("Account number is required"),
];

const investmentValidation = [
  body("plan_id")
    .notEmpty()
    .withMessage("Plan ID is required")
    .isUUID()
    .withMessage("Invalid plan ID"),

  body("slots")
    .notEmpty()
    .withMessage("Slots are required")
    .isInt({ min: 1 })
    .withMessage("Slots must be at least 1")
];

const uuidValidation = [param("id").isUUID().withMessage("Invalid ID format")];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    return error(res, "Validation failed", 400, errorMessages);
  }
  next();
};

module.exports = {
  planValidation,
  paymentAccountValidation,
  investmentValidation,
  uuidValidation,
  validate,
};
