import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

/**
 * Promise-based confirmation dialog hook.
 *
 * `window.confirm` / `window.prompt` are blocked by default inside the Android
 * WebView that wraps this app, so every destructive action needs an in-app
 * modal. This hook lets any component do:
 *
 *   const { confirm, confirmDialog } = useConfirm();
 *   ...
 *   const ok = await confirm({ title: 'Delete?', message: '...' });
 *   if (ok) { ...do delete... }
 *   ...
 *   return <div>{ ...ui... }{confirmDialog}</div>;
 *
 * Options:
 *   title, message, confirmText, cancelText, variant ('danger'|'primary'),
 *   isDarkMode, requireTypedText (string). If `requireTypedText` is set, the
 *   confirm button stays disabled until the user types that exact value.
 */
export function useConfirm() {
  const [state, setState] = useState({ show: false, options: {} });
  const [typedValue, setTypedValue] = useState('');
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setTypedValue('');
      setState({
        show: true,
        options: typeof options === 'string' ? { message: options } : (options || {}),
      });
    });
  }, []);

  const handleClose = useCallback((result) => {
    setState({ show: false, options: {} });
    setTypedValue('');
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  }, []);

  const confirmDialog = state.show
    ? (
      <ConfirmDialogUI
        options={state.options}
        typedValue={typedValue}
        onTypedValueChange={setTypedValue}
        onClose={handleClose}
      />
    )
    : null;

  return { confirm, confirmDialog };
}

const ConfirmDialogUI = ({ options, typedValue, onTypedValueChange, onClose }) => {
  const {
    title = 'Are you sure?',
    message = '',
    confirmText = 'Yes, Delete',
    cancelText = 'No, Cancel',
    variant = 'danger',
    isDarkMode = false,
    requireTypedText = null,
  } = options;

  const isConfirmEnabled = !requireTypedText || typedValue === requireTypedText;
  const confirmClass = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4"
      data-testid="confirm-dialog"
    >
      <Card className={`w-full max-w-md ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-2 rounded-full flex-shrink-0 ${isDarkMode ? 'bg-red-900 text-red-400' : 'bg-red-100 text-red-600'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                {title}
              </h3>
              {message && (
                <p className={`text-sm whitespace-pre-line ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
                  {message}
                </p>
              )}
              {requireTypedText && (
                <div className="mt-3">
                  <p className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                    Type <span className="font-mono font-bold">{requireTypedText}</span> to confirm:
                  </p>
                  <Input
                    data-testid="confirm-dialog-typed-input"
                    value={typedValue}
                    onChange={(e) => onTypedValueChange(e.target.value)}
                    placeholder={requireTypedText}
                    className={isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              data-testid="confirm-dialog-cancel"
              onClick={() => onClose(false)}
              className={isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}
            >
              {cancelText}
            </Button>
            <Button
              data-testid="confirm-dialog-confirm"
              onClick={() => onClose(true)}
              disabled={!isConfirmEnabled}
              className={confirmClass}
            >
              {confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default useConfirm;
