export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
      <div className="flex space-x-2">
        <span className="w-3 h-3 rounded-full bg-black dark:bg-white animate-bounce" />
        <span className="w-3 h-3 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:0.2s]" />
        <span className="w-3 h-3 rounded-full bg-black dark:bg-white animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  );
}
