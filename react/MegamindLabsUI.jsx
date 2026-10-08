/**
 * Megamind Labs UI for React
 * Thin wrappers around megamind-labs-ui.css. Import the stylesheet once:
 *   import "megamind-labs-ui/megamind-labs-ui.css";
 * Every component passes extra props and className through, so you can
 * always fall back to plain markup and the mm-* classes.
 */
import React from "react";

const cx = (...parts) => parts.filter(Boolean).join(" ");
const mod = (base, value) => (value ? `${base}--${value}` : null);

/* Presentation ------------------------------------------------------------ */

export function Canvas({ className, ...props }) {
  return <div className={cx("mm mm-canvas", className)} {...props} />;
}

export function FlowSection({ title, description, children }) {
  return (
    <section className="mm-flow-section">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      <div className="mm-flow">{children}</div>
    </section>
  );
}

/** One screen in a flow, with a name and a size label above it. */
export function Artboard({ name, meta, device = "phone", theme, children, screenClassName, style }) {
  const sizes = { phone: "390 x 844", compact: "390 x 640", wide: "780 x 640", tablet: "820 x 1180", desktop: "1280 x 800" };
  return (
    <div className="mm-artboard">
      <div className="mm-artboard-name">{name}</div>
      <div className="mm-artboard-meta">{meta ?? sizes[device]}</div>
      <Screen device={device} theme={theme} className={screenClassName} style={style}>{children}</Screen>
    </div>
  );
}

export function Screen({ device = "phone", theme, className, ...props }) {
  return <div className={cx("mm-screen", mod("mm-screen", device), className)} data-theme={theme} {...props} />;
}

export const ScreenBody = ({ className, ...p }) => <div className={cx("mm-screen-body", className)} {...p} />;
export const Split = ({ wideLeft, className, ...p }) => <div className={cx("mm-split", wideLeft && "mm-split--wide-left", className)} {...p} />;
export const Pane = ({ className, ...p }) => <div className={cx("mm-pane", className)} {...p} />;
export const Spacer = () => <div className="mm-spacer" />;
export const Stack = ({ gap, className, ...p }) => <div className={cx("mm-stack", gap && `mm-gap-${gap}`, className)} {...p} />;
export const Row = ({ gap, between, className, ...p }) => <div className={cx("mm-row", gap && `mm-gap-${gap}`, between && "mm-between", className)} {...p} />;
export const Note = ({ n, top, right, bottom, left }) => <span className="mm-note" style={{ top, right, bottom, left }}>{n}</span>;

/* Chrome ------------------------------------------------------------------ */

export const StatusBar = ({ time = "9:41" }) => <div className="mm-statusbar"><span>{time}</span></div>;

export function NavBar({ back, onBack, title, action }) {
  return (
    <div className="mm-navbar">
      {back ? <button className="mm-back" onClick={onBack}>{back}</button> : <span />}
      <span className="mm-navbar-title">{title}</span>
      {action ?? <span />}
    </div>
  );
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <nav className="mm-tabbar">
      {tabs.map((t) => (
        <button key={t} className="mm-tab" aria-current={t === active ? "page" : undefined} onClick={() => onChange?.(t)}>{t}</button>
      ))}
    </nav>
  );
}

export const Steps = ({ total, done }) => (
  <div className="mm-steps">{Array.from({ length: total }, (_, i) => <span key={i} className={i < done ? "is-done" : undefined} />)}</div>
);

export const Dots = ({ total, active = 0 }) => (
  <div className="mm-dots">{Array.from({ length: total }, (_, i) => <span key={i} className={i === active ? "is-active" : undefined} />)}</div>
);

/* Actions and inputs ------------------------------------------------------ */

/** variant: secondary | ghost | danger | icon. size: sm. block: full width. */
export function Button({ variant, size, block, className, ...props }) {
  return <button className={cx("mm-btn", mod("mm-btn", variant), mod("mm-btn", size), block && "mm-btn--block", className)} {...props} />;
}

export function Field({ label, hint, error, id, children }) {
  return (
    <div className={cx("mm-field", error && "is-error")}>
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {(error || hint) && <span className="mm-field-hint">{error || hint}</span>}
    </div>
  );
}

export const Input = ({ className, ...p }) => <input className={cx("mm-input", className)} {...p} />;
export const TextArea = ({ className, ...p }) => <textarea className={cx("mm-textarea", className)} {...p} />;
export const Select = ({ className, ...p }) => <select className={cx("mm-select", className)} {...p} />;
export const Search = (p) => <div className="mm-search"><input className="mm-input" {...p} /></div>;

export function InputBar({ placeholder = "Ask anything", action = "Send", onAction, ...p }) {
  return <div className="mm-inputbar"><input placeholder={placeholder} {...p} /><button onClick={onAction}>{action}</button></div>;
}

