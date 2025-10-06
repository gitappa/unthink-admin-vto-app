import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Helper components (unchanged)
const BotAvatar = () => (
    <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex-shrink-0 flex items-center justify-center font-bold text-lg shadow-md">
        🤖
    </div>
);

const TryOnDisplay = ({ step }) => {
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setUploadedImageUrl(imageUrl);
        }
    };

    return (
        <div className="mt-4 flex flex-col gap-6">
            <div>
                <h4 className="font-semibold text-gray-700 text-sm mb-2">1. Your Photo</h4>
                <label
                    htmlFor="file-upload"
                    className="cursor-pointer w-full aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors duration-200 overflow-hidden p-4 text-center"
                >
                    {uploadedImageUrl ? (
                        <img src={uploadedImageUrl} alt="Your photo" className="w-full h-full object-cover rounded-md" />
                    ) : (
                        <>
                            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            <span className="font-semibold text-indigo-600 text-sm">Upload a Photo</span>
                            <span className="text-xs text-gray-500 mt-1">Tap here to select an image</span>
                        </>
                    )}
                </label>
                <input id="file-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </div>
            <div>
                <h4 className="font-semibold text-gray-700 text-sm mb-3">2. Try-On Items</h4>
                <div className="grid grid-cols-4 gap-3">
                    {(step.tryOnItems || []).map(item => (
                        <div key={item.id} className="text-center">
                            <div className="w-full aspect-square border border-gray-200 rounded-xl flex items-center justify-center bg-white overflow-hidden shadow-sm">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-xs text-gray-400 px-1">No Image</span>
                                )}
                            </div>
                            <p className="text-xs mt-1.5 text-gray-600 font-medium truncate">{item.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


export default function EventPage() {
    const { event_id } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [displayedSteps, setDisplayedSteps] = useState([]);
    const mainContentRef = useRef(null);

    // --- Data Fetching and State Management (unchanged) ---
    useEffect(() => {
        const fetchEvent = async () => {
            if (!event_id) {
                setError('No event ID provided.');
                setLoading(false);
                return;
            }
            try {
                const q = query(collection(db, 'event_template'), where('event_id', '==', event_id));
                const querySnapshot = await getDocs(q);
                if (querySnapshot.empty) {
                    setError('Event not found.');
                } else {
                    const eventData = querySnapshot.docs[0].data();
                    eventData.steps.sort((a, b) => a.order - b.order);
                    setEvent({ id: querySnapshot.docs[0].id, ...eventData });
                }
            } catch (err) {
                setError('Failed to fetch event data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [event_id]);

    useEffect(() => {
        if (event && event.steps.length > 0) {
            setDisplayedSteps([event.steps[0]]);
        }
    }, [event]);

    useEffect(() => {
        if (mainContentRef.current) {
            mainContentRef.current.scrollTop = mainContentRef.current.scrollHeight;
        }
    }, [displayedSteps]);

    const handleNextStep = () => {
        if (event && currentStepIndex < event.steps.length - 1) {
            const nextStepIndex = currentStepIndex + 1;
            setCurrentStepIndex(nextStepIndex);
            setTimeout(() => {
                setDisplayedSteps(prev => [...prev, event.steps[nextStepIndex]]);
            }, 300);
        }
    };

    // --- Conditional Rendering for Page States (unchanged) ---
    if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50 text-gray-700">Loading...</div>;
    if (error) return <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-red-600 p-4 text-center">{error}</div>;
    if (!event) return <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-gray-600 p-4 text-center">Event Not Found</div>;

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans antialiased">
            <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 p-4 text-center sticky top-0 z-10">
                <h1 className="text-lg font-bold text-gray-800">{event.name}</h1>
            </header>

            <main ref={mainContentRef} className="flex-1 overflow-y-auto p-4">
                {/* MODIFIED: Reduced bottom padding as fixed footer is removed */}
                <div className="space-y-6 max-w-md mx-auto pb-20">
                    {displayedSteps.map((step, index) => (
                        <div key={index} className="flex items-start gap-3 animate-fade-in">
                            <BotAvatar />
                            <div className="bg-white rounded-xl rounded-tl-none p-4 shadow-md border border-gray-100 w-full">
                                <p className="font-semibold text-gray-800 text-base leading-snug">{step.title || step.prompt}</p>
                                {step.description && <p className="text-gray-600 mt-1 text-sm leading-relaxed">{step.description}</p>}
                                {step.type === 'TRY_ON' && <TryOnDisplay step={step} />}

                                {/* --- MODIFIED: Button is now inside the message box --- */}
                                {step.buttonText && currentStepIndex === index && (
                                    <button
                                        onClick={handleNextStep}
                                        className="mt-6 w-full bg-indigo-600 text-blue px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all duration-300 transform active:scale-95"
                                    >
                                        {step.buttonText}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}