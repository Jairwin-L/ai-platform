import styles from './page.module.scss';

function mockFetch(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('欢迎来到Nextjs Starter Kit平台');
    }, 1500);
  });
}

export default async function Page() {
  const data = await mockFetch();
  return (
    <>
      <h1 className={styles.title}>Hello, {data}</h1>
    </>
  );
}
