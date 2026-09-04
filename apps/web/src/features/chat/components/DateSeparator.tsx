import React from 'react';

interface DateSeparatorProps {
  date: string;
}

function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0.75rem 0',
      }}
    >
      <span
        style={{
          padding: '0.25rem 0.75rem',
          backgroundColor: '#f3f4f6',
          borderRadius: '9999px',
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: '#6b7280',
        }}
      >
        {formatDateLabel(date)}
      </span>
    </div>
  );
};
