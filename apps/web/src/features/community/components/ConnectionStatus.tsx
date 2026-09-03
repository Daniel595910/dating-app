import React from 'react';
import { Heart, MessageCircle, Handshake, Crown } from 'lucide-react';

interface ConnectionStatusProps {
  connectionId: string;
  targetUserName: string;
  stage: 'requested' | 'accepted' | 'getting_to_know' | 'mutual_interest' | 'matched';
  progress: number;
  daysConnected?: number;
}

const STAGES = [
  { id: 'started', label: 'Started', icon: MessageCircle, completed: true },
  { id: 'talking', label: 'Talking', icon: Heart, completed: false },
  { id: 'interest', label: 'Interest', icon: Handshake, completed: false },
  { id: 'match', label: 'Match', icon: Crown, completed: false },
];

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  targetUserName,
  stage,
  progress,
  daysConnected,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        border: '1px solid #f3f4f6',
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {daysConnected ? `Day ${daysConnected}` : 'Getting to Know'}
          </p>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '4px 0 0' }}>
            You and {targetUserName}
          </h3>
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Heart size={18} color="#ef4444" fill="#ef4444" />
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          backgroundColor: '#f3f4f6',
          borderRadius: '9999px',
          overflow: 'hidden',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            height: '100%',
            backgroundColor: '#ef4444',
            borderRadius: '9999px',
            width: `${Math.min(Math.max(progress, 0), 100)}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Stages */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {STAGES.map((s) => {
          const Icon = s.icon;
          const isCompleted = s.id === 'started' || progress >= 30 && s.id === 'talking' || progress >= 60 && s.id === 'interest' || progress >= 100 && s.id === 'match';
          return (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isCompleted ? '#fee2e2' : '#f3f4f6',
                }}
              >
                <Icon size={14} color={isCompleted ? '#ef4444' : '#9ca3af'} />
              </div>
              <span style={{ fontSize: '10px', color: isCompleted ? '#ef4444' : '#9ca3af', fontWeight: isCompleted ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
