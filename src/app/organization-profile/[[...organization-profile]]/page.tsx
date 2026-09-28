import { OrganizationProfile } from '@clerk/nextjs'

export default function OrganizationProfilePage() {
  return (
    <main className="auth-shell">
      <div className="atmosphere atmosphere-a" />
      <div className="atmosphere atmosphere-b" />
      <section className="auth-card organization-profile-shell">
        <div className="auth-brand">
          <div className="brand"><span className="brand-mark">✦</span><strong>HEAVEN</strong></div>
        </div>
        <OrganizationProfile afterLeaveOrganizationUrl="/" />
      </section>
    </main>
  )
}
