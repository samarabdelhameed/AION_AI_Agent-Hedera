import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Grid,
  Pagination,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { Refresh, Search, Person } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const UserActivity = ({ hederaService }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageSize] = useState(10);
  const [searchAddress, setSearchAddress] = useState('');
  const [userSummary, setUserSummary] = useState(null);
  const [activityChart, setActivityChart] = useState([]);

  useEffect(() => {
    if (hederaService) {
      loadUsers();
      loadActivityChart();
    }
  }, [hederaService, page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * pageSize;
      const result = await hederaService.getUsers(offset, pageSize);
      
      // Get user summaries for each user
      const usersWithSummaries = await Promise.all(
        result.users.map(async (userAddress) => {
          try {
            const summary = await hederaService.getUserAuditSummary(userAddress);
            return {
              address: userAddress,
              ...summary
            };
          } catch (err) {
            return {
              address: userAddress,
              totalDeposits: '0',
              totalWithdrawals: '0',
              currentShares: '0',
              firstDepositTime: 0,
              lastActivityTime: 0
            };
          }
        })
      );

      setUsers(usersWithSummaries);
      setTotalUsers(result.totalUsers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityChart = async () => {
    try {
      const chartData = [];
      const currentDay = hederaService.getCurrentDaySlot();
      
      for (let i = 6; i >= 0; i--) {
        const daySlot = currentDay - i;
        try {
          const activity = await hederaService.getDailyActivity(daySlot);
          chartData.push({
            day: new Date((daySlot * 86400) * 1000).toLocaleDateString(),
            activeUsers: activity.activeUsers,
            deposits: activity.depositCount,
            withdrawals: activity.withdrawalCount
          });
        } catch (err) {
          chartData.push({
            day: new Date((daySlot * 86400) * 1000).toLocaleDateString(),
            activeUsers: 0,
            deposits: 0,
            withdrawals: 0
          });
        }
      }
      setActivityChart(chartData);
    } catch (err) {
      console.error('Failed to load activity chart:', err);
    }
  };

  const handleRefresh = () => {
    loadUsers();
    loadActivityChart();
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleSearchUser = async () => {
    if (!searchAddress.trim()) return;

    try {
      setError(null);
      const summary = await hederaService.getUserAuditSummary(searchAddress);
      setUserSummary({
        address: searchAddress,
        ...summary
      });
    } catch (err) {
      setError(`Failed to load user summary: ${err.message}`);
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          User Activity
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* User Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Search User
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <TextField
                label="User Address"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                fullWidth
                placeholder="0x... or 0.0.123456"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button
                variant="contained"
                startIcon={<Search />}
                onClick={handleSearchUser}
                fullWidth
                disabled={!searchAddress.trim()}
              >
                Search
              </Button>
            </Grid>
          </Grid>

          {userSummary && (
            <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="h6" gutterBottom>
                User Summary: {formatAddress(userSummary.address)}
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Deposits
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {parseFloat(userSummary.totalDeposits).toFixed(4)} BNB
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Total Withdrawals
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {parseFloat(userSummary.totalWithdrawals).toFixed(4)} BNB
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Current Shares
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {parseFloat(userSummary.currentShares).toFixed(4)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="subtitle2" color="textSecondary">
                    First Deposit
                  </Typography>
                  <Typography variant="body2">
                    {userSummary.firstDepositTime > 0 
                      ? hederaService.formatTimestamp(userSummary.firstDepositTime)
                      : 'N/A'
                    }
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Activity Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Daily User Activity (Last 7 Days)
          </Typography>
          <Box height={300}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activeUsers" fill="#667eea" name="Active Users" />
                <Bar dataKey="deposits" fill="#764ba2" name="Deposits" />
                <Bar dataKey="withdrawals" fill="#f093fb" name="Withdrawals" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Users ({totalUsers})
          </Typography>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Address</TableCell>
                  <TableCell align="right">Total Deposits</TableCell>
                  <TableCell align="right">Total Withdrawals</TableCell>
                  <TableCell align="right">Current Shares</TableCell>
                  <TableCell>First Deposit</TableCell>
                  <TableCell>Last Activity</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Person color="action" />
                        <Typography variant="body2" fontFamily="monospace">
                          {formatAddress(user.address)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {parseFloat(user.totalDeposits).toFixed(4)} BNB
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {parseFloat(user.totalWithdrawals).toFixed(4)} BNB
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {parseFloat(user.currentShares).toFixed(4)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.firstDepositTime > 0 
                          ? hederaService.formatTimestamp(user.firstDepositTime)
                          : 'N/A'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {user.lastActivityTime > 0 
                          ? hederaService.formatTimestamp(user.lastActivityTime)
                          : 'N/A'
                        }
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={parseFloat(user.currentShares) > 0 ? 'Active' : 'Inactive'}
                        color={parseFloat(user.currentShares) > 0 ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {users.length === 0 && !loading && (
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary">
                No users found
              </Typography>
            </Box>
          )}

          {totalUsers > pageSize && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(totalUsers / pageSize)}
                page={page}
                onChange={handlePageChange}
                color="primary"
                disabled={loading}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default UserActivity;