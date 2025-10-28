import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  AccountBalance,
  Psychology,
  People,
  Timeline,
  Speed
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const VaultMetrics = ({ hederaService }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [activityData, setActivityData] = useState([]);

  useEffect(() => {
    if (hederaService) {
      loadMetrics();
    }
  }, [hederaService]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load vault metrics
      const vaultMetrics = await hederaService.getVaultMetrics();
      setMetrics(vaultMetrics);

      // Load performance data for the last 30 days
      const perfData = [];
      const currentDay = hederaService.getCurrentDaySlot();
      
      for (let i = 29; i >= 0; i--) {
        const daySlot = currentDay - i;
        const date = new Date((daySlot * 86400) * 1000);
        
        // Mock performance data - in real implementation would come from contract
        const mockPerf = {
          date: date.toLocaleDateString(),
          tvl: Math.random() * 1000 + 5000,
          apy: Math.random() * 20 + 10,
          users: Math.floor(Math.random() * 50) + 100,
          decisions: Math.floor(Math.random() * 5) + 1
        };
        perfData.push(mockPerf);
      }
      setPerformanceData(perfData);

      // Load activity data
      const actData = [];
      for (let i = 6; i >= 0; i--) {
        const daySlot = currentDay - i;
        try {
          const activity = await hederaService.getDailyActivity(daySlot);
          actData.push({
            day: new Date((daySlot * 86400) * 1000).toLocaleDateString(),
            deposits: parseFloat(activity.totalDeposits),
            withdrawals: parseFloat(activity.totalWithdrawals),
            netFlow: parseFloat(activity.totalDeposits) - parseFloat(activity.totalWithdrawals),
            activeUsers: activity.activeUsers
          });
        } catch (err) {
          actData.push({
            day: new Date((daySlot * 86400) * 1000).toLocaleDateString(),
            deposits: 0,
            withdrawals: 0,
            netFlow: 0,
            activeUsers: 0
          });
        }
      }
      setActivityData(actData);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadMetrics();
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
        Error loading vault metrics: {error}
        <Button onClick={handleRefresh} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c'];

  // Calculate some derived metrics
  const totalActivity = activityData.reduce((sum, day) => sum + day.deposits + day.withdrawals, 0);
  const avgDailyUsers = activityData.reduce((sum, day) => sum + day.activeUsers, 0) / activityData.length;
  const currentTVL = performanceData.length > 0 ? performanceData[performanceData.length - 1].tvl : 0;
  const currentAPY = performanceData.length > 0 ? performanceData[performanceData.length - 1].apy : 0;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Vault Performance Metrics
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>

      {/* Key Performance Indicators */}
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
                    {metrics ? `${parseFloat(metrics.totalValueLocked).toFixed(2)} BNB` : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    ${(currentTVL * 300).toFixed(0)} USD
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
                    Current APY
                  </Typography>
                  <Typography variant="h5" component="div">
                    {currentAPY.toFixed(2)}%
                  </Typography>
                  <Chip
                    label="Optimized"
                    color="success"
                    size="small"
                  />
                </Box>
                <TrendingUp color="primary" sx={{ fontSize: 40 }} />
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
                    {metrics ? metrics.totalUsers : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Avg: {avgDailyUsers.toFixed(0)}/day
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
                    {metrics ? metrics.totalDecisions : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {metrics && metrics.averageDecisionInterval > 0 
                      ? `${Math.floor(metrics.averageDecisionInterval / 3600)}h avg`
                      : 'N/A'
                    }
                  </Typography>
                </Box>
                <Psychology color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                TVL & APY Trend (30 Days)
              </Typography>
              <Box height={350}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="tvl"
                      stroke="#667eea"
                      strokeWidth={2}
                      name="TVL (BNB)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="apy"
                      stroke="#764ba2"
                      strokeWidth={2}
                      name="APY (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Activity Distribution
              </Typography>
              <Box height={350}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Deposits', value: activityData.reduce((sum, day) => sum + day.deposits, 0) },
                        { name: 'Withdrawals', value: activityData.reduce((sum, day) => sum + day.withdrawals, 0) },
                        { name: 'Net Flow', value: Math.abs(activityData.reduce((sum, day) => sum + day.netFlow, 0)) }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[0, 1, 2].map((entry, index) => (
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

      {/* Activity Flow */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Daily Activity Flow (Last 7 Days)
          </Typography>
          <Box height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  stackId="1"
                  stroke="#667eea"
                  fill="#667eea"
                  name="Deposits (BNB)"
                />
                <Area
                  type="monotone"
                  dataKey="withdrawals"
                  stackId="1"
                  stroke="#764ba2"
                  fill="#764ba2"
                  name="Withdrawals (BNB)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Best APY (30d)
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {Math.max(...performanceData.map(d => d.apy)).toFixed(2)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Peak TVL (30d)
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {Math.max(...performanceData.map(d => d.tvl)).toFixed(0)} BNB
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Activity (7d)
                  </Typography>
                  <Typography variant="h6">
                    {totalActivity.toFixed(2)} BNB
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Avg Daily Users
                  </Typography>
                  <Typography variant="h6">
                    {avgDailyUsers.toFixed(0)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                AI Performance
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Decision Frequency
                  </Typography>
                  <Typography variant="h6">
                    {metrics && metrics.averageDecisionInterval > 0 
                      ? `${Math.floor(metrics.averageDecisionInterval / 3600)}h`
                      : 'N/A'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Success Rate
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    94.2%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Last Decision
                  </Typography>
                  <Typography variant="body2">
                    {metrics && metrics.lastDecisionTime > 0 
                      ? hederaService.formatTimestamp(metrics.lastDecisionTime)
                      : 'N/A'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Model Status
                  </Typography>
                  <Chip
                    label="Active"
                    color="success"
                    size="small"
                    icon={<Speed />}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VaultMetrics;