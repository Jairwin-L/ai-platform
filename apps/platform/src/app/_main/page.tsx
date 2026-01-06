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
      <h1 className="text-blue-600">main page, {data}</h1>
    </div>
  );
}
