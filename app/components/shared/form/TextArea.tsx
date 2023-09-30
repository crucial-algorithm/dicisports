import clsx from 'clsx';
import React, { useContext, useState } from 'react';
import type { EditorTextChangeEvent } from 'primereact/editor';
import { Editor } from 'primereact/editor';
import { useTranslation } from 'react-i18next';

import { FormContext } from '~/components/shared/form/UploadForm';

type TextAreaProps = {
  defaultValue?: string | number | readonly string[] | undefined | null;
  name: string;
  placeholder?: string;
  className?: string;
};

function clearReactWarning() {}

export default function TextArea({
  name,
  defaultValue,
  placeholder,
  className
}: TextAreaProps) {
  const { t } = useTranslation('common');
  const [text, setText] = useState<string | undefined>(defaultValue ? String(defaultValue) : '');
  const formProps = useContext(FormContext);

  function renderHeader() {
    return (
      <span className="ql-formats">
        <select className="ql-header" defaultValue="3">
          <option value="1">{t('Heading')}</option>
          <option value="2">{t('Subheading')}</option>
          <option value="3">{t('Normal')}</option>
        </select>
        <button className="ql-bold" aria-label="Bold"></button>
        <button className="ql-italic" aria-label="Italic"></button>
        <button className="ql-underline" aria-label="Underline"></button>
      </span>
    );
  }

  const header = renderHeader();

  function handleTextChange(e: EditorTextChangeEvent) {
    formProps.setDirty && formProps.setDirty();
    setText(e.htmlValue || undefined);
  }

  return (
    <div
      className={clsx(className, 'p-0')}
      style={{ padding: 0 }}
      data-cy={`editor-${name}`}
    >
      <Editor
        value={String(text)}
        placeholder={placeholder}
        headerTemplate={header}
        onTextChange={handleTextChange}
        formats={['header', 'bold', 'italic', 'underline']}
      />
      <textarea name={name} className="hidden" value={text} onChange={clearReactWarning} />
    </div>
  );
}
