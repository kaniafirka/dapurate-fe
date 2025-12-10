import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

export default function SamplePage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [rawUrl, setRawUrl] = useState(null);
    const [resultUrl, setResultUrl] = useState(null);
    const [violations, setViolations] = useState([]);
    const [sample, setSample] = useState(null);
    const [loading, setLoading] = useState(true);

    const rawRef = useRef(null);
    const resultRef = useRef(null);

    const apiBase = 'http://localhost:8080';

    const fetchRaw = async () => {
        try {
            const resp = await axios.get(`${apiBase}/image/raw/${id}`, { responseType: 'blob' });
            if (rawRef.current) URL.revokeObjectURL(rawRef.current);
            const url = URL.createObjectURL(resp.data);
            rawRef.current = url;
            setRawUrl(url);
        } catch {
            setRawUrl(null);
        }
    };

    const fetchResult = async () => {
        try {
            const resp = await axios.get(`${apiBase}/image/result/${id}`, { responseType: 'blob' });
            if (resultRef.current) URL.revokeObjectURL(resultRef.current);
            const url = URL.createObjectURL(resp.data);
            resultRef.current = url;
            setResultUrl(url);
        } catch {
            setResultUrl(null);
        }
    };

    const fetchViolations = async () => {
        try {
            const resp = await axios.get(`${apiBase}/violation/sample/${id}`);
            const data = Array.isArray(resp?.data?.data) ? resp.data.data : [];
            setViolations(data);
        } catch {
            setViolations([]);
        }
    };

    const fetchSample = async () => {
        try {
            const resp = await axios.get(`${apiBase}/sample/${id}`);
            setSample(resp?.data?.data || null);
        } catch {
            setSample(null);
        }
    };

    const loadAll = async () => {
        setLoading(true);
        await Promise.all([fetchRaw(), fetchResult(), fetchViolations(), fetchSample()]);
        setLoading(false);
    };

    useEffect(() => {
        loadAll();
        return () => {
            if (rawRef.current) URL.revokeObjectURL(rawRef.current);
            if (resultRef.current) URL.revokeObjectURL(resultRef.current);
        };
    }, [id]);

    const formatName = (str) => {
        if (!str) return '-';
        const spaced = str.replace(/_/g, ' ');
        return spaced.charAt(0).toUpperCase() + spaced.slice(1);
    };

    const formatKey = (k) => formatName(k);

    const handleToggleClean = async () => {
        if (!sample) return;
        try {
            await axios.put(`${apiBase}/sample/${id}`, { is_clean: !sample.is_clean });
            await loadAll();
        } catch {
            // minimal
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`${apiBase}/sample/${id}`);
            navigate('/');
        } catch {
            // minimal
        }
    };

    const toggleLabel = sample?.is_clean ? 'This sample is actually dirty' : 'This sample is actually clean';

    return (
        <div className="min-h-screen bg-white" style={{ fontFamily: 'Arial, sans-serif', color: '#1f2937' }}>
            <header className="px-6 py-4 border-b">
                <h1 className="text-2xl font-semibold" style={{ color: '#628141' }}>Dapurate</h1>
                <p className="text-sm text-gray-600">Sample Detail & Violations</p>
            </header>

            <main className="p-6">
                <div className="grid grid-cols-1 min-[1440px]:grid-cols-2 gap-6 justify-items-center">
                    {/* Section 1: Raw Image */}
                    <section className="border rounded-lg p-4 w-full max-w-[720px] bg-white">
                        <h2 className="text-lg mb-3" style={{ fontFamily: 'Times New Roman, Times, serif', color: '#628141' }}>Raw Image</h2>
                        <div className="relative border rounded-lg h-64 flex items-center justify-center bg-gray-50 overflow-hidden">
                            {rawUrl ? (
                                <img src={rawUrl} alt="raw" className="object-contain w-full h-full" />
                            ) : (
                                <span className="text-gray-400">{loading ? 'loading...' : 'no image'}</span>
                            )}
                        </div>
                    </section>

                    {/* Section 2: Result Image */}
                    <section className="border rounded-lg p-4 w-full max-w-[720px] bg-white">
                        <h2 className="text-lg mb-3" style={{ fontFamily: 'Times New Roman, Times, serif', color: '#628141' }}>Detection Result</h2>
                        <div className="relative border rounded-lg h-64 flex items-center justify-center bg-gray-50 overflow-hidden">
                            {resultUrl ? (
                                <img src={resultUrl} alt="result" className="object-contain w-full h-full" />
                            ) : (
                                <span className="text-gray-400">{loading ? 'loading...' : 'no image'}</span>
                            )}
                        </div>
                    </section>

                    {/* Section 3: Violations */}
                    <section className="border rounded-lg p-4 w-full max-w-[720px] bg-white">
                        <h2 className="text-lg mb-3" style={{ fontFamily: 'Times New Roman, Times, serif', color: '#628141' }}>Violations</h2>
                        {violations.length === 0 ? (
                            <div className="h-32 flex items-center justify-center text-gray-400">no violations</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b">
                                            <th className="py-2 px-2">name</th>
                                            <th className="py-2 px-2">total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {violations.map((v) => (
                                            <tr key={v.id} className="border-b">
                                                <td className="py-2 px-2">{formatName(v.name)}</td>
                                                <td className="py-2 px-2">{v.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Section 4: Sample Data */}
                    <section className="border rounded-lg p-4 w-full max-w-[720px] bg-white">
                        <h2 className="text-lg mb-3" style={{ fontFamily: 'Times New Roman, Times, serif', color: '#628141' }}>Sample Data</h2>
                        {!sample ? (
                            <div className="h-32 flex items-center justify-center text-gray-400">loading...</div>
                        ) : (
                            <div className="space-y-2 text-sm">
                                {Object.entries(sample).map(([k, v]) => (
                                    <div key={k} className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-700">{formatKey(k)}:</span>
                                        <span>{String(v)}</span>
                                    </div>
                                ))}
                                <div className="flex gap-3 pt-3">
                                    <button
                                        onClick={handleToggleClean}
                                        className="px-3 py-1 rounded text-white"
                                        style={{ backgroundColor: '#628141' }}
                                    >
                                        {toggleLabel}
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="px-3 py-1 rounded text-white"
                                        style={{ backgroundColor: '#c53030' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
