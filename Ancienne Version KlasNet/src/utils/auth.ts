import { db } from './database';
import { Utilisateur } from '../types';

const STORAGE_KEY_CURRENT = 'current_user_id';

export function seedUsers() {
  const users = db.getAll<Utilisateur>('utilisateurs');
  if (users && users.length) return;
  const now = new Date().toISOString();
  const defaultUsers: Omit<Utilisateur, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { nom: 'POUPOUYA', prenoms: 'Mme', email: 'poupouya@ecole.local', role: 'Secrétaire', actif: true },
    { nom: 'DIREC', prenoms: 'M.', email: 'directeur@ecole.local', role: 'Admin', actif: true },
    { nom: 'AIDE', prenoms: 'M.', email: 'aide@ecole.local', role: 'Enseignant', actif: true },
  ];
  defaultUsers.forEach(u => {
    db.create<Utilisateur>('utilisateurs', { ...u, createdAt: now } as any);
  });
  // store a simple password map in localStorage (not secure, but ok for local app)
  const pw = {
    'poupouya@ecole.local': 'eyemon2024',
    'directeur@ecole.local': 'director2024',
    'aide@ecole.local': 'teacher2024'
  };
  try { window.localStorage.setItem('__pw_map__', JSON.stringify(pw)); } catch (e) { /* ignore */ }
}

export function login(email: string, password: string): Utilisateur | null {
  seedUsers();
  const map = JSON.parse(String(window.localStorage.getItem('__pw_map__') || '{}')) as Record<string,string>;
  if (map[email] !== password) return null;
  const users = db.getAll<Utilisateur>('utilisateurs');
  const u = users.find(x => x.email === email) || null;
  if (u) {
    try { window.localStorage.setItem(STORAGE_KEY_CURRENT, u.id); } catch (e) {}
    return u;
  }
  return null;
}

export function logout() {
  try { window.localStorage.removeItem(STORAGE_KEY_CURRENT); } catch (e) {}
}

export function getCurrentUser(): Utilisateur | null {
  seedUsers();
  try {
    const id = window.localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!id) return null;
    return db.getById<Utilisateur>('utilisateurs', id);
  } catch (e) { return null; }
}

export default { seedUsers, login, logout, getCurrentUser };
