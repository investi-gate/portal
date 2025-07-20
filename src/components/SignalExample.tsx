"use client";

import { signal } from "@preact/signals-react";

const count = signal(0);

export function SignalExample() {
  return (
    <div className="p-4 border rounded" data-test="signal-example">
      <p className="mb-2">Count: {count.value}</p>
      <button
        onClick={() => count.value++}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        data-test="increment-button"
      >
        Increment
      </button>
    </div>
  );
}