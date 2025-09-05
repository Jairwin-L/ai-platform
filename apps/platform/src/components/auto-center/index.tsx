import { type ReactNode } from "react";

interface IAutoCenter {
	children: ReactNode;
}

export default function AutoCenter(props: IAutoCenter) {
  const { children } = props;
  return <div className="flex items-center justify-center h-screen">{children}</div>;
}
