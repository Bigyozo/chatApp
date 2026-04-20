'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface Props {
    open: boolean;
    message: string;
    onClose: () => void;
}

export function ErrorDialog({ open, message, onClose }: Props) {
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>エラー</DialogTitle>
            <DialogContent>
                <DialogContentText sx={{ whiteSpace: 'pre-line' }}>{message}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} autoFocus>閉じる</Button>
            </DialogActions>
        </Dialog>
    );
}
