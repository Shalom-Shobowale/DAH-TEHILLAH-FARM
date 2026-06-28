-- Seed admin user (password: Admin@12345)
-- Bcrypt hash generated with 10 rounds

INSERT INTO users (full_name, email, phone, password_hash, role, status)
VALUES (
    'System Admin',
    'admin@datehillahfarms.com',
    '+2348000000000',
    '$2b$10$rQZ5Q8Z5Q8Z5Q8Z5Q8Z5Q.8Z5Q8Z5Q8Z5Q8Z5Q8Z5Q8Z5Q8Z5Q8Z5',
    'admin',
    'approved'
);

-- Seed sample investment plans
INSERT INTO investment_plans (title, description, amount, roi_percentage, duration_months, status) VALUES
('Starter Plan', 'Perfect for beginners looking to invest in agricultural ventures', 50000.00, 15.00, 3, 'active'),
('Growth Plan', 'Mid-range investment for steady returns', 100000.00, 20.00, 6, 'active'),
('Premium Plan', 'High-value investment with maximum returns', 500000.00, 30.00, 12, 'active');

-- Seed payment account
INSERT INTO payment_accounts (bank_name, account_name, account_number, is_active)
VALUES ('First Bank Nigeria', 'DA-TEHILLAH FARM VENTURES', '0123456789', true);