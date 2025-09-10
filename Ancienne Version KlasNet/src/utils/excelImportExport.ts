import { Eleve } from '../types';


// Importer les élèves depuis un fichier Excel (xlsx ou xls)
export async function importerElevesDepuisExcel(file: File, mapping?: {
  matricule?: string;
  nom?: string;
  prenoms?: string;
  nomPrenoms?: string;
  moyenne?: string;
  // optional payment mapping: column names for montant, date and modalite
  paymentMontant?: string;
  paymentDate?: string;
  paymentModalite?: string;
}) {
  return new Promise(async (resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target!.result as ArrayBuffer;
        const XLSXModule = await import('xlsx');
        const XLSX: any = XLSXModule && (XLSXModule.default || XLSXModule);
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (!rows || rows.length === 0) {
          reject('Fichier Excel vide ou illisible');
          return;
        }

        const header = rows[0].map((h: any) => String(h || '').trim());
        const body = rows.slice(1);

        if (!mapping) {
          resolve({ columns: header, preview: body.slice(0, 5) });
          return;
        }

  const matriculeIdx = mapping.matricule ? header.findIndex((h: string) => h === mapping.matricule) : -1;
  const nomIdx = mapping.nom ? header.findIndex((h: string) => h === mapping.nom) : -1;
  const prenomsIdx = mapping.prenoms ? header.findIndex((h: string) => h === mapping.prenoms) : -1;
  const nomPrenomsIdx = mapping.nomPrenoms ? header.findIndex((h: string) => h === mapping.nomPrenoms) : -1;

  const paymentMontantIdx = mapping.paymentMontant ? header.findIndex((h: string) => h === mapping.paymentMontant) : -1;
  const paymentDateIdx = mapping.paymentDate ? header.findIndex((h: string) => h === mapping.paymentDate) : -1;
  const paymentModaliteIdx = mapping.paymentModalite ? header.findIndex((h: string) => h === mapping.paymentModalite) : -1;

        if (matriculeIdx === -1) {
          reject('Colonne "Matricule" non trouvée.');
          return;
        }

        const eleves: any[] = body.map((row: any[]) => {
          let nom = '';
          let prenoms = '';
          if (nomPrenomsIdx !== -1) {
            const full = String(row[nomPrenomsIdx] || '').trim();
            const parts = full.split(' ');
            nom = parts[0] || '';
            prenoms = parts.slice(1).join(' ');
          } else {
            nom = nomIdx !== -1 ? String(row[nomIdx] || '').trim() : '';
            prenoms = prenomsIdx !== -1 ? String(row[prenomsIdx] || '').trim() : '';
          }
          const entry: any = {
            id: '',
            matricule: String(row[matriculeIdx] || '').trim(),
            nom,
            prenoms,
            sexe: 'M',
            dateNaissance: '',
            lieuNaissance: '',
            classeId: '',
            anneeEntree: new Date().getFullYear().toString(),
            statut: 'Actif',
            pereTuteur: '',
            mereTutrice: '',
            telephone: '',
            adresse: '',
            photo: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Attach optional payment info if mapping provided and cell not empty
          const payments: any[] = [];
          if (paymentMontantIdx !== -1) {
            const rawMontant = String(row[paymentMontantIdx] ?? '').trim();
            if (rawMontant !== '') {
              const montant = Number(rawMontant.replace(/[^0-9.-]+/g, '')) || 0;
              const date = paymentDateIdx !== -1 ? String(row[paymentDateIdx] ?? '').trim() : new Date().toISOString();
              const modaliteRaw = paymentModaliteIdx !== -1 ? String(row[paymentModaliteIdx] ?? '').trim() : '';
              const modalite = modaliteRaw ? Number(modaliteRaw) : undefined;
              payments.push({ montant, date, modalite });
            }
          }

          if (payments.length) entry.payments = payments;

          return entry as any;
        });

        resolve(eleves);
      } catch (err) {
        reject(err instanceof Error ? err.message : String(err));
      }
    };
    reader.onerror = () => reject('Erreur lecture du fichier');
    reader.readAsArrayBuffer(file);
  });
}

// Exporter les élèves au format Excel (xlsx ou xls)
export async function exporterElevesEnExcel(eleves: Eleve[]) {
  const ExcelJSModule = await import('exceljs');
  const ExcelJS: any = ExcelJSModule && (ExcelJSModule.default || ExcelJSModule);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Élèves');
  sheet.addRow(['Matricule', 'Nom && Prénoms', 'Moyenne']);
  eleves.forEach(e => {
    sheet.addRow([e.matricule, `${e.nom} ${e.prenoms}`, '']);
  });
  return await workbook.xlsx.writeBuffer();
}
