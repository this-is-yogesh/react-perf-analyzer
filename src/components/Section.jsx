import styles from './Section.module.css';

export function Section({ eyebrow, title, right, children }) {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          {eyebrow ? <div className={styles.eyebrow}>{eyebrow}</div> : null}
          <h2 className={styles.title}>{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
