import { useRef, type KeyboardEvent } from 'react';
import { ELEMENT_TYPES, elementHasCharacter, type ElementType, type ScriptElement } from '../model/types';
import { addElement, addPanel, deleteElement, ensureCharacter, moveElement, updateElement } from '../store/actions';
import { useStore } from '../store/store';
import { AutoInput } from './AutoInput';
import { AutoTextarea } from './AutoTextarea';
import { IconDown, IconTrash, IconUp } from './icons';
import { useFocusRequest } from './useFocusRequest';

interface Props {
  el: ScriptElement;
  panelId: string;
  pageId: string;
  prevId?: string;
  isFirst: boolean;
  isLast: boolean;
}

export function ElementRow({ el, panelId, pageId, prevId, isFirst, isLast }: Props) {
  const characters = useStore((s) => s.project.characters);
  const charRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  useFocusRequest(`char:${el.id}`, charRef);
  useFocusRequest(`text:${el.id}`, textRef);
  const hasChar = elementHasCharacter(el.type);

  function onTextKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addPanel(pageId, panelId);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      // Invio: nuovo elemento dello stesso tipo
      e.preventDefault();
      addElement(panelId, el.type, el.id);
      return;
    }
    if (e.key === 'Backspace' && el.text === '' && (!hasChar || el.character === '')) {
      e.preventDefault();
      deleteElement(panelId, el.id);
      if (prevId) useStore.getState().requestFocus(`text:${prevId}`);
      else useStore.getState().requestFocus(`desc:${panelId}`);
    }
  }

  return (
    <div className={`element element-${el.type}`}>
      <div className="element-head">
        <select
          className="element-type"
          aria-label="Tipo di elemento"
          value={el.type}
          onChange={(e) => updateElement(panelId, el.id, { type: e.target.value as ElementType })}
        >
          {ELEMENT_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
        {hasChar && (
          <AutoInput
            ref={charRef}
            className="element-char"
            ariaLabel="Personaggio"
            placeholder="PERSONAGGIO"
            value={el.character}
            suggestions={characters.map((c) => c.name)}
            onChange={(v) => updateElement(panelId, el.id, { character: v })}
            onCommit={(v) => ensureCharacter(v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                textRef.current?.focus();
              }
            }}
          />
        )}
      </div>
      <AutoTextarea
        ref={textRef}
        className="element-text"
        aria-label={hasChar ? `Battuta di ${el.character || 'personaggio'}` : 'Testo'}
        placeholder={placeholderFor(el.type)}
        value={el.text}
        onChange={(e) => updateElement(panelId, el.id, { text: e.target.value })}
        onKeyDown={onTextKey}
      />
      <div className="element-tools">
        <button type="button" className="icon-btn" aria-label="Sposta su" disabled={isFirst} onClick={() => moveElement(panelId, el.id, -1)}>
          <IconUp size={14} />
        </button>
        <button type="button" className="icon-btn" aria-label="Sposta giù" disabled={isLast} onClick={() => moveElement(panelId, el.id, 1)}>
          <IconDown size={14} />
        </button>
        <button type="button" className="icon-btn" aria-label="Elimina elemento" onClick={() => deleteElement(panelId, el.id)}>
          <IconTrash size={14} />
        </button>
      </div>
    </div>
  );
}

function placeholderFor(type: ElementType): string {
  switch (type) {
    case 'didascalia':
      return 'Testo della didascalia…';
    case 'sfx':
      return 'Onomatopea (es. BANG)';
    case 'nota':
      return 'Indicazione per il disegnatore…';
    case 'pensiero':
      return 'Cosa pensa…';
    default:
      return 'Cosa dice…';
  }
}
