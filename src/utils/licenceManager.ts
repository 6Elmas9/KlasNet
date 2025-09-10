import { db } from './database';

interface LicenceData {
  key: string;
  ecoleId: string;
  dateExpiration: string;
  signature: string;
  type: 'essai' | 'mensuelle' | 'annuelle';
}

interface LicenceStatus {
  isValid: boolean;
  isExpired: boolean;
  daysRemaining: number;
  type: string;
  dateExpiration: string;
  lastCheck: string;
}

const LICENCE_STORAGE_KEY = 'klasnet_licence';
const LAST_CHECK_KEY = 'klasnet_last_check';
const ANTI_CHEAT_KEY = 'klasnet_time_check';

export class LicenceManager {
  private static instance: LicenceManager;
  
  static getInstance(): LicenceManager {
    if (!LicenceManager.instance) {
      LicenceManager.instance = new LicenceManager();
    }
    return LicenceManager.instance;
  }

  // Vérification anti-triche de la date système
  private checkTimeManipulation(): boolean {
    try {
      const lastCheck = localStorage.getItem(ANTI_CHEAT_KEY);
      const now = Date.now();
      
      if (lastCheck) {
        const lastTime = parseInt(lastCheck);
        // Si la date actuelle est antérieure à la dernière vérification (- 1h de tolérance)
        if (now < lastTime - (60 * 60 * 1000)) {
          console.warn('Manipulation de date détectée');
          return false;
        }
      }
      
      localStorage.setItem(ANTI_CHEAT_KEY, now.toString());
      return true;
    } catch (error) {
      console.error('Erreur vérification anti-triche:', error);
      return false;
    }
  }

  // Décoder une clé de licence
  private decodeLicenceKey(key: string): LicenceData | null {
    try {
      const decoded = atob(key);
      const data = JSON.parse(decoded);
      
      // Vérifier la structure
      if (!data.key || !data.ecoleId || !data.dateExpiration || !data.signature) {
        return null;
      }
      
      return data as LicenceData;
    } catch (error) {
      console.error('Erreur décodage licence:', error);
      return null;
    }
  }

  // Vérifier la signature d'une licence (simple hash pour démo)
  private verifySignature(data: LicenceData): boolean {
    const expectedSignature = this.generateSignature(data.key, data.ecoleId, data.dateExpiration);
    return data.signature === expectedSignature;
  }

