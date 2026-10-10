
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function CompanySetupPage() {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [adminReady, setAdminReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCompany() {
      try {
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!currentUser) {
          window.location.href = "/app/login";
          return;
        }

        if (!active) return;
        setUser(currentUser);

        const { data: existing, error: companyError } =
          await supabase
            .from("companies")
            .select("id, name")
            .eq("created_by", currentUser.id)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (companyError) throw companyError;

        if (existing) {
          const { data: membership, error: memberError } =
            await supabase
              .from("company_members")
              .select("id, role")
              .eq("company_id", existing.id)
              .eq("user_id", currentUser.id)
              .maybeSingle();

          if (memberError) throw memberError;

          if (active) {
            setCompany(existing);
            setAdminReady(membership?.role === "admin");
          }
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load company.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadCompany();

    return () => {
      active = false;
    };
  }, []);

  async function createAdminMembership(companyId) {
    const { data: existing, error: readError } =
      await supabase
        .from("company_members")
        .select("id, role")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (readError) throw readError;

    if (existing) {
      if (existing.role !== "admin") {
        throw new Error("This account is not an admin.");
      }
      setAdminReady(true);
      return;
    }

    const { error: insertError } = await supabase
      .from("company_members")
      .insert({
        company_id: companyId,
        user_id: user.id,
        role: "admin",
      });

    if (insertError) throw insertError;

    setAdminReady(true);
  }

  async function handleCreateCompany(event) {
    event.preventDefault();

    const name = companyName.trim();

    if (!user || saving || company) return;

    if (name.length < 2) {
      setError("Please enter a valid company name.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const { data: created, error: createError } =
        await supabase
          .from("companies")
          .insert({
            name,
            created_by: user.id,
          })
          .select("id, name")
          .single();

      if (createError) throw createError;

      setCompany(created);

      await createAdminMembership(created.id);

      setMessage("Company account created successfully!");
    } catch (err) {
      setError(err.message || "Company setup failed.");
    } finally {
      setSaving(false);
    }
  }

  async function finishAdminSetup() {
    if (!company || !user || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await createAdminMembership(company.id);
      setMessage("Admin account activated successfully!");
    } catch (err) {
      setError(err.message || "Could not activate admin.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "15px 16px",
    borderRadius: 12,
    border: "1px solid #d6dfda",
    fontSize: 15,
    outline: "none",
  };

  const buttonStyle = {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    border: "none",
    background: "#173f3a",
    color: "white",
    fontWeight: 700,
    fontSize: 15,
    cursor: saving ? "wait" : "pointer",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf9f6",
        padding: "55px 20px",
        color: "#173f3a",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
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

        <div
          style={{
            marginTop: 30,
            background: "#ffffff",
            padding: "40px 30px",
            borderRadius: 22,
            border: "1px solid #e0e8e2",
            boxShadow: "0 15px 40px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              letterSpacing: 2,
              textAlign: "center",
              color: "#7b8c82",
            }}
          >
            HIRE & INSPIRE BY CHRISTINE
          </div>

          <h1
            style={{
              fontFamily: "Georgia, serif",
              textAlign: "center",
              fontSize: 36,
              marginBottom: 8,
            }}
          >
            Company Setup
          </h1>

          <p
            style={{
              textAlign: "center",
              color: "#777",
              lineHeight: 1.7,
              marginBottom: 30,
            }}
          >
            Create your company account on Inspire Match.
          </p>

          {error && (
            <p
              style={{
                padding: 14,
                background: "#fff0f0",
                color: "#a82c2c",
                borderRadius: 10,
              }}
            >
              {error}
            </p>
          )}

          {message && (
            <p
              style={{
                padding: 14,
                background: "#eaf5ee",
                color: "#245c4a",
                borderRadius: 10,
              }}
            >
              {message}
            </p>
          )}

          {loading ? (
            <p style={{ textAlign: "center" }}>
              Loading company information...
            </p>
          ) : company ? (
            <div>
              <p style={{ color: "#777" }}>Company Name</p>

              <h2
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: 26,
                }}
              >
                {company.name}
              </h2>

              <p>
                Account Role:{" "}
                <strong>
                  {adminReady
                    ? "Company Admin"
                    : "Setup Incomplete"}
                </strong>
              </p>

              {!adminReady && (
                <button
                  type="button"
                  onClick={finishAdminSetup}
                  disabled={saving}
                  style={buttonStyle}
                >
                  {saving
                    ? "Please wait..."
                    : "Finish Admin Setup"}
                </button>
              )}

              {adminReady && (
                <p
                  style={{
                    color: "#245c4a",
                    marginTop: 20,
                    lineHeight: 1.6,
                  }}
                >
                  Your company account and admin membership
                  are registered successfully.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreateCompany}>
              <label
                htmlFor="company-name"
                style={{
                  display: "block",
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                Company Name
              </label>

              <input
                id="company-name"
                type="text"
                value={companyName}
                onChange={(e) =>
                  setCompanyName(e.target.value)
                }
                placeholder="Enter your company name"
                required
                minLength={2}
                maxLength={120}
                style={inputStyle}
              />

              <p
                style={{
                  color: "#777",
                  fontSize: 13,
                  lineHeight: 1.7,
                  marginTop: 16,
                  marginBottom: 24,
                }}
              >
                You will be registered as the company
                administrator.
              </p>

              <button
                type="submit"
                disabled={saving || !user}
                style={buttonStyle}
              >
                {saving
                  ? "Creating Company..."
                  : "Create Company Account"}
              </button>
            </form>
          )}
        </div>

        <p
          style={{
            textAlign: "center",
            color: "#888",
            fontSize: 12,
            marginTop: 22,
          }}
        >
          INSPIRE MATCH · HIRE BETTER. INSPIRE MORE.
        </p>
      </div>
    </main>
  );
}
