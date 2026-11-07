import { useEffect } from "react";
import { RESUME } from "./resume";

/**
 * The résumé, laid out for paper. It is `display: none` on screen and becomes
 * the only thing on the page when printing (see the `print-resume` rules in
 * styles.css), so Ctrl+P — or File → Print — produces the résumé instead of a
 * screenshot of the solar system.
 */
export function PrintResume() {
  // "Save as PDF" names the file after the document title, so give it a
  // proper one for the duration of the print.
  useEffect(() => {
    let previous = "";
    const before = () => {
      previous = document.title;
      document.title = `${RESUME.name} - Resume`;
    };
    const after = () => {
      if (previous) document.title = previous;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return (
    <article className="print-resume">
      <header className="print-resume__header">
        <h1>{RESUME.name}</h1>
        <p className="print-resume__role">{RESUME.role}</p>
        <p className="print-resume__contact">
          {RESUME.contact.map((c, i) => (
            <span key={c.label}>
              {i > 0 && " | "}
              {c.href ? <a href={c.href}>{c.label}</a> : c.label}
            </span>
          ))}
        </p>
      </header>

      <section>
        <h2>Professional Summary</h2>
        <p>{RESUME.summary}</p>
      </section>

      <section>
        <h2>Technical Skills</h2>
        {RESUME.skills.map(([label, value]) => (
          <p key={label} className="print-resume__line">
            <strong>{label}:</strong> {value}
          </p>
        ))}
      </section>

      <section>
        <h2>Education</h2>
        <div className="print-resume__row">
          <strong>{RESUME.education.school}</strong>
          <span>{RESUME.education.years}</span>
        </div>
        <p className="print-resume__line">{RESUME.education.detail}</p>
      </section>

      <section>
        <h2>Projects</h2>
        {RESUME.projects.map((p) => (
          <div key={p.title} className="print-resume__project">
            <p className="print-resume__line">
              <strong>
                {p.title} — {p.subtitle}
              </strong>
            </p>
            <p className="print-resume__stack">{p.stack}</p>
            <ul>
              {p.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </div>
        ))}
        <div className="print-resume__project">
          <p className="print-resume__line">
            <strong>{RESUME.other.title}</strong>
          </p>
          <ul>
            {RESUME.other.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <h2>Strengths</h2>
        <ul>
          {RESUME.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}
