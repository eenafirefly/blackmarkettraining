import express from 'express';
import { SyncLogRepository, ProductMappingRepository } from '../db/repositories.js';

const router = express.Router();

/**
 * Admin Dashboard - Home
 */
router.get('/', async (req, res) => {
  try {
    const stats = await SyncLogRepository.getStats();
    const recentLogs = await SyncLogRepository.getRecent(10);
    const mappings = await ProductMappingRepository.getAllActive();

    res.render('dashboard', {
      stats,
      recentLogs,
      mappingsCount: mappings.length,
      title: 'Shopify → aXcelerate Integration'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', {
      error: 'Failed to load dashboard',
      message: error.message
    });
  }
});

/**
 * Sync Logs Page
 */
router.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status || null;

    const logs = await SyncLogRepository.getRecent(limit, offset, statusFilter);
    const stats = await SyncLogRepository.getStats();

    res.render('logs', {
      logs,
      stats,
      currentPage: page,
      statusFilter,
      title: 'Sync Logs'
    });
  } catch (error) {
    console.error('Logs page error:', error);
    res.status(500).render('error', {
      error: 'Failed to load logs',
      message: error.message
    });
  }
});

/**
 * Product Mappings Page
 */
router.get('/mappings', async (req, res) => {
  try {
    const mappings = await ProductMappingRepository.getAllActive();

    res.render('mappings', {
      mappings,
      title: 'Product Mappings'
    });
  } catch (error) {
    console.error('Mappings page error:', error);
    res.status(500).render('error', {
      error: 'Failed to load mappings',
      message: error.message
    });
  }
});

/**
 * Add Product Mapping (Form)
 */
router.get('/mappings/new', (req, res) => {
  res.render('mapping-form', {
    title: 'Add Product Mapping',
    mapping: null,
    action: '/admin/mappings',
    method: 'POST'
  });
});

/**
 * Create Product Mapping (POST)
 */
router.post('/mappings', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const {
      shopifyProductId,
      shopifyVariantId,
      productTitle,
      bookingMetadataKey,
      axcelerateInstanceId,
      axcelerateType,
      notes
    } = req.body;

    await ProductMappingRepository.create({
      shopifyProductId,
      shopifyVariantId: shopifyVariantId || null,
      productTitle,
      bookingMetadataKey: bookingMetadataKey || null,
      axcelerateInstanceId,
      axcelerateType: axcelerateType || 'p',
      notes: notes || null
    });

    res.redirect('/admin/mappings?success=created');
  } catch (error) {
    console.error('Create mapping error:', error);
    res.status(500).render('error', {
      error: 'Failed to create mapping',
      message: error.message
    });
  }
});

/**
 * Edit Product Mapping (Form)
 */
router.get('/mappings/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const mappings = await ProductMappingRepository.getAllActive();
    const mapping = mappings.find(m => m.id === parseInt(id));

    if (!mapping) {
      return res.status(404).render('error', {
        error: 'Mapping not found',
        message: `No mapping found with ID ${id}`
      });
    }

    res.render('mapping-form', {
      title: 'Edit Product Mapping',
      mapping,
      action: `/admin/mappings/${id}`,
      method: 'POST'
    });
  } catch (error) {
    console.error('Edit mapping error:', error);
    res.status(500).render('error', {
      error: 'Failed to load mapping',
      message: error.message
    });
  }
});

/**
 * Update Product Mapping (POST)
 */
router.post('/mappings/:id', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      axcelerateInstanceId,
      bookingMetadataKey,
      notes,
      isActive
    } = req.body;

    await ProductMappingRepository.update(parseInt(id), {
      axcelerateInstanceId,
      bookingMetadataKey: bookingMetadataKey || null,
      notes: notes || null,
      isActive: isActive === 'on'
    });

    res.redirect('/admin/mappings?success=updated');
  } catch (error) {
    console.error('Update mapping error:', error);
    res.status(500).render('error', {
      error: 'Failed to update mapping',
      message: error.message
    });
  }
});

/**
 * Delete Product Mapping
 */
router.post('/mappings/:id/delete', async (req, res) => {
  try {
    const { id } = req.params;
    await ProductMappingRepository.delete(parseInt(id));
    res.redirect('/admin/mappings?success=deleted');
  } catch (error) {
    console.error('Delete mapping error:', error);
    res.status(500).render('error', {
      error: 'Failed to delete mapping',
      message: error.message
    });
  }
});

/**
 * API: Get stats (JSON)
 */
router.get('/api/stats', async (req, res) => {
  try {
    const stats = await SyncLogRepository.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: Get recent logs (JSON)
 */
router.get('/api/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const statusFilter = req.query.status || null;

    const logs = await SyncLogRepository.getRecent(limit, offset, statusFilter);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

