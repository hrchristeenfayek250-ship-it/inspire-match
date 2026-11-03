import Link from "next/link";

const DEMO_EMAIL = "mailto:hello@hireandinspirebychristine.com?subject=Inspire%20Match%20ATS%20-%20Request%20a%20Demo&body=Hello%20Inspire%20Match%20Sales%2C%0A%0AWe%20would%20like%20to%20request%20a%20private%20demo.%0A%0ACompany%3A%0AContact%20name%3A%0ATeam%20size%3A%0ACountry%3A%0A%0AThank%20you.";
const SALES_EMAIL = "mailto:hello@hireandinspirebychristine.com?subject=Inspire%20Match%20ATS%20-%20Sales%20Inquiry";

const LANDING_CSS = "\n.im-public{min-height:100vh;background:#f7faf7;color:#173a2c;font-family:Arial,Helvetica,sans-serif;overflow:hidden}\n.im-public *{box-sizing:border-box}\n.im-public a{text-decoration:none}\n.im-public .wrap{max-width:1210px;margin:0 auto;padding:0 28px}\n.im-public .nav{height:88px;display:flex;align-items:center;justify-content:space-between;gap:18px}\n.im-public .brand{display:flex;align-items:center;gap:12px;color:#183d2b;min-width:0}\n.im-public .mark{height:43px;width:43px;display:grid;place-items:center;border-radius:13px;color:white;background:linear-gradient(135deg,#123e2a,#2e9464);font:bold 23px Georgia,serif;box-shadow:0 5px 14px #23563722}\n.im-public .brand strong{display:block;font-size:17px;line-height:1.1;letter-spacing:-.7px}\n.im-public .brand small{display:block;font-size:9px;letter-spacing:1.75px;color:#708c79;margin-top:5px;font-weight:700}\n.im-public .nav-links{display:flex;align-items:center;gap:30px}\n.im-public .nav-links a{color:#536c5c;font-size:12px;font-weight:800;transition:color .15s}\n.im-public .nav-links a:hover{color:#145c3e}\n.im-public .nav-actions{display:flex;align-items:center;gap:12px}\n.im-public .nav-actions .signin{color:#1e523b;font-size:12px;font-weight:800;padding:12px 10px}\n.im-public .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:15px 23px;border:1px solid transparent;border-radius:11px;font-size:12px;font-weight:900;letter-spacing:.1px;transition:transform .18s,box-shadow .18s}\n.im-public .btn:hover{transform:translateY(-2px)}\n.im-public .btn-primary{color:#fff;background:#196b49;box-shadow:0 10px 24px rgba(25,107,73,.16)}\n.im-public .btn-primary:hover{box-shadow:0 15px 28px rgba(25,107,73,.22)}\n.im-public .btn-ghost{color:#1b563a;background:#fff;border-color:#d9e8dc}\n.im-public .topline{height:1px;background:#e5eee7}\n.im-public .hero{position:relative;padding:94px 0 92px;background:radial-gradient(circle at 86% 5%,#d9efe1 0,transparent 39%),linear-gradient(180deg,#fafcf9 0%,#f4f8f3 100%)}\n.im-public .hero:before{content:\"\";position:absolute;top:0;right:0;width:48%;height:100%;pointer-events:none;background-image:radial-gradient(#a4c7b2 1px,transparent 1px);background-size:22px 22px;opacity:.21;mask-image:linear-gradient(to left,#000,transparent)}\n.im-public .hero-inner{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.06fr);gap:48px;align-items:center}\n.im-public .eyebrow{display:inline-flex;align-items:center;gap:8px;color:#29714f;background:#e8f4eb;padding:9px 13px;border:1px solid #d9ebde;border-radius:50px;font-size:10px;letter-spacing:1.35px;font-weight:900}\n.im-public .eyebrow i{width:7px;height:7px;background:#2d9363;border-radius:50%;display:inline-block}\n.im-public h1{font-size:clamp(44px,4.6vw,70px);line-height:1.085;letter-spacing:-3.2px;font-family:Georgia,'Times New Roman',serif;color:#153f2c;font-weight:600;margin:25px 0}\n.im-public h1 em{font-style:normal;color:#247b54}\n.im-public .subhead{font-size:16px;line-height:1.85;color:#677d6e;max-width:530px;margin:0 0 28px}\n.im-public .hero-actions{display:flex;gap:13px;flex-wrap:wrap}\n.im-public .hero-foot{display:flex;align-items:center;gap:9px;color:#849a88;font-size:11px;margin-top:28px}\n.im-public .hero-foot span{display:inline-block;width:16px;height:1px;background:#9bb5a4}\n.im-public .product-window{position:relative;border:1px solid #cfe1d3;background:#fff;border-radius:22px;padding:18px;box-shadow:0 35px 85px rgba(25,69,42,.12);transform:rotate(-1deg)}\n.im-public .product-window:before{content:\"\";position:absolute;inset:20px -20px -20px 20px;border-radius:24px;background:#bbddc5;z-index:-1;opacity:.48}\n.im-public .mock-top{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#13442f;border-radius:13px 13px 0 0;color:#e8f8ec;padding:18px 19px}\n.im-public .mock-top b{font-size:13px}\n.im-public .mock-top small{display:block;color:#afdac0;font-size:10px;margin-top:5px}\n.im-public .mock-dots{display:flex;gap:5px}.im-public .mock-dots i{display:block;background:#72b38f;width:7px;height:7px;border-radius:50%}\n.im-public .mock-body{background:#f5f9f6;border:1px solid #e7efe9;border-top:0;padding:18px;border-radius:0 0 13px 13px}\n.im-public .mock-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}\n.im-public .mock-heading strong{font-size:13px}.im-public .mock-heading span{font-size:9px;color:#639878;background:#e5f2e8;padding:6px 9px;border-radius:50px;font-weight:800}\n.im-public .mock-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:15px}\n.im-public .metric{border:1px solid #e3ede6;background:#fff;border-radius:11px;padding:12px}.im-public .metric small{display:block;color:#829b88;font-size:9px}.im-public .metric strong{display:block;color:#174a33;font-size:24px;margin:6px 0}.im-public .metric em{font:normal 9px Arial;color:#5f9872}\n.im-public .mock-panel{background:#fff;border:1px solid #e3ede6;border-radius:11px;padding:16px}\n.im-public .mock-panel-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:19px}\n.im-public .mock-panel-head strong{font-size:11px}.im-public .mock-panel-head small{font-size:9px;color:#8aa291}\n.im-public .pipeline{display:flex;align-items:flex-end;gap:9px;height:94px;padding-bottom:6px;border-bottom:1px dashed #d7e5d9}\n.im-public .pipe-item{flex:1;display:flex;align-items:center;flex-direction:column;justify-content:flex-end;gap:7px}\n.im-public .pipe-item b{font-size:9px;color:#4f896b}\n.im-public .pipe-item .bar{width:100%;background:linear-gradient(180deg,#3b9c6d,#c8e7d1);border-radius:6px 6px 2px 2px}\n.im-public .pipe-labels{display:flex;gap:8px;margin-top:9px}.im-public .pipe-labels span{flex:1;text-align:center;font-size:8px;color:#8c9b90}\n.im-public .preview-label{position:absolute;right:30px;bottom:-22px;background:#fff;border:1px solid #dfebe3;box-shadow:0 8px 22px #2a60401a;border-radius:50px;padding:12px 15px;font-size:10px;color:#52715c;font-weight:800}\n.im-public .trust{background:#154631;color:#d6e8db;text-align:center;padding:19px 20px;font-size:11px;letter-spacing:.7px}\n.im-public .trust strong{color:#fff}\n.im-public .section{padding:100px 0}\n.im-public .section-alt{background:#fff}\n.im-public .section-kicker{text-transform:uppercase;color:#2b8a5b;font-size:10px;letter-spacing:2px;font-weight:900;margin:0 0 14px}\n.im-public h2{font-family:Georgia,'Times New Roman',serif;font-size:clamp(31px,3.5vw,46px);line-height:1.16;color:#19402c;font-weight:600;letter-spacing:-1.5px;margin:0 0 16px}\n.im-public .section-desc{color:#708676;max-width:670px;line-height:1.85;margin:0 0 34px;font-size:14px}\n.im-public .feature-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:17px;margin-top:38px}\n.im-public .feature{min-height:229px;background:#f7fbf8;border:1px solid #e0ece3;border-radius:16px;padding:23px}\n.im-public .feature-icon{display:grid;place-items:center;width:43px;height:43px;border-radius:12px;background:#e2f2e7;color:#1b6d49;font-size:20px}\n.im-public h3{font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#254936;font-weight:850;margin:21px 0 9px}\n.im-public .feature p{font-size:12px;line-height:1.8;color:#728779;margin:0}\n.im-public .steps{display:grid;grid-template-columns:repeat(4,1fr);gap:19px;margin-top:44px}\n.im-public .step{position:relative;border-top:1px solid #cedfd2;padding-top:24px}\n.im-public .step .num{display:grid;place-items:center;width:33px;height:33px;border-radius:50%;background:#1b6a49;color:#fff;font-size:11px;font-weight:900;margin-bottom:24px}\n.im-public .step h3{margin:0 0 9px}.im-public .step p{color:#7a8e80;font-size:12px;line-height:1.8}\n.im-public .cta-section{padding:76px 0}\n.im-public .cta-inner{display:flex;justify-content:space-between;align-items:center;gap:32px;border-radius:23px;padding:50px 58px;background:radial-gradient(circle at 93% 15%,#277452 0,transparent 45%),#103e2b;color:#fff}\n.im-public .cta-inner h2{color:#fff;margin:0 0 10px;max-width:650px}\n.im-public .cta-inner p{color:#c4dbcc;line-height:1.7;font-size:13px;margin:0}\n.im-public .cta-inner .btn{background:#fff;color:#18583a;white-space:nowrap}\n.im-public .faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}\n.im-public .faq{background:#fff;border:1px solid #e2ede5;border-radius:14px;padding:24px}\n.im-public .faq h3{margin:0 0 9px}.im-public .faq p{font-size:12px;color:#718575;line-height:1.85;margin:0}\n.im-public .footer{background:#123c2b;color:#c8dcce;padding:32px 0}\n.im-public .footer-inner{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;font-size:11px}\n.im-public .footer a{color:#d5f3de;font-weight:700}\n.im-public .footer b{color:white}\n.im-public .footer-links{display:flex;align-items:center;gap:20px;flex-wrap:wrap}\n@media(max-width:1050px){.im-public .nav-links{gap:16px}.im-public .hero-inner{gap:30px}.im-public .feature-grid{grid-template-columns:repeat(2,1fr)}.im-public .steps{grid-template-columns:repeat(2,1fr)}}\n@media(max-width:760px){.im-public .wrap{padding:0 19px}.im-public .nav{height:75px}.im-public .nav-links{display:none}.im-public .nav-actions .signin{padding:8px 0;font-size:11px}.im-public .nav-actions .btn{padding:11px 12px;font-size:10px}.im-public .brand strong{font-size:14px}.im-public .brand small{font-size:8px;letter-spacing:1px}.im-public .mark{width:37px;height:37px}.im-public .hero{padding:55px 0 70px}.im-public .hero-inner{grid-template-columns:1fr;gap:44px}.im-public h1{font-size:clamp(40px,10vw,60px);letter-spacing:-2.3px}.im-public .product-window{margin:0 8px;transform:none}.im-public .section{padding:66px 0}.im-public .feature-grid{grid-template-columns:1fr 1fr;gap:10px}.im-public .feature{padding:18px;min-height:215px}.im-public .steps{gap:14px}.im-public .cta-section{padding:45px 0}.im-public .cta-inner{display:block;padding:32px 24px}.im-public .cta-inner .btn{margin-top:25px}.im-public .faq-grid{grid-template-columns:1fr}.im-public .footer-inner{align-items:flex-start;flex-direction:column}.im-public .hero-foot{font-size:10px}}\n@media(max-width:390px){.im-public .nav-actions .signin{display:none}.im-public .feature-grid{grid-template-columns:1fr}.im-public .steps{grid-template-columns:1fr}.im-public .mock-metrics{gap:5px}.im-public .metric{padding:9px}.im-public .preview-label{display:none}}\n";

