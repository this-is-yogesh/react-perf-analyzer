import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import styles from './CodeEditor.module.css';

export function CodeEditor({ value, onChange, errorMarker }) {
  const monacoRef = useRef(null);
  const editorRef = useRef(null);

  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyMarker(errorMarker);
  }

  function applyMarker(marker) {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (!model) return;
    if (!marker) {
      monaco.editor.setModelMarkers(model, 'rpa', []);
      return;
    }
    const line = marker.line || 1;
    const column = (marker.column || 0) + 1;
    monaco.editor.setModelMarkers(model, 'rpa', [
      {
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: column + 1,
        message: marker.message,
        severity: monaco.MarkerSeverity.Error,
      },
    ]);
  }

  useEffect(() => {
    applyMarker(errorMarker);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorMarker]);

  return (
    <div className={styles.editorWrap}>
      <Editor
        defaultLanguage="javascript"
        language="javascript"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        options={{
          fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
          fontSize: 13.5,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          tabSize: 2,
          renderLineHighlight: 'gutter',
          fixedOverflowWidgets: true,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
