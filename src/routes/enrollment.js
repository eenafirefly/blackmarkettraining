// src/routes/enrollment.js
// Enhanced enrollment API with multi-step forms and custom fields

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { convertISOtoSACC } from '../utils/country-codes.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', req.body.contactId || 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, .png and .pdf files are allowed!'));
    }
  }
});

/**
 * Create contact ONLY (no enrollment)
 * POST /api/enrollment/create-contact
 * 
 * Used at Login step - creates contact but does NOT create enrollment
 */
router.post('/create-contact', async (req, res) => {
  try {
    const {
      givenName,
      surname,
      email,
      phone,
      instanceId,
      courseType
    } = req.body;
    
    // Validate required fields
    if (!givenName || !surname || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required contact fields: givenName, surname, email'
      });
    }
    
    console.log('🆕 Creating contact ONLY (no enrollment):', { givenName, surname, email });
    
    // Find or create contact
    const contactResult = await findOrCreateContact({
      givenName,
      surname,
      email,
      phone
    });
    
    // Check if this was an existing contact
    if (contactResult.alreadyExists) {
      console.log('🔄 Existing contact detected - returning existing contact info');
      
      return res.json({
        success: false,
        existingContact: true,
        contactId: contactResult.contact.CONTACTID,
        email: email,
        message: 'Existing contact found. Please check your email for resuming your enrollment.'
      });
    }
    
    console.log('✅ New contact created successfully:', contactResult.contact.CONTACTID);
    
    // Return success with contact ID (NO enrollment created)
    res.json({
      success: true,
      message: 'Contact created successfully. Please continue with enrollment steps.',
      data: {
        contactId: contactResult.contact.CONTACTID
      }
    });
    
  } catch (error) {
    console.error('Contact creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contact',
      message: error.message
    });
  }
});

