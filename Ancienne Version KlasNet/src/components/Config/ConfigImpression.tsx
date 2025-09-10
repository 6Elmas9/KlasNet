import { useState } from 'react';
import { getAllEnteteConfig, saveEnteteConfig } from '../../utils/entetesConfig';
import type { AllConfigs } from '../../types/enteteConfig';

const readFileAsDataURL = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function ConfigImpression() {
  const [configs, setConfigs] = useState<AllConfigs>(() => getAllEnteteConfig());
  const [selected, setSelected] = useState<keyof AllConfigs>('eleves');

  function handleChange(section: keyof AllConfigs, field: keyof AllConfigs['eleves'], value: any) {
      setConfigs((prev: AllConfigs) => ({
        ...prev,
        [section]: { ...(prev as any)[section], [field]: value } as any
      }));
    }

  const handleSave = () => {
    saveEnteteConfig(configs);
    alert('Configurations d\'impression sauvegardées');
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Configuration des impressions</h2>
      <p className="mb-6 text-sm text-gray-600 max-w-2xl">Editez l'entête, le pied de page et les logos pour chaque type de document imprimé. Utilisez la colonne de gauche pour modifier les paramètres et la prévisualisation à droite pour voir le rendu.</p>

      <div className="space-y-4">
        {/* Form: selector + form */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {(['eleves','recu','transport'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSelected(t)}
                className={`px-4 py-2 rounded-md ${selected === t ? 'bg-teal-600 text-white' : 'bg-white border'}`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3">Paramètres pour {selected.toUpperCase()}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700">En-tête</label>
                <input value={configs[selected].header} onChange={e => handleChange(selected, 'header', e.target.value)} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Pied de page</label>
                <input value={configs[selected].footer || ''} onChange={e => handleChange(selected, 'footer', e.target.value)} className="w-full border rounded px-2 py-1" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700">Colonnes (séparées par des virgules)</label>
                <input value={configs[selected].columns.join(', ')} onChange={e => handleChange(selected, 'columns', e.target.value.split(',').map(s => s.trim()))} className="w-full border rounded px-2 py-1" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700">Logo principal</label>
                <input type="file" accept="image/*" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return; const data = await readFileAsDataURL(f); handleChange(selected, 'logo', data);
                }} />
                <div className="mt-2">
                  {configs[selected].logo ? (
                    <div className="flex items-center gap-2">
                      <img src={configs[selected].logo} alt="logo" className="h-12" />
                      <button className="px-2 py-1 border rounded" onClick={() => handleChange(selected, 'logo', '')}>Supprimer</button>
                    </div>
                  ) : <div className="text-xs text-gray-500">Aucun logo</div>}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700">Logo Ministère</label>
                <input type="file" accept="image/*" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return; const data = await readFileAsDataURL(f); handleChange(selected, 'logoMinistere', data);
                }} />
                <div className="mt-2">
                  {configs[selected].logoMinistere ? (
                    <div className="flex items-center gap-2">
                      <img src={configs[selected].logoMinistere} alt="logo-min" className="h-12" />
                      <button className="px-2 py-1 border rounded" onClick={() => handleChange(selected, 'logoMinistere', '')}>Supprimer</button>
                    </div>
                  ) : <div className="text-xs text-gray-500">Aucun logo ministre</div>}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">Options</div>
              <div className="space-x-2">
                <button onClick={() => setConfigs(getAllEnteteConfig())} className="px-3 py-1 border rounded">Restaurer</button>
                <button onClick={handleSave} className="px-3 py-1 bg-teal-600 text-white rounded">Sauvegarder</button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h4 className="font-semibold mb-2">Conseils</h4>
          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>Utilise des images PNG pour meilleurs résultats à l'impression.</li>
            <li>La police et l'interligne sont appliqués via le style d'impression global.</li>
            <li>Les colonnes déterminent quelles colonnes apparaîtront sur les fiches.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
