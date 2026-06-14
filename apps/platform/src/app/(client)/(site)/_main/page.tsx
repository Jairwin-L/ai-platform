import styles from './page.module.scss';

function mockFetch(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve('我是一个页面');
    }, 1500);
  });
}

export default async function Page() {
  const data = await mockFetch();
  return (
    <div>
      <h1 className={styles.title}>main page, {data}</h1>
    </div>
  );
}
