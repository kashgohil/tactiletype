export function Footer() {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 p-2">
      <p className="text-center text-sm">
        &copy; {new Date().getFullYear()} tactiletype. All rights reserved.
      </p>
    </div>
  );
}
