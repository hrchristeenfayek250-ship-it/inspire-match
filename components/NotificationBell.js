
"use client";

import { useEffect, useState } from "react";
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
          padding: "10px 14px",
          border: "1px solid #d7dfd8",
          borderRadius: 12,
          background: "#fff",
          cursor: "pointer",
          fontSize: 23,
        }}
      >
        🔔

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -7,
              right: -7,
              minWidth: 21,
              height: 21,
              padding: "0 4px",
              borderRadius: 20,
              background: "#b06f45",
              color: "#fff",
              fontSize: 11,
              display: "grid",
              placeItems: "center",
              fontWeight: 700,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
position: "relative",
            marginTop: 12,
            width: "min(360px, 90vw)",
            maxHeight: 430,
            overflowY: "auto",
            background: "#fff",
            border: "1px solid #e3e7e2",
            borderRadius: 16,
            boxShadow: "0 12px 35px rgba(0,0,0,0.12)",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <strong style={{ color: "#1e3b32" }}>
              Notifications
            </strong>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              style={{
                border: 0,
                background: "transparent",
                color: "#b06f45",
                cursor: "pointer",
                fontSize: 12,
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
        </div>
      )}
    </div>
  );
}
