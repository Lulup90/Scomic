import { memo, useMemo, useRef, useState } from 'react';
import { PRESETS } from '../model/factory';
import { fmtNum } from '../model/formats';
import { usedValues, type ResolvedPanel } from '../model/resolve';
import { FIELD_KEYS, FIELD_LABELS, INHERITABLE, type FieldKey } from '../model/types';
import { addElement, addPanel, deletePanel, ensurePlace, movePanel, setDescription, setField } from '../store/actions';
import { useStore } from '../store/store';
import { askConfirm } from '../store/ui';
import { AutoInput } from './AutoInput';
import { AutoTextarea } from './AutoTextarea';
import { ElementRow } from './ElementRow';
import { IconDown, IconInherit, IconPlus, IconTrash, IconUp, IconWarn } from './icons';
import { useFocusRequest } from './useFocusRequest';

interface Props {
  rp: ResolvedPanel;
  selected: boolean;
  isFirst: boolean;
  isLast: boolean;
  canDelete: boolean;
}

export const PanelCard = memo(function PanelCard({ rp, selected, isFirst, isLast, canDelete }: Props) {
  const { panel, pageId } = rp;
  const descRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  useFocusRequest(`desc:${panel.id}`, descRef);
  useFocusRequest(`card:${panel.id}`, cardRef);
  const select = () => {
    if (!selected) useStore.getState().selectPanel(panel.id);
  };

  return (
    <article
      ref={cardRef}
      tabIndex={-1}
      className={`panel-card${selected ? ' selected' : ''}`}
      onFocusCapture={select}
      onMouseDown={select}
      aria-label={`Vignetta ${rp.number}`}
    >
      <header className="panel-head">
        <h3 className="panel-title">Vignetta {rp.number}</h3>
        <span className="tag">Striscia {rp.stripIndex + 1}</span>
        <span className="panel-meta">
          {rp.words} {rp.words === 1 ? 'parola' : 'parole'} · {fmtNum(rp.area)}% della tavola
        </span>
        {rp.dense && (
          <span className="warn-tag" title={`${fmtNum(rp.density)} parole per ogni 1% di tavola`}>
            <IconWarn size={12} /> Troppo testo
          </span>
        )}
        <span className="panel-tools">
          <button type="button" className="icon-btn" aria-label="Sposta prima" title="Scambia con la vignetta precedente" disabled={isFirst} onClick={() => movePanel(pageId, panel.id, -1)}>
            <IconUp size={14} />
          </button>
          <button type="button" className="icon-btn" aria-label="Sposta dopo" title="Scambia con la vignetta successiva" disabled={isLast} onClick={() => movePanel(pageId, panel.id, 1)}>
            <IconDown size={14} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Elimina vignetta"
            disabled={!canDelete}
            onClick={async () => {
              const hasContent = panel.description.trim() || panel.elements.length;
              if (!hasContent || (await askConfirm(`Eliminare la vignetta ${rp.number} e il suo testo?`, 'Elimina', true)))
                deletePanel(pageId, panel.id);
            }}
          >
            <IconTrash size={14} />
          </button>
        </span>
      </header>

      <div className="fields">
        {FIELD_KEYS.map((k) => (
          <FieldChip key={k} rp={rp} fieldKey={k} />
        ))}
      </div>

      <AutoTextarea
        ref={descRef}
        className="desc"
        aria-label={`Descrizione della vignetta ${rp.number}`}
        placeholder="Descrivi cosa si vede nella vignetta…"
        value={panel.description}
        onChange={(e) => setDescription(panel.id, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            addPanel(pageId, panel.id);
          }
        }}
      />

      {panel.elements.length > 0 && (
        <div className="elements">
          {panel.elements.map((el, i) => (
            <ElementRow
              key={el.id}
              el={el}
              panelId={panel.id}
              pageId={pageId}
              prevId={panel.elements[i - 1]?.id}
              isFirst={i === 0}
              isLast={i === panel.elements.length - 1}
            />
          ))}
        </div>
      )}

      <div className="add-row">
        <button type="button" className="chip-btn" onClick={() => addElement(panel.id, 'balloon')}>
          <IconPlus size={12} /> Balloon
        </button>
        <button type="button" className="chip-btn" onClick={() => addElement(panel.id, 'pensiero')}>
          <IconPlus size={12} /> Pensiero
        </button>
        <button type="button" className="chip-btn" onClick={() => addElement(panel.id, 'didascalia')}>
          <IconPlus size={12} /> Didascalia
        </button>
        <button type="button" className="chip-btn" onClick={() => addElement(panel.id, 'sfx')}>
          <IconPlus size={12} /> SFX
        </button>
        <button type="button" className="chip-btn" onClick={() => addElement(panel.id, 'nota')}>
          <IconPlus size={12} /> Nota
        </button>
      </div>
    </article>
  );
});

function FieldChip({ rp, fieldKey }: { rp: ResolvedPanel; fieldKey: FieldKey }) {
  const [editing, setEditing] = useState(false);
  const project = useStore((s) => s.project);
  const resolved = rp.fields[fieldKey];
  const own = rp.panel.fields[fieldKey] ?? '';
  const label = FIELD_LABELS[fieldKey];
  const inheritable = INHERITABLE.includes(fieldKey);

  const suggestions = useMemo(() => {
    if (!editing) return [];
    const used = usedValues(project, fieldKey);
    const archive = fieldKey === 'luogo' ? project.places.map((p) => p.name) : [];
    return [...archive, ...used, ...PRESETS[fieldKey]];
  }, [editing, project, fieldKey]);

  if (editing) {
    return (
      <span className="field-edit">
        <span className="field-label">{label}</span>
        <AutoInput
          autoFocus
          className="field-input"
          ariaLabel={label}
          value={own}
          placeholder={resolved.inherited ? resolved.value : ''}
          suggestions={suggestions}
          onChange={(v) => setField(rp.panel.id, fieldKey, v)}
          onCommit={(v) => {
            if (fieldKey === 'luogo') ensurePlace(v);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
            }
          }}
        />
      </span>
    );
  }

  if (resolved.inherited) {
    return (
      <button
        type="button"
        className="field inherited"
        title={`Ripreso dalla vignetta ${resolved.from}. Clicca per cambiarlo solo da qui in avanti.`}
        onClick={() => setEditing(true)}
      >
        <IconInherit />
        <span className="field-label">{label}</span>
        {resolved.value}
      </button>
    );
  }

  if (!resolved.value) {
    return (
      <button type="button" className="field empty" onClick={() => setEditing(true)}>
        <IconPlus size={11} />
        <span className="field-label">{label}</span>
      </button>
    );
  }

  return (
    <span className="field own">
      <button type="button" className="field-main" onClick={() => setEditing(true)} title="Clicca per modificare">
        <span className="field-label">{label}</span>
        {resolved.value}
      </button>
      {inheritable && (
        <button
          type="button"
          className="field-reset"
          aria-label={`Riprendi ${label.toLowerCase()} dalla vignetta precedente`}
          title="Torna a riprendere il valore dalla vignetta precedente"
          onClick={() => setField(rp.panel.id, fieldKey, '')}
        >
          <IconInherit size={11} />
        </button>
      )}
    </span>
  );
}