  private generateSignature(key: string, ecoleId: string, dateExpiration: string): string {
    // Simple hash pour démo - en production, utiliser une vraie signature cryptographique
    const combined = `${key}:${ecoleId}:${dateExpiration}:KLASNET_SECRET`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Vérifier le statut de la licence
  checkLicenceStatus(): LicenceStatus {
    // Vérification anti-triche
    if (!this.checkTimeManipulation()) {
      return {
        isValid: false,
        isExpired: true,
        daysRemaining: 0,
        type: 'invalide',
        dateExpiration: '',
        lastCheck: new Date().toISOString()
      };
    }

    try {
      const licenceKey = localStorage.getItem(LICENCE_STORAGE_KEY);
      
      if (!licenceKey) {
        // Pas de licence - créer une licence d'essai de 7 jours
        return this.createTrialLicence();
      }

      const licenceData = this.decodeLicenceKey(licenceKey);
      
      if (!licenceData || !this.verifySignature(licenceData)) {
        return {
          isValid: false,
          isExpired: true,
          daysRemaining: 0,
          type: 'invalide',
          dateExpiration: '',
          lastCheck: new Date().toISOString()
        };
      }

      const now = new Date();
      const expiration = new Date(licenceData.dateExpiration);
      const daysRemaining = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const status: LicenceStatus = {
        isValid: daysRemaining > 0,
        isExpired: daysRemaining <= 0,
        daysRemaining: Math.max(0, daysRemaining),
        type: licenceData.type,
        dateExpiration: licenceData.dateExpiration,
        lastCheck: new Date().toISOString()
      };

      localStorage.setItem(LAST_CHECK_KEY, status.lastCheck);
      return status;
      
    } catch (error) {
      console.error('Erreur vérification licence:', error);
      return {
        isValid: false,
        isExpired: true,
        daysRemaining: 0,
        type: 'erreur',
        dateExpiration: '',
        lastCheck: new Date().toISOString()
      };
    }
  }

  // Créer une licence d'essai
  private createTrialLicence(): LicenceStatus {
    const now = new Date();
    const expiration = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 jours
    const ecoleId = 'ECOLE_ESSAI_' + Date.now();
    
    const licenceData: LicenceData = {
      key: `TRIAL_${ecoleId}_${now.getTime()}`,
      ecoleId,
      dateExpiration: expiration.toISOString(),
      type: 'essai',
      signature: this.generateSignature(`TRIAL_${ecoleId}_${now.getTime()}`, ecoleId, expiration.toISOString())
    };

    const encodedKey = btoa(JSON.stringify(licenceData));
    localStorage.setItem(LICENCE_STORAGE_KEY, encodedKey);

    return {
      isValid: true,
      isExpired: false,
      daysRemaining: 7,
      type: 'essai',
      dateExpiration: expiration.toISOString(),
      lastCheck: new Date().toISOString()
    };
  }

  // Activer une licence avec une clé
  activateLicence(key: string): { success: boolean; message: string; status?: LicenceStatus } {
    const licenceData = this.decodeLicenceKey(key);
    
    if (!licenceData) {
      return { success: false, message: 'Clé de licence invalide ou corrompue' };
    }

    if (!this.verifySignature(licenceData)) {
      return { success: false, message: 'Signature de licence invalide' };
    }

    const now = new Date();
    const expiration = new Date(licenceData.dateExpiration);
    
    if (expiration <= now) {
      return { success: false, message: 'Cette licence a expiré' };
    }

    // Sauvegarder la licence
    localStorage.setItem(LICENCE_STORAGE_KEY, key);
    
    const status = this.checkLicenceStatus();
    
    return {
      success: true,
      message: `Licence ${licenceData.type} activée avec succès. Expire le ${expiration.toLocaleDateString('fr-FR')}`,
      status
    };
  }

  // Générer des clés de licence (pour admin/tests)
  generateLicenceKeys(ecoleId: string = 'ECOLE001'): { trial: string; monthly: string; yearly: string } {
    const now = new Date();
    
    // Licence d'essai (7 jours)
    const trialExpiration = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
    const trialData: LicenceData = {
      key: `TRIAL_${ecoleId}_${now.getTime()}`,
      ecoleId,
      dateExpiration: trialExpiration.toISOString(),
      type: 'essai',
      signature: this.generateSignature(`TRIAL_${ecoleId}_${now.getTime()}`, ecoleId, trialExpiration.toISOString())
    };

    // Licence mensuelle (30 jours)
    const monthlyExpiration = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    const monthlyData: LicenceData = {
      key: `MONTHLY_${ecoleId}_${now.getTime()}`,
      ecoleId,
      dateExpiration: monthlyExpiration.toISOString(),
      type: 'mensuelle',
      signature: this.generateSignature(`MONTHLY_${ecoleId}_${now.getTime()}`, ecoleId, monthlyExpiration.toISOString())
    };

    // Licence annuelle (365 jours)
    const yearlyExpiration = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
    const yearlyData: LicenceData = {
      key: `YEARLY_${ecoleId}_${now.getTime()}`,
      ecoleId,
      dateExpiration: yearlyExpiration.toISOString(),
      type: 'annuelle',
      signature: this.generateSignature(`YEARLY_${ecoleId}_${now.getTime()}`, ecoleId, yearlyExpiration.toISOString())
    };

    return {
      trial: btoa(JSON.stringify(trialData)),
      monthly: btoa(JSON.stringify(monthlyData)),
      yearly: btoa(JSON.stringify(yearlyData))
    };
  }

  // Mise à jour automatique des licences (si serveur disponible)
  async updateLicenceFromServer(): Promise<boolean> {
    try {
      // Simuler un appel API (remplacer par vraie URL en production)
      const response = await fetch('/api/licence/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentKey: localStorage.getItem(LICENCE_STORAGE_KEY),
          ecoleId: this.getCurrentEcoleId()
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.newKey) {
          localStorage.setItem(LICENCE_STORAGE_KEY, data.newKey);
          return true;
        }
      }
    } catch (error) {
      // Pas de connexion internet ou serveur indisponible
      console.log('Mise à jour licence impossible (hors ligne)');
    }
    
    return false;
  }

  private getCurrentEcoleId(): string {
    const ecole = db.getAll('ecole')[0] as any;
    return ecole?.codeEtablissement || 'ECOLE_DEFAULT';
  }

  // Réinitialiser la licence (pour tests)
  resetLicence(): void {
    localStorage.removeItem(LICENCE_STORAGE_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
    localStorage.removeItem(ANTI_CHEAT_KEY);
  }
}

export const licenceManager = LicenceManager.getInstance();

// Fonction globale pour générer des licences (console)
(window as any).generateLicences = () => {
  const keys = licenceManager.generateLicenceKeys();
  console.log('🔑 Clés de licence générées:');
  console.log('📅 Essai (7 jours):', keys.trial);
  console.log('📅 Mensuelle (30 jours):', keys.monthly);
  console.log('📅 Annuelle (365 jours):', keys.yearly);
  return keys;
};