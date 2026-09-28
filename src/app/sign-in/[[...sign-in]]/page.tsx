import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <main className="auth-shell">
      <div className="atmosphere atmosphere-a" />
      <div className="atmosphere atmosphere-b" />
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand">
            <span className="brand-mark">✦</span>
            <strong>HEAVEN</strong>
          </div>
        </div>
        <SignIn
          appearance={{
            variables: {
              colorBackground: 'rgba(17, 19, 20, .88)',
              colorForeground: '#f2f3f4',
              colorMutedForeground: '#90969b',
              colorPrimary: '#e5e8ea',
              colorInput: 'rgba(255,255,255,.035)',
              colorInputForeground: '#f2f3f4',
            },
            elements: {
              card: 'glass-auth-card',
              headerTitle: 'glass-auth-title',
              formButtonPrimary: 'glass-auth-primary',
              socialButtonsBlockButton: 'glass-auth-button',
              formFieldInput: 'glass-auth-input',
            },
          }}
        />
        <p className="auth-note">Sign in securely. Email verification and account recovery are handled by HEAVEN authentication.</p>
      </div>
    </main>
  )
}
