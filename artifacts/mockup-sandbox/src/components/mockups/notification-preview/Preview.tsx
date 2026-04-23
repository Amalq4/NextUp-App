import { Film, Tv, Bell } from "lucide-react";

/** iPhone-style notification banner component */
function NotifBanner({
  icon: Icon,
  appName,
  time,
  title,
  body,
  accent = "#C9A24D",
}: {
  icon: React.ElementType;
  appName: string;
  time: string;
  title: string;
  body: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(30, 30, 30, 0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderRadius: 20,
        padding: "12px 14px",
        marginBottom: 10,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      {/* App icon badge */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          background: "#1C1C1C",
          border: `1px solid ${accent}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Icon size={18} color={accent} />
      </div>

      {/* Text content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "rgba(232,220,194,0.55)",
              letterSpacing: 0.2,
              textTransform: "uppercase",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {appName}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "rgba(232,220,194,0.35)",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {time}
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "#E8DCC2",
            lineHeight: 1.3,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: 0,
            marginTop: 2,
            fontSize: 12,
            color: "rgba(232,220,194,0.65)",
            lineHeight: 1.4,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

/** Label with description */
function ScenarioLabel({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={{ marginBottom: 8, paddingLeft: 2 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: "#C9A24D",
          letterSpacing: 1.2,
          textTransform: "uppercase",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "rgba(232,220,194,0.4)",
          marginLeft: 8,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {desc}
      </span>
    </div>
  );
}

export function Preview() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111111",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Bell size={16} color="#C9A24D" />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#C9A24D",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Notification Preview
          </span>
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: "#E8DCC2",
            letterSpacing: -0.3,
          }}
        >
          What you'll see on your phone
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 13,
            color: "rgba(232,220,194,0.5)",
          }}
        >
          Notifications appear as banners at the top of your screen
        </p>
      </div>

      {/* Phone frame */}
      <div
        style={{
          width: 340,
          background: "#0A0A0A",
          borderRadius: 44,
          border: "2px solid rgba(255,255,255,0.08)",
          boxShadow:
            "0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Notch / Dynamic Island */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 14,
            paddingBottom: 8,
          }}
        >
          <div
            style={{
              width: 110,
              height: 30,
              background: "#000",
              borderRadius: 20,
            }}
          />
        </div>

        {/* Lock screen background */}
        <div
          style={{
            padding: "8px 16px 24px",
            background:
              "linear-gradient(180deg, #1a1010 0%, #0D0D1A 50%, #0A0A0A 100%)",
            minHeight: 520,
          }}
        >
          {/* Lock screen time */}
          <div style={{ textAlign: "center", marginBottom: 24, paddingTop: 4 }}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 100,
                color: "rgba(232,220,194,0.9)",
                lineHeight: 1,
                letterSpacing: -2,
              }}
            >
              7:00
            </div>
            <div
              style={{
                fontSize: 14,
                color: "rgba(232,220,194,0.5)",
                marginTop: 4,
              }}
            >
              Wednesday, April 23
            </div>
          </div>

          {/* === Scenario 1: Daily reminder — generic === */}
          <ScenarioLabel label="Scenario 1" desc="Nothing in progress" />
          <NotifBanner
            icon={Bell}
            appName="NextUp"
            time="7:00 PM"
            title="What's on tonight? 🎬"
            body="Open NextUp and pick something to watch."
          />

          {/* === Scenario 2: Daily reminder — continue watching === */}
          <ScenarioLabel label="Scenario 2" desc="Show in progress" />
          <NotifBanner
            icon={Tv}
            appName="NextUp"
            time="7:00 PM"
            title="Continue watching Breaking Bad"
            body="You're on Season 3, Episode 7. Pick up where you left off."
          />

          {/* === Scenario 3: New item added to Want list === */}
          <ScenarioLabel label="Scenario 3" desc="Added to Want list" />
          <NotifBanner
            icon={Film}
            appName="NextUp"
            time="now"
            title="Don't forget about Dune: Part Two"
            body="It's on your list — tonight's a great time to start watching!"
          />
        </div>

        {/* Home indicator */}
        <div
          style={{
            background: "#0A0A0A",
            display: "flex",
            justifyContent: "center",
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          <div
            style={{
              width: 120,
              height: 4,
              background: "rgba(255,255,255,0.2)",
              borderRadius: 2,
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          marginTop: 32,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 340,
          width: "100%",
        }}
      >
        {[
          {
            dot: "#C9A24D",
            label: "Scenario 1",
            desc: "Daily reminder — generic when Want list is empty",
          },
          {
            dot: "#7A9AC9",
            label: "Scenario 2",
            desc: "Daily reminder — adapts to what you're currently watching",
          },
          {
            dot: "#9AC97A",
            label: "Scenario 3",
            desc: "New item nudge — fires 20 hours after adding to Want list",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{ display: "flex", alignItems: "flex-start", gap: 10 }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: item.dot,
                marginTop: 4,
                flexShrink: 0,
              }}
            />
            <div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#E8DCC2",
                  marginRight: 6,
                }}
              >
                {item.label}
              </span>
              <span style={{ fontSize: 12, color: "rgba(232,220,194,0.45)" }}>
                {item.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
