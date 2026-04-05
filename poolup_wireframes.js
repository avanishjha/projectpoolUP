"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = App;
const C = {
  black: "#000000",
  navy: "#14213D",
  amber: "#FCA311",
  silver: "#E5E5E5",
  white: "#FFFFFF",
  navyLight: "#1B2D4F",
  amberSoft: "rgba(252,163,17,0.10)",
  amberMuted: "rgba(252,163,17,0.6)",
  silverDark: "#CCCCCC",
  bg: "#F7F7F7",
  text1: "#14213D",
  text2: "#6B7280",
  text3: "#9CA3AF",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  success: "#059669",
  successBg: "#D1FAE5",
  whatsapp: "#25D366"
};
const F = "Helvetica, 'Helvetica Neue', sans-serif";
const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999
};
function Box({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: R.md,
      padding: "10px 14px",
      marginBottom: 8,
      border: `1px solid ${C.silver}`,
      ...style
    }
  }, children);
}
function Btn({
  children,
  primary,
  green,
  style,
  small
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: green ? C.whatsapp : primary ? C.amber : C.silver,
      color: green || primary ? C.navy : C.text1,
      borderRadius: R.md,
      padding: small ? "8px 16px" : "13px 0",
      textAlign: "center",
      fontWeight: 700,
      fontSize: small ? 12 : 13,
      fontFamily: F,
      marginBottom: 8,
      cursor: "pointer",
      letterSpacing: 0.2,
      ...style
    }
  }, children);
}
function Inp({
  p,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      border: `1.5px solid ${C.silver}`,
      borderRadius: R.md,
      padding: "11px 14px",
      marginBottom: 8,
      color: C.text3,
      fontSize: 11,
      fontFamily: F,
      ...style
    }
  }, p);
}
function Lbl({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text2,
      marginBottom: 3,
      fontWeight: 700,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      fontFamily: F
    }
  }, children);
}
function Hdr({
  l,
  t,
  r
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 12,
      borderBottom: `1px solid ${C.silver}`,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.text2,
      minWidth: 40,
      fontFamily: F
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 800,
      fontSize: 15,
      color: C.navy,
      fontFamily: F
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.text2,
      minWidth: 40,
      textAlign: "right",
      fontFamily: F
    }
  }, r));
}
function Tab({
  a = 0
}) {
  const items = [{
    i: "🏠",
    l: "Home"
  }, {
    i: "🧭",
    l: "Explore"
  }, {
    i: "💰",
    l: "Wallet"
  }, {
    i: "👤",
    l: "Profile"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      borderTop: `1px solid ${C.silver}`,
      padding: "8px 0 6px",
      background: C.white
    }
  }, items.map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      textAlign: "center",
      fontSize: 9,
      color: i === a ? C.navy : C.text3,
      fontWeight: i === a ? 800 : 500,
      fontFamily: F
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      marginBottom: 1
    }
  }, t.i), t.l, i === a && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 4,
      height: 4,
      borderRadius: 4,
      background: C.amber,
      margin: "2px auto 0"
    }
  }))));
}
function Av({
  s = 32,
  c = C.silver,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: s,
      height: s,
      borderRadius: s,
      background: c,
      flexShrink: 0,
      ...style
    }
  });
}
function Ch({
  children,
  active
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "inline-block",
      padding: "6px 12px",
      borderRadius: R.pill,
      fontSize: 11,
      fontWeight: 600,
      background: active ? C.navy : C.bg,
      color: active ? C.amber : C.text1,
      fontFamily: F
    }
  }, children);
}
function Wrap({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 20,
      fontFamily: F,
      ...style
    }
  }, children);
}
function Shell({
  children,
  tab = 0,
  noPad
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      fontFamily: F
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: noPad ? 0 : 16
    }
  }, children), /*#__PURE__*/React.createElement(Tab, {
    a: tab
  }));
}
function Row2({
  l,
  r
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 0",
      borderBottom: `1px solid ${C.silver}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.text2,
      fontFamily: F
    }
  }, l), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: C.navy,
      fontFamily: F
    }
  }, r));
}

// ─── SCREENS ───
function SplashScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      background: `linear-gradient(170deg,${C.navy},${C.black})`,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 48,
      fontWeight: 900,
      color: C.white,
      fontFamily: F,
      letterSpacing: -2
    }
  }, "PoolUp"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.amber,
      fontWeight: 700,
      marginTop: 8,
      letterSpacing: 2.5,
      textTransform: "uppercase"
    }
  }, "Accountability Through Consequence"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.amberMuted,
      marginTop: 4,
      fontStyle: "italic"
    }
  }, "Paisa Lagao, Discipline Dikhao."));
}
function LoginScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 900,
      color: C.navy,
      marginBottom: 2
    }
  }, "Welcome"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.text2,
      marginBottom: 32
    }
  }, "Enter your phone number to get started"), /*#__PURE__*/React.createElement(Lbl, null, "MOBILE NUMBER"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.bg,
      borderRadius: R.md,
      padding: "11px 12px",
      fontSize: 13,
      fontWeight: 800,
      color: C.navy,
      fontFamily: F,
      border: `1.5px solid ${C.silver}`
    }
  }, "+91"), /*#__PURE__*/React.createElement(Inp, {
    p: "98765 43210",
    style: {
      flex: 1,
      marginBottom: 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 16
    }
  }), /*#__PURE__*/React.createElement(Btn, {
    primary: true
  }, "Send OTP \u2192"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      margin: "20px 0 12px",
      fontSize: 11,
      color: C.text3
    }
  }, "or continue with"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    style: {
      flex: 1
    }
  }, "Google"), /*#__PURE__*/React.createElement(Btn, {
    style: {
      flex: 1
    }
  }, " Apple")));
}
function OTPScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text2,
      marginBottom: 16
    }
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 900,
      color: C.navy,
      marginBottom: 2
    }
  }, "Verify OTP"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.text2,
      marginBottom: 24
    }
  }, "Sent to +91 98765 43210"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "center",
      marginBottom: 24
    }
  }, [4, 2, 8, 6, 1, ""].map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 38,
      height: 46,
      border: `2px solid ${d !== "" ? C.navy : C.silver}`,
      borderRadius: R.md,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
      fontWeight: 800,
      color: C.navy,
      fontFamily: F,
      background: d !== "" ? C.amberSoft : C.white
    }
  }, d))), /*#__PURE__*/React.createElement(Btn, {
    primary: true
  }, "Verify & Continue"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 16,
      fontSize: 12,
      color: C.text3
    }
  }, "Resend in ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.amber,
      fontWeight: 700
    }
  }, "0:28")));
}
function ProfileSetupScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 900,
      color: C.navy,
      marginBottom: 2
    }
  }, "Set Up Profile"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.text2,
      marginBottom: 20
    }
  }, "Let your friends know who you are"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 68,
      height: 68,
      borderRadius: 68,
      background: C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 22,
      color: C.text3,
      border: `2px dashed ${C.silverDark}`
    }
  }, "\uD83D\uDCF7")), /*#__PURE__*/React.createElement(Lbl, null, "FIRST NAME"), /*#__PURE__*/React.createElement(Inp, {
    p: "Avanish"
  }), /*#__PURE__*/React.createElement(Lbl, null, "LAST NAME"), /*#__PURE__*/React.createElement(Inp, {
    p: "Sharma"
  }), /*#__PURE__*/React.createElement(Lbl, null, "USERNAME"), /*#__PURE__*/React.createElement(Inp, {
    p: "@avanish_fit"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.success,
      marginTop: -4,
      marginBottom: 12
    }
  }, "\u2713 Available"), /*#__PURE__*/React.createElement(Lbl, null, "REFERRAL CODE (OPTIONAL)"), /*#__PURE__*/React.createElement(Inp, {
    p: "e.g. POOL3A7K"
  }), /*#__PURE__*/React.createElement(Btn, {
    primary: true,
    style: {
      marginTop: 8
    }
  }, "Continue \u2192"));
}
function GatewayScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 900,
      color: C.navy,
      marginBottom: 2
    }
  }, "Ready to start? \uD83D\uDD25"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.text2,
      marginBottom: 32,
      textAlign: "center"
    }
  }, "Create a challenge or join one"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.navy,
      borderRadius: R.lg,
      padding: 20,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: C.amber,
      fontFamily: F
    }
  }, "Create a Pool"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.5)",
      marginTop: 4,
      fontFamily: F
    }
  }, "Set the rules. Invite your squad."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      marginTop: 12,
      color: C.amber
    }
  }, "\u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.amber,
      borderRadius: R.lg,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: C.navy,
      fontFamily: F
    }
  }, "Join via Code"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(20,33,61,0.6)",
      marginTop: 4,
      fontFamily: F
    }
  }, "Got an invite? Enter the code."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      marginTop: 12,
      color: C.navy
    }
  }, "\u2192"))));
}
function CreateStep1() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Create Pool",
    r: "1/4"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: C.navy,
      marginBottom: 16
    }
  }, "Name & Challenge"), /*#__PURE__*/React.createElement(Lbl, null, "POOL NAME"), /*#__PURE__*/React.createElement(Inp, {
    p: "75 Hard Boyz \uD83D\uDCAA"
  }), /*#__PURE__*/React.createElement(Lbl, null, "CHALLENGE TYPE"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 16
    }
  }, ["75 Hard", "Gym Streak", "5K Run", "Surya Namaskar", "No Sugar", "Custom"].map((t, i) => /*#__PURE__*/React.createElement(Ch, {
    key: i,
    active: i === 0
  }, t))), /*#__PURE__*/React.createElement(Lbl, null, "DESCRIPTION"), /*#__PURE__*/React.createElement(Inp, {
    p: "No excuses. 75 days of discipline."
  }), /*#__PURE__*/React.createElement(Lbl, null, "POOL EMOJI"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginBottom: 16
    }
  }, ["🔥", "💪", "🏃", "🧘", "🥗"].map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 36,
      height: 36,
      borderRadius: R.sm,
      background: i === 0 ? C.amberSoft : C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 17,
      border: i === 0 ? `2px solid ${C.amber}` : `1px solid ${C.silver}`
    }
  }, e))), /*#__PURE__*/React.createElement(Btn, {
    primary: true
  }, "Next \u2192"));
}
function CreateStep2() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Create Pool",
    r: "2/4"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: C.navy,
      marginBottom: 16
    }
  }, "Duration & Schedule"), /*#__PURE__*/React.createElement(Lbl, null, "DURATION"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 16
    }
  }, ["21 days", "30 days", "60 days", "75 days", "Custom"].map((d, i) => /*#__PURE__*/React.createElement(Ch, {
    key: i,
    active: i === 1
  }, d))), /*#__PURE__*/React.createElement(Lbl, null, "START DATE"), /*#__PURE__*/React.createElement(Inp, {
    p: "Tomorrow, 5 Apr 2026"
  }), /*#__PURE__*/React.createElement(Lbl, null, "DEADLINE"), /*#__PURE__*/React.createElement(Inp, {
    p: "11:30 PM IST"
  }), /*#__PURE__*/React.createElement(Lbl, null, "CHECK-IN WINDOW"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Ch, {
    active: true
  }, "Full Day"), /*#__PURE__*/React.createElement(Ch, null, "Morning Only"), /*#__PURE__*/React.createElement(Ch, null, "Custom")), /*#__PURE__*/React.createElement(Lbl, null, "CHECK-IN TYPE"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 16
    }
  }, ["📸 Photo", "🎥 Video", "👟 Steps", "🏃 Strava"].map((t, i) => /*#__PURE__*/React.createElement(Ch, {
    key: i,
    active: i === 0
  }, t))), /*#__PURE__*/React.createElement(Btn, {
    primary: true
  }, "Next \u2192"));
}
function CreateStep3() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Create Pool",
    r: "3/4"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: C.navy,
      marginBottom: 16
    }
  }, "Stakes \uD83D\uDCB0"), /*#__PURE__*/React.createElement(Lbl, null, "BUY-IN"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.navy,
      color: C.amber,
      borderRadius: R.md,
      padding: "8px 14px",
      fontWeight: 900,
      fontSize: 18,
      fontFamily: F
    }
  }, "\u20B9499"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 6,
      background: C.silver,
      borderRadius: 3,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: 0,
      height: 6,
      width: "30%",
      background: C.amber,
      borderRadius: 3
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 3
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: C.text3
    }
  }, "\u20B999"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: C.text3
    }
  }, "\u20B95,000")))), /*#__PURE__*/React.createElement(Lbl, null, "FINE PER MISS"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 16
    }
  }, ["₹25", "₹49", "₹99", "₹199", "₹499"].map((f, i) => /*#__PURE__*/React.createElement(Ch, {
    key: i,
    active: i === 2
  }, f))), /*#__PURE__*/React.createElement(Lbl, null, "ELIMINATION"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Ch, {
    active: true
  }, "Off"), /*#__PURE__*/React.createElement(Ch, null, "3 misses"), /*#__PURE__*/React.createElement(Ch, null, "1 miss")), /*#__PURE__*/React.createElement(Lbl, null, "PAYOUT RULE"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(Ch, {
    active: true
  }, "Winner Takes All"), /*#__PURE__*/React.createElement(Ch, null, "Top 3"), /*#__PURE__*/React.createElement(Ch, null, "Proportional")), /*#__PURE__*/React.createElement(Lbl, null, "GRACE TOKENS"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 16
    }
  }, ["0", "1", "2", "3"].map((g, i) => /*#__PURE__*/React.createElement(Ch, {
    key: i,
    active: i === 1
  }, g))), /*#__PURE__*/React.createElement(Btn, {
    primary: true
  }, "Review \u2192"));
}
function CreateStep4() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Create Pool",
    r: "4/4"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: C.navy,
      marginBottom: 12
    }
  }, "Review & Create"), /*#__PURE__*/React.createElement(Box, {
    style: {
      background: C.amberSoft,
      borderColor: C.amber
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: C.navy
    }
  }, "\uD83D\uDD25 75 Hard Boyz"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.text2,
      marginTop: 2
    }
  }, "75 Hard \xB7 30 days \xB7 Photo")), [["Buy-in", "₹499"], ["Fine/miss", "₹99"], ["Elimination", "Off"], ["Payout", "Winner Takes All"], ["Grace Tokens", "1"], ["Start", "5 Apr 2026"], ["Deadline", "11:30 PM IST"], ["Platform Fee", "5%"]].map(([k, v], i) => /*#__PURE__*/React.createElement(Row2, {
    key: i,
    l: k,
    r: v
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 12
    }
  }), /*#__PURE__*/React.createElement(Btn, {
    primary: true
  }, "Create Pool \uD83D\uDE80"));
}
function ShareInviteScreen() {
  return /*#__PURE__*/React.createElement(Wrap, {
    style: {
      textAlign: "center",
      paddingTop: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40
    }
  }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 900,
      color: C.navy,
      marginTop: 8
    }
  }, "Pool Created!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.text2,
      marginTop: 4,
      marginBottom: 24
    }
  }, "Share this code with your squad"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.bg,
      borderRadius: R.lg,
      padding: 20,
      marginBottom: 20,
      border: `2px dashed ${C.silverDark}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 30,
      fontWeight: 900,
      letterSpacing: 8,
      color: C.navy,
      fontFamily: F
    }
  }, "X7K9P2"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text3,
      marginTop: 4
    }
  }, "Tap to copy")), /*#__PURE__*/React.createElement(Btn, {
    green: true
  }, "\uD83D\uDCF1 Share on WhatsApp"), /*#__PURE__*/React.createElement(Btn, null, "\uD83D\uDD17 Copy Invite Link"), /*#__PURE__*/React.createElement(Btn, null, "\uD83D\uDCF7 Show QR Code"));
}
function JoinCodeScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Join Pool",
    r: ""
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: C.navy,
      marginBottom: 2
    }
  }, "Enter Invite Code"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.text2,
      marginBottom: 24
    }
  }, "Got a code from your friend?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "center",
      marginBottom: 24
    }
  }, ["X", "7", "K", "9", "P", ""].map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 38,
      height: 46,
      border: `2px solid ${d ? C.navy : C.silver}`,
      borderRadius: R.md,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 18,
      fontWeight: 800,
      color: C.navy,
      fontFamily: F,
      background: d ? C.amberSoft : C.white
    }
  }, d))), /*#__PURE__*/React.createElement(Btn, {
    primary: true
  }, "Find Pool \u2192"), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      margin: "20px 0 12px",
      fontSize: 11,
      color: C.text3
    }
  }, "or"), /*#__PURE__*/React.createElement(Btn, null, "\uD83D\uDCF7 Scan QR Code"));
}
function JoinConsentScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Join Pool",
    r: ""
  }), /*#__PURE__*/React.createElement(Box, {
    style: {
      background: C.amberSoft,
      borderColor: C.amber
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: C.navy
    }
  }, "\uD83D\uDD25 75 Hard Boyz"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.text2
    }
  }, "30 days \xB7 \u20B9499 buy-in \xB7 \u20B999/miss \xB7 6/20")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: C.navy,
      marginTop: 12,
      marginBottom: 8
    }
  }, "Pool Rules"), ["Daily photo check-in before 11:30 PM IST", "Miss = ₹99 auto-debit from UPI", "1 grace token (one free skip)", "Winner takes all after 30 days"].map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      fontSize: 11,
      color: C.text1,
      padding: "3px 0 3px 14px",
      position: "relative",
      fontFamily: F
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      color: C.amber
    }
  }, "\u2022"), r)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FEF9E7",
      borderRadius: R.md,
      padding: 12,
      marginTop: 12,
      fontSize: 10,
      color: "#78350F",
      lineHeight: 1.6,
      border: "1px solid #FDE68A",
      fontFamily: F
    }
  }, "\u26A0\uFE0F I authorise PoolUp to debit up to ", /*#__PURE__*/React.createElement("b", null, "\u20B999"), " per missed day for 30 days."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      margin: "12px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      height: 20,
      borderRadius: 4,
      background: C.navy,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: C.amber,
      fontSize: 12,
      flexShrink: 0
    }
  }, "\u2713"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.text1,
      fontFamily: F
    }
  }, "I agree to the rules and auto-debit")), /*#__PURE__*/React.createElement(Btn, {
    primary: true
  }, "Set Up UPI Autopay \u2192"));
}
function JoinPayScreen() {
  return /*#__PURE__*/React.createElement(Wrap, {
    style: {
      textAlign: "center",
      paddingTop: 36
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800,
      color: C.navy,
      marginBottom: 16
    }
  }, "Pay Buy-in"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 36,
      fontWeight: 900,
      color: C.navy,
      fontFamily: F
    }
  }, "\u20B9499"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.text2,
      marginTop: 2,
      marginBottom: 24
    }
  }, "75 Hard Boyz \xB7 30 days"), /*#__PURE__*/React.createElement(Box, {
    style: {
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 12,
      borderColor: C.navy
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: R.sm,
      background: C.navy,
      color: C.amber,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 800,
      flexShrink: 0
    }
  }, "UPI"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: F
    }
  }, "UPI"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text3
    }
  }, "GPay, PhonePe, Paytm")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 16,
      border: `2px solid ${C.navy}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: 8,
      background: C.navy
    }
  }))), /*#__PURE__*/React.createElement(Box, {
    style: {
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: R.sm,
      background: C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14,
      flexShrink: 0
    }
  }, "\uD83D\uDCB3"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: F
    }
  }, "Card"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text3
    }
  }, "Visa, Mastercard, RuPay")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 16,
      border: `2px solid ${C.silver}`,
      flexShrink: 0
    }
  })), /*#__PURE__*/React.createElement(Btn, {
    primary: true,
    style: {
      marginTop: 8
    }
  }, "Pay \u20B9499 \u2192"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.text3,
      marginTop: 8
    }
  }, "Secured by Razorpay \uD83D\uDD12"));
}
function HomeScreen() {
  return /*#__PURE__*/React.createElement(Shell, {
    tab: 0
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.text2,
      fontFamily: F
    }
  }, "Good morning"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 900,
      color: C.navy,
      fontFamily: F
    }
  }, "Avanish \uD83D\uDC4B")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 32,
      background: C.amberSoft,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 14
    }
  }, "\uD83D\uDD14"), /*#__PURE__*/React.createElement(Av, {
    s: 32,
    c: "#C7D2FE"
  }))), /*#__PURE__*/React.createElement(Box, {
    style: {
      background: C.amberSoft,
      borderColor: C.amber
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.amber,
      fontWeight: 700
    }
  }, "\u26A1 1 PENDING CHECK-IN"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.text1,
      marginTop: 2,
      fontFamily: F
    }
  }, "75 Hard Boyz \xB7 Deadline 11:30 PM")), /*#__PURE__*/React.createElement(Btn, {
    primary: true,
    style: {
      fontSize: 15,
      padding: "14px 0"
    }
  }, "\uD83D\uDCF8 Check In"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: C.navy,
      marginTop: 16,
      marginBottom: 8
    }
  }, "Active Pools"), [{
    n: "75 Hard Boyz",
    e: "🔥",
    p: "₹5,192",
    s: 14,
    d: 16
  }, {
    n: "Morning 5K Club",
    e: "🏃",
    p: "₹2,400",
    s: 7,
    d: 23
  }, {
    n: "No Maida January",
    e: "🥗",
    p: "₹1,800",
    s: 21,
    d: 9
  }].map((pool, i) => /*#__PURE__*/React.createElement(Box, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: C.navy,
      fontFamily: F
    }
  }, pool.e, " ", pool.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text2,
      marginTop: 2
    }
  }, "Pot: ", pool.p, " \xB7 ", pool.d, " days left")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      flexShrink: 0,
      marginLeft: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 900,
      color: C.amber
    }
  }, "\uD83D\uDD25", pool.s), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.text3
    }
  }, "streak"))))));
}
function PoolDetailScreen() {
  return /*#__PURE__*/React.createElement(Shell, {
    tab: 0,
    noPad: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.navy,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,0.5)"
    }
  }, "\u2190 Back"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,0.5)"
    }
  }, "\u2699\uFE0F")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 900,
      color: C.white,
      fontFamily: F
    }
  }, "\uD83D\uDD25 75 Hard Boyz"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 16
    }
  }, [["Pot", "₹5,192"], ["Days", "16"], ["Members", "8/20"], ["Streak", "🔥14"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: C.white,
      fontFamily: F
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "rgba(255,255,255,0.5)"
    }
  }, k))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex"
    }
  }, ["Feed", "Leaderboard", "Stats"].map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      textAlign: "center",
      padding: "10px 0",
      fontSize: 12,
      fontWeight: i === 0 ? 800 : 500,
      color: i === 0 ? C.navy : C.text3,
      borderBottom: i === 0 ? `2px solid ${C.amber}` : `1px solid ${C.silver}`,
      fontFamily: F
    }
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.text2,
      marginBottom: 8
    }
  }, "Today \xB7 6/8 checked in"), [{
    n: "Priya",
    t: "7:02 AM",
    c: "Morning run! 🏃‍♀️",
    s: 14
  }, {
    n: "Rahul",
    t: "8:15 AM",
    c: "Gym session 💪",
    s: 12
  }].map((ck, i) => /*#__PURE__*/React.createElement(Box, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Av, {
    s: 26,
    c: ["#C7D2FE", "#FED7AA"][i]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: F
    }
  }, ck.n), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: C.amber
    }
  }, "\uD83D\uDD25", ck.s), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.text3
    }
  }, ck.t))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.bg,
      borderRadius: R.sm,
      height: 72,
      marginBottom: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: C.text3,
      fontSize: 11
    }
  }, "[Check-in Photo]"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.text1,
      fontFamily: F
    }
  }, ck.c), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      marginTop: 6
    }
  }, "\uD83D\uDD2512 \uD83D\uDCAA5 \uD83D\uDC513")))));
}
function LeaderboardScreen() {
  return /*#__PURE__*/React.createElement(Shell, {
    tab: 0
  }, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Leaderboard",
    r: ""
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-end",
      gap: 16,
      marginBottom: 20
    }
  }, [{
    n: "Rahul",
    s: 12,
    m: "🥈"
  }, {
    n: "Priya",
    s: 14,
    m: "🥇"
  }, {
    n: "You",
    s: 10,
    m: "🥉"
  }].map((u, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      textAlign: "center",
      marginTop: i === 1 ? 0 : 16
    }
  }, /*#__PURE__*/React.createElement(Av, {
    s: i === 1 ? 44 : 36,
    c: ["#FED7AA", C.amber, "#C7D2FE"][i],
    style: {
      margin: "0 auto 4px",
      border: i === 1 ? `3px solid ${C.navy}` : "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18
    }
  }, u.m), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      fontFamily: F
    }
  }, u.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.amber,
      fontWeight: 700
    }
  }, "\uD83D\uDD25", u.s)))), [{
    r: 4,
    n: "Amit",
    s: 9,
    f: "₹198",
    p: "87%"
  }, {
    r: 5,
    n: "Sneha",
    s: 8,
    f: "₹297",
    p: "80%"
  }, {
    r: 6,
    n: "Dev",
    s: 6,
    f: "₹396",
    p: "73%"
  }, {
    r: 7,
    n: "Meera",
    s: 4,
    f: "₹495",
    p: "67%"
  }, {
    r: 8,
    n: "Vikram",
    s: 0,
    f: "₹594",
    p: "53%",
    out: true
  }].map((u, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 0",
      borderBottom: `1px solid ${C.silver}`,
      opacity: u.out ? 0.4 : 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 20,
      fontSize: 12,
      fontWeight: 700,
      color: C.text3,
      textAlign: "center",
      flexShrink: 0
    }
  }, u.r), /*#__PURE__*/React.createElement(Av, {
    s: 28
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: F
    }
  }, u.n, u.out ? " 💀" : ""), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text2
    }
  }, "Fines: ", u.f)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: C.amber
    }
  }, "\uD83D\uDD25", u.s), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.text3
    }
  }, u.p)))));
}
function CameraScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.black,
      height: "100%",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.white,
      fontSize: 13,
      fontFamily: F
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.12)",
      borderRadius: R.pill,
      padding: "4px 14px",
      fontSize: 11,
      color: C.white,
      fontFamily: F
    }
  }, "\uD83D\uDD25 75 Hard Boyz"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.white,
      fontSize: 13
    }
  }, "\uD83D\uDD04")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 150,
      height: 150,
      borderRadius: 150,
      border: `2px solid rgba(255,255,255,0.15)`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "rgba(255,255,255,0.25)",
      fontSize: 11,
      fontFamily: F
    }
  }, "[Camera]"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: 32,
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.white,
      fontSize: 11,
      fontFamily: F
    }
  }, "Front"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 58,
      height: 58,
      borderRadius: 58,
      background: C.white,
      border: `4px solid ${C.amber}`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36
    }
  })));
}
function LivenessScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.black,
      height: "100%",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.white,
      fontSize: 13
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.white,
      fontSize: 13
    }
  }, "\uD83D\uDD04")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.amber,
      borderRadius: R.lg,
      padding: "16px 24px",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.navy,
      fontWeight: 700,
      letterSpacing: 1,
      textTransform: "uppercase"
    }
  }, "LIVENESS CHECK"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 900,
      color: C.navy,
      marginTop: 8,
      fontFamily: F
    }
  }, "\u270C\uFE0F Show 2 Fingers"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(20,33,61,0.6)",
      marginTop: 4
    }
  }, "Hold steady")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 130,
      height: 130,
      borderRadius: 130,
      border: "2px solid rgba(255,255,255,0.15)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      paddingBottom: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 58,
      height: 58,
      borderRadius: 58,
      background: C.white,
      border: `4px solid ${C.amber}`
    }
  })));
}
function PreviewScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.black,
      height: "100%",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: C.white,
      fontSize: 12,
      background: "rgba(255,255,255,0.12)",
      borderRadius: R.pill,
      padding: "4px 14px",
      display: "inline-block",
      fontFamily: F
    }
  }, "\u21A9 Retake")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      margin: "0 16px",
      background: "#111",
      borderRadius: R.md,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "#444",
      fontSize: 12,
      fontFamily: F
    }
  }, "[Photo Preview]")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement(Inp, {
    p: "Add a caption... 'Morning run! \uD83C\uDFC3'",
    style: {
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "rgba(255,255,255,0.4)"
    }
  }), /*#__PURE__*/React.createElement(Btn, {
    primary: true
  }, "Submit Check-in \u2713")));
}
function CheckinSuccessScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      padding: 20,
      background: `linear-gradient(170deg,${C.black},${C.navy})`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 56
    }
  }, "\uD83D\uDD25"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 900,
      color: C.white,
      fontFamily: F,
      marginTop: 8
    }
  }, "Day 15!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.amber,
      fontWeight: 700,
      marginTop: 4
    }
  }, "Streak: 14 days \uD83D\uDD25\uD83D\uDD25"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,0.4)",
      marginTop: 8
    }
  }, "+10 XP \xB7 Level 7"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.07)",
      borderRadius: R.lg,
      padding: 16,
      marginTop: 24,
      width: "100%",
      textAlign: "center",
      border: "1px solid rgba(255,255,255,0.1)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,0.35)"
    }
  }, "YOU'RE #2 IN THE POOL"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.white,
      fontWeight: 700,
      marginTop: 4,
      fontFamily: F
    }
  }, "Tied with Priya at \uD83D\uDD2514!")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    green: true
  }, "\uD83D\uDCF1 Share on WhatsApp"), /*#__PURE__*/React.createElement(Btn, {
    style: {
      background: "rgba(255,255,255,0.08)",
      color: C.white
    }
  }, "View Pool Feed \u2192")));
}
function FeedScreen() {
  return /*#__PURE__*/React.createElement(Shell, {
    tab: 0,
    noPad: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.navy,
      padding: "12px 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: C.white,
      fontFamily: F
    }
  }, "\uD83D\uDD25 75 Hard Boyz"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,0.45)"
    }
  }, "Day 15 \xB7 8 members")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 900,
      color: C.amber
    }
  }, "\u20B95,192"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "rgba(255,255,255,0.35)"
    }
  }, "Pot"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.text2,
      marginBottom: 8
    }
  }, "Today \xB7 6/8 checked in"), [{
    n: "Priya",
    t: "7:02 AM",
    c: "Early bird 🐦",
    s: 14,
    rx: "🔥14 💪8"
  }, {
    n: "Rahul",
    t: "8:15 AM",
    c: "Gym done 💪",
    s: 12,
    rx: "🔥9 💪6"
  }, {
    n: "You",
    t: "9:30 AM",
    c: "Morning run!",
    s: 14,
    rx: "🔥11 👑3"
  }].map((ck, i) => /*#__PURE__*/React.createElement(Box, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Av, {
    s: 24,
    c: ["#C7D2FE", "#FED7AA", "#BBF7D0"][i]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: F
    }
  }, ck.n), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: C.amber
    }
  }, "\uD83D\uDD25", ck.s), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.text3
    }
  }, ck.t))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.bg,
      borderRadius: R.sm,
      height: 56,
      marginBottom: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: C.text3,
      fontSize: 10
    }
  }, "[Photo]"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.text1,
      fontFamily: F
    }
  }, ck.c), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      marginTop: 4
    }
  }, ck.rx)))));
}
function WallOfShameScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Feed Events",
    r: ""
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.dangerBg,
      border: `2px solid ${C.danger}`,
      borderRadius: R.lg,
      padding: 20,
      textAlign: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28
    }
  }, "\uD83D\uDEA8"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 900,
      color: C.danger,
      marginTop: 8,
      fontFamily: F
    }
  }, "Vikram Missed!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.danger,
      marginTop: 2
    }
  }, "\u20B999 added to the pot"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "#991B1B",
      marginTop: 8
    }
  }, "Streak: 0 \xB7 Fines: \u20B9594")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.successBg,
      border: `2px solid ${C.success}`,
      borderRadius: R.lg,
      padding: 20,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28
    }
  }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 900,
      color: "#065F46",
      marginTop: 8,
      fontFamily: F
    }
  }, "Priya hit 14 days!"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.success,
      marginTop: 2
    }
  }, "Iron Will \uD83D\uDEE1\uFE0F unlocked")));
}
function ReactionsScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "React",
    r: ""
  }), /*#__PURE__*/React.createElement(Box, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Av, {
    s: 26,
    c: "#C7D2FE"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: F
    }
  }, "Priya"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.text3
    }
  }, "7:02 AM"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.bg,
      borderRadius: R.sm,
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: C.text3,
      fontSize: 10
    }
  }, "[Photo]")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "16px 8px"
    }
  }, [{
    e: "🔥",
    l: "Fire",
    n: 14,
    a: true
  }, {
    e: "💪",
    l: "Flex",
    n: 8
  }, {
    e: "👑",
    l: "Crown",
    n: 5
  }, {
    e: "💀",
    l: "Skull",
    n: 0
  }, {
    e: "🙏",
    l: "Respect",
    n: 2
  }].map((r, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      width: 42,
      height: 42,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: R.md,
      background: r.a ? C.amberSoft : "transparent",
      border: r.a ? `2px solid ${C.amber}` : "2px solid transparent"
    }
  }, r.e), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.text3,
      marginTop: 2
    }
  }, r.l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      fontWeight: 700,
      color: C.navy
    }
  }, r.n)))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.text3,
      textAlign: "center"
    }
  }, "Double-tap for quick \uD83D\uDD25"));
}
function WalletScreen() {
  return /*#__PURE__*/React.createElement(Shell, {
    tab: 2
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 900,
      color: C.navy,
      marginBottom: 12,
      fontFamily: F
    }
  }, "Wallet \uD83D\uDCB0"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.navy,
      borderRadius: R.lg,
      padding: 20,
      color: C.white,
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,0.45)"
    }
  }, "LOCKED IN POOLS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 900,
      color: C.amber,
      marginTop: 4,
      fontFamily: F
    }
  }, "\u20B91,497"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 20,
      marginTop: 16
    }
  }, [["Won", "₹3,500", C.success], ["Fined", "₹594", C.danger], ["Net", "+₹2,906", C.success]].map(([k, v, cl], i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "rgba(255,255,255,0.35)"
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: cl,
      fontFamily: F
    }
  }, v))))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: C.navy,
      marginBottom: 8
    }
  }, "Active Pools"), [["75 Hard Boyz", "₹499 · ₹198 fined", "₹5,192"], ["Morning 5K", "₹499 · ₹0 fined", "₹2,400"], ["No Maida", "₹499 · ₹0 fined", "₹1,800"]].map(([n, d, p], i) => /*#__PURE__*/React.createElement(Box, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: F
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text2
    }
  }, d)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: C.amber,
      flexShrink: 0,
      marginLeft: 8
    }
  }, p)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    small: true,
    style: {
      flex: 1
    }
  }, "\uD83D\uDCCB Ledger"), /*#__PURE__*/React.createElement(Btn, {
    small: true,
    style: {
      flex: 1
    }
  }, "\uD83D\uDCB3 Methods")));
}
function LedgerScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Transactions",
    r: ""
  }), [{
    t: "deposit",
    d: "Buy-in: 75 Hard",
    a: "-₹499",
    c: C.danger,
    dt: "5 Apr",
    i: "🏦"
  }, {
    t: "fine",
    d: "Missed Day 8",
    a: "-₹99",
    c: C.danger,
    dt: "12 Apr",
    i: "💸"
  }, {
    t: "payout",
    d: "Won: Morning 5K",
    a: "+₹3,500",
    c: C.success,
    dt: "1 Apr",
    i: "💰"
  }, {
    t: "powerup",
    d: "Shield bought",
    a: "-₹49",
    c: C.text2,
    dt: "28 Mar",
    i: "🛡️"
  }].map((tx, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "8px 0",
      borderBottom: `1px solid ${C.silver}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: R.sm,
      background: tx.t === "payout" ? C.successBg : tx.t === "fine" ? C.dangerBg : C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 13,
      flexShrink: 0
    }
  }, tx.i), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      fontFamily: F
    }
  }, tx.d), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text3
    }
  }, tx.dt)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 800,
      color: tx.c,
      fontFamily: F,
      flexShrink: 0
    }
  }, tx.a))));
}
function PaymentMethodsScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Payment Methods",
    r: ""
  }), /*#__PURE__*/React.createElement(Lbl, null, "DEFAULT UPI"), /*#__PURE__*/React.createElement(Box, {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      flexShrink: 0
    }
  }, "\uD83D\uDCF1"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      fontFamily: F
    }
  }, "avanish@okaxis"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.success
    }
  }, "\u2713 Verified")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.amber,
      fontWeight: 700,
      flexShrink: 0
    }
  }, "Edit")), /*#__PURE__*/React.createElement(Lbl, null, "SAVED CARDS"), /*#__PURE__*/React.createElement(Box, {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      flexShrink: 0
    }
  }, "\uD83D\uDCB3"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      fontFamily: F
    }
  }, "HDFC \u2022\u2022\u2022\u2022 4521"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text3
    }
  }, "Visa \xB7 08/27"))), /*#__PURE__*/React.createElement(Btn, {
    style: {
      marginTop: 8
    }
  }, "+ Add Method"), /*#__PURE__*/React.createElement(Lbl, null, "PAYOUT ACCOUNT"), /*#__PURE__*/React.createElement(Box, {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      flexShrink: 0
    }
  }, "\uD83C\uDFE6"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 600,
      fontFamily: F
    }
  }, "avanish@okaxis"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text3
    }
  }, "Instant UPI payout"))));
}
function ProfileScreen() {
  return /*#__PURE__*/React.createElement(Shell, {
    tab: 3,
    noPad: true
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.navy,
      padding: 20,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement(Av, {
    s: 56,
    c: "#C7D2FE",
    style: {
      margin: "0 auto",
      border: `3px solid ${C.amber}`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 900,
      color: C.white,
      marginTop: 8,
      fontFamily: F
    }
  }, "Avanish Sharma"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.45)"
    }
  }, "@avanish_fit \xB7 Level 7 \xB7 \u2B50 Pro"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "center",
      gap: 20,
      marginTop: 16
    }
  }, [["XP", "1,840"], ["Pools", "5"], ["Wins", "60%"], ["Earned", "₹3.5K"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 900,
      color: C.white,
      fontFamily: F
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "rgba(255,255,255,0.4)"
    }
  }, k))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: C.navy,
      marginBottom: 8
    }
  }, "Discipline Score"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 8,
      background: C.silver,
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8,
      background: C.amber,
      borderRadius: 4,
      width: "87%"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 900,
      color: C.amber
    }
  }, "87%")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: C.navy,
      marginBottom: 8
    }
  }, "Badges"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      marginBottom: 16
    }
  }, ["👣 Pehla Kadam", "🦾 Iron Will", "💎 Diamond Hands", "🤑 Pot Raja"].map((badge, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: C.bg,
      borderRadius: R.pill,
      padding: "5px 10px",
      fontSize: 10,
      fontWeight: 600
    }
  }, badge))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      color: C.navy,
      marginBottom: 8
    }
  }, "Pool History"), [["75 Hard", "🏆 Won · ₹3,500"], ["Morning 5K", "#3 · ₹0"]].map(([n, d], i) => /*#__PURE__*/React.createElement(Box, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: F
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text2
    }
  }, d)))));
}
function BadgesScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Badges",
    r: ""
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8
    }
  }, [{
    e: "👣",
    n: "Pehla Kadam",
    d: "First pool",
    r: "Common",
    ok: true
  }, {
    e: "🦾",
    n: "Iron Will",
    d: "30-day streak",
    r: "Uncommon",
    ok: true
  }, {
    e: "💎",
    n: "Diamond Hands",
    d: "100% in pool",
    r: "Rare",
    ok: true
  }, {
    e: "🤑",
    n: "Pot Raja",
    d: "Win 3+",
    r: "Rare",
    ok: true
  }, {
    e: "👑",
    n: "Untouchable",
    d: "5× 100%",
    r: "Epic"
  }, {
    e: "🏆",
    n: "Centurion",
    d: "100-day streak",
    r: "Legendary"
  }, {
    e: "💰",
    n: "Lakhpati",
    d: "₹1L+ earned",
    r: "Legendary"
  }, {
    e: "🏏",
    n: "IPL Survivor",
    d: "Pool in IPL",
    r: "Seasonal"
  }].map((badge, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: badge.ok ? C.white : C.bg,
      border: badge.ok ? `1px solid ${C.silver}` : `1px dashed ${C.silverDark}`,
      borderRadius: R.md,
      padding: 12,
      textAlign: "center",
      opacity: badge.ok ? 1 : 0.4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22
    }
  }, badge.e), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      marginTop: 3,
      fontFamily: F
    }
  }, badge.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.text3
    }
  }, badge.d), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: badge.r === "Legendary" ? C.amber : badge.r === "Epic" ? "#8B5CF6" : C.text3,
      fontWeight: 700,
      marginTop: 3,
      textTransform: "uppercase"
    }
  }, badge.r, badge.ok ? " ✓" : "")))));
}
function SettingsScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Settings",
    r: ""
  }), ["Profile", "Notifications", "Language", "Payment Methods", "PoolUp Pro", "Privacy Policy", "Terms of Service", "Help & Support", "Delete Account", "Log Out"].map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "11px 0",
      borderBottom: `1px solid ${C.silver}`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: i >= 8 ? C.danger : C.text1,
      fontWeight: i >= 8 ? 600 : 400,
      fontFamily: F
    }
  }, item), i < 8 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.text3
    }
  }, "\u2192"))));
}
function ExploreScreen() {
  return /*#__PURE__*/React.createElement(Shell, {
    tab: 1
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 900,
      color: C.navy,
      marginBottom: 12,
      fontFamily: F
    }
  }, "Explore \uD83E\uDDED"), /*#__PURE__*/React.createElement(Inp, {
    p: "\uD83D\uDD0D Search pools, creators..."
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 12,
      flexWrap: "wrap"
    }
  }, ["🔥 Trending", "💪 Fitness", "🧘 Wellness", "📚 Productivity"].map((cat, i) => /*#__PURE__*/React.createElement(Ch, {
    key: i,
    active: i === 0
  }, cat))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      color: C.navy,
      marginBottom: 8
    }
  }, "Starting Soon"), [{
    n: "30-Day Gym Streak",
    c: "@fitcoach_raj ✓",
    m: "18/20",
    b: "₹499",
    d: "In 2 days"
  }, {
    n: "IPL Fitness",
    c: "@muscleblaze ✓",
    m: "142/200",
    b: "FREE",
    d: "Tomorrow"
  }, {
    n: "Surya Namaskar 21",
    c: "@yoga_priya ✓",
    m: "45/50",
    b: "₹99",
    d: "In 5 days"
  }].map((p, i) => /*#__PURE__*/React.createElement(Box, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 700,
      fontFamily: F
    }
  }, p.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text2
    }
  }, p.c, " \xB7 ", p.m), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.amber,
      fontWeight: 600
    }
  }, p.d)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right",
      flexShrink: 0,
      marginLeft: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      color: C.navy
    }
  }, p.b))))));
}
function PowerUpsScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Power-Ups \u26A1",
    r: ""
  }), [{
    e: "🛡️",
    n: "Shield",
    p: "₹49",
    d: "Block one fine"
  }, {
    e: "🎲",
    n: "Double Down",
    p: "₹99",
    d: "2× fine for everyone"
  }, {
    e: "💡",
    n: "Spotlight",
    p: "₹29",
    d: "Pin check-in to top"
  }, {
    e: "⏰",
    n: "Alarm Bomb",
    p: "₹29",
    d: "Wake-up call via WhatsApp"
  }, {
    e: "❄️",
    n: "Streak Freeze",
    p: "₹149",
    d: "Streak preserved, fine applies"
  }, {
    e: "👻",
    n: "Ghost Mode",
    p: "₹49",
    d: "Hide status for 1 day"
  }].map((pw, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      padding: "12px 0",
      borderBottom: `1px solid ${C.silver}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      width: 32,
      textAlign: "center",
      flexShrink: 0
    }
  }, pw.e), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 700,
      fontFamily: F
    }
  }, pw.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text2
    }
  }, pw.d)), /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.amber,
      color: C.navy,
      borderRadius: R.sm,
      padding: "6px 12px",
      fontSize: 12,
      fontWeight: 800,
      fontFamily: F,
      flexShrink: 0
    }
  }, pw.p))));
}
function NotificationsScreen() {
  return /*#__PURE__*/React.createElement(Wrap, null, /*#__PURE__*/React.createElement(Hdr, {
    l: "\u2190",
    t: "Notifications",
    r: ""
  }), [{
    i: "🚨",
    t: "3 hours left!",
    b: "75 Hard Boyz · Check in now",
    tm: "9:30 PM",
    u: true
  }, {
    i: "💸",
    t: "Fine charged",
    b: "₹99 added to pot",
    tm: "12:01 AM",
    u: true
  }, {
    i: "🔥",
    t: "14-day streak!",
    b: "You're in the top 3",
    tm: "Yesterday"
  }, {
    i: "🚀",
    t: "Pool is LIVE!",
    b: "Morning 5K started",
    tm: "2d ago"
  }, {
    i: "🎉",
    t: "You won ₹3,500!",
    b: "Payout processing",
    tm: "1w ago"
  }].map((n, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 12,
      padding: 12,
      borderBottom: `1px solid ${C.silver}`,
      background: n.u ? C.amberSoft : "transparent",
      margin: "0 -20px",
      paddingLeft: 20,
      paddingRight: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      flexShrink: 0
    }
  }, n.i), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: n.u ? 800 : 500,
      fontFamily: F
    }
  }, n.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text2
    }
  }, n.b)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: C.text3,
      flexShrink: 0
    }
  }, n.tm))));
}
function FineAlertScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      padding: 20,
      background: "rgba(0,0,0,0.6)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: C.white,
      borderRadius: R.xl,
      padding: 24,
      width: "100%",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40
    }
  }, "\uD83D\uDCB8"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 900,
      color: C.danger,
      marginTop: 8,
      fontFamily: F
    }
  }, "You Missed Today"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.text1,
      marginTop: 8,
      fontFamily: F
    }
  }, "75 Hard Boyz"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 900,
      color: C.navy,
      marginTop: 8,
      fontFamily: F
    }
  }, "-\u20B999"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.text2,
      marginTop: 2
    }
  }, "Debited via UPI Autopay"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FEF9E7",
      borderRadius: R.md,
      padding: 12,
      marginTop: 16,
      fontSize: 11,
      color: "#78350F",
      border: "1px solid #FDE68A"
    }
  }, "Streak: 0 \xB7 Fines: \u20B9297 \xB7 Pot: \u20B95,291"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    primary: true
  }, "OK, I'll do better tomorrow")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: C.text3,
      marginTop: 4
    }
  }, "Grace tokens: 0")));
}
function PayoutSuccessScreen() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      padding: 20,
      background: `linear-gradient(170deg,${C.black},${C.navy})`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 52
    }
  }, "\uD83C\uDF89"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.45)",
      marginTop: 8,
      letterSpacing: 2,
      textTransform: "uppercase"
    }
  }, "CONGRATULATIONS"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.white,
      fontWeight: 600,
      marginTop: 4,
      fontFamily: F
    }
  }, "You won 75 Hard Boyz"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      fontWeight: 900,
      color: C.amber,
      marginTop: 12,
      fontFamily: F
    }
  }, "\u20B94,932"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "rgba(255,255,255,0.35)",
      marginTop: 2
    }
  }, "Pot: \u20B95,192 \xB7 Fee: \u20B9260"), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "rgba(255,255,255,0.06)",
      borderRadius: R.lg,
      padding: 16,
      marginTop: 20,
      width: "100%",
      border: "1px solid rgba(255,255,255,0.08)"
    }
  }, [["Streak", "30 days 🔥"], ["Compliance", "100% 💎"], ["Fines", "₹0"], ["Badge", "Diamond Hands"]].map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "5px 0",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "rgba(255,255,255,0.45)"
    }
  }, k), /*#__PURE__*/React.createElement("span", {
    style: {
      color: C.white,
      fontWeight: 700,
      fontFamily: F
    }
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Btn, {
    green: true
  }, "\uD83D\uDCF1 Share on WhatsApp"), /*#__PURE__*/React.createElement(Btn, {
    style: {
      background: "rgba(255,255,255,0.08)",
      color: C.white
    }
  }, "View Wallet \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "rgba(255,255,255,0.25)",
      marginTop: 12
    }
  }, "UTR: 402615XXXXXX"));
}

// ─── SCREEN MAP ───
const SCREENS = {
  splash: {
    name: "Splash",
    group: "Auth",
    desc: "App launch"
  },
  login: {
    name: "Login",
    group: "Auth",
    desc: "Phone entry"
  },
  otp: {
    name: "OTP Verify",
    group: "Auth",
    desc: "6-digit code"
  },
  profileSetup: {
    name: "Profile Setup",
    group: "Auth",
    desc: "Name & username"
  },
  gateway: {
    name: "Gateway",
    group: "Auth",
    desc: "Create or Join"
  },
  createStep1: {
    name: "Create: Name",
    group: "Pool Create",
    desc: "Name & type"
  },
  createStep2: {
    name: "Create: Schedule",
    group: "Pool Create",
    desc: "Duration & time"
  },
  createStep3: {
    name: "Create: Stakes",
    group: "Pool Create",
    desc: "Buy-in & rules"
  },
  createStep4: {
    name: "Create: Review",
    group: "Pool Create",
    desc: "Confirm"
  },
  shareInvite: {
    name: "Share Invite",
    group: "Pool Create",
    desc: "WhatsApp & QR"
  },
  joinCode: {
    name: "Enter Code",
    group: "Pool Join",
    desc: "Invite code"
  },
  joinConsent: {
    name: "Consent",
    group: "Pool Join",
    desc: "Rules & mandate"
  },
  joinPay: {
    name: "Payment",
    group: "Pool Join",
    desc: "Razorpay"
  },
  home: {
    name: "Home",
    group: "Dashboard",
    desc: "Pool cards"
  },
  poolDetail: {
    name: "Pool Detail",
    group: "Dashboard",
    desc: "Feed & pot"
  },
  leaderboard: {
    name: "Leaderboard",
    group: "Dashboard",
    desc: "Rankings"
  },
  camera: {
    name: "Camera",
    group: "Check-in",
    desc: "Take photo"
  },
  liveness: {
    name: "Liveness",
    group: "Check-in",
    desc: "Verification"
  },
  preview: {
    name: "Preview",
    group: "Check-in",
    desc: "Review & caption"
  },
  checkinSuccess: {
    name: "Success",
    group: "Check-in",
    desc: "Streak confirmed"
  },
  feed: {
    name: "Pool Feed",
    group: "Social",
    desc: "Check-ins"
  },
  wallOfShame: {
    name: "Wall of Shame",
    group: "Social",
    desc: "Miss & milestone"
  },
  reactions: {
    name: "Reactions",
    group: "Social",
    desc: "React picker"
  },
  wallet: {
    name: "Wallet",
    group: "Wallet",
    desc: "Balances"
  },
  ledger: {
    name: "Ledger",
    group: "Wallet",
    desc: "Transactions"
  },
  paymentMethods: {
    name: "Methods",
    group: "Wallet",
    desc: "UPI & cards"
  },
  profile: {
    name: "Profile",
    group: "Profile",
    desc: "Stats & badges"
  },
  badges: {
    name: "Badges",
    group: "Profile",
    desc: "Achievements"
  },
  settings: {
    name: "Settings",
    group: "Profile",
    desc: "Preferences"
  },
  explore: {
    name: "Explore",
    group: "Discover",
    desc: "Public pools"
  },
  powerups: {
    name: "Power-Ups",
    group: "Discover",
    desc: "Shop"
  },
  notifications: {
    name: "Notifications",
    group: "Discover",
    desc: "Alerts"
  },
  fineAlert: {
    name: "Fine Alert",
    group: "Overlays",
    desc: "Miss modal"
  },
  payoutSuccess: {
    name: "Payout!",
    group: "Overlays",
    desc: "Win celebration"
  }
};
const GROUPS = [...new Set(Object.values(SCREENS).map(s => s.group))];
const RENDERERS = {
  splash: SplashScreen,
  login: LoginScreen,
  otp: OTPScreen,
  profileSetup: ProfileSetupScreen,
  gateway: GatewayScreen,
  createStep1: CreateStep1,
  createStep2: CreateStep2,
  createStep3: CreateStep3,
  createStep4: CreateStep4,
  shareInvite: ShareInviteScreen,
  joinCode: JoinCodeScreen,
  joinConsent: JoinConsentScreen,
  joinPay: JoinPayScreen,
  home: HomeScreen,
  poolDetail: PoolDetailScreen,
  leaderboard: LeaderboardScreen,
  camera: CameraScreen,
  liveness: LivenessScreen,
  preview: PreviewScreen,
  checkinSuccess: CheckinSuccessScreen,
  feed: FeedScreen,
  wallOfShame: WallOfShameScreen,
  reactions: ReactionsScreen,
  wallet: WalletScreen,
  ledger: LedgerScreen,
  paymentMethods: PaymentMethodsScreen,
  profile: ProfileScreen,
  badges: BadgesScreen,
  settings: SettingsScreen,
  explore: ExploreScreen,
  powerups: PowerUpsScreen,
  notifications: NotificationsScreen,
  fineAlert: FineAlertScreen,
  payoutSuccess: PayoutSuccessScreen
};
function App() {
  const [screen, setScreen] = useState("splash");
  const [group, setGroup] = useState("Auth");
  const isDark = ["splash", "camera", "liveness", "preview", "checkinSuccess", "payoutSuccess", "fineAlert"].includes(screen);
  const Comp = RENDERERS[screen];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      height: "100vh",
      background: C.black,
      fontFamily: F,
      color: C.text1,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 192,
      background: C.navy,
      display: "flex",
      flexDirection: "column",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 12px 8px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 900,
      color: C.amber,
      fontFamily: F,
      letterSpacing: -1
    }
  }, "PoolUp"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 8,
      color: "rgba(255,255,255,0.3)",
      fontWeight: 600,
      letterSpacing: 1.5,
      marginTop: 2
    }
  }, "WIREFRAMES v2.0")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "0 6px"
    }
  }, GROUPS.map(g => /*#__PURE__*/React.createElement("div", {
    key: g,
    style: {
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => setGroup(g),
    style: {
      fontSize: 9,
      fontWeight: 700,
      color: group === g ? C.amber : "rgba(255,255,255,0.3)",
      padding: "7px 6px 3px",
      cursor: "pointer",
      textTransform: "uppercase",
      letterSpacing: 1.2,
      fontFamily: F
    }
  }, g), group === g && Object.entries(SCREENS).filter(([, v]) => v.group === g).map(([id, s]) => /*#__PURE__*/React.createElement("div", {
    key: id,
    onClick: () => setScreen(id),
    style: {
      padding: "5px 10px",
      borderRadius: 6,
      cursor: "pointer",
      fontSize: 11,
      fontWeight: screen === id ? 700 : 400,
      color: screen === id ? C.amber : "rgba(255,255,255,0.5)",
      background: screen === id ? C.amberSoft : "transparent",
      marginBottom: 1,
      fontFamily: F
    }
  }, s.name))))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "6px 12px",
      borderTop: "1px solid rgba(255,255,255,0.06)",
      fontSize: 8,
      color: "rgba(255,255,255,0.18)"
    }
  }, Object.keys(SCREENS).length, " screens \xB7 Helvetica")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 800,
      color: C.white,
      fontFamily: F
    }
  }, SCREENS[screen].name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "rgba(255,255,255,0.35)",
      marginTop: 2,
      fontFamily: F
    }
  }, SCREENS[screen].group, " \u2192 ", SCREENS[screen].desc)), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 292,
      height: 600,
      background: isDark ? C.black : C.white,
      borderRadius: 34,
      overflow: "hidden",
      boxShadow: "0 0 0 3px #222, 0 0 60px rgba(252,163,17,0.06)",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 32,
      background: isDark ? C.black : C.white,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 18px",
      fontSize: 10,
      color: isDark ? C.white : C.black,
      fontWeight: 600,
      fontFamily: F,
      position: "relative",
      zIndex: 2
    }
  }, /*#__PURE__*/React.createElement("span", null, "9:41"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 68,
      height: 18,
      background: C.black,
      borderRadius: 9,
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)",
      top: 5
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9
    }
  }, "\uD83D\uDCF6 \uD83D\uDD0B")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 568,
      overflowY: "auto",
      overflowX: "hidden"
    }
  }, Comp && /*#__PURE__*/React.createElement(Comp, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      marginTop: 12,
      flexWrap: "wrap",
      justifyContent: "center",
      maxWidth: 440
    }
  }, Object.entries(SCREENS).filter(([, v]) => v.group === group).map(([id, s]) => /*#__PURE__*/React.createElement("div", {
    key: id,
    onClick: () => setScreen(id),
    style: {
      padding: "4px 10px",
      borderRadius: 6,
      fontSize: 10,
      cursor: "pointer",
      fontWeight: screen === id ? 700 : 400,
      background: screen === id ? C.amber : "rgba(255,255,255,0.06)",
      color: screen === id ? C.navy : "rgba(255,255,255,0.4)",
      fontFamily: F
    }
  }, s.name)))));
}
const React = require('react');
const ReactDOMServer = require('react-dom/server');
console.log(ReactDOMServer.renderToString(/*#__PURE__*/React.createElement(SplashScreen, null)));
