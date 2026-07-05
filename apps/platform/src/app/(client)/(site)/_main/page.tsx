import styles from './page.module.scss';

const blogUrl = 'https://www.yuque.com/jairwin/blog';
const githubUrl = 'https://github.com/Jairwin-L/nextjs-starter-kit';
const workflowSteps = ['Code', 'Preview', 'Review', 'Ship'];
const featureItems = [
  {
    title: 'Authentication',
    description: 'Session, sign in, verification code, account profile.',
  },
  {
    title: 'Content',
    description: 'Article creation, editing, detail views, and rich text support.',
  },
  {
    title: 'Storage',
    description: 'Image upload, compression, presigned URL flow, and R2 helpers.',
  },
  {
    title: 'Operations',
    description: 'Admin, permissions, Docker, and CI deployment scripts.',
  },
];

export default function Page() {
  return (
    <section className={styles['home-page']}>
      <div className={styles['hero-section']}>
        <div className={styles['hero-copy']}>
          <h1>Build, preview, and ship your Next.js app.</h1>
          <p>
            A production-minded starter kit with auth, content, uploads, admin controls, API routes,
            and deployment workflows already wired together.
          </p>
          <div className={styles.actions}>
            <a
              className={styles['primary-action']}
              href={blogUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              博客
            </a>
            <a
              className={styles['secondary-action']}
              href={githubUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className={styles['preview-shell']} aria-label="Starter kit deployment preview">
          <div className={styles['preview-header']}>
            <span className={styles['window-dot']} />
            <span className={styles['window-dot']} />
            <span className={styles['window-dot']} />
            <span className={styles['preview-path']}>nextjs-starter-kit</span>
          </div>
          <div className={styles['preview-body']}>
            <div className={styles['deploy-panel']}>
              <div>
                <strong>Production</strong>
                <span>Ready to deploy</span>
              </div>
            </div>
            <div className={styles['workflow-list']}>
              {workflowSteps.map((step, index) => (
                <div className={styles['workflow-row']} key={step}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{step}</strong>
                  <em>{index === workflowSteps.length - 1 ? 'Live' : 'Passed'}</em>
                </div>
              ))}
            </div>
            <pre className={styles.terminal}>
              <code>{`$ vp run build\n✓ routes compiled\n✓ checks passed\n✓ docker image ready`}</code>
            </pre>
          </div>
        </div>
      </div>

      <div className={styles['feature-grid']}>
        {featureItems.map((item) => (
          <article className={styles['feature-card']} key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
