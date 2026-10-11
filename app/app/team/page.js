
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function TeamManagementPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [company, setCompany] = useState(null);
  const [role, setRole] = useState("");
  const [members, setMembers] = useState([]);
  const [userId, setUserId] = useState("");
  
const [inviteEmail, setInviteEmail] = useState("");
const [inviting, setInviting] = useState(false);
const [inviteLink, setInviteLink] = useState("");


  useEffect(() => {
    let active = true;

    async function loadTeam() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const user = authData?.user;

        if (!user) {
          window.location.replace("/app/login");
          return;
        }

        const { data: memberships, error: memberError } =
          await supabase
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

        const { data: companyData, error: companyError } =
          await supabase
            .from("companies")
            .select("id, name")
            .eq("id", current.company_id)
            .maybeSingle();

        if (companyError) throw companyError;

        const { data: teamData, error: teamError } =
          await supabase
            .from("company_members")
            .select("id, user_id, role, created_at")
            .eq("company_id", current.company_id)
            .order("created_at", { ascending: true });

        if (teamError) throw teamError;

        if (!active) return;

        setUserId(user.id);
        setRole(current.role);
        setCompany(
          companyData || {
            id: current.company_id,
            name: "Your Company",
          }
        );

        setMembers(
          current.role === "admin"
            ? teamData || []
            : (teamData || []).filter(
                (member) => member.user_id === user.id
              )
        );
      } catch (err) {
        if (active) {
          setError(err?.message || "Unable to load your team.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTeam();

    return () => {
      active = false;
    };
  }, []);

async function handleInvite(event) {
  event.preventDefault();

  if (role !== "admin" || !company?.id) return;

  setInviting(true);
  setError("");
  setInviteLink("");

  try {
    const email = inviteEmail.trim().toLowerCase();

    const { data, error: inviteError } = await supabase
      .from("company_invitations")
      .insert({
        company_id: company.id,
        email,
        role: "hr",
        created_by: userId,
      })
      .select("token")
      .single();

    if (inviteError) throw inviteError;

    setInviteLink(
      `${window.location.origin}/app/accept-invite?token=${data.token}`
    );
    setInviteEmail("");
  } catch (err) {
    setError(err.message || "Could not create invitation.");
  } finally {
    setInviting(false);
  }
}

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e1e8e2",
    borderRadius: 20,
    padding: 26,
    boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        padding: "50px 20px",
        color: "#173f3a",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <Link
          href="/app/dashboard"
          style={{
            color: "#173f3a",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← Back to Dashboard
        </Link>

        <header style={{ margin: "35px 0" }}>
          <p
            style={{
              color: "#77877e",
              fontSize: 12,
              letterSpacing: 2,
              fontWeight: 700,
            }}
          >
            INSPIRE MATCH · PEOPLE & ACCESS
          </p>

          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 42,
              margin: "12px 0",
            }}
          >
            Team Management
          </h1>

          <p style={{ color: "#78847e" }}>
            Manage your recruitment workspace and review
            company team access.
          </p>
        </header>

        {loading ? (
          <section style={cardStyle}>
            Loading team information...
          </section>
        ) : error ? (
          <section style={cardStyle}>
            <p role="alert" style={{ color: "#ae3030" }}>
              {error}
            </p>

            <Link href="/app/company-setup">
              Open Company Setup
            </Link>
          </section>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              <section style={cardStyle}>
                <p style={{ color: "#78847e" }}>
                  Company
                </p>

                <h2 style={{ fontSize: 21 }}>
                  {company?.name}
                </h2>
              </section>

              <section style={cardStyle}>
                <p style={{ color: "#78847e" }}>
                  Your Account Role
                </p>

                <h2 style={{ fontSize: 21 }}>
                  {role === "admin"
                    ? "Company Admin"
                    : "HR Team Member"}
                </h2>
              </section>

              <section style={cardStyle}>
                <p style={{ color: "#78847e" }}>
                  {role === "admin"
                    ? "Team Members"
                    : "Membership"}
                </p>

                <h2 style={{ fontSize: 28 }}>
                  {role === "admin"
                    ? members.length
                    : "Active"}
                </h2>
              </section>
            </div>

            <section style={cardStyle}>
              <h2
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 27,
                  marginTop: 0,
                }}
              >
                {role === "admin"
                  ? "Company Team"
                  : "Your Membership"}
              </h2>

              <p
                style={{
                  color: "#78847e",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                {role === "admin"
                  ? "Registered members and their company roles."
                  : "Your access to this recruitment workspace."}
              </p>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                  }}
                >
                  <thead>
                    <tr>
                      {["Member", "Role", "Joined"].map(
                        (heading) => (
                          <th
                            key={heading}
                            style={{
                              padding: "15px 10px",
                              borderBottom:
                                "1px solid #e1e8e2",
                            }}
                          >
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td
                          style={{
                            padding: "16px 10px",
                            borderBottom:
                              "1px solid #edf0ed",
                          }}
                        >
                          {member.user_id === userId
                            ? "You"
                            : "Team Member"}
                        </td>

                        <td
                          style={{
                            padding: "16px 10px",
                            borderBottom:
                              "1px solid #edf0ed",
                          }}
                        >
                          {member.role === "admin"
                            ? "Company Admin"
                            : "HR"}
                        </td>

                        <td
                          style={{
                            padding: "16px 10px",
                            borderBottom:
                              "1px solid #edf0ed",
                          }}
                        >
                          {member.created_at
                            ? new Date(
                                member.created_at
                              ).toLocaleDateString("en-GB")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {members.length === 0 && (
                <p>No members found.</p>
              )}
            </section>

            {role === "admin" && (
              <section
                style={{
                  ...cardStyle,
                  marginTop: 20,
                  background: "#f2f7f3",
                }}
              >
                <h2
                  style={{
                    fontFamily: "Georgia, serif",
                    marginTop: 0,
                  }}
                >
                  Invite Your HR Team
                </h2>

                <p
                  style={{
                    color: "#68786f",
                    lineHeight: 1.7,
                    marginBottom: 0,
                  }}
                >
                 
<form onSubmit={handleInvite}>
  <label
    htmlFor="invite-email"
    style={{ display: "block", marginBottom: 10 }}
  >
    HR Member Email
  </label>

  <input
    id="invite-email"
    type="email"
    required
    placeholder="hr@company.com"
    value={inviteEmail}
    onChange={(e) => setInviteEmail(e.target.value)}
    style={{
      width: "100%",
      padding: 14,
      borderRadius: 10,
      border: "1px solid #d6dfda",
      boxSizing: "border-box",
      marginBottom: 15,
    }}
  />

  <button
    type="submit"
    disabled={inviting}
    style={{
      padding: "14px 22px",
      border: "none",
      borderRadius: 10,
      background: "#173f3a",
      color: "white",
      cursor: "pointer",
    }}
  >
    {inviting ? "Creating Invitation..." : "Invite HR Member"}
  </button>
</form>

{inviteLink && (
  <div style={{ marginTop: 20 }}>
    <p>Invitation Link</p>
    <input
      readOnly
      value={inviteLink}
      style={{ width: "100%", padding: 10, boxSizing: "border-box" }}
    />
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(inviteLink)}
    >
      Copy Invitation Link
    </button>
  </div>
)}

                </p>
              </section>
            )}
          </>
        )}

        <p
          style={{
            textAlign: "center",
            marginTop: 30,
            color: "#88948d",
            fontSize: 12,
          }}
        >
          INSPIRE MATCH · HIRE BETTER. INSPIRE MORE.
        </p>
      </div>
    </main>
  );
}
