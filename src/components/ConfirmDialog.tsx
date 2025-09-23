import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';

type Props = {
	open: boolean;
	title?: string;
	content?: React.ReactNode;
	confirmText?: string;
	cancelText?: string;
	confirmColor?: 'primary' | 'error' | 'warning' | 'success' | 'info' | 'secondary';
	disabled?: boolean;
	onClose: () => void;
	onConfirm: () => void;
};

const ConfirmDialog: React.FC<Props> = ({
	open,
	title = '确认操作',
	content,
	confirmText = '确认',
	cancelText = '取消',
	confirmColor = 'error',
	disabled,
	onClose,
	onConfirm,
}) => {
	return (
		<Dialog open={open} onClose={disabled ? undefined : onClose} maxWidth="xs" fullWidth>
			<DialogTitle>{title}</DialogTitle>
			{content && (
				<DialogContent>
					{typeof content === 'string' ? (
						<Typography variant="body2">{content}</Typography>
					) : (
						content
					)}
				</DialogContent>
			)}
			<DialogActions>
				<Button onClick={onClose} disabled={Boolean(disabled)}>{cancelText}</Button>
				<Button variant="contained" color={confirmColor} onClick={onConfirm} disabled={Boolean(disabled)}>
					{confirmText}
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default ConfirmDialog;




