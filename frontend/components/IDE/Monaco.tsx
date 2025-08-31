"use client";

import { Editor } from "@monaco-editor/react";
import { useRef, useEffect } from "react";
import type { editor } from "monaco-editor";

interface MonacoProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language: string;
  path: string;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  readOnly?: boolean;
}

export default function Monaco({
  value,
  onChange,
  language,
  path,
  onMount,
  readOnly = false,
}: MonacoProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Force theme to dark
  useEffect(() => {
    if (editorRef.current) {
      const monaco = (
        window as typeof window & { monaco?: typeof import("monaco-editor") }
      ).monaco;
      if (monaco) {
        monaco.editor.setTheme("vs-dark-custom");
      }
    }
  }, []);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Set dark theme immediately after mount
    const monaco = (
      window as typeof window & { monaco?: typeof import("monaco-editor") }
    ).monaco;
    if (monaco) {
      monaco.editor.setTheme("vs-dark-custom");
    }

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: true },
      wordWrap: "on",
      automaticLayout: true,
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 20,
      tabSize: 2,
      insertSpaces: true,
      detectIndentation: true,
      renderWhitespace: "boundary",
      renderControlCharacters: true,
      smoothScrolling: true,
      cursorSmoothCaretAnimation: "on",
      contextmenu: true,
      multiCursorModifier: "ctrlCmd",
      formatOnPaste: true,
      formatOnType: true,
      readOnly,
    });

    // Set up keyboard shortcuts
    editor.addAction({
      id: "save-file-monaco",
      label: "Save File",
      keybindings: [2048 | 49], // Ctrl+S
      run: () => {
        // Ctrl+S or Cmd+S will be handled by parent component
        const event = new CustomEvent("monaco-save", { detail: { path } });
        window.dispatchEvent(event);
      },
    });

    onMount?.(editor);
  };

  const beforeMount = (monaco: typeof import("monaco-editor")) => {
    // Configure Monaco themes
    monaco.editor.defineTheme("vs-dark-custom", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.foreground": "#d4d4d4",
        "editorLineNumber.foreground": "#858585",
        "editorLineNumber.activeForeground": "#c6c6c6",
        "editor.selectionBackground": "#264f78",
        "editor.inactiveSelectionBackground": "#3a3d41",
        "editorCursor.foreground": "#aeafad",
        "editor.selectionHighlightBackground": "#add6ff26",
        "editor.wordHighlightBackground": "#575757b8",
        "editor.wordHighlightStrongBackground": "#004972b8",
        "editorBracketMatch.background": "#0064001a",
        "editorBracketMatch.border": "#888888",
      },
    });

    monaco.editor.defineTheme("vs-light-custom", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#000000",
        "editorLineNumber.foreground": "#237893",
        "editorLineNumber.activeForeground": "#0b216f",
        "editor.selectionBackground": "#add6ff",
        "editor.inactiveSelectionBackground": "#e5ebf1",
        "editorCursor.foreground": "#000000",
        "editor.selectionHighlightBackground": "#add6ff80",
        "editor.wordHighlightBackground": "#57575740",
        "editor.wordHighlightStrongBackground": "#0064004d",
        "editorBracketMatch.background": "#0064001a",
        "editorBracketMatch.border": "#b9b9b9",
      },
    });

    // Set default options
    monaco.editor.getModels().forEach((model) => {
      model.updateOptions({
        tabSize: 2,
        insertSpaces: true,
      });
    });
  };

  return (
    <Editor
      height="100%"
      language={language}
      path={path}
      value={value}
      onChange={onChange}
      theme="vs-dark-custom"
      onMount={handleEditorDidMount}
      beforeMount={beforeMount}
      options={{
        selectOnLineNumbers: true,
        mouseWheelZoom: true,
        automaticLayout: true,
      }}
    />
  );
}
