import React, { useState } from 'react';
import FormLayout from '../FormLayout';
import ConfigFrais from './ConfigFrais';
import ConfigCompositions from './ConfigCompositions';
import ConfigImpression from './ConfigImpression';
import ConfigEcole from './ConfigEcole';

export default function ConfigIndex({ initialTab }: { initialTab?: string }) {
  const tabs: { key: string; label: string; comp: React.ReactNode }[] = [
    { key: 'frais', label: 'Configuration Frais', comp: <ConfigFrais /> },
    { key: 'compositions', label: 'Configuration compositions', comp: <ConfigCompositions /> },
    { key: 'ecole', label: 'Configuration École', comp: <ConfigEcole /> },
    { key: 'impression', label: 'Configuration Impression', comp: <ConfigImpression /> },
  ];

  const [active, setActive] = useState(initialTab || tabs[0].key);

  return (
    <FormLayout title="Paramètres" subtitle="Configuration de l'application">
      <div className="mb-4">
        <div className="flex gap-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActive(t.key)} className={`px-3 py-2 rounded ${active === t.key ? 'bg-teal-600 text-white' : 'bg-gray-100'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        {tabs.find(t => t.key === active)?.comp}
      </div>
    </FormLayout>
  );
}
