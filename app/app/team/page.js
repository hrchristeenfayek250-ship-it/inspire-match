
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const NAV = [
  ["Overview", "/app/dashboard", "◫"],
  ["Jobs", "/app/jobs", "▣"],
  ["Candidates", "/app/candidates", "♙"],
  ["Pipeline", "/app/pipeline", "⇄"],
  ["AI Matching", "/app/matching", "✧"],
  ["Reports", "/app/reports", "▥"],
  ["Executive", "/app/executive", "◈"],
  ["Team", "/app/team", "♧"],
];

function InfoCard({ label, value, note, symbol }) {
  return (
    <div className="tm-stat">
      <div className="tm-stat-head">
        <span>{label}</span>
        <span className="tm-stat-icon">{symbol}</span>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function formattedDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TeamManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [company, setCompany] = useState(null);
  const [role, setRole] = useState("");
  const [members, setMembers] = useState([]);
  const [userId, setUserId] = useState("");
  const [invitations, setInvitations] = useState([]);

  const [inviteEmail, setInviteEmail] = useState("");
  
  const [inviteRole, setInviteRole] = useState("hr");

  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState("");

  const [cancellingId, setCancellingId] = useState(null);
  const [resendingId, setResendingId] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadTeam() {
      setLoading(true);
      setError("");

      try {
        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        const user = authData?.user;

        if (!user) {
          window.location.replace("/app/login");
          return;
        }

        const {
          data: memberships,
          error: memberError,
        } = await supabase
          .from("company_members")
          .select("company_id, role")
          .eq("user_id", user.id)
          .limit(2);

        if (memberError) throw memberError;

        if (!memberships || memberships.length !== 1) {
          throw new Error(
            "Please complete your company setup first."
          );
        }

        const current = memberships[0];

        const [companyResult, teamResult] =
          await Promise.all([
            supabase
              .from("companies")
              .select("id, name")
              .eq("id", current.company_id)
              .maybeSingle(),

            supabase
              .from("company_members")
              .select("id, user_id, role, created_at")
              .eq("company_id", current.company_id)
              .order("created_at", { ascending: true }),
          ]);

        if (companyResult.error) {
          throw companyResult.error;
        }

        if (teamResult.error) {
          throw teamResult.error;
        }

        let pending = [];

        if (current.role === "admin") {
          const { data, error: inviteError } =
            await supabase
              .from("company_invitations")
              .select(
                "id, email, created_at, expires_at"
              )
              .eq("company_id", current.company_id)
              .is("accepted_at", null)
              .gt(
                "expires_at",
                new Date().toISOString()
              )
              .order("created_at", {
                ascending: false,
              });

          if (inviteError) throw inviteError;

          pending = data || [];
        }

        if (!active) return;

        setUserId(user.id);
        setRole(current.role);
        setCompany(
          companyResult.data || {
            id: current.company_id,
            name: "Your Company",
          }
        );

        const teamMembers = teamResult.data || [];

        setMembers(
          current.role === "admin"
            ? teamMembers
            : teamMembers.filter(
                (member) => member.user_id === user.id
              )
        );

        setInvitations(pending);
      } catch (err) {
        if (active) {
          setError(
            err?.message ||
            "Unable to load team information."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTeam();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  function refreshTeam() {
    setRefreshKey((previous) => previous + 1);
  }

  async function getToken() {
    const { data, error } =
      await supabase.auth.getSession();

    if (error) throw error;

    const token = data?.session?.access_token;

    if (!token) {
      throw new Error("Please sign in again.");
    }

    return token;
  }

  async function handleInvite(event) {
    event.preventDefault();

    if (
      role !== "admin" ||
      !company?.id ||
      inviting
    ) return;

    const email = inviteEmail.trim().toLowerCase();

    if (!email) return;

    setInviting(true);
    setError("");
    setNotice("");
    setInviteLink("");

    try {
      const token = await getToken();

      const response = await fetch(
        "/api/send-hr-invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        
          body: JSON.stringify({ email, role: inviteRole }),

        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Invitation failed."
        );
      }

      setInviteLink(result.inviteLink || "");
      setInviteEmail("");
      setNotice(
        `HR invitation sent to ${email} successfully.`
      );

      refreshTeam();
    } catch (err) {
      setError(
        err.message || "Could not send invitation."
      );
    } finally {
      setInviting(false);
    }
  }

  async function cancelInvitation(invitation) {
    if (
      role !== "admin" ||
      cancellingId ||
      resendingId
    ) return;

    const confirmed = window.confirm(
      `Cancel invitation for ${invitation.email}?`
    );

    if (!confirmed) return;

    setCancellingId(invitation.id);
    setError("");
    setNotice("");

    try {
      const { data, error: cancelError } =
        await supabase.rpc(
          "cancel_company_invitation",
          { p_invitation_id: invitation.id }
        );

      if (cancelError) throw cancelError;

      if (!data) {
        throw new Error(
          "Invitation could not be cancelled."
        );
      }

      setInvitations((current) =>
        current.filter(
          (item) => item.id !== invitation.id
        )
      );

      setNotice(
        `Invitation cancelled for ${invitation.email}.`
      );
    } catch (err) {
      setError(
        err.message || "Could not cancel invitation."
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function resendInvitation(invitation) {
    if (
      role !== "admin" ||
      resendingId ||
      cancellingId
    ) return;

    const confirmed = window.confirm(
      `Resend invitation to ${invitation.email}? ` +
      "The existing invitation will be cancelled " +
      "before a new one is sent."
    );

    if (!confirmed) return;

    setResendingId(invitation.id);
    setError("");
    setNotice("");

    try {
      const oneHourAgo = new Date(
        Date.now() - 60 * 60 * 1000
      ).toISOString();

      const { count, error: countError } =
        await supabase
          .from("company_invitations")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("company_id", company.id)
          .gte("created_at", oneHourAgo);

      if (countError) throw countError;

      if ((count || 0) >= 10) {
        throw new Error(
          "Invitation limit reached. Try again later."
        );
      }

      const token = await getToken();

      const { data: cancelled, error: cancelError } =
        await supabase.rpc(
          "cancel_company_invitation",
          { p_invitation_id: invitation.id }
        );

      if (cancelError) throw cancelError;

      if (!cancelled) {
        throw new Error(
          "Invitation is no longer active."
        );
      }

      const response = await fetch(
        "/api/send-hr-invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: invitation.email,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Resend failed."
        );
      }

      setNotice(
        `Invitation resent to ${invitation.email}.`
      );

      setInviteLink(result.inviteLink || "");
    } catch (err) {
      setError(
        err.message ||
        "Could not resend invitation. " +
        "The previous invitation may have been cancelled."
      );
    } finally {
      setResendingId(null);
      refreshTeam();
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(
        inviteLink
      );

      setNotice("Invitation link copied.");
    } catch {
      setError(
        "Unable to copy automatically. " +
        "Please select and copy the link."
      );
    }
  }

  async function logOut() {
    const { error: signOutError } =
      await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      return;
    }

    window.location.href = "/app/login";
  }

  const isAdmin = role === "admin";

  const sidebar = (
    <div className="tm-side-inner">
      <div className="tm-brand">
        <div className="tm-logo">I</div>

        <div>
          <strong>Inspire Match</strong>
          <small>TALENT INTELLIGENCE</small>
        </div>
      </div>

      <div className="tm-side-label">
        WORKSPACE
      </div>

      <nav className="tm-navigation">
        {NAV.map(([label, href, icon]) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileNav(false)}
            className={
              href === "/app/team"
                ? "tm-nav active"
                : "tm-nav"
            }
          >
            <span>{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      <div className="tm-side-footer">
        <Link href="/">↗ ATS Home</Link>

        <button
          type="button"
          onClick={logOut}
        >
          ↪ Log out
        </button>

        <small>© Inspire Match ATS</small>
      </div>
    </div>
  );

  return (
    <main className="tm-root">
      <style>{`
        .tm-root {
          width: 100%;
          max-width: none;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          background: #f6f8fb;
          color: #1e293b;
          font-family: Arial, sans-serif;
          font-size: 14px;
        }

        .tm-root * {
          box-sizing: border-box;
        }

        .tm-root h1,
        .tm-root h2,
        .tm-root h3 {
          color: #1e293b;
          font-family: Arial, sans-serif;
        }

        .tm-shell {
          display: grid;
          grid-template-columns:
            254px minmax(0, 1fr);
          min-height: 100vh;
        }

        .tm-sidebar {
          background: white;
          border-right: 1px solid #e6eaf0;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
          padding: 24px 15px;
        }

        .tm-side-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 600px;
        }

        .tm-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 7px 12px 26px;
          border-bottom: 1px solid #edf0f2;
          margin-bottom: 25px;
        }

        .tm-logo {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #284e42;
          color: white;
          display: grid;
          place-items: center;
          font-size: 23px;
          font-weight: 800;
        }

        .tm-brand strong {
          display: block;
          color: #1e293b;
          font-size: 17px;
          letter-spacing: -.5px;
        }

        .tm-brand small {
          display: block;
          color: #8795a4;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.4px;
          margin-top: 4px;
        }

        .tm-side-label {
          color: #9ba6b2;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
          padding: 0 14px;
          margin-bottom: 10px;
        }

        .tm-navigation {
          display: grid;
          gap: 4px;
        }

        .tm-nav {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-radius: 10px;
          text-decoration: none;
          color: #657285;
          font-size: 13px;
          font-weight: 600;
          border-left: 3px solid transparent;
        }

        .tm-nav span {
          width: 23px;
          text-align: center;
          font-size: 19px;
        }

        .tm-nav:hover {
          background: #f4f7f6;
        }

        .tm-nav.active {
          background: #eaf3ee;
          color: #245340;
          border-left-color: #315f50;
          font-weight: 800;
        }

        .tm-side-footer {
          margin-top: auto;
          padding-top: 30px;
          display: grid;
          gap: 9px;
        }

        .tm-side-footer a {
          color: #657285;
          text-decoration: none;
          padding: 12px 15px;
          font-size: 13px;
        }

        .tm-side-footer button {
          background: #f7f8fa;
          border: 1px solid #e6eaf0;
          color: #526073;
          border-radius: 10px;
          padding: 12px 15px;
          text-align: left;
          cursor: pointer;
          font-weight: 700;
        }

        .tm-side-footer small {
          color: #a1acb8;
          font-size: 10px;
          margin-top: 7px;
        }

        .tm-content {
          min-width: 0;
          padding: 29px clamp(17px, 3vw, 46px) 60px;
        }

        .tm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 29px;
        }

        .tm-breadcrumb {
          color: #8390a0;
          font-size: 12px;
          margin-bottom: 9px;
        }

        .tm-breadcrumb strong {
          color: #315f50;
        }

        .tm-title {
          margin: 0;
          font-size: clamp(29px, 3vw, 38px);
          font-weight: 800;
          letter-spacing: -1.1px;
        }

        .tm-subtitle {
          color: #8390a0;
          font-size: 13px;
          line-height: 1.7;
          margin: 10px 0 0;
        }

        .tm-primary,
        .tm-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          padding: 12px 17px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
        }

        .tm-primary {
          border: 1px solid #284e42;
          background: #284e42;
          color: white;
        }

        .tm-secondary {
          border: 1px solid #e1e6ed;
          background: white;
          color: #526073;
        }

        .tm-primary:disabled,
        .tm-secondary:disabled {
          opacity: .5;
          cursor: wait;
        }

        .tm-stats {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .tm-stat,
        .tm-panel {
          background: white;
          border: 1px solid #e6eaf0;
          border-radius: 16px;
          box-shadow: 0 4px 18px rgba(23,35,50,.035);
        }

        .tm-stat {
          padding: 21px;
        }

        .tm-stat-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          color: #647182;
          font-size: 12px;
          font-weight: 700;
        }

        .tm-stat-icon {
          width: 38px;
          height: 38px;
          background: #edf4f0;
          color: #315f50;
          display: grid;
          place-items: center;
          border-radius: 10px;
          font-size: 20px;
        }

        .tm-stat strong {
          display: block;
          font-size: 26px;
          font-weight: 800;
          letter-spacing: -.5px;
          margin-top: 12px;
          overflow-wrap: anywhere;
        }

        .tm-stat small {
          display: block;
          color: #96a0ad;
          font-size: 11px;
          margin-top: 6px;
        }

        .tm-panel {
          padding: 25px;
          margin-bottom: 24px;
        }

        .tm-panel-head {
          margin-bottom: 20px;
        }

        .tm-panel-head h2 {
          font-size: 18px;
          font-weight: 800;
          margin: 0;
        }

        .tm-panel-head p {
          font-size: 12px;
          color: #8390a0;
          line-height: 1.7;
          margin: 7px 0 0;
        }

        .tm-table-wrap {
          overflow-x: auto;
        }

        .tm-table {
          border-collapse: collapse;
          width: 100%;
          min-width: 560px;
          text-align: left;
        }

        .tm-table th {
          padding: 14px 12px;
          background: #f8fafb;
          color: #8390a0;
          font-size: 11px;
          font-weight: 800;
          border-bottom: 1px solid #e6eaf0;
        }

        .tm-table td {
          padding: 17px 12px;
          border-bottom: 1px solid #edf0f3;
          font-size: 12px;
          color: #526073;
        }

        .tm-person {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .tm-avatar {
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          background: #eaf3ee;
          color: #315f50;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 800;
        }

        .tm-member-name {
          font-weight: 800;
          color: #1e293b;
        }

        .tm-role {
          display: inline-flex;
          align-items: center;
          padding: 6px 11px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 800;
          background: #eaf3ee;
          color: #315f50;
        }

        .tm-role.member {
          background: #eef2f8;
          color: #5b7396;
        }

        .tm-field {
          display: block;
          color: #526073;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 9px;
        }

        .tm-input {
          width: 100%;
          min-height: 44px;
          border: 1px solid #e1e6ed;
          background: white;
          color: #263445;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 13px;
          outline: none;
        }

        .tm-input:focus {
          border-color: #6e9a86;
          box-shadow: 0 0 0 3px #eaf3ee;
        }

        .tm-invite-row {
          display: flex;
          align-items: flex-end;
          flex-wrap: wrap;
          gap: 12px;
        }

        .tm-invite-field {
          flex: 1;
          min-width: 210px;
        }

        .tm-actions {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .tm-danger {
          border: 1px solid #edcaca;
          background: #fff4f4;
          color: #a63434;
          padding: 10px 13px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .tm-danger:disabled {
          opacity: .5;
          cursor: wait;
        }

        .tm-alert {
          padding: 14px 17px;
          background: #fff7f3;
          border: 1px solid #e8c7b7;
          color: #a14e31;
          border-radius: 10px;
          margin-bottom: 19px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .tm-notice {
          padding: 14px 17px;
          background: #edf8f1;
          border: 1px solid #cde7d5;
          color: #276446;
          border-radius: 10px;
          margin-bottom: 19px;
          font-size: 13px;
        }

        .tm-empty {
          padding: 30px;
          text-align: center;
          color: #96a0ad;
          font-size: 13px;
          border: 1px dashed #dce2e9;
          border-radius: 11px;
        }

        .tm-mobile-top {
          display: none;
        }

        @media (max-width: 1050px) {
          .tm-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .tm-shell {
            grid-template-columns: 1fr;
          }

          .tm-sidebar {
            display: none;
          }

          .tm-mobile-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px 19px;
            background: white;
            border-bottom: 1px solid #e6eaf0;
          }

          .tm-mobile-menu {
            background: white;
            padding: 14px 18px;
            border-bottom: 1px solid #e6eaf0;
          }

          .tm-mobile-menu .tm-side-inner {
            min-height: auto;
          }

          .tm-content {
            padding: 24px 16px;
          }
        }

        @media (max-width: 540px) {
          .tm-stats {
            grid-template-columns: 1fr;
          }

          .tm-stat,
          .tm-panel {
            padding: 18px;
          }

          .tm-title {
            font-size: 29px;
          }

          .tm-invite-row {
            align-items: stretch;
          }
        }
      `}</style>

      <div className="tm-shell">
        <aside className="tm-sidebar">
          {sidebar}
        </aside>

        <div style={{ minWidth: 0 }}>
          <div className="tm-mobile-top">
            <strong style={{ color: "#284e42" }}>
              ◈ Inspire Match
            </strong>

            <button
              type="button"
              className="tm-secondary"
              onClick={() =>
                setMobileNav((value) => !value)
              }
            >
              {mobileNav ? "Close ✕" : "☰ Menu"}
            </button>
          </div>

          {mobileNav && (
            <div className="tm-mobile-menu">
              {sidebar}
            </div>
          )}

          <div className="tm-content">
            <header className="tm-header">
              <div>
                <div className="tm-breadcrumb">
                  Workspace / <strong>Team</strong>
                </div>

                <h1 className="tm-title">
                  Team Management
                </h1>

                <p className="tm-subtitle">
                  Manage your company workspace,
                  HR members and invitations.
                </p>
              </div>

              <button
                type="button"
                className="tm-secondary"
                onClick={refreshTeam}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            </header>

            {error && (
              <div className="tm-alert" role="alert">
                {error}
              </div>
            )}

            {notice && (
              <div className="tm-notice" role="status">
                {notice}
              </div>
            )}

            {loading ? (
              <section className="tm-panel">
                Loading team information...
              </section>
            ) : !company ? (
              <section className="tm-panel">
                <div className="tm-panel-head">
                  <h2>Company Setup Required</h2>
                  <p>
                    Complete your company setup
                    to access Team Management.
                  </p>
                </div>

                <Link
                  href="/app/company-setup"
                  className="tm-primary"
                >
                  Open Company Setup →
                </Link>
              </section>
            ) : (
              <>
                <div className="tm-stats">
                  <InfoCard
                    label="Company"
                    value={company.name}
                    note="Current workspace"
                    symbol="▣"
                  />

                  <InfoCard
                    label="Your Account Role"
                    value={
                      isAdmin
                        ? "Company Admin"
                        : "HR Team Member"
                    }
                    note="Membership access level"
                    symbol="◈"
                  />

                  <InfoCard
                    label={
                      isAdmin
                        ? "Team Members"
                        : "Membership"
                    }
                    value={
                      isAdmin
                        ? members.length
                        : "Active"
                    }
                    note={
                      isAdmin
                        ? "Registered team accounts"
                        : "Your company account"
                    }
                    symbol="♧"
                  />
                </div>

                <section className="tm-panel">
                  <div className="tm-panel-head">
                    <h2>
                      {isAdmin
                        ? "Company Team"
                        : "Your Membership"}
                    </h2>

                    <p>
                      {isAdmin
                        ? "Manage visibility of registered HR team members and their access roles."
                        : "Review your access to this recruitment workspace."}
                    </p>
                  </div>

                  {members.length === 0 ? (
                    <div className="tm-empty">
                      No members found.
                    </div>
                  ) : (
                    <div className="tm-table-wrap">
                      <table className="tm-table">
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Role</th>
                            <th>Joined</th>
                          </tr>
                        </thead>

                        <tbody>
                          {members.map((member) => (
                            <tr key={member.id}>
                              <td>
                                <div className="tm-person">
                                  <div className="tm-avatar">
                                    {member.user_id === userId
                                      ? "Y"
                                      : "T"}
                                  </div>

                                  <span className="tm-member-name">
                                    {member.user_id === userId
                                      ? "You"
                                      : "Team Member"}
                                  </span>
                                </div>
                              </td>

                              <td>
                                <span
                                  className={
                                    member.role === "admin"
                                      ? "tm-role"
                                      : "tm-role member"
                                  }
                                >
                                  {member.role === "admin"
                                    ? "Company Admin"
                                    : "HR Member"}
                                </span>
                              </td>

                              <td>
                                {formattedDate(
                                  member.created_at
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {isAdmin && (
                  <>
                    <section className="tm-panel">
                      <div className="tm-panel-head">
                        <h2>
                          Pending HR Invitations
                          {" "}
                          ({invitations.length})
                        </h2>

                        <p>
                          Review active invitations and manage
                          pending team access.
                        </p>
                      </div>

                      {invitations.length === 0 ? (
                        <div className="tm-empty">
                          No pending invitations.
                        </div>
                      ) : (
                        <div className="tm-table-wrap">
                          <table className="tm-table">
                            <thead>
                              <tr>
                                <th>Email Address</th>
                                <th>Expires</th>
                                <th>Actions</th>
                              </tr>
                            </thead>

                            <tbody>
                              {invitations.map(
                                (invitation) => (
                                  <tr key={invitation.id}>
                                    <td
                                      style={{
                                        overflowWrap:
                                          "anywhere",
                                      }}
                                    >
                                      {invitation.email}
                                    </td>

                                    <td>
                                      {formattedDate(
                                        invitation.expires_at
                                      )}
                                    </td>

                                    <td>
                                      <div className="tm-actions">
                                        <button
                                          type="button"
                                          className="tm-primary"
                                          disabled={Boolean(
                                            resendingId ||
                                            cancellingId
                                          )}
                                          onClick={() =>
                                            resendInvitation(
                                              invitation
                                            )
                                          }
                                        >
                                          {resendingId ===
                                          invitation.id
                                            ? "Resending..."
                                            : "↻ Resend"}
                                        </button>

                                        <button
                                          type="button"
                                          className="tm-danger"
                                          disabled={Boolean(
                                            resendingId ||
                                            cancellingId
                                          )}
                                          onClick={() =>
                                            cancelInvitation(
                                              invitation
                                            )
                                          }
                                        >
                                          {cancellingId ===
                                          invitation.id
                                            ? "Cancelling..."
                                            : "× Cancel"}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    <section className="tm-panel">
                      <div className="tm-panel-head">
                        <h2>Invite Your HR Team</h2>

                        <p>
                          Invite an HR professional to join
                          this company workspace.
                        </p>
                      </div>

                      <form onSubmit={handleInvite}>
                        <div className="tm-invite-row">
                          <div className="tm-invite-field">
                            <label
                              htmlFor="invite-email"
                              className="tm-field"
                            >
                              HR Member Email
                            </label>

                            <input
                              id="invite-email"
                              type="email"
                              required
                              className="tm-input"
                              placeholder="hr@company.com"
                              value={inviteEmail}
                              onChange={(event) =>
                                setInviteEmail(
                                  event.target.value
                                )
                              }
                            />
                          </div>

                          <button
                            type="submit"
                            className="tm-primary"
                            disabled={inviting}
                            style={{ minHeight: 44 }}
                          >
                            {inviting
                              ? "Sending Invitation..."
                              : "＋ Invite HR Member"}
                          </button>
                        </div>
                      </form>

                      {inviteLink && (
                        <div
                          style={{
                            marginTop: 23,
                            paddingTop: 19,
                            borderTop:
                              "1px solid #edf0f3",
                          }}
                        >
                          <label
                            htmlFor="invite-link"
                            className="tm-field"
                          >
                            Invitation Link
                          </label>

                          <div className="tm-invite-row">
                            <div className="tm-invite-field">
                              <input
                                id="invite-link"
                                readOnly
                                className="tm-input"
                                value={inviteLink}
                              />
                            </div>

                            <button
                              type="button"
                              className="tm-secondary"
                              onClick={copyInviteLink}
                            >
                              Copy Link
                            </button>
                          </div>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
