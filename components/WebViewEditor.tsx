import React, { useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

/**
 * A WebView-backed text editor that replaces RN TextInput for large content.
 * Solves the Android scrolling performance issue with 8000+ chars.
 *
 * Exposed imperative handle:
 * - injectJavaScript(code): run JS in the WebView
 * - setSelection(start, end): set cursor/selection
 * - focus(): focus the editor
 */
interface Props {
  value: string;
  onChange: (text: string) => void;
  onSelectionChange?: (selection: { start: number; end: number }) => void;
  placeholder?: string;
  style?: any;
}

export interface WebViewEditorHandle {
  injectJavaScript: (js: string) => void;
  setSelection: (start: number, end: number) => void;
  focus: () => void;
}

const WebViewEditor = forwardRef<WebViewEditorHandle, Props>(function WebViewEditor({
  value,
  onChange,
  onSelectionChange,
  placeholder = '',
  style,
}, ref) {
  const webViewRef = useRef<WebView>(null);
  const lastSentValue = useRef(value);
  // Track if we're applying an external change (AI insert, chapter jump, etc.)
  const isExternalUpdate = useRef(false);

  // ── RN → WebView: push value when it changes externally ──
  useEffect(() => {
    // Skip if the change came from the WebView itself
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }
    if (value === lastSentValue.current) return;
    lastSentValue.current = value;
    const escaped = JSON.stringify(value);
    webViewRef.current?.injectJavaScript(
      `__setContent(${escaped}); true;`,
    );
  }, [value]);

  // ── WebView → RN: handle messages ──
  const handleMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data);
        if (msg.type === 'change') {
          lastSentValue.current = msg.text;
          isExternalUpdate.current = true;
          onChange(msg.text);
        } else if (msg.type === 'selection' && onSelectionChange) {
          onSelectionChange({ start: msg.start, end: msg.end });
        } else if (msg.type === 'ready') {
          // WebView loaded — push initial content
          const escaped = JSON.stringify(value);
          webViewRef.current?.injectJavaScript(
            `__setContent(${escaped}); true;`,
          );
        }
      } catch {
        // ignore malformed messages
      }
    },
    [onChange, onSelectionChange, value],
  );

  // ── Expose imperative methods via ref ──
  // We use injectJavaScript for selection control
  const setSelection = useCallback((start: number, end: number) => {
    webViewRef.current?.injectJavaScript(
      `__setSelection(${start}, ${end}); true;`,
    );
  }, []);

  const focus = useCallback(() => {
    webViewRef.current?.injectJavaScript(
      `document.getElementById('editor').focus(); true;`,
    );
  }, []);

  // Expose imperative handles by attaching to a ref passed by parent
  // (StoryEditor uses contentRef.current — we handle this via the wrapper)

  // ── HTML template ──
  const editorHtml = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 17px;
    line-height: 28px;
    color: #1C1C1E;
    background: transparent;
    -webkit-text-size-adjust: none;
  }
  #editor {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    padding: 12px 16px;
    font: inherit;
    line-height: inherit;
    color: inherit;
    background: transparent;
    -webkit-appearance: none;
    caret-color: #007AFF;
  }
  #editor::placeholder {
    color: #D1D1D6;
  }
</style>
</head>
<body>
<textarea id="editor" placeholder="${placeholder.replace(/"/g, '&quot;')}"></textarea>
<script>
(function() {
  const editor = document.getElementById('editor');
  let lastText = '';

  function send(msg) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch(e) {}
  }

  // Content change
  editor.addEventListener('input', function() {
    lastText = editor.value;
    send({ type: 'change', text: editor.value });
  });

  // Selection change
  editor.addEventListener('select', updateSelection);
  editor.addEventListener('click', updateSelection);
  editor.addEventListener('keyup', updateSelection);

  function updateSelection() {
    send({ type: 'selection', start: editor.selectionStart, end: editor.selectionEnd });
  }

  // Exposed functions for RN → WebView
  window.__setContent = function(text) {
    // Preserve scroll position and cursor
    const scrollTop = editor.scrollTop;
    const selStart = Math.min(editor.selectionStart, text.length);
    editor.value = text;
    lastText = text;
    editor.scrollTop = scrollTop;
    editor.setSelectionRange(selStart, selStart);
  };

  window.__setSelection = function(start, end) {
    editor.focus();
    editor.setSelectionRange(start, end);
    // Scroll the selection into view
    editor.blur();
    editor.focus();
  };

  // Signal ready
  send({ type: 'ready' });
})();
</script>
</body>
</html>`;

  // ── Expose imperative handle ──
  useImperativeHandle(ref, () => ({
    injectJavaScript: (js: string) => webViewRef.current?.injectJavaScript(js),
    setSelection,
    focus,
  }), [setSelection, focus]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: editorHtml }}
        style={styles.webview}
        originWhitelist={['*']}
        onMessage={handleMessage}
        keyboardDisplayRequiresUserAction={false}  // iOS: allow programmatic focus
        hideKeyboardAccessoryView={false}
        allowsBackForwardNavigationGestures={false}
        scrollEnabled={true}
        autoManageStatusBarEnabled={false}
        // Performance
        javaScriptEnabled={true}
        domStorageEnabled={false}
        startInLoadingState={false}
        // Prevent bounces on iOS
        bounces={false}
        overScrollMode="never"
        // Transparent background (via style)
      />
    </View>
  );
});

export default WebViewEditor;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
