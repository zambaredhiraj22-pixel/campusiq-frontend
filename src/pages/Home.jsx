import "../styles/home.css";

function Home() {
  return (
    <div className="landing-page">

      <header className="landing-header">

        <div className="brand">

          <div className="brand-logo">
            🎓
          </div>

          <div>
            <h2>CAMPUS-IQ</h2>

            <p>
              Placement Intelligence Platform
            </p>
          </div>

        </div>

        <div className="header-actions">

          <a
            href="/login"
            className="btn btn-secondary"
          >
            Login
          </a>

          <a
            href="/register"
            className="btn btn-primary"
          >
            Student Registration
          </a>

        </div>

      </header>

      <main>

        <section className="hero-section">

          <div className="hero-badge">
            AI-Powered Placement Intelligence Platform
          </div>

          <h1>
            Prepare with evidence.
            <br />
            Apply with confidence.
          </h1>

          <p className="hero-description">
            CAMPUS-IQ connects academic performance,
            biometric attendance, faculty-verified
            skills, secure assessments, company
            eligibility, and AI-powered placement
            readiness in one platform.
          </p>

          <div className="hero-actions">

            <a
              href="/login"
              className="btn btn-primary btn-large"
            >
              Login to CAMPUS-IQ
            </a>

            <a
              href="/register"
              className="btn btn-secondary btn-large"
            >
              Student Registration
            </a>

            <a
              href="/faculty/register"
              className="btn btn-secondary btn-large"
            >
              Faculty Registration
            </a>

            <a
              href="/tpo/register"
              className="btn btn-secondary btn-large"
            >
              TPO Registration
            </a>

          </div>

        </section>

        <section className="feature-section">

          <div className="section-heading">

            <span>
              CORE FEATURES
            </span>

            <h2>
              Everything needed for a smarter
              placement journey
            </h2>

          </div>

          <div className="feature-grid">

            <div className="feature-card">

              <div className="feature-icon">
                ✓
              </div>

              <h3>
                Verified Skills
              </h3>

              <p>
                Student skills are reviewed and verified
                by faculty before becoming part of the
                placement profile.
              </p>

            </div>

            <div className="feature-card">

              <div className="feature-icon">
                🛡
              </div>

              <h3>
                Secure Assessments
              </h3>

              <p>
                Placement tests combine aptitude,
                reasoning, technical skills, and
                proctoring controls.
              </p>

            </div>

            <div className="feature-card">

              <div className="feature-icon">
                AI
              </div>

              <h3>
                AI Readiness
              </h3>

              <p>
                Placement readiness is calculated from
                academics, attendance, skills, test
                performance, and integrity.
              </p>

            </div>

            <div className="feature-card">

              <div className="feature-icon">
                ◎
              </div>

              <h3>
                Biometric Attendance
              </h3>

              <p>
                ESP32 and fingerprint attendance
                records are connected directly to the
                student's profile.
              </p>

            </div>

            <div className="feature-card">

              <div className="feature-icon">
                🏢
              </div>

              <h3>
                Company Eligibility
              </h3>

              <p>
                Students can understand whether they
                satisfy company placement criteria and
                why.
              </p>

            </div>

            <div className="feature-card">

              <div className="feature-icon">
                ◉
              </div>

              <h3>
                Camera Proctoring
              </h3>

              <p>
                Anti-cheating controls monitor test
                integrity and record suspicious
                activity during assessments.
              </p>

            </div>

          </div>

        </section>

        <section className="roles-section">

          <div className="section-heading">

            <span>
              ROLE-BASED EXPERIENCE
            </span>

            <h2>
              One platform for students, faculty,
              and placement teams
            </h2>

          </div>

          <div className="role-grid">

            <div className="role-card">

              <h3>
                Student
              </h3>

              <p>
                Manage profile, skills, assessments,
                attendance, eligibility, and placement
                readiness.
              </p>

              <a
                href="/register"
                className="btn btn-secondary"
              >
                Register as Student
              </a>

            </div>

            <div className="role-card">

              <h3>
                Faculty
              </h3>

              <p>
                Verify skills, manage question banks,
                conduct assessments, and monitor student
                performance.
              </p>

              <a
                href="/faculty/register"
                className="btn btn-secondary"
              >
                Register as Faculty
              </a>

            </div>

            <div className="role-card">

              <h3>
                TPO
              </h3>

              <p>
                Manage companies, identify eligible
                students, and monitor placement
                readiness across the platform.
              </p>

              <a
                href="/tpo/register"
                className="btn btn-secondary"
              >
                Register as TPO
              </a>

            </div>

          </div>

        </section>

      </main>

      <footer className="landing-footer">

        <p>
          CAMPUS-IQ — AI-Powered Placement Intelligence
          Platform and Career Management System
        </p>

      </footer>

    </div>
  );
}

export default Home;