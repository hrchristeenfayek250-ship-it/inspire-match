
"use client";

import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ATSNavigation from "@/components/ATSNavigation";

const STATUSES = [
  "All statuses",
  "Applied",
  "Screening",
  "Interview",
  "Shortlisted",
  "Hired",
  "Rejected",
];


const STATUS_COLORS = {
  Applied: ["#eef2ff", "#4338ca"],
  Screening: ["#fff7e6", "#a46a17"],
  Interview: ["#eff6ff", "#2563eb"],
  Shortlisted: ["#f0fdf4", "#15803d"],
  Hired: ["#e6f7ef", "#16734d"],
  Rejected: ["#fff1f2", "#be123c"],
};

const formatText = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return Object.values(value).join(", ");
  }

  return String(value);
};

function Icon({ name, size = 18 }) {
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a20 20 0 0 0 18 0" />
      </>
    ),
    filter: (
      <>
        <path d="M4 7h16M7 12h10M10 17h4" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V3m-5 5 5-5 5 5" />
        <path d="M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    phone: (
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19 19 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.8L7.1 10a15 15 0 0 0 6.9 6.9l1.5-1.9a2 2 0 0 1 1.8-.6l3 .5a2 2 0 0 1 1.7 2Z" />
    ),
    file: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6M8 13h8M8 17h8" />
      </>
    ),
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14-5L3 9" />
        <path d="M3 3v6h6M4 13a8 8 0 0 0 14 5l3-3" />
        <path d="M21 21v-6h-6" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.users}
    </svg>
  );
}