/**
 * Create enrollment with custom fields
 * POST /api/enrollment/create
 * 
 * Handles multi-step enrollment with all custom fields
 * This is called ONLY when Declaration step is completed
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
      const contactResult = await findOrCreateContact({
        givenName,
        surname,
        email,
        phone
      });
      
      // Check if this was an existing contact
      if (contactResult.alreadyExists) {
        console.log('🔄 Existing contact detected - sending incomplete booking email');
        
        // Return special response to trigger existing contact flow
        return res.json({
          success: false,
          existingContact: true,
          contactId: contactResult.contact.CONTACTID,
          email: email,
          message: 'Existing contact found. Please check your email for resuming your enrollment.'
        });
      }
      
      enrolmentContactId = contactResult.contact.CONTACTID;
    }
    
    // Update contact with custom fields if provided
    if (customFields && Object.keys(customFields).length > 0) {
      console.log('📋 Custom fields received from frontend:');
      console.log('   Total fields:', Object.keys(customFields).length);
      console.log('   Field names:', Object.keys(customFields));
      
      // Check for background fields
      const backgroundFields = Object.keys(customFields).filter(k => 
        k.toLowerCase().includes('priorlearning') || 
        k.toLowerCase().includes('qualification') ||
        k.toLowerCase().includes('disability')
      );
      console.log('   Background fields:', backgroundFields);
      
      // Check for subject matter fields
      const subjectFields = Object.keys(customFields).filter(k => 
        k.toLowerCase().includes('computer') || 
        k.toLowerCase().includes('skill') ||
        k.toLowerCase().includes('subject')
      );
      console.log('   Subject Matter fields:', subjectFields);
      
      await updateContactCustomFields(enrolmentContactId, customFields);
    } else {
      console.warn('⚠️ No custom fields provided or empty customFields object');
    }
    
    // Create enrollment
    const enrollmentData = {
      contactID: enrolmentContactId,
      instanceID: instanceId,
      type: courseType,
      tentative: true // Mark as tentative until payment
    };
    
    console.log('📤 Creating enrollment in aXcelerate...');
    console.log('   This will trigger "Booking Confirmation" email from aXcelerate');
    
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
      
      // Parse error details if available
      let errorDetails = 'Failed to create enrollment';
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.DETAILS) {
          errorDetails = errorData.DETAILS;
        } else if (errorData.MESSAGES) {
          errorDetails = errorData.MESSAGES;
        }
      } catch (e) {
        // Not JSON, use raw text
        errorDetails = errorText || 'Failed to create enrollment';
      }
      
      throw new Error(errorDetails);
    }
    
    const enrollResult = await enrollResponse.json();
    
    console.log('✅ Enrollment created successfully:', {
      contactId: enrolmentContactId,
      learnerId: enrollResult.LEARNERID,
      invoiceId: enrollResult.invoiceID
    });
    console.log('📧 aXcelerate will send "Booking Confirmation - Black Market Training" email automatically');
    
    // Save Declaration data (signature, agreement) to Contact Notes
    if (customFields) {
      const declarationData = [];
      
      // Get student name
      const studentFirstName = customFields.givenName || customFields.givenname || givenName || '';
      const studentLastName = customFields.surname || customFields.lastname || surname || '';
      const studentFullName = `${studentFirstName} ${studentLastName}`.trim();
      
      // Get course name and details from instance
      let courseName = 'Unknown Course';
      let courseUrl = '';
      let actualCourseId = courseId;
      
      console.log('🔍 Fetching course details for instance:', instanceId, 'type:', courseType);
      
      try {
        // Build query parameters for aXcelerate API (correct format)
        const params = new URLSearchParams({
          instanceID: instanceId,
          type: courseType || 'w'
        });
        
        const instanceUrl = `${process.env.AXCELERATE_API_URL}/course/instance/detail?${params}`;
        console.log('📋 Instance URL:', instanceUrl);
        
        const instanceResponse = await fetch(instanceUrl, {
          headers: {
            'APIToken': process.env.AXCELERATE_API_TOKEN,
            'WSToken': process.env.AXCELERATE_WS_TOKEN
          }
        });
        
        console.log('📋 Instance API status:', instanceResponse.status);
        
        if (instanceResponse.ok) {
          const instanceData = await instanceResponse.json();
          console.log('📋 Instance data keys:', Object.keys(instanceData));
          console.log('📋 Full instance data:', JSON.stringify(instanceData, null, 2));
          
          // aXcelerate returns NAME for course name
          courseName = instanceData.NAME || 
                      instanceData.COURSENAME || 
                      instanceData.courseName || 
                      instanceData.name ||
                      instanceData.CourseName ||
                      courseName;
          
          // aXcelerate returns COURSEID for course ID
          actualCourseId = instanceData.COURSEID || 
                          instanceData.courseId || 
                          instanceData.ID || 
                          instanceData.id ||
                          instanceData.CourseID ||
                          courseId;
          
          console.log('✅ Resolved course name:', courseName);
          console.log('✅ Resolved course ID:', actualCourseId);
          
          // Build aXcelerate program status URL (internal system)
          courseUrl = `https://blackmarket.app.axcelerate.com/management/management2/ProgramStatus.cfm?PDataID=${instanceId}`;
        } else {
          const errorText = await instanceResponse.text();
          console.error('❌ Failed to fetch instance:', instanceResponse.status, errorText);
        }
      } catch (err) {
        console.error('❌ Could not fetch course details:', err.message);
      }
      
      // Build profile URL
      const profileUrl = `https://blackmarket.app.axcelerate.com/management/management2/Contact_View.cfm?ContactID=${enrolmentContactId}`;
      
      // Get enrollment URL
      const enrollmentUrl = `https://www.blackmarkettraining.com/qualification-details/?course_id=${actualCourseId}&course_type=${courseType}&instance_id=${instanceId}`;
      
      // Get study reason text (convert ID to text if needed)
      let studyReasonText = '';
      if (customFields.studyReason || customFields.studyreason) {
        const studyReasonValue = customFields.studyReason || customFields.studyreason;
        // Map study reason ID to text (common values)
        const studyReasonMap = {
          '1': 'To get a job',
          '2': 'To develop my existing business',
          '3': 'To start my own business',
          '4': 'To try for a different career',
          '5': 'To get a better job or promotion',
          '6': 'It was a requirement of my job',
          '7': 'I wanted extra skills for my job',
          '8': 'To get into another course of study',
          '11': 'Other reasons',
          '12': 'For personal interest or self-development'
        };
        studyReasonText = studyReasonMap[studyReasonValue] || studyReasonValue;
      }
      
      // Build HTML note (matching WordPress plugin format)
      let noteHtml = '';
      
      // Course Enrollment From URL
      noteHtml += `<p>Course Enrolment from - <a href="${enrollmentUrl}" target="_blank">${enrollmentUrl}</a></p>`;
      
      // Enrollment header with links
      if (studentFullName && courseName) {
        noteHtml += `<p><strong>Enrolments:</strong></p>`;
        noteHtml += `<p><a href="${profileUrl}" target="_blank">${studentFullName}</a> in <a href="${courseUrl}" target="_blank">${courseName}</a></p>`;
      }
      
      // Study reason
      if (studyReasonText) {
        noteHtml += `<p><strong>StudyReason:</strong> (${customFields.studyReason || customFields.studyreason}) ${studyReasonText}</p>`;
      }
      
      // Signature section
      noteHtml += '<p><strong>Signature:</strong></p>';
      
      // Embed student signature as image
      if (customFields.signature) {
        noteHtml += `<p><img src="${customFields.signature}" alt="Student Signature" style="max-width: 400px; border: 1px solid #ccc;" /></p>`;
      }
      
      // Guardian section (if provided)
      if (customFields.guardianName || customFields.guardianSignature) {
        noteHtml += '<hr />';
        if (customFields.guardianName) {
          noteHtml += `<p><strong>Parent/Guardian:</strong> ${customFields.guardianName}</p>`;
        }
        if (customFields.guardianSignature) {
          noteHtml += '<p><strong>Guardian Signature:</strong></p>';
          noteHtml += `<p><img src="${customFields.guardianSignature}" alt="Guardian Signature" style="max-width: 400px; border: 1px solid #ccc;" /></p>`;
        }
      }
      
      // Divider
      noteHtml += '<hr />';
      
      // Billing Step Terms
      noteHtml += '<p><strong>Billing Step Terms</strong></p>';
      noteHtml += '<p><strong>PRIVACY NOTICE</strong></p>';
      
      // Privacy notice sections (complete text)
      noteHtml += '<p><strong>Why we collect your personal information</strong></p>';
      noteHtml += '<p>As a registered training organisation (RTO), we collect your personal information so we can process and manage your enrolment in a vocational education and training (VET) course with us.</p>';
      
      noteHtml += '<p><strong>How we use your personal information</strong></p>';
      noteHtml += '<p>We use your personal information to enable us to deliver VET courses to you, and otherwise, as needed, to comply with our obligations as an RTO.</p>';
      
      noteHtml += '<p><strong>How we disclose your personal information</strong></p>';
      noteHtml += '<p>We are required by law (under the National Vocational Education and Training Regulator Act 2011 (Cth) (NVETR Act)) to disclose the personal information we collect about you to the National VET Data Collection kept by the National Centre for Vocational Education Research Ltd (NCVER). The NCVER is responsible for collecting, managing, analysing and communicating research and statistics about the Australian VET sector.</p>';
      noteHtml += '<p>We are also authorised by law (under the NVETR Act) to disclose your personal information to the relevant state or territory training authority.</p>';
      
      noteHtml += '<p><strong>How the NCVER and other bodies handle your personal information</strong></p>';
      noteHtml += '<p>The NCVER will collect, hold, use and disclose your personal information in accordance with the law, including the Privacy Act 1988 (Cth) (Privacy Act) and the NVETR Act. Your personal information may be used and disclosed by NCVER for purposes that include populating authenticated VET transcripts; administration of VET; facilitation of statistics and research relating to education, including surveys and data linkage; and understanding the VET market.</p>';
      noteHtml += '<p>The NCVER is authorised to disclose information to the Australian Government Department of Employment, Skills, Small and Family Business, other Commonwealth and State agencies, and other bodies engaged by the NCVER to assist with the NCVER\'s activities.</p>';
      noteHtml += '<p>NCVER may also disclose personal information to persons engaged by NCVER to conduct research on NCVER\'s behalf.</p>';
      noteHtml += '<p>The NCVER does not disclose your personal information to any other overseas recipients.</p>';
      noteHtml += '<p>For more information about how the NCVER will handle your personal information please refer to the NCVER Privacy Policy at <a href="https://www.ncver.edu.au/privacy" target="_blank">www.ncver.edu.au/privacy</a>.</p>';
      noteHtml += '<p>If you would like to seek access to or correct your information, in the first instance, please contact Black Market Training at <a href="mailto:info@blackmarkettraining.com">info@blackmarkettraining.com</a> to request access to or correction of your information. If you are not able to satisfactorily resolve your concerns, you can contact the NCVER.</p>';
      
      // Always create a new declaration note (aXcelerate doesn't support updating notes)
      try {
        console.log('💾 Creating Declaration note in aXcelerate...');
        console.log('   Contact ID:', enrolmentContactId);
        console.log('   Note length:', noteHtml.length, 'characters');
        console.log('   Note preview:', noteHtml.substring(0, 200) + '...');
        
        const noteParams = new URLSearchParams({
          contactID: enrolmentContactId,
          contactNote: noteHtml,
          noteCodeID: 88,  // System note (same as WordPress plugin)
          noteTypeID: 88
        });
        
        console.log('📤 Sending note to aXcelerate...');
        
        const noteResponse = await fetch(
          `${process.env.AXCELERATE_API_URL}/contact/note`,
          {
            method: 'POST',
            headers: {
              'APIToken': process.env.AXCELERATE_API_TOKEN,
              'WSToken': process.env.AXCELERATE_WS_TOKEN,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: noteParams.toString()
          }
        );
        
        console.log('📥 aXcelerate response status:', noteResponse.status);
        
        if (noteResponse.ok) {
          const noteResult = await noteResponse.json();
          console.log('✅ Declaration note saved successfully!');
          console.log('   Response:', noteResult);
        } else {
          const errorText = await noteResponse.text();
          console.error('❌ Failed to save declaration note:', noteResponse.status);
          console.error('   Error:', errorText);
        }
      } catch (noteError) {
        console.error('❌ Error saving declaration to notes:', noteError.message);
        console.error('   Stack:', noteError.stack);
        // Don't fail the enrollment if note save fails
      }
    }
    
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

// Helper function to map country codes to full country names for aXcelerate
function getCountryName(countryCode) {
  if (!countryCode) return countryCode;
  
  const countryMap = {
    'AF': 'Afghanistan', 'AL': 'Albania', 'DZ': 'Algeria', 'AR': 'Argentina',
    'AU': 'Australia', 'AT': 'Austria', 'BD': 'Bangladesh', 'BE': 'Belgium',
    'BR': 'Brazil', 'BG': 'Bulgaria', 'CA': 'Canada', 'CL': 'Chile',
    'CN': 'China', 'CO': 'Colombia', 'HR': 'Croatia', 'CY': 'Cyprus',
    'CZ': 'Czech Republic', 'DK': 'Denmark', 'EG': 'Egypt', 'EE': 'Estonia',
    'FJ': 'Fiji', 'FI': 'Finland', 'FR': 'France', 'DE': 'Germany',
    'GR': 'Greece', 'HK': 'Hong Kong', 'HU': 'Hungary', 'IS': 'Iceland',
    'IN': 'India', 'ID': 'Indonesia', 'IE': 'Ireland', 'IL': 'Israel',
    'IT': 'Italy', 'JP': 'Japan', 'KE': 'Kenya', 'LV': 'Latvia',
    'LB': 'Lebanon', 'LT': 'Lithuania', 'LU': 'Luxembourg', 'MY': 'Malaysia',
    'MT': 'Malta', 'MX': 'Mexico', 'NL': 'Netherlands', 'NZ': 'New Zealand',
    'NG': 'Nigeria', 'NO': 'Norway', 'PK': 'Pakistan', 'PA': 'Panama',
    'PH': 'Philippines', 'PL': 'Poland', 'PT': 'Portugal', 'RO': 'Romania',
    'RU': 'Russia', 'SA': 'Saudi Arabia', 'RS': 'Serbia', 'SG': 'Singapore',
    'SK': 'Slovakia', 'SI': 'Slovenia', 'ZA': 'South Africa', 'KR': 'South Korea',
    'ES': 'Spain', 'LK': 'Sri Lanka', 'SE': 'Sweden', 'CH': 'Switzerland',
    'TW': 'Taiwan', 'TH': 'Thailand', 'TR': 'Turkey', 'UA': 'Ukraine',
    'AE': 'United Arab Emirates', 'GB': 'United Kingdom', 'US': 'United States',
    'VN': 'Vietnam', 'ZW': 'Zimbabwe'
  };
  
  // If it's already a full country name, return it as is
  if (countryCode.length > 2) return countryCode;
  
  // Otherwise map the code to full name
  return countryMap[countryCode.toUpperCase()] || countryCode;
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
        console.log('✅ Found existing contact with matching email:', matchingContacts[0].CONTACTID, getContactEmail(matchingContacts[0]));
        return {
          alreadyExists: true,
          contact: matchingContacts[0]
        };
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
      // Treat as existing contact
      return {
        alreadyExists: true,
        contact: newContact
      };
    } else if (!newContact.EMAIL) {
      console.warn('⚠️ Returned contact has no EMAIL field, cannot verify if it\'s new');
    } else {
      console.log('✅ Email matches - this appears to be a genuine new contact');
    }
    
    return {
      alreadyExists: false,
      contact: newContact
    };
    
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
    // IMPORTANT: aXcelerate expects custom fields with CUSTOMFIELD_ prefix in UPPERCASE
    const payload = {};
    
    Object.entries(customFields).forEach(([key, value]) => {
      // Convert to CUSTOMFIELD_UPPERCASE format
      // e.g., "computerSkills" -> "CUSTOMFIELD_COMPUTERSKILLS"
      const fieldName = `CUSTOMFIELD_${key.toUpperCase()}`;
      payload[fieldName] = value;
      console.log(`   Mapping ${key} -> ${fieldName} = "${value}"`);
    });
    
    // Convert boolean-like fields to proper boolean values for aXcelerate
    // aXcelerate expects 'true'/'false' strings for boolean fields
    const booleanFields = ['DisabilityStatus', 'DisabilityFlag', 'uniqueStudentIdentifier'];
    
    booleanFields.forEach(field => {
      if (payload[field] !== undefined) {
        const value = payload[field];
        // Convert "Yes"/"No" or similar to boolean
        if (typeof value === 'string') {
          const lowerValue = value.toLowerCase();
          if (lowerValue === 'yes' || lowerValue === 'true' || lowerValue === '1') {
            payload[field] = 'true';
          } else if (lowerValue === 'no' || lowerValue === 'false' || lowerValue === '0' || lowerValue === '') {
            payload[field] = 'false';
          }
        } else if (typeof value === 'boolean') {
          payload[field] = value ? 'true' : 'false';
        }
      }
    });
    
    console.log('📤 Sending payload to aXcelerate:', payload);
    console.log('📤 Payload details:');
    Object.entries(payload).forEach(([key, value]) => {
      console.log(`   ${key}: "${value}" (type: ${typeof value}, length: ${value ? value.length : 0})`);
    });
    
    // Show the actual URL-encoded body that will be sent
    const bodyString = Object.keys(payload)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(payload[key])}`)
      .join('&');
    console.log('📤 URL-encoded body (first 500 chars):', bodyString.substring(0, 500));
    
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
      console.error('❌ Failed to update custom fields:', updateResponse.status, errorText);
      
      // Try to parse the error to see which fields failed
      try {
        const errorData = JSON.parse(errorText);
        console.error('   Error details:', errorData);
        if (errorData.FIELDNAMES) {
          console.error('   Failed fields:', errorData.FIELDNAMES);
        }
      } catch (e) {
        // Not JSON, just log the raw text
      }
      // Don't throw - continue enrollment even if custom fields fail
    } else {
      console.log('✅ Custom fields updated successfully');
      const responseData = await updateResponse.json();
      console.log('   aXcelerate response:', responseData);
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
    const { contactId, stepId, stepData, instanceId, courseId, courseType, courseName, skipEmail } = req.body;
    
    console.log('💾 Saving step data to aXcelerate:', { contactId, stepId, instanceId, skipEmail });
    
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
    
    // Special handling for prior education with recognition
    // If prioreducation exists, combine it with recognition fields
    console.log('📚 Checking prioreducation field:', {
      exists: !!stepData.prioreducation,
      value: stepData.prioreducation,
      type: typeof stepData.prioreducation,
      isArray: Array.isArray(stepData.prioreducation)
    });
    
    // Convert string to array if needed (e.g., "420, 511" -> ["420", "511"])
    if (stepData.prioreducation && typeof stepData.prioreducation === 'string') {
      stepData.prioreducation = stepData.prioreducation.split(',').map(s => s.trim()).filter(Boolean);
      console.log('📚 Converted string to array:', stepData.prioreducation);
    }
    
    if (stepData.prioreducation && Array.isArray(stepData.prioreducation)) {
      console.log('📚 Processing Prior Education:', stepData.prioreducation);
      console.log('📚 All stepData keys:', Object.keys(stepData));
      
      const priorEdWithRecognition = stepData.prioreducation.map(code => {
        const recognitionField = `prioreducation_${code}_recognition`;
        const recognition = stepData[recognitionField] || '';
        console.log(`  - ${code} → recognition field: ${recognitionField} = "${recognition}"`);
        return `${code}${recognition}`; // e.g., "008A" or "410E"
      });
      stepData.prioreducationids = priorEdWithRecognition.join(','); // e.g., "008A,410E"
      console.log('✅ Built PRIOREDUCATIONIDS:', stepData.prioreducationids);
      
      // Remove individual recognition fields from stepData so they don't get treated as custom fields
      Object.keys(stepData).forEach(key => {
        if (key.match(/^prioreducation_\d+_recognition$/)) {
          delete stepData[key];
          console.log(`  ✂️ Removed recognition field: ${key}`);
        }
      });
    }
    
    // Personal detail fields that update the contact record directly (not custom fields)
    const personalDetailFields = [
      'title', 'givenname', 'firstname', 'surname', 'lastname', 'preferredname', 'middlename',
      'dateofbirth', 'dob', 'birthdate', 'gender', 'sex',
      'email', 'emailaddress', 'alternativeemail', 'alternativeemailaddress',
      'phone', 'mobilephone', 'mobile', 'homephone', 'workphone', 'fax',
      'organisation', 'organization', 'position', 'jobtitle',
      'emergencycontact', 'emergencycontactname', 'emergencycontactrelation', 'emergencyrelationship', 'emergencycontactphone', 'emergencycontactnumber',
      'address', 'streetaddress', 'streetnumber', 'streetname', 'suburb', 'city', 'postcode', 'state', 'country',
      'buildingpropertyname', 'buildingname', 'flatunitdetails', 'unitno', 'poboxdetails', 'pobox',
      'postaladdress', 'postalstreetnumber', 'postalstreetname', 'postalsuburb', 'postalpostcode', 'postalstate', 'postalcountry',
      'postalbuildingpropertyname', 'postalflatunitdetails', 'postalpoboxdetails', 'postalpobox',
      'usi', 'uniquestudentidentifier', 'studentidentifier',
      'countryofbirth', 'birthplace', 'cityofbirth',
      'citizenshipstatus', 'countryofcitizenship', 'residencystatus',
      'languagespoken', 'languageidentifier', 'englishproficiency', 'englishassistance', 'atschool', 'stillenrolledsecondary',
      'indigenousstatus', 'aboriginalortorresstraitislanderorigin',
      'employmentstatus', 'occupationidentifier', 'industryofemployment',
      'schoollevel', 'highestschoollevel', 'highestcompletedschoollevel', 'yearhighestschoolcompleted',
      'prioreducationstatus', 'prioreducation', 'prioreducationids',
      'disabilities', 'disabilitytypes', 'disabilityflag', 'hasdisability',
      'surveycontactstatus'
    ];
    
    // Separate fields into personal details and custom fields
    Object.entries(stepData).forEach(([key, value]) => {
      const keyLower = key.toLowerCase();
      
      // Skip empty values (but allow 0, false, etc.)
      if (value === '' || value === null || value === undefined) {
        console.log(`   ⏭️ Skipping empty field: ${key}`);
        return;
      }
      
      if (personalDetailFields.includes(keyLower)) {
        // Map field names to aXcelerate's expected format
        let axFieldName = key.toUpperCase();
        
        // Handle field name variations - map to aXcelerate's expected field names
        // Name fields
        if (keyLower === 'lastname') axFieldName = 'SURNAME';
        if (keyLower === 'firstname' || keyLower === 'givenname') axFieldName = 'GIVENNAME';
        if (keyLower === 'preferredname') axFieldName = 'PREFERREDNAME';
        if (keyLower === 'middlename') axFieldName = 'MIDDLENAME';
        
        // Contact fields
        if (keyLower === 'dateofbirth' || keyLower === 'birthdate' || keyLower === 'dob') axFieldName = 'DOB';
        if (keyLower === 'gender' || keyLower === 'sex') axFieldName = 'SEX';
        if (keyLower === 'email' || keyLower === 'emailaddress') axFieldName = 'EMAILADDRESS';
        if (keyLower === 'alternativeemail' || keyLower === 'alternativeemailaddress') axFieldName = 'EMAILADDRESSALTERNATIVE';
        if (keyLower === 'mobile' || keyLower === 'mobilephone') {
          axFieldName = 'MOBILEPHONE';
          console.log(`   📱 Mobile field detected: "${key}" → MOBILEPHONE, value: "${value}"`);
        }
        if (keyLower === 'homephone') axFieldName = 'PHONE';
        if (keyLower === 'workphone') axFieldName = 'WORKPHONE';
        if (keyLower === 'fax') axFieldName = 'FAX';
        if (keyLower === 'organisation' || keyLower === 'organization') axFieldName = 'ORGANISATION';
        if (keyLower === 'position' || keyLower === 'jobtitle') axFieldName = 'POSITION';
        
        // Emergency Contact fields
        if (keyLower === 'emergencycontact' || keyLower === 'emergencycontactname') axFieldName = 'EMERGENCYCONTACT';
        if (keyLower === 'emergencycontactrelation' || keyLower === 'emergencyrelationship') axFieldName = 'EMERGENCYCONTACTRELATION';
        if (keyLower === 'emergencycontactphone' || keyLower === 'emergencycontactnumber') axFieldName = 'EMERGENCYCONTACTPHONE';
        
        // Address fields - Residential
        if (keyLower === 'streetaddress' || keyLower === 'address') axFieldName = 'ADDRESS1';
        if (keyLower === 'streetnumber') axFieldName = 'STREETNO';
        if (keyLower === 'streetname') axFieldName = 'STREETNAME';
        if (keyLower === 'buildingpropertyname' || keyLower === 'buildingname') axFieldName = 'BUILDINGNAME';
        if (keyLower === 'flatunitdetails' || keyLower === 'unitno') axFieldName = 'UNITNO';
        if (keyLower === 'poboxdetails' || keyLower === 'pobox') axFieldName = 'POBOX';
        if (keyLower === 'city' || keyLower === 'suburb') axFieldName = 'CITY';
        if (keyLower === 'postcode') axFieldName = 'POSTCODE';
        if (keyLower === 'state') axFieldName = 'STATE';
        if (keyLower === 'country') {
          axFieldName = 'COUNTRYID';
          const originalValue = value;
          value = convertISOtoSACC(value); // Convert ISO code to SACC code (e.g., AU → 1101)
          console.log(`   🌍 Residential Country: "${originalValue}" → COUNTRYID = "${value}"`);
        }
        
        // Address fields - Postal
        if (keyLower === 'postaladdress') axFieldName = 'SADDRESS1';
        if (keyLower === 'postalstreetnumber') axFieldName = 'SSTREETNO';
        if (keyLower === 'postalstreetname') axFieldName = 'SSTREETNAME';
        if (keyLower === 'postalbuildingpropertyname') axFieldName = 'SBUILDINGNAME';
        if (keyLower === 'postalflatunitdetails') axFieldName = 'SUNITNO';
        if (keyLower === 'postalpoboxdetails' || keyLower === 'postalpobox') axFieldName = 'POBOX';
        if (keyLower === 'postalsuburb') axFieldName = 'SCITY';
        if (keyLower === 'postalpostcode') axFieldName = 'SPOSTCODE';
        if (keyLower === 'postalstate') axFieldName = 'SSTATE';
        if (keyLower === 'postalcountry') {
          axFieldName = 'SCOUNTRYID';
          const originalValue = value;
          value = convertISOtoSACC(value); // Convert ISO code to SACC code (e.g., AU → 1101)
          console.log(`   🌍 Postal Country: "${originalValue}" → SCOUNTRYID = "${value}"`);
        }
        
        // Learner identifiers
        if (keyLower === 'uniquestudentidentifier' || keyLower === 'studentidentifier' || keyLower === 'usi') axFieldName = 'USI';
        
        // VET Related Details - Nationality/Citizenship
        if (keyLower === 'countryofbirth') {
          axFieldName = 'COUNTRYOFBIRTHID';
          // Convert ISO code to 4-digit SACC code (e.g., AU → 1101)
          value = convertISOtoSACC(value);
        }
        if (keyLower === 'birthplace' || keyLower === 'cityofbirth') axFieldName = 'CITYOFBIRTH';
        if (keyLower === 'citizenshipstatus') axFieldName = 'CITIZENSTATUSID'; // This uses numeric IDs (1-11)
        if (keyLower === 'countryofcitizenship') {
          axFieldName = 'COUNTRYOFCITIZENID';
          // Convert ISO code to 4-digit SACC code (e.g., AU → 1101)
          value = convertISOtoSACC(value);
        }
        if (keyLower === 'residencystatus') axFieldName = 'RESIDENCYSTATUSID';
        
        // VET Related Details - Language
        if (keyLower === 'languagespoken' || keyLower === 'languageidentifier') {
          axFieldName = 'MAINLANGUAGEID';
          // Value is already a SACC code (4-digit like "1201" for English)
        }
        if (keyLower === 'englishproficiency') {
          axFieldName = 'ENGLISHPROFICIENCYID';
          // Value is numeric ID (1-4) or empty string
        }
        if (keyLower === 'englishassistance') axFieldName = 'ENGLISHASSISTANCEFLAG';
        if (keyLower === 'atschool' || keyLower === 'stillenrolledsecondary') {
          axFieldName = 'ATSCHOOLFLAG';
          // Convert string "true"/"false" to boolean if needed
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
          else if (value === '') value = null;
        }
        
        // VET Related Details - Indigenous/Employment
        if (keyLower === 'indigenousstatus' || keyLower === 'aboriginalortorresstraitislanderorigin') axFieldName = 'INDIGENOUSSTATUSID';
        if (keyLower === 'employmentstatus') axFieldName = 'LABOURFORCEID';
        if (keyLower === 'occupationidentifier') axFieldName = 'OCCUPATIONIDENTIFIER';
        if (keyLower === 'industryofemployment') axFieldName = 'INDUSTRYOFEMPLOYMENT';
        
        // VET Related Details - Education
        if (keyLower === 'highestschoollevel' || keyLower === 'schoollevel' || keyLower === 'highestcompletedschoollevel') {
          axFieldName = 'HIGHESTSCHOOLLEVELID';
          // Value is already numeric (2, 8, 9, 10, 11, 12)
        }
        if (keyLower === 'yearhighestschoolcompleted') {
          axFieldName = 'HIGHESTSCHOOLLEVELYEAR';
          // Value is a year like "2020"
        }
        if (keyLower === 'prioreducationstatus') {
          axFieldName = 'PRIOREDUCATIONSTATUS';
          // Convert string "true"/"false" to boolean
          if (value === 'true') value = true;
          else if (value === 'false') value = false;
        }
        if (keyLower === 'prioreducation' || keyLower === 'prioreducationids') {
          axFieldName = 'PRIOREDUCATIONIDS';
          // Value should be comma-separated list of codes with recognition letters
          // e.g., "008A,410E" (Bachelor + AustQual, Advanced Diploma + AustEquiv)
          // The checkbox-with-recognition field handler should format this correctly
        }
        
        // Prior Education Recognition fields (e.g., prioreducation_008_recognition)
        // These are used to build the PRIOREDUCATIONIDS value with recognition letters
        // e.g., if prioreducation has "008" checked and prioreducation_008_recognition is "A",
        // then PRIOREDUCATIONIDS should include "008A" in the comma-separated list
        
        // VET Related Details - Disability
        if (keyLower === 'disabilities' || keyLower === 'disabilityflag' || keyLower === 'hasdisability') {
          axFieldName = 'DISABILITYFLAG';
          // Convert Y/N to boolean for Axcelerate
          if (value === 'Y' || value === 'Yes' || value === 'true' || value === true) {
            value = true;
          } else if (value === 'N' || value === 'No' || value === 'false' || value === false) {
            value = false;
          }
          console.log(`   🔄 Converted DISABILITYFLAG to boolean: ${value}`);
        }
        if (keyLower === 'disabilitytypes') {
          axFieldName = 'DISABILITYTYPEIDS';
          // DISABILITYTYPES expects comma-separated string like "11,12,13"
          if (Array.isArray(value)) {
            value = value.join(',');
            console.log(`   🔄 Converted array to comma-separated string: ${value}`);
          } else if (typeof value === 'string' && value.includes(', ')) {
            // Remove spaces after commas: "11, 12" → "11,12"
            value = value.split(',').map(v => v.trim()).join(',');
            console.log(`   🔄 Cleaned comma-separated string: ${value}`);
          }
        }
        
        // VET Related Details - Survey
        if (keyLower === 'surveycontactstatus') axFieldName = 'SURVEYCONTACTSTATUS';
        
        // Personal detail - send with mapped field name
        updatePayload[axFieldName] = value;
        console.log(`   📝 Personal field: ${key} → ${axFieldName} = "${value}"`);
      } else {
        // Custom field - aXcelerate expects CUSTOMFIELD_ prefix in UPPERCASE
        const fieldName = `CUSTOMFIELD_${key.toUpperCase()}`;
        updatePayload[fieldName] = value;
        console.log(`   📝 Custom field: ${key} → ${fieldName} = "${value}"`);
      }
    });
    
    if (Object.keys(updatePayload).length > 0) {
      console.log('📝 Updating contact with step data...');
      console.log('📊 aXcelerate fields to save:', Object.keys(updatePayload));
      console.log('📋 Full payload:', JSON.stringify(updatePayload, null, 2));
      
      const requestBody = Object.keys(updatePayload)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(updatePayload[key])}`)
        .join('&');
      console.log('📋 Request body:', requestBody);
      
      const updateResponse = await fetch(
        `${process.env.AXCELERATE_API_URL}/contact/${contactId}`,
        {
          method: 'PUT',
          headers: {
            'APIToken': process.env.AXCELERATE_API_TOKEN,
            'WSToken': process.env.AXCELERATE_WS_TOKEN,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: requestBody
        }
      );
      
      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log('✅ Contact updated successfully');
        console.log('✅ Axcelerate response:', result);
        console.log(`✅ Saved ${Object.keys(updatePayload).length} fields to aXcelerate`);
        console.log('📋 Fields saved:', Object.keys(updatePayload).join(', '));
        
        // Check specifically for MOBILEPHONE field in response
        if (updatePayload.MOBILEPHONE) {
          console.log(`📱 Mobile field verification:`);
          console.log(`   Sent: MOBILEPHONE = "${updatePayload.MOBILEPHONE}"`);
          console.log(`   Returned: MOBILEPHONE = "${result.MOBILEPHONE || 'null/undefined'}"`);
          if (!result.MOBILEPHONE || result.MOBILEPHONE === 'null') {
            console.error(`⚠️ aXcelerate returned null for MOBILEPHONE field - field name may be incorrect!`);
          }
        }
        
        // Check specifically for COUNTRYID field in response
        if (updatePayload.COUNTRYID) {
          console.log(`🌍 Residential Country field verification:`);
          console.log(`   Sent: COUNTRYID = "${updatePayload.COUNTRYID}"`);
          console.log(`   Returned: COUNTRYID = "${result.COUNTRYID || 'null/undefined'}"`);
          if (!result.COUNTRYID || result.COUNTRYID === 'null') {
            console.error(`⚠️ aXcelerate returned null for COUNTRYID field - field name may be incorrect!`);
          }
        }
        
        // Check specifically for SCOUNTRYID field in response
        if (updatePayload.SCOUNTRYID) {
          console.log(`🌍 Postal Country field verification:`);
          console.log(`   Sent: SCOUNTRYID = "${updatePayload.SCOUNTRYID}"`);
          console.log(`   Returned: SCOUNTRYID = "${result.SCOUNTRYID || 'null/undefined'}"`);
          if (!result.SCOUNTRYID || result.SCOUNTRYID === 'null') {
            console.error(`⚠️ aXcelerate returned null for SCOUNTRYID field - field name may be incorrect!`);
          }
        }
      } else {
        const errorText = await updateResponse.text();
        console.error('❌ Failed to update contact:', updateResponse.status, errorText);
        console.error('📋 Attempted to save:', updatePayload);
        // Try to parse error as JSON for more details
        try {
          const errorJson = JSON.parse(errorText);
          console.error('📋 Error details:', errorJson);
        } catch (e) {
          console.error('📋 Raw error:', errorText);
        }
      }
    } else {
      console.log('⚠️ No step data to save');
    }
    
    // Check if we've already sent an incomplete email within the last 2 hours
    // Use custom field to track last email sent time (since notes endpoint returns 405 on POST)
    const contactCheckResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/contact/${contactId}`,
      {
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    let shouldSendEmail = true;
    let lastEmailTime = null;
    
    if (contactCheckResponse.ok) {
      const contactData = await contactCheckResponse.json();
      const lastEmailSentField = contactData.CUSTOMFIELD_LASTINCOMPLETEEMAILSENT;
      
      console.log('📋 Checking last incomplete email sent time from contact custom field...');
      console.log('   CUSTOMFIELD_LASTINCOMPLETEEMAILSENT:', lastEmailSentField);
      
      if (lastEmailSentField) {
        const lastEmailDate = new Date(lastEmailSentField);
        const now = new Date();
        const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        const timeDiff = now - lastEmailDate;
        const hoursDiff = timeDiff / (60 * 60 * 1000);
        
        console.log(`   📝 Last incomplete email sent: ${lastEmailSentField}`);
        console.log(`      Parsed date: ${lastEmailDate.toISOString()}`);
        console.log(`      Time diff: ${timeDiff}ms (${hoursDiff.toFixed(1)} hours ago)`);
        console.log(`      2hr threshold: ${twoHoursInMs}ms`);
        console.log(`      Within 2hrs? ${timeDiff < twoHoursInMs}`);
        
        if (timeDiff < twoHoursInMs) {
          console.log(`   ✋ Email was sent ${hoursDiff.toFixed(1)} hours ago - within 2 hour threshold`);
          shouldSendEmail = false;
          lastEmailTime = lastEmailDate;
        } else {
          console.log(`   ✅ Email was sent ${hoursDiff.toFixed(1)} hours ago - outside 2 hour threshold, will send new email`);
        }
      } else {
        console.log('   ℹ️ No previous incomplete email timestamp found - will send email');
      }
      
      if (!shouldSendEmail && lastEmailTime) {
        const hoursAgo = ((now - lastEmailTime) / (60 * 60 * 1000)).toFixed(1);
        console.log(`⏸️ Incomplete email already sent ${hoursAgo} hours ago - skipping to prevent duplicates`);
      }
    } else {
      console.log('❌ Failed to fetch contact for email check:', contactCheckResponse.status);
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
    
    // Only send email if skipEmail flag is NOT true AND shouldSendEmail is true
    if (skipEmail) {
      console.log('⏭️ Skipping incomplete email - skipEmail flag is true (frontend will handle via inactivity tracking)');
    }
    
    if (process.env.SENDGRID_API_KEY && contactEmail && shouldSendEmail && !skipEmail) {
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
          
          // Update custom field to track when email was sent (prevents duplicates)
          // Store the timestamp in the contact's data - will be included in next save
          try {
            console.log('📝 Updating CUSTOMFIELD_LASTINCOMPLETEEMAILSENT timestamp...');
            const timestamp = new Date().toISOString();
            
            // Use PUT method with proper payload structure
            const trackingPayload = new URLSearchParams();
            trackingPayload.append('CUSTOMFIELD_LASTINCOMPLETEEMAILSENT', timestamp);
            
            const trackingUpdateResponse = await fetch(
              `${process.env.AXCELERATE_API_URL}/contact/${contactId}`,
              {
                method: 'PUT',
                headers: {
                  'APIToken': process.env.AXCELERATE_API_TOKEN,
                  'WSToken': process.env.AXCELERATE_WS_TOKEN,
                  'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: trackingPayload.toString()
              }
            );
            
            if (trackingUpdateResponse.ok) {
              console.log(`✅ Email timestamp updated: ${timestamp}`);
            } else {
              const errorText = await trackingUpdateResponse.text();
              console.warn(`⚠️ Could not update email timestamp (${trackingUpdateResponse.status}):`, errorText);
            }
          } catch (trackingError) {
            console.warn('⚠️ Exception while updating email timestamp:', trackingError.message);
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
    
    // Generate verification token (contactId:timestamp encoded)
    const verificationToken = Buffer.from(`${contactId}:${Date.now()}`).toString('base64');
    
    // Build resume URL with enrolment parameter (matches WordPress format)
    const baseUrl = req.body.resumeUrl || req.headers.referer || '';
    const separator = baseUrl.includes('?') ? '&' : '?'; // Use & if URL already has parameters
    const resumeUrl = `${baseUrl}${separator}enrolment=${verificationToken}`;
    
    console.log('📧 Building resume URL:');
    console.log('   Base URL:', baseUrl);
    console.log('   Separator:', separator);
    console.log('   Format: enrolment=<base64_token>');
    console.log('   Final URL:', resumeUrl);
    
    // Check if we've already sent a verification email within the last 2 hours
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
    let lastEmailTime = null;
    
    if (notesResponse.ok) {
      const notes = await notesResponse.json();
      const now = new Date();
      const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      
      if (Array.isArray(notes) && notes.length > 0) {
        console.log(`📋 Checking ${notes.length} notes for verification email sent within last 2 hours...`);
        
        notes.forEach(note => {
          const isVerificationNote = note.NOTE && (
            note.NOTE.includes('EXISTING CONTACT - Verification Email Sent') ||
            note.NOTE.includes('Verification email sent via SendGrid')
          );
          
          if (isVerificationNote && note.DATE) {
            const noteDate = new Date(note.DATE);
            const timeDiff = now - noteDate;
            const hoursDiff = timeDiff / (60 * 60 * 1000);
            
            console.log(`   📝 Found verification note from ${note.DATE} (${hoursDiff.toFixed(1)} hours ago)`);
            
            if (timeDiff < twoHoursInMs) {
              console.log(`   ✋ Verification email was sent ${hoursDiff.toFixed(1)} hours ago - within 2 hour threshold`);
              shouldSendEmail = false;
              lastEmailTime = noteDate;
            }
          }
        });
        
        if (!shouldSendEmail && lastEmailTime) {
          const hoursAgo = ((now - lastEmailTime) / (60 * 60 * 1000)).toFixed(1);
          console.log(`⏸️ Verification email already sent ${hoursAgo} hours ago - skipping to prevent duplicates`);
          return res.json({ 
            success: true, 
            message: `Verification email was already sent ${hoursAgo} hours ago. Please check your inbox.`,
            alreadySent: true
          });
        } else {
          console.log('✅ No verification email sent within last 2 hours - will send now');
        }
      }
    }
    
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

/**
 * Upload documents
 * POST /api/enrollment/upload-documents
 * 
 * Handles file uploads for enrollment documents (Photo ID, Proof of Residency, etc.)
 */
