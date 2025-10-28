import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Box, Tabs, Tab } from '@mui/material';
import Dashboard from './components/Dashboard';
import AIDecisions from './components/AIDecisions';
import ModelSnapshots from './components/ModelSnapshots';
import HTSTokenInfo from './components/HTSTokenInfo';
import UserActivity from './components/UserActivity';
import VaultMetrics from './components/VaultMetrics';
import HederaService from './services/HederaService';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
    background: {
      default: '#f5f7fa',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

function App() {
  const [currentTab, setCurrentTab] = useState(0);
  const [hederaService, setHederaService] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    initializeHederaService();
  }, []);

  const initializeHederaService = async () => {
    try {
      setConnectionStatus('connecting');
      const service = new HederaService();
      await service.initialize();
      setHederaService(service);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Failed to initialize Hedera service:', error);
      setConnectionStatus('error');
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4caf50';
      case 'connecting': return '#ff9800';
      case 'error': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected to Hedera Testnet';
      case 'connecting': return 'Connecting to Hedera...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
                AION AI Agent - Hedera Transparency Dashboard
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: getConnectionStatusColor(),
                  }}
                />
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  {getConnectionStatusText()}
                </Typography>
              </Box>
            </Toolbar>
          </AppBar>

          <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={currentTab} onChange={handleTabChange} aria-label="dashboard tabs">
                <Tab label="Overview" />
                <Tab label="AI Decisions" />
                <Tab label="Model Snapshots" />
                <Tab label="HTS Token Info" />
                <Tab label="User Activity" />
                <Tab label="Vault Metrics" />
              </Tabs>
            </Box>

            <Routes>
              <Route path="/" element={
                <TabPanel value={currentTab} index={0}>
                  <Dashboard hederaService={hederaService} />
                </TabPanel>
              } />
            </Routes>

            <TabPanel value={currentTab} index={0}>
              <Dashboard hederaService={hederaService} />
            </TabPanel>
            <TabPanel value={currentTab} index={1}>
              <AIDecisions hederaService={hederaService} />
            </TabPanel>
            <TabPanel value={currentTab} index={2}>
              <ModelSnapshots hederaService={hederaService} />
            </TabPanel>
            <TabPanel value={currentTab} index={3}>
              <HTSTokenInfo hederaService={hederaService} />
            </TabPanel>
            <TabPanel value={currentTab} index={4}>
              <UserActivity hederaService={hederaService} />
            </TabPanel>
            <TabPanel value={currentTab} index={5}>
              <VaultMetrics hederaService={hederaService} />
            </TabPanel>
          </Container>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default App;