import React, { useState, useEffect } from 'react';
import config from '../config';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkingDate } from '../context/WorkingDateContext';
import WorkingDateSelector from './WorkingDateSelector';
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    IconButton,
    InputAdornment,
    Alert,
    styled,
    Avatar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
} from '@mui/material';
import {
    Person as PersonIcon,
    Lock as LockIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    AccessTime as ClockIcon,
} from '@mui/icons-material';

const API_BASE_URL = config.apiUrl;

const LoginContainer = styled(Box)(({ theme }) => ({
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('/images/background.png') no-repeat center center fixed`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
}));

const LoginPaper = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(4),
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: theme.spacing(2),
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
    marginBottom: theme.spacing(2),
    '& .MuiOutlinedInput-root': {
        '&:hover fieldset': {
            borderColor: theme.palette.primary.main,
        },
    },
}));

const LoginButton = styled(Button)(({ theme }) => ({
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    fontWeight: 600,
    textTransform: 'none',
    fontSize: '1rem',
    background: theme.palette.primary.main,
    '&:hover': {
        background: theme.palette.primary.dark,
    },
}));

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [lockedUser, setLockedUser] = useState(null);
    const [tempWorkingDate, setTempWorkingDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [tempDateEnabled, setTempDateEnabled] = useState(false);

    // Time Clock Dialog state
    const [timeClockOpen, setTimeClockOpen] = useState(false);
    const [clockAlias, setClockAlias] = useState('');
    const [clockPassword, setClockPassword] = useState('');
    const [clockEmployee, setClockEmployee] = useState(null);
    const [clockStatus, setClockStatus] = useState('IN');
    const [confirmAction, setConfirmAction] = useState('');
    const [clockError, setClockError] = useState('');
    const [currentDateTime, setCurrentDateTime] = useState(new Date());
    const [businessLogo, setBusinessLogo] = useState(null);

    const navigate = useNavigate();
    const { setUser } = useAuth();
    const { setWorkingDate, setIsWorkingDateEnabled } = useWorkingDate();

    // Check if this is a locked session on component mount
    useEffect(() => {
        const lockedSession = localStorage.getItem('lockedSession');
        const storedUser = localStorage.getItem('user');
        if (lockedSession === 'true' && storedUser) {
            const user = JSON.parse(storedUser);
            setIsLocked(true);
            setLockedUser(user);
            setIdentifier(user.username || user.email);
        }
    }, []);

    const requestFullScreen = async (element) => {
        try {
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                await element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
                await element.msRequestFullscreen();
            }
            setIsFullScreen(true);
        } catch (err) {
            console.error('Error attempting to enable full-screen:', err);
        }
    };

    const handleFullScreen = () => {
        const element = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
            requestFullScreen(element);
        }
    };

    useEffect(() => {
        const handleUserInteraction = () => {
            handleFullScreen();
            // Remove event listeners after first interaction
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('keypress', handleUserInteraction);
        };

        // Add event listeners for user interaction
        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('keypress', handleUserInteraction);

        // Cleanup function
        return () => {
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('keypress', handleUserInteraction);
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                identifier,
                password
            });

            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.removeItem('lockedSession'); // Clear locked session flag
                setUser(response.data.user);

                // Save working date settings
                setWorkingDate(tempWorkingDate);
                setIsWorkingDateEnabled(tempDateEnabled);

                // Check for redirect path
                const redirectPath = sessionStorage.getItem('redirectAfterLogin');
                if (redirectPath) {
                    sessionStorage.removeItem('redirectAfterLogin');
                    navigate(redirectPath);
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            setError('Invalid credentials. Please try again.');
            console.error('Login error:', err);
        }
    };

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
    };

    const handleSwitchUser = () => {
        // Clear locked session and allow different user to login
        localStorage.removeItem('lockedSession');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('redirectAfterLogin');
        setIsLocked(false);
        setLockedUser(null);
        setIdentifier('');
        setPassword('');
    };

    // Update time every second when Time Clock dialog is open
    useEffect(() => {
        if (timeClockOpen) {
            const timer = setInterval(() => {
                setCurrentDateTime(new Date());
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeClockOpen]);

    // Fetch business logo when dialog opens
    useEffect(() => {
        const fetchBusinessLogo = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/business-info`);
                if (response.data && response.data.logo) {
                    setBusinessLogo(response.data.logo);
                }
            } catch (error) {
                console.error('Failed to fetch business logo:', error);
            }
        };

        if (timeClockOpen) {
            fetchBusinessLogo();
        }
    }, [timeClockOpen]);

    const handleTimeClockOpen = () => {
        setTimeClockOpen(true);
        setClockAlias('');
        setClockPassword('');
        setClockEmployee(null);
        setClockStatus('IN');
        setConfirmAction('');
        setClockError('');
        setCurrentDateTime(new Date());
    };

    const handleTimeClockClose = () => {
        setTimeClockOpen(false);
        setClockAlias('');
        setClockPassword('');
        setClockEmployee(null);
        setClockStatus('IN');
        setConfirmAction('');
        setClockError('');
    };

    // Check employee status when alias changes
    useEffect(() => {
        const checkEmployeeStatus = async () => {
            if (clockAlias.trim().length === 0) {
                setClockEmployee(null);
                setClockStatus('IN');
                return;
            }

            try {
                // First, verify employee exists and get details
                const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                    identifier: clockAlias,
                    password: clockPassword
                });

                if (loginResponse.data.user) {
                    setClockEmployee(loginResponse.data.user);

                    // Check if employee is clocked in
                    const statusResponse = await axios.get(`${API_BASE_URL}/employee-sessions/clocked-in`);
                    const clockedInEmployees = statusResponse.data;
                    const isClocked = clockedInEmployees.find(
                        emp => emp.employee_id === loginResponse.data.user.id
                    );

                    setClockStatus(isClocked ? 'OUT' : 'IN');
                }
            } catch (err) {
                // Don't show error yet, wait for form submission
                setClockEmployee(null);
            }
        };

        if (clockPassword.length > 0) {
            checkEmployeeStatus();
        }
    }, [clockAlias, clockPassword]);

    const handleTimeClockSubmit = async () => {
        setClockError('');

        // Validate inputs
        if (!clockAlias || !clockPassword) {
            setClockError('Please enter alias and password');
            return;
        }

        if (!confirmAction || (confirmAction.toUpperCase() !== 'IN' && confirmAction.toUpperCase() !== 'OUT')) {
            setClockError('Please enter IN or OUT to confirm action');
            return;
        }

        try {
            // First authenticate the employee
            const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                identifier: clockAlias,
                password: clockPassword
            });

            if (!loginResponse.data.user) {
                setClockError('Invalid credentials');
                return;
            }

            const employeeId = loginResponse.data.user.id;
            const action = confirmAction.toUpperCase();

            // Perform clock in/out based on confirmed action
            if (action === 'IN') {
                const response = await axios.post(`${API_BASE_URL}/employee-sessions/clock-in`, {
                    employee_id: employeeId
                });
                if (response.status === 201) {
                    // Clock in successful, now log the user in
                    localStorage.setItem('token', loginResponse.data.token);
                    localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
                    setUser(loginResponse.data.user);

                    // Save working date settings
                    setWorkingDate(tempWorkingDate);
                    setIsWorkingDateEnabled(tempDateEnabled);

                    handleTimeClockClose();

                    // Navigate to home
                    navigate('/');
                }
            } else if (action === 'OUT') {
                const response = await axios.post(`${API_BASE_URL}/employee-sessions/clock-out`, {
                    employee_id: employeeId
                });
                if (response.status === 200) {
                    handleTimeClockClose();
                }
            }
        } catch (err) {
            setClockError(err.response?.data?.error || 'Failed to process time clock action');
        }
    };

    return (
        <LoginContainer>
            <LoginPaper elevation={3}>
                <Box component="form" onSubmit={handleSubmit} sx={{ textAlign: 'center' }}>
                    <Typography
                        variant="h4"
                        gutterBottom
                        sx={{
                            color: 'primary.main',
                            fontWeight: 600,
                            mb: 4
                        }}
                    >
                        {isLocked ? 'Screen Locked' : 'Welcome'}
                    </Typography>

                    {isLocked && lockedUser && (
                        <Box sx={{ mb: 3, textAlign: 'center' }}>
                            <Avatar
                                sx={{
                                    width: 80,
                                    height: 80,
                                    bgcolor: 'primary.main',
                                    margin: '0 auto 16px',
                                    fontSize: '2rem'
                                }}
                                src={lockedUser.image ? `data:image/jpeg;base64,${lockedUser.image}` : undefined}
                            >
                                {!lockedUser.image && (lockedUser.username ? lockedUser.username[0].toUpperCase() : 'U')}
                            </Avatar>
                            <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                {lockedUser.firstName} {lockedUser.lastName}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {lockedUser.username}
                            </Typography>
                        </Box>
                    )}

                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ mb: 2, borderRadius: 2 }}
                            onClose={() => setError('')}
                        >
                            {error}
                        </Alert>
                    )}

                    {!isLocked && (
                        <StyledTextField
                            fullWidth
                            label="Username or Email"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon color="primary" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    )}

                    <StyledTextField
                        fullWidth
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LockIcon color="primary" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={handleClickShowPassword}
                                        edge="end"
                                    >
                                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />

                    {!isLocked && (
                        <WorkingDateSelector
                            workingDate={tempWorkingDate}
                            setWorkingDate={setTempWorkingDate}
                            isEnabled={tempDateEnabled}
                            setIsEnabled={setTempDateEnabled}
                        />
                    )}

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <LoginButton
                                fullWidth
                                variant="contained"
                                type="submit"
                                disableElevation
                            >
                                {isLocked ? 'Unlock' : 'Sign In'}
                            </LoginButton>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <LoginButton
                                fullWidth
                                variant="outlined"
                                onClick={handleTimeClockOpen}
                                type="button"
                                startIcon={<ClockIcon />}
                                sx={{
                                    background: 'transparent',
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                    '&:hover': {
                                        background: 'rgba(25, 118, 210, 0.08)',
                                        borderColor: 'primary.dark',
                                    },
                                }}
                            >
                                Time Clock
                            </LoginButton>
                        </Grid>
                    </Grid>

                    {isLocked && (
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={handleSwitchUser}
                            sx={{ mt: 2 }}
                        >
                            Switch User
                        </Button>
                    )}

                    <Typography
                        variant="body2"
                        sx={{
                            mt: 3,
                            color: 'text.secondary'
                        }}
                    >
                        POS Pro System
                    </Typography>
                </Box>
            </LoginPaper>

            {/* Time Clock Dialog */}
            <Dialog
                open={timeClockOpen}
                onClose={handleTimeClockClose}
                maxWidth="xs"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        bgcolor: '#2E7D32',
                        color: 'white',
                        width: '400px',
                        maxHeight: '90vh'
                    }
                }}
            >
                <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#2E7D32', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                    }}>
                        {businessLogo ? (
                            <img
                                src={`data:image/jpeg;base64,${businessLogo}`}
                                alt="Business Logo"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                }}
                            />
                        ) : (
                            <Typography sx={{ color: '#2E7D32', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                B
                            </Typography>
                        )}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 'normal', fontSize: '1.1rem', color: 'white' }}>
                        Time Clock – Clock In/Out
                    </Typography>
                </Box>
                <DialogContent sx={{ bgcolor: 'white', color: 'black', pt: 2, pb: 2, px: 2.5 }}>
                    {clockError && (
                        <Alert severity="error" sx={{ mb: 1.5, py: 0.5 }}>
                            {clockError}
                        </Alert>
                    )}

                    <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" sx={{ mb: 0.3, fontSize: '0.875rem' }}>
                            Alias
                        </Typography>
                        <TextField
                            fullWidth
                            value={clockAlias}
                            onChange={(e) => setClockAlias(e.target.value)}
                            placeholder="Enter employee alias"
                            size="small"
                        />
                    </Box>

                    {clockEmployee && (
                        <Box sx={{ mb: 1.5, textAlign: 'center', py: 0.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {clockEmployee.firstName?.toUpperCase()} {clockEmployee.lastName?.toUpperCase()}
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" sx={{ mb: 0.3, fontSize: '0.875rem' }}>
                            Password
                        </Typography>
                        <TextField
                            fullWidth
                            type="password"
                            value={clockPassword}
                            onChange={(e) => setClockPassword(e.target.value)}
                            placeholder="Enter password"
                            size="small"
                        />
                    </Box>

                    <Box sx={{ mb: 1.5 }}>
                        <Typography variant="body2" sx={{ mb: 0.3, fontSize: '0.875rem' }}>
                            In/Out
                        </Typography>
                        <TextField
                            fullWidth
                            value={clockStatus}
                            size="small"
                            InputProps={{
                                readOnly: true,
                            }}
                        />
                    </Box>

                    <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                        <Grid item xs={6}>
                            <Typography variant="body2" sx={{ mb: 0.3, fontSize: '0.875rem' }}>
                                Date
                            </Typography>
                            <TextField
                                fullWidth
                                value={currentDateTime.toISOString().split('T')[0]}
                                size="small"
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <Typography variant="body2" sx={{ mb: 0.3, fontSize: '0.875rem' }}>
                                Time
                            </Typography>
                            <TextField
                                fullWidth
                                value={currentDateTime.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                })}
                                size="small"
                                InputProps={{
                                    readOnly: true,
                                }}
                            />
                        </Grid>
                    </Grid>

                    <Paper sx={{ p: 1.5, bgcolor: '#f5f5f5' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.875rem' }}>
                            Confirmation
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1, fontSize: '0.8rem' }}>
                            If you are clocking in, enter 'IN'. If you are clocking out, enter 'OUT'.
                        </Typography>
                        <Box>
                            <Typography variant="body2" sx={{ mb: 0.3, fontSize: '0.875rem' }}>
                                Confirm Action
                            </Typography>
                            <TextField
                                fullWidth
                                value={confirmAction}
                                onChange={(e) => setConfirmAction(e.target.value)}
                                placeholder="Enter IN or OUT"
                                size="small"
                            />
                        </Box>
                    </Paper>
                </DialogContent>
                <DialogActions sx={{ bgcolor: 'white', px: 2.5, py: 1.5 }}>
                    <Button
                        onClick={handleTimeClockSubmit}
                        variant="contained"
                        size="small"
                        sx={{
                            bgcolor: '#5F9EA0',
                            '&:hover': {
                                bgcolor: '#4A7B7D',
                            },
                            minWidth: 80
                        }}
                    >
                        Ok
                    </Button>
                    <Button
                        onClick={handleTimeClockClose}
                        variant="outlined"
                        size="small"
                        sx={{
                            borderColor: '#B22222',
                            color: '#B22222',
                            '&:hover': {
                                borderColor: '#8B0000',
                                bgcolor: 'rgba(178, 34, 34, 0.04)',
                            },
                            minWidth: 80
                        }}
                    >
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </LoginContainer>
    );
};

export default Login;
