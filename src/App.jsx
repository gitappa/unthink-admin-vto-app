import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { collection, onSnapshot, query, orderBy, limit, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

console.log('db', db._databaseId);
// --- Mock Data & Constants ---
const MOCK_CAMPAIGNS = [
    {
        id: 'campaign1',
        name: 'Summer Sale 2024',
        budget: 5000,
        journeyTemplateId: 'journey1',
        rewardCriteria: [
            { id: 'rc1', action: 'UGC_CREATION', rewardType: 'PERCENTAGE', rewardValue: 10, actionCount: 1 },
            { id: 'rc2', action: 'WISHLIST_ADD', rewardType: 'POINTS', rewardValue: 50, actionCount: 3 },
        ],
        alerts: {
            lowBudgetThreshold: 500,
            notifyOnHighValueUGC: true,
            actionThresholds: [
                { id: 'at1', action: 'WISHLIST_ADD', threshold: 100 },
            ],
        },
        createdAt: new Date(),
    },
    {
        id: 'campaign2',
        name: 'Winter Collection Launch',
        budget: 10000,
        journeyTemplateId: null,
        rewardCriteria: [
            { id: 'rc3', action: 'SOCIAL_SHARE', rewardType: 'FIXED_AMOUNT', rewardValue: 5, actionCount: 1 },
        ],
        alerts: {
            lowBudgetThreshold: 1000,
            notifyOnHighValueUGC: false,
            actionThresholds: [],
        },
        createdAt: new Date(),
    },
];

const MOCK_EVENT_TEMPLATES = [
    {
        id: 'event1',
        name: 'Standard VTO Flow',
        steps: [
            { id: 's1', type: 'WELCOME_SCREEN', title: 'Welcome to the Summer Event!', description: 'Complete the steps to earn an exclusive discount.', buttonText: 'Let\'s Go!' },
            { id: 's2', type: 'ACTION_VTO', prompt: 'Try on our new sunglasses collection.', description: 'Upload a photo of yourself to begin.', personImageUrl: null, tryOnItems: [{id: 'toi1', name: 'Aviator Sunglasses', imageUrl: null}], buttonText: 'Next Step' },
            { id: 's3', type: 'ACTION_SHOWCASE', prompt: 'Share your look!', description: 'Add your favorite try-on photo to our showcase gallery.', buttonText: 'Share Now' },
            { id: 's4', type: 'THANK_YOU_SCREEN', title: 'Thank You!', description: 'Your coupon is on its way to your inbox.' },
        ],
        createdAt: new Date(),
    }
];

const MOCK_ACTION_RULES = [
    {
        id: 'rule1',
        name: 'Wishlist Follow-up',
        trigger: { type: 'WISHLIST_ADD', count: 1 },
        action: { type: 'SEND_IN_APP_MESSAGE', payload: { title: 'Saved!', message: 'Thanks for adding an item to your wishlist. Here\'s a special offer!' } },
        createdAt: new Date(),
    },
    {
        id: 'rule2',
        name: 'Reward for Sharing',
        trigger: { type: 'SOCIAL_SHARE', count: 1 },
        action: { type: 'SEND_COUPON', payload: { couponCode: 'SHARE15' } },
        createdAt: new Date(),
    },
];

// MOCK_ALERTS removed - now using real Firestore data

const MOCK_STATS_DATA = [
    { date: new Date(Date.now() - 6 * 86400000), name: new Date(Date.now() - 6 * 86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'}), registrations: 30, wishlists: 50, tryOns: 120, ugc: 10 },
    { date: new Date(Date.now() - 5 * 86400000), name: new Date(Date.now() - 5 * 86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'}), registrations: 45, wishlists: 65, tryOns: 150, ugc: 15 },
    { date: new Date(Date.now() - 4 * 86400000), name: new Date(Date.now() - 4 * 86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'}), registrations: 40, wishlists: 80, tryOns: 180, ugc: 20 },
    { date: new Date(Date.now() - 3 * 86400000), name: new Date(Date.now() - 3 * 86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'}), registrations: 60, wishlists: 95, tryOns: 210, ugc: 25 },
    { date: new Date(Date.now() - 2 * 86400000), name: new Date(Date.now() - 2 * 86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'}), registrations: 55, wishlists: 110, tryOns: 240, ugc: 22 },
    { date: new Date(Date.now() - 1 * 86400000), name: new Date(Date.now() - 1 * 86400000).toLocaleDateString('en-US',{month:'short',day:'numeric'}), registrations: 75, wishlists: 130, tryOns: 280, ugc: 30 },
    { date: new Date(), name: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric'}), registrations: 80, wishlists: 150, tryOns: 300, ugc: 35 },
];


// --- Icon Components ---
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2.4l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2.4l.15.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const DollarSignIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
const GiftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>;
const AlertTriangleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
const PlusCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const Trash2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const LayoutDashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>;
const BellIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
const RouteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" /><circle cx="18" cy="5" r="3" /></svg>;
const ChevronUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const ZapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
const BarChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
const LayersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>;


const ACTION_TYPES = { UGC_CREATION: "Add to showcase collection", WISHLIST_ADD: "Add to Wishlist", REFERRAL: "User Referral", SOCIAL_SHARE: "Social Media Share", FEEDBACK: "Provide Feedback" };
const REWARD_TYPES = { PERCENTAGE: "Percentage Discount", FIXED_AMOUNT: "Fixed Amount Discount", FREE_ITEM: "Free Item", POINTS: "Loyalty Points" };
const EVENT_STEP_TYPES = { WELCOME_SCREEN: "Welcome Screen", ACTION_VTO: "Virtual Try-On", ACTION_SHOWCASE: "Add to Showcase", ACTION_WISHLIST: "Add to Wishlist", THANK_YOU_SCREEN: "Thank You Screen" };
const RULE_ACTION_TYPES = { SEND_IN_APP_MESSAGE: "Send In-App Message", SEND_COUPON: "Send Coupon", SEND_EMAIL: "Send Email", SEND_HCS_PERMISSION_REQUEST: "Send HCS Permission Request", SEND_HCS_20_TOKEN: "Send HTS-20 Token" };


export default function App() {
    const [currentView, setCurrentView] = useState('config');
    const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);
    const [selectedCampaign, setSelectedCampaign] = useState(MOCK_CAMPAIGNS[0]);

    const handleAddNewCampaign = () => {
        const newCampaign = {
            id: `campaign${Date.now()}`,
            name: `New Campaign ${new Date().toLocaleDateString()}`,
            budget: 1000,
            rewardCriteria: [{ id: crypto.randomUUID(), action: 'UGC_CREATION', rewardType: 'PERCENTAGE', rewardValue: 10, actionCount: 1 }],
            alerts: { lowBudgetThreshold: 100, notifyOnHighValueUGC: false, actionThresholds: [] },
            journeyTemplateId: null,
            createdAt: new Date(),
        };
        setCampaigns(prev => [...prev, newCampaign]);
        setSelectedCampaign(newCampaign);
        setCurrentView('config');
    };
    
    const handleUpdateCampaign = (updatedCampaign) => {
        setCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c));
        setSelectedCampaign(updatedCampaign);
    };

    return (
        <div className="flex h-screen w-full bg-gray-100 font-sans">
            <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col">
                <div className="flex items-center space-x-2 mb-6"><div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><SettingsIcon /></div><h2 className="text-xl font-bold text-gray-800">VTO Config</h2></div>
                <nav className="flex-1 space-y-4">
                    <div>
                         <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Views</h3>
                         <ul className="space-y-1">
                            <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('config'); }} className={`flex items-center space-x-3 p-2 rounded-lg text-sm font-medium ${currentView === 'config' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><LayoutDashboardIcon /> <span>Campaigns</span></a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('stats'); }} className={`flex items-center space-x-3 p-2 rounded-lg text-sm font-medium ${currentView === 'stats' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><BarChartIcon /> <span>Stats</span></a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('event-templates'); }} className={`flex items-center space-x-3 p-2 rounded-lg text-sm font-medium ${currentView === 'event-templates' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><RouteIcon /> <span>Event Templates</span></a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('actions'); }} className={`flex items-center space-x-3 p-2 rounded-lg text-sm font-medium ${currentView === 'actions' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><ZapIcon /> <span>Actions</span></a></li>
                            <li><a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('alerts'); }} className={`flex items-center space-x-3 p-2 rounded-lg text-sm font-medium ${currentView === 'alerts' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}><BellIcon /> <span>Alerts Inbox</span></a></li>
                         </ul>
                    </div>
                    {(currentView === 'config' || currentView === 'stats') && (
                    <div>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pt-4 border-t">Campaigns</h3>
                        <ul className="space-y-1">{campaigns.map(c => <li key={c.id}><a href="#" onClick={(e) => { e.preventDefault(); setSelectedCampaign(c); }} className={`block p-2 rounded-lg text-sm font-medium ${selectedCampaign?.id === c.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{c.name}</a></li>)}</ul>
                    </div>
                    )}
                </nav>
                <div className="mt-auto"><button onClick={handleAddNewCampaign} className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700"><PlusCircleIcon /><span>New Campaign</span></button></div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto">
                {currentView === 'config' && (selectedCampaign ? <ConfigDashboard campaign={selectedCampaign} onSave={handleUpdateCampaign} /> : <div className="text-center text-gray-500"><h2>No Campaign Selected</h2><p>Select or create a new campaign.</p></div>)}
                {currentView === 'stats' && (selectedCampaign ? <StatsDashboard campaign={selectedCampaign} /> : <div className="text-center text-gray-500"><h2>No Campaign Selected</h2><p>Select a campaign to view its stats.</p></div>)}
                {currentView === 'alerts' && <AlertsInbox />}
                {currentView === 'event-templates' && <EventTemplateBuilder />}
                {currentView === 'actions' && <ActionsBuilder />}
            </main>
        </div>
    );
}

function StatsDashboard({ campaign }) {
    const [statsData, setStatsData] = useState(MOCK_STATS_DATA);

    const simulateData = () => {
        alert('Simulating 7 days of data for this campaign...');
        const newData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            newData.push({
                date: date,
                name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                registrations: Math.floor(Math.random() * 50) + 10 * (7 - i),
                wishlists: Math.floor(Math.random() * 100) + 20 * (7 - i),
                tryOns: Math.floor(Math.random() * 200) + 50 * (7 - i),
                ugc: Math.floor(Math.random() * 20) + 5 * (7 - i),
            });
        }
        setStatsData(newData);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Campaign Analytics</h2>
                    <p className="text-gray-500">Showing results for: <span className="font-semibold text-indigo-600">{campaign.name}</span></p>
                </div>
                <button onClick={simulateData} className="bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300">Simulate Data</button>
            </div>

            {statsData.length === 0 ? (
                <div className="text-center text-gray-500 bg-white p-12 rounded-xl border">
                    <BarChartIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No stats available</h3>
                    <p className="mt-1 text-sm text-gray-500">Simulate data to see the charts.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <StatCard title="User Registrations">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={statsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="registrations" stroke="#8884d8" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </StatCard>
                     <StatCard title="Wishlists Created">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={statsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="wishlists" stroke="#82ca9d" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </StatCard>
                     <StatCard title="Virtual Try-Ons">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={statsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="tryOns" name="Try-Ons" stroke="#ffc658" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </StatCard>
                     <StatCard title="Showcase Additions (UGC)">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={statsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="ugc" name="UGC" stroke="#ff8042" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </StatCard>
                </div>
            )}
        </div>
    );
}
function StatCard({ title, children }) {
    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            {children}
        </div>
    );
}

function ActionsBuilder() {
    const [rules, setRules] = useState(MOCK_ACTION_RULES);
    const [selectedRule, setSelectedRule] = useState(MOCK_ACTION_RULES[0]);
    const [formData, setFormData] = useState(MOCK_ACTION_RULES[0]);

    useEffect(() => { setFormData(selectedRule); }, [selectedRule]);
    
    const handleSelectRule = (r) => setSelectedRule(r);
    
    const handleAddNewRule = () => {
        const newR = { id: `rule${Date.now()}`, name: `New Rule ${new Date().toLocaleDateString()}`, trigger: { type: 'WISHLIST_ADD', count: 1 }, action: { type: 'SEND_IN_APP_MESSAGE', payload: { title: 'New Message', message: 'Hello!' } }, createdAt: new Date() };
        setRules(p => [...p, newR]);
        setSelectedRule(newR);
    };

    const handleSaveRule = () => {
        setRules(p => p.map(r => r.id === formData.id ? formData : r));
        alert("Rule saved!");
    };
    
    const handleDeleteRule = (id) => {
        if (!id) return;
        setRules(p => p.filter(r => r.id !== id));
        setSelectedRule(rules.find(r => r.id !== id) || null);
    }
    
    const handleFormChange = (sec, f, v) => setFormData(p => ({ ...p, [sec]: { ...p[sec], [f]: v } }));
    
    const handleActionTypeChange = (newType) => {
        let payload = {};
        if (newType === 'SEND_IN_APP_MESSAGE') payload = { title: 'New Message', message: 'Hello!' };
        else if (newType === 'SEND_COUPON') payload = { couponCode: 'NEWCOUPON' };
        else if (newType === 'SEND_EMAIL') payload = { subject: 'A message for you', body: 'Hi there,' };
        else if (newType === 'SEND_HCS_PERMISSION_REQUEST') payload = { topicId: '', memo: 'UGC Permission Request for [contentId]' };
        else if (newType === 'SEND_HCS_20_TOKEN') payload = { tokenId: '', amount: 1 };
        setFormData(p => ({ ...p, action: { type: newType, payload } }));
    };
    
    return (
        <div className="flex h-full">
            <div className="w-64 bg-white p-4 rounded-l-xl border-r flex flex-col">
                <h2 className="text-lg font-bold mb-4">Action Rules</h2>
                <ul className="space-y-1 flex-1">{rules.map(r => <li key={r.id}><a href="#" onClick={(e) => { e.preventDefault(); handleSelectRule(r); }} className={`block p-2 text-sm rounded-lg ${selectedRule?.id === r.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100'}`}>{r.name}</a></li>)}</ul>
                <button onClick={handleAddNewRule} className="w-full flex items-center justify-center space-x-2 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300"><PlusCircleIcon /><span>New Rule</span></button>
            </div>
            <div className="flex-1 p-6 bg-white rounded-r-xl">
            {formData ? (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <input type="text" value={formData.name || ''} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} className="text-2xl font-bold bg-transparent focus:border-indigo-500 outline-none border-b-2"/>
                        <div className="flex items-center space-x-2">
                             <button onClick={() => handleDeleteRule(formData.id)} className="text-red-600 hover:text-red-800 font-semibold py-2 px-4 rounded-lg">Delete</button>
                            <button onClick={handleSaveRule} className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700">Save Rule</button>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-semibold text-lg mb-2">When this happens... (Trigger)</h3>
                            <div className="flex items-center space-x-4">
                                <span>When a user performs</span>
                                <select value={formData.trigger?.type} onChange={e => handleFormChange('trigger', 'type', e.target.value)} className="p-2 border rounded-md">{Object.entries(ACTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                                <span>this many times:</span>
                                 <input type="number" min="1" value={formData.trigger?.count || 1} onChange={e => handleFormChange('trigger', 'count', parseInt(e.target.value, 10) || 1)} className="w-24 p-2 border rounded-md"/>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-semibold text-lg mb-2">Do this... (Action)</h3>
                             <div className="space-y-4">
                                <select value={formData.action?.type} onChange={e => handleActionTypeChange(e.target.value)} className="p-2 border rounded-md">{Object.entries(RULE_ACTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                                {formData.action?.type === 'SEND_IN_APP_MESSAGE' && (
                                    <div className="pl-4 border-l-4 border-indigo-300 space-y-2">
                                        <input type="text" placeholder="Message Title" value={formData.action.payload?.title || ''} onChange={e => handleFormChange('action', 'payload', {...formData.action.payload, title: e.target.value})} className="w-full p-2 border rounded-md"/>
                                        <textarea placeholder="Message Body" value={formData.action.payload?.message || ''} onChange={e => handleFormChange('action', 'payload', {...formData.action.payload, message: e.target.value})} className="w-full p-2 border rounded-md" rows="3"/>
                                    </div>
                                )}
                                {formData.action?.type === 'SEND_COUPON' && (
                                     <div className="pl-4 border-l-4 border-indigo-300 space-y-2">
                                        <input type="text" placeholder="Enter Coupon Code" value={formData.action.payload?.couponCode || ''} onChange={e => handleFormChange('action', 'payload', {...formData.action.payload, couponCode: e.target.value})} className="w-full p-2 border rounded-md"/>
                                     </div>
                                )}
                                {formData.action?.type === 'SEND_EMAIL' && (
                                     <div className="pl-4 border-l-4 border-indigo-300 space-y-2">
                                        <input type="text" placeholder="Email Subject" value={formData.action.payload?.subject || ''} onChange={e => handleFormChange('action', 'payload', {...formData.action.payload, subject: e.target.value})} className="w-full p-2 border rounded-md"/>
                                        <textarea placeholder="Email Body" value={formData.action.payload?.body || ''} onChange={e => handleFormChange('action', 'payload', {...formData.action.payload, body: e.target.value})} className="w-full p-2 border rounded-md" rows="3"/>
                                     </div>
                                )}
                                {formData.action?.type === 'SEND_HCS_PERMISSION_REQUEST' && (
                                     <div className="pl-4 border-l-4 border-green-300 space-y-2">
                                        <p className="text-sm text-gray-600 flex items-center space-x-2"><LayersIcon /><span>Send a verifiable permission request using Hedera Consensus Service.</span></p>
                                        <input type="text" placeholder="Hedera Topic ID" value={formData.action.payload?.topicId || ''} onChange={e => handleFormChange('action', 'payload', {...formData.action.payload, topicId: e.target.value})} className="w-full p-2 border rounded-md"/>
                                        <textarea placeholder="Transaction Memo" value={formData.action.payload?.memo || ''} onChange={e => handleFormChange('action', 'payload', {...formData.action.payload, memo: e.target.value})} className="w-full p-2 border rounded-md" rows="2"/>
                                     </div>
                                )}
                                {formData.action?.type === 'SEND_HCS_20_TOKEN' && (
                                     <div className="pl-4 border-l-4 border-blue-300 space-y-2">
                                        <p className="text-sm text-gray-600 flex items-center space-x-2"><GiftIcon /><span>Reward the user with a Hedera Token Service HTS-20 token.</span></p>
                                        <input type="text" placeholder="Token ID (e.g., 0.0.12345)" value={formData.action.payload?.tokenId || ''} onChange={e => handleFormChange('action', 'payload', {...formData.action.payload, tokenId: e.target.value})} className="w-full p-2 border rounded-md"/>
                                        <input type="number" min="1" placeholder="Token Amount" value={formData.action.payload?.amount || 1} onChange={e => handleFormChange('action', 'payload', {...formData.action.payload, amount: parseInt(e.target.value, 10) || 1})} className="w-full p-2 border rounded-md"/>
                                     </div>
                                )}
                             </div>
                        </div>
                    </div>
                </>
            ) : (<div className="text-center text-gray-500">Select or create an action rule.</div>)}
            </div>
        </div>
    );
}

function EventTemplateBuilder() {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Set up real-time listener for Firestore event_template collection
        const templatesCollection = collection(db, 'event_template');
        const q = query(templatesCollection, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const templatesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTemplates(templatesData);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching event templates:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        setFormData(selectedTemplate);
    }, [selectedTemplate]);

    const handleSelectTemplate = (t) => setSelectedTemplate(t);

    const handleAddNewTemplate = async () => {
        const newTemplate = {
            name: `New Event Template ${new Date().toLocaleDateString()}`,
            steps: [{ 
                id: crypto.randomUUID(), 
                type: 'WELCOME_SCREEN', 
                title: 'Welcome!', 
                description: 'Follow the steps to earn rewards.', 
                buttonText: 'Get Started' 
            }],
            createdAt: new Date()
        };
        
        try {
            const docRef = await addDoc(collection(db, 'event_template'), newTemplate);
            const templateWithId = { id: docRef.id, ...newTemplate };
            setTemplates(prev => [templateWithId, ...prev]);
            setSelectedTemplate(templateWithId);
        } catch (error) {
            console.error('Error adding new template:', error);
        }
    };

    const handleSaveTemplate = async () => {
        if (!formData || !formData.id) return;
        
        try {
            const templateRef = doc(db, 'event_template', formData.id);
            await updateDoc(templateRef, {
                name: formData.name,
                steps: formData.steps,
                updatedAt: new Date()
            });
            alert("Event template saved!");
        } catch (error) {
            console.error('Error saving template:', error);
            alert("Error saving template. Please try again.");
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!templateId) return;
        
        try {
            await deleteDoc(doc(db, 'event_template', templateId));
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            setSelectedTemplate(templates.find(t => t.id !== templateId) || null);
        } catch (error) {
            console.error('Error deleting template:', error);
            alert("Error deleting template. Please try again.");
        }
    };

    const handleStepChange = (id, f, v) => setFormData(p => ({ ...p, steps: p.steps.map(s => s.id === id ? { ...s, [f]: v } : s) }));

    const addStep = (type) => {
        let newStep = { id: crypto.randomUUID(), type, title: 'New Step Title', description: 'Add specific instructions for the user here.', buttonText: 'Next' };
        if (type.includes('ACTION')) { newStep.prompt = newStep.title; delete newStep.title; }
        if (type === 'ACTION_VTO') { newStep = { ...newStep, prompt: 'Upload your photo and select an item to try on.', personImageUrl: null, tryOnItems: [] }; }
        if (type === 'THANK_YOU_SCREEN') { delete newStep.buttonText; }
        setFormData(p => ({ ...p, steps: [...(p.steps || []), newStep] }));
    };

    const removeStep = (id) => setFormData(p => ({ ...p, steps: p.steps.filter(s => s.id !== id) }));

    const moveStep = (index, dir) => {
        const newSteps = [...formData.steps];
        const newIndex = index + dir;
        if (newIndex < 0 || newIndex >= newSteps.length) return;
        [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
        setFormData(p => ({ ...p, steps: newSteps }));
    };

    const handleImageChange = (stepId, imageType, file, tryOnItemId = null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;
            setFormData(p => {
                const newSteps = p.steps.map(step => {
                    if (step.id === stepId) {
                        if (imageType === 'person') return { ...step, personImageUrl: dataUrl };
                        if (imageType === 'tryOn' && tryOnItemId) {
                            const newTryOnItems = step.tryOnItems.map(item => item.id === tryOnItemId ? { ...item, imageUrl: dataUrl } : item );
                            return { ...step, tryOnItems: newTryOnItems };
                        }
                    }
                    return step;
                });
                return { ...p, steps: newSteps };
            });
        };
        reader.readAsDataURL(file);
    };

    const addTryOnItem = (stepId) => {
        setFormData(p => ({ ...p, steps: p.steps.map(step => {
                if (step.id === stepId && (!step.tryOnItems || step.tryOnItems.length < 2)) {
                    const newItem = { id: crypto.randomUUID(), name: `Item ${ (step.tryOnItems || []).length + 1}`, imageUrl: null };
                    return { ...step, tryOnItems: [...(step.tryOnItems || []), newItem] };
                }
                return step;
            })
        }));
    };

    const removeTryOnItem = (stepId, tryOnItemId) => {
        setFormData(p => ({ ...p, steps: p.steps.map(step => {
                if (step.id === stepId) return { ...step, tryOnItems: step.tryOnItems.filter(item => item.id !== tryOnItemId) };
                return step;
            })
        }));
    };
    
    const handleTryOnItemNameChange = (stepId, tryOnItemId, newName) => {
        setFormData(p => ({ ...p, steps: p.steps.map(step => {
                if (step.id === stepId) return { ...step, tryOnItems: step.tryOnItems.map(item => item.id === tryOnItemId ? { ...item, name: newName } : item) };
                return step;
            })
        }));
    };

    if (loading) {
        return (
            <div className="flex h-full">
                <div className="w-64 bg-white p-4 rounded-l-xl border-r flex flex-col">
                    <h2 className="text-lg font-bold mb-4">Event Templates</h2>
                    <div className="text-center text-gray-500">
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p>Loading templates...</p>
                    </div>
                </div>
                <div className="flex-1 p-6 bg-white rounded-r-xl">
                    <div className="text-center text-gray-500">
                        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full">
            <div className="w-64 bg-white p-4 rounded-l-xl border-r flex flex-col">
                <h2 className="text-lg font-bold mb-4">Event Templates</h2>
                <ul className="space-y-1 flex-1">{templates.map(t => <li key={t.id}><a href="#" onClick={(e) => { e.preventDefault(); handleSelectTemplate(t); }} className={`block p-2 text-sm rounded-lg ${selectedTemplate?.id === t.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100'}`}>{t.name}</a></li>)}</ul>
                <button onClick={handleAddNewTemplate} className="w-full flex items-center justify-center space-x-2 bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300"><PlusCircleIcon /><span>New Template</span></button>
            </div>
            <div className="flex-1 p-6 bg-white rounded-r-xl overflow-y-auto">
            {formData ? (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <input type="text" value={formData.name || ''} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} className="text-2xl font-bold bg-transparent focus:border-indigo-500 outline-none border-b-2"/>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => handleDeleteTemplate(formData.id)} className="text-red-600 hover:text-red-800 font-semibold py-2 px-4 rounded-lg">Delete</button>
                            <button onClick={handleSaveTemplate} className="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700">Save Template</button>
                        </div>
                    </div>
                    <div className="space-y-4">{formData.steps?.map((step, index) => (
                        <div key={step.id} className="bg-gray-50 p-4 rounded-lg border">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-indigo-700">{index + 1}. {EVENT_STEP_TYPES[step.type]}</span>
                                <div className="flex items-center space-x-1">
                                    <button onClick={() => moveStep(index, -1)} disabled={index === 0} className="p-1 disabled:opacity-30"><ChevronUpIcon/></button>
                                    <button onClick={() => moveStep(index, 1)} disabled={index === formData.steps.length - 1} className="p-1 disabled:opacity-30"><ChevronDownIcon/></button>
                                    <button onClick={() => removeStep(step.id)} className="p-1 text-red-500"><Trash2Icon/></button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <input type="text" placeholder="Title / Prompt" value={step.title || step.prompt || ''} onChange={e => handleStepChange(step.id, step.type.includes('ACTION') ? 'prompt' : 'title', e.target.value)} className="w-full p-1 border-b bg-transparent font-semibold" />
                                <textarea placeholder="Add specific instructions for the user..." value={step.description || ''} onChange={e => handleStepChange(step.id, 'description', e.target.value)} className="w-full p-1 border-b bg-transparent text-sm text-gray-600" rows="2" />
                                { 'buttonText' in step && <input type="text" placeholder="Button Text" value={step.buttonText} onChange={e => handleStepChange(step.id, 'buttonText', e.target.value)} className="w-full p-1 border-b bg-transparent text-sm" /> }
                                { step.type === 'ACTION_VTO' && (
                                    <div className="pt-4 mt-2 border-t space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Person's Photo</label>
                                            <ImageUpload imageUrl={step.personImageUrl} onImageSelect={(file) => handleImageChange(step.id, 'person', file)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Try-On Items</label>
                                            <div className="space-y-3">
                                                {(step.tryOnItems || []).map(item => (
                                                    <div key={item.id} className="flex items-center space-x-3 bg-white p-2 rounded-md border">
                                                        <ImageUpload imageUrl={item.imageUrl} onImageSelect={(file) => handleImageChange(step.id, 'tryOn', file, item.id)} />
                                                        <input type="text" placeholder="Item Name" value={item.name} onChange={(e) => handleTryOnItemNameChange(step.id, item.id, e.target.value)} className="flex-1 p-1 border-b text-sm" />
                                                        <button title="Represents the 'Add to Wishlist' button in the user app. It is not functional in this configurator." className="p-2 text-gray-400 hover:text-pink-500 rounded-lg hover:bg-pink-50 transition-colors cursor-help"><HeartIcon /></button>
                                                        <button onClick={() => removeTryOnItem(step.id, item.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"><Trash2Icon/></button>
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => addTryOnItem(step.id)} disabled={(step.tryOnItems || []).length >= 2} className="mt-2 flex items-center space-x-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"><PlusCircleIcon/><span>Add Try-On Item (Max 2)</span></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}</div>
                    <div className="mt-4 pt-4 border-t">
                        <select onChange={(e) => addStep(e.target.value)} value="" className="p-2 border rounded-md"><option value="" disabled>-- Add new step --</option>{Object.entries(EVENT_STEP_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    </div>
                </>
            ) : (<div className="text-center text-gray-500">Select or create an event template.</div>)}
            </div>
        </div>
    );
}
function ImageUpload({ imageUrl, onImageSelect }) {
    const fileInputRef = useRef(null);
    return (
        <div className="w-20 h-20 border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400 bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={() => fileInputRef.current.click()}>
            {imageUrl ? (<img src={imageUrl} alt="Upload preview" className="w-full h-full object-cover rounded-lg"/>) : (<CameraIcon />)}
            <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => onImageSelect(e.target.files[0])} />
        </div>
    );
}

function AlertsInbox() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [isSending, setIsSending] = useState(false);
    
    useEffect(() => {
        
        // Set up real-time listener for Firestore alerts collection
        const alertsCollection = collection(db, 'test alert');
        
        // Order by timestamp to show latest first
        const q = query(alertsCollection, orderBy('timestamp', 'desc'), limit(50));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {

            
            // Map and ensure newest first (extra client-side sort as fallback)
            const alertsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                read: false // Default to unread for new alerts
            })).sort((a, b) => {
                const at = a.timestamp?.seconds ?? (a.timestamp?._seconds ?? 0);
                const bt = b.timestamp?.seconds ?? (b.timestamp?._seconds ?? 0);
                return bt - at;
            });
            console.log('Processed alerts data:', alertsData);
            setAlerts(alertsData);
            setLoading(false);
        }, (error) => {
            console.error('Error fetching alerts:', error);
            console.error('Error details:', error.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    const handleMarkAsRead = (alertId) => {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
    };

    const handleSendRequest = (alert) => {
        setSelectedAlert(alert);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedAlert(null);
    };

    const handleSubmitRequest = async () => {
        if (!selectedAlert) return;
        
        setIsSending(true);
        try {
            const response = await fetch('/api/hcs/publish', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email_id: selectedAlert.emaild_id,
                    message: `Request to publish the collection: ${selectedAlert.collection_path}`,
                    event_id: selectedAlert.event_id
                })
            });

            if (response.ok) {
                // Mark as read after successful request
                handleCloseModal();
            } else {
                console.error('Failed to send request');
            }
        } catch (error) {
            console.error('Error sending request:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">Alerts Inbox</h2>
                </div>
                <div className="text-center text-gray-500 bg-white p-12 rounded-xl border">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h3>Loading alerts...</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Alerts Inbox</h2>
                <div className="text-sm text-gray-500">
                    {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                </div>
            </div>
            {alerts.length === 0 ? (
                <div className="text-center text-gray-500 bg-white p-12 rounded-xl border">
                    <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No alerts</h3>
                    <p className="mt-1 text-sm text-gray-500">New alerts will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {alerts.map(alert => (
                        <div key={alert.id} className={`bg-white p-6 rounded-xl border flex items-start space-x-4 ${alert.read ? 'opacity-60' : ''}`}>
                            <div className="flex-grow">
                                {alert.alert_type === 'request_status' ? (
                                    <h4 className="font-semibold text-gray-800 text-lg">
                                        <span className="text-indigo-600">{alert.name}</span> has <span className="text-indigo-600">{alert.request_status}</span> the below collection to publish
                                    </h4>
                                ) : (
                                    <h4 className="font-semibold text-gray-800 text-lg">
                                        A new collection is created by: <span className="text-indigo-600">{alert.name}</span>
                                    </h4>
                                )}
                                <div className="mt-3 space-y-2">
                                    {alert.alert_type === 'collection_created' && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-gray-600">Email ID:</span>
                                            <span className="text-sm text-gray-800">{alert.emaild_id}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-600">Collection Link:</span>
                                        <a 
                                            href={alert.collection_path} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-sm text-indigo-600 hover:text-indigo-800 underline truncate max-w-md"
                                        >
                                            {alert.collection_path}
                                        </a>
                                    </div>
                                    {alert.alert_type !== 'request_status' && (
                                        <div className="flex items-center space-x-2">
                                            <span className="text-sm font-medium text-gray-600">Event id:</span>
                                            <span className="text-sm text-gray-800">{alert.event_id}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {alert.alert_type !== 'request_status' && !alert.read && (
                                <button 
                                    onClick={() => handleSendRequest(alert)} 
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1 rounded-md hover:bg-indigo-50"
                                >
                                    Permission Request
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            {/* Send Request Modal */}
            {showModal && selectedAlert && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Request</h3>
                        
                        <div className="space-y-3 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Topic ID</label>
                                <input 
                                    type="text" 
                                    value="0.0.5999297" 
                                    readOnly 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
                                <input 
                                    type="text" 
                                    value={selectedAlert.emaild_id} 
                                    readOnly 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Event ID</label>
                                <input 
                                    type="text" 
                                    value={selectedAlert.event_id} 
                                    readOnly 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea 
                                    value={`Request to publish the collection: ${selectedAlert.collection_path}`}
                                    readOnly 
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                />
                            </div>
                        </div>
                        
                        <div className="flex space-x-3">
                            <button
                                onClick={handleCloseModal}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitRequest}
                                disabled={isSending}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? 'Sending...' : 'Send Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ConfigDashboard({ campaign, onSave }) {
    const [formData, setFormData] = useState(campaign);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [eventTemplates, setEventTemplates] = useState([]);
    
    useEffect(() => { setFormData(campaign); }, [campaign]);

    useEffect(() => {
        // Set up real-time listener for Firestore event_template collection
        const templatesCollection = collection(db, 'event_template');
        const q = query(templatesCollection, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const templatesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEventTemplates(templatesData);
        }, (error) => {
            console.error('Error fetching event templates:', error);
        });

        return () => unsubscribe();
    }, []);

    const handleSaveChanges = () => {
        setIsSaving(true);
        onSave(formData);
        setTimeout(() => {
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        }, 500);
    };

    const handleInputChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };
    const handleNestedInputChange = (s, f, v) => setFormData(p => ({ ...p, [s]: { ...p[s], [f]: v } }));
    const handleRewardChange = (id, f, v) => setFormData(p => ({ ...p, rewardCriteria: p.rewardCriteria.map(r => r.id === id ? { ...r, [f]: v } : r) }));
    const addRewardRule = () => setFormData(p => ({ ...p, rewardCriteria: [...(p.rewardCriteria || []), { id: crypto.randomUUID(), action: 'UGC_CREATION', rewardType: 'PERCENTAGE', rewardValue: 10, actionCount: 1 }] }));
    const removeRewardRule = (id) => setFormData(p => ({ ...p, rewardCriteria: p.rewardCriteria.filter(r => r.id !== id) }));
    const handleActionAlertChange = (id, f, v) => setFormData(p => ({ ...p, alerts: { ...p.alerts, actionThresholds: (p.alerts?.actionThresholds || []).map(r => r.id === id ? { ...r, [f]: v } : r) } }));
    const addActionAlertRule = () => setFormData(p => ({ ...p, alerts: { ...p.alerts, actionThresholds: [...(p.alerts?.actionThresholds || []), { id: crypto.randomUUID(), action: 'WISHLIST_ADD', threshold: 5 }] } }));
    const removeActionAlertRule = (id) => setFormData(p => ({ ...p, alerts: { ...p.alerts, actionThresholds: (p.alerts?.actionThresholds || []).filter(r => r.id !== id) } }));
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="text-3xl font-bold bg-transparent focus:border-indigo-500 outline-none border-b-2"/>
                <button onClick={handleSaveChanges} disabled={isSaving} className="flex items-center space-x-2 bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300">
                    {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    {showSuccess ? <CheckCircleIcon /> : <span>Save Changes</span>}
                </button>
            </div>
            <ConfigCard title="Guides & Actions" icon={<BookOpenIcon />} description="Assign a guided user journey for this campaign.">
                <select name="journeyTemplateId" value={formData.journeyTemplateId || ''} onChange={handleInputChange} className="w-full p-2 border rounded-lg">
                    <option value="">-- No Event Template Assigned --</option>
                    {eventTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </ConfigCard>
            <ConfigCard title="Budget" icon={<DollarSignIcon />} description="Set the total budget for this campaign's rewards.">
                <div className="relative"><span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span><input type="number" id="budget" value={formData.budget || 0} onChange={(e) => setFormData(p => ({...p, budget: parseInt(e.target.value, 10)}))} className="w-full pl-7 pr-4 py-2 border rounded-lg"/></div>
            </ConfigCard>
            <ConfigCard title="Reward Criteria" icon={<GiftIcon />} description="Define rules for what actions trigger a reward for the user.">
                <div className="space-y-4">
                    {(formData.rewardCriteria || []).map((r) => <RewardRule key={r.id} rule={r} onChange={handleRewardChange} onRemove={removeRewardRule} />)}
                    <button onClick={addRewardRule} className="flex items-center space-x-2 text-sm font-medium text-indigo-600"><PlusCircleIcon /><span>Add Reward Rule</span></button>
                </div>
            </ConfigCard>
            <ConfigCard title="Alerts" icon={<AlertTriangleIcon />} description="Configure notifications for campaign monitoring.">
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium">Low Budget Threshold ($)</label><input type="number" value={formData.alerts?.lowBudgetThreshold || 0} onChange={(e) => handleNestedInputChange('alerts', 'lowBudgetThreshold', parseInt(e.target.value, 10))} className="w-full p-2 border rounded-lg"/></div>
                    <div className="flex items-center"><input type="checkbox" checked={formData.alerts?.notifyOnHighValueUGC || false} onChange={(e) => handleNestedInputChange('alerts', 'notifyOnHighValueUGC', e.target.checked)} className="h-4 w-4 text-indigo-600 rounded"/><label className="ml-2 block text-sm">Notify on high-value "Showcase" additions</label></div>
                    <div className="pt-4 border-t"><label className="block text-sm font-medium mb-2">Action Threshold Alerts</label><div className="space-y-3">{(formData.alerts?.actionThresholds || []).map(r => <ActionAlertRule key={r.id} rule={r} onChange={handleActionAlertChange} onRemove={removeActionAlertRule} />)}</div><button onClick={addActionAlertRule} className="flex items-center space-x-2 text-sm font-medium text-indigo-600 mt-3"><PlusCircleIcon /><span>Add Action Alert</span></button></div>
                </div>
            </ConfigCard>
        </div>
    );
}

function ConfigCard({ title, icon, description, children }) { return (<div className="bg-white p-6 rounded-xl border border-gray-200"><div className="flex items-start space-x-4 mb-4"><div className="flex-shrink-0 text-indigo-600 bg-indigo-50 p-3 rounded-lg">{icon}</div><div><h3 className="text-lg font-semibold">{title}</h3><p className="text-sm text-gray-500">{description}</p></div></div><div>{children}</div></div>); }
function RewardRule({ rule, onChange, onRemove }) { return (<div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg border items-end"><div className="col-span-2 md:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">User Action</label><select value={rule.action} onChange={(e) => onChange(rule.id, 'action', e.target.value)} className="w-full p-2 text-sm rounded-md">{Object.entries(ACTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div><div className="col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">Trigger Count</label><input type="number" min="1" value={rule.actionCount || 1} onChange={(e) => onChange(rule.id, 'actionCount', parseInt(e.target.value, 10) || 1)} className="w-full p-2 text-sm rounded-md"/></div><div className="col-span-2 md:col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">Reward Type</label><select value={rule.rewardType} onChange={(e) => onChange(rule.id, 'rewardType', e.target.value)} className="w-full p-2 text-sm rounded-md">{Object.entries(REWARD_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div><div className="col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">Value</label><input type="number" value={rule.rewardValue} onChange={(e) => onChange(rule.id, 'rewardValue', parseInt(e.target.value, 10))} className="w-full p-2 text-sm rounded-md"/></div><div className="col-span-2 md:col-span-1 flex justify-end"><button onClick={() => onRemove(rule.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-md"><Trash2Icon /></button></div></div>); }
function ActionAlertRule({ rule, onChange, onRemove }) { return (<div className="grid grid-cols-3 gap-4 items-center p-3 bg-gray-50 rounded-lg border"><div className="col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">Action</label><select value={rule.action} onChange={(e) => onChange(rule.id, 'action', e.target.value)} className="w-full p-2 text-sm rounded-md">{Object.entries(ACTION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div><div className="col-span-1"><label className="block text-xs font-medium text-gray-500 mb-1">Threshold</label><input type="number" min="1" value={rule.threshold || 1} onChange={(e) => onChange(rule.id, 'threshold', parseInt(e.target.value, 10) || 1)} className="w-full p-2 text-sm rounded-md"/></div><div className="col-span-1 flex justify-end"><button onClick={() => onRemove(rule.id)} className="p-2 text-gray-400 hover:text-red-600 rounded-md"><Trash2Icon /></button></div></div>); }

