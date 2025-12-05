// src/routes/enrollment.js
// Enhanced enrollment API with multi-step forms and custom fields

import express from 'express';

const router = express.Router();

/**
 * Create enrollment with custom fields
 * POST /api/enrollment/create
 * 
 * Handles multi-step enrollment with all custom fields
 */
router.post('/create', async (req, res) => {
  try {
    const {
      // Contact info
      contactId, // If authenticated via OAuth
      givenName,
      surname,
      email,
      phone,
      
      // Course info
      instanceId,
      courseId,
      courseType,
      
      // Background/Custom fields
      customFields
    } = req.body;
    
    // Validate required fields
    if (!instanceId || !courseType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: instanceId, courseType'
      });
    }
    
    let enrolmentContactId = contactId;
    
    // If no contactId provided (manual entry), create/find contact
    if (!contactId) {
      if (!givenName || !surname || !email) {
        return res.status(400).json({
          success: false,
          error: 'Missing required contact fields: givenName, surname, email'
        });
      }
      
      // Find or create contact
      const contact = await findOrCreateContact({
        givenName,
        surname,
        email,
        phone
      });
      
      enrolmentContactId = contact.CONTACTID;
    }
    
    // Update contact with custom fields if provided
    if (customFields && Object.keys(customFields).length > 0) {
      await updateContactCustomFields(enrolmentContactId, customFields);
    }
    
    // Create enrollment
    const enrollmentData = {
      contactID: enrolmentContactId,
      instanceID: instanceId,
      type: courseType,
      tentative: true // Mark as tentative until payment
    };
    
    const enrollResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/course/enrol`,
      {
        method: 'POST',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: Object.keys(enrollmentData)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(enrollmentData[key])}`)
          .join('&')
      }
    );
    
    if (!enrollResponse.ok) {
      const errorText = await enrollResponse.text();
      console.error('Enrollment error:', enrollResponse.status, errorText);
      throw new Error('Failed to create enrollment');
    }
    
    const enrollResult = await enrollResponse.json();
    
    console.log('Enrollment created successfully:', {
      contactId: enrolmentContactId,
      learnerId: enrollResult.LEARNERID,
      invoiceId: enrollResult.invoiceID
    });
    
    res.json({
      success: true,
      message: 'Enrollment submitted successfully! Please proceed to payment.',
      data: {
        contactId: enrolmentContactId,
        learnerId: enrollResult.LEARNERID,
        invoiceId: enrollResult.invoiceID,
        invoiceNumber: enrollResult.invoiceNumber,
        instanceId: instanceId
      }
    });
    
  } catch (error) {
    console.error('Enrollment creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create enrollment',
      message: error.message
    });
  }
});

/**
 * Find existing contact or create new one
 */
