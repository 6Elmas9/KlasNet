import { useState, useEffect } from 'react';
import FormLayout from '../FormLayout';
import { db } from '../../utils/database';
import { Ecole } from '../../types';

export default function ConfigEcole() {
  const [ecole, setEcole] = useState<Ecole | null>(null);
  useEffect(() => {
    const e = db.getAll<Ecole>('ecole')[0] || null;
    setEcole(e);
  }, []);

  const handleChange = (field: keyof Ecole, value: any) => {
    setEcole(prev => prev ? ({ ...prev, [field]: value }) : ({ id: Date.now().toString(), nom: '', [field]: value } as Ecole));
  };

  const handleSave = async () => {
    if (!ecole) return;
    if (ecole.id) db.update('ecole', ecole.id, ecole);
    else db.create('ecole', { ...ecole, id: Date.now().toString(), createdAt: new Date().toISOString() });
    alert('Informations école sauvegardées');
  };

  return (
    <FormLayout title="Configuration École" subtitle="Informations générales de l'établissement">
      <div className="bg-white p-6 rounded-lg border space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'établissement</label>
          <input className="w-full border rounded px-2 py-1" value={ecole?.nom || ''} onChange={e => handleChange('nom', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input className="w-full border rounded px-2 py-1" value={ecole?.adresse || ''} onChange={e => handleChange('adresse', e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input className="w-full border rounded px-2 py-1" value={ecole?.telephone || ''} onChange={e => handleChange('telephone', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Année scolaire active</label>
          <input className="w-48 border rounded px-2 py-1" value={ecole?.anneeScolaireActive || ''} onChange={e => handleChange('anneeScolaireActive', e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo (PNG/JPG)</label>
          <input type="file" accept="image/*" onChange={async (e: any) => {
            const f = e.target.files?.[0]; if (!f) return; const reader = new FileReader(); reader.onload = () => { handleChange('logo', String(reader.result)); }; reader.readAsDataURL(f);
          }} />
          {ecole?.logo && <div className="mt-2"><img src={ecole.logo} alt="logo" className="h-16" /></div>}
        </div>

        <div className="flex justify-end space-x-2">
          <button className="px-3 py-1 border rounded" onClick={() => { const e = db.getAll<Ecole>('ecole')[0] || null; setEcole(e); }}>Restaurer</button>
          <button className="px-3 py-1 bg-teal-600 text-white rounded" onClick={handleSave}>Sauvegarder</button>
        </div>
      </div>
    </FormLayout>
  );
}
