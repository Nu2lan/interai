import { useState } from 'react';

/**
 * SetupPage — Interview configuration form shown before the interview starts.
 * Collects company, position, and job description.
 */
export default function SetupPage({ onStart }) {
  const [jobUrl, setJobUrl] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [position, setPosition] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const handleScrape = async () => {
    if (!jobUrl.trim()) return;
    setIsScraping(true);
    try {
      const res = await fetch('/api/scrape-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to scrape');
        return;
      }
      if (data.company) setCompany(data.company);
      if (data.position) setPosition(data.position);
      if (data.description) setJobDescription(data.description);
    } catch (err) {
      console.error('Scrape failed:', err);
      alert('Failed to scrape job posting. Check the URL and try again.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleNext = () => {
    onStart({
      company,
      jobDescription,
      position,
      jobUrl,
    });
  };

  return (
    <div className="setup-page">
      <div className="setup-card">
        {/* Header */}
        <div className="setup-header">
          <div className="setup-logo">
            <div className="setup-logo-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <div>
              <h1 className="setup-title">InterAI</h1>
              <p className="setup-subtitle">AI-Powered Interview Assistant</p>
            </div>
          </div>
          <button className="setup-next-btn" onClick={handleNext}>
            Next
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="setup-form">
          {/* Job Post URL */}
          <div className="setup-field">
            <label className="setup-label">
              Job Post URL
              <span className="setup-optional">(Optional)</span>
              <span className="setup-info" title="Paste a job posting URL to auto-fill company and job description">ⓘ</span>
            </label>
            <div className="setup-url-row">
              <input
                type="url"
                className="setup-input setup-url-input"
                placeholder="https://company.com/jobs/123"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
              />
              <button
                className="setup-scrape-btn"
                onClick={handleScrape}
                disabled={!jobUrl.trim() || isScraping}
              >
                {isScraping ? (
                  <span className="setup-scrape-spinner" />
                ) : (
                  'Scrape and Fill'
                )}
              </button>
            </div>
            <div className="setup-divider">
              <span>or input manually</span>
            </div>
          </div>

          {/* Position */}
          <div className="setup-field">
            <label className="setup-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
              Position
              <span className="setup-info" title="The job role you are interviewing for">ⓘ</span>
            </label>
            <input
              type="text"
              className="setup-input"
              placeholder="e.g. Software Engineer, Product Manager..."
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>

          {/* Company */}
          <div className="setup-field">
            <label className="setup-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Company
              <span className="setup-info" title="The company you are interviewing at">ⓘ</span>
            </label>
            <input
              type="text"
              className="setup-input"
              placeholder="Microsoft..."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          {/* Job Description */}
          <div className="setup-field">
            <label className="setup-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Job Description
              <span className="setup-info" title="Paste the job requirements so the AI can tailor its answers">ⓘ</span>
            </label>
            <textarea
              className="setup-textarea"
              placeholder="Software Engineer versed in Python, SQL, and AWS..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
