import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import "./LongPollingFissures.css";

const API_BASE = "http://localhost:5050/fissures";

// Available mission types - expanded list based on Warframe fissures
const MISSION_TYPES = [
    "Assault", "Assassination", "Capture", "Corruption", "Defense", "Disruption",
    "Excavation", "Exterminate", "Hijack", "Interception", "Mobile Defense",
    "Rescue", "Sabotage", "Spy", "Survival", "Void Armageddon", "Void Cascade",
    "Void Flood", "Armageddon", "Cascade", "Flood"
];

const DEBOUNCE_DELAY = 500;
const LONG_POLL_TIMEOUT = 30000;
const IMMEDIATE_RETRY_DELAY = 100;
const NORMAL_RETRY_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

function LongPollingFissures() {
    const [selectedMissionTypes, setSelectedMissionTypes] = useState([]);
    const [hardModeFilter, setHardModeFilter] = useState(null);
    const [debouncedFilters, setDebouncedFilters] = useState({
        missionTypes: [],
        hardMode: null,
    });
    const [fissures, setFissures] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [hasUpdate, setHasUpdate] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState("disconnected");
    const [availableMissionTypes, setAvailableMissionTypes] = useState(MISSION_TYPES);

    const abortControllerRef = useRef(null);
    const knownFissureIdsRef = useRef(new Set());
    const reconnectTimeoutRef = useRef(null);
    const debounceRef = useRef(null);
    const lastResponseTimeRef = useRef(null);

    // Memoized values to prevent unnecessary re-renders
    const hasActiveFilters = useMemo(() =>
            selectedMissionTypes.length > 0 || hardModeFilter !== null,
        [selectedMissionTypes.length, hardModeFilter]
    );

    const filterSummary = useMemo(() => {
        const parts = [];
        if (selectedMissionTypes.length > 0) {
            parts.push(selectedMissionTypes.join(', '));
        }
        if (hardModeFilter !== null) {
            parts.push(hardModeFilter ? 'Hard Mode' : 'Normal Mode');
        }
        return parts.join(' - ');
    }, [selectedMissionTypes, hardModeFilter]);

    // Request notification permission on mount
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Optimized debounce function
    const updateFilters = useCallback((missionTypes, hardMode) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            setDebouncedFilters({ missionTypes, hardMode });
        }, DEBOUNCE_DELAY);
    }, []);

    // Optimized mission type change handler
    const handleMissionTypeChange = useCallback((missionType, isChecked) => {
        const newMissionTypes = isChecked
            ? [...selectedMissionTypes, missionType]
            : selectedMissionTypes.filter(type => type !== missionType);
        setSelectedMissionTypes(newMissionTypes);
        updateFilters(newMissionTypes, hardModeFilter);
    }, [selectedMissionTypes, hardModeFilter, updateFilters]);

    // Optimized hard mode filter handler
    const handleHardModeChange = useCallback((newHardMode) => {
        setHardModeFilter(newHardMode);
        updateFilters(selectedMissionTypes, newHardMode);
    }, [selectedMissionTypes, updateFilters]);

    // Clear all filters
    const clearFilters = useCallback(() => {
        setSelectedMissionTypes([]);
        setHardModeFilter(null);
        updateFilters([], null);
    }, [updateFilters]);

    // Optimized query parameter builder
    const buildQueryParams = useCallback((includeKnownIds = false) => {
        const params = new URLSearchParams();

        if (debouncedFilters.missionTypes.length > 0) {
            debouncedFilters.missionTypes.forEach(type => {
                params.append('missionTypes', type);
            });
        }

        if (debouncedFilters.hardMode !== null) {
            params.append('isHard', debouncedFilters.hardMode);
        }

        if (includeKnownIds && knownFissureIdsRef.current.size > 0) {
            params.append('knownIds', Array.from(knownFissureIdsRef.current).join(','));
        }

        return params.toString();
    }, [debouncedFilters.missionTypes, debouncedFilters.hardMode]);

    // Optimized notification function
    const showNotification = useCallback((fissureCount) => {
        if ("Notification" in window && Notification.permission === "granted") {
            // Close any existing notification with the same tag
            new Notification("Warframe Fissures Updated", {
                body: `Found ${fissureCount} fissure${fissureCount !== 1 ? 's' : ''} matching your filters`,
                icon: "/favicon.ico",
                tag: "fissure-update",
                requireInteraction: false
            });
        }
    }, []);

    // Optimized API response processor
    const processApiResponse = useCallback((responseData, isImmediate = false) => {
        console.log(`Processing ${isImmediate ? 'immediate' : 'long poll'} response:`, {
            fissureCount: responseData.fissures ? responseData.fissures.length : responseData.length,
            fissureIds: responseData.fissureIds || 'not provided'
        });

        // Handle both old format (array) and new format (object with fissures + fissureIds)
        const fissures = responseData.fissures || responseData;
        const currentIds = responseData.fissureIds ?
            new Set(responseData.fissureIds) :
            new Set(fissures.map(f => f.id));

        // Check if data has changed
        const previousIds = knownFissureIdsRef.current;
        const hasChanged = previousIds.size !== currentIds.size ||
            !Array.from(currentIds).every(id => previousIds.has(id));

        console.log(`Data comparison:`, {
            previousIds: Array.from(previousIds),
            currentIds: Array.from(currentIds),
            hasChanged
        });

        // Update known IDs
        knownFissureIdsRef.current = currentIds;

        // Update available mission types efficiently
        const uniqueMissionTypes = [...new Set(fissures.map(f => f.missionType))].sort();
        setAvailableMissionTypes(prev => {
            const allTypes = [...new Set([...MISSION_TYPES, ...uniqueMissionTypes])].sort();
            // Only update if actually changed
            if (allTypes.length !== prev.length || !allTypes.every((type, i) => type === prev[i])) {
                console.log(`Updated available mission types: ${allTypes.join(', ')}`);
                return allTypes;
            }
            return prev;
        });

        // Update state
        setFissures(fissures);
        setConnectionStatus("connected");
        setError(null);
        lastResponseTimeRef.current = Date.now();

        // Show notification if data changed (and it's not the initial load)
        if (hasChanged && !isImmediate && previousIds.size > 0) {
            console.log("Data changed, showing update notification");
            setHasUpdate(true);
            showNotification(fissures.length);
        }

        return { fissures, hasChanged };
    }, [showNotification]);

    // Optimized fetch function with better error handling
    const createFetchRequest = useCallback((url, signal) => {
        return fetch(url, {
            signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }).then((res) => {
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
        });
    }, []);

    // Main effect that handles both immediate fetch and long polling
    useEffect(() => {
        console.log("🔄 EFFECT TRIGGERED - Filter change detected", {
            missionTypes: debouncedFilters.missionTypes,
            hardMode: debouncedFilters.hardMode,
        });

        // Reset known IDs when filters change (start fresh)
        knownFissureIdsRef.current = new Set();

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Clear any pending reconnection
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        lastResponseTimeRef.current = null;

        setLoading(true);
        setError(null);
        setConnectionStatus("connecting");

        // Step 1: Get immediate results when filters change
        const fetchImmediate = () => {
            const queryParams = buildQueryParams(false);
            const immediateUrl = queryParams ? `${API_BASE}/immediate?${queryParams}` : `${API_BASE}/immediate`;

            console.log(`Fetching immediate results: ${immediateUrl}`);

            return createFetchRequest(immediateUrl, controller.signal)
                .then((data) => {
                    console.log(`Got immediate results`);
                    setLoading(false);
                    return processApiResponse(data, true);
                });
        };

        // Step 2: Start continuous long polling loop
        const startContinuousLongPolling = () => {
            const executeLongPoll = (retryCount = 0) => {
                if (controller.signal.aborted) return;

                const queryParams = buildQueryParams(true);
                const longPollUrl = queryParams ? `${API_BASE}?${queryParams}` : API_BASE;

                console.log(`Starting long poll at ${new Date().toISOString()}: ${longPollUrl}`);
                console.log(`Known IDs being sent: [${Array.from(knownFissureIdsRef.current).join(', ')}]`);
                setConnectionStatus("waiting");

                createFetchRequest(longPollUrl, controller.signal)
                    .then((data) => {
                        const responseTime = Date.now();
                        const timeSinceLast = lastResponseTimeRef.current
                            ? responseTime - lastResponseTimeRef.current
                            : null;
                        console.log(`Long poll completed: took ${timeSinceLast}ms`);

                        const { hasChanged } = processApiResponse(data, false);

                        // Start the next long poll immediately if data changed, with delay if not
                        if (!controller.signal.aborted) {
                            const delay = hasChanged ? IMMEDIATE_RETRY_DELAY : NORMAL_RETRY_DELAY;
                            console.log(`Scheduling next long poll in ${delay}ms`);
                            reconnectTimeoutRef.current = setTimeout(() => {
                                executeLongPoll(0); // Reset retry count on success
                            }, delay);
                        }
                    })
                    .catch((err) => {
                        if (err.name === "AbortError") {
                            console.log("Long poll request was aborted");
                            return;
                        }

                        console.error("Long poll error:", err);
                        setError(err.message);
                        setConnectionStatus("error");

                        // Retry with exponential backoff
                        if (!controller.signal.aborted) {
                            const delay = Math.min(1000 * Math.pow(2, retryCount), MAX_RECONNECT_DELAY);
                            console.log(`Error occurred, retrying in ${delay / 1000} seconds...`);
                            reconnectTimeoutRef.current = setTimeout(() => {
                                setError(null);
                                setConnectionStatus("reconnecting");
                                executeLongPoll(retryCount + 1);
                            }, delay);
                        }
                    });
            };

            // Start the first long poll
            executeLongPoll();
        };

        // Execute: Immediate fetch, then start continuous long polling
        fetchImmediate()
            .then(() => {
                console.log(`Immediate fetch done. Starting continuous long polling loop.`);
                if (!controller.signal.aborted) {
                    startContinuousLongPolling();
                }
            })
            .catch((err) => {
                if (err.name === "AbortError") return;

                console.error("Immediate fetch error:", err);
                setError(err.message);
                setLoading(false);
                setConnectionStatus("error");

                // Start polling even if immediate fetch fails
                if (!controller.signal.aborted) {
                    console.log("Immediate fetch failed, but starting polling anyway...");
                    reconnectTimeoutRef.current = setTimeout(() => {
                        startContinuousLongPolling();
                    }, 2000);
                }
            });

        return () => {
            console.log("Cleaning up - aborting requests and timeouts");
            controller.abort();
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [debouncedFilters.missionTypes, debouncedFilters.hardMode, buildQueryParams, createFetchRequest, processApiResponse]);

    // Reset update banner when filters change
    useEffect(() => {
        setHasUpdate(false);
    }, [debouncedFilters.missionTypes, debouncedFilters.hardMode]);

    // Cleanup debounce timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // Optimized status indicator
    const statusConfig = useMemo(() => {
        const configs = {
            connected: { icon: "🟢", color: "#22c55e" },
            connecting: { icon: "🟡", color: "#eab308" },
            waiting: { icon: "🔵", color: "#3b82f6" },
            reconnecting: { icon: "🟠", color: "#f97316" },
            error: { icon: "🔴", color: "#ef4444" },
            default: { icon: "⚫", color: "#64748b" }
        };
        return configs[connectionStatus] || configs.default;
    }, [connectionStatus]);

    // Optimized dismiss update banner
    const dismissUpdate = useCallback(() => {
        setHasUpdate(false);
    }, []);

    return (
        <div className="container">
            <header className="header">
                <h1>🌌 Warframe Fissures</h1>
                <div
                    className="status-indicator"
                    title={`Connection: ${connectionStatus}`}
                    style={{ color: statusConfig.color }}
                >
                    {statusConfig.icon} {connectionStatus}
                </div>
            </header>

            <div className="filters-section">
                <div className="filter-group">
                    <h3>Mission Types ({selectedMissionTypes.length} selected)</h3>
                    <div className="mission-type-grid">
                        {availableMissionTypes.map(type => (
                            <label key={type} className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={selectedMissionTypes.includes(type)}
                                    onChange={(e) => handleMissionTypeChange(type, e.target.checked)}
                                />
                                <span className="checkbox-text">{type}</span>
                            </label>
                        ))}
                    </div>
                    {availableMissionTypes.length > MISSION_TYPES.length && (
                        <small className="dynamic-types-info">
                            ✨ Some mission types were auto-discovered from current fissures
                        </small>
                    )}
                </div>

                <div className="filter-group">
                    <h3>Difficulty Mode</h3>
                    <div className="radio-group">
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="hardMode"
                                checked={hardModeFilter === null}
                                onChange={() => handleHardModeChange(null)}
                            />
                            <span className="radio-text">All Modes</span>
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="hardMode"
                                checked={hardModeFilter === false}
                                onChange={() => handleHardModeChange(false)}
                            />
                            <span className="radio-text">Normal Only</span>
                        </label>
                        <label className="radio-label">
                            <input
                                type="radio"
                                name="hardMode"
                                checked={hardModeFilter === true}
                                onChange={() => handleHardModeChange(true)}
                            />
                            <span className="radio-text">Hard Mode Only 🔥</span>
                        </label>
                    </div>
                </div>

                {hasActiveFilters && (
                    <button className="clear-filters-btn" onClick={clearFilters}>
                        Clear All Filters
                    </button>
                )}
            </div>

            {loading && <p className="info-text">🔄 Loading fissures...</p>}

            {error && (
                <div className="error-text">
                    ❌ Connection Error: {error}
                    <br />
                    <small>Attempting to reconnect...</small>
                </div>
            )}

            {hasUpdate && (
                <div
                    className="update-banner"
                    onClick={dismissUpdate}
                    title="Click to dismiss"
                >
                    🔄 New fissure data received! Click to dismiss
                </div>
            )}

            <div className="results-header">
                <h2>
                    Found {fissures.length} Fissure{fissures.length !== 1 ? 's' : ''}
                    {filterSummary && (
                        <span className="filter-summary"> for {filterSummary}</span>
                    )}
                </h2>
            </div>

            <div className="fissure-list">
                {fissures.map((fissure) => (
                    <FissureCard key={fissure.id} fissure={fissure} />
                ))}
            </div>

            {fissures.length === 0 && !loading && (
                <div className="no-results">
                    <p>🔍 No fissures found matching your current filters.</p>
                    <p><small>Try adjusting your mission type or difficulty settings.</small></p>
                    {hardModeFilter === true && (
                        <p><small>💡 Hard mode fissures are rare - try "All Modes" to see more results.</small></p>
                    )}
                </div>
            )}

            <footer className="footer">
                <small>
                    Auto-refreshing • Last updated: {new Date().toLocaleTimeString()}
                    <br />
                    💡 Tip: Enable browser notifications to get alerts when new fissures appear
                </small>
            </footer>
        </div>
    );
}

// Optimized FissureCard component to prevent unnecessary re-renders
const FissureCard = React.memo(({ fissure }) => (
    <div className={`fissure-card ${fissure.isHard ? 'hard-mode' : ''}`}>
        <div className="fissure-header">
            <h3>{fissure.missionType}</h3>
            {fissure.isHard && <span className="hard-badge">🔥 HARD</span>}
            {fissure.isStorm && <span className="storm-badge">⚡ STORM</span>}
        </div>
        <div className="fissure-details">
            <p><strong>Node:</strong> {fissure.node}</p>
            <p><strong>Tier:</strong> {fissure.tier}</p>
            <p><strong>Time Remaining:</strong> {fissure.eta}</p>
            <p><strong>Enemy:</strong> {fissure.enemy}</p>
            {fissure.expired && <p className="expired-text">⚠️ Expired</p>}
        </div>
    </div>
));

FissureCard.displayName = 'FissureCard';

export default LongPollingFissures;