const features = [
  {icon:"◎",title:"Centralized Recruitment",desc:"Bring your vacancies, candidates and hiring activity into one connected workspace."},
  {icon:"✧",title:"AI-Assisted Insights",desc:"Support your team's assessments with structured information and human-led decision-making."},
  {icon:"♧",title:"Team Collaboration",desc:"Keep recruiters and hiring stakeholders aligned across stages, interviews and approvals."},
  {icon:"▥",title:"Actionable Visibility",desc:"See recruitment progress and operational indicators to support better planning."}
];
const steps = [
  {number:"01",title:"Tell us about your team",desc:"Share your organization, hiring goals and workflow needs."},
  {number:"02",title:"See a guided demo",desc:"Explore Inspire Match with our team and ask your questions."},
  {number:"03",title:"Receive a tailored proposal",desc:"Discuss scope, onboarding and private commercial terms."},
  {number:"04",title:"Set up with confidence",desc:"Workspace access follows the agreed onboarding and approval process."}
];
const faq = [
  {question:"Can I create a workspace immediately?",answer:"New company workspaces are not self-service. Our team coordinates onboarding and access after the relevant reviews."},
  {question:"Where can I see pricing?",answer:"We don't publish package prices online. A private proposal is prepared around your organization's needs."},
  {question:"Is AI making final hiring decisions?",answer:"No. AI supports evaluation; recruiters and hiring teams retain responsibility for hiring decisions."},
  {question:"Already using Inspire Match?",answer:"Choose Client Login to sign in with your existing account. Your organization manages team invitations."}
];

