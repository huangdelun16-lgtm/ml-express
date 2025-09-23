import React from 'react';
import { Button, CircularProgress } from '@mui/material';

type Props = React.ComponentProps<typeof Button> & { loading?: boolean; loaderSize?: number };

const LoadingButton: React.FC<Props> = ({ loading, loaderSize = 18, children, disabled, ...rest }) => {
	return (
		<Button disabled={Boolean(disabled || loading)} {...rest}>
			{loading && <CircularProgress size={loaderSize} sx={{ mr: 1 }} />}
			{children}
		</Button>
	);
};

export default LoadingButton;




