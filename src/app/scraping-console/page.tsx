"use client";
import { useEffect, useRef, useState } from "react";

export default function ScrapingConsolePage() {
  const [running, setRunning] = useState<boolean>(false);
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/scraping/proxy/status", { cache: "no-store" });
      const data = await res.json();
      setRunning(Boolean(data.running));
    } catch {}
  }

  async function fetchLogs() {
    try {
      const res = await fetch("/api/scraping/proxy/logs", { cache: "no-store" });
      const text = await res.text();
      setLogs(text);
    } catch {}
  }

  async function startRun() {
    setLoading(true);
    try {
      await fetch("/api/scraping/proxy/run", { method: "POST" });
      setRunning(true);
      // start polling logs
      if (!intervalRef.current) {
        intervalRef.current = setInterval(fetchLogs, 1500);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    fetchLogs();
    intervalRef.current = setInterval(() => {
      fetchStatus();
      fetchLogs();
    }, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>Scraping Console (VPS)</h1>
      <p style={{ color: "#666", marginTop: 4 }}>Disparar scraping e visualizar logs em tempo quase real.</p>

      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={startRun}
          disabled={loading || running}
          style={{ padding: "8px 16px", borderRadius: 8, background: running ? "#aaa" : "#111", color: "#fff", cursor: loading || running ? "not-allowed" : "pointer" }}
        >
          {running ? "Rodando..." : loading ? "Iniciando..." : "Iniciar scraping"}
        </button>
        <span style={{ fontSize: 13, color: running ? "#0a0" : "#555" }}>
          Status: {running ? "Em execução" : "Parado"}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ fontSize: 13, color: "#555" }}>Logs</label>
        <pre
          style={{
            background: "#0b0b0b",
            color: "#d1d1d1",
            padding: 12,
            borderRadius: 8,
            height: 520,
            overflow: "auto",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            fontSize: 12,
            lineHeight: 1.4,
            whiteSpace: "pre-wrap",
          }}
        >
{logs}
        </pre>
      </div>
    </div>
  );
}


