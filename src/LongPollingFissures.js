import React, { useState, useEffect, useRef } from "react";
import "./LongPollingFissures.css"; // Add this line if using external CSS

const API_BASE = "http://ec2-3-66-198-21.eu-central-1.compute.amazonaws.com:5050/fissures";

function LongPollingFissures() {
    const [missionType, setMissionType] = useState("");
    const [fissures, setFissures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasUpdate, setHasUpdate] = useState(false);

    const abortControllerRef = useRef(null);
    const prevFissuresRef = useRef([]);

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    function fissuresChanged(oldList, newList) {
        if (oldList.length !== newList.length) return true;
        const oldIds = new Set(oldList.map((f) => f.id));
        for (const fissure of newList) {
            if (!oldIds.has(fissure.id)) return true;
        }
        return false;
    }

    useEffect(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setError(null);

        const poll = () => {
            let url = API_BASE;
            if (missionType) {
                url += `?missionType=${encodeURIComponent(missionType)}`;
            }

            fetch(url, { signal: controller.signal })
                .then((res) => {
                    if (!res.ok) throw new Error("Network response not ok");
                    return res.json();
                })
                .then((data) => {
                    if (fissuresChanged(prevFissuresRef.current, data)) {
                        setHasUpdate(true);
                        if ("Notification" in window && Notification.permission === "granted") {
                            new Notification("Fissures updated", {
                                body: `There are now ${data.length} fissures.`,
                                icon: "/favicon.ico"
                            });
                        }
                    }

                    prevFissuresRef.current = data;
                    setFissures(data);
                    setLoading(false);
                    poll();
                })
                .catch((err) => {
                    if (err.name === "AbortError") return;
                    setError(err.message);
                    setLoading(false);
                    setTimeout(() => poll(), 5000);
                });
        };

        poll();

        return () => controller.abort();
    }, [missionType]);

    useEffect(() => {
        setHasUpdate(false);
    }, [missionType]);

    return (
        <div className="container">
            <h1>🌌 Warframe Fissures</h1>

            <label className="filter-label">
                Filter by Mission Type:
                <input
                    type="text"
                    value={missionType}
                    onChange={(e) => setMissionType(e.target.value)}
                    placeholder="e.g. Disruption, Void Cascade"
                />
            </label>

            {loading && <p className="info-text">Loading data...</p>}
            {error && <p className="error-text">Error: {error}</p>}

            {hasUpdate && (
                <div className="update-banner" onClick={() => setHasUpdate(false)} title="Click to dismiss">
                    🔄 New fissure data received! (click to dismiss)
                </div>
            )}

            <div className="fissure-list">
                {fissures.map((f) => (
                    <div key={f.id} className="fissure-card">
                        <h2>{f.missionType}</h2>
                        <p>
                            <strong>Node:</strong> {f.node} <br />
                            <strong>Tier:</strong> {f.tier} {f.isHard && "🔥 Hard"} <br />
                            <strong>ETA:</strong> {f.eta} <br />
                            <strong>Enemy:</strong> {f.enemy}
                        </p>
                    </div>
                ))}
            </div>

            {fissures.length === 0 && !loading && <p className="info-text">No fissures found.</p>}
        </div>
    );
}

export default LongPollingFissures;
