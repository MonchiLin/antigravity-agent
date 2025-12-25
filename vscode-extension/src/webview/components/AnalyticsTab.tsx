import React from 'react';
import { useAnalyticsStore } from '../store/analyticsStore';
import { VSCodeButton, VSCodeDivider } from '@vscode/webview-ui-toolkit/react';

export const AnalyticsTab: React.FC = () => {
    const { totalClicks, totalTimeSaved, sessionLog, clearAnalytics } = useAnalyticsStore();

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}h ${m}m ${s}s`;
        return `${m}m ${s}s`;
    };

    return (
        <div className="analytics-container" style={{ padding: '16px' }}>
            <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0 }}>效率概览 (ROI)</h2>
                <VSCodeButton appearance="secondary" onClick={clearAnalytics}>
                    重置数据
                </VSCodeButton>
            </div>

            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--vscode-sideBar-background)', padding: '12px', borderRadius: '4px', border: '1px solid var(--vscode-widget-border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>累计节省时间</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a855f7' }}>{formatTime(totalTimeSaved)}</div>
                </div>
                <div style={{ background: 'var(--vscode-sideBar-background)', padding: '12px', borderRadius: '4px', border: '1px solid var(--vscode-widget-border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>自动操作次数</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>{totalClicks}</div>
                </div>
            </div>

            <VSCodeDivider />

            <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '13px', marginBottom: '12px', opacity: 0.8 }}>最近活动</h3>
                <div className="log-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionLog.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', opacity: 0.5, fontSize: '12px' }}>
                            暂无运行记录，开启「自动驾驶」开始记录效率。
                        </div>
                    ) : (
                        sessionLog.map((log) => (
                            <div key={log.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '4px',
                                fontSize: '12px'
                            }}>
                                <div>
                                    <span style={{ color: '#a855f7', marginRight: '8px' }}>🤖 {log.action}</span>
                                    <span style={{ opacity: 0.5 }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div style={{ color: '#22c55e' }}>+{log.timeSaved}s</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
