import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Refresh,
  Visibility,
  CheckCircle,
  RadioButtonUnchecked,
  CloudDownload
} from '@mui/icons-material';

const ModelSnapshots = ({ hederaService }) => {
  const [snapshots, setSnapshots] = useState([]);
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fileContent, setFileContent] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);

  useEffect(() => {
    if (hederaService) {
      loadSnapshots();
    }
  }, [hederaService]);

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load latest snapshot
      try {
        const latest = await hederaService.getLatestModelSnapshot();
        setLatestSnapshot(latest);
      } catch (err) {
        console.log('No latest snapshot available');
      }

      // For demo purposes, we'll create some mock snapshots
      // In a real implementation, you'd have a way to query all snapshots
      const mockSnapshots = [
        {
          id: 1,
          timestamp: Date.now() / 1000 - 86400,
          version: 'v1.0.0',
          hfsFileId: '0.0.123456',
          checksum: '0x1234567890abcdef',
          performanceScore: 8500,
          description: 'Initial model deployment',
          active: false
        },
        {
          id: 2,
          timestamp: Date.now() / 1000 - 43200,
          version: 'v1.1.0',
          hfsFileId: '0.0.123457',
          checksum: '0xabcdef1234567890',
          performanceScore: 9200,
          description: 'Improved risk assessment model',
          active: true
        },
        {
          id: 3,
          timestamp: Date.now() / 1000 - 21600,
          version: 'v1.2.0',
          hfsFileId: '0.0.123458',
          checksum: '0x567890abcdef1234',
          performanceScore: 9500,
          description: 'Enhanced yield optimization algorithms',
          active: false
        }
      ];

      setSnapshots(mockSnapshots);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadSnapshots();
  };

  const handleViewDetails = async (snapshot) => {
    setSelectedSnapshot(snapshot);
    setDetailsOpen(true);
    
    // Try to load file content from HFS
    if (snapshot.hfsFileId && hederaService) {
      try {
        setLoadingFile(true);
        const content = await hederaService.getHFSFileContents(snapshot.hfsFileId);
        setFileContent(content);
      } catch (err) {
        console.error('Failed to load file content:', err);
        setFileContent('Failed to load file content');
      } finally {
        setLoadingFile(false);
      }
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedSnapshot(null);
    setFileContent(null);
  };

  const getPerformanceColor = (score) => {
    if (score >= 9000) return 'success';
    if (score >= 7000) return 'info';
    if (score >= 5000) return 'warning';
    return 'error';
  };

  const getPerformanceLabel = (score) => {
    if (score >= 9000) return 'Excellent';
    if (score >= 7000) return 'Good';
    if (score >= 5000) return 'Average';
    return 'Poor';
  };

  if (loading) {
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
          Model Snapshots
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

      {/* Latest Active Snapshot */}
      {latestSnapshot && (
        <Card sx={{ mb: 3, border: '2px solid', borderColor: 'success.main' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" color="success.main">
                Currently Active Model
              </Typography>
              <Chip
                icon={<CheckCircle />}
                label="Active"
                color="success"
                variant="filled"
              />
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  Version
                </Typography>
                <Typography variant="h6">
                  {latestSnapshot.snapshot.version}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  Performance Score
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6">
                    {(latestSnapshot.snapshot.performanceScore / 100).toFixed(1)}%
                  </Typography>
                  <Chip
                    label={getPerformanceLabel(latestSnapshot.snapshot.performanceScore)}
                    color={getPerformanceColor(latestSnapshot.snapshot.performanceScore)}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {hederaService.formatTimestamp(latestSnapshot.snapshot.timestamp)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2" color="textSecondary">
                  Validation
                </Typography>
                <Chip
                  label={latestSnapshot.isValid ? 'Valid' : 'Invalid'}
                  color={latestSnapshot.isValid ? 'success' : 'error'}
                  size="small"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Description
                </Typography>
                <Typography variant="body1">
                  {latestSnapshot.snapshot.description}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* All Snapshots */}
      <Typography variant="h6" gutterBottom>
        All Model Snapshots
      </Typography>
      
      <Grid container spacing={3}>
        {snapshots.map((snapshot) => (
          <Grid item xs={12} md={6} lg={4} key={snapshot.id}>
            <Card 
              sx={{ 
                height: '100%',
                border: snapshot.active ? '1px solid' : 'none',
                borderColor: snapshot.active ? 'success.main' : 'transparent'
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    {snapshot.version}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {snapshot.active ? (
                      <CheckCircle color="success" />
                    ) : (
                      <RadioButtonUnchecked color="disabled" />
                    )}
                    <Chip
                      label={snapshot.active ? 'Active' : 'Inactive'}
                      color={snapshot.active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Performance Score
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="body1" fontWeight="bold">
                      {(snapshot.performanceScore / 100).toFixed(1)}%
                    </Typography>
                    <Chip
                      label={getPerformanceLabel(snapshot.performanceScore)}
                      color={getPerformanceColor(snapshot.performanceScore)}
                      size="small"
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={snapshot.performanceScore / 100}
                    color={getPerformanceColor(snapshot.performanceScore)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Created
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {hederaService.formatTimestamp(snapshot.timestamp)}
                </Typography>

                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {snapshot.description}
                </Typography>

                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  HFS File ID
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {snapshot.hfsFileId}
                </Typography>

                <Box mt={2}>
                  <Button
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => handleViewDetails(snapshot)}
                    fullWidth
                  >
                    View Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {snapshots.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography color="textSecondary">
            No model snapshots found
          </Typography>
        </Box>
      )}

      {/* Snapshot Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Model Snapshot Details - {selectedSnapshot?.version}
        </DialogTitle>
        <DialogContent>
          {selectedSnapshot && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Version
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedSnapshot.version}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Status
                </Typography>
                <Chip
                  label={selectedSnapshot.active ? 'Active' : 'Inactive'}
                  color={selectedSnapshot.active ? 'success' : 'default'}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Performance Score
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1">
                    {(selectedSnapshot.performanceScore / 100).toFixed(1)}%
                  </Typography>
                  <Chip
                    label={getPerformanceLabel(selectedSnapshot.performanceScore)}
                    color={getPerformanceColor(selectedSnapshot.performanceScore)}
                    size="small"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Created
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {hederaService.formatTimestamp(selectedSnapshot.timestamp)}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedSnapshot.description}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  HFS File ID
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {selectedSnapshot.hfsFileId}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Checksum
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {selectedSnapshot.checksum}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Model File Content
                </Typography>
                {loadingFile ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading file content...</Typography>
                  </Box>
                ) : fileContent ? (
                  <Box
                    sx={{
                      bgcolor: 'grey.100',
                      p: 2,
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      maxHeight: 200,
                      overflow: 'auto'
                    }}
                  >
                    <pre>{fileContent}</pre>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    File content not available
                  </Typography>
                )}
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

export default ModelSnapshots;