import React from 'react';
import { Box, Skeleton, Table, TableBody, TableCell, TableHead, TableRow, Paper } from '@mui/material';

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableLoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 5, columns = 6 }) => {
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <TableCell key={index}>
                <Skeleton width="80%" />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export const PageLoadingSkeleton: React.FC = () => {
  return (
    <Box>
      {/* 标题骨架 */}
      <Box sx={{ mb: 3 }}>
        <Skeleton variant="text" width="30%" height={40} />
      </Box>
      
      {/* 操作栏骨架 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Skeleton variant="rectangular" width={120} height={36} />
        <Skeleton variant="rectangular" width={120} height={36} />
        <Skeleton variant="rectangular" width={200} height={36} sx={{ ml: 'auto' }} />
      </Box>
      
      {/* 表格骨架 */}
      <TableLoadingSkeleton />
    </Box>
  );
};
