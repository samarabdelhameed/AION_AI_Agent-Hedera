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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Refresh, Token, AccountBalance } from '@mui/icons-material';

const HTSTokenInfo = ({ hederaService }) => {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hederaService) {
      loadTokenInfo();
    }
  }, [hederaService]);

  const loadTokenInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock HTS token information
      const mockTokenInfo = {
        tokenId: '0.0.123456',
        name: 'AION Vault Shares',
        symbol: 'AION',
        decimals: 18,
        totalSupply: '1000000.0',
        treasury: '0.0.123457',
        adminKey: '0x1234567890abcdef',
        kycKey: '0x1234567890abcdef',
        freezeKey: '0x1234567890abcdef',
        wipeKey: '0x1234567890abcdef',
        supplyKey: '0x1234567890abcdef',
        defaultFreezeStatus: false,
        defaultKycStatus: true,
        deleted: false,
        autoRenewAccount: '0.0.123458',
        autoRenewPeriod: 7776000, // 90 days
        expiry: Math.floor(Date.now() / 1000) + 31536000, // 1 year from now
        memo: 'AION AI-powered DeFi vault shares',
        holders: [
          { address: '0.0.123459', balance: '1000.0' },
          { address: '0.0.123460', balance: '2500.0' },
          { address: '0.0.123461', balance: '500.0' },
          { address: '0.0.123462', balance: '750.0' }
        ]
      };

      setTokenInfo(mockTokenInfo);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadTokenInfo();
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
        Error loading HTS token information: {error}
        <Button onClick={handleRefresh} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          HTS Token Information
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
        >
          Refresh
        </Button>
      </Box>

      {tokenInfo && (
        <>
          {/* Token Overview */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Token color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h5">
                    {tokenInfo.name} ({tokenInfo.symbol})
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Token ID: {tokenInfo.tokenId}
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Total Supply
                  </Typography>
                  <Typography variant="h6">
                    {parseFloat(tokenInfo.totalSupply).toLocaleString()} {tokenInfo.symbol}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Decimals
                  </Typography>
                  <Typography variant="h6">
                    {tokenInfo.decimals}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Holders
                  </Typography>
                  <Typography variant="h6">
                    {tokenInfo.holders.length}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={tokenInfo.deleted ? 'Deleted' : 'Active'}
                    color={tokenInfo.deleted ? 'error' : 'success'}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Token Properties */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Token Properties
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Treasury Account
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {tokenInfo.treasury}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Auto Renew Account
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {tokenInfo.autoRenewAccount}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Auto Renew Period
                      </Typography>
                      <Typography variant="body2">
                        {Math.floor(tokenInfo.autoRenewPeriod / 86400)} days
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Expiry
                      </Typography>
                      <Typography variant="body2">
                        {new Date(tokenInfo.expiry * 1000).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Memo
                      </Typography>
                      <Typography variant="body2">
                        {tokenInfo.memo}
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
                    Token Keys & Settings
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">Default Freeze Status</Typography>
                        <Chip
                          label={tokenInfo.defaultFreezeStatus ? 'Frozen' : 'Unfrozen'}
                          color={tokenInfo.defaultFreezeStatus ? 'error' : 'success'}
                          size="small"
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">Default KYC Status</Typography>
                        <Chip
                          label={tokenInfo.defaultKycStatus ? 'KYC Required' : 'No KYC'}
                          color={tokenInfo.defaultKycStatus ? 'warning' : 'success'}
                          size="small"
                        />
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Admin Key
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                        {tokenInfo.adminKey}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Supply Key
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                        {tokenInfo.supplyKey}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Token Holders */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Token Holders
              </Typography>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Account ID</TableCell>
                      <TableCell align="right">Balance</TableCell>
                      <TableCell align="right">Percentage</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tokenInfo.holders.map((holder, index) => {
                      const percentage = (parseFloat(holder.balance) / parseFloat(tokenInfo.totalSupply)) * 100;
                      return (
                        <TableRow key={index}>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {holder.address}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {parseFloat(holder.balance).toLocaleString()} {tokenInfo.symbol}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {percentage.toFixed(2)}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default HTSTokenInfo;