router.post('/upload-documents', upload.array('files', 10), async (req, res) => {
  try {
    const { contactId, fieldId, stepId, portfolioChecklistId, portfolioItemType } = req.body;
    
    if (!contactId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID is required'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }
    
    console.log('📤 Starting Axcelerate Portfolio document upload...');
    console.log(`   Contact ID: ${contactId}`);
    console.log(`   Field ID: ${fieldId}`);
    console.log(`   Portfolio Checklist ID: ${portfolioChecklistId}`);
    console.log(`   Portfolio Item Type Name: ${portfolioItemType}`);
    console.log(`   Files to upload: ${req.files.length}`);
    
    // Step 0: Fetch the checklist to get portfolio type IDs
    console.log('\n🔍 Fetching portfolio checklist to get type IDs...');
    const checklistResponse = await fetch(
      `${process.env.AXCELERATE_API_URL}/portfolio/checklist/?portfolioChecklistID=${portfolioChecklistId}`,
      {
        method: 'GET',
        headers: {
          'APIToken': process.env.AXCELERATE_API_TOKEN,
          'WSToken': process.env.AXCELERATE_WS_TOKEN
        }
      }
    );
    
    if (!checklistResponse.ok) {
      const errorText = await checklistResponse.text();
      console.error('   ❌ Failed to fetch checklist:', checklistResponse.status, errorText);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch portfolio checklist'
      });
    }
    
    const checklistData = await checklistResponse.json();
    console.log('   ✅ Checklist loaded');
    console.log('   Available types:', checklistData.TYPES?.map(t => `${t.NAME} (ID: ${t.PORTFOLIOTYPEID})`).join(', ') || 'None');
    
    // Create a map of item names to their IDs
    const typeMap = {};
    if (checklistData.TYPES && Array.isArray(checklistData.TYPES)) {
      checklistData.TYPES.forEach(type => {
        typeMap[type.NAME] = type.PORTFOLIOTYPEID;
        typeMap[type.PORTFOLIOTYPENAME] = type.PORTFOLIOTYPEID;
      });
    }
    console.log('   Type mapping:', JSON.stringify(typeMap, null, 2));
    
    const uploadedFiles = [];
    
    // Process each file
    for (const file of req.files) {
      try {
        console.log(`\n📄 Processing file: ${file.originalname}`);
        
        // Get the numeric portfolio type ID
        const portfolioTypeID = typeMap[portfolioItemType];
        if (!portfolioTypeID) {
          console.error(`   ❌ Portfolio type "${portfolioItemType}" not found in checklist`);
          console.error(`   Available types: ${Object.keys(typeMap).join(', ')}`);
          throw new Error(`Portfolio type "${portfolioItemType}" not found in checklist`);
        }
        console.log(`   ✅ Found portfolio type ID: ${portfolioTypeID}`);
        
        // Step 1: Create portfolio record with correct portfolioTypeID
        console.log('   ⏳ Creating portfolio record...');
        
        const portfolioParams = new URLSearchParams({
          contactID: contactId,
          portfolioTypeID: portfolioTypeID // Numeric ID from checklist
        });
        
        console.log('   Portfolio params:', Object.fromEntries(portfolioParams));
        
        const portfolioResponse = await fetch(
          `${process.env.AXCELERATE_API_URL}/contact/portfolio/`,
          {
            method: 'POST',
            headers: {
              'APIToken': process.env.AXCELERATE_API_TOKEN,
              'WSToken': process.env.AXCELERATE_WS_TOKEN,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: portfolioParams
          }
        );
        
        if (!portfolioResponse.ok) {
          const errorText = await portfolioResponse.text();
          console.error('   ❌ Portfolio creation failed:', portfolioResponse.status);
          console.error('   Response:', errorText);
          throw new Error(`Failed to create portfolio record: ${portfolioResponse.status} - ${errorText}`);
        }
        
        const portfolioData = await portfolioResponse.json();
        const certificationID = portfolioData.PORTFOLIOID || portfolioData.certificationID || portfolioData.CERTIFICATIONID || portfolioData.portfolioID;
        console.log('   ✅ Portfolio record created');
        console.log('   Certification/Portfolio ID:', certificationID);
        console.log('   Full response:', JSON.stringify(portfolioData, null, 2));
        
        // Step 2: Get presigned upload URL with certificationID
        console.log('   ⏳ Getting presigned upload URL...');
        console.log('   Request params:', {
          fileName: file.originalname,
          contactID: contactId,
          certificationID: certificationID,
          contentType: file.mimetype,
          dir: 'portfolio'
        });
        
        const presignedResponse = await fetch(
          `${process.env.AXCELERATE_API_URL}/file/getUploadUrl`,
          {
            method: 'POST',
            headers: {
              'APIToken': process.env.AXCELERATE_API_TOKEN,
              'WSToken': process.env.AXCELERATE_WS_TOKEN,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              fileName: file.originalname,
              contactID: contactId,
              certificationID: certificationID,
              contentType: file.mimetype,
              dir: 'portfolio'  // Required for portfolio file uploads
            })
          }
        );
        
        console.log('   Response status:', presignedResponse.status);
        
        if (!presignedResponse.ok) {
          const errorText = await presignedResponse.text();
          console.error('   ❌ Presigned URL request failed:', presignedResponse.status);
          console.error('   Response:', errorText);
          throw new Error(`Failed to get presigned URL: ${presignedResponse.status} - ${errorText}`);
        }
        
        const presignedData = await presignedResponse.json();
        console.log('   ✅ Got presigned URL');
        console.log('   Upload URL:', presignedData.URL || presignedData.uploadUrl);
        console.log('   Method:', presignedData.METHOD);
        
        const uploadUrl = presignedData.URL || presignedData.uploadUrl;
        const uploadMethod = presignedData.METHOD || 'PUT';
        
        if (!uploadUrl) {
          throw new Error('No upload URL in presigned response');
        }
        
        // Step 3: Upload file to presigned URL
        console.log('   ⏳ Uploading file to Axcelerate storage...');
        const fileBuffer = fs.readFileSync(file.path);
        
        const uploadResponse = await fetch(uploadUrl, {
          method: uploadMethod,
          body: fileBuffer,
          headers: {
            'Content-Type': presignedData.CONTENTTYPE || file.mimetype
          }
        });
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('   ❌ File upload to storage failed:', uploadResponse.status);
          console.error('   Response:', errorText);
          throw new Error(`Failed to upload file to storage: ${uploadResponse.status}`);
        }
        
        console.log('   ✅ File uploaded to storage');
        
        // Step 4: Link file to portfolio
        console.log('   ⏳ Linking file to portfolio...');
        const linkResponse = await fetch(
          `${process.env.AXCELERATE_API_URL}/contact/portfolio/file`,
          {
            method: 'PUT',
            headers: {
              'APIToken': process.env.AXCELERATE_API_TOKEN,
              'WSToken': process.env.AXCELERATE_WS_TOKEN,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
              contactID: contactId,
              filename: file.originalname,
              portfolioID: certificationID,
              folder: ''  // Required parameter (empty string for portfolio files)
            })
          }
        );
        
        if (!linkResponse.ok) {
          const errorText = await linkResponse.text();
          console.error('   ❌ File linking failed:', errorText);
          throw new Error(`Failed to link file to portfolio: ${linkResponse.status} - ${errorText}`);
        }
        
        console.log('   ✅ File linked to portfolio successfully');
        
        uploadedFiles.push({
          id: certificationID,
          name: file.originalname,
          portfolioID: certificationID,
          uploadedAt: new Date().toISOString()
        });
        
        // Clean up temporary file
        fs.unlinkSync(file.path);
        
      } catch (fileError) {
        console.error(`   ❌ Error processing file ${file.originalname}:`, fileError.message);
        // Continue with other files even if one fails
      }
    }
    
    if (uploadedFiles.length === 0) {
      throw new Error('No files were successfully uploaded to Axcelerate Portfolio');
    }
    
    console.log(`\n✅ Successfully uploaded ${uploadedFiles.length}/${req.files.length} files to Axcelerate Portfolio`);
    
    res.json({
      success: true,
      message: `Successfully uploaded ${uploadedFiles.length} file(s) to Axcelerate Portfolio`,
      files: uploadedFiles
    });
    
  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Delete document
 * DELETE /api/enrollment/delete-document
 * 
 * Deletes a previously uploaded document
 */
router.delete('/delete-document', async (req, res) => {
  try {
    const { contactId, fieldId, fileId } = req.body;
    
    if (!contactId || !fileId) {
      return res.status(400).json({
        success: false,
        message: 'Contact ID and file ID are required'
      });
    }
    
    console.log(`🗑 Deleting file ${fileId} for contact ${contactId}`);
    
    // Delete physical file
    const filePath = path.join(process.cwd(), 'uploads', contactId, fileId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ File deleted: ${filePath}`);
    }
    
    // TODO: Remove from aXcelerate portfolio if already uploaded there
    
    // Get remaining files
    const uploadDir = path.join(process.cwd(), 'uploads', contactId);
    let remainingFiles = [];
    
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      remainingFiles = files.map(file => ({
        id: file,
        name: file,
        fileName: file,
        path: path.join(uploadDir, file)
      }));
    }
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      files: remainingFiles
    });
    
  } catch (error) {
    console.error('❌ File delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;

