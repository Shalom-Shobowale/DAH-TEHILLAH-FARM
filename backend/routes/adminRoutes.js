const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');
const { planValidation, paymentAccountValidation, uuidValidation, validate } = require('../validators/userValidators');

router.use(protect, adminOnly);

router.get('/dashboard', adminController.getDashboardStats);
router.get('/activity-logs', adminController.getActivityLogs);

router.get('/users', adminController.getUsers);
router.patch('/users/:id/approve', uuidValidation, validate, adminController.approveUser);
router.patch('/users/:id/suspend', uuidValidation, validate, adminController.suspendUser);
router.delete('/users/:id', uuidValidation, validate, adminController.deleteUser);

router.get('/investments', adminController.getInvestments);
router.patch('/investments/:id/approve', uuidValidation, validate, adminController.approveInvestment);
router.patch('/investments/:id/reject', uuidValidation, validate, adminController.rejectInvestment);

router.post('/plans', planValidation, validate, adminController.createPlan);
router.get('/plans', adminController.getPlans);
router.put('/plans/:id', uuidValidation, planValidation, validate, adminController.updatePlan);
router.delete('/plans/:id', uuidValidation, validate, adminController.deletePlan);

router.post('/payment-accounts', paymentAccountValidation, validate, adminController.createPaymentAccount);
router.get('/payment-accounts', adminController.getPaymentAccounts);
router.put('/payment-accounts/:id', uuidValidation, paymentAccountValidation, validate, adminController.updatePaymentAccount);

module.exports = router;
