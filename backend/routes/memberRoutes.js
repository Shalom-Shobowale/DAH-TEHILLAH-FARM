const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const { protect, memberOnly } = require('../middleware/auth');
const { investmentValidation, uuidValidation, validate } = require('../validators/userValidators');
const { upload, handleUploadError } = require('../middleware/upload');

console.log("memberController:", require('../controllers/memberController'));
console.log("dashboard fn:", memberController.getDashboardStats);

router.use(protect);

router.get('/dashboard', memberController.getDashboardStats);
router.get('/plans', memberController.getActivePlans);
router.get('/payment-account', memberController.getPaymentAccount);

router.post('/investments', investmentValidation, validate, upload.single('proof'), handleUploadError, memberController.createInvestment);
router.get('/investments', memberController.getMyInvestments);

router.get('/notifications', memberController.getNotifications);
router.patch('/notifications/:id/read', uuidValidation, validate, memberController.markNotificationRead);
router.patch('/notifications/read-all', memberController.markAllNotificationsRead);

router.get('/profile', memberController.getProfile);
router.patch('/profile', memberController.updateProfile);
router.post('/change-password', memberController.changePassword);

module.exports = router;


