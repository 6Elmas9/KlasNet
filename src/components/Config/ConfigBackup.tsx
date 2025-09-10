import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useToast } from '../Layout/ToastProvider';
import { db } from '../../utils/database';
import { ensureDefaultFrais } from '../../utils/defaultFraisScolaires';

const NIVEAUX = [
  'Petite Section','Moyenne Section','Grande Section',
  'CP1','CP2','CE1','CE2','CM1','CM2'
];

export default function ConfigBackup() {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick search
  const [searchTerm, setSearchTerm] = useState('');

  // Active school year
  const defaultAnnee = new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
  const [anneeActive, setAnneeActive] = useState(() => {
    const v = localStorage.getItem('anneeActive');
    return v || defaultAnnee;
  });

  useEffect(() => { localStorage.setItem('anneeActive', anneeActive); }, [anneeActive]);

  // Frais scolaires (simple model: per niveau -> { annee, montant, echeances[] })
  const [frais, setFrais] = useState(() => db.getAll<any>('fraisScolaires') || []);

  // Compositions
  const [compositions, setCompositions] = useState(() => db.getAll<any>('compositions') || []);
  const [newCompositionName, setNewCompositionName] = useState('');
  const [newCompositionCoef, setNewCompositionCoef] = useState<number>(1);

  // Form pour ajouter/éditer frais
  const [selectedNiveau, setSelectedNiveau] = useState<string>(NIVEAUX[3]); // CP1 par défaut
  const [selectedAnneeFrais, setSelectedAnneeFrais] = useState<string>(anneeActive);
  const [montantFrais, setMontantFrais] = useState<number>(0);
  const [echeances, setEcheances] = useState<{date: string; montant: number}[]>([]);

  useEffect(() => {
    // charger les frais si existants pour niveau+anneeScolaire
    const found = frais.find((f: any) => f.niveau === selectedNiveau && (f.anneeScolaire === selectedAnneeFrais || f.annee === selectedAnneeFrais));
    if (found) {
  const e = found.echeances || [];
  setEcheances(e.map((x: any) => ({ date: x.date || '', montant: Number(x.montant || 0) })));
  const totalFromEcheances = e.reduce((s: number, it: any) => s + Number(it.montant || 0), 0);
  const total = Number(found.montant || totalFromEcheances || 0);
  setMontantFrais(total);
    } else {
      setMontantFrais(0);
      setEcheances([]);
    }
  }, [selectedNiveau, selectedAnneeFrais]);

  const filteredFrais = useMemo(() => {
    if (!searchTerm) return frais;
    return frais.filter((f: any) => f.niveau.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [frais, searchTerm]);

  function saveFrais() {
  // recalculer le montant à partir des échéances pour éviter discordance
  const totalFromEcheances = (echeances || []).reduce((s, it) => s + Number(it.montant || 0), 0);
  const payload = { niveau: selectedNiveau, anneeScolaire: selectedAnneeFrais, montant: Number(totalFromEcheances || montantFrais || 0), echeances };
  const existing = frais.find((x: any) => x.niveau === selectedNiveau && (x.anneeScolaire === selectedAnneeFrais || x.annee === selectedAnneeFrais));
    if (existing) {
  db.update('fraisScolaires', existing.id, payload as any);
      setFrais(db.getAll('fraisScolaires'));
      showToast('Frais mis à jour', 'success');
    } else {
  db.create('fraisScolaires', payload as any);
      setFrais(db.getAll('fraisScolaires'));
      showToast('Frais ajoutés', 'success');
    }
  }

  function addEcheance() {
    setEcheances(prev => [...prev, { date: '', montant: 0 }]);
  }

  function updateEcheance(idx: number, field: 'date'|'montant', value: any) {
    setEcheances(prev => prev.map((e,i) => i===idx ? { ...e, [field]: field === 'montant' ? Number(value) : value } : e));
  }

  function removeEcheance(idx: number) {
    setEcheances(prev => prev.filter((_,i) => i!==idx));
  }

  // Compositions management
  function addComposition() {
    if (!newCompositionName.trim()) return showToast('Nom requis', 'error');
    const item = { nom: newCompositionName.trim(), coefficient: Number(newCompositionCoef) };
    db.create('compositions', item);
    setCompositions(db.getAll('compositions'));
    setNewCompositionName(''); setNewCompositionCoef(1);
    showToast('Composition ajoutée', 'success');
  }

  function removeComposition(id: string) {
    if (!window.confirm('Supprimer cette composition ?')) return;
    db.delete('compositions', id);
    setCompositions(db.getAll('compositions'));
    showToast('Composition supprimée', 'success');
  }

  function handleEditFrais(f: any) {
    setSelectedNiveau(f.niveau);
    setSelectedAnneeFrais(f.anneeScolaire || f.annee);
    const totalFromEcheances = (f.echeances || []).reduce((s: number, it: any) => s + Number(it.montant || 0), 0);
    setMontantFrais(Number(f.montant || totalFromEcheances || 0));
    setEcheances((f.echeances || []).map((e: any) => ({ date: e.date || '', montant: Number(e.montant || 0) })));
    // scroll to form (top of page)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDeleteFrais(f: any) {
    if (!window.confirm(`Supprimer les frais pour ${f.niveau} (${f.anneeScolaire || f.annee}) ?`)) return;
    db.delete('fraisScolaires', f.id);
    const updated = db.getAll('fraisScolaires') || [];
    setFrais(updated);
    showToast('Frais supprimés', 'success');
    // reset form si en train d'éditer
  if (selectedNiveau === f.niveau && selectedAnneeFrais === (f.anneeScolaire || f.annee)) {
      setMontantFrais(0); setEcheances([]);
    }
  }

  // Export/Import/Reset (réutilise les handlers existants)
  const handleExport = () => {
    // Try to create a structured ZIP with folders/subfolders. If JSZip is not available, fall back to single JSON file.
    (async () => {
      try {
        const JSZipModule = await import('jszip');
        const JSZip: any = JSZipModule && (JSZipModule.default || JSZipModule);
        const zip = new JSZip();

        // Build structured folders: /data/<collection>.json and /meta/info.json
        const data = JSON.parse(db.exportData());
        const date = new Date().toISOString().split('T')[0];

        // data files
        const dataFolder = zip.folder(`backup_${date}/data`);
        Object.entries(data).forEach(([collection, items]) => {
          dataFolder.file(`${collection}.json`, JSON.stringify(items, null, 2));
        });

        // meta
        const metaFolder = zip.folder(`backup_${date}/meta`);
        metaFolder.file('info.json', JSON.stringify({ generatedAt: new Date().toISOString(), app: 'KlasNet' }, null, 2));

        const content = await zip.generateAsync({ type: 'blob' });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url; a.download = `klasnet_backup_${date}.zip`; a.click(); window.URL.revokeObjectURL(url);
        showToast('Sauvegarde ZIP exportée avec succès', 'success');
      } catch (err) {
        // fallback: single JSON file
        const data = db.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url; a.download = `klasnet_backup_${date}.json`; a.click(); window.URL.revokeObjectURL(url);
        showToast('Sauvegarde exportée (fallback JSON)', 'success');
      }
    })();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const success = db.importData(content);
        if (success) { showToast('Données importées avec succès', 'success'); window.location.reload(); }
        else showToast('Erreur lors de l’importation des données', 'error');
      } catch (error) { showToast('Erreur lors de la lecture du fichier', 'error'); }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.')) {
      db.resetData(); showToast('Données réinitialisées avec succès', 'success'); window.location.reload();
    }
  };

  // initial load
  useEffect(() => { setFrais(db.getAll('fraisScolaires') || []); setCompositions(db.getAll('compositions') || []); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Configuration</h2>
        <div className="flex items-center gap-3">
          <input placeholder="Recherche rapide..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border rounded px-3 py-1" />
          <div className="text-sm text-gray-600">Année active :</div>
          <input value={anneeActive} onChange={e => setAnneeActive(e.target.value)} className="border rounded px-3 py-1" />
          <button onClick={() => {
            const created = ensureDefaultFrais(anneeActive);
            setFrais(db.getAll('fraisScolaires'));
            showToast(`${created} frais par défaut ajoutés pour ${anneeActive}`, 'success');
          }} className="px-3 py-1 bg-green-600 text-white rounded">Peupler frais par défaut</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="col-span-2 space-y-4">
          {/* Frais scolaires */}
          <div className="bg-white p-4 rounded shadow-sm border">
            <h3 className="font-semibold mb-3">Frais scolaires par niveau</h3>

            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="text-sm text-gray-600">Niveau</label>
                <select value={selectedNiveau} onChange={e => setSelectedNiveau(e.target.value)} className="w-full border rounded px-2 py-1">
                  {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Année</label>
                <input value={selectedAnneeFrais} onChange={e => setSelectedAnneeFrais(e.target.value)} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Montant total (FCFA)</label>
                <input type="number" value={montantFrais} onChange={e => setMontantFrais(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium">Échéances</h4>
              <div className="space-y-2 mt-2">
                {echeances.map((ech, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="date" value={ech.date} onChange={e => updateEcheance(idx, 'date', e.target.value)} className="border rounded px-2 py-1" />
                    <input type="number" value={ech.montant} onChange={e => updateEcheance(idx, 'montant', Number(e.target.value))} className="border rounded px-2 py-1" />
                    <button className="px-2 py-1 border rounded" onClick={() => removeEcheance(idx)}>Suppr</button>
                  </div>
                ))}
                <div className="mt-2">
                  <button className="px-3 py-1 border rounded" onClick={addEcheance}>Ajouter échéance</button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-3 py-1 border rounded" onClick={() => { setMontantFrais(0); setEcheances([]); }}>Réinitialiser</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={saveFrais}>Ajouter / Mettre à jour</button>
            </div>
          </div>

          {/* Compositions */}
          <div className="bg-white p-4 rounded shadow-sm border">
            <h3 className="font-semibold mb-3">Configuration des compositions</h3>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm text-gray-600">Nom de la composition</label>
                <input value={newCompositionName} onChange={e => setNewCompositionName(e.target.value)} className="w-full border rounded px-2 py-1" />
              </div>
              <div style={{width:100}}>
                <label className="text-sm text-gray-600">Coefficient</label>
                <input type="number" value={newCompositionCoef} onChange={e => setNewCompositionCoef(Number(e.target.value))} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={addComposition}>Ajouter</button>
              </div>
            </div>

            <div className="mt-4">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-2 py-1">Nom</th>
                    <th className="border px-2 py-1">Coefficient</th>
                    <th className="border px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {compositions.length === 0 ? (
                    <tr><td colSpan={3} className="text-center text-gray-500 py-4">Aucune composition configurée</td></tr>
                  ) : (
                    compositions.map((c: any) => (
                      <tr key={c.id}>
                        <td className="border px-2 py-1">{c.nom}</td>
                        <td className="border px-2 py-1">{c.coefficient}</td>
                        <td className="border px-2 py-1"><button className="px-2 py-1 border rounded" onClick={() => removeComposition(c.id)}>Suppr</button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-white p-4 rounded shadow-sm border">
            <h4 className="font-semibold">Aperçu Frais</h4>
            <div className="mt-2 text-sm text-gray-600">Filtre: {searchTerm || 'tous'}</div>
            <div className="mt-3">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border px-2 py-1">Niveau</th>
                    <th className="border px-2 py-1">Année scolaire</th>
                    <th className="border px-2 py-1 w-32 text-right">Montant (FCFA)</th>
                    <th className="border px-2 py-1 w-64">Échéances</th>
                    <th className="border px-2 py-1 w-36">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFrais.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-gray-500 py-2">Aucun frais configuré</td></tr>
                  ) : (
                    filteredFrais.map((f:any) => (
                      <tr key={f.id}>
                        <td className="border px-2 py-1 align-top">{f.niveau}</td>
                        <td className="border px-2 py-1 align-top">{f.anneeScolaire || f.annee || ''}</td>
                        <td className="border px-2 py-1 align-top text-right">{Number(f.montant || 0).toLocaleString('fr-FR')} FCFA</td>
                        <td className="border px-2 py-1 align-top">
                          <div className="max-h-36 overflow-auto text-xs space-y-1">
                            {(f.echeances || []).map((e: any, idx: number) => (
                              <div key={idx} className="truncate">{`${e.date} : ${Number(e.montant || 0).toLocaleString('fr-FR')} FCFA`}</div>
                            ))}
                          </div>
                        </td>
                        <td className="border px-2 py-1 align-top">
                          <div className="flex gap-2">
                            <button className="px-2 py-1 bg-yellow-500 text-white rounded" onClick={() => handleEditFrais(f)}>Éditer</button>
                            <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => handleDeleteFrais(f)}>Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow-sm border">
            <h4 className="font-semibold">Sauvegarde</h4>
            <div className="flex flex-col gap-2 mt-2">
              <button onClick={handleExport} className="w-full px-3 py-2 bg-blue-600 text-white rounded">Exporter les données</button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full px-3 py-2 border rounded">Importer des données</button>
              <button onClick={handleReset} className="w-full px-3 py-2 bg-red-600 text-white rounded">Réinitialiser</button>
            </div>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>
        </aside>
      </div>
    </div>
  );
}
