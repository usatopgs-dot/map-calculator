import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — Map Distance Calculator</title>
        <meta name="description" content="Privacy Policy for Map Distance Calculator app." />
      </Head>
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif', lineHeight: 1.7, color: '#111827' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>Last updated: January 2025</p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>1. Introduction</h2>
          <p>Map Distance Calculator is a free tool to measure distances, travel times, and areas on a map. This Privacy Policy explains how we handle your data.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>2. Information We Collect</h2>
          <p><strong>Location Data (GPS):</strong> Your GPS location is used only within your browser/device and is never sent to our servers.</p>
          <p style={{ marginTop: 12 }}><strong>Route Data:</strong> Waypoints are stored only in your browser local storage. We do not collect or store your routes on any server.</p>
          <p style={{ marginTop: 12 }}><strong>No Account Required:</strong> We do not ask for your name, email, or any personal information.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>3. Third-Party Services</h2>
          <p><strong>OpenStreetMap:</strong> Map tiles are loaded from OpenStreetMap servers. See <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" style={{ color: '#2563eb' }}>OpenStreetMap Privacy Policy</a>.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>4. Data Storage</h2>
          <p>All data is stored locally on your device. We do not have access to this data. You can clear it anytime by clearing your browser cache.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>5. Children Privacy</h2>
          <p>Our app is suitable for all ages. We do not knowingly collect personal information from children under 13.</p>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>6. Contact</h2>
          <p>Questions? Email: <strong>support@mapcalculator.app</strong></p>
        </section>

        <p style={{ marginTop: 40, color: '#6b7280', fontSize: 14 }}>
          <a href="/" style={{ color: '#2563eb' }}>Back to Map Calculator</a>
        </p>
      </main>
    </>
  );
}
