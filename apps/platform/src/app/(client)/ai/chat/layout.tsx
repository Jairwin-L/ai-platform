import { ChatShell } from './components/shell';

export default function Layout({ children }: Readonly<IComponent.ChildrenProps>) {
  return (
    <>
      {children}
      <ChatShell />
    </>
  );
}
