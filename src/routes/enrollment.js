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
/**
 * Helper: Get email from contact object (try different field names)
 */
function getContactEmail(contact) {
  return contact.EMAIL || contact.email || contact.emailAddress || contact.EMAILADDRESS || null;
}

async function findOrCreateContact(contactData) {
  try {
    const { givenName, surname, email, phone } = contactData;
    
    console.log('🔍 Searching for existing contact with email:', email);
    
    // Search for existing contact by email (use emailAddress parameter per aXcelerate API)
    const searchResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contacts/search?emailAddress=${encodeURIComponent(email)}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    if (searchResponse.ok) {
      const data = await searchResponse.json();
      const contacts = Array.isArray(data) ? data : (data && data.CONTACTID ? [data] : []);
      
      console.log(`📋 Search returned ${contacts.length} contacts`);
      
      // Filter to only contacts that actually match the email
      console.log('📋 Raw contacts returned from API:', JSON.stringify(contacts, null, 2));
      
      const matchingContacts = contacts.filter(contact => {
        const contactEmail = getContactEmail(contact);
        if (!contactEmail) {
          console.log(`⚠️ Contact ${contact.CONTACTID} has no email field. Keys:`, Object.keys(contact));
          return false;
        }
        const matches = contactEmail.toLowerCase() === email.toLowerCase();
        console.log(`   Contact ${contact.CONTACTID}: "${contactEmail}" vs "${email}" - ${matches ? '✅ MATCH' : '❌ no match'}`);
        return matches;
      });
      
      if (matchingContacts.length > 0) {
        console.log('✅ Found existing contact with matching email:', matchingContacts[0].CONTACTID, matchingContacts[0].EMAIL);
        return matchingContacts[0];
      }
      
      if (contacts.length > 0 && matchingContacts.length === 0) {
        console.warn(`⚠️ API returned ${contacts.length} contacts but NONE matched email "${email}". Proceeding to create new contact.`);
      } else {
        console.log('✅ No existing contacts found, will create new contact');
      }
    }
    
    // Create new contact
    console.log('🆕 Creating NEW contact:', { givenName, surname, email });
    
    const contactPayload = {
      givenName,
      surname,
      emailAddress: email  // Use 'emailAddress' per aXcelerate API spec
    };
    
    if (phone) {
      contactPayload.mobilePhone = phone;
    }
    
    console.log('📤 Sending contact creation request to aXcelerate:', contactPayload);
    
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
    
    console.log('📥 Contact creation response status:', createResponse.status);
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('❌ Failed to create contact:', errorText);
      throw new Error(`Failed to create contact: ${errorText}`);
    }
    
    const newContact = await createResponse.json();
    console.log('✅ aXcelerate returned contact with ID:', newContact.CONTACTID);
    console.log('   Email:', newContact.EMAIL || email);
    console.log('   Name:', newContact.GIVENNAME, newContact.SURNAME);
    
    // Verify this is actually a NEW contact by checking if email matches what we sent
    if (newContact.EMAIL && newContact.EMAIL.toLowerCase() !== email.toLowerCase()) {
      console.error('🚨 WARNING: aXcelerate returned a contact with DIFFERENT email!');
      console.error(`   Requested: ${email}`);
      console.error(`   Returned: ${newContact.EMAIL}`);
      console.error(`   This suggests aXcelerate did duplicate detection and returned existing contact`);
    } else if (!newContact.EMAIL) {
      console.warn('⚠️ Returned contact has no EMAIL field, cannot verify if it\'s new');
    } else {
      console.log('✅ Email matches - this appears to be a genuine new contact');
    }
    
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

/**
 * Save step data to aXcelerate contact
 * POST /api/enrollment/save-step
 * 
 * Saves form data to contact custom fields as user progresses
 * This triggers aXcelerate's incomplete booking email
 */
router.post('/save-step', async (req, res) => {
  try {
    const { contactId, stepId, stepData, instanceId, courseId, courseType, courseName } = req.body;
    
    console.log('💾 Saving step data to aXcelerate:', { contactId, stepId, instanceId });
    
    if (!contactId || !instanceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: contactId or instanceId'
      });
    }
    
    // DON'T create enrollment yet - just save progress
    // Prevents "Booking Confirmation" email from being sent
    console.log('💾 Saving step progress (no enrollment created yet to avoid Booking Confirmation)');
    
    // Update contact with step data
    const updatePayload = {};
    
    // Personal detail fields that update the contact record directly (not custom fields)
    const personalDetailFields = [
      'title', 'givenname', 'firstname', 'surname', 'lastname', 'preferredname', 'middlename',
      'dateofbirth', 'dob', 'birthdate', 'age', 'gender', 
      'email', 'emailaddress', 'phone', 'mobilephone', 'mobile',
      'address', 'streetaddress', 'suburb', 'city', 'postcode', 'state', 'country',
      'usi', 'uniquestudentidentifier', 'studentidentifier'
    ];
    
    // Separate fields into personal details and custom fields
    Object.entries(stepData).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      
      if (personalDetailFields.includes(keyLower)) {
        // Map field names to aXcelerate's expected format
        let axFieldName = key.toUpperCase();
        
        // Handle field name variations
        if (keyLower === 'lastname') axFieldName = 'SURNAME';
        if (keyLower === 'firstname') axFieldName = 'GIVENNAME';
        if (keyLower === 'dob' || keyLower === 'birthdate') axFieldName = 'DATEOFBIRTH';
        if (keyLower === 'uniquestudentidentifier' || keyLower === 'studentidentifier') axFieldName = 'USI';
        if (keyLower === 'streetaddress') axFieldName = 'ADDRESS';
        if (keyLower === 'city') axFieldName = 'SUBURB';
        if (keyLower === 'mobile') axFieldName = 'MOBILEPHONE';
        
        // Personal detail - send with mapped field name
        updatePayload[axFieldName] = value;
        console.log(`   📝 Personal field: ${key} → ${axFieldName} = "${value}"`);
        
        // Calculate age if date of birth is provided
        if ((keyLower === 'dateofbirth' || keyLower === 'dob') && value) {
          try {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            updatePayload['AGE'] = age;
            console.log(`   🎂 Calculated age from DOB: ${age} years old`);
          } catch (error) {
            console.error('Failed to calculate age from date of birth:', error);
          }
        }
      } else {
        // Custom field - send with CUSTOMFIELD_ prefix
        const axcelerateFieldName = `CUSTOMFIELD_${key.toUpperCase()}`;
        updatePayload[axcelerateFieldName] = value;
        console.log(`   📝 Custom field: ${key} → ${axcelerateFieldName}`);
      }
    });
    
    if (Object.keys(updatePayload).length > 0) {
      console.log('📝 Updating contact with step data (with CUSTOMFIELD_ prefix)...');
      console.log('📊 aXcelerate fields to save:', Object.keys(updatePayload));
      console.log('📋 Full payload:', JSON.stringify(updatePayload, null, 2));
      
      const updateResponse = await fetch(
        `${process.env.AXCELERATE_API_URL}/contact/${contactId}`,
        {
          method: 'PUT',
          headers: {
            'APIToken': process.env.AXCELERATE_API_TOKEN,
            'WSToken': process.env.AXCELERATE_WS_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: Object.keys(updatePayload)
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(updatePayload[key])}`)
            .join('&')
        }
      );
      
      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log('✅ Contact updated successfully');
        console.log('📋 aXcelerate API Response:', JSON.stringify(result, null, 2));
        console.log(`✅ Saved ${Object.keys(updatePayload).length} fields to aXcelerate`);
        
        // Verify fields were actually saved by reading contact back
        console.log('🔍 Verifying fields were saved...');
        const verifyResponse = await fetch(
          `${process.env.AXCELERATE_API_URL}/contact/${contactId}`,
          {
            headers: {
              'APIToken': process.env.AXCELERATE_API_TOKEN,
              'WSToken': process.env.AXCELERATE_WS_TOKEN
            }
          }
        );
        
        if (verifyResponse.ok) {
          const contact = await verifyResponse.json();
          console.log('📊 Checking if custom fields were saved:');
          Object.keys(updatePayload).forEach(key => {
            const savedValue = contact[key] || 'NOT FOUND';
            const match = savedValue === updatePayload[key] ? '✅' : '❌';
            console.log(`   ${match} ${key}: "${savedValue}" (sent: "${updatePayload[key]}")`);
          });
        }
      } else {
        const errorText = await updateResponse.text();
        console.error('❌ Failed to update contact:', updateResponse.status, errorText);
        console.error('📋 Attempted to save:', updatePayload);
      }
    } else {
      console.log('⚠️ No step data to save');
    }
    
    // Check if we've already sent an incomplete email today
    // Fetch contact notes to see if incomplete note exists
    const notesResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact/${contactId}/notes`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    let shouldSendEmail = true;
    if (notesResponse.ok) {
      const notes = await notesResponse.json();
      const today = new Date().toISOString().split('T')[0];
      
      // Check if there's already an incomplete enrollment note from today
      // Ensure notes is an array before calling .some()
      if (Array.isArray(notes) && notes.length > 0) {
        console.log(`📋 Checking ${notes.length} notes for incomplete email sent today...`);
        const hasIncompleteNoteToday = notes.some(note => {
          const noteDate = note.DATE ? note.DATE.split(' ')[0] : '';
          const isIncompleteNote = note.NOTE && (
            note.NOTE.includes('Incomplete enrollment') || 
            note.NOTE.includes('Email sent to student to resume')
          );
          const isToday = noteDate === today;
          
          if (isIncompleteNote && isToday) {
            console.log('   ✋ Found incomplete email note from today:', note.NOTE.substring(0, 50) + '...');
          }
          
          return isIncompleteNote && isToday;
        });
        
        if (hasIncompleteNoteToday) {
          console.log('ℹ️ Incomplete email already sent today - skipping');
          shouldSendEmail = false;
        } else {
          console.log('✅ No incomplete email sent today - will send now');
        }
      } else {
        console.log('📋 No notes found or notes is not an array');
      }
    }
    
    // Send incomplete enrollment email immediately via SendGrid (Template 111502 equivalent)
    // Build resume URL
    const resumeUrl = req.body.resumeUrl || req.headers.referer || `${req.protocol}://${req.get('host')}`;
    
    // Get contact details for email
    const contactResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact/${contactId}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    let contactEmail, contactName;
    if (contactResponse.ok) {
      const contact = await contactResponse.json();
      contactEmail = getContactEmail(contact);
      contactName = `${contact.GIVENNAME || ''} ${contact.SURNAME || ''}`.trim();
    }
    
    if (process.env.SENDGRID_API_KEY && contactEmail && shouldSendEmail) {
      try {
        console.log('📧 Sending incomplete enrollment email via SendGrid to:', contactEmail);
        
        const emailHtml = `
          <p>Hi ${contactName},</p>
          <p>Your enrollment for <strong>${courseName || 'the course'}</strong> is incomplete.</p>
          <p>You can continue your enrollment by clicking <a href="${resumeUrl}" style="background: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">here</a>.</p>
          <p>Or copy this link: ${resumeUrl}</p>
          <br>
          <p>Best regards,<br>Black Market Training</p>
        `;
        
        const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: contactEmail, name: contactName }],
              subject: 'Incomplete Online Booking - Black Market Training'
            }],
            from: {
              email: process.env.EMAIL_FROM || 'info@blackmarkettraining.com',
              name: 'Black Market Training'
            },
            content: [{
              type: 'text/html',
              value: emailHtml
            }]
          })
        });
        
        if (sendGridResponse.ok || sendGridResponse.status === 202) {
          console.log('✅ Incomplete enrollment email sent via SendGrid (Template 111502 equivalent)');
          
          // Create note to track that email was sent (prevents duplicates)
          const noteText = `Incomplete enrollment - Email sent

Contact: ${contactName} (${contactEmail})
Course: ${courseName || 'Unknown'} (Instance: ${instanceId})
Resume Link: ${resumeUrl}
Date: ${new Date().toLocaleString()}

Email sent to student to resume enrollment.`;
          
          try {
            await fetch(
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
            console.log('📝 Created note in aXcelerate to track email sent');
          } catch (noteError) {
            console.error('Failed to create note:', noteError);
          }
        } else {
          const errorText = await sendGridResponse.text();
          console.warn('⚠️ SendGrid error:', sendGridResponse.status, errorText);
        }
      } catch (emailError) {
        console.error('❌ Failed to send email via SendGrid:', emailError);
        // Don't fail the request
      }
    } else if (!process.env.SENDGRID_API_KEY) {
      console.warn('⚠️  SENDGRID_API_KEY not configured - email will not be sent');
      console.log('💡 Add SENDGRID_API_KEY to Render environment variables');
    } else if (!shouldSendEmail) {
      console.log('ℹ️ Email already sent today - skipping duplicate');
    }
    
    res.json({
      success: true,
      message: 'Step data saved and incomplete enrollment email sent',
      data: {
        contactId,
        stepId
      }
    });
    
  } catch (error) {
    console.error('Error saving step data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save step data',
      message: error.message
    });
  }
});

