import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  Psychology,
  People,
  Refresh
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = ({ hederaService }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vaultMetrics, setVaultMetrics] = useState(null);
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [dailyActivity, setDailyActivity] = useState([]);

  useEffect(() => {
    if (hederaService) {
      loadDashboardData();
    }
  }, [hederaService]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load vault metrics
      const metrics = await hederaService.getVaultMetrics();
      setVaultMetrics(metrics);

      // Load recent AI decisions
      const decisions = await hederaService.getAIDecisions(1, 5);
      setRecentDecisions(decisions.decisions);

      // Load latest model snapshot
      try {
        const snapshot = await hederaService.getLatestModelSnapshot();
        setLatestSnapshot(snapshot);
      } catch (err) {
        console.log('No model snapshot available');
      }

      // Load daily activity for the last 7 days
      const activityData = [];
      const currentDay = hederaService.getCurrentDaySlot();
      
      for (let i = 6; i >= 0; i--) {
        const daySlot = currentDay - i;
        try {
          const activity = await hederaService.getDailyActivity(daySlot);
          activityData.push({
            day: new Date((daySlot * 86400) * 1000).toLocaleDateString(),
            deposits: parseFloat(activity.totalDeposits),
            withdrawals: parseFloat(activity.totalWithdrawals),
            activeUsers: activity.activeUsers
          });
        } catch (err) {
          activityData.push({
            day: new Date((daySlot * 86400) * 1000).toLocaleDateString(),
            deposits: 0,
            withdrawals: 0,
            activeUsers: 0
          });
        }
      }
      setDailyActivity(activityData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading dashboard data: {error}
        <Button onClick={handleRefresh} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c'];

  const decisionTypeData = recentDecisions.reduce((acc, decision) => {
    const type = decision.decisionType;
    const existing = acc.find(item => item.name === type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, []);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          AION Vault Overview
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Value Locked
                  </Typography>
                  <Typography variant="h5" component="div">
                    {vaultMetrics ? `${parseFloat(vaultMetrics.totalValueLocked).toFixed(4)} BNB` : 'N/A'}
                  </Typography>
                </Box>
                <AccountBalance color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Users
                  </Typography>
                  <Typography variant="h5" component="div">
                    {vaultMetrics ? vaultMetrics.totalUsers : 'N/A'}
                  </Typography>
                </Box>
                <People color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    AI Decisions
                  </Typography>
                  <Typography variant="h5" component="div">
                    {vaultMetrics ? vaultMetrics.totalDecisions : 'N/A'}
                  </Typography>
                </Box>
                <Psychology color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Avg Decision Interval
                  </Typography>
                  <Typography variant="h5" component="div">
                    {vaultMetrics && vaultMetrics.averageDecisionInterval > 0 
                      ? `${Math.floor(vaultMetrics.averageDecisionInterval / 3600)}h`
                      : 'N/A'
                    }
                  </Typography>
                </Box>
                <TrendingUp color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Activity (Last 7 Days)
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="deposits" 
                      stroke="#667eea" 
                      strokeWidth={2}
                      name="Deposits (BNB)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="withdrawals" 
                      stroke="#764ba2" 
                      strokeWidth={2}
                      name="Withdrawals (BNB)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Decision Types
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={decisionTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {decisionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activity */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent AI Decisions
              </Typography>
              {recentDecisions.length > 0 ? (
                <Box>
                  {recentDecisions.map((decision, index) => (
                    <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Chip 
                          label={decision.decisionType} 
                          size="small" 
                          color="primary"
                        />
                        <Typography variant="caption" color="textSecondary">
                          {hederaService.formatTimestamp(decision.timestamp)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" gutterBottom>
                        Amount: {hederaService.formatAmount(decision.amount)} BNB
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {decision.reason}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography color="textSecondary">No recent decisions available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Latest Model Snapshot
              </Typography>
              {latestSnapshot ? (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="body1" fontWeight="bold">
                      {latestSnapshot.snapshot.version}
                    </Typography>
                    <Chip 
                      label={latestSnapshot.snapshot.active ? 'Active' : 'Inactive'}
                      color={latestSnapshot.snapshot.active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" gutterBottom>
                    Performance Score: {latestSnapshot.snapshot.performanceScore / 100}%
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    Created: {hederaService.formatTimestamp(latestSnapshot.snapshot.timestamp)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {latestSnapshot.snapshot.description}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    HFS File: {latestSnapshot.snapshot.hfsFileId}
                  </Typography>
                </Box>
              ) : (
                <Typography color="textSecondary">No model snapshot available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;