export function Chips({ options, value, onChange, multiple }) {
  const isOn = (o) => (multiple ? value?.includes(o) : value === o);
  const toggle = (o) => {
    if (!onChange) return;
    if (!multiple) return onChange(o);
    onChange(isOn(o) ? value.filter((v) => v !== o) : [...(value || []), o]);
  };
  return (
    <div className="mm-chips">
      {options.map((o) => <button key={o} className="mm-chip" aria-pressed={isOn(o)} onClick={() => toggle(o)}>{o}</button>)}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="mm-segmented" role="group">
      {options.map((o) => <button key={o} aria-pressed={o === value} onClick={() => onChange?.(o)}>{o}</button>)}
    </div>
  );
}

export const Toggle = (p) => <input type="checkbox" className="mm-toggle" {...p} />;
export const Checkbox = ({ label, ...p }) => <label className="mm-choice"><input type="checkbox" className="mm-check" {...p} />{label}</label>;
export const Radio = ({ label, ...p }) => <label className="mm-choice"><input type="radio" className="mm-radio" {...p} />{label}</label>;

export function Keypad({ onKey }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];
  return (
    <div className="mm-keypad">
      {keys.map((k) => <button key={k} aria-label={k === "del" ? "Delete" : undefined} onClick={() => onKey?.(k)}>{k === "del" ? "\u2039" : k}</button>)}
    </div>
  );
}

export function Otp({ length = 6, value = "" }) {
  return (
    <div className="mm-otp">
      {Array.from({ length }, (_, i) => <span key={i} className={i === value.length ? "is-active" : undefined}>{value[i] ?? ""}</span>)}
    </div>
  );
}

/* Content ----------------------------------------------------------------- */

/** variant: filled | ink */
export function Card({ title, variant, className, children, ...p }) {
  return (
    <div className={cx("mm-card", mod("mm-card", variant), className)} {...p}>
      {title && <span className="mm-card-title">{title}</span>}
      {children}
    </div>
  );
}

/** Grey box for anything not designed yet. shape: x | square | wide | portrait | round */
export function Placeholder({ label, shape, className, style }) {
  const shapes = (Array.isArray(shape) ? shape : [shape]).map((s) => mod("mm-ph", s));
  return <div className={cx("mm-ph", ...shapes, className)} style={style}>{label}</div>;
}

export const Icon = ({ size, ink, round, style }) => (
  <span className={cx("mm-icon", ink && "mm-icon--ink")} style={{ ...(size && { "--mm-size": `${size}px` }), ...(round && { borderRadius: "50%" }), ...style }} />
);

export const Avatar = ({ initials, size }) => <span className={cx("mm-avatar", mod("mm-avatar", size))}>{initials}</span>;
export const Avatars = ({ people }) => <span className="mm-avatars">{people.map((p) => <Avatar key={p} initials={p} />)}</span>;

/** variant: ink | outline */
export const Badge = ({ variant, children }) => <span className={cx("mm-badge", mod("mm-badge", variant))}>{children}</span>;
export const Divider = () => <hr className="mm-divider" />;

export const SectionHead = ({ title, action }) => <div className="mm-section-head"><span>{title}</span>{action && <span>{action}</span>}</div>;

export function List({ boxed, divided = true, className, ...p }) {
  return <div className={cx("mm-list", boxed && "mm-list--boxed", divided && "mm-list--divided", className)} {...p} />;
}

/** leading: "icon" | "dot" | an element (e.g. <Avatar/>). trailing: value text or any element. */
export function ListRow({ title, sub, value, valueSub, leading = "icon", trailing, chevron, onClick }) {
  const lead = leading === "icon" ? <span className="mm-icon" /> : leading === "dot" ? <span className="mm-dot" /> : leading;
  return (
    <div className="mm-list-row" onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      {lead}
      <div className="mm-list-text">
        <span className="mm-list-title">{title}</span>
        {sub && <span className="mm-list-sub">{sub}</span>}
      </div>
      {value != null && <span className="mm-list-value">{value}{valueSub && <small>{valueSub}</small>}</span>}
      {trailing}
      {chevron && <span className="mm-chevron" />}
    </div>
  );
}

export function Stat({ label, value, meta, delta, small, align }) {
  const dir = delta ? (String(delta).trim().startsWith("-") ? "down" : "up") : null;
  return (
    <div className={cx("mm-stat", small && "mm-stat--sm")} style={align ? { alignItems: align, textAlign: align } : undefined}>
      {label && <span className="mm-stat-label">{label}</span>}
      <span className="mm-stat-value">{value}</span>
      {delta && <span className={cx("mm-delta", `mm-delta--${dir}`)}>{String(delta).replace(/^[-+]\s*/, "")}</span>}
      {meta && <span className="mm-stat-meta">{meta}</span>}
    </div>
  );
}

export const Progress = ({ value, ink, thin }) => (
  <div className={cx("mm-progress", ink && "mm-progress--ink", thin && "mm-progress--thin")} style={{ "--mm-value": `${value}%` }}><span /></div>
);

