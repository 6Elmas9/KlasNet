
import React, { useState, useMemo } from 'react';
import { Search, Plus, Download, Upload, Edit2, Eye, Trash2, Filter, Printer } from 'lucide-react';
import { db } from '../../utils/database';
import { Eleve, Classe } from '../../types';
import { FraisScolaire, Paiement } from '../../types';
import { isEleveInscrit } from '../../utils/payments';
import EnteteFiche from '../EnteteFiche';
import { getEnteteConfig } from '../../utils/entetesConfig';
// ...existing code... (print preview util not used here)

interface ElevesListProps {
  onEleveSelect: (eleve: Eleve | null) => void;
  onNewEleve: () => void;
}

export default function ElevesList({ onEleveSelect, onNewEleve }: ElevesListProps) {
  // Sélection multiple (doit être dans le composant !)
  const [selectedEleves, setSelectedEleves] = useState<string[]>([]);
  const [showChangeClasse, setShowChangeClasse] = useState(false);
  const [newClasseId, setNewClasseId] = useState('');

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEleves(filteredEleves.map((e: any) => e.id));
    } else {
      setSelectedEleves([]);
    }
  };
  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedEleves(prev => checked ? [...prev, id] : prev.filter(eid => eid !== id));
  };
  const handleDeleteSelected = () => {
    if (selectedEleves.length === 0) return;
    if (!window.confirm(`Supprimer ${selectedEleves.length} élève(s) ?`)) return;
    selectedEleves.forEach(id => db.delete('eleves', id));
    setTimeout(() => window.location.reload(), 100);
  };
  const handleChangeClasse = () => {
    if (!newClasseId) return;
    selectedEleves.forEach(id => db.update('eleves', id, { classeId: newClasseId } as any));
    setShowChangeClasse(false);
    setSelectedEleves([]);
    setTimeout(() => window.location.reload(), 100);
  };
  // Aperçu et mapping import
  const [importFile, setImportFile] = useState<File|null>(null);
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importMapping, setImportMapping] = useState({ matricule: '', nom: '', prenoms: '', nomPrenoms: '' });
  // optional payment mapping keys
  const [importPaymentMapping, setImportPaymentMapping] = useState({ montant: '', date: '', modalite: '' });
  const [importClasseId, setImportClasseId] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [importCreatePayments, setImportCreatePayments] = useState(false);
  const [importSummary, setImportSummary] = useState<{ created: number; updated: number; paymentsCreated: number; errors: string[] } | null>(null);
  const [showImportSummaryModal, setShowImportSummaryModal] = useState(false);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    // Si le fichier est .xls (BIFF) : SheetJS peut souvent le lire, mais certains fichiers très anciens ou corrompus
    // peuvent poser problème — demander confirmation avant de continuer.
    if (file.name.toLowerCase().endsWith('.xls')) {
      const ok = window.confirm("Le fichier sélectionné est au format .xls (ancien). Voulez-vous tenter l'import (peut échouer sur des fichiers BIFF très anciens) ?");
      if (!ok) return;
    }

    try {
      const mod = await import('../../utils/excelImportExport');
      const importer = mod.importerElevesDepuisExcel;
      if (typeof importer !== 'function') throw new Error('Module d\'import introuvable');
      const res: any = await importer(file);
      if (!res) throw new Error('Aucune donnée retournée par l\'importeur');
      if (Array.isArray(res)) {
        // importeur a retourné directement la liste d'élèves
        setImportPreview(res);
        setShowImportModal(true);
      } else if (res.columns) {
        setImportColumns(res.columns);
        setImportPreview(res.preview || []);
        setShowMappingModal(true);
      } else {
        setImportPreview(res.preview || []);
        setShowImportModal(true);
      }
    } catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  alert('Erreur importation : ' + msg + "\n(Vérifiez que le serveur de développement a bien chargé le module de lecture Excel — 'xlsx' / SheetJS.)");
      console.error('Import error:', err);
    }
  };

  const handleValidateMapping = async () => {
    if (!importFile) return;
    setShowMappingModal(false);
    setShowImportModal(true);
  const { importerElevesDepuisExcel } = await import('../../utils/excelImportExport');
  const mapping = { ...importMapping, paymentMontant: importPaymentMapping.montant, paymentDate: importPaymentMapping.date, paymentModalite: importPaymentMapping.modalite };
  const res: any = await importerElevesDepuisExcel(importFile, mapping);
    setImportPreview(res);
  };

  // Heuristique simple pour auto-détecter un mapping basé sur les noms de colonnes
  const autoDetectMapping = () => {
    const cols = importColumns.map(c => c.toLowerCase());
    const pick = (candidates: string[]) => {
      for (const cand of candidates) {
        const idx = cols.findIndex(col => col.includes(cand));
        if (idx !== -1) return importColumns[idx];
      }
      return '';
    };

    const auto = {
      matricule: pick(['matric', 'matri', 'id', 'numero', 'num']),
      nom: pick(['nom', 'lastname', 'surname', 'nom_complet']),
      prenoms: pick(['prenom', 'prénom', 'given', 'prenoms']),
      nomPrenoms: pick(['nom_prenom', 'nom_prenoms', 'nomprenom', 'nom et prenoms', 'nom et pr'])
    };
    setImportMapping(prev => ({ ...prev, ...auto }));
  };

  const handleValidateImport = async () => {
    if (!importClasseId) {
      alert('Sélectionnez une classe pour l’importation.');
      return;
    }
    const { db } = await import('../../utils/database');
    const { processPayment } = await import('../../utils/payments');
    let created = 0;
    let updated = 0;
    let paymentsCreated = 0;
    const errors: string[] = [];

    for (const eleve of importPreview) {
      try {
        const existing = db.getAll('eleves').find((ex: any) => (
          (ex.matricule && ex.matricule === (eleve.matricule || '')) ||
          (ex.nom === (eleve.nom || '') && ex.prenoms === (eleve.prenoms || ''))
        ));
        if (existing) {
          db.update('eleves', (existing as any).id, { classeId: importClasseId } as any);
          updated++;
        } else {
          const newId = db.generateMatricule();
          db.create('eleves', {
            ...eleve,
            id: newId,
            classeId: importClasseId,
            anneeEntree: new Date().getFullYear().toString(),
            statut: 'Actif',
            pereTuteur: eleve.pereTuteur || '',
            mereTutrice: eleve.mereTutrice || '',
            telephone: eleve.telephone || '',
            adresse: eleve.adresse || '',
            photo: eleve.photo || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          created++;

          if (importCreatePayments && (eleve as any).payments && Array.isArray((eleve as any).payments)) {
            for (const p of (eleve as any).payments) {
              try {
                await processPayment(newId, Number(p.montant || 0), p.date || new Date().toISOString(), { modalite: p.modalite });
                paymentsCreated++;
              } catch (err) {
                console.warn('Erreur création paiement import pour', newId, err);
                errors.push(`Paiement: erreur pour ${eleve.matricule || eleve.nom}: ${err}`);
              }
            }
          }
        }
      } catch (err) {
        console.error('Erreur import ligne', eleve, err);
        errors.push(String(err));
      }
    }

    setShowImportModal(false);
    setImportPreview([]);
    setImportClasseId('');
    setImportFile(null);
    setImportSummary({ created, updated, paymentsCreated, errors });
    setShowImportSummaryModal(true);
  };
  // Import/Export Excel
  // (Supprimé la version simple, on garde la version avec aperçu et sélection de classe)
  const handleExportExcel = async () => {
  const { exporterElevesEnExcel } = await import('../../utils/excelImportExport');
  const data = await exporterElevesEnExcel(eleves);
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eleves_klasnet_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  // Calcul du statut financier
  const fraisScolaires = db.getAll<FraisScolaire>('fraisScolaires');
  const paiements = db.getAll<Paiement>('paiements');

  function getStatutFinancier(eleve: Eleve): 'Payé' | 'Partiel' | 'Impayé' | 'Non défini' {
    const classe = classes.find(c => c.id === eleve.classeId);
    if (!classe) return 'Non défini';
    const frais = fraisScolaires.find(f => f.niveau === classe.niveau && f.anneeScolaire === classe.anneeScolaire);
    const totalFrais = frais ? ((frais.fraisInscription || 0) + (frais.fraisScolarite || 0) + (frais.fraisCantine || 0) + (frais.fraisTransport || 0) + (frais.fraisFournitures || 0)) : 0;

    // Prefer explicit 'inscription' check: consider élève "inscrit" only if modalité 1 is fully paid.
    try {
      const inscrit = isEleveInscrit(eleve.id);
      if (inscrit) return 'Payé';
    } catch (err) {
      // if schedule cannot be computed, fall back to total-based heuristic below
      console.warn('isEleveInscrit check failed for', eleve.id, err);
    }

    const paiementsEleve = paiements.filter(p => p.eleveId === eleve.id);
    const totalPaye = paiementsEleve.reduce((sum, p) => sum + (p.montant || 0), 0);
    if (totalPaye >= totalFrais && totalFrais > 0) return 'Payé';
    if (totalPaye > 0 && totalPaye < totalFrais) return 'Partiel';
    if (totalPaye === 0 && totalFrais > 0) return 'Impayé';
    return 'Non défini';
  }

  function getStatutFinancierColor(statut: string) {
    switch (statut) {
      case 'Payé': return 'bg-green-100 text-green-800';
      case 'Partiel': return 'bg-orange-100 text-orange-800';
      case 'Impayé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [sortField, setSortField] = useState<keyof Eleve>('nom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const eleves = db.getAll<Eleve>('eleves');
  const classes = db.getAll<Classe>('classes');
  const enteteConfig = getEnteteConfig('eleves');

  // Build printable class label and school year
  const selectedClasseObj = classes.find(c => c.id === filterClasse);
  const printClasseLabel = selectedClasseObj ? `${selectedClasseObj.niveau} ${selectedClasseObj.section || ''}`.trim() : 'Toutes les classes';
  const printAnnee = selectedClasseObj ? selectedClasseObj.anneeScolaire : (classes[0]?.anneeScolaire || '');
  const printLibelle = `${printClasseLabel}${printAnnee ? ' — ' + printAnnee : ''} — ${enteteConfig.header}`;
  const includeClasseColumnInPrint = !selectedClasseObj; // when printing all classes

  const filteredEleves = useMemo(() => {
    let filtered = [...eleves];

    // Recherche textuelle
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(eleve =>
        eleve.nom.toLowerCase().includes(term) ||
        eleve.prenoms.toLowerCase().includes(term) ||
        eleve.matricule.toLowerCase().includes(term) ||
        eleve.pereTuteur.toLowerCase().includes(term) ||
        eleve.mereTutrice.toLowerCase().includes(term)
      );
    }

    // Filtrage par classe
    if (filterClasse) {
      filtered = filtered.filter(eleve => eleve.classeId === filterClasse);
    }

    // Filtrage par statut financier
    if (filterStatut) {
      filtered = filtered.filter(eleve => getStatutFinancier(eleve) === filterStatut);
    }

    // Tri
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Provide fallback for undefined values
      if (typeof aValue === 'undefined' || aValue === null) aValue = '';
      if (typeof bValue === 'undefined' || bValue === null) bValue = '';

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [eleves, searchTerm, filterClasse, filterStatut, sortField, sortDirection]);

  const handleSort = (field: keyof Eleve) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = (eleve: Eleve) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'élève ${eleve.prenoms} ${eleve.nom} ?`)) {
      db.delete('eleves', eleve.id);
      db.addHistorique({
        type: 'suppression',
        cible: 'Élève',
        cibleId: eleve.id,
        description: `Suppression de l'élève ${eleve.prenoms} ${eleve.nom}`,
        utilisateur: 'ADMIN',
      });
      setTimeout(() => window.location.reload(), 100);
    }
  };

  const getClasseNom = (classeId: string) => {
    const classe = classes.find(c => c.id === classeId);
    return classe ? `${classe.niveau} ${classe.section}` : 'Non assigné';
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Actif': return 'bg-green-100 text-green-800';
      case 'Inactif': return 'bg-gray-100 text-gray-800';
      case 'Transféré': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Élèves</h1>
          <p className="text-gray-600">{filteredEleves.length} élève(s) trouvé(s)</p>
        </div>
  <div className="flex space-x-3">
          <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <Upload className="h-4 w-4" />
            <span>Importer</span>
            {/* accept both xlsx and xls but prefer xlsx; .xls will show a warning */}
            <input type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportExcel} />
    {/* Modal mapping des colonnes */}
    {showMappingModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-[90vw] p-6 relative animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Importer : sélectionner les colonnes</h2>
            <div className="flex items-center space-x-2">
              <button onClick={autoDetectMapping} className="px-3 py-1 bg-blue-50 border rounded text-sm">Auto-detect</button>
              <button onClick={() => setImportMapping({ matricule: '', nom: '', prenoms: '', nomPrenoms: '' })} className="px-3 py-1 bg-gray-50 border rounded text-sm">Réinitialiser</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium">Matricule</label>
              <select value={importMapping.matricule} onChange={e => setImportMapping({ ...importMapping, matricule: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="">-- Aucun --</option>
                {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>

              <label className="block text-sm font-medium">Nom</label>
              <select value={importMapping.nom} onChange={e => setImportMapping({ ...importMapping, nom: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="">-- Aucun --</option>
                {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>

              <label className="block text-sm font-medium">Prénoms</label>
              <select value={importMapping.prenoms} onChange={e => setImportMapping({ ...importMapping, prenoms: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="">-- Aucun --</option>
                {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">Nom complet (si présent)</label>
              <select value={importMapping.nomPrenoms} onChange={e => setImportMapping({ ...importMapping, nomPrenoms: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="">-- Aucun --</option>
                {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
              <div className="text-xs text-gray-500">Si utilisé, le nom sera le premier mot et le reste sera considéré comme prénoms.</div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Aperçu (premières lignes)</label>
                <div className="h-40 overflow-auto border rounded">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        {importColumns.map(col => <th key={col} className="px-2 py-1 border">{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 10).map((row, i) => (
                        <tr key={i} className="odd:bg-white even:bg-gray-50">
                          {importColumns.map((_, j) => <td key={j} className="px-2 py-1 border truncate max-w-[8rem]">{String(row[j] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">Colonne Paiement - Montant (optionnel)</label>
              <select value={importPaymentMapping.montant} onChange={e => setImportPaymentMapping({ ...importPaymentMapping, montant: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="">-- Aucun --</option>
                {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>

              <label className="block text-sm font-medium">Colonne Paiement - Date (optionnel)</label>
              <select value={importPaymentMapping.date} onChange={e => setImportPaymentMapping({ ...importPaymentMapping, date: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="">-- Aucun --</option>
                {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>

              <label className="block text-sm font-medium">Colonne Paiement - Modalité (optionnel)</label>
              <select value={importPaymentMapping.modalite} onChange={e => setImportPaymentMapping({ ...importPaymentMapping, modalite: e.target.value })} className="w-full border rounded px-3 py-2">
                <option value="">-- Aucun --</option>
                {importColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button onClick={() => setShowMappingModal(false)} className="px-4 py-2 bg-gray-100 rounded">Annuler</button>
            <button onClick={handleValidateMapping} className="px-4 py-2 bg-teal-600 text-white rounded">Valider et continuer</button>
          </div>
        </div>
      </div>
    )}

    {/* Modal aperçu importation après mapping */}
    {showImportModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-[90vw] p-8 relative animate-fade-in flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-6 text-center">Aperçu de l'importation</h2>
          <div className="w-full max-h-[60vh] overflow-y-auto mb-6 border rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr className="text-center">
                  <th className="py-2 px-3 border">Matricule</th>
                  <th className="py-2 px-3 border">Nom</th>
                  <th className="py-2 px-3 border">Prénoms</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((e, idx) => (
                  <tr key={idx} className="text-center hover:bg-gray-50">
                    <td className="py-2 px-3 border">{e.matricule}</td>
                    <td className="py-2 px-3 border">{e.nom}</td>
                    <td className="py-2 px-3 border">{e.prenoms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mb-6 w-full flex flex-col items-center">
            <label className="font-semibold mb-2">Classe d'affectation :</label>
            <select
              value={importClasseId}
              onChange={e => setImportClasseId(e.target.value)}
              className="px-3 py-2 border rounded w-full max-w-xs"
            >
              <option value="">Sélectionner une classe</option>
              {classes.map(classe => (
                <option key={classe.id} value={classe.id}>{classe.niveau} {classe.section}</option>
              ))}
            </select>
            <div className="mt-4 flex items-center space-x-2">
              <input id="create-payments" type="checkbox" checked={importCreatePayments} onChange={e=>setImportCreatePayments(e.target.checked)} />
              <label htmlFor="create-payments" className="text-sm">Créer les paiements détectés dans le fichier d'import</label>
            </div>
            {/* Aperçu des paiements détectés */}
            {importPreview && Array.isArray(importPreview) && importPreview.some((r:any)=>r.payments && r.payments.length > 0) && (
              <div className="mt-4 w-full max-w-2xl border rounded p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Paiements détectés dans l'import</h3>
                  <div className="text-sm text-gray-600">{importPreview.reduce((acc:any, r:any)=> acc + ((r.payments && r.payments.length) || 0), 0)} paiement(s)</div>
                </div>
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-white sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left">Matricule</th>
                        <th className="px-2 py-1 text-left">Nom</th>
                        <th className="px-2 py-1 text-left">Montant</th>
                        <th className="px-2 py-1 text-left">Date</th>
                        <th className="px-2 py-1 text-left">Modalité</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((r:any, i:number) => (r.payments || []).map((p:any, j:number) => (
                        <tr key={`${i}-${j}`} className={j % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1">{r.matricule}</td>
                          <td className="px-2 py-1">{r.nom} {r.prenoms}</td>
                          <td className="px-2 py-1">{p.montant}</td>
                          <td className="px-2 py-1">{p.date}</td>
                          <td className="px-2 py-1">{p.modalite ?? '-'}</td>
                        </tr>
                      ))) }
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-gray-500 mt-2">Les paiements seront créés uniquement si vous cochez « Créer les paiements détectés » et validez.</div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-4 w-full">
            <button className="px-4 py-2 bg-gray-400 text-white rounded" onClick={() => setShowImportModal(false)}>Annuler</button>
            <button className="px-4 py-2 bg-teal-600 text-white rounded font-bold" onClick={handleValidateImport}>Valider l'importation</button>
          </div>
        </div>
      </div>
    )}
          </label>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            <span>Exporter</span>
          </button>
          <button 
            onClick={onNewEleve}
            className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            <span>Nouvel Élève</span>
          </button>
          <button onClick={() => window.print()} className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Printer className="h-4 w-4" />
            <span>Imprimer / PDF</span>
          </button>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Toutes les classes</option>
            {classes.map(classe => (
              <option key={classe.id} value={classe.id}>
                {classe.niveau} {classe.section}
              </option>
            ))}
          </select>

          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Tous les statuts financiers</option>
            <option value="Payé">Payé</option>
            <option value="Partiel">Partiel</option>
            <option value="Impayé">Impayé</option>
          </select>

          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            <span>Plus de filtres</span>
          </button>
        </div>
      </div>

      {/* Table des élèves + actions groupées */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
  {/* SECTION D'IMPRESSION (visible seulement lors du print) */}
  <div id="print-area" className="hidden print:block bg-white p-4 mb-4">
          <EnteteFiche type="eleves" libelle={printLibelle} />
          {/* Header hors-table pour impression : table avec colgroup pour aligner les colonnes */}
          <div className="mb-2 overflow-x-auto">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '8%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: includeClasseColumnInPrint ? '60%' : '72%' }} />
                {includeClasseColumnInPrint && <col style={{ width: '12%' }} />}
              </colgroup>
              <thead>
                <tr>
                  <th className="border px-2 py-1 text-left text-sm font-medium">N°</th>
                  <th className="border px-2 py-1 text-left text-sm font-medium">Matricule</th>
                  <th className="border px-2 py-1 text-left text-sm font-medium">Noms et Prénoms</th>
                  {includeClasseColumnInPrint && <th className="border px-2 py-1 text-left text-sm font-medium">Classe</th>}
                </tr>
              </thead>
            </table>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '8%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: includeClasseColumnInPrint ? '60%' : '72%' }} />
                {includeClasseColumnInPrint && <col style={{ width: '12%' }} />}
              </colgroup>
              <tbody>
                {filteredEleves.map((el, i) => (
                  <tr key={el.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border px-2 py-1 text-sm">{i + 1}</td>
                    <td className="border px-2 py-1 text-sm">{el.matricule}</td>
                    <td className="border px-2 py-1 text-sm">{`${el.prenoms} ${el.nom}`.trim()}</td>
                    {includeClasseColumnInPrint && <td className="border px-2 py-1 text-sm">{getClasseNom(el.classeId)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-xs text-right text-gray-500 mt-2">{enteteConfig.footer}</div>
          </div>
        </div>
  {/* Barre d'actions groupées */}
        {selectedEleves.length > 0 && (
          <div className="flex items-center gap-4 px-4 py-2 bg-teal-50 border-b border-teal-200">
            <span className="font-semibold text-teal-700">{selectedEleves.length} sélectionné(s)</span>
            <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={handleDeleteSelected}>Supprimer</button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={()=>setShowChangeClasse(true)}>Changer de classe</button>
            <button className="px-3 py-1" onClick={()=>setSelectedEleves([])}>Tout désélectionner</button>
          </div>
        )}
        {/* Modal changement de classe */}
        {showChangeClasse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center">
              <h2 className="text-xl font-bold mb-4">Changer la classe de {selectedEleves.length} élève(s)</h2>
              <select value={newClasseId} onChange={e=>setNewClasseId(e.target.value)} className="w-full mb-4 border rounded px-3 py-2">
                <option value="">Sélectionner une classe</option>
                {classes.map(classe => (
                  <option key={classe.id} value={classe.id}>{classe.niveau} {classe.section}</option>
                ))}
              </select>
              <div className="flex gap-4 w-full justify-end">
                <button className="px-4 py-2 bg-gray-400 text-white rounded" onClick={()=>setShowChangeClasse(false)}>Annuler</button>
                <button className="px-4 py-2 bg-teal-600 text-white rounded font-bold" onClick={handleChangeClasse} disabled={!newClasseId}>Valider</button>
              </div>
            </div>
          </div>
        )}
        {/* Import summary modal */}
        {showImportSummaryModal && importSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Récapitulatif de l'import</h2>
              <div className="space-y-2 mb-4">
                <div>élèves créés : <strong>{importSummary.created}</strong></div>
                <div>élèves mis à jour : <strong>{importSummary.updated}</strong></div>
                <div>paiements créés : <strong>{importSummary.paymentsCreated}</strong></div>
                <div>erreurs : <strong>{importSummary.errors.length}</strong></div>
              </div>
              {importSummary.errors.length > 0 && (
                <div className="mb-4 max-h-40 overflow-auto border rounded p-2 bg-gray-50 text-sm text-red-700">
                  {importSummary.errors.map((err, i) => <div key={i}>• {err}</div>)}
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => { setShowImportSummaryModal(false); setImportSummary(null); }}>Fermer</button>
                <button className="px-4 py-2 bg-teal-600 text-white rounded" onClick={() => window.location.reload()}>Fermer et recharger</button>
              </div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 py-3 text-center">
                  <input type="checkbox" checked={selectedEleves.length === filteredEleves.length && filteredEleves.length > 0} onChange={e=>handleSelectAll(e.target.checked)} />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">N°</th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('matricule')}
                >
                  Matricule {sortField === 'matricule' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('nom')}
                >
                  Nom et Prénoms {sortField === 'nom' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Sexe</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Date Naissance</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Classe</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Parents</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Statut Financier</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEleves.map((eleve, idx) => (
                <tr key={eleve.id} className={`hover:bg-gray-50 ${selectedEleves.includes(eleve.id) ? 'bg-teal-50' : ''}`}>
                  <td className="px-2 py-3 text-center">
                    <input type="checkbox" checked={selectedEleves.includes(eleve.id)} onChange={e=>handleSelectOne(eleve.id, e.target.checked)} />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {eleve.matricule}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      {eleve.photo && (
                        <img 
                          src={eleve.photo} 
                          alt={`${eleve.prenoms} ${eleve.nom}`}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {eleve.prenoms} {eleve.nom}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      eleve.sexe === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                    }`}>
                      {eleve.sexe === 'M' ? 'Masculin' : 'Féminin'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(eleve.dateNaissance).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {getClasseNom(eleve.classeId)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>
                      <div className="font-medium">P: {eleve.pereTuteur}</div>
                      <div>M: {eleve.mereTutrice}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatutColor(eleve.statut)}`}>
                      {eleve.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatutFinancierColor(getStatutFinancier(eleve))}`}>
                      {getStatutFinancier(eleve)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEleveSelect(eleve)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Voir détails"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onEleveSelect(eleve)}
                        className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                        title="Modifier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(eleve)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEleves.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun élève trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}