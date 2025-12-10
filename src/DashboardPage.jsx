import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [score, setScore] = useState(null);
    const [samples, setSamples] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 10;
    const [wsConnected, setWsConnected] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const [shootFlash, setShootFlash] = useState(false);
    const wsRef = useRef(null);
    const imgBlobUrlRef = useRef(null);

    const apiBase = 'http://localhost:8080';

    // helper: local YYYY-MM-DD string (avoids UTC shift from toISOString)
    const toLocalDateString = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    // use local date string for querying the backend
    const dateQuery = useMemo(() => toLocalDateString(selectedDate), [selectedDate]);

    useEffect(() => {
        let cancelled = false;
        async function loadScoreAndSamples() {
            try {
                const resp = await axios.get(`${apiBase}/score/`, { params: { date: dateQuery } });
                const data = resp?.data?.data || null; // message, success, data
                if (cancelled) return;
                setScore(data);
                if (data?.id) {
                    const sampResp = await axios.get(`${apiBase}/sample/score/${data.id}`);
                    const sampData = sampResp?.data?.data || [];
                    if (!cancelled) {
                        const safeData = Array.isArray(sampData) ? sampData : [];
                        setSamples(safeData);
                        setCurrentPage(1); // reset when data changes
                    }
                } else {
                    setSamples([]);
                    setCurrentPage(1);
                }
            } catch (e) {
                // minimal error handling
                setScore(null);
                setSamples([]);
            }
        }
        loadScoreAndSamples();
        return () => {
            cancelled = true;
        };
    }, [dateQuery]);

    useEffect(() => {
        return () => {
            // cleanup image blob URL and ws on unmount
            if (imgBlobUrlRef.current) URL.revokeObjectURL(imgBlobUrlRef.current);
            if (wsRef.current) {
                try { wsRef.current.close(); } catch { }
            }
        };
    }, []);

    const connectWs = () => {
        if (wsRef.current) return;
        try {
            const ws = new WebSocket('ws://localhost:8080');
            ws.binaryType = 'blob'; // ensure blob payloads like the working snippet
            wsRef.current = ws;
            ws.onopen = () => {
                setWsConnected(true);
                try { ws.send('client'); } catch { }
            };
            ws.onmessage = (event) => {
                // const data = evt.data;
                // if (data instanceof Blob) {
                console.log('received image blob via ws');
                try {
                    if (imgBlobUrlRef.current) URL.revokeObjectURL(imgBlobUrlRef.current);
                    const url = URL.createObjectURL(event.data);
                    imgBlobUrlRef.current = url;
                    setImageUrl(url);
                } catch (error) {
                    console.error('Error decoding image:', error);
                }
                // }
            };
            ws.onerror = () => {
                // minimal
            };
            ws.onclose = () => {
                setWsConnected(false);
                wsRef.current = null;
            };
        } catch {
            // minimal
        }
    };

    const disconnectWs = () => {
        if (wsRef.current) {
            try { wsRef.current.close(); } catch { }
            wsRef.current = null;
        }
    };

    const handleShoot = async () => {
        try {
            const resp = await axios.get(`${apiBase}/image/shoot`);
            const success = !!resp?.data?.success;
            if (success) {
                setShootFlash(true);
                setTimeout(() => setShootFlash(false), 200);
            }
        } catch {
            // minimal
        }
    };

    const setDateFromInput = (e) => {
        const val = e.target.value; // yyyy-mm-dd
        if (!val) return;
        const parts = val.split('-');
        if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            d.setHours(0, 0, 0, 0);
            setSelectedDate(d);
        }
    };

    const dirtySample = (score?.total_sample || 0) - (score?.clean_sample || 0);

    // keep page within bounds when samples change
    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(samples.length / perPage));
        if (currentPage > totalPages) setCurrentPage(totalPages);
    }, [samples, currentPage, perPage]);

    const paginatedSamples = useMemo(() => {
        const start = (currentPage - 1) * perPage;
        return samples.slice(start, start + perPage);
    }, [samples, currentPage, perPage]);

    const totalPages = Math.max(1, Math.ceil(samples.length / perPage));

    return (
        <div className="min-h-screen bg-white" style={{ fontFamily: 'Arial, sans-serif', color: '#1f2937' }}>
            {/* Page Title */}
            <header className="px-6 py-4 border-b">
                <h1 className="text-2xl font-semibold" style={{ color: '#628141' }}>Dapurate</h1>
                <p className="text-sm text-gray-600">Live monitoring and sampling overview</p>
            </header>

            <main className="p-6">
                {/* grid wrapper: two columns only when viewport >= 1440px */}
                <div className="grid grid-cols-1 min-[1440px]:grid-cols-2 gap-6 justify-items-center">
                    {/* Section 3: Date + Score */}
                    <section className="border rounded-lg p-4 w-full max-w-[720px] max-h-[360px] overflow-y-auto">
                        <h2 className="text-lg mb-3" style={{ fontFamily: 'Times New Roman, Times, serif', color: '#628141' }}>Score Summary</h2>
                        <div className="flex items-center gap-3 mb-4">
                            <label className="text-sm text-gray-700">Date</label>
                            <input
                                type="date"
                                className="border rounded px-3 py-1 focus:outline-none"
                                style={{ borderColor: '#C1E59F' }}
                                value={toLocalDateString(selectedDate)}
                                onChange={setDateFromInput}
                            />
                        </div>
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="text-7xl font-bold" style={{ color: '#628141' }}>
                                {score?.score ?? '-'}%
                            </div>
                            <div className="flex gap-6 justify-center text-base">
                                <div>
                                    <div className="text-gray-500">clean</div>
                                    <div className="font-semibold text-lg">{score?.clean_sample ?? 0}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">total</div>
                                    <div className="font-semibold text-lg">{score?.total_sample ?? 0}</div>
                                </div>
                                <div>
                                    <div className="text-gray-500">dirty</div>
                                    <div className="font-semibold text-lg">{dirtySample}</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 1: Livestream */}
                    <section className="border rounded-lg p-4 w-full max-w-[720px]">
                        <h2 className="text-lg mb-3" style={{ fontFamily: 'Times New Roman, Times, serif', color: '#628141' }}>Livestream</h2>
                        <div className="flex items-center gap-3 mb-3">
                            {!wsConnected ? (
                                <button
                                    onClick={connectWs}
                                    className="px-3 py-1 rounded text-white"
                                    style={{ backgroundColor: '#628141' }}
                                >
                                    click to connect
                                </button>
                            ) : (
                                <button
                                    onClick={disconnectWs}
                                    className="px-3 py-1 rounded text-white"
                                    style={{ backgroundColor: '#628141' }}
                                >
                                    click to disconnect
                                </button>
                            )}
                            <button
                                onClick={handleShoot}
                                className="px-3 py-1 rounded text-white"
                                style={{ backgroundColor: '#C1E59F', color: '#1f2937' }}
                            >
                                click to capture image & detect violation(s)
                            </button>
                        </div>

                        <div className="relative border rounded-lg h-64 flex items-center justify-center bg-gray-50 overflow-hidden">
                            {!imageUrl ? (
                                <span className="text-gray-400">no image detected</span>
                            ) : (
                                <img src={imageUrl} alt="live" className="object-contain w-full h-full" />
                            )}
                            {shootFlash && (
                                <div className="absolute inset-0 bg-white opacity-80 pointer-events-none transition-opacity duration-200"></div>
                            )}
                        </div>
                    </section>

                    {/* Section 2: Samples Table */}
                    <section className="border rounded-lg p-4 w-full max-w-[720px]">
                        <h2 className="text-lg mb-3" style={{ fontFamily: 'Times New Roman, Times, serif', color: '#628141' }}>Samples</h2>
                        {samples.length === 0 ? (
                            <div className="h-32 flex items-center justify-center text-gray-400">no image sampled yet</div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="text-left border-b">
                                                <th className="py-2 px-2">created at</th>
                                                <th className="py-2 px-2">clean?</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedSamples.map((s) => (
                                                <tr
                                                    key={s.id}
                                                    className="border-b hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => navigate(`/sample/${s.id}`)}
                                                >
                                                    <td className="py-2 px-2">
                                                        {new Date(s.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        {s.is_clean ? 'yes' : 'no'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex items-center justify-between mt-3 text-sm">
                                    <span>Page {currentPage} of {totalPages}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            className="px-3 py-1 border rounded disabled:opacity-50"
                                            disabled={currentPage === 1}
                                        >
                                            Prev
                                        </button>
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            className="px-3 py-1 border rounded disabled:opacity-50"
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                    {/* Section 4: Stats */}
                    <section className="border rounded-lg p-4 w-full max-w-[720px]">
                        <h2 className="text-lg mb-3" style={{ fontFamily: 'Times New Roman, Times, serif', color: '#628141' }}>Statistics</h2>
                        <div className="h-40 flex items-center justify-center text-gray-400">on progress</div>
                    </section>
                </div>
            </main>
        </div>
    );
}