export default function InspireMatchMarketingHome() {
  return (
    <main className="im-public">
      <style>{LANDING_CSS}</style>
      <header className="wrap">
        <nav className="nav" aria-label="Main website navigation">
          <a href="/" className="brand" aria-label="Inspire Match home">
            <span className="mark" aria-hidden="true">✳</span>
            <span><strong>INSPIRE MATCH</strong><small>BY HIRE &amp; INSPIRE</small></span>
          </a>
          <div className="nav-links">
            <a href="#capabilities">Platform</a>
            <a href="#how-it-works">How it works</a>
            <a href="#questions">FAQs</a>
          </div>
          <div className="nav-actions">
            <Link className="signin" href="/app/login">Client Login</Link>
            <a className="btn btn-primary" href={DEMO_EMAIL}>Request Demo <span aria-hidden="true">↗</span></a>
          </div>
        </nav>
      </header>
      <div className="topline" />
      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap hero-inner">
          <div>
            <span className="eyebrow"><i aria-hidden="true" /> PRIVATE DEMONSTRATIONS AVAILABLE</span>
            <h1 id="hero-title">A smarter way to <em>move hiring forward.</em></h1>
            <p className="subhead">
              Meet Inspire Match — an AI-powered recruitment workspace that helps HR teams
              organize hiring, collaborate with clarity and make more informed decisions.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={DEMO_EMAIL}>Request a Private Demo <span aria-hidden="true">↗</span></a>
              <a className="btn btn-ghost" href="#capabilities">Discover the Platform <span aria-hidden="true">↓</span></a>
            </div>
            <div className="hero-foot">
              <span aria-hidden="true" />
              Built with recruitment expertise. Designed for growing teams.
            </div>
          </div>
          <div className="product-window" aria-label="Illustrative interface preview, not live customer data">
            <div className="mock-top">
              <div><b>✳ &nbsp; INSPIRE MATCH</b><small>Recruitment workspace</small></div>
              <div className="mock-dots"><i /><i /><i /></div>
            </div>
            <div className="mock-body">
              <div className="mock-heading"><strong>Recruitment Overview</strong><span>Sample dashboard</span></div>
              <div className="mock-metrics">
                <div className="metric"><small>Active roles</small><strong>12</strong><em>In progress</em></div>
                <div className="metric"><small>Candidates</small><strong>248</strong><em>Across pipelines</em></div>
                <div className="metric"><small>Interviews</small><strong>34</strong><em>Scheduled</em></div>
              </div>
              <div className="mock-panel">
                <div className="mock-panel-head"><strong>Recruitment Pipeline</strong><small>Sample activity</small></div>
                <div className="pipeline">
                  {[
                    ["84","91%"],["54","75%"],["31","57%"],["18","40%"],["10","26%"]
                  ].map(([v,height],i)=>(
                    <div className="pipe-item" key={i}><b>{v}</b><div className="bar" style={{height}} /></div>
                  ))}
                </div>
                <div className="pipe-labels">
                  <span>Applied</span><span>Screening</span><span>Interview</span><span>Shortlist</span><span>Hired</span>
                </div>
              </div>
            </div>
            <div className="preview-label">✦ Illustrative preview — not live data</div>
          </div>
        </div>
      </section>
      <div className="trust">A product by <strong>Hire &amp; Inspire by Christine</strong> &nbsp; · &nbsp; HIRE BETTER. INSPIRE MORE.</div>
      <section className="section section-alt" id="capabilities">
        <div className="wrap">
          <p className="section-kicker">Built around better recruitment</p>
          <h2>One connected hiring experience.</h2>
          <p className="section-desc">
            From day-to-day hiring coordination to deeper visibility, Inspire Match
            brings the essentials together without making recruitment more complicated.
          </p>
          <div className="feature-grid">
            {features.map(f=>(
              <article className="feature" key={f.title}>
                <span className="feature-icon" aria-hidden="true">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section" id="how-it-works">
        <div className="wrap">
          <p className="section-kicker">Our approach</p>
          <h2>From first conversation to your workspace.</h2>
          <p className="section-desc">We keep onboarding personal, intentional and tailored to your organization.</p>
          <div className="steps">
            {steps.map(s=>(
              <article className="step" key={s.number}>
                <span className="num">{s.number}</span>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section-alt cta-section">
        <div className="wrap">
          <div className="cta-inner">
            <div>
              <p className="section-kicker" style={{color:"#96d6ad"}}>Let's talk recruitment</p>
              <h2>Ready to see what Inspire Match can do for your team?</h2>
              <p>Book a conversation with Sales. We will discuss your requirements privately.</p>
            </div>
            <a href={DEMO_EMAIL} className="btn">Request Demo <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </section>
      <section className="section" id="questions">
        <div className="wrap">
          <p className="section-kicker">Frequently asked questions</p>
          <h2>Good to know.</h2>
          <div className="faq-grid">
            {faq.map(f=>(
              <article className="faq" key={f.question}><h3>{f.question}</h3><p>{f.answer}</p></article>
            ))}
          </div>
        </div>
      </section>
      <footer className="footer">
        <div className="wrap footer-inner">
          <div><b>✳ INSPIRE MATCH</b> &nbsp; | &nbsp; Hire better. Inspire more.</div>
          <div className="footer-links">
            <a href={SALES_EMAIL}>Contact Sales</a>
            <Link href="/app/login">Existing Client Login</Link>
            <a href="https://hireandinspirebychristine.com/" target="_blank" rel="noopener noreferrer">Hire &amp; Inspire</a>
          </div>
          <div>© {new Date().getFullYear()} Hire &amp; Inspire by Christine</div>
        </div>
      </footer>
    </main>
  );
}
