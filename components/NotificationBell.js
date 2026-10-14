
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let channel = null;

    async function loadNotifications(id) {
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select(
          "id, title, message, priority, action_url, is_read, created_at"
        )
        .eq("recipient_id", id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!active) return;

      if (fetchError) {
        setError("Could not load notifications.");
      } else {
        setNotifications(data || []);
        setError("");
      }

      setLoading(false);
    }

    async function start() {
      const { data, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data?.user) {
        setLoading(false);
        return;
      }

      const id = data.user.id;
      setUserId(id);

      await loadNotifications(id);

      if (!active) return;

      channel = supabase
        .channel(`notifications-${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${id}`,
          },
          () => loadNotifications(id)
        )
        .subscribe();
    }

    start();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  async function markAsRead(item) {
    if (!userId || item.is_read) return;

    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("recipient_id", userId);

    if (updateError) {
      setError("Could not update notification.");
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === item.id
          ? { ...notification, is_read: true }
          : notification
      )
    );
  }

  async function markAllAsRead() {
    if (!userId) return;

    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("recipient_id", userId)
      .eq("is_read", false);

    if (updateError) {
      setError("Could not update notifications.");
      return;
    }

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        is_read: true,
      }))
    );
  }

  async function openNotification(item) {
    await markAsRead(item);

    if (
      item.action_url &&
      item.action_url.startsWith("/") &&
      !item.action_url.startsWith("//")
    ) {
      window.location.assign(item.action_url);
    }
  }

  return (
  <div
  style={{
    position: "relative",
    width: "auto",
    flexShrink: 0,
    alignSelf: "flex-start",
  }}
>
           <button
        type="button"
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          width: 46,
          height: 46,
          minWidth: 46,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          border: open
            ? "1px solid #a6cbbb"
            : "1px solid #dce8e0",
          borderRadius: 14,
          background: open ? "#eaf4ed" : "#ffffff",
          color: "#245c4a",
          boxShadow: open
            ? "0 3px 12px rgba(36,92,74,0.12)"
            : "0 2px 8px rgba(30,59,50,0.05)",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        <svg
          width="23"
          height="23"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              minWidth: 20,
              height: 20,
              padding: "0 5px",
              borderRadius: 20,
              border: "2px solid #fff",
              background: "#b06f45",
              color: "#fff",
              fontSize: 10,
              lineHeight: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              boxSizing: "border-box",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

{open && typeof document !== "undefined" && document.getElementById("notifications-panel") && createPortal(
   <div             
  style={{
            position: "relative",
            width: "100%",
            maxWidth: 420,
            boxSizing: "border-box",
            marginLeft: "auto",
            maxHeight: 430,
            overflowY: "auto",
            background: "#ffffff",
            border: "1px solid #e2ebe5",
            borderRadius: 20,
            boxShadow: "0 12px 32px rgba(30,59,50,0.08)",
            padding: 20,
            animation: "none",
          }}
        >
          
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              paddingBottom: 16,
              marginBottom: 16,
              borderBottom: "1px solid #edf1ee",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <strong
                style={{
                  color: "#1e3b32",
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                Notifications
              </strong>

              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#eaf4ed",
                    color: "#245c4a",
                    borderRadius: 20,
                    padding: "4px 9px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {unreadCount} New
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              style={{
                border: "none",
                background: "transparent",
                color: "#245c4a",
                fontSize: 12,
                fontWeight: 600,
                cursor: unreadCount > 0 ? "pointer" : "default",
                opacity: unreadCount > 0 ? 1 : 0.45,
              }}
            >
              Mark all as read
            </button>
          </div>

          {error && (
            <p style={{ color: "#a8432f", fontSize: 12 }}>
              {error}
            </p>
          )}

          {loading ? (
            <p>Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <div
              style={{
                padding: "25px 10px",
                textAlign: "center",
                color: "#777",
              }}
            >
              <div style={{ fontSize: 30 }}>🔔</div>
              <p>No notifications yet.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openNotification(item)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 13,
                  marginBottom: 8,
                  borderRadius: 10,
                  border: "1px solid #edf0ec",
                  background: item.is_read
                    ? "#fff"
                    : "#f0f6f1",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <strong
                    style={{
                      fontSize: 13,
                      color: "#1e3b32",
                    }}
                  >
                    {item.title}
                  </strong>

                  {!item.is_read && (
                    <span style={{ color: "#b06f45" }}>
                      ●
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: 12,
                    color: "#666",
                    margin: "6px 0",
                  }}
                >
                  {item.message}
                </p>

                <small style={{ color: "#999" }}>
                  {new Date(
                    item.created_at
                  ).toLocaleString()}
                </small>
              </button>
            ))
          )}
                </div>,
        document.getElementById("notifications-panel")
      )}
    </div>
  );
}
