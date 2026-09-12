import Editor from '@monaco-editor/react';
import styles from './CodeEditor.module.css';

export function CodeEditor({ value, setCode }) {
  return (
    <div className={styles.editorWrap}>
      <Editor
        defaultLanguage="javascript"
        language="javascript"
        theme="vs-dark"
        value={value}
        onChange={(v) => setCode(v ?? '')}
      />
    </div>
  );
}
