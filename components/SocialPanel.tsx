"use client";

import { useState } from "react";

export default function SocialPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* TRIGGER */}
      <div className="top-left">
        <button className="social-btn" onClick={() => setOpen(true)}>
          👥 Social
        </button>
      </div>

      {/* OVERLAY */}
      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      {/* DRAWER */}
      <div className={`drawer ${open ? "open" : ""}`}>
        <div className="drawer-header">
          <div>Social</div>
          <button onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="drawer-content">
          <div className="friend">
            Alex <span>🔥 4</span>
            <button className="nudge">Nudge</button>
          </div>

          <div className="friend">
            Sam <span>🔥 7</span>
            <button className="nudge">Nudge</button>
          </div>

          <div className="friend">
            Jordan <span>🔥 2</span>
            <button className="nudge">Nudge</button>
          </div>
        </div>
      </div>
    </>
  );
}