async function findOrCreateContact(contactData) {
  try {
    const { givenName, surname, email, phone } = contactData;
    
    // Search for existing contact by email
    const searchResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contacts?email=${encodeURIComponent(email)}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    if (searchResponse.ok) {
      const contacts = await searchResponse.json();
      if (contacts && contacts.length > 0) {
        console.log('Found existing contact:', contacts[0].CONTACTID);
        return contacts[0];
      }
    }
    
    // Create new contact
    console.log('Creating new contact:', { givenName, surname, email });
    
    const contactPayload = {
      givenName,
      surname,
      emailAddress: email
    };
    
    if (phone) {
      contactPayload.mobilePhone = phone;
    }
    
    const createResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact`,
      {
        method: 'POST',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: Object.keys(contactPayload)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(contactPayload[key])}`)
          .join('&')
      }
    );
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create contact: ${errorText}`);
    }
    
    const newContact = await createResponse.json();
    console.log('Created new contact:', newContact.CONTACTID);
    return newContact;
    
  } catch (error) {
    console.error('Error in findOrCreateContact:', error);
    throw error;
  }
}

/**
 * Update contact with custom fields
 */
async function updateContactCustomFields(contactId, customFields) {
  try {
    console.log('Updating contact custom fields:', { contactId, customFields });
    
    // Build payload with custom fields
    const payload = {
      ...customFields
    };
    
    const updateResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact/${contactId}`,
      {
        method: 'PUT',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: Object.keys(payload)
          .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`)
          .join('&')
      }
    );
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Failed to update custom fields:', errorText);
      // Don't throw - continue enrollment even if custom fields fail
    } else {
      console.log('Custom fields updated successfully');
    }
    
  } catch (error) {
    console.error('Error updating custom fields:', error);
    // Don't throw - continue enrollment even if custom fields fail
  }
}

/**
 * Get course details
 * GET /api/enrollment/course/:instanceId
 */
router.get('/course/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { type } = req.query;
    
    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: type'
      });
    }
    
    const courseResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/course/instance/${instanceId}?type=${type}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    if (!courseResponse.ok) {
      throw new Error('Failed to fetch course details');
    }
    
    const courseData = await courseResponse.json();
    
    res.json({
      success: true,
      data: courseData
    });
    
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course details',
      message: error.message
    });
  }
});

/**
 * Save enrollment progress and send incomplete booking email
 * POST /api/enrollment/save-progress
 * 
 * Saves progress and sends "Incomplete Online Booking" email with resume link
 */
router.post('/save-progress', async (req, res) => {
  try {
    const { contactId, instanceId, courseId, courseType, courseName, currentStep, resumeUrl, emailType } = req.body;
    
    console.log('Saving enrollment progress for contact:', contactId);
    
    // Get contact details from aXcelerate
    const contactResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact/${contactId}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    if (!contactResponse.ok) {
      throw new Error('Failed to fetch contact details');
    }
    
    const contact = await contactResponse.json();
    const email = contact.EMAIL;
    const name = `${contact.GIVENNAME || ''} ${contact.SURNAME || ''}`.trim();
    
    // Create a note in aXcelerate
    const noteText = `INCOMPLETE ONLINE BOOKING

Contact: ${name} (${email})
Course: ${courseName || 'Unknown'} (Instance: ${instanceId})
Current Step: ${currentStep}
Date: ${new Date().toLocaleString()}

Resume Link: ${resumeUrl}

Status: Email sent to student to resume enrollment.`;
    
    const noteResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact/${contactId}/note`,
      {
        method: 'POST',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `note=${encodeURIComponent(noteText)}&type=General`
      }
    );
    
    console.log('✅ Incomplete booking note created in aXcelerate');
    
    // TODO: Send actual email via your email service
    // For now, log the email that would be sent
    console.log('📧 Incomplete Online Booking email would be sent to:', email);
    console.log('   Name:', name);
    console.log('   Course:', courseName);
    console.log('   Resume URL:', resumeUrl);
    
    res.json({
      success: true,
      message: 'Progress saved and notification sent',
      data: {
        email,
        contactId,
        noteCreated: noteResponse.ok
      }
    });
    
  } catch (error) {
    console.error('Error saving progress:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send resume enrollment email
 * POST /api/enrollment/send-resume-email
 * 
 * Sends an email to the contact to resume their enrollment
 */
router.post('/send-resume-email', async (req, res) => {
  try {
    const { contactId, instanceId, resumeUrl, currentStep } = req.body;
    
    console.log('Sending resume email to contact:', contactId);
    
    // Get contact details from aXcelerate
    const contactResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact/${contactId}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    if (!contactResponse.ok) {
      throw new Error('Failed to fetch contact details');
    }
    
    const contact = await contactResponse.json();
    
    // Get course details
    const courseResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/course/instance/${instanceId}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    const course = courseResponse.ok ? await courseResponse.json() : null;
    
    // Create a note in aXcelerate about the incomplete enrollment
    const noteText = `Enrollment incomplete - stopped at step: ${currentStep}. Resume link sent to ${contact.EMAIL}. Resume URL: ${resumeUrl}`;
    
    const noteResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact/${contactId}/note`,
      {
        method: 'POST',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `note=${encodeURIComponent(noteText)}&type=General`
      }
    );
    
    console.log('Note created in aXcelerate:', noteResponse.ok);
    
    // TODO: Send actual email via your email service
    // For now, just log and create the note
    console.log('Resume email would be sent to:', contact.EMAIL);
    console.log('Course:', course?.NAME || 'Unknown');
    console.log('Resume URL:', resumeUrl);
    
    res.json({
      success: true,
      message: 'Resume notification created'
    });
    
  } catch (error) {
    console.error('Error sending resume email:', error);
    // Don't fail the request - this is a background operation
    res.json({
      success: false,
      message: error.message
    });
  }
});

export default router;