export const Ring = ({ value, size, label }) => (
  <div className="mm-ring" style={{ "--mm-value": value, ...(size && { "--mm-size": `${size}px` }) }}><span>{label ?? `${value}%`}</span></div>
);

export const Bars = ({ values, active }) => (
  <div className="mm-bars">{values.map((v, i) => <span key={i} className={i === active ? "is-active" : undefined} style={{ "--mm-value": `${v}%` }} />)}</div>
);

export const KeyValue = ({ items }) => (
  <div className="mm-kv">{items.map(([k, v]) => <div key={k}><span>{k}</span><span>{v}</span></div>)}</div>
);

export const Accordion = ({ items }) => (
  <div className="mm-accordion">{items.map(({ q, a, open }) => <details key={q} open={open}><summary>{q}</summary><p>{a}</p></details>)}</div>
);

export const Timeline = ({ items }) => (
  <ol className="mm-timeline">
    {items.map(({ title, meta, done }) => (
      <li key={title} className={done ? "is-done" : undefined}><span className="mm-strong">{title}</span>{meta && <><br /><span className="mm-caption">{meta}</span></>}</li>
    ))}
  </ol>
);

export function Week({ days, active, onChange }) {
  return (
    <div className="mm-week">
      {days.map(([dow, date]) => (
        <span key={date} className={date === active ? "is-active" : undefined} onClick={() => onChange?.(date)}><small>{dow}</small>{date}</span>
      ))}
    </div>
  );
}

/* Conversation ------------------------------------------------------------ */

export const Thread = ({ children }) => <div className="mm-thread">{children}</div>;
export const Bubble = ({ me, children }) => <div className={cx("mm-bubble", me && "mm-bubble--me")}>{children}</div>;
export const Typing = () => <div className="mm-typing"><span /><span /><span /></div>;
export const Wave = ({ values = [30, 60, 90, 50, 75, 40, 65, 25] }) => (
  <div className="mm-wave">{values.map((v, i) => <span key={i} style={{ "--mm-value": `${v}%` }} />)}</div>
);

export function Proposal({ title, body, confirm = "Confirm", dismiss = "Not now", onConfirm, onDismiss, children }) {
  return (
    <div className="mm-proposal">
      <span className="mm-card-title">{title}</span>
      {body && <span className="mm-small">{body}</span>}
      {children}
      <div className="mm-row">
        <Button size="sm" onClick={onConfirm}>{confirm}</Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>{dismiss}</Button>
      </div>
    </div>
  );
}

/* Feedback and overlays --------------------------------------------------- */

export const Banner = ({ title, children }) => <div className="mm-banner"><div>{title && <strong>{title} </strong>}{children}</div></div>;

export const Toast = ({ children, action, onAction }) => (
  <div className="mm-toast"><span>{children}</span>{action && <button onClick={onAction}>{action}</button>}</div>
);

export const Notification = ({ app = "YOUR APP", time = "now", title, children }) => (
  <div className="mm-notification">
    <span className="mm-notification-app"><span>{app}</span><span>{time}</span></span>
    {title && <strong>{title}</strong>}
    <span>{children}</span>
  </div>
);

/** Place inside a <Screen>. Set inline for documentation layouts. */
export function Sheet({ open = true, onClose, inline, children }) {
  if (!open) return null;
  return (
    <>
      {!inline && <div className="mm-scrim" onClick={onClose} />}
      <div className={cx("mm-sheet", inline && "mm-sheet--static")}>{children}</div>
    </>
  );
}

export function Dialog({ open = true, onClose, inline, children }) {
  if (!open) return null;
  return (
    <>
      {!inline && <div className="mm-scrim" onClick={onClose} />}
      <div className={cx("mm-dialog", inline && "mm-dialog--static")} role="dialog">{children}</div>
    </>
  );
}

export function EmptyState({ title, body, action, onAction, illustration = "Illustration" }) {
  return (
    <div className="mm-empty">
      <div className="mm-ph">{illustration}</div>
      <span className="mm-heading">{title}</span>
      {body && <p>{body}</p>}
      {action && <Button size="sm" onClick={onAction}>{action}</Button>}
    </div>
  );
}

/** kind: line | title | block | circle */
export const Skeleton = ({ kind = "line", width }) => (
  <span className={cx("mm-skeleton", kind !== "line" && `mm-skeleton--${kind}`)} style={width ? { width } : undefined} />
);

export const Spinner = () => <div className="mm-spinner" />;

export function LiveActivity({ title, step, value, children }) {
  return (
    <div className="mm-live">
      <div className="mm-row mm-between"><strong>{title}</strong>{step && <span>{step}</span>}</div>
      {value != null && <Progress value={value} thin />}
      {children && <span style={{ opacity: 0.7 }}>{children}</span>}
    </div>
  );
}
