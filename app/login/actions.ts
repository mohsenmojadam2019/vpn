'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { setAdminSession } from '@/lib/auth';

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !passwordHash || !process.env.AUTH_SECRET) {
    redirect('/login?error=config');
  }

  const emailMatches = email === adminEmail;
  const passwordMatches = emailMatches ? await bcrypt.compare(password, passwordHash) : false;

  if (!emailMatches || !passwordMatches) {
    redirect('/login?error=invalid');
  }

  await setAdminSession(adminEmail);
  redirect('/admin');
}
