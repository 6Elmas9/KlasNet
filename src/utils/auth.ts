import { db } from './database';
import { Utilisateur } from '../types';

const STORAGE_KEY_CURRENT = 'current_user_id';

export function seedUsers() {
  const users = db.getAll<Utilisateur>('utilisateurs');
  if (users && users.length) return;
  
  const now = new Date().toISOString();
  const defaultUsers: Omit<Utilisateur, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { 
      nom: 'POUPOUYA', 
      prenoms: 'Mme', 
      nomUtilisateur: 'poupouya', 
      role: 'Secrétaire', 
      actif: true 
    },
    { 
      nom: 'DIRECTEUR', 
      prenoms: 'M.', 
      nomUtilisateur: 'directeur', 
      role: 'Admin', 
      actif: true 
    },
    { 
      nom: 'ENSEIGNANT', 
      prenoms: 'M.', 
      nomUtilisateur: 'enseignant', 
      role: 'Enseignant', 
      actif: true 
    },
  ];
  
  defaultUsers.forEach(u => {
    db.create<Utilisateur>('utilisateurs', { ...u, createdAt: now } as any);
  });
  
  // Stocker les mots de passe (simple pour app locale)
  const passwords = {
    'poupouya': 'eyemon2024',
    'directeur': 'director2024',
    'enseignant': 'teacher2024'
  };
  
  try { 
    window.localStorage.setItem('__pw_map__', JSON.stringify(passwords)); 
  } catch (e) { 
    /* ignore */ 
  }
}

export function login(nomUtilisateur: string, motDePasse: string): Utilisateur | null {
  seedUsers();
  
  const passwordMap = JSON.parse(
    String(window.localStorage.getItem('__pw_map__') || '{}')
  ) as Record<string, string>;
  
  if (passwordMap[nomUtilisateur] !== motDePasse) return null;
  
  const users = db.getAll<Utilisateur>('utilisateurs');
  const user = users.find(u => u.nomUtilisateur === nomUtilisateur && u.actif) || null;
  
  if (user) {
    try { 
      window.localStorage.setItem(STORAGE_KEY_CURRENT, user.id); 
    } catch (e) {}
    return user;
  }
  
  return null;
}

export function logout() {
  try { 
    window.localStorage.removeItem(STORAGE_KEY_CURRENT); 
  } catch (e) {}
}

export function getCurrentUser(): Utilisateur | null {
  seedUsers();
  try {
    const id = window.localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!id) return null;
    return db.getById<Utilisateur>('utilisateurs', id);
  } catch (e) { 
    return null; 
  }
}

export function changePassword(nomUtilisateur: string, nouveauMotDePasse: string): boolean {
  try {
    const passwordMap = JSON.parse(
      String(window.localStorage.getItem('__pw_map__') || '{}')
    ) as Record<string, string>;
    
    passwordMap[nomUtilisateur] = nouveauMotDePasse;
    window.localStorage.setItem('__pw_map__', JSON.stringify(passwordMap));
    return true;
  } catch (e) {
    return false;
  }
}

export default { seedUsers, login, logout, getCurrentUser, changePassword };