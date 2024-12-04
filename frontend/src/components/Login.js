import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
} from '@mui/material';
import {
    Person as PersonIcon,
    Lock as LockIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

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
    const navigate = useNavigate();
    const { setUser } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                identifier,
                password
            });
            
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setUser(response.data.user);
                navigate('/');
            }
        } catch (err) {
            setError('Invalid credentials. Please try again.');
            console.error('Login error:', err);
        }
    };

    const handleClickShowPassword = () => {
        setShowPassword(!showPassword);
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
                        Welcome
                    </Typography>

                    {error && (
                        <Alert 
                            severity="error" 
                            sx={{ mb: 2, borderRadius: 2 }}
                            onClose={() => setError('')}
                        >
                            {error}
                        </Alert>
                    )}

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

                    <LoginButton
                        fullWidth
                        variant="contained"
                        type="submit"
                        disableElevation
                    >
                        Sign In
                    </LoginButton>

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
        </LoginContainer>
    );
};

export default Login;
