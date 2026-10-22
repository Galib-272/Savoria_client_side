'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

declare global {
  interface Window {
    google?: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/**
 * "Continue with Google" for customers. Renders nothing when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set.
 * Staff accounts are blocked by the server (they must use their fixed email + password).
 */
export function GoogleSignInButton({ onSignedIn, text = 'continue_with' }: { onSignedIn: (user: any) => void; text?: 'signin_with' | 'signup_with' | 'continue_with' }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const callbackRef = useRef(onSignedIn);
  callbackRef.current = onSignedIn;

  useEffect(() => {
    if (!CLIENT_ID) return;
    const init = () => {
      if (!window.google?.accounts?.id || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) return;
          try {
            const res = await api.googleLogin(response.credential);
            toast.success(`Welcome, ${res.user?.name || 'back'}!`);
            callbackRef.current(res.user);
          } catch (err: any) {
            toast.error(err.message || 'Google sign-in failed');
          }
        },
      });
      ref.current.innerHTML = '';
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline',
        size: 'large',
        text,
        shape: 'pill',
        width: Math.min(ref.current.offsetWidth || 320, 400),
      });
      setReady(true);
    };

    if (window.google?.accounts?.id) {
      init();
      return;
    }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', init);
    return () => script?.removeEventListener('load', init);
  }, [text]);

  if (!CLIENT_ID) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>
      <div ref={ref} className="flex min-h-[44px] w-full justify-center" aria-busy={!ready} />
    </div>
  );
}
