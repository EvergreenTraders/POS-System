import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormHelperText,
  InputLabel,
  Typography,
  Paper,
  Select,
  MenuItem,
  IconButton,
  Alert,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Checkbox,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import config from '../config';
import { useAuth } from '../context/AuthContext';

const Scrap = () => {
  const API_BASE_URL = config.apiUrl;

  // Debug logging
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [bucketName, setBucketName] = useState('');
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [bucketItems, setBucketItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [bucketType, setBucketType] = useState('gold');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const { user: currentUser } = useAuth();

  const [scrapBuckets, setScrapBuckets] = useState([]);
  const [bucketTotalCosts, setBucketTotalCosts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    item: null
  });

  const [completeDialog, setCompleteDialog] = useState({
    open: false,
    bucket: null
  });

  const [editBucketDialog, setEditBucketDialog] = useState({
    open: false,
    bucket: null,
    name: '',
    notes: ''
  });

  const [deleteBucketDialog, setDeleteBucketDialog] = useState({
    open: false,
    bucket: null
  });

  const [addItemDialog, setAddItemDialog] = useState({
    open: false,
    availableItems: [],
    selectedItems: [],
    loading: false
  });

  const [weightPhotoDialog, setWeightPhotoDialog] = useState({
    open: false,
    selectedFile: null,
    preview: null,
    uploading: false,
    cameraMode: false,
    stream: null
  });

  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now());

  const [imagePreviewDialog, setImagePreviewDialog] = useState({
    open: false,
    imageUrl: null
  });

  const [shippingDialog, setShippingDialog] = useState({
    open: false,
    refiner_customer_id: '',
    shipper: '',
    tracking_number: '',
    loading: false
  });

  const [processingDialog, setProcessingDialog] = useState({
    open: false,
    date_received: '',
    weight_received: '',
    locked_spot_price: '',
    payment_advance: '',
    loading: false
  });

  const [completedDialog, setCompletedDialog] = useState({
    open: false,
    final_weight: '',
    assay: '',
    total_settlement_amount: '',
    final_payment_amount: '',
    loading: false
  });

  const [customers, setCustomers] = useState([]);

  // Fetch scrap buckets from API
  const fetchScrapBuckets = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/scrap/buckets`);
      setScrapBuckets(response.data);

      // Calculate total cost for each bucket
      await calculateBucketTotalCosts(response.data);

      setError(null);
      return response.data; // Return the fetched data for chaining
    } catch (err) {
      console.error('Error fetching scrap buckets:', err);
      setError('Failed to load scrap buckets. Please try again later.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Calculate total costs for all buckets
  const calculateBucketTotalCosts = async (buckets) => {
    const costs = {};

    for (const bucket of buckets) {
      if (bucket.item_id && bucket.item_id.length > 0) {
        try {
          // Fetch items for this bucket
          const itemPromises = bucket.item_id.map(id =>
            axios.get(`${API_BASE_URL}/jewelry/${id}`)
              .then(res => res.data)
              .catch(err => {
                console.error(`Error fetching item ${id}:`, err);
                return null;
              })
          );

          const items = await Promise.all(itemPromises);
          const validItems = items.filter(item => item !== null);

          // Calculate total cost
          const totalCost = validItems.reduce((total, item) => {
            const itemPrice = parseFloat(item.item_price || item.buy_price || item.retail_price || 0);
            return total + itemPrice;
          }, 0);

          costs[bucket.bucket_id] = totalCost;
        } catch (err) {
          console.error(`Error calculating cost for bucket ${bucket.bucket_id}:`, err);
          costs[bucket.bucket_id] = 0;
        }
      } else {
        costs[bucket.bucket_id] = 0;
      }
    }

    setBucketTotalCosts(costs);
  };

  // Fetch items for a specific bucket
  const fetchBucketItems = async (bucket) => {
    try {
      setItemsLoading(true);      
      // If bucket has item_ids array, fetch the actual items
      if (bucket.item_id && bucket.item_id.length > 0) {
        // Fetch each item individually
        const itemPromises = bucket.item_id.map(id => 
          axios.get(`${API_BASE_URL}/jewelry/${id}`)
            .then(res => res.data)
            .catch(err => {
              console.error(`Error fetching item ${id}:`, err);
              return null; // Return null for failed requests
            })
        );
        
        // Wait for all requests to complete
        const items = await Promise.all(itemPromises);
        // Filter out any null values from failed requests
        const validItems = items.filter(item => item !== null);
        setBucketItems(validItems);
      } else {
        // If no items, set empty array
        setBucketItems([]);
      }
    } catch (err) {
      console.error('Error fetching bucket items:', err);
      setError('Failed to load bucket items. Please try again.');
      setBucketItems([]);
    } finally {
      setItemsLoading(false);
    }
  };

  // Handle bucket selection
  const handleBucketSelect = (bucket) => {
    setSelectedBucket(bucket);
    fetchBucketItems(bucket);
  };

  // Fetch buckets on component mount
  useEffect(() => {
    const initialize = async () => {
      const buckets = await fetchScrapBuckets();

      // Select the first bucket by default (most recently created)
      if (buckets && buckets.length > 0) {
        handleBucketSelect(buckets[0]);
      }
    };

    initialize();
  }, []);
  
  // Handle video stream for camera
  useEffect(() => {
    if (weightPhotoDialog.cameraMode && weightPhotoDialog.stream) {
      const video = document.getElementById('camera-video');
      if (video) {
        video.srcObject = weightPhotoDialog.stream;
        video.play();
      }
    }
  }, [weightPhotoDialog.cameraMode, weightPhotoDialog.stream]);

  // Update selected bucket when scrapBuckets changes
  useEffect(() => {
    if (scrapBuckets.length > 0 && !selectedBucket) {
      // Select the first bucket (most recently created)
      handleBucketSelect(scrapBuckets[0]);
    }
  }, [scrapBuckets]);

  const handleNewScrap = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenCreateDialog(false);
    setBucketName('');
    setBucketType('general');
    setDescription('');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};
    if (!bucketName.trim()) newErrors.bucketName = 'Bucket name is required';
    if (bucketName.length > 50) newErrors.bucketName = 'Name must be less than 50 characters';
    if (description.length > 255) newErrors.description = 'Description must be less than 255 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateBucket = async () => {
    if (!validateForm()) return;
    
    try {
      const response = await axios.post(`${API_BASE_URL}/scrap/buckets`, {
        bucket_name: bucketName,
        notes: description,
        created_by: currentUser?.id || 1,
        status: 'ACTIVE'
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Reset form and close dialog
      handleCloseDialog();
      
      // Refresh buckets and select the new one
      const updatedBuckets = await fetchScrapBuckets();
      const newBucket = updatedBuckets.find(b => b.bucket_id === response.data.bucket_id);
      if (newBucket) {
        handleBucketSelect(newBucket);
      }
      
    } catch (error) {
      console.error('Error creating scrap bucket:', error);
      
      // Handle different types of errors
      let errorMessage = 'Failed to create scrap bucket. Please try again.';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        errorMessage = error.response.data?.error || errorMessage;
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setErrors(prev => ({
        ...prev,
        form: errorMessage
      }));
    }
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  const filteredBuckets = scrapBuckets.filter(bucket => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      bucket.bucket_name.toLowerCase().includes(searchLower) ||
      (bucket.notes && bucket.notes.toLowerCase().includes(searchLower)) ||
      `SCRP-${bucket.bucket_id}`.toLowerCase().includes(searchLower)
    );

    // Filter by status
    const bucketStatus = bucket.status || 'ACTIVE';
    const matchesStatus = statusFilter === 'ALL' || bucketStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredBuckets.length / itemsPerPage);
  const paginatedBuckets = filteredBuckets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Helper function to get proper image URL
  const getImageUrl = (images) => {
    const placeholderImage = 'https://via.placeholder.com/150';

    const makeAbsoluteUrl = (url) => {
      if (!url) return placeholderImage;

      // Ensure url is a string
      if (typeof url !== 'string') {
        return placeholderImage;
      }

      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      if (url.startsWith('/uploads')) {
        const serverBase = config.apiUrl.replace('/api', '');
        return `${serverBase}${url}`;
      }
      return url;
    };

    try {
      // If images is a string, try to parse it
      if (typeof images === 'string') {
        try {
          images = JSON.parse(images);
        } catch (e) {
          return placeholderImage;
        }
      }

      // If images is an array and has at least one element
      if (Array.isArray(images) && images.length > 0) {
        // Find the primary image first, or use the first image
        const primaryImage = images.find(img => img.isPrimary === true);
        const imageToUse = primaryImage || images[0];

        // Extract the URL from the image object
        let imageUrl;
        if (typeof imageToUse === 'string') {
          imageUrl = imageToUse;
        } else if (imageToUse && typeof imageToUse === 'object') {
          imageUrl = imageToUse.url || imageToUse.image_url || imageToUse.path;
        }

        if (imageUrl) {
          return makeAbsoluteUrl(imageUrl);
        }
      }

      return placeholderImage;
    } catch (error) {
      console.error('Error processing image URL:', error);
      return placeholderImage;
    }
  };

  // Calculate total cost of all items in the bucket
  const calculateTotalCost = () => {
    return bucketItems.reduce((total, item) => {
      const itemPrice = parseFloat(item.item_price || item.buy_price || item.retail_price || 0);
      return total + itemPrice;
    }, 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate total weight from bucket items
  const calculateTotalWeight = () => {
    return bucketItems.reduce((total, item) => {
      const weight = parseFloat(item.metal_weight || item.weight_grams || 0);
      return total + weight;
    }, 0);
  };

  // Calculate weighted average purity
  const calculateAveragePurity = () => {
    const totalWeight = calculateTotalWeight();
    if (totalWeight === 0) return 0;

    const weightedPuritySum = bucketItems.reduce((sum, item) => {
      const weight = parseFloat(item.metal_weight || item.weight_grams || 0);
      const purity = parseFloat(item.purity_value || 0);
      return sum + (weight * purity);
    }, 0);

    return weightedPuritySum / totalWeight;
  };

  // Calculate estimated melt value
  const calculateMeltValue = () => {
    return bucketItems.reduce((total, item) => {
      const meltValue = parseFloat(item.melt_value || 0);
      return total + meltValue;
    }, 0);
  };

  // Handle refresh after creating a bucket
  const handleBucketCreated = () => {
    fetchScrapBuckets();
  };

  // Open confirmation dialog
  const handleDeleteClick = (item) => {
    setConfirmDialog({
      open: true,
      item: item
    });
  };

  // Close confirmation dialog
  const handleCloseConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      item: null
    });
  };

  // Handle delete item from scrap bucket (after confirmation)
  const handleDeleteItem = async () => {
    const item = confirmDialog.item;
    if (!item) return;

    // Close dialog
    handleCloseConfirmDialog();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Update the jewelry item status back to AVAILABLE
      await axios.put(
        `${API_BASE_URL}/jewelry/${item.item_id}`,
        { status: 'AVAILABLE' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove item from the scrap bucket's item_id array
      const updatedItemIds = selectedBucket.item_id.filter(id => id !== item.item_id);

      await axios.put(
        `${API_BASE_URL}/scrap/buckets/${selectedBucket.bucket_id}`,
        { item_id: updatedItemIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh the buckets and bucket items
      const updatedBuckets = await fetchScrapBuckets();
      const refreshedBucket = updatedBuckets.find(b => b.bucket_id === selectedBucket.bucket_id);
      if (refreshedBucket) {
        handleBucketSelect(refreshedBucket);
      }

      // Show success message
      setError(null);
    } catch (err) {
      console.error('Error removing item from scrap bucket:', err);
      console.error('Error details:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to remove item from scrap bucket';
      setError(errorMessage);
    }
  };

  // Open complete bucket confirmation dialog
  const handleCompleteClick = (bucket) => {
    setCompleteDialog({
      open: true,
      bucket: bucket
    });
  };

  // Close complete bucket confirmation dialog
  const handleCloseCompleteDialog = () => {
    setCompleteDialog({
      open: false,
      bucket: null
    });
  };

  // Open edit bucket dialog
  const handleEditBucketClick = (bucket) => {
    setEditBucketDialog({
      open: true,
      bucket: bucket,
      name: bucket.bucket_name || '',
      notes: bucket.notes || ''
    });
  };

  // Close edit bucket dialog
  const handleCloseEditBucketDialog = () => {
    setEditBucketDialog({
      open: false,
      bucket: null,
      name: '',
      notes: ''
    });
  };

  // Handle saving edited bucket
  const handleSaveEditedBucket = async () => {
    const { bucket, name, notes } = editBucketDialog;
    if (!bucket || !name.trim()) {
      setError('Bucket name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/scrap/buckets/${bucket.bucket_id}`,
        {
          bucket_name: name,
          notes: notes || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Close dialog
      handleCloseEditBucketDialog();

      // Refresh buckets
      const updatedBuckets = await fetchScrapBuckets();
      const updatedBucket = updatedBuckets.find(b => b.bucket_id === bucket.bucket_id);
      if (updatedBucket && selectedBucket?.bucket_id === bucket.bucket_id) {
        setSelectedBucket(updatedBucket);
      }

      setError(null);
    } catch (err) {
      console.error('Error updating bucket:', err);
      setError(err.response?.data?.error || 'Failed to update bucket');
    }
  };

  // Open delete bucket confirmation dialog
  const handleDeleteBucketClick = (bucket) => {
    setDeleteBucketDialog({
      open: true,
      bucket: bucket
    });
  };

  // Close delete bucket dialog
  const handleCloseDeleteBucketDialog = () => {
    setDeleteBucketDialog({
      open: false,
      bucket: null
    });
  };

  // Handle deleting bucket
  const handleDeleteBucket = async () => {
    const bucket = deleteBucketDialog.bucket;
    if (!bucket) return;

    // Close dialog
    handleCloseDeleteBucketDialog();

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      await axios.delete(
        `${API_BASE_URL}/scrap/buckets/${bucket.bucket_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh buckets and select first one if available
      const updatedBuckets = await fetchScrapBuckets();
      if (updatedBuckets.length > 0) {
        handleBucketSelect(updatedBuckets[0]);
      } else {
        setSelectedBucket(null);
        setBucketItems([]);
      }

      setError(null);
    } catch (err) {
      console.error('Error deleting bucket:', err);
      setError(err.response?.data?.error || 'Failed to delete bucket');
    }
  };

  // Handle opening add item dialog
  const handleAddItemClick = async () => {
    if (!selectedBucket) {
      setError('Please select a bucket first');
      return;
    }

    try {
      setAddItemDialog({ ...addItemDialog, open: true, loading: true });

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Fetch all jewelry items that are available for scrap (not already in scrap)
      const response = await axios.get(`${API_BASE_URL}/jewelry`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filter items that are not in 'SCRAP' or 'SCRAP PROCESS' or 'SOLD TO REFINER' status
      const availableItems = response.data.filter(item =>
        item.status !== 'SCRAP' &&
        item.status !== 'SCRAP PROCESS' &&
        item.status !== 'SOLD TO REFINER'
      );

      setAddItemDialog({
        open: true,
        availableItems: availableItems,
        selectedItems: [],
        loading: false
      });
    } catch (err) {
      console.error('Error fetching available items:', err);
      setError('Failed to load available items');
      setAddItemDialog({ ...addItemDialog, open: false, loading: false });
    }
  };

  // Handle closing add item dialog
  const handleCloseAddItemDialog = () => {
    setAddItemDialog({
      open: false,
      availableItems: [],
      selectedItems: [],
      loading: false
    });
  };

  // Handle toggling item selection
  const handleToggleItemSelection = (itemId) => {
    setAddItemDialog(prev => {
      const isSelected = prev.selectedItems.includes(itemId);
      return {
        ...prev,
        selectedItems: isSelected
          ? prev.selectedItems.filter(id => id !== itemId)
          : [...prev.selectedItems, itemId]
      };
    });
  };

  // Handle adding selected items to bucket
  const handleAddItemsToBucket = async () => {
    if (addItemDialog.selectedItems.length === 0) {
      setError('Please select at least one item');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Add each selected item to the scrap bucket
      for (const itemId of addItemDialog.selectedItems) {
        await axios.post(
          `${API_BASE_URL}/jewelry/${itemId}/move-to-scrap`,
          {
            moved_by: currentUser?.id || 1,
            bucket_id: selectedBucket.bucket_id
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Close dialog
      handleCloseAddItemDialog();

      // Refresh buckets to update item counts
      const updatedBuckets = await fetchScrapBuckets();

      // Find and refresh the current bucket to show newly added items
      const refreshedBucket = updatedBuckets.find(b => b.bucket_id === selectedBucket.bucket_id);
      if (refreshedBucket) {
        await handleBucketSelect(refreshedBucket);
      }

      setError(null);
    } catch (err) {
      console.error('Error adding items to bucket:', err);
      setError(err.response?.data?.error || 'Failed to add items to bucket');
    }
  };

  // Handle marking bucket as COMPLETE (after confirmation)
  const handleMarkComplete = async () => {
    const bucket = completeDialog.bucket;
    if (!bucket) return;

    // Close dialog
    handleCloseCompleteDialog();

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Update bucket status to COMPLETE with employee ID
      await axios.put(
        `${API_BASE_URL}/scrap/buckets/${bucket.bucket_id}`,
        {
          status: 'COMPLETE',
          updated_by: currentUser?.id || 1
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh the buckets
      const updatedBuckets = await fetchScrapBuckets();
      const completedBucket = updatedBuckets.find(b => b.bucket_id === bucket.bucket_id);

      // If the completed bucket was selected, refresh its items
      if (selectedBucket?.bucket_id === bucket.bucket_id && completedBucket) {
        handleBucketSelect(completedBucket);
      }

      // Show success message
      setError(null);
    } catch (err) {
      console.error('Error marking bucket as complete:', err);
      console.error('Error details:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to mark bucket as complete';
      setError(errorMessage);
    }
  };

  // Define status flow
  const STATUS_FLOW = ['ACTIVE', 'CLOSED', 'SHIPPED', 'PROCESSING', 'COMPLETE'];

  // Get next status in the flow
  const getNextStatus = (currentStatus) => {
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1) {
      return STATUS_FLOW[currentIndex + 1];
    }
    return null;
  };

  // Get previous status in the flow
  const getPreviousStatus = (currentStatus) => {
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    if (currentIndex > 0) {
      return STATUS_FLOW[currentIndex - 1];
    }
    return null;
  };

  // Handle moving bucket to next status
  const handleNextStatus = async () => {
    if (!selectedBucket) return;

    const nextStatus = getNextStatus(selectedBucket.status);
    if (!nextStatus) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/scrap/buckets/${selectedBucket.bucket_id}`,
        {
          status: nextStatus,
          updated_by: currentUser?.id || 1
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh buckets and bucket items
      const updatedBuckets = await fetchScrapBuckets();
      const refreshedBucket = updatedBuckets.find(b => b.bucket_id === selectedBucket.bucket_id);
      if (refreshedBucket) {
        handleBucketSelect(refreshedBucket);
      }

      setError(null);
    } catch (err) {
      console.error('Error updating bucket status:', err);
      setError(err.response?.data?.error || 'Failed to update bucket status');
    }
  };

  // Handle moving bucket to previous status
  const handlePreviousStatus = async () => {
    if (!selectedBucket) return;

    const previousStatus = getPreviousStatus(selectedBucket.status);
    if (!previousStatus) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      await axios.put(
        `${API_BASE_URL}/scrap/buckets/${selectedBucket.bucket_id}`,
        {
          status: previousStatus,
          updated_by: currentUser?.id || 1
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh buckets and bucket items
      const updatedBuckets = await fetchScrapBuckets();
      const refreshedBucket = updatedBuckets.find(b => b.bucket_id === selectedBucket.bucket_id);
      if (refreshedBucket) {
        handleBucketSelect(refreshedBucket);
      }

      setError(null);
    } catch (err) {
      console.error('Error updating bucket status:', err);
      setError(err.response?.data?.error || 'Failed to update bucket status');
    }
  };

  // Handle opening weight photo dialog
  const handleOpenWeightPhotoDialog = () => {
    setWeightPhotoDialog({
      open: true,
      selectedFile: null,
      preview: null,
      uploading: false,
      cameraMode: false,
      stream: null
    });
  };

  // Handle closing weight photo dialog
  const handleCloseWeightPhotoDialog = () => {
    // Stop camera stream if active
    if (weightPhotoDialog.stream) {
      weightPhotoDialog.stream.getTracks().forEach(track => track.stop());
    }
    setWeightPhotoDialog({
      open: false,
      selectedFile: null,
      preview: null,
      uploading: false,
      cameraMode: false,
      stream: null
    });
  };

  // Handle opening camera
  const handleOpenCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setWeightPhotoDialog(prev => ({
        ...prev,
        cameraMode: true,
        stream: stream,
        selectedFile: null,
        preview: null
      }));
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions.');
    }
  };

  // Handle capturing photo from camera
  const handleCapturePhoto = () => {
    const video = document.getElementById('camera-video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      const file = new File([blob], `weight-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      // Stop camera stream
      if (weightPhotoDialog.stream) {
        weightPhotoDialog.stream.getTracks().forEach(track => track.stop());
      }

      setWeightPhotoDialog(prev => ({
        ...prev,
        selectedFile: file,
        preview: previewUrl,
        cameraMode: false,
        stream: null
      }));
    }, 'image/jpeg', 0.95);
  };

  // Handle retaking photo
  const handleRetakePhoto = () => {
    setWeightPhotoDialog(prev => ({
      ...prev,
      selectedFile: null,
      preview: null,
      cameraMode: false
    }));
  };

  // Handle file selection for weight photo
  const handleWeightPhotoFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setWeightPhotoDialog(prev => ({
        ...prev,
        selectedFile: file,
        preview: previewUrl
      }));
    }
  };

  // Handle opening image preview dialog
  const handleOpenImagePreview = (imageUrl) => {
    setImagePreviewDialog({
      open: true,
      imageUrl: imageUrl
    });
  };

  // Handle closing image preview dialog
  const handleCloseImagePreview = () => {
    setImagePreviewDialog({
      open: false,
      imageUrl: null
    });
  };

  // Fetch customers for refiner selection
  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Handle different response formats
      const customersData = Array.isArray(response.data) ? response.data : (response.data.customers || []);
      setCustomers(customersData);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setCustomers([]); // Set empty array on error
      setError('Failed to load customers');
    }
  };

  // Handle opening shipping dialog
  const handleOpenShippingDialog = async () => {
    await fetchCustomers();
    setShippingDialog({
      open: true,
      refiner_customer_id: selectedBucket?.refiner_customer_id || '',
      shipper: selectedBucket?.shipper || '',
      tracking_number: selectedBucket?.tracking_number || '',
      loading: false
    });
  };

  // Handle closing shipping dialog
  const handleCloseShippingDialog = () => {
    setShippingDialog({
      open: false,
      refiner_customer_id: '',
      shipper: '',
      tracking_number: '',
      loading: false
    });
  };

  // Handle saving shipping information
  const handleSaveShippingInfo = async () => {
    if (!selectedBucket) return;

    if (!shippingDialog.refiner_customer_id || !shippingDialog.shipper || !shippingDialog.tracking_number) {
      setError('Please fill in all shipping fields');
      return;
    }

    try {
      setShippingDialog(prev => ({ ...prev, loading: true }));

      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/scrap/buckets/${selectedBucket.bucket_id}`,
        {
          refiner_customer_id: shippingDialog.refiner_customer_id,
          shipper: shippingDialog.shipper,
          tracking_number: shippingDialog.tracking_number
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh buckets
      const updatedBuckets = await fetchScrapBuckets();
      const refreshedBucket = updatedBuckets.find(b => b.bucket_id === selectedBucket.bucket_id);
      if (refreshedBucket) {
        handleBucketSelect(refreshedBucket);
      }

      handleCloseShippingDialog();
      setError(null);
    } catch (err) {
      console.error('Error saving shipping info:', err);
      setError(err.response?.data?.error || 'Failed to save shipping information');
      setShippingDialog(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle opening processing dialog
  const handleOpenProcessingDialog = () => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Convert database date to YYYY-MM-DD format if it exists
    let dateReceived = today;
    if (selectedBucket?.date_received) {
      const dbDate = new Date(selectedBucket.date_received);
      dateReceived = dbDate.toISOString().split('T')[0];
    }

    setProcessingDialog({
      open: true,
      date_received: dateReceived,
      weight_received: selectedBucket?.weight_received || '',
      locked_spot_price: selectedBucket?.locked_spot_price || '',
      payment_advance: selectedBucket?.payment_advance || '',
      loading: false
    });
  };

  // Handle closing processing dialog
  const handleCloseProcessingDialog = () => {
    setProcessingDialog({
      open: false,
      date_received: '',
      weight_received: '',
      locked_spot_price: '',
      payment_advance: '',
      loading: false
    });
  };

  // Handle saving processing information
  const handleSaveProcessingInfo = async () => {
    if (!selectedBucket) return;

    if (!processingDialog.date_received || !processingDialog.weight_received || !processingDialog.locked_spot_price) {
      setError('Please fill in Date Received, Weight Received, and Locked Spot Price');
      return;
    }

    try {
      setProcessingDialog(prev => ({ ...prev, loading: true }));

      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/scrap/buckets/${selectedBucket.bucket_id}`,
        {
          date_received: processingDialog.date_received,
          weight_received: parseFloat(processingDialog.weight_received),
          locked_spot_price: parseFloat(processingDialog.locked_spot_price),
          payment_advance: processingDialog.payment_advance ? parseFloat(processingDialog.payment_advance) : null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh buckets
      const updatedBuckets = await fetchScrapBuckets();
      const refreshedBucket = updatedBuckets.find(b => b.bucket_id === selectedBucket.bucket_id);
      if (refreshedBucket) {
        handleBucketSelect(refreshedBucket);
      }

      handleCloseProcessingDialog();
      setError(null);
    } catch (err) {
      console.error('Error saving processing info:', err);
      setError(err.response?.data?.error || 'Failed to save processing information');
      setProcessingDialog(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle opening completed dialog
  const handleOpenCompletedDialog = () => {
    setCompletedDialog({
      open: true,
      final_weight: selectedBucket?.final_weight || '',
      assay: selectedBucket?.assay || '',
      total_settlement_amount: selectedBucket?.total_settlement_amount || '',
      final_payment_amount: selectedBucket?.final_payment_amount || '',
      loading: false
    });
  };

  // Handle closing completed dialog
  const handleCloseCompletedDialog = () => {
    setCompletedDialog({
      open: false,
      final_weight: '',
      assay: '',
      total_settlement_amount: '',
      final_payment_amount: '',
      loading: false
    });
  };

  // Handle saving completed information
  const handleSaveCompletedInfo = async () => {
    if (!selectedBucket) return;

    if (!completedDialog.final_weight || !completedDialog.assay || !completedDialog.total_settlement_amount || !completedDialog.final_payment_amount) {
      setError('Please fill in all completion fields');
      return;
    }

    try {
      setCompletedDialog(prev => ({ ...prev, loading: true }));

      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/scrap/buckets/${selectedBucket.bucket_id}`,
        {
          final_weight: parseFloat(completedDialog.final_weight),
          assay: parseFloat(completedDialog.assay),
          total_settlement_amount: parseFloat(completedDialog.total_settlement_amount),
          final_payment_amount: parseFloat(completedDialog.final_payment_amount)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh buckets
      const updatedBuckets = await fetchScrapBuckets();
      const refreshedBucket = updatedBuckets.find(b => b.bucket_id === selectedBucket.bucket_id);
      if (refreshedBucket) {
        handleBucketSelect(refreshedBucket);
      }

      handleCloseCompletedDialog();
      setError(null);
    } catch (err) {
      console.error('Error saving completed info:', err);
      setError(err.response?.data?.error || 'Failed to save completion information');
      setCompletedDialog(prev => ({ ...prev, loading: false }));
    }
  };

  // Handle weight photo upload
  const handleUploadWeightPhoto = async () => {
    if (!weightPhotoDialog.selectedFile || !selectedBucket) {
      setError('Please select a photo to upload');
      return;
    }

    try {
      setWeightPhotoDialog(prev => ({ ...prev, uploading: true }));

      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      // Create form data for file upload
      const formData = new FormData();
      formData.append('weight_photo', weightPhotoDialog.selectedFile);
      formData.append('bucket_id', selectedBucket.bucket_id);

      // Upload photo
      await axios.post(
        `${API_BASE_URL}/scrap/buckets/${selectedBucket.bucket_id}/weight-photo`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Close dialog
      handleCloseWeightPhotoDialog();

      // Refresh timestamp to reload image
      setPhotoTimestamp(Date.now());

      // Refresh buckets
      const updatedBuckets = await fetchScrapBuckets();
      const refreshedBucket = updatedBuckets.find(b => b.bucket_id === selectedBucket.bucket_id);
      if (refreshedBucket) {
        handleBucketSelect(refreshedBucket);
      }

      setError(null);
    } catch (err) {
      console.error('Error uploading weight photo:', err);
      setError(err.response?.data?.error || 'Failed to upload weight photo');
      setWeightPhotoDialog(prev => ({ ...prev, uploading: false }));
    }
  };

  // Handle print packing list
  const handlePrintPackingList = () => {
    if (!selectedBucket || !bucketItems.length) {
      setError('No items to print');
      return;
    }

    // Create a printable view
    const printWindow = window.open('', '_blank');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Packing List - ${selectedBucket.bucket_name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 10px; }
            .header-info { margin-bottom: 20px; }
            .header-info p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .summary { margin-top: 20px; }
            .summary p { margin: 5px 0; font-weight: bold; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Scrap Packing List</h1>
          <div class="header-info">
            <p><strong>Bucket Name:</strong> ${selectedBucket.bucket_name}</p>
            <p><strong>Bucket ID:</strong> SCRP-${selectedBucket.bucket_id}</p>
            <p><strong>Status:</strong> ${selectedBucket.status}</p>
            <p><strong>Date Created:</strong> ${new Date(selectedBucket.created_at).toLocaleDateString()}</p>
            <p><strong>Notes:</strong> ${selectedBucket.notes || 'N/A'}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Description</th>
                <th>Weight (g)</th>
                <th>Metal Type</th>
                <th>Purity</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              ${bucketItems.map(item => `
                <tr>
                  <td>${item.item_id || 'N/A'}</td>
                  <td>${item.long_desc || 'N/A'}</td>
                  <td>${parseFloat(item.metal_weight || 0).toFixed(2)}</td>
                  <td>${item.precious_metal_type || 'N/A'}</td>
                  <td>${item.metal_purity || 'N/A'}</td>
                  <td>$${parseFloat(item.item_price || item.buy_price || item.retail_price || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary">
            <p>Total Items: ${bucketItems.length}</p>
            <p>Total Weight: ${bucketItems.reduce((sum, item) => sum + parseFloat(item.metal_weight || 0), 0).toFixed(2)} g</p>
            <p>Total Cost: $${bucketItems.reduce((sum, item) => sum + parseFloat(item.item_price || item.buy_price || item.retail_price || 0), 0).toFixed(2)}</p>
          </div>

          <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #1976d2; color: white; border: none; cursor: pointer;">Print</button>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Scrap Buckets
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleNewScrap}
        >
          New Bucket
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search buckets..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
        {/* Bucket List */}
        <Paper sx={{ width: '30%', p: 2, maxHeight: '70vh', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Buckets</Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilterChange}
              >
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="CLOSED">Closed</MenuItem>
                <MenuItem value="SHIPPED">Shipped</MenuItem>
                <MenuItem value="PROCESSING">Processing</MenuItem>
                <MenuItem value="COMPLETE">Complete</MenuItem>
                <MenuItem value="ALL">All</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <List>
            {paginatedBuckets.length > 0 ? (
              paginatedBuckets.map((bucket) => (
                <ListItem 
                  key={bucket.bucket_id}
                  button 
                  selected={selectedBucket?.bucket_id === bucket.bucket_id}
                  onClick={() => handleBucketSelect(bucket)}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    '&.Mui-selected': {
                      backgroundColor: '#c8e6c9',
                      '&:hover': {
                        backgroundColor: '#c8e6c9',
                      },
                    },
                  }}
                >
                  <ListItemText
                    primary={bucket.bucket_name}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="textSecondary">
                          Items: {bucket.item_id?.length || 0}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2" fontWeight="bold" color="primary">
                          Total: {formatCurrency(bucketTotalCosts[bucket.bucket_id] || 0)}
                        </Typography>
                      </>
                    }
                    primaryTypographyProps={{
                      fontWeight: selectedBucket?.bucket_id === bucket.bucket_id ? 'bold' : 'normal',
                    }}
                  />
                  <Chip
                    label={bucket.status || 'ACTIVE'}
                    color={
                      bucket.status === 'ACTIVE' ? 'success' :
                      bucket.status === 'COMPLETE' ? 'info' :
                      bucket.status === 'PROCESSING' ? 'warning' :
                      bucket.status === 'SHIPPED' ? 'primary' :
                      'default'
                    }
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </ListItem>
              ))
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ p: 2, textAlign: 'center' }}>
                {searchTerm ? 'No matching buckets found' : 'No scrap buckets available'}
              </Typography>
            )}
          </List>
        </Paper>
        {/* Bucket Items */}
        <Paper sx={{ flex: 1, p: 2, maxHeight: '70vh', overflow: 'auto' }}>
          {selectedBucket ? (
            <>
              {/* Bucket Header with Info */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    {selectedBucket.bucket_name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {/* Status Transition Buttons */}
                    {getPreviousStatus(selectedBucket.status) && (
                      <Tooltip title={`Move back to ${getPreviousStatus(selectedBucket.status)}`}>
                        <Button
                          variant="outlined"
                          color="secondary"
                          size="small"
                          startIcon={<ArrowBackIcon />}
                          onClick={handlePreviousStatus}
                        >
                          {getPreviousStatus(selectedBucket.status)}
                        </Button>
                      </Tooltip>
                    )}
                    {getNextStatus(selectedBucket.status) && (
                      <Tooltip title={`Move forward to ${getNextStatus(selectedBucket.status)}`}>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          endIcon={<ArrowForwardIcon />}
                          onClick={handleNextStatus}
                        >
                          {getNextStatus(selectedBucket.status)}
                        </Button>
                      </Tooltip>
                    )}

                    {/* Edit and Delete Buttons for ACTIVE status */}
                    {selectedBucket.status === 'ACTIVE' && (
                      <>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleEditBucketClick(selectedBucket)}
                        >
                          Edit
                        </Button>
                        {bucketItems.length === 0 && (
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteBucketClick(selectedBucket)}
                          >
                            Delete
                          </Button>
                        )}
                      </>
                    )}

                    {/* CLOSED Status Actions */}
                    {selectedBucket.status === 'CLOSED' && (
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<PhotoCameraIcon />}
                        onClick={handleOpenWeightPhotoDialog}
                      >
                        Add Weight Photo
                      </Button>
                    )}

                    {/* Add Item Button */}
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={handleAddItemClick}
                    >
                      Add Item
                    </Button>
                  </Box>
                </Box>

                {/* Print Packing List Button - Below header */}
                {selectedBucket.status === 'CLOSED' && (
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<PrintIcon />}
                      onClick={handlePrintPackingList}
                    >
                      Print Packing List
                    </Button>
                  </Box>
                )}

                {/* Shipping Info Button - Below header */}
                {selectedBucket.status === 'SHIPPED' && (
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={handleOpenShippingDialog}
                    >
                      Enter Shipping Info
                    </Button>
                  </Box>
                )}

                {/* Processing Info Button - Below header */}
                {selectedBucket.status === 'PROCESSING' && (
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={handleOpenProcessingDialog}
                    >
                      Enter Processing Info
                    </Button>
                  </Box>
                )}

                {/* Completed Info Button - Below header */}
                {selectedBucket.status === 'COMPLETE' && (
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={handleOpenCompletedDialog}
                    >
                      Enter Completion Info
                    </Button>
                  </Box>
                )}

                {/* Bucket Details Grid */}
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: selectedBucket.status === 'CLOSED' ? 'repeat(3, 1fr) 120px' : 'repeat(3, 1fr)',
                  gridTemplateRows: '35px 35px',
                  gap: 1,
                  p: 1,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}>
                  {/* Row 1, Col 1 */}
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Date Created
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatDate(selectedBucket.created_at)}
                    </Typography>
                  </Box>

                  {/* Row 1, Col 2 */}
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Status Date
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatDate(selectedBucket.updated_at)}
                    </Typography>
                  </Box>

                  {/* Row 1, Col 3 */}
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Total Items
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {bucketItems.length}
                    </Typography>
                  </Box>

                  {/* Weight Photo - Only show for CLOSED status - Spans last column and 2 rows */}
                  {selectedBucket.status === 'CLOSED' && (
                    <Box sx={{
                      gridRow: 'span 2',
                      overflow: 'hidden',
                      borderRadius: 1,
                      bgcolor: 'grey.100'
                    }}>
                      {selectedBucket.bucket_id && API_BASE_URL ? (
                        <Box
                          key={`weight-photo-${photoTimestamp}`}
                          component="img"
                          src={(() => {
                            const url = `${API_BASE_URL}/scrap/buckets/${selectedBucket.bucket_id}/weight-photo?t=${photoTimestamp}`;
                            return url;
                          })()}
                          alt="Bucket weight"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            const imageUrl = `${API_BASE_URL}/scrap/buckets/${selectedBucket.bucket_id}/weight-photo?t=${photoTimestamp}`;
                            handleOpenImagePreview(imageUrl);
                          }}
                          onError={(e) => {
                            e.target.onerror = null; // Prevent infinite loop
                            e.target.src = 'https://via.placeholder.com/150?text=No+Photo';
                          }}
                        />
                      ) : (
                        <Box
                          component="img"
                          src="https://via.placeholder.com/150?text=No+Photo"
                          alt="No photo"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      )}
                    </Box>
                  )}

                  {/* Row 2, Col 1 */}
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Total Weight
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {calculateTotalWeight().toFixed(2)} g
                    </Typography>
                  </Box>

                  {/* Row 2, Col 2 */}
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Calculated Purity
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {(calculateAveragePurity() * 100).toFixed(2)}%
                    </Typography>
                  </Box>

                  {/* Row 2, Col 3 */}
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Estimated Melt Value
                    </Typography>
                    <Typography variant="body2" fontWeight="medium" color="primary">
                      {formatCurrency(calculateMeltValue())}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Metal Type Summary and Items Table */}
              {bucketItems.length > 0 ? (
                <>
                  <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Image</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Weight (g)</TableCell>
                        <TableCell>Cost</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bucketItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.item_id || 'N/A'}</TableCell>

                          <TableCell>
                            <Box
                              key={`img-${item.item_id}`}
                              component="img"
                              src={getImageUrl(item.images)}
                              alt={item.long_desc || 'Item'}
                              sx={{
                                width: 50,
                                height: 50,
                                objectFit: 'cover',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider'
                              }}
                              onError={(e) => {
                                e.target.onerror = null; // Prevent infinite loop
                                e.target.src = `https://via.placeholder.com/50?text=No+Image`;
                              }}
                            />
                          </TableCell>
                          <TableCell>{item.long_desc || 'Unnamed Item'}</TableCell>
                          <TableCell>{parseFloat(item.metal_weight || item.weight_grams || 0).toFixed(2)}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(item.item_price || item.buy_price || item.retail_price || 0))}</TableCell>
                          <TableCell>
                            <Tooltip
                              title={selectedBucket.status === 'CLOSED' ? "Cannot remove items from closed bucket" : "Remove from Scrap"}
                              arrow
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteClick(item)}
                                  disabled={selectedBucket.status === 'CLOSED'}
                                >
                                  <RemoveCircleOutlineIcon
                                    fontSize="small"
                                    color={selectedBucket.status === 'CLOSED' ? "disabled" : "error"}
                                  />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </TableContainer>
                </>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                  <Typography>No items in this bucket yet. Click "Add Item" above to add items.</Typography>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Typography>Select a bucket to view items</Typography>
            </Box>
          )}
        </Paper>
      </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <IconButton 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon />
              </IconButton>
              <Box display="flex" alignItems="center" mx={1}>
                Page {currentPage} of {totalPages}
              </Box>
              <IconButton
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
          )}
        </>
      )}
      
      {/* Create Scrap Bucket Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCloseDialog}>
        <DialogTitle>Create New Scrap Bucket</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleCreateBucket} sx={{ mt: 2 }}>
          <TextField
              autoFocus
              margin="dense"
              label="Bucket Name"
              type="text"
              fullWidth
              variant="outlined"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              error={!!errors.bucketName}
              helperText={errors.bucketName || 'A unique name for your scrap bucket'}
            />

            <FormControl fullWidth error={!!errors.bucketType}>
              <InputLabel id="bucket-type-label">Bucket Type</InputLabel>
              <Select
                labelId="bucket-type-label"
                value={bucketType}
                label="Bucket Type"
                onChange={(e) => setBucketType(e.target.value)}
              >
                <MenuItem value="gold">Gold</MenuItem>
                <MenuItem value="silver">Silver</MenuItem>
                <MenuItem value="platinum">Platinum</MenuItem>
                <MenuItem value="general">General</MenuItem>
              </Select>
              <FormHelperText>{errors.bucketType || 'Select the type of scrap for this bucket'}</FormHelperText>
            </FormControl>

            <TextField
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={!!errors.description}
              helperText={errors.description || 'Optional: Add notes about this scrap bucket'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleCreateBucket} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Delete */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="confirm-dialog-title"
      >
        <DialogTitle id="confirm-dialog-title">
          Move Item to Inventory?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to move this item back to inventory?
          </Typography>
          {confirmDialog.item && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>Item ID:</strong> {confirmDialog.item.item_id}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Description:</strong> {confirmDialog.item.long_desc || 'Unnamed Item'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteItem} variant="contained" color="primary">
            Yes, Move to Inventory
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog for Mark as Complete */}
      <Dialog
        open={completeDialog.open}
        onClose={handleCloseCompleteDialog}
        aria-labelledby="complete-dialog-title"
      >
        <DialogTitle id="complete-dialog-title">
          Mark Bucket as Complete?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to mark this bucket as complete?
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ mt: 2, fontWeight: 'bold' }}>
            Warning: All items in this bucket will be marked as "SOLD TO REFINER" and removed from active inventory.
          </Typography>
          {completeDialog.bucket && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                <strong>Bucket:</strong> {completeDialog.bucket.bucket_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>Number of Items:</strong> {completeDialog.bucket.item_id?.length || 0}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompleteDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleMarkComplete} variant="contained" color="success">
            Yes, Mark as Complete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Bucket Dialog */}
      <Dialog open={editBucketDialog.open} onClose={handleCloseEditBucketDialog}>
        <DialogTitle>Edit Bucket</DialogTitle>
        <DialogContent>
          <TextField
            label="Bucket Name"
            value={editBucketDialog.name}
            onChange={(e) => setEditBucketDialog({...editBucketDialog, name: e.target.value})}
            fullWidth
            margin="dense"
            required
          />
          <TextField
            label="Notes/Description"
            value={editBucketDialog.notes}
            onChange={(e) => setEditBucketDialog({...editBucketDialog, notes: e.target.value})}
            fullWidth
            multiline
            rows={3}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditBucketDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSaveEditedBucket} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Bucket Confirmation Dialog */}
      <Dialog open={deleteBucketDialog.open} onClose={handleCloseDeleteBucketDialog}>
        <DialogTitle>Delete Bucket?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this bucket? This action cannot be undone.
          </Typography>
          {deleteBucketDialog.bucket && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Bucket:</strong> {deleteBucketDialog.bucket.bucket_name}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteBucketDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteBucket} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog
        open={addItemDialog.open}
        onClose={handleCloseAddItemDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Items to Bucket</DialogTitle>
        <DialogContent>
          {addItemDialog.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Select items to add to <strong>{selectedBucket?.bucket_name}</strong>
              </Typography>
              {addItemDialog.availableItems.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', p: 3 }}>
                  No items available to add to scrap
                </Typography>
              ) : (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {addItemDialog.availableItems.map((item) => (
                    <ListItemButton
                      key={item.item_id}
                      onClick={() => handleToggleItemSelection(item.item_id)}
                      dense
                    >
                      <Checkbox
                        edge="start"
                        checked={addItemDialog.selectedItems.includes(item.item_id)}
                        tabIndex={-1}
                        disableRipple
                      />
                      <ListItemText
                        primary={`${item.item_id} - ${item.long_desc || 'No description'}`}
                        secondary={
                          <>
                            {item.metal_weight && `${item.metal_weight}g | `}
                            {item.precious_metal_type && `${item.precious_metal_type} | `}
                            {item.status}
                          </>
                        }
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
              {addItemDialog.selectedItems.length > 0 && (
                <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
                  {addItemDialog.selectedItems.length} item(s) selected
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddItemDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleAddItemsToBucket}
            variant="contained"
            color="primary"
            disabled={addItemDialog.selectedItems.length === 0}
          >
            Add to Bucket
          </Button>
        </DialogActions>
      </Dialog>

      {/* Weight Photo Upload Dialog */}
      <Dialog
        open={weightPhotoDialog.open}
        onClose={handleCloseWeightPhotoDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Weight Photo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Upload a photo showing the total weight for <strong>{selectedBucket?.bucket_name}</strong>
          </Typography>

          {!weightPhotoDialog.cameraMode && !weightPhotoDialog.preview && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {/* Camera Capture */}
              <Button
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                fullWidth
                onClick={handleOpenCamera}
              >
                Take Photo
              </Button>

              {/* File Upload */}
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="weight-photo-upload"
                type="file"
                onChange={handleWeightPhotoFileSelect}
              />
              <label htmlFor="weight-photo-upload" style={{ flex: 1 }}>
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<AddIcon />}
                  fullWidth
                >
                  Select Photo
                </Button>
              </label>
            </Box>
          )}

          {/* Camera View */}
          {weightPhotoDialog.cameraMode && (
            <Box sx={{ textAlign: 'center' }}>
              <video
                id="camera-video"
                autoPlay
                playsInline
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  borderRadius: '4px',
                  backgroundColor: '#000'
                }}
              />
              <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PhotoCameraIcon />}
                  onClick={handleCapturePhoto}
                >
                  Capture
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCloseWeightPhotoDialog}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}

          {/* Preview */}
          {weightPhotoDialog.preview && !weightPhotoDialog.cameraMode && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>Preview:</Typography>
              <img
                src={weightPhotoDialog.preview}
                alt="Weight preview"
                style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px' }}
              />
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleRetakePhoto}
                >
                  Retake
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!weightPhotoDialog.cameraMode && (
            <>
              <Button onClick={handleCloseWeightPhotoDialog} color="inherit">
                Cancel
              </Button>
              {weightPhotoDialog.preview && (
                <Button
                  onClick={handleUploadWeightPhoto}
                  variant="contained"
                  color="primary"
                  disabled={!weightPhotoDialog.selectedFile || weightPhotoDialog.uploading}
                  startIcon={weightPhotoDialog.uploading ? <CircularProgress size={20} /> : null}
                >
                  {weightPhotoDialog.uploading ? 'Uploading...' : 'Upload'}
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={imagePreviewDialog.open}
        onClose={handleCloseImagePreview}
        maxWidth="sm"
      >
        <DialogTitle sx={{ py: 1, px: 2 }}>
          Weight Photo
          <IconButton
            aria-label="close"
            onClick={handleCloseImagePreview}
            sx={{
              position: 'absolute',
              right: 4,
              top: 4,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 1 }}>
          {imagePreviewDialog.imageUrl && (
            <Box
              component="img"
              src={imagePreviewDialog.imageUrl}
              alt="Weight photo preview"
              sx={{
                width: '100%',
                height: 'auto',
                maxHeight: '50vh',
                objectFit: 'contain'
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Shipping Information Dialog */}
      <Dialog
        open={shippingDialog.open}
        onClose={handleCloseShippingDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Enter Shipping Information</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Refiner Customer Selection */}
            <FormControl fullWidth>
              <InputLabel>Refiner Customer</InputLabel>
              <Select
                value={shippingDialog.refiner_customer_id}
                label="Refiner Customer"
                onChange={(e) => setShippingDialog(prev => ({ ...prev, refiner_customer_id: e.target.value }))}
              >
                <MenuItem value="">
                  <em>Select a refiner</em>
                </MenuItem>
                {Array.isArray(customers) && customers.length > 0 ? (
                  customers.map((customer) => (
                    <MenuItem key={customer.id} value={customer.id}>
                      {customer.first_name} {customer.last_name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>
                    <em>No customers available</em>
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {/* Shipper Input */}
            <TextField
              label="Shipper"
              value={shippingDialog.shipper}
              onChange={(e) => setShippingDialog(prev => ({ ...prev, shipper: e.target.value }))}
              fullWidth
              placeholder="e.g., FedEx, UPS, USPS"
            />

            {/* Tracking Number Input */}
            <TextField
              label="Tracking Number"
              value={shippingDialog.tracking_number}
              onChange={(e) => setShippingDialog(prev => ({ ...prev, tracking_number: e.target.value }))}
              fullWidth
              placeholder="Enter tracking number"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShippingDialog} disabled={shippingDialog.loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveShippingInfo}
            variant="contained"
            color="primary"
            disabled={shippingDialog.loading}
          >
            {shippingDialog.loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Processing Information Dialog */}
      <Dialog
        open={processingDialog.open}
        onClose={handleCloseProcessingDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Enter Processing Information</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Date Received */}
            <TextField
              label="Date Received"
              type="date"
              value={processingDialog.date_received}
              onChange={(e) => setProcessingDialog(prev => ({ ...prev, date_received: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />

            {/* Weight Received */}
            <TextField
              label="Weight Received (grams)"
              type="number"
              value={processingDialog.weight_received}
              onChange={(e) => setProcessingDialog(prev => ({ ...prev, weight_received: e.target.value }))}
              fullWidth
              inputProps={{ step: "0.01", min: "0" }}
              required
            />

            {/* Locked Spot Price */}
            <TextField
              label="Locked Spot Price"
              type="number"
              value={processingDialog.locked_spot_price}
              onChange={(e) => setProcessingDialog(prev => ({ ...prev, locked_spot_price: e.target.value }))}
              fullWidth
              inputProps={{ step: "0.01", min: "0" }}
              required
            />

            {/* Payment Advance */}
            <TextField
              label="Payment Advance (Optional)"
              type="number"
              value={processingDialog.payment_advance}
              onChange={(e) => setProcessingDialog(prev => ({ ...prev, payment_advance: e.target.value }))}
              fullWidth
              inputProps={{ step: "0.01", min: "0" }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProcessingDialog} disabled={processingDialog.loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveProcessingInfo}
            variant="contained"
            color="primary"
            disabled={processingDialog.loading}
          >
            {processingDialog.loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Completion Information Dialog */}
      <Dialog
        open={completedDialog.open}
        onClose={handleCloseCompletedDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Enter Completion Information</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Final Weight */}
            <TextField
              label="Final Weight (grams)"
              type="number"
              value={completedDialog.final_weight}
              onChange={(e) => setCompletedDialog(prev => ({ ...prev, final_weight: e.target.value }))}
              fullWidth
              inputProps={{ step: "0.01", min: "0" }}
              required
            />

            {/* Assay */}
            <TextField
              label="Assay (%)"
              type="number"
              value={completedDialog.assay}
              onChange={(e) => setCompletedDialog(prev => ({ ...prev, assay: e.target.value }))}
              fullWidth
              inputProps={{ step: "0.01", min: "0", max: "100" }}
              required
            />

            {/* Total Settlement Amount */}
            <TextField
              label="Total Settlement Amount ($)"
              type="number"
              value={completedDialog.total_settlement_amount}
              onChange={(e) => setCompletedDialog(prev => ({ ...prev, total_settlement_amount: e.target.value }))}
              fullWidth
              inputProps={{ step: "0.01", min: "0" }}
              required
            />

            {/* Final Payment Amount */}
            <TextField
              label="Final Payment Amount ($)"
              type="number"
              value={completedDialog.final_payment_amount}
              onChange={(e) => setCompletedDialog(prev => ({ ...prev, final_payment_amount: e.target.value }))}
              fullWidth
              inputProps={{ step: "0.01", min: "0" }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCompletedDialog} disabled={completedDialog.loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveCompletedInfo}
            variant="contained"
            color="primary"
            disabled={completedDialog.loading}
          >
            {completedDialog.loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Scrap;