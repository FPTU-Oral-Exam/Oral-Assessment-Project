import { test as setup, expect } from '@playwright/test';

const TEST_USERS = {
  admin: { username: 'admin', password: 'admin123', role: 'SYSTEM_ADMIN' },
  examiner: { username: 'examiner', password: 'examiner123', role: 'EXAMINER' },
  teacher: { username: 'teacher', password: 'teacher123', role: 'TEACHER' },
  student: { username: 'student', password: 'student123', role: 'STUDENT' },
};

setup('seed test database', async ({ request }) => {
  // Wait for API to be ready
  await request.get('http://api:8000/health', { timeout: 60000 });

  // Create test users via API
  for (const user of Object.values(TEST_USERS)) {
    await request.post('http://api:8000/api/admin/users', {
      data: user,
    }).catch(() => {
      // User may already exist
    });
  }
});

export { TEST_USERS };