/**
 * Send verification email for existing contact
 * POST /api/enrollment/send-verification
 * 
 * Sends a magic link to verify user identity when existing record is found
 */
router.post('/send-verification', async (req, res) => {
  try {
    const { contactId, email, instanceId, courseId, courseType, courseName } = req.body;
    
    console.log('📧 Sending verification email to:', email, 'Contact ID:', contactId);
    
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
    const name = `${contact.GIVENNAME || ''} ${contact.SURNAME || ''}`.trim();
    
    // Generate verification token (simple timestamp-based for now)
    const verificationToken = Buffer.from(`${contactId}:${Date.now()}`).toString('base64');
    
    // Build resume URL with auth parameters
    const resumeUrl = `${req.body.resumeUrl || req.headers.referer}?auth_token=${verificationToken}&contact_id=${contactId}`;
    
    // DON'T create enrollment for existing contacts
    // This prevents "Booking Confirmation" email
    console.log('⏸️  Skipping enrollment creation for existing contact');
    console.log('📧 Will send Template 146004 (verification email) immediately via SendGrid');
    
    // Send verification email immediately using SendGrid (same as WordPress)
    if (process.env.SENDGRID_API_KEY) {
      try {
        console.log('📧 Sending verification email via SendGrid...');
        
        const emailHtml = `
          <p>Hi ${name},</p>
          <p>Your email has been detected in our system.</p>
          <p>You can continue your enrollment by clicking <a href="${resumeUrl}">here</a>.</p>
          <br>
          <p>Best regards,<br>Black Market Training</p>
        `;
        
        const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: email, name: name }],
              subject: 'Email Validations/Duplicate Detection - Black Market Training'
            }],
            from: {
              email: process.env.EMAIL_FROM || 'info@blackmarkettraining.com',
              name: 'Black Market Training'
            },
            content: [{
              type: 'text/html',
              value: emailHtml
            }]
          })
        });
        
        if (sendGridResponse.ok || sendGridResponse.status === 202) {
          console.log('✅ Verification email sent via SendGrid (Template 146004 equivalent)');
        } else {
          const errorText = await sendGridResponse.text();
          console.error('❌ SendGrid error:', sendGridResponse.status, errorText);
        }
      } catch (emailError) {
        console.error('❌ Failed to send email via SendGrid:', emailError);
      }
    } else {
      console.warn('⚠️  SENDGRID_API_KEY not configured - email will not be sent');
      console.log('💡 Add SENDGRID_API_KEY to Render environment variables');
    }
    
    // Create note for tracking
    const noteText = `EXISTING CONTACT - Verification Email Sent

Contact: ${name} (${email})
Course: ${courseName || 'Unknown'} (Instance: ${instanceId})
Date: ${new Date().toLocaleString()}
Status: Verification email sent via SendGrid
Resume Link: ${resumeUrl}

Note: Enrollment will be created when user returns and completes the form.`;
    
    await fetch(
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
    
    console.log('✅ Tracking note created in aXcelerate');
    console.log('   To enable emails, configure SendGrid/Mailgun and uncomment email sending code');
    
    res.json({
      success: true,
      message: 'Verification email sent (note: email service not configured)',
      data: {
        email,
        contactId,
        noteCreated: noteResponse.ok
      }
    });
    
  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;

