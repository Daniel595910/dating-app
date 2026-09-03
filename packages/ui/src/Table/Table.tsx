import React from 'react';
import styles from './Table.module.css';

export interface TableColumn < T = any > {
  key: string;
  header: string;
  render ? : (row: T) => React.ReactNode;
  sortable ? : boolean;
  width ? : string;
}

export interface TableRow {
  id: string | number;
  [key: string]: any;
}

export interface TableProps < T extends TableRow = TableRow > {
  columns: TableColumn < T > [];
  data: T[];
  loading ? : boolean;
  emptyMessage ? : string;
  onRowClick ? : (row: T) => void;
  className ? : string;
}

export function Table < T extends TableRow = TableRow > ({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  className,
}: TableProps < T > ) {
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <span>Loading...</span>
      </div>
    );
  }
  
  if (!data.length) {
    return (
      <div className={styles.emptyContainer}>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    );
  }
  
  return (
    <div className={styles.tableWrapper}>
      <table className={`${styles.table} ${className || ''}`}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={styles.header}
                style={column.width ? { width: column.width } : undefined}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.id}
              className={`${styles.row} ${onRowClick ? styles.clickableRow : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={column.key} className={styles.cell}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}