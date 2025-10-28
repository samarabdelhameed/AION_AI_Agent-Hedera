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
  Chip,
  Button,
  TextField,
  Grid,
  Pagination,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Refresh,
  Visibility,
  Search,
  FilterList
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const AIDecisions = ({ hederaService }) => {
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    decisionType: ''
  });

  useEffect(() => {
    if (hederaService) {
      loadDecisions();
    }
  }, [hederaService, page]);

  const loadDecisions = async () => {
    try {
      setLoading(true);
      setError(null);

      let result;
      if (filters.startDate && filters.endDate) {
        // Use time range query
        const startTime = Math.floor(filters.startDate.getTime() / 1000);
        const endTime = Math.floor(filters.endDate.getTime() / 1000);
        result = await hederaService.getAIDecisionsByTimeRange(startTime, endTime, pageSize);
        setTotalCount(result.totalFound);
      } else {
        // Use pagination query
        const from = (page - 1) * pageSize + 1;
        const to = page * pageSize;
        result = await hederaService.getAIDecisions(from, to);
        setTotalCount(result.totalCount);
      }

      setDecisions(result.decisions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDecisions();
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleViewDetails = (decision) => {
    setSelectedDecision(decision);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedDecision(null);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApplyFilters = () => {
    setPage(1);
    loadDecisions();
  };

  const handleClearFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      decisionType: ''
    });
    setPage(1);
    setTimeout(loadDecisions, 100);
  };

  const getDecisionTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'rebalance': return 'primary';
      case 'withdraw': return 'warning';
      case 'deposit': return 'success';
      default: return 'default';
    }
  };

  const formatHash = (hash) => {
    if (!hash || hash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return 'N/A';
    }
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  if (loading && decisions.length === 0) {
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
          AI Decisions
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

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <DatePicker
                  label="Start Date"
                  value={filters.startDate}
                  onChange={(date) => handleFilterChange('startDate', date)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <DatePicker
                  label="End Date"
                  value={filters.endDate}
                  onChange={(date) => handleFilterChange('endDate', date)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Decision Type"
                  value={filters.decisionType}
                  onChange={(e) => handleFilterChange('decisionType', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., rebalance, withdraw"
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    startIcon={<Search />}
                    onClick={handleApplyFilters}
                    disabled={loading}
                  >
                    Apply
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleClearFilters}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </LocalizationProvider>
        </CardContent>
      </Card>

      {/* Decisions Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} elevation={0}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount (BNB)</TableCell>
                  <TableCell>From Strategy</TableCell>
                  <TableCell>To Strategy</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {decisions.map((decision, index) => (
                  <TableRow key={index} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {hederaService.formatTimestamp(decision.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={decision.decisionType}
                        color={getDecisionTypeColor(decision.decisionType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {hederaService.formatAmount(decision.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {hederaService.formatAddress(decision.fromStrategy)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {hederaService.formatAddress(decision.toStrategy)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {decision.reason}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(decision)}
                        color="primary"
                      >
                        <Visibility />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {decisions.length === 0 && !loading && (
            <Box textAlign="center" py={4}>
              <Typography color="textSecondary">
                No AI decisions found
              </Typography>
            </Box>
          )}

          {totalCount > pageSize && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={Math.ceil(totalCount / pageSize)}
                page={page}
                onChange={handlePageChange}
                color="primary"
                disabled={loading}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Decision Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          AI Decision Details
        </DialogTitle>
        <DialogContent>
          {selectedDecision && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Timestamp
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {hederaService.formatTimestamp(selectedDecision.timestamp)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Decision Type
                </Typography>
                <Chip
                  label={selectedDecision.decisionType}
                  color={getDecisionTypeColor(selectedDecision.decisionType)}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Amount
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {hederaService.formatAmount(selectedDecision.amount)} BNB
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Transaction Hash
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {formatHash(selectedDecision.txHash)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  From Strategy
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {selectedDecision.fromStrategy}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  To Strategy
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {selectedDecision.toStrategy}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Reason
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedDecision.reason}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  HCS Message ID
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {selectedDecision.hcsMessageId || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  HFS File ID
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {selectedDecision.hfsFileId || 'N/A'}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIDecisions;