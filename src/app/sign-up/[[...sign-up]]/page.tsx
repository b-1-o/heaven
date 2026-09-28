import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
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
        <SignUp
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
        <p className="auth-note">Verify your email, then create or join a HEAVEN workspace.</p>
      </div>
    </main>
  )
}
