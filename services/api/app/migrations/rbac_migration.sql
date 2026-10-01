-- RBAC Role Migration
-- Maps old flat roles to new hierarchical roles
UPDATE users SET role = 'SYSTEM_ADMIN' WHERE role = 'ADMIN';
UPDATE users SET role = 'EXAMINER' WHERE role = 'REVIEWER';
