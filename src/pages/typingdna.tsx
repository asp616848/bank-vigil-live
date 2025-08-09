// src/components/TypingDNAForm.tsx
import { useEffect, useRef } from "react";

export default function TypingDNAForm() {
  const tdnaRef = useRef<any>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://typingdna.com/scripts/typingdna.js";
    script.async = true;
    script.onload = () => {
      // TypingDNA is now available on window
      // @ts-ignore
      tdnaRef.current = new (window as any).TypingDNA();
    };
    document.body.appendChild(script);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tdnaRef.current) {
      alert("TypingDNA is still loading...");
      return;
    }

    const email = emailRef.current?.value || "";

    // Capture typing pattern
    const tp = tdnaRef.current.getTypingPattern({
      type: 2,
      text: email
    });

    const res = await fetch("http://localhost:5000/typingdna/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "user123", tp })
    });

    const data = await res.json();
    alert(`Result: ${data.result === 1 ? "Match ✅" : "Mismatch ❌"}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input ref={emailRef} type="text" placeholder="Type your email..." />
      <button type="submit">Verify</button>
    </form>
  );
}