function StatCard({ label, value, icon, description }) {
  return (
    <div className="imc-stat">
      <div className="imc-stat-top">
        <span>{label}</span>

        <div className="imc-stat-icon">
          <Icon name={icon} size={19} />
        </div>
      </div>

      <div className="imc-stat-value">{value}</div>
      <div className="imc-stat-description">{description}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="imc-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function CandidatesPage() {
   
export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [recruitmentFilter, setRecruitmentFilter] = useState("All types");
  const [locationFilter, setLocationFilter] = useState("");
  const [minExperience, setMinExperience] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("search") || "");
  }, []);

  useEffect(() => {
    loadCandidates();
  }, []);

  async function getCompanyScope() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Please log in again.");
    }

    const { data: memberships, error: membershipError } =
      await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(2);

    if (membershipError) throw membershipError;

    if (!memberships || memberships.length !== 1) {
      throw new Error(
        "A single company membership is required."
      );
    }

    const companyId = memberships[0].company_id;

    return (
      `company_id.eq.${companyId},` +
      `and(company_id.is.null,user_id.eq.${user.id})`
    );
  }

  async function loadCandidates() {
    setLoading(true);
    setError("");

    try {
      const filter = await getCompanyScope();

      const { data, error: queryError } = await supabase
        .from("candidates")
        .select("*")
        .or(filter)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      setCandidates(data || []);
    } catch (err) {
      console.error("Could not load candidates:", err);
      setCandidates([]);
      setError(err.message || "Could not load candidates.");
    } finally {
      setLoading(false);
    }
  }

  async function updateRecruitmentType(candidateId, newType) {
    setUpdatingId(candidateId);
    setError("");

    try {
      const filter = await getCompanyScope();

      const { data, error: updateError } = await supabase
        .from("candidates")
        .update({ recruitment_type: newType || null })
        .eq("id", candidateId)
        .or(filter)
        .select("id, recruitment_type")
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "Candidate not found or update not permitted."
        );
      }

      setCandidates((previous) =>
        previous.map((candidate) =>
          String(candidate.id) === String(data.id)
            ? {
                ...candidate,
                recruitment_type: data.recruitment_type,
              }
            : candidate
        )
      );
    } catch (err) {
      console.error("Could not update classification:", err);
      setError(
        `Could not update classification: ${err.message}`
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    const location = locationFilter.trim().toLowerCase();
    const experience = Number(minExperience);

    return candidates.filter((candidate) => {
      const searchableText = [
        candidate.full_name,
        candidate.current_title,
        candidate.location,
        candidate.skills,
        candidate.cv_file_name,
        candidate.cv_text,
        candidate.email,
      ]
        .map(formatText)
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !q || searchableText.includes(q);

      const matchesStatus =
        statusFilter === "All statuses" ||
        candidate.status === statusFilter;

      const matchesRecruitment =
        recruitmentFilter === "All types" ||
        (recruitmentFilter === "Not Classified"
          ? !candidate.recruitment_type
          : candidate.recruitment_type === recruitmentFilter);

      const matchesLocation =
        !location ||
        formatText(candidate.location)
          .toLowerCase()
          .includes(location);

      const matchesExperience =
        !minExperience ||
        Number(candidate.years_experience || 0) >= experience;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRecruitment &&
        matchesLocation &&
        matchesExperience
      );
    });
  }, [
    candidates,
    search,
    statusFilter,
    recruitmentFilter,
    locationFilter,
    minExperience,
  ]);

  const hasFilters =
    search !== "" ||
    statusFilter !== "All statuses" ||
    recruitmentFilter !== "All types" ||
    locationFilter !== "" ||
    minExperience !== "";

  function clearFilters() {
    setSearch("");
    setStatusFilter("All statuses");
    setRecruitmentFilter("All types");
    setLocationFilter("");
    setMinExperience("");
  }

  const stats = useMemo(
    () => ({
      total: filteredCandidates.length,
      active: filteredCandidates.filter(
        (c) => c.recruitment_type === "Active Recruitment"
      ).length,
      talent: filteredCandidates.filter(
        (c) => c.recruitment_type === "Talent Pool"
      ).length,
      unclassified: filteredCandidates.filter(
        (c) => !c.recruitment_type
      ).length,
    }),
    [filteredCandidates]
  );

  async function logOut() {
    const { error: logoutError } =
      await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    window.location.href = "/app/login";
  }

  const sidebar = (
    <div className="imc-sidebar-inner">
      <div className="imc-brand">
        <div className="imc-logo">I</div>

        <div>
          <strong>Inspire Match</strong>
          <small>TALENT INTELLIGENCE</small>
        </div>
      </div>

      <div className="imc-nav-label">WORKSPACE</div>

      <ATSNavigation
  className="imc-navigation"
  linkClassName="imc-nav-item"
  onNavigate={() => setMobileNav(false)}
/>

<div className="imc-sidebar-footer">
  <Link href="/">↗ ATS Home</Link>

  <button onClick={logOut}>
    ↪ Log out
  </button>

  <small>© Inspire Match ATS</small>
</div>
</div>
);

  return (
    <main className="imc-root">
      <style>{`
        .imc-root {
          width: 100%;
          max-width: none;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          background: #f6f8fb;
          color: #1e293b;
          font-family: Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }

        .imc-root * {
          box-sizing: border-box;
        }

        .imc-root h1,
        .imc-root h2,
        .imc-root h3 {
          color: #1e293b;
          font-family: Arial, sans-serif;
        }

        .imc-shell {
          display: grid;
          grid-template-columns: 254px minmax(0, 1fr);
          min-height: 100vh;
        }

        .imc-sidebar {
          height: 100vh;
          position: sticky;
          top: 0;
          overflow-y: auto;
          background: white;
          border-right: 1px solid #e6eaf0;
          padding: 24px 15px;
        }

        .imc-sidebar-inner {
          height: 100%;
          min-height: 600px;
          display: flex;
          flex-direction: column;
        }

        .imc-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 12px 26px;
          border-bottom: 1px solid #edf0f2;
          margin-bottom: 25px;
        }

        .imc-logo {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          background: #284e42;
          color: white;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 23px;
          font-weight: 800;
        }

        .imc-brand strong {
          display: block;
          font-size: 17px;
          letter-spacing: -.5px;
          color: #1e293b;
        }

        .imc-brand small {
          display: block;
          font-size: 9px;
          letter-spacing: 1.4px;
          color: #8795a4;
          font-weight: 800;
          margin-top: 4px;
        }

        .imc-nav-label {
          color: #9ba6b2;
          font-size: 10px;
          letter-spacing: 1.5px;
          font-weight: 800;
          padding: 0 14px;
          margin-bottom: 10px;
        }

        .imc-navigation {
          display: grid;
          gap: 4px;
        }

        .imc-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-radius: 10px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 600;
          color: #657285;
          border-left: 3px solid transparent;
          white-space: nowrap;
        }

        .imc-nav-item:hover {
          background: #f4f7f6;
        }

        .imc-nav-item.active {
          color: #245340;
          background: #eaf3ee;
          border-left-color: #315f50;
          font-weight: 800;
        }

.imc-nav-item > span {
          width: 23px;
          font-size: 19px;
          text-align: center;
        }

        .imc-sidebar-footer {
          margin-top: auto;
          display: grid;
          gap: 9px;
          padding-top: 30px;
        }

        .imc-sidebar-footer a {
          padding: 12px 15px;
          color: #657285;
          text-decoration: none;
          font-size: 13px;
        }

        .imc-sidebar-footer button {
          background: #f7f8fa;
          border: 1px solid #e6eaf0;
          border-radius: 10px;
          color: #526073;
          padding: 12px 15px;
          text-align: left;
          cursor: pointer;
          font-weight: 700;
        }

        .imc-sidebar-footer small {
          color: #a1acb8;
          font-size: 10px;
          margin-top: 7px;
        }

        .imc-content {
          min-width: 0;
          padding: 29px clamp(17px, 3vw, 46px) 60px;
        }

        .imc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 30px;
        }

        .imc-breadcrumb {
          color: #8390a0;
          font-size: 12px;
          margin-bottom: 9px;
        }

        .imc-breadcrumb strong {
          color: #315f50;
        }

        .imc-page-title {
          font-size: clamp(29px, 3vw, 38px);
          line-height: 1.2;
          letter-spacing: -1.1px;
          font-weight: 800;
          margin: 0;
        }

        .imc-subtitle {
          color: #8390a0;
          font-size: 13px;
          margin: 10px 0 0;
        }

        .imc-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .imc-primary,
        .imc-secondary {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 9px;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
        }

        .imc-primary {
          background: #284e42;
          color: white;
          border: 1px solid #284e42;
        }

        .imc-primary:hover {
          background: #1d3f34;
        }

        .imc-secondary {
          background: white;
          color: #526073;
          border: 1px solid #e3e8ed;
        }

        .imc-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .imc-stat,
        .imc-panel,
        .imc-candidate {
          background: white;
          border: 1px solid #e6eaf0;
          border-radius: 16px;
          box-shadow: 0 4px 18px rgba(23,35,50,.035);
        }

        .imc-stat {
          padding: 21px;
          min-width: 0;
        }

        .imc-stat-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          color: #647182;
          font-size: 12px;
          font-weight: 700;
        }

        .imc-stat-icon {
          width: 37px;
          height: 37px;
          flex-shrink: 0;
          background: #edf4f0;
          color: #315f50;
          border-radius: 10px;
          display: grid;
          place-items: center;
        }

        .imc-stat-value {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
          color: #1e293b;
          margin-top: 12px;
        }

        .imc-stat-description {
          color: #96a0ad;
          font-size: 11px;
          margin-top: 5px;
        }

        .imc-panel {
          padding: 24px;
          margin-bottom: 24px;
        }

        .imc-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 21px;
        }

        .imc-panel-header h2 {
          margin: 0;
          font-size: 17px;
          font-weight: 800;
        }

        .imc-panel-header p {
          margin: 6px 0 0;
          color: #8994a3;
          font-size: 12px;
        }

        .imc-filter-grid {
          display: grid;
          grid-template-columns:
            repeat(auto-fit, minmax(min(100%, 175px), 1fr));
          gap: 15px;
          align-items: end;
        }

        .imc-field label {
          display: block;
          margin-bottom: 8px;
          color: #526073;
          font-size: 12px;
          font-weight: 800;
        }

        .imc-input,
        .imc-select {
          width: 100%;
          min-height: 43px;
          padding: 11px 12px;
          border: 1px solid #e1e6ed;
          background: white;
          color: #263445;
          border-radius: 9px;
          font-size: 13px;
          font-family: Arial, sans-serif;
          outline: none;
        }

        .imc-input:focus,
        .imc-select:focus {
          border-color: #6e9a86;
          box-shadow: 0 0 0 3px #eaf3ee;
        }

        .imc-results-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 17px;
        }

        .imc-results-bar h2 {
          font-size: 18px;
          margin: 0;
          font-weight: 800;
        }

        .imc-results-bar p {
          margin: 6px 0 0;
          color: #8994a3;
          font-size: 12px;
        }

        .imc-clear {
          background: white;
          color: #526073;
          border: 1px solid #e1e6ed;
          border-radius: 9px;
          padding: 10px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .imc-candidate-list {
          display: grid;
          gap: 15px;
        }

        .imc-candidate {
          padding: 23px;
          transition: border-color .2s, box-shadow .2s;
        }

        .imc-candidate:hover {
          border-color: #c5d9ce;
          box-shadow: 0 8px 25px rgba(23,35,50,.055);
        }

        .imc-candidate-top {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
          align-items: flex-start;
        }

        .imc-profile {
          display: flex;
          align-items: flex-start;
          gap: 15px;
          flex: 1;
          min-width: 200px;
        }

        .imc-avatar {
          width: 48px;
          height: 48px;
          border-radius: 13px;
          flex-shrink: 0;
          background: #eaf3ee;
          color: #315f50;
          display: grid;
          place-items: center;
          font-size: 19px;
          font-weight: 800;
        }

        .imc-profile-name {
          color: #1e293b;
          font-weight: 800;
          font-size: 17px;
          text-decoration: none;
        }

        .imc-profile-name:hover {
          color: #315f50;
        }

        .imc-role {
          color: #657285;
          font-size: 13px;
          margin-top: 6px;
        }

        .imc-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 13px;
          margin-top: 13px;
          font-size: 12px;
          color: #8994a3;
        }

        .imc-meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .imc-status-area {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 11px;
          min-width: 175px;
        }

        .imc-status {
          display: inline-flex;
          border-radius: 20px;
          padding: 7px 12px;
          font-size: 11px;
          font-weight: 800;
        }

        .imc-classification {
          width: 100%;
          max-width: 195px;
          padding: 10px;
          border: 1px solid #e1e6ed;
          border-radius: 9px;
          background: #f8fafb;
          color: #315f50;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .imc-info {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 24px;
          padding: 18px 0;
          margin-top: 12px;
          border-bottom: 1px solid #eef0f3;
          color: #758193;
          font-size: 12px;
        }

        .imc-info-item {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          overflow-wrap: anywhere;
        }

        .imc-skills {
          padding: 16px 0;
          color: #647182;
          font-size: 12px;
          line-height: 1.8;
          overflow-wrap: anywhere;
        }

        .imc-skills strong {
          display: inline-block;
          color: #475569;
          margin-right: 8px;
        }

        .imc-candidate-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          border-top: 1px solid #eef0f3;
          padding-top: 17px;
          margin-top: 8px;
        }

        .imc-cv {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          color: #8390a0;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .imc-view {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
          padding: 10px 14px;
          border-radius: 9px;
          background: #284e42;
          color: white;
          font-size: 12px;
          font-weight: 800;
        }

        .imc-view:hover {
          background: #1d3f34;
        }

        .imc-empty {
          background: white;
          border: 1px dashed #ced8df;
          border-radius: 16px;
          text-align: center;
          padding: 55px 25px;
        }

        .imc-mobile-top {
          display: none;
        }

        .imc-alert {
          padding: 14px 17px;
          border: 1px solid #e8c7b7;
          background: #fff7f3;
          border-radius: 10px;
          color: #a14e31;
          margin-bottom: 20px;
          font-size: 13px;
        }

        @media (max-width: 1250px) {
          .imc-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .imc-shell {
            grid-template-columns: 1fr;
          }

          .imc-sidebar {
            display: none;
          }

          .imc-mobile-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 19px;
            background: white;
            border-bottom: 1px solid #e6eaf0;
          }

          .imc-mobile-menu {
            background: white;
            padding: 14px 18px;
            border-bottom: 1px solid #e6eaf0;
          }

          .imc-mobile-menu .imc-sidebar-inner {
            min-height: auto;
          }

          .imc-content {
            padding: 24px 16px;
          }
        }

        @media (max-width: 540px) {
          .imc-stats {
            gap: 10px;
          }

          .imc-stat {
            padding: 16px;
          }

          .imc-stat-value {
            font-size: 26px;
          }

          .imc-stat-top {
            font-size: 11px;
          }

          .imc-candidate {
            padding: 17px;
          }

          .imc-status-area {
            align-items: flex-start;
            width: 100%;
          }

          .imc-classification {
            max-width: none;
          }

          .imc-page-title {
            font-size: 29px;
          }
        }
      `}</style>

      <div className="imc-shell">
        <aside className="imc-sidebar">
          {sidebar}
        </aside>

        <div style={{ minWidth: 0 }}>
          <div className="imc-mobile-top">
            <strong style={{ color: "#284e42" }}>
              ◈ Inspire Match
            </strong>

            <button
              onClick={() => setMobileNav((v) => !v)}
              style={{
                border: 0,
                borderRadius: 9,
                padding: "10px 14px",
                background: "#eaf3ee",
                color: "#284e42",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {mobileNav ? "Close ✕" : "☰ Menu"}
            </button>
          </div>

          {mobileNav && (
            <div className="imc-mobile-menu">
              {sidebar}
            </div>
          )}

          <div className="imc-content">
            {/* PAGE HEADER */}

            <header className="imc-header">
              <div>
                <div className="imc-breadcrumb">
                  Workspace
                  <span style={{ margin: "0 9px" }}>/</span>
                  <strong>Candidates</strong>
                </div>

                <h1 className="imc-page-title">
                  Candidate Database
                </h1>

                <p className="imc-subtitle">
                  Search, organize and manage your talent
                  in one place.
                </p>
              </div>

              <div className="imc-actions">
                <button
                  onClick={loadCandidates}
                  className="imc-secondary"
                  disabled={loading}
                >
                  <Icon name="refresh" size={15} />
                  Refresh
                </button>

                <Link
                  href="/app/candidates/upload"
                  className="imc-primary"
                >
                  <Icon name="upload" size={16} />
                  Upload CV with AI
                </Link>
              </div>
            </header>

            {error && (
              <div role="alert" className="imc-alert">
                {error}
              </div>
            )}

            {/* CLASSIFICATION OVERVIEW */}

            <div className="imc-stats">
              <StatCard
                label="Matching Candidates"
                value={loading ? "—" : stats.total}
                icon="users"
                description="Candidates in current results"
              />

              <StatCard
                label="Active Recruitment"
                value={loading ? "—" : stats.active}
                icon="briefcase"
                description="In active recruitment"
              />

              <StatCard
                label="Talent Pool"
                value={loading ? "—" : stats.talent}
                icon="users"
                description="Available talent profiles"
              />

              <StatCard
                label="Not Classified"
                value={loading ? "—" : stats.unclassified}
                icon="filter"
                description="Awaiting classification"
              />
            </div>

            {/* SEARCH AND FILTERS */}

            <section className="imc-panel">
              <div className="imc-panel-header">
                <div>
                  <h2>Search & Filters</h2>
                  <p>
                    Find candidates using their profile
                    information.
                  </p>
                </div>

                <button
                  className="imc-clear"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  style={{
                    opacity: hasFilters ? 1 : 0.5,
                  }}
                >
                  Clear Filters
                </button>
              </div>

              <div className="imc-filter-grid">
                <Field label="Search Candidates">
                  <input
                    className="imc-input"
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Name, title, skills..."
                  />
                </Field>

                <Field label="Candidate Status">
                  <select
                    className="imc-select"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value)
                    }
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Recruitment Type">
                  <select
                    className="imc-select"
                    value={recruitmentFilter}
                    onChange={(e) =>
                      setRecruitmentFilter(e.target.value)
                    }
                  >
                    <option value="All types">
                      All Types
                    </option>
                    <option value="Active Recruitment">
                      Active Recruitment
                    </option>
                    <option value="Talent Pool">
                      Talent Pool
                    </option>
                    <option value="Not Classified">
                      Not Classified
                    </option>
                  </select>
                </Field>

                <Field label="Location">
                  <input
                    className="imc-input"
                    value={locationFilter}
                    onChange={(e) =>
                      setLocationFilter(e.target.value)
                    }
                    placeholder="e.g. Cairo"
                  />
                </Field>

                <Field label="Min. Experience">
                  <input
                    className="imc-input"
                    type="number"
                    min="0"
                    value={minExperience}
                    onChange={(e) =>
                      setMinExperience(e.target.value)
                    }
                    placeholder="Years"
                  />
                </Field>
              </div>
            </section>

            {/* RESULTS HEADER */}

            <div className="imc-results-bar">
              <div>
                <h2>Talent Directory</h2>

                <p>
                  {loading
                    ? "Loading candidate records..."
                    : `Showing ${filteredCandidates.length} of ${candidates.length} candidates`}
                </p>
              </div>

              <Link
                href="/app/pipeline"
                className="imc-secondary"
              >
                View Pipeline
                <Icon name="arrow" size={15} />
              </Link>
            </div>

            {/* CANDIDATES */}

            {loading ? (
              <div className="imc-empty">
                <h3>Loading Candidates...</h3>
                <p style={{ color: "#8994a3" }}>
                  Retrieving your talent database.
                </p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="imc-empty">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    color: "#315f50",
                    marginBottom: 15,
                  }}
                >
                  <Icon name="users" size={36} />
                </div>

                <h3 style={{ margin: "0 0 8px" }}>
                  No candidates found
                </h3>

                <p style={{ color: "#8994a3" }}>
                  Try adjusting your filters or uploading
                  a new CV.
                </p>

                {hasFilters && (
                  <button
                    className="imc-clear"
                    onClick={clearFilters}
                    style={{ marginTop: 10 }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="imc-candidate-list">
                {filteredCandidates.map((candidate) => {
                  const statusColors =
                    STATUS_COLORS[candidate.status] || [
                      "#f1f5f9",
                      "#475569",
                    ];

                  const name =
                    candidate.full_name ||
                    "Unnamed Candidate";

                  const experience =
                    candidate.years_experience !== null &&
                    candidate.years_experience !== undefined
                      ? `${candidate.years_experience} years experience`
                      : "Experience not specified";

                  return (
                    <article
                      key={candidate.id}
                      className="imc-candidate"
                    >
                      <div className="imc-candidate-top">
                        <div className="imc-profile">
                          <div className="imc-avatar">
                            {name.charAt(0).toUpperCase()}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <Link
                              href={`/app/candidates/${candidate.id}`}
                              className="imc-profile-name"
                            >
                              {name}
                            </Link>

                            <div className="imc-role">
                              {candidate.current_title ||
                                "Title not specified"}
                            </div>

                            <div className="imc-meta">
                              <span>
                                <Icon name="briefcase" size={14} />
                                {experience}
                              </span>

                              {candidate.location && (
                                <span>
                                  <Icon name="pin" size={14} />
                                  {formatText(candidate.location)}
                                </span>
                              )}

                              {candidate.created_at && (
                                <span>
                                  <Icon name="calendar" size={14} />
                                  {new Date(
                                    candidate.created_at
                                  ).toLocaleDateString("en-GB")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="imc-status-area">
                          <span
                            className="imc-status"
                            style={{
                              background: statusColors[0],
                              color: statusColors[1],
                            }}
                          >
                            {candidate.status || "Not Set"}
                          </span>

                          <select
                            className="imc-classification"
                            aria-label={`Recruitment type for ${name}`}
                            value={
                              candidate.recruitment_type || ""
                            }
                            disabled={
                              updatingId === candidate.id
                            }
                            onChange={(e) =>
                              updateRecruitmentType(
                                candidate.id,
                                e.target.value
                              )
                            }
                          >
                            <option value="">
                              Not Classified
                            </option>
                            <option value="Talent Pool">
                              Talent Pool
                            </option>
                            <option value="Active Recruitment">
                              Active Recruitment
                            </option>
                          </select>
                        </div>
                      </div>

                      {(candidate.email ||
                        candidate.phone) && (
                        <div className="imc-info">
                          {candidate.email && (
                            <span className="imc-info-item">
                              <Icon name="mail" size={15} />
                              {candidate.email}
                            </span>
                          )}

                          {candidate.phone && (
                            <span className="imc-info-item">
                              <Icon name="phone" size={15} />
                              {candidate.phone}
                            </span>
                          )}
                        </div>
                      )}

                      {candidate.skills && (
                        <div className="imc-skills">
                          <strong>Skills</strong>
                          {formatText(candidate.skills)}
                        </div>
                      )}

                      <div className="imc-candidate-footer">
                        <div className="imc-cv">
                          <Icon name="file" size={17} />

                          <span>
                            {candidate.cv_file_name ||
                              "No CV file attached"}
                          </span>
                        </div>

                        <Link
                          href={`/app/candidates/${candidate.id}`}
                          className="imc-view"
                        >
                          View Profile
                          <Icon name="arrow" size={15} />
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
