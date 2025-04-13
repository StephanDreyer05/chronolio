import { Router } from 'express';
import { db } from '../../../db/index.js';
import { templates } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Get public templates
router.get('/public', async (req, res) => {
  try {
    const publicTemplates = await db
      .select()
      .from(templates)
      .where(eq(templates.isPublic, true));
    
    res.json(publicTemplates);
  } catch (error) {
    console.error('Error fetching public templates:', error);
    res.status(500).json({ error: 'Failed to fetch public templates' });
  }
});

// ... existing routes ...

